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
pub struct Report {
    pub id: String,
    pub title: String,
    pub report_type: String,
    pub generated_by: Principal,
    pub created_at: u64,
    pub data: Vec<(String, String)>,
    pub summary: String,
    pub period_start: u64,
    pub period_end: u64,
    pub is_public: bool,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct PerformanceMetrics {
    pub user_id: Principal,
    pub total_transactions: u32,
    pub successful_transactions: u32,
    pub failed_transactions: u32,
    pub average_delivery_time: f64,
    pub customer_satisfaction: f64,
    pub reliability_score: f64,
    pub last_updated: u64,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct SupplyChainAnalytics {
    pub total_products: u32,
    pub products_in_transit: u32,
    pub products_delivered: u32,
    pub products_lost_damaged: u32,
    pub average_transit_time: f64,
    pub top_performers: Vec<Principal>,
    pub bottlenecks: Vec<String>,
    pub generated_at: u64,
}

impl Storable for Report {
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

impl Storable for PerformanceMetrics {
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

impl Storable for SupplyChainAnalytics {
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

    static REPORTS: RefCell<StableBTreeMap<String, Report, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0)))
        )
    );

    static PERFORMANCE_METRICS: RefCell<StableBTreeMap<Principal, PerformanceMetrics, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(1)))
        )
    );

    static ANALYTICS: RefCell<StableBTreeMap<String, SupplyChainAnalytics, Memory>> = RefCell::new(
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
fn generate_report(
    title: String,
    report_type: String,
    period_start: u64,
    period_end: u64,
    is_public: bool,
) -> Result<Report, String> {
    let caller = ic_cdk::caller();
    let current_time = time();

    let report_id = generate_id();

    // Generate report data based on type
    let (data, summary) = match report_type.as_str() {
        "SUPPLY_CHAIN_OVERVIEW" => generate_supply_chain_overview_data(),
        "PERFORMANCE_REPORT" => generate_performance_report_data(caller),
        "TRANSACTION_SUMMARY" => generate_transaction_summary_data(period_start, period_end),
        "QUALITY_METRICS" => generate_quality_metrics_data(),
        _ => (vec![], "Unknown report type".to_string()),
    };

    let report = Report {
        id: report_id.clone(),
        title,
        report_type,
        generated_by: caller,
        created_at: current_time,
        data,
        summary,
        period_start,
        period_end,
        is_public,
    };

    REPORTS.with(|r| r.borrow_mut().insert(report_id.clone(), report.clone()));

    Ok(report)
}

fn generate_supply_chain_overview_data() -> (Vec<(String, String)>, String) {
    // Mock data generation - in real implementation, this would query other canisters
    let data = vec![
        ("total_products".to_string(), "1250".to_string()),
        ("active_suppliers".to_string(), "45".to_string()),
        ("active_transporters".to_string(), "23".to_string()),
        ("active_warehouses".to_string(), "12".to_string()),
        ("active_retailers".to_string(), "89".to_string()),
        ("products_in_transit".to_string(), "156".to_string()),
        ("completed_deliveries".to_string(), "3420".to_string()),
        ("success_rate".to_string(), "94.5%".to_string()),
    ];

    let summary =
        "Supply chain is operating at 94.5% efficiency with 156 products currently in transit."
            .to_string();

    (data, summary)
}

fn generate_performance_report_data(user_id: Principal) -> (Vec<(String, String)>, String) {
    // Mock performance data
    let data = vec![
        ("total_transactions".to_string(), "234".to_string()),
        ("successful_transactions".to_string(), "221".to_string()),
        ("failed_transactions".to_string(), "13".to_string()),
        ("success_rate".to_string(), "94.4%".to_string()),
        ("average_delivery_time".to_string(), "2.3 days".to_string()),
        ("customer_satisfaction".to_string(), "4.7/5".to_string()),
    ];

    let summary = format!(
        "User {} has completed 221 successful transactions with 94.4% success rate.",
        user_id.to_text()
    );

    (data, summary)
}

fn generate_transaction_summary_data(
    period_start: u64,
    period_end: u64,
) -> (Vec<(String, String)>, String) {
    let data = vec![
        ("period_start".to_string(), period_start.to_string()),
        ("period_end".to_string(), period_end.to_string()),
        ("total_transactions".to_string(), "1847".to_string()),
        ("total_value".to_string(), "$2,456,789".to_string()),
        (
            "average_transaction_value".to_string(),
            "$1,330".to_string(),
        ),
        ("unique_users".to_string(), "167".to_string()),
    ];

    let summary =
        "Transaction summary shows healthy growth with $2.4M in total value processed.".to_string();

    (data, summary)
}

fn generate_quality_metrics_data() -> (Vec<(String, String)>, String) {
    let data = vec![
        ("products_inspected".to_string(), "456".to_string()),
        ("quality_passed".to_string(), "442".to_string()),
        ("quality_failed".to_string(), "14".to_string()),
        ("quality_rate".to_string(), "96.9%".to_string()),
        ("average_quality_score".to_string(), "4.6/5".to_string()),
        ("defect_rate".to_string(), "3.1%".to_string()),
    ];

    let summary =
        "Quality metrics show 96.9% pass rate with an average quality score of 4.6/5.".to_string();

    (data, summary)
}

#[update]
fn update_performance_metrics(
    user_id: Principal,
    total_transactions: u32,
    successful_transactions: u32,
    failed_transactions: u32,
    average_delivery_time: f64,
    customer_satisfaction: f64,
) -> Result<PerformanceMetrics, String> {
    let current_time = time();

    let reliability_score = if total_transactions > 0 {
        (successful_transactions as f64 / total_transactions as f64) * 100.0
    } else {
        0.0
    };

    let metrics = PerformanceMetrics {
        user_id,
        total_transactions,
        successful_transactions,
        failed_transactions,
        average_delivery_time,
        customer_satisfaction,
        reliability_score,
        last_updated: current_time,
    };

    PERFORMANCE_METRICS.with(|p| p.borrow_mut().insert(user_id, metrics.clone()));

    Ok(metrics)
}

#[update]
fn generate_analytics() -> Result<SupplyChainAnalytics, String> {
    let current_time = time();

    // Mock analytics data - in real implementation, this would aggregate from other canisters
    let analytics = SupplyChainAnalytics {
        total_products: 1250,
        products_in_transit: 156,
        products_delivered: 3420,
        products_lost_damaged: 34,
        average_transit_time: 2.3,
        top_performers: vec![
            Principal::from_text("rdmx6-jaaaa-aaaaa-aaadq-cai").unwrap(),
            Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai").unwrap(),
        ],
        bottlenecks: vec![
            "Warehouse capacity in Region A".to_string(),
            "Transportation delays in Route B".to_string(),
        ],
        generated_at: current_time,
    };

    ANALYTICS.with(|a| {
        a.borrow_mut()
            .insert("latest".to_string(), analytics.clone())
    });

    Ok(analytics)
}

#[query]
fn get_report(report_id: String) -> Result<Report, String> {
    REPORTS.with(|r| {
        r.borrow()
            .get(&report_id)
            .ok_or("Report not found".to_string())
    })
}

#[query]
fn get_reports_by_user(user_id: Principal) -> Vec<Report> {
    REPORTS.with(|r| {
        r.borrow()
            .iter()
            .filter(|(_, report)| report.generated_by == user_id)
            .map(|(_, report)| report)
            .collect()
    })
}

#[query]
fn get_public_reports() -> Vec<Report> {
    REPORTS.with(|r| {
        r.borrow()
            .iter()
            .filter(|(_, report)| report.is_public)
            .map(|(_, report)| report)
            .collect()
    })
}

#[query]
fn get_reports_by_type(report_type: String) -> Vec<Report> {
    REPORTS.with(|r| {
        r.borrow()
            .iter()
            .filter(|(_, report)| report.report_type == report_type)
            .map(|(_, report)| report)
            .collect()
    })
}

#[query]
fn get_performance_metrics(user_id: Principal) -> Result<PerformanceMetrics, String> {
    PERFORMANCE_METRICS.with(|p| {
        p.borrow()
            .get(&user_id)
            .ok_or("Performance metrics not found".to_string())
    })
}

#[query]
fn get_all_performance_metrics() -> Vec<PerformanceMetrics> {
    PERFORMANCE_METRICS.with(|p| p.borrow().iter().map(|(_, metrics)| metrics).collect())
}

#[query]
fn get_latest_analytics() -> Result<SupplyChainAnalytics, String> {
    ANALYTICS.with(|a| {
        a.borrow()
            .get(&"latest".to_string()) // Convert &str to String
            .ok_or("Analytics not found".to_string())
    })
}
#[query]
fn get_top_performers(limit: u32) -> Vec<PerformanceMetrics> {
    let mut metrics: Vec<PerformanceMetrics> =
        PERFORMANCE_METRICS.with(|p| p.borrow().iter().map(|(_, metrics)| metrics).collect());

    metrics.sort_by(|a, b| {
        b.reliability_score
            .partial_cmp(&a.reliability_score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    metrics.truncate(limit as usize);

    metrics
}

ic_cdk::export_candid!();
