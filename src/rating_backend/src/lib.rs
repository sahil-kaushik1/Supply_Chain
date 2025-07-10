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
pub struct Rating {
    pub id: String,
    pub rater_id: Principal,
    pub rated_user_id: Principal,
    pub product_id: Option<String>,
    pub transaction_id: Option<String>,
    pub rating: u8, // 1-5 stars
    pub review: String,
    pub category: String, // "quality", "delivery", "communication", "overall"
    pub created_at: u64,
    pub is_verified: bool,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct UserRatingStats {
    pub user_id: Principal,
    pub total_ratings: u32,
    pub average_rating: f64,
    pub star_distribution: Vec<u32>, // [1star, 2star, 3star, 4star, 5star]
    pub category_ratings: Vec<(String, f64)>, // [(category, avg_rating)]
    pub last_updated: u64,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct RatingReport {
    pub id: String,
    pub reporter_id: Principal,
    pub rating_id: String,
    pub reason: String,
    pub description: String,
    pub created_at: u64,
    pub status: String, // "pending", "resolved", "dismissed"
}

impl Storable for Rating {
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

impl Storable for UserRatingStats {
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

impl Storable for RatingReport {
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

    static RATINGS: RefCell<StableBTreeMap<String, Rating, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0)))
        )
    );

    static RATING_STATS: RefCell<StableBTreeMap<Principal, UserRatingStats, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(1)))
        )
    );

    static RATING_REPORTS: RefCell<StableBTreeMap<String, RatingReport, Memory>> = RefCell::new(
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
fn submit_rating(
    rated_user_id: Principal,
    product_id: Option<String>,
    transaction_id: Option<String>,
    rating: u8,
    review: String,
    category: String,
) -> Result<Rating, String> {
    let caller = ic_cdk::caller();
    let current_time = time();

    if rating < 1 || rating > 5 {
        return Err("Rating must be between 1 and 5".to_string());
    }

    if caller == rated_user_id {
        return Err("Cannot rate yourself".to_string());
    }

    let rating_id = generate_id();
    let rating_obj = Rating {
        id: rating_id.clone(),
        rater_id: caller,
        rated_user_id,
        product_id,
        transaction_id,
        rating,
        review,
        category,
        created_at: current_time,
        is_verified: false,
    };

    RATINGS.with(|r| r.borrow_mut().insert(rating_id.clone(), rating_obj.clone()));

    // Update rating stats
    update_rating_stats(rated_user_id);

    Ok(rating_obj)
}

fn update_rating_stats(user_id: Principal) {
    let current_time = time();

    // Get all ratings for this user
    let user_ratings: Vec<Rating> = RATINGS.with(|r| {
        r.borrow()
            .iter()
            .filter(|(_, rating)| rating.rated_user_id == user_id)
            .map(|(_, rating)| rating)
            .collect()
    });

    if user_ratings.is_empty() {
        return;
    }

    let total_ratings = user_ratings.len() as u32;
    let sum_ratings: u32 = user_ratings.iter().map(|r| r.rating as u32).sum();
    let average_rating = sum_ratings as f64 / total_ratings as f64;

    // Calculate star distribution
    let mut star_distribution = vec![0; 5];
    for rating in &user_ratings {
        star_distribution[(rating.rating - 1) as usize] += 1;
    }

    // Calculate category ratings
    let mut category_sums: std::collections::HashMap<String, (u32, u32)> =
        std::collections::HashMap::new();
    for rating in &user_ratings {
        let entry = category_sums
            .entry(rating.category.clone())
            .or_insert((0, 0));
        entry.0 += rating.rating as u32;
        entry.1 += 1;
    }

    let category_ratings: Vec<(String, f64)> = category_sums
        .into_iter()
        .map(|(category, (sum, count))| (category, sum as f64 / count as f64))
        .collect();

    let stats = UserRatingStats {
        user_id,
        total_ratings,
        average_rating,
        star_distribution,
        category_ratings,
        last_updated: current_time,
    };

    RATING_STATS.with(|s| s.borrow_mut().insert(user_id, stats));
}

#[update]
fn verify_rating(rating_id: String) -> Result<Rating, String> {
    let caller = ic_cdk::caller();

    // Note: In a real implementation, you'd check if the caller is an admin
    // For now, we'll allow anyone to verify ratings

    let mut rating = RATINGS.with(|r| {
        r.borrow()
            .get(&rating_id)
            .ok_or("Rating not found".to_string())
    })?;

    rating.is_verified = true;
    RATINGS.with(|r| r.borrow_mut().insert(rating_id, rating.clone()));

    Ok(rating)
}

#[update]
fn report_rating(
    rating_id: String,
    reason: String,
    description: String,
) -> Result<RatingReport, String> {
    let caller = ic_cdk::caller();
    let current_time = time();

    // Check if rating exists
    RATINGS.with(|r| {
        r.borrow()
            .get(&rating_id)
            .ok_or("Rating not found".to_string())
    })?;

    let report_id = generate_id();
    let report = RatingReport {
        id: report_id.clone(),
        reporter_id: caller,
        rating_id,
        reason,
        description,
        created_at: current_time,
        status: "pending".to_string(),
    };

    RATING_REPORTS.with(|r| r.borrow_mut().insert(report_id.clone(), report.clone()));

    Ok(report)
}

#[query]
fn get_rating(rating_id: String) -> Result<Rating, String> {
    RATINGS.with(|r| {
        r.borrow()
            .get(&rating_id)
            .ok_or("Rating not found".to_string())
    })
}

#[query]
fn get_user_ratings(user_id: Principal) -> Vec<Rating> {
    RATINGS.with(|r| {
        r.borrow()
            .iter()
            .filter(|(_, rating)| rating.rated_user_id == user_id)
            .map(|(_, rating)| rating)
            .collect()
    })
}

#[query]
fn get_ratings_by_rater(rater_id: Principal) -> Vec<Rating> {
    RATINGS.with(|r| {
        r.borrow()
            .iter()
            .filter(|(_, rating)| rating.rater_id == rater_id)
            .map(|(_, rating)| rating)
            .collect()
    })
}

#[query]
fn get_user_rating_stats(user_id: Principal) -> Result<UserRatingStats, String> {
    RATING_STATS.with(|s| {
        s.borrow()
            .get(&user_id)
            .ok_or("Rating stats not found".to_string())
    })
}

#[query]
fn get_top_rated_users(limit: u32) -> Vec<UserRatingStats> {
    let mut stats: Vec<UserRatingStats> =
        RATING_STATS.with(|s| s.borrow().iter().map(|(_, stats)| stats).collect());

    stats.sort_by(|a, b| {
        b.average_rating
            .partial_cmp(&a.average_rating)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    stats.truncate(limit as usize);

    stats
}

#[query]
fn get_ratings_by_category(category: String) -> Vec<Rating> {
    RATINGS.with(|r| {
        r.borrow()
            .iter()
            .filter(|(_, rating)| rating.category == category)
            .map(|(_, rating)| rating)
            .collect()
    })
}

#[query]
fn get_pending_reports() -> Vec<RatingReport> {
    RATING_REPORTS.with(|r| {
        r.borrow()
            .iter()
            .filter(|(_, report)| report.status == "pending")
            .map(|(_, report)| report)
            .collect()
    })
}

ic_cdk::export_candid!();
