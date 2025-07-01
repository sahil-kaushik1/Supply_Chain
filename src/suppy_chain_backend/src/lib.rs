use candid::{CandidType, Principal};
use ic_cdk::{init, post_upgrade, query, update};
use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager, VirtualMemory},
    storable::Bound,
    storable::Storable,
    DefaultMemoryImpl, StableBTreeMap,
};
use serde::{Deserialize, Serialize};
use std::{borrow::Cow, cell::RefCell, collections::BTreeMap};

type Memory = VirtualMemory<DefaultMemoryImpl>;

// Supply chain roles with permissions
#[derive(CandidType, Serialize, Deserialize, Clone, PartialEq, Debug)]
enum Role {
    Supplier,
    Transporter,
    Warehouse,
    Retailer,
    Auditor,
}

#[derive(Default, CandidType, Serialize, Deserialize, Clone, Debug)]
struct Rating {
    total_score: u64,
    num_ratings: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
struct Report {
    report_id: u64,
    reporter: Principal,
    reported_entity: Principal,
    product_id: String,
    reason: String,
    timestamp: u64,
    resolved: bool,
    valid: Option<bool>,
}

// Supply chain event structure
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
struct Event {
    id: u64,
    timestamp: u64,
    product_id: String,
    event_type: String,
    actor: Principal,
    location: String,
    metadata: String,
}

// Implement Storable for Event to fix compilation error
impl Storable for Event {
    const BOUND: Bound = Bound::Unbounded;

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).expect("Failed to encode Event"))
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).expect("Failed to decode Event")
    }
}

// Canister state
thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = RefCell::new(
        MemoryManager::init(DefaultMemoryImpl::default())
    );

    static STATE: RefCell<State> = RefCell::new(State::new());
}

struct State {
    users: BTreeMap<Principal, Role>,
    events: StableBTreeMap<u64, Event, Memory>,
    next_event_id: u64,
    ratings: BTreeMap<Principal, Rating>,
    reports: BTreeMap<u64, Report>,
    next_report_id: u64,
}

impl State {
    fn new() -> Self {
        let events_memory = MEMORY_MANAGER.with(|mm| mm.borrow().get(MemoryId::new(0)));

        State {
            users: BTreeMap::new(),
            events: StableBTreeMap::init(events_memory),
            next_event_id: 0,
            ratings: BTreeMap::new(),
            reports: BTreeMap::new(),
            next_report_id: 0,
        }
    }
}

// Initialize canister
#[init]
fn init() {
    ic_cdk::println!("SupplyChain canister initialized");
}

// Handle upgrades
#[post_upgrade]
fn post_upgrade() {
    ic_cdk::println!("Canister upgraded successfully");
}

// User registration with role assignment
#[update]
fn register_user(role: Role) -> Result<(), String> {
    let caller = ic_cdk::api::caller();
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        if state.users.contains_key(&caller) {
            return Err("User already registered".to_string());
        }
        state.users.insert(caller, role);
        Ok(())
    })
}

// Record supply chain event with role-based access
#[update]
fn record_event(
    product_id: String,
    event_type: String,
    location: String,
    metadata: String,
) -> Result<u64, String> {
    let caller = ic_cdk::api::caller();
    let timestamp = ic_cdk::api::time();

    STATE.with(|s| {
        let mut state = s.borrow_mut();
        let user_role = state
            .users
            .get(&caller)
            .ok_or("Unauthorized: User not registered")?;

        // Role-based validation
        if matches!(user_role, Role::Supplier) && event_type != "PRODUCED" {
            return Err("Invalid event for supplier".to_string());
        }

        let event_id = state.next_event_id;
        state.next_event_id += 1;

        let event = Event {
            id: event_id,
            timestamp,
            product_id: product_id.clone(),
            event_type: event_type.clone(),
            actor: caller,
            location: location.clone(),
            metadata: metadata.clone(),
        };

        state.events.insert(event_id, event);
        Ok(event_id)
    })
}

// Retrieve product history
#[query]
fn get_product_history(product_id: String) -> Result<Vec<Event>, String> {
    STATE.with(|s| {
        let state = s.borrow();
        Ok(state
            .events
            .iter()
            .filter(|(_, event)| event.product_id == product_id)
            .map(|(_, event)| event.clone())
            .collect())
    })
}

// Verify product authenticity
#[query]
fn verify_product(product_id: String) -> Result<bool, String> {
    STATE.with(|s| {
        let state = s.borrow();
        let mut events: Vec<_> = state
            .events
            .iter()
            .filter(|(_, event)| event.product_id == product_id)
            .map(|(_, event)| event.clone())
            .collect();

        events.sort_by_key(|e| e.timestamp);

        if events.is_empty() {
            return Err("Product not found".to_string());
        }

        let valid_chain = events.windows(2).all(|w| {
            let prev = &w[0];
            let next = &w[1];
            matches!(
                (prev.event_type.as_str(), next.event_type.as_str()),
                ("PRODUCED", "TRANSPORT") | ("TRANSPORT", "WAREHOUSE") | ("WAREHOUSE", "RETAIL")
            )
        });

        Ok(valid_chain)
    })
}

// Get events since last event ID
#[query]
fn get_events_since(last_event_id: u64) -> Vec<Event> {
    STATE.with(|s| {
        let state = s.borrow();
        state
            .events
            .range((last_event_id + 1)..)
            .map(|(_, event)| event.clone())
            .collect()
    })
}

// Add rating for a participant
#[update]
fn add_rating(target: Principal, score: u8) -> Result<(), String> {
    if !(1..=5).contains(&score) {
        return Err("Score must be between 1 and 5".to_string());
    }

    STATE.with(|s| {
        let mut state = s.borrow_mut();
        let rating = state.ratings.entry(target).or_default();
        rating.total_score += score as u64;
        rating.num_ratings += 1;
        Ok(())
    })
}

// Get average rating
#[query]
fn get_rating(target: Principal) -> Option<f64> {
    STATE.with(|s| {
        let state = s.borrow();
        state
            .ratings
            .get(&target)
            .map(|r| r.total_score as f64 / r.num_ratings as f64)
    })
}

// Report malicious activity
#[update]
fn add_report(
    reported_entity: Principal,
    product_id: String,
    reason: String,
) -> Result<u64, String> {
    let reporter = ic_cdk::api::caller();
    let timestamp = ic_cdk::api::time();

    STATE.with(|s| {
        let mut state = s.borrow_mut();
        let report_id = state.next_report_id;
        state.next_report_id += 1;

        let report = Report {
            report_id,
            reporter,
            reported_entity,
            product_id,
            reason,
            timestamp,
            resolved: false,
            valid: None,
        };

        state.reports.insert(report_id, report);
        Ok(report_id)
    })
}

// Resolve reports (auditors only)
#[update]
fn resolve_report(report_id: u64, valid: bool) -> Result<(), String> {
    let caller = ic_cdk::api::caller();

    STATE.with(|s| {
        let mut state = s.borrow_mut();
        let role = state.users.get(&caller).ok_or("Unauthorized")?;

        if *role != Role::Auditor {
            return Err("Only auditors may resolve reports".to_string());
        }

        let report = state
            .reports
            .get_mut(&report_id)
            .ok_or("Report not found")?;

        report.resolved = true;
        report.valid = Some(valid);
        Ok(())
    })
}

// Export candid interface
ic_cdk::export_candid!();
