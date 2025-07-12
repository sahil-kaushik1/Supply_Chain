import { Actor, HttpAgent } from '@dfinity/agent';
import { AuthClient } from '@dfinity/auth-client';
import { Principal } from '@dfinity/principal';

// Import generated declarations
import {
    canisterId as userManagementCanisterId,
    createActor as createUserManagementActor,
    idlFactory as userManagementIdlFactory
} from '../../../declarations/user_management_backend';

import {
    canisterId as supplyChainCanisterId,
    createActor as createSupplyChainActor,
    idlFactory as supplyChainIdlFactory
} from '../../../declarations/supply_chain_backend';

import {
    canisterId as ratingCanisterId,
    createActor as createRatingActor,
    idlFactory as ratingIdlFactory
} from '../../../declarations/rating_backend';

import {
    canisterId as reportingCanisterId,
    createActor as createReportingActor,
    idlFactory as reportingIdlFactory
} from '../../../declarations/reporting_backend';

export class AuthService {
    constructor() {
        this.authClient = null;
        this.identity = null;
        this.agent = null;
        this.isPlugConnected = false;
        this.actors = {};
        this.isInitialized = false;
        this.connectionTested = false;
        this.workingHost = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.isLocalDevelopment = null;
        this.connectionPromise = null;
        this.plugAgent = null;
    }

    static getInstance() {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }

    // CRITICAL FIX: Enhanced environment detection
    getEnvironment() {
        if (this.isLocalDevelopment !== null) {
            return this.isLocalDevelopment;
        }

        const isLocal = process.env.DFX_NETWORK !== 'ic' ||
            process.env.NODE_ENV === 'development' ||
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.port === '3000' ||
            window.location.port === '4943' ||
            window.location.origin.includes('localhost');

        this.isLocalDevelopment = isLocal;
        console.log(`🌍 Environment detected: ${isLocal ? 'Local Development' : 'Production'}`);
        return isLocal;
    }

    // CRITICAL FIX: Always use correct port
    getHost() {
        if (!this.getEnvironment()) {
            return 'https://icp-api.io';
        }
        // FIXED: Only use port 4943, never 5000
        return this.workingHost || 'http://localhost:4943';
    }

    // CRITICAL FIX: Enhanced connection testing
    async testConnection() {
        if (this.connectionTested && this.workingHost) {
            return this.workingHost;
        }

        if (this.connectionPromise) {
            return this.connectionPromise;
        }

        this.connectionPromise = this._performConnectionTest();
        try {
            const result = await this.connectionPromise;
            return result;
        } finally {
            this.connectionPromise = null;
        }
    }

    async _performConnectionTest() {
        // FIXED: Only test port 4943
        const hostsToTest = [
            'http://localhost:4943',
            'http://127.0.0.1:4943',
            'http://0.0.0.0:4943'
        ];

        for (const host of hostsToTest) {
            try {
                console.log(`🔍 Testing connection to ${host}...`);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);

                const response = await fetch(`${host}/api/v2/status`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    console.log(`✅ Connected to IC replica at ${host}`);
                    this.workingHost = host;
                    this.connectionTested = true;
                    return host;
                }
            } catch (error) {
                console.warn(`❌ Failed to connect to ${host}:`, error.message);
            }
        }

        if (this.getEnvironment()) {
            console.warn('⚠️ No local IC replica found, using default localhost:4943');
            this.workingHost = 'http://localhost:4943';
            this.connectionTested = true;
            return this.workingHost;
        }

        throw new Error('No working host found');
    }

    // CRITICAL FIX: Agent creation without fetchRootKey issues
    async createAgentForII() {
        try {
            const isLocal = this.getEnvironment();
            let host = this.getHost();

            if (isLocal) {
                try {
                    const workingHost = await this.testConnection();
                    host = workingHost;
                } catch (error) {
                    console.warn('Connection test failed, using default host:', error.message);
                }
            }

            console.log(`🔌 Creating agent with host: ${host}`);

            const agentOptions = {
                identity: this.identity,
                host: host,
                fetchOptions: { credentials: 'omit' },
            };

            if (isLocal) {
                agentOptions.shouldFetchRootKey = true;
                agentOptions.verifyQuerySignatures = false;
            }

            this.agent = await HttpAgent.create(agentOptions);

            // FIXED: Only fetch root key for our own agents
            if (isLocal && this.agent && typeof this.agent.fetchRootKey === 'function') {
                try {
                    await this.agent.fetchRootKey();
                    console.log('✅ Root key fetched successfully');
                } catch (error) {
                    console.warn('⚠️ Root key fetch failed, continuing anyway:', error.message);
                }
            }

            console.log('✅ Agent created successfully');
            this.isInitialized = true;
            return this.agent;
        } catch (error) {
            console.error('❌ Failed to create agent:', error);
            throw new Error(`Agent creation failed: ${error.message}`);
        }
    }

    // CRITICAL FIX: Plug wallet setup WITHOUT fetchRootKey calls
    async setupPlugWallet() {
        try {
            const isLocal = this.getEnvironment();
            let host = this.getHost();

            if (isLocal) {
                const workingHost = await this.testConnection();
                host = workingHost;
            }

            console.log(`🔌 Setting up Plug wallet with host: ${host}`);

            const whitelist = [
                userManagementCanisterId,
                supplyChainCanisterId,
                ratingCanisterId,
                reportingCanisterId,
            ];

            const plugConfig = {
                whitelist: whitelist,
                host: host,
                timeout: 60000,
                ...(isLocal && { dev: true, providerUrl: host })
            };

            const connected = await window.ic.plug.isConnected();
            if (!connected) {
                const result = await window.ic.plug.requestConnect(plugConfig);
                if (!result) {
                    throw new Error('User rejected Plug connection');
                }
            }

            if (!window.ic.plug.agent) {
                await window.ic.plug.createAgent(plugConfig);
            }

            // CRITICAL FIX: DO NOT call fetchRootKey on Plug agent
            this.plugAgent = window.ic.plug.agent;
            this.agent = window.ic.plug.agent;
            this.identity = window.ic.plug.agent.identity;
            this.isPlugConnected = true;
            this.isInitialized = true;

            console.log('✅ Plug wallet configured successfully');
            return true;
        } catch (error) {
            console.error('❌ Plug wallet setup failed:', error);
            throw error;
        }
    }

    async login() {
        try {
            console.log('🔐 Attempting to login...');
            this.retryCount = 0;
            await this.clearStalePlugSession();

            if (this.getEnvironment()) {
                await this.testConnection();
            }

            if (window.ic?.plug) {
                try {
                    await this.setupPlugWallet();
                    console.log('✅ Plug wallet login successful');
                    return true;
                } catch (plugError) {
                    console.warn('⚠️ Plug wallet login failed:', plugError.message);
                }
            }

            console.log('🔄 Using Internet Identity...');
            return await this.loginWithInternetIdentity();
        } catch (error) {
            console.error('❌ Login failed:', error);
            throw error;
        }
    }

    async loginWithInternetIdentity() {
        try {
            this.authClient = await AuthClient.create({
                idleOptions: {
                    disableIdle: true,
                    disableDefaultIdleCallback: true,
                },
            });

            return new Promise((resolve, reject) => {
                const isLocal = this.getEnvironment();
                const host = this.getHost();

                const identityProvider = isLocal
                    ? `${host}?canisterId=${process.env.INTERNET_IDENTITY_CANISTER_ID || 'rdmx6-jaaaa-aaaaa-aaadq-cai'}`
                    : 'https://identity.ic0.app';

                this.authClient.login({
                    identityProvider,
                    maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000),
                    onSuccess: async () => {
                        try {
                            this.identity = this.authClient.getIdentity();
                            this.isPlugConnected = false;
                            await this.createAgentForII();
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
            console.error('❌ Internet Identity login failed:', error);
            throw error;
        }
    }

    async clearStalePlugSession() {
        try {
            if (window.ic?.plug) {
                const isConnected = await window.ic.plug.isConnected();
                if (isConnected) {
                    console.log('🔄 Clearing stale Plug session...');
                    await window.ic.plug.disconnect();
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        } catch (error) {
            console.warn('⚠️ Error clearing Plug session:', error.message);
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
            this.plugAgent = null;
            this.actors = {};
            this.isInitialized = false;
            this.connectionTested = false;
            this.workingHost = null;
            this.retryCount = 0;
            this.connectionPromise = null;
            console.log('✅ Logout successful');
        } catch (error) {
            console.error('❌ Logout failed:', error);
            throw error;
        }
    }

    async isAuthenticated() {
        try {
            if (this.isPlugConnected && window.ic?.plug) {
                const connected = await window.ic.plug.isConnected();
                if (connected && !this.isInitialized) {
                    await this.setupPlugWallet();
                }
                return connected;
            }

            if (!this.authClient) {
                this.authClient = await AuthClient.create({
                    idleOptions: {
                        disableIdle: true,
                        disableDefaultIdleCallback: true,
                    },
                });
            }

            const isAuth = await this.authClient.isAuthenticated();
            if (isAuth && !this.isInitialized && this.authClient) {
                this.identity = this.authClient.getIdentity();
                this.isPlugConnected = false;
                await this.createAgentForII();
            }

            return isAuth;
        } catch (error) {
            console.error('❌ Authentication check failed:', error);
            return false;
        }
    }

    // CRITICAL FIX: Enhanced actor creation
    async createActorSafely(canisterId, createActorFunction, idlFactory) {
        if (!this.agent || !this.isInitialized) {
            throw new Error('Not authenticated or agent not initialized');
        }

        try {
            if (this.isPlugConnected && window.ic?.plug) {
                console.log(`🔧 Creating Plug actor for canister: ${canisterId}`);
                const actor = await window.ic.plug.createActor({
                    canisterId: canisterId,
                    interfaceFactory: idlFactory,
                    host: this.getHost(),
                });
                console.log('✅ Plug actor created successfully');
                return actor;
            }

            console.log(`🔧 Creating II actor for canister: ${canisterId}`);
            const actor = createActorFunction(canisterId, {
                agent: this.agent,
            });
            console.log('✅ II actor created successfully');
            return actor;
        } catch (error) {
            console.error('❌ Failed to create actor:', error);

            if (error.message.includes('certificate') && this.retryCount < this.maxRetries) {
                console.log(`🔄 Retrying actor creation (${this.retryCount + 1}/${this.maxRetries})`);
                this.retryCount++;
                await new Promise(resolve => setTimeout(resolve, 1000 * this.retryCount));

                if (!this.isPlugConnected) {
                    await this.createAgentForII();
                }

                return this.createActorSafely(canisterId, createActorFunction, idlFactory);
            }

            throw error;
        }
    }

    // CRITICAL FIX: Safe canister calling with proper error handling
    async callCanisterSafely(actorPromise, methodName, ...args) {
        try {
            const actor = await actorPromise;
            const result = await actor[methodName](...args);
            return result;
        } catch (error) {
            console.error(`❌ Failed to call ${methodName}:`, error);

            if (error.message.includes('certificate') || error.message.includes('Certificate')) {
                console.log('🔄 Attempting to refresh actor due to certificate error');
                this.clearActors();
                await this.createAgentForII();

                const actor = await actorPromise;
                return await actor[methodName](...args);
            }

            throw error;
        }
    }

    // CRITICAL FIX: Proper enum serialization for Candid
    serializeEnumForCandid(enumValue) {
        if (typeof enumValue === 'string') {
            return { [enumValue]: null };
        }
        if (typeof enumValue === 'object' && enumValue !== null) {
            return enumValue;
        }
        throw new Error(`Invalid enum value: ${enumValue}`);
    }

    // CRITICAL FIX: Proper enum deserialization from Candid
    deserializeEnumFromCandid(candidEnum) {
        if (typeof candidEnum === 'object' && candidEnum !== null) {
            const keys = Object.keys(candidEnum);
            if (keys.length === 1) {
                return keys[0];
            }
        }
        return candidEnum;
    }

    async getCurrentUser() {
        try {
            if (!this.isInitialized) {
                throw new Error('Agent not initialized');
            }

            const result = await this.callCanisterSafely(
                this.getUserManagementActor(),
                'get_current_user'
            );

            if (result && 'Ok' in result) {
                const user = result.Ok;
                if (user.role) {
                    user.role = this.deserializeEnumFromCandid(user.role);
                }
                return { Ok: user };
            }

            return result;
        } catch (error) {
            console.error('Failed to get current user:', error);
            return null;
        }
    }

    // Actor getters with caching
    async getUserManagementActor() {
        if (!this.actors.userManagement) {
            this.actors.userManagement = await this.createActorSafely(
                userManagementCanisterId,
                createUserManagementActor,
                userManagementIdlFactory
            );
        }
        return this.actors.userManagement;
    }

    async getSupplyChainActor() {
        if (!this.actors.supplyChain) {
            this.actors.supplyChain = await this.createActorSafely(
                supplyChainCanisterId,
                createSupplyChainActor,
                supplyChainIdlFactory
            );
        }
        return this.actors.supplyChain;
    }

    async getRatingActor() {
        if (!this.actors.rating) {
            this.actors.rating = await this.createActorSafely(
                ratingCanisterId,
                createRatingActor,
                ratingIdlFactory
            );
        }
        return this.actors.rating;
    }

    async getReportingActor() {
        if (!this.actors.reporting) {
            this.actors.reporting = await this.createActorSafely(
                reportingCanisterId,
                createReportingActor,
                reportingIdlFactory
            );
        }
        return this.actors.reporting;
    }

    // Utility methods
    getAgent() {
        return this.agent;
    }

    getPrincipal() {
        if (this.identity) {
            return this.identity.getPrincipal();
        }
        return null;
    }

    async ensureReady() {
        if (!this.isInitialized) {
            const isAuth = await this.isAuthenticated();
            if (!isAuth) {
                throw new Error('Not authenticated');
            }
        }
        return this.agent;
    }

    async checkConnectionStatus() {
        try {
            const host = this.getHost();
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`${host}/api/v2/status`, {
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    clearActors() {
        this.actors = {};
    }

    async retryWithBackoff(fn, maxRetries = 3) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                if (i === maxRetries - 1) throw error;
                const delay = Math.pow(2, i) * 1000;
                console.log(`Retry ${i + 1}/${maxRetries} in ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    async refreshPlugSession() {
        if (this.isPlugConnected && window.ic?.plug) {
            try {
                await this.clearStalePlugSession();
                await this.setupPlugWallet();
            } catch (error) {
                console.error('Failed to refresh Plug session:', error);
            }
        }
    }

    async healthCheck() {
        try {
            const isAuth = await this.isAuthenticated();
            const connectionOk = await this.checkConnectionStatus();

            return {
                authenticated: isAuth,
                connectionOk: connectionOk,
                initialized: this.isInitialized,
                plugConnected: this.isPlugConnected,
                host: this.getHost(),
                environment: this.getEnvironment() ? 'local' : 'production'
            };
        } catch (error) {
            console.error('Health check failed:', error);
            return {
                authenticated: false,
                connectionOk: false,
                initialized: false,
                plugConnected: false,
                host: this.getHost(),
                environment: this.getEnvironment() ? 'local' : 'production',
                error: error.message
            };
        }
    }
}

export default AuthService.getInstance();
