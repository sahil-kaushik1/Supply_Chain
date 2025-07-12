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
pub struct User {
    pub id: Principal,
    pub name: String,
    pub email: String,
    pub role: UserRole,
    pub company_name: String,
    pub address: String,
    pub phone: String,
    pub is_verified: bool,
    pub created_at: u64,
    pub updated_at: u64,
    pub metadata: Vec<(String, String)>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct UserProfile {
    pub user: User,
    pub certifications: Vec<String>,
    pub compliance_documents: Vec<String>,
    pub business_license: Option<String>,
    pub tax_id: Option<String>,
}

impl Storable for User {
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

impl Storable for UserProfile {
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

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = RefCell::new(
        MemoryManager::init(DefaultMemoryImpl::default())
    );

    static USERS: RefCell<StableBTreeMap<Principal, User, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0)))
        )
    );

    static USER_PROFILES: RefCell<StableBTreeMap<Principal, UserProfile, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(1)))
        )
    );
}

#[update]
fn register_user(
    name: String,
    email: String,
    role: UserRole,
    company_name: String,
    address: String,
    phone: String,
) -> Result<User, String> {
    let caller = ic_cdk::caller();
    let current_time = time();

    // Check if user already exists
    if USERS.with(|u| u.borrow().contains_key(&caller)) {
        return Err("User already registered".to_string());
    }

    let user = User {
        id: caller,
        name,
        email,
        role,
        company_name,
        address,
        phone,
        is_verified: true, // Auto-verify all users in demo mode
        created_at: current_time,
        updated_at: current_time,
        metadata: vec![],
    };

    USERS.with(|u| u.borrow_mut().insert(caller, user.clone()));

    // Create user profile
    let profile = UserProfile {
        user: user.clone(),
        certifications: vec![],
        compliance_documents: vec![],
        business_license: None,
        tax_id: None,
    };

    USER_PROFILES.with(|p| p.borrow_mut().insert(caller, profile));

    Ok(user)
}

#[update]
fn update_user_profile(
    name: Option<String>,
    email: Option<String>,
    company_name: Option<String>,
    address: Option<String>,
    phone: Option<String>,
) -> Result<User, String> {
    let caller = ic_cdk::caller();
    let current_time = time();

    let mut user = USERS.with(|u| u.borrow().get(&caller).ok_or("User not found".to_string()))?;

    if let Some(name) = name {
        user.name = name;
    }
    if let Some(email) = email {
        user.email = email;
    }
    if let Some(company_name) = company_name {
        user.company_name = company_name;
    }
    if let Some(address) = address {
        user.address = address;
    }
    if let Some(phone) = phone {
        user.phone = phone;
    }

    user.updated_at = current_time;

    USERS.with(|u| u.borrow_mut().insert(caller, user.clone()));

    // Update profile
    let mut profile = USER_PROFILES.with(|p| {
        p.borrow()
            .get(&caller)
            .ok_or("Profile not found".to_string())
    })?;

    profile.user = user.clone();
    USER_PROFILES.with(|p| p.borrow_mut().insert(caller, profile));

    Ok(user)
}

#[update]
fn verify_user(user_id: Principal) -> Result<User, String> {
    let mut user = USERS.with(|u| u.borrow().get(&user_id).ok_or("User not found".to_string()))?;

    user.is_verified = true;
    user.updated_at = time();

    USERS.with(|u| u.borrow_mut().insert(user_id, user.clone()));

    Ok(user)
}

#[update]
fn add_certification(certification: String) -> Result<UserProfile, String> {
    let caller = ic_cdk::caller();

    let mut profile = USER_PROFILES.with(|p| {
        p.borrow()
            .get(&caller)
            .ok_or("Profile not found".to_string())
    })?;

    profile.certifications.push(certification);

    USER_PROFILES.with(|p| p.borrow_mut().insert(caller, profile.clone()));

    Ok(profile)
}

#[update]
fn add_compliance_document(document: String) -> Result<UserProfile, String> {
    let caller = ic_cdk::caller();

    let mut profile = USER_PROFILES.with(|p| {
        p.borrow()
            .get(&caller)
            .ok_or("Profile not found".to_string())
    })?;

    profile.compliance_documents.push(document);

    USER_PROFILES.with(|p| p.borrow_mut().insert(caller, profile.clone()));

    Ok(profile)
}

#[query]
fn get_user(user_id: Principal) -> Result<User, String> {
    USERS.with(|u| u.borrow().get(&user_id).ok_or("User not found".to_string()))
}

#[query]
fn get_user_profile(user_id: Principal) -> Result<UserProfile, String> {
    USER_PROFILES.with(|p| {
        p.borrow()
            .get(&user_id)
            .ok_or("Profile not found".to_string())
    })
}

#[query]
fn get_current_user() -> Result<User, String> {
    let caller = ic_cdk::caller();
    USERS.with(|u| u.borrow().get(&caller).ok_or("User not found".to_string()))
}

#[query]
fn get_users_by_role(role: UserRole) -> Vec<User> {
    USERS.with(|u| {
        u.borrow()
            .iter()
            .filter(|(_, user)| std::mem::discriminant(&user.role) == std::mem::discriminant(&role))
            .map(|(_, user)| user)
            .collect()
    })
}

#[query]
fn get_all_users() -> Vec<User> {
    USERS.with(|u| u.borrow().iter().map(|(_, user)| user).collect())
}

#[query]
fn get_verified_users() -> Vec<User> {
    USERS.with(|u| {
        u.borrow()
            .iter()
            .filter(|(_, user)| user.is_verified)
            .map(|(_, user)| user)
            .collect()
    })
}

ic_cdk::export_candid!();
