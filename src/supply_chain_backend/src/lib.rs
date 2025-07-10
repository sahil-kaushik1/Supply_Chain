use candid::{CandidType, Deserialize, Principal};
use ic_cdk::api::time;
use ic_cdk_macros::*;
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, Storable};
use serde::Serialize;
use std::borrow::Cow;
use std::cell::RefCell;

type Memory = VirtualMemory<DefaultMemoryImpl>;

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub enum UserRole {
    Supplier,
    Transporter,
    Warehouse,
    Retailer,
    Admin,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub enum ProductStatus {
    Created,
    InWarehouse,
    InTransit,
    Delivered,
    Sold,
    Lost,
    Damaged,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct Product {
    pub id: String,
    pub name: String,
    pub description: String,
    pub supplier_id: Principal,
    pub current_owner: Principal,
    pub status: ProductStatus,
    pub created_at: u64,
    pub updated_at: u64,
    pub batch_number: String,
    pub expiry_date: Option<u64>,
    pub price: f64,
    pub quantity: u32,
    pub category: String,
    pub origin: String,
    pub certifications: Vec<String>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct TrackingEvent {
    pub id: String,
    pub product_id: String,
    pub user_id: Principal,
    pub user_role: UserRole,
    pub event_type: String,
    pub description: String,
    pub location: String,
    pub timestamp: u64,
    pub metadata: Vec<(String, String)>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct Transfer {
    pub id: String,
    pub product_id: String,
    pub from_user: Principal,
    pub to_user: Principal,
    pub transfer_type: String,
    pub status: String,
    pub initiated_at: u64,
    pub completed_at: Option<u64>,
    pub notes: String,
}

impl Storable for Product {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(serde_json::to_vec(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        serde_json::from_slice(&bytes).unwrap()
    }

    const BOUND: ic_stable_structures::storable::Bound =
        ic_stable_structures::storable::Bound::Bounded {
            max_size: 2048,
            is_fixed_size: false,
        };
}

impl Storable for TrackingEvent {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(serde_json::to_vec(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        serde_json::from_slice(&bytes).unwrap()
    }

    const BOUND: ic_stable_structures::storable::Bound =
        ic_stable_structures::storable::Bound::Bounded {
            max_size: 1024,
            is_fixed_size: false,
        };
}

impl Storable for Transfer {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(serde_json::to_vec(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        serde_json::from_slice(&bytes).unwrap()
    }

    const BOUND: ic_stable_structures::storable::Bound =
        ic_stable_structures::storable::Bound::Bounded {
            max_size: 1024,
            is_fixed_size: false,
        };
}

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = RefCell::new(
        MemoryManager::init(DefaultMemoryImpl::default())
    );

    static PRODUCTS: RefCell<StableBTreeMap<String, Product, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0)))
        )
    );

    static TRACKING_EVENTS: RefCell<StableBTreeMap<String, TrackingEvent, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(1)))
        )
    );

    static TRANSFERS: RefCell<StableBTreeMap<String, Transfer, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(2)))
        )
    );
}

fn generate_id() -> String {
    let timestamp = time();
    let caller = ic_cdk::caller();
    format!("{}-{}", timestamp, caller.to_text())
}

#[update]
fn create_product(
    name: String,
    description: String,
    batch_number: String,
    expiry_date: Option<u64>,
    price: f64,
    quantity: u32,
    category: String,
    origin: String,
    certifications: Vec<String>,
) -> Result<Product, String> {
    let caller = ic_cdk::caller();
    let product_id = generate_id();
    let current_time = time();

    let product = Product {
        id: product_id.clone(),
        name,
        description,
        supplier_id: caller,
        current_owner: caller,
        status: ProductStatus::Created,
        created_at: current_time,
        updated_at: current_time,
        batch_number: batch_number.clone(),
        expiry_date,
        price,
        quantity,
        category,
        origin: origin.clone(),
        certifications,
    };

    PRODUCTS.with(|p| p.borrow_mut().insert(product_id.clone(), product.clone()));

    // Create tracking event
    let tracking_event = TrackingEvent {
        id: generate_id(),
        product_id: product_id.clone(),
        user_id: caller,
        user_role: UserRole::Supplier,
        event_type: "PRODUCT_CREATED".to_string(),
        description: "Product created by supplier".to_string(),
        location: origin.clone(),
        timestamp: current_time,
        metadata: vec![
            ("batch_number".to_string(), batch_number.clone()),
            ("quantity".to_string(), quantity.to_string()),
        ],
    };

    TRACKING_EVENTS.with(|t| {
        t.borrow_mut()
            .insert(tracking_event.id.clone(), tracking_event)
    });

    Ok(product)
}

#[update]
fn transfer_product(
    product_id: String,
    to_user: Principal,
    transfer_type: String,
    notes: String,
) -> Result<Transfer, String> {
    let caller = ic_cdk::caller();
    let current_time = time();

    // Check if product exists and caller is current owner
    let mut product = PRODUCTS.with(|p| {
        p.borrow()
            .get(&product_id)
            .ok_or("Product not found".to_string())
    })?;

    if product.current_owner != caller {
        return Err("Not authorized to transfer this product".to_string());
    }

    let transfer_id = generate_id();
    let transfer = Transfer {
        id: transfer_id.clone(),
        product_id: product_id.clone(),
        from_user: caller,
        to_user,
        transfer_type: transfer_type.clone(),
        status: "PENDING".to_string(),
        initiated_at: current_time,
        completed_at: None,
        notes,
    };

    // Update product status based on transfer type
    match transfer_type.as_str() {
        "TO_WAREHOUSE" => product.status = ProductStatus::InWarehouse,
        "TO_TRANSPORTER" => product.status = ProductStatus::InTransit,
        "TO_RETAILER" => product.status = ProductStatus::Delivered,
        _ => {}
    }

    product.current_owner = to_user;
    product.updated_at = current_time;

    PRODUCTS.with(|p| p.borrow_mut().insert(product_id.clone(), product));
    TRANSFERS.with(|t| t.borrow_mut().insert(transfer_id.clone(), transfer.clone()));

    // Create tracking event
    let tracking_event = TrackingEvent {
        id: generate_id(),
        product_id: product_id.clone(),
        user_id: caller,
        user_role: UserRole::Supplier, // This should be determined dynamically
        event_type: "PRODUCT_TRANSFERRED".to_string(),
        description: format!("Product transferred via {}", transfer_type),
        location: "Unknown".to_string(),
        timestamp: current_time,
        metadata: vec![
            ("transfer_type".to_string(), transfer_type),
            ("to_user".to_string(), to_user.to_text()),
        ],
    };

    TRACKING_EVENTS.with(|t| {
        t.borrow_mut()
            .insert(tracking_event.id.clone(), tracking_event)
    });

    Ok(transfer)
}

#[update]
fn update_product_status(
    product_id: String,
    new_status: ProductStatus,
    location: String,
    notes: String,
) -> Result<Product, String> {
    let caller = ic_cdk::caller();
    let current_time = time();

    let mut product = PRODUCTS.with(|p| {
        p.borrow()
            .get(&product_id)
            .ok_or("Product not found".to_string())
    })?;

    if product.current_owner != caller {
        return Err("Not authorized to update this product".to_string());
    }

    product.status = new_status.clone();
    product.updated_at = current_time;

    PRODUCTS.with(|p| p.borrow_mut().insert(product_id.clone(), product.clone()));

    // Create tracking event
    let tracking_event = TrackingEvent {
        id: generate_id(),
        product_id: product_id.clone(),
        user_id: caller,
        user_role: UserRole::Supplier, // Should be determined dynamically
        event_type: "STATUS_UPDATED".to_string(),
        description: format!("Product status updated to {:?}", new_status),
        location,
        timestamp: current_time,
        metadata: vec![
            ("new_status".to_string(), format!("{:?}", new_status)),
            ("notes".to_string(), notes),
        ],
    };

    TRACKING_EVENTS.with(|t| {
        t.borrow_mut()
            .insert(tracking_event.id.clone(), tracking_event)
    });

    Ok(product)
}

#[query]
fn get_product(product_id: String) -> Result<Product, String> {
    PRODUCTS.with(|p| {
        p.borrow()
            .get(&product_id)
            .ok_or("Product not found".to_string())
    })
}

#[query]
fn get_products_by_owner(owner: Principal) -> Vec<Product> {
    PRODUCTS.with(|p| {
        p.borrow()
            .iter()
            .filter(|(_, product)| product.current_owner == owner)
            .map(|(_, product)| product)
            .collect()
    })
}

#[query]
fn get_product_tracking_history(product_id: String) -> Vec<TrackingEvent> {
    TRACKING_EVENTS.with(|t| {
        t.borrow()
            .iter()
            .filter(|(_, event)| event.product_id == product_id)
            .map(|(_, event)| event)
            .collect()
    })
}

#[query]
fn get_all_products() -> Vec<Product> {
    PRODUCTS.with(|p| p.borrow().iter().map(|(_, product)| product).collect())
}

#[query]
fn get_products_by_status(status: ProductStatus) -> Vec<Product> {
    PRODUCTS.with(|p| {
        p.borrow()
            .iter()
            .filter(|(_, product)| {
                std::mem::discriminant(&product.status) == std::mem::discriminant(&status)
            })
            .map(|(_, product)| product)
            .collect()
    })
}

#[query]
fn get_transfers_by_user(user: Principal) -> Vec<Transfer> {
    TRANSFERS.with(|t| {
        t.borrow()
            .iter()
            .filter(|(_, transfer)| transfer.from_user == user || transfer.to_user == user)
            .map(|(_, transfer)| transfer)
            .collect()
    })
}

#[update]
fn complete_transfer(transfer_id: String) -> Result<Transfer, String> {
    let caller = ic_cdk::caller();
    let current_time = time();

    let mut transfer = TRANSFERS.with(|t| {
        t.borrow()
            .get(&transfer_id)
            .ok_or("Transfer not found".to_string())
    })?;

    if transfer.to_user != caller {
        return Err("Not authorized to complete this transfer".to_string());
    }

    transfer.status = "COMPLETED".to_string();
    transfer.completed_at = Some(current_time);

    TRANSFERS.with(|t| t.borrow_mut().insert(transfer_id.clone(), transfer.clone()));

    // Create tracking event
    let tracking_event = TrackingEvent {
        id: generate_id(),
        product_id: transfer.product_id.clone(),
        user_id: caller,
        user_role: UserRole::Supplier, // Should be determined dynamically
        event_type: "TRANSFER_COMPLETED".to_string(),
        description: "Product transfer completed".to_string(),
        location: "Unknown".to_string(),
        timestamp: current_time,
        metadata: vec![("transfer_id".to_string(), transfer_id)],
    };

    TRACKING_EVENTS.with(|t| {
        t.borrow_mut()
            .insert(tracking_event.id.clone(), tracking_event)
    });

    Ok(transfer)
}

#[query]
fn get_statistics() -> (u64, u64, u64) {
    let products_count = PRODUCTS.with(|p| p.borrow().len());
    let tracking_events_count = TRACKING_EVENTS.with(|t| t.borrow().len());
    let transfers_count = TRANSFERS.with(|t| t.borrow().len());

    (products_count, tracking_events_count, transfers_count)
}

ic_cdk::export_candid!();
