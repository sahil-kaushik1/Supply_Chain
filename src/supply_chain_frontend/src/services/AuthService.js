import { Actor, HttpAgent } from '@dfinity/agent';
import { AuthClient } from '@dfinity/auth-client';
import { Principal } from '@dfinity/principal';

// Import generated declarations
import { canisterId as userManagementCanisterId, createActor as createUserManagementActor } from '../../../declarations/user_management_backend';
import { canisterId as supplyChainCanisterId, createActor as createSupplyChainActor } from '../../../declarations/supply_chain_backend';
import { canisterId as ratingCanisterId, createActor as createRatingActor } from '../../../declarations/rating_backend';
import { canisterId as reportingCanisterId, createActor as createReportingActor } from '../../../declarations/reporting_backend';

export class AuthService {
    constructor() {
        this.authClient = null;
        this.identity = null;
        this.agent = null;
        this.isPlugConnected = false;
        this.actors = {};
        this.isInitialized = false;
        this.localHost = this.getLocalHost();
    }

    // Get the correct local host - use localhost instead of 127.0.0.1 to avoid CSP issues
    getLocalHost() {
        // Always use localhost for local development to avoid CSP issues
        const defaultHost = 'http://localhost:4943';

        if (process.env.NODE_ENV === 'development') {
            return process.env.REACT_APP_IC_HOST || defaultHost;
        }

        return process.env.DFX_NETWORK === 'ic' ? 'https://icp0.io' : defaultHost;
    }

    static getInstance() {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }

    async testConnection() {
        // Test localhost first since it's allowed by CSP
        const hostsToTest = ['http://localhost:4943', 'http://127.0.0.1:4943'];

        for (const host of hostsToTest) {
            try {
                const response = await fetch(`${host}/api/v2/status`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                    console.log(`✅ Connected to IC replica at ${host}`);
                    return host;
                }
            } catch (error) {
                console.warn(`❌ Failed to connect to ${host}:`, error.message);
            }
        }

        // If both fail, return localhost (it's more likely to work with CSP)
        return 'http://localhost:4943';
    }

    async initializeAgent() {
        try {
            let host;

            if (process.env.DFX_NETWORK === 'ic') {
                host = 'https://icp0.io';
            } else {
                // For local development, prefer localhost over 127.0.0.1
                host = 'http://localhost:4943';

                // Test connection but don't fail if it doesn't work
                try {
                    const workingHost = await this.testConnection();
                    if (workingHost.includes('localhost')) {
                        host = workingHost;
                    }
                } catch (error) {
                    console.warn('Connection test failed, using default localhost');
                }
            }

            console.log(`🔌 Initializing agent with host: ${host}`);

            this.agent = new HttpAgent({
                identity: this.identity,
                host: host,
            });

            // CRITICAL: Always fetch root key for local development
            if (process.env.DFX_NETWORK !== 'ic') {
                try {
                    await this.agent.fetchRootKey();
                    console.log('✅ Root key fetched successfully for local development');
                } catch (err) {
                    console.warn('⚠️ Unable to fetch root key:', err);
                    // Continue anyway
                }
            }

            this.isInitialized = true;
            return this.agent;
        } catch (error) {
            console.error('❌ Failed to initialize agent:', error);
            throw error;
        }
    }

    async login() {
        try {
            console.log('🔐 Attempting to login...');

            // Try Plug wallet first
            if (window.ic?.plug) {
                try {
                    const connected = await window.ic.plug.isConnected();
                    if (!connected) {
                        const whitelist = [
                            userManagementCanisterId,
                            supplyChainCanisterId,
                            ratingCanisterId,
                            reportingCanisterId,
                        ];

                        const host = process.env.DFX_NETWORK === 'ic' ? 'https://icp0.io' : 'http://localhost:4943';

                        const result = await window.ic.plug.requestConnect({
                            whitelist: whitelist,
                            host: host,
                        });

                        if (!result) {
                            throw new Error('User rejected connection');
                        }
                    }

                    await window.ic.plug.createAgent({
                        whitelist: [
                            userManagementCanisterId,
                            supplyChainCanisterId,
                            ratingCanisterId,
                            reportingCanisterId,
                        ],
                        host: process.env.DFX_NETWORK === 'ic' ? 'https://icp0.io' : 'http://localhost:4943',
                    });

                    this.agent = window.ic.plug.agent;
                    this.identity = window.ic.plug.agent.identity;
                    this.isPlugConnected = true;

                    // Fetch root key for local development
                    if (process.env.DFX_NETWORK !== 'ic') {
                        try {
                            await this.agent.fetchRootKey();
                            console.log('✅ Root key fetched for Plug wallet');
                        } catch (err) {
                            console.warn('⚠️ Failed to fetch root key for Plug:', err);
                        }
                    }

                    this.isInitialized = true;
                    console.log('✅ Plug wallet connected successfully');
                    return true;
                } catch (plugError) {
                    console.warn('⚠️ Plug wallet connection failed:', plugError);
                    // Fall through to Internet Identity
                }
            }

            // Fallback to Internet Identity
            console.log('🔄 Falling back to Internet Identity...');
            this.authClient = await AuthClient.create({
                idleOptions: {
                    disableIdle: true,
                    disableDefaultIdleCallback: true,
                },
            });

            return new Promise((resolve, reject) => {
                this.authClient.login({
                    identityProvider: process.env.DFX_NETWORK === 'ic'
                        ? 'https://identity.ic0.app'
                        : `http://localhost:4943?canisterId=${process.env.INTERNET_IDENTITY_CANISTER_ID}`,
                    maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days
                    onSuccess: async () => {
                        try {
                            this.identity = this.authClient.getIdentity();
                            await this.initializeAgent();
                            console.log('✅ Internet Identity login successful');
                            resolve(true);
                        } catch (error) {
                            console.error('❌ Failed to initialize after II login:', error);
                            reject(error);
                        }
                    },
                    onError: (error) => {
                        console.error('❌ Internet Identity login failed:', error);
                        reject(error);
                    },
                });
            });
        } catch (error) {
            console.error('❌ Login failed:', error);
            throw error;
        }
    }

    async logout() {
        try {
            if (this.isPlugConnected && window.ic?.plug) {
                await window.ic.plug.disconnect();
                this.isPlugConnected = false;
            }

            if (this.authClient) {
                await this.authClient.logout();
                this.authClient = null;
            }

            this.identity = null;
            this.agent = null;
            this.actors = {};
            this.isInitialized = false;
            console.log('✅ Logout successful');
        } catch (error) {
            console.error('❌ Logout failed:', error);
            throw error;
        }
    }

    async isAuthenticated() {
        try {
            if (this.isPlugConnected && window.ic?.plug) {
                return await window.ic.plug.isConnected();
            }

            if (!this.authClient) {
                this.authClient = await AuthClient.create();
            }

            const isAuth = await this.authClient.isAuthenticated();

            if (isAuth && !this.isInitialized && this.authClient) {
                this.identity = this.authClient.getIdentity();
                await this.initializeAgent();
            }

            return isAuth;
        } catch (error) {
            console.error('❌ Authentication check failed:', error);
            return false;
        }
    }

    async getCurrentUser() {
        try {
            if (!this.isInitialized) {
                throw new Error('Agent not initialized');
            }

            const userManagementActor = await this.getUserManagementActor();
            const result = await userManagementActor.get_current_user();

            if ('Ok' in result) {
                return result.Ok;
            } else if ('Err' in result) {
                console.log('User not found:', result.Err);
                return null;
            }

            return null;
        } catch (error) {
            console.error('Failed to get current user:', error);
            return null;
        }
    }

    async getUserManagementActor() {
        if (!this.agent || !this.isInitialized) {
            throw new Error('Not authenticated or agent not initialized');
        }

        if (!this.actors.userManagement) {
            try {
                this.actors.userManagement = createUserManagementActor(userManagementCanisterId, {
                    agent: this.agent,
                });
            } catch (error) {
                console.error('Failed to create user management actor:', error);
                throw error;
            }
        }

        return this.actors.userManagement;
    }

    async getSupplyChainActor() {
        if (!this.agent || !this.isInitialized) {
            throw new Error('Not authenticated or agent not initialized');
        }

        if (!this.actors.supplyChain) {
            try {
                this.actors.supplyChain = createSupplyChainActor(supplyChainCanisterId, {
                    agent: this.agent,
                });
            } catch (error) {
                console.error('Failed to create supply chain actor:', error);
                throw error;
            }
        }

        return this.actors.supplyChain;
    }

    async getRatingActor() {
        if (!this.agent || !this.isInitialized) {
            throw new Error('Not authenticated or agent not initialized');
        }

        if (!this.actors.rating) {
            try {
                this.actors.rating = createRatingActor(ratingCanisterId, {
                    agent: this.agent,
                });
            } catch (error) {
                console.error('Failed to create rating actor:', error);
                throw error;
            }
        }

        return this.actors.rating;
    }

    async getReportingActor() {
        if (!this.agent || !this.isInitialized) {
            throw new Error('Not authenticated or agent not initialized');
        }

        if (!this.actors.reporting) {
            try {
                this.actors.reporting = createReportingActor(reportingCanisterId, {
                    agent: this.agent,
                });
            } catch (error) {
                console.error('Failed to create reporting actor:', error);
                throw error;
            }
        }

        return this.actors.reporting;
    }

    getAgent() {
        return this.agent;
    }

    getPrincipal() {
        if (this.identity) {
            return this.identity.getPrincipal();
        }
        return null;
    }

    // Helper method to ensure agent is ready
    async ensureReady() {
        if (!this.isInitialized) {
            const isAuth = await this.isAuthenticated();
            if (!isAuth) {
                throw new Error('Not authenticated');
            }
        }
        return this.agent;
    }
}

export default AuthService.getInstance();
