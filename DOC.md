# T-REX (ERC-3643) Codebase Architecture Documentation

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Core Contracts](#core-contracts)
4. [Contract Interactions](#contract-interactions)
5. [Deployment Flow](#deployment-flow)
6. [Architecture Diagrams](#architecture-diagrams)

---

## Overview

The T-REX protocol is a comprehensive implementation of the **ERC-3643 standard** for security tokens. It enables compliant token issuance, management, and transfer on EVM blockchains. The system enforces regulatory compliance through identity verification, claim validation, and modular compliance rules.

**Key Features:**

- Identity-based token transfers
- Claim verification system
- Modular compliance framework
- Agent role management
- Factory pattern for deployment
- Upgradeable proxy architecture

---

## System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         T-REX ECOSYSTEM                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐         ┌──────────────┐         ┌─────────────┐ │
│  │ TREXGateway  │────────▶│ TREXFactory  │────────▶│ All Proxies │ │
│  │ (Entry Point)│         │ (Deployment) │         │             │ │
│  └──────────────┘         └──────────────┘         └─────────────┘ │
│         │                                                   │         │
│         │                                                   ▼         │
│         │                    ┌──────────────────────────────────┐   │
│         │                    │    TREX Token Suite              │   │
│         │                    ├──────────────────────────────────┤   │
│         └───────────────────▶│  • Token                         │   │
│                              │  • IdentityRegistry               │   │
│                              │  • ModularCompliance              │   │
│                              │  • TrustedIssuersRegistry         │   │
│                              │  • ClaimTopicsRegistry            │   │
│                              │  • IdentityRegistryStorage        │   │
│                              └──────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Core Contracts

### 1. Token Contract (`contracts/token/Token.sol`)

**Purpose:** The main ERC-20 compatible security token with compliance and identity checks.

**Key Functions:**

#### Transfer Functions

- `transfer(address _to, uint256 _amount)` - Transfer tokens with compliance checks
- `transferFrom(address _from, address _to, uint256 _amount)` - Delegated transfer
- `forcedTransfer(address _from, address _to, uint256 _amount)` - Agent-only forced transfer
- `batchTransfer(address[] _toList, uint256[] _amounts)` - Batch transfers

#### Mint/Burn Functions

- `mint(address _to, uint256 _amount)` - Mint tokens (Agent only)
- `burn(address _userAddress, uint256 _amount)` - Burn tokens (Agent only)
- `batchMint(address[] _toList, uint256[] _amounts)` - Batch minting
- `batchBurn(address[] _userAddresses, uint256[] _amounts)` - Batch burning

#### Freeze Functions

- `setAddressFrozen(address _userAddress, bool _freeze)` - Freeze/unfreeze wallet
- `freezePartialTokens(address _userAddress, uint256 _amount)` - Freeze specific amount
- `unfreezePartialTokens(address _userAddress, uint256 _amount)` - Unfreeze specific amount
- `batchSetAddressFrozen(address[] _userAddresses, bool[] _freeze)` - Batch freeze

#### Configuration Functions

- `setIdentityRegistry(address _identityRegistry)` - Set identity registry
- `setCompliance(address _compliance)` - Set compliance contract
- `pause()` / `unpause()` - Pause/unpause token transfers
- `setName(string _name)` - Update token name
- `setSymbol(string _symbol)` - Update token symbol
- `setOnchainID(address _onchainID)` - Set token's OnChainID

#### Recovery Functions

- `recoveryAddress(address _lostWallet, address _newWallet, address _investorOnchainID)` - Recover tokens from lost wallet

**Interactions:**

- Calls `IdentityRegistry.isVerified()` to check investor eligibility
- Calls `ModularCompliance.canTransfer()` before transfers
- Calls `ModularCompliance.transferred()` after successful transfers
- Calls `ModularCompliance.created()` after minting
- Calls `ModularCompliance.destroyed()` after burning

---

### 2. Identity Registry (`contracts/registry/implementation/IdentityRegistry.sol`)

**Purpose:** Manages investor identities and verifies claims for token eligibility.

**Key Functions:**

#### Identity Management

- `registerIdentity(address _userAddress, IIdentity _identity, uint16 _country)` - Register investor
- `batchRegisterIdentity(address[] _userAddresses, IIdentity[] _identities, uint16[] _countries)` - Batch registration
- `updateIdentity(address _userAddress, IIdentity _identity)` - Update identity contract
- `updateCountry(address _userAddress, uint16 _country)` - Update investor country
- `deleteIdentity(address _userAddress)` - Remove identity

#### Verification Functions

- `isVerified(address _userAddress)` - Check if investor has valid claims
- `contains(address _userAddress)` - Check if identity exists
- `identity(address _userAddress)` - Get identity contract
- `investorCountry(address _userAddress)` - Get investor country

#### Configuration Functions

- `setIdentityRegistryStorage(address _identityRegistryStorage)` - Set storage contract
- `setClaimTopicsRegistry(address _claimTopicsRegistry)` - Set claim topics registry
- `setTrustedIssuersRegistry(address _trustedIssuersRegistry)` - Set trusted issuers

**Interactions:**

- Calls `IdentityRegistryStorage` for identity data storage
- Calls `ClaimTopicsRegistry.getClaimTopics()` for required claims
- Calls `TrustedIssuersRegistry.getTrustedIssuersForClaimTopic()` for trusted issuers
- Calls `IIdentity.getClaim()` on user's identity contract
- Calls `IClaimIssuer.isClaimValid()` to validate claims

---

### 3. Modular Compliance (`contracts/compliance/modular/ModularCompliance.sol`)

**Purpose:** Enforces transfer rules through pluggable compliance modules.

**Key Functions:**

#### Module Management

- `addModule(address _module)` - Add compliance module (max 25 modules)
- `removeModule(address _module)` - Remove compliance module
- `callModuleFunction(bytes callData, address _module)` - Execute module function
- `isModuleBound(address _module)` - Check if module is bound
- `getModules()` - Get all bound modules

#### Token Binding

- `bindToken(address _token)` - Bind to token contract
- `unbindToken(address _token)` - Unbind from token contract

#### Transfer Hooks

- `canTransfer(address _from, address _to, uint256 _value)` - Pre-transfer check
- `transferred(address _from, address _to, uint256 _value)` - Post-transfer hook
- `created(address _to, uint256 _value)` - Post-mint hook
- `destroyed(address _from, uint256 _value)` - Post-burn hook

**Interactions:**

- Called by `Token` contract before/after transfers
- Calls `IModule.moduleCheck()` on all modules for transfer validation
- Calls `IModule.moduleTransferAction()` on all modules after transfers
- Calls `IModule.moduleMintAction()` on all modules after minting
- Calls `IModule.moduleBurnAction()` on all modules after burning

---

### 4. Trusted Issuers Registry (`contracts/registry/implementation/TrustedIssuersRegistry.sol`)

**Purpose:** Manages the list of trusted claim issuers for the token.

**Key Functions:**

#### Issuer Management

- `addTrustedIssuer(IClaimIssuer _trustedIssuer, uint256[] _claimTopics)` - Add trusted issuer (max 50)
- `removeTrustedIssuer(IClaimIssuer _trustedIssuer)` - Remove trusted issuer
- `updateIssuerClaimTopics(IClaimIssuer _trustedIssuer, uint256[] _claimTopics)` - Update claim topics (max 15)

#### Query Functions

- `getTrustedIssuers()` - Get all trusted issuers
- `getTrustedIssuersForClaimTopic(uint256 claimTopic)` - Get issuers for specific claim
- `isTrustedIssuer(address _issuer)` - Check if issuer is trusted
- `getTrustedIssuerClaimTopics(IClaimIssuer _trustedIssuer)` - Get issuer's claim topics
- `hasClaimTopic(address _issuer, uint256 _claimTopic)` - Check if issuer has claim topic

**Interactions:**

- Called by `IdentityRegistry.isVerified()` to get trusted issuers
- No outbound calls to other contracts

---

### 5. Claim Topics Registry (`contracts/registry/implementation/ClaimTopicsRegistry.sol`)

**Purpose:** Defines which claim types are required for token holders.

**Key Functions:**

#### Topic Management

- `addClaimTopic(uint256 _claimTopic)` - Add required claim topic (max 15)
- `removeClaimTopic(uint256 _claimTopic)` - Remove claim topic
- `getClaimTopics()` - Get all required claim topics

**Interactions:**

- Called by `IdentityRegistry.isVerified()` to get required claims
- No outbound calls to other contracts

---

### 6. Identity Registry Storage (`contracts/registry/implementation/IdentityRegistryStorage.sol`)

**Purpose:** Stores identity data for registered investors.

**Key Functions:**

#### Storage Management

- `addIdentityToStorage(address _userAddress, IIdentity _identity, uint16 _country)` - Add identity
- `modifyStoredIdentity(address _userAddress, IIdentity _identity)` - Update identity
- `modifyStoredInvestorCountry(address _userAddress, uint16 _country)` - Update country
- `removeIdentityFromStorage(address _userAddress)` - Remove identity

#### Registry Binding

- `bindIdentityRegistry(address _identityRegistry)` - Bind registry (max 300)
- `unbindIdentityRegistry(address _identityRegistry)` - Unbind registry
- `linkedIdentityRegistries()` - Get all bound registries

#### Query Functions

- `storedIdentity(address _userAddress)` - Get identity contract
- `storedInvestorCountry(address _userAddress)` - Get investor country

**Interactions:**

- Called by `IdentityRegistry` for all identity data operations
- Automatically adds/removes agents through `AgentRoleUpgradeable`

---

### 7. TREX Factory (`contracts/factory/TREXFactory.sol`)

**Purpose:** Deploys complete TREX token suites using CREATE2 for deterministic addresses.

**Key Functions:**

#### Deployment

- `deployTREXSuite(string _salt, TokenDetails _tokenDetails, ClaimDetails _claimDetails)` - Deploy full suite
- `recoverContractOwnership(address _contract, address _newOwner)` - Transfer ownership

#### Configuration

- `setImplementationAuthority(address implementationAuthority_)` - Set implementation authority
- `setIdFactory(address idFactory_)` - Set OnChainID factory

#### Query Functions

- `getImplementationAuthority()` - Get implementation authority
- `getIdFactory()` - Get OnChainID factory
- `getToken(string _salt)` - Get deployed token address

**Deployment Process:**

1. Deploys TrustedIssuersRegistry proxy
2. Deploys ClaimTopicsRegistry proxy
3. Deploys ModularCompliance proxy
4. Deploys IdentityRegistryStorage proxy (if not provided)
5. Deploys IdentityRegistry proxy
6. Deploys Token proxy
7. Creates OnChainID for token (if not provided)
8. Configures all contracts (adds claim topics, trusted issuers, agents)
9. Binds contracts together
10. Adds compliance modules
11. Transfers ownership to specified owner

**Interactions:**

- Deploys all proxy contracts
- Calls initialization functions on all contracts
- Calls `IIdFactory.createTokenIdentity()` for OnChainID creation
- Configures all contract relationships
- Transfers ownership of all contracts

---

### 8. TREX Gateway (`contracts/factory/TREXGateway.sol`)

**Purpose:** Entry point for TREX deployments with access control and fee management.

**Key Functions:**

#### Deployment

- `deployTREXSuite(TokenDetails _tokenDetails, ClaimDetails _claimDetails)` - Deploy single suite
- `batchDeployTREXSuite(TokenDetails[] _tokenDetails, ClaimDetails[] _claimDetails)` - Deploy multiple (max 5)

#### Access Control

- `addDeployer(address deployer)` - Add authorized deployer
- `removeDeployer(address deployer)` - Remove deployer
- `batchAddDeployer(address[] deployers)` - Batch add deployers (max 500)
- `batchRemoveDeployer(address[] deployers)` - Batch remove deployers (max 500)
- `setPublicDeploymentStatus(bool _isEnabled)` - Enable/disable public deployment

#### Fee Management

- `enableDeploymentFee(bool _isEnabled)` - Enable/disable deployment fees
- `setDeploymentFee(uint256 _fee, address _feeToken, address _feeCollector)` - Configure fees
- `applyFeeDiscount(address deployer, uint16 discount)` - Set discount (0-10000 = 0-100%)
- `batchApplyFeeDiscount(address[] deployers, uint16[] discounts)` - Batch discounts

#### Configuration

- `setFactory(address factory)` - Set factory address
- `transferFactoryOwnership(address _newOwner)` - Transfer factory ownership

#### Query Functions

- `isDeployer(address deployer)` - Check if address is deployer
- `calculateFee(address deployer)` - Calculate fee with discount
- `getPublicDeploymentStatus()` - Get public deployment status
- `getFactory()` - Get factory address
- `getDeploymentFee()` - Get fee details
- `isDeploymentFeeEnabled()` - Check if fees enabled

**Interactions:**

- Calls `TREXFactory.deployTREXSuite()` for deployment
- Calls `IERC20.transferFrom()` to collect deployment fees
- Calls `Ownable.transferOwnership()` on factory

---

### 9. Compliance Modules (`contracts/compliance/modular/modules/`)

**Purpose:** Pluggable modules that enforce specific compliance rules.

**Base Class:** `AbstractModule`

**Common Functions:**

- `bindCompliance(address _compliance)` - Bind to compliance contract
- `unbindCompliance(address _compliance)` - Unbind from compliance
- `isComplianceBound(address _compliance)` - Check binding status

**Module Interface (IModule):**

- `moduleCheck(address _from, address _to, uint256 _value, address _compliance)` - Validate transfer
- `moduleTransferAction(address _from, address _to, uint256 _value)` - Post-transfer action
- `moduleMintAction(address _to, uint256 _value)` - Post-mint action
- `moduleBurnAction(address _from, uint256 _value)` - Post-burn action
- `canComplianceBind(address _compliance)` - Check if binding allowed
- `isPlugAndPlay()` - Check if module is plug-and-play

**Example Modules** (in `contracts/compliance/legacy/features/`):

- `CountryRestrictions` - Block specific countries
- `CountryWhitelisting` - Allow only specific countries
- `MaxBalance` - Enforce max token balance per holder
- `SupplyLimit` - Enforce total supply limits
- `DayMonthLimits` - Daily/monthly transfer limits
- `ExchangeMonthlyLimits` - Exchange-specific limits
- `ApproveTransfer` - Manual transfer approval

**Interactions:**

- Called by `ModularCompliance` for all transfer validations
- May call `Token` contract to query balances
- May call `IdentityRegistry` to get investor countries

---

### 10. Agent Role Management (`contracts/roles/AgentRoleUpgradeable.sol`)

**Purpose:** Manages agent permissions for administrative functions.

**Key Functions:**

- `addAgent(address _agent)` - Add agent (Owner only)
- `removeAgent(address _agent)` - Remove agent (Owner only)
- `isAgent(address _agent)` - Check if address is agent

**Modifier:**

- `onlyAgent()` - Restricts function to agents only

**Used By:**

- Token contract (for mint, burn, freeze operations)
- IdentityRegistry (for identity management)
- IdentityRegistryStorage (for storage operations)

---

### 11. Proxy Contracts (`contracts/proxy/`)

**Purpose:** Enable upgradeability through proxy pattern.

**Proxy Types:**

- `TokenProxy` - Token implementation proxy
- `IdentityRegistryProxy` - Identity registry proxy
- `IdentityRegistryStorageProxy` - Storage proxy
- `ModularComplianceProxy` - Compliance proxy
- `TrustedIssuersRegistryProxy` - Trusted issuers proxy
- `ClaimTopicsRegistryProxy` - Claim topics proxy

**Implementation Authority (`contracts/proxy/authority/TREXImplementationAuthority.sol`)**

**Functions:**

- `setTokenImplementation(address _tokenImplementation)` - Set token implementation
- `setIRImplementation(address _IRImplementation)` - Set identity registry implementation
- `setIRSImplementation(address _IRSImplementation)` - Set storage implementation
- `setMCImplementation(address _MCImplementation)` - Set compliance implementation
- `setTIRImplementation(address _TIRImplementation)` - Set trusted issuers implementation
- `setCTRImplementation(address _CTRImplementation)` - Set claim topics implementation
- Get functions for all implementations

**Interactions:**

- All proxies delegate calls to implementation contracts
- Implementation authority manages upgrade paths

---

## Contract Interactions

### Transfer Flow Diagram

```
┌────────────┐
│   User     │
│  Wallet    │
└─────┬──────┘
      │ 1. transfer()
      ▼
┌────────────────────────────────────────────────────────┐
│                    Token Contract                       │
├────────────────────────────────────────────────────────┤
│ • Check if wallets frozen                              │
│ • Check available balance                              │
│ • Verify recipient identity ─────┐                     │
│ • Check compliance rules ────┐   │                     │
└───────────────────────────────┼───┼─────────────────────┘
                                │   │
      ┌─────────────────────────┘   └──────────────────┐
      │ 2. canTransfer()                               │
      ▼                                      3. isVerified()
┌──────────────────────────┐                           │
│  ModularCompliance       │                           ▼
├──────────────────────────┤           ┌─────────────────────────────┐
│ For each module:         │           │   IdentityRegistry          │
│   moduleCheck()          │           ├─────────────────────────────┤
│     │                    │           │ • Check identity exists     │
│     └──────────┐         │           │ • Get required claims ──┐   │
└────────────────┼─────────┘           │ • Get trusted issuers ──┼─┐ │
                 │                     │ • Validate all claims   │ │ │
                 ▼                     └──────────────────┼──────┼─┼─┘
┌──────────────────────────┐                             │      │ │
│  Compliance Modules      │                             │      │ │
├──────────────────────────┤          ┌──────────────────┘      │ │
│ • CountryRestrictions    │          │ 4. getClaimTopics()     │ │
│ • MaxBalance             │          ▼                         │ │
│ • SupplyLimit            │    ┌──────────────────────┐        │ │
│ • DayMonthLimits         │    │ ClaimTopicsRegistry  │        │ │
│ • etc.                   │    └──────────────────────┘        │ │
└──────────────────────────┘                                    │ │
                                     5. getTrustedIssuersFor    │ │
       If all checks pass                  ClaimTopic()         │ │
              │                                                  │ │
              ▼                      ┌───────────────────────────┘ │
┌────────────────────────────────┐  │                             │
│      Token._transfer()         │  ▼                             │
│                                │  ┌──────────────────────────┐  │
│ • Update balances              │  │ TrustedIssuersRegistry   │  │
│ • Emit Transfer event          │  └──────────────────────────┘  │
│ • Call compliance.transferred()│                                │
└────────────────────────────────┘  6. storedIdentity()          │
              │                                                   │
              └───────────────────────────────────────────────────┘
              │                     ┌──────────────────────────┐
              │                     │ IdentityRegistryStorage  │
              │                     └──────────────────────────┘
              │                                    │
              │ 7. transferred()                   │ 7. getClaim()
              ▼                                    ▼
┌──────────────────────────┐           ┌─────────────────────────┐
│  ModularCompliance       │           │  User's Identity (OID)  │
├──────────────────────────┤           │  (OnChainID)            │
│ For each module:         │           └─────────────────────────┘
│   moduleTransferAction() │
└──────────────────────────┘
              │
              ▼
┌──────────────────────────┐
│  Compliance Modules      │
│  Update state/counters   │
└──────────────────────────┘
```

### Mint Flow

```
┌────────────┐
│   Agent    │
└─────┬──────┘
      │ mint(to, amount)
      ▼
┌───────────────────────────────────────┐
│          Token Contract               │
├───────────────────────────────────────┤
│ 1. Check if recipient verified ───┐   │
│ 2. Check compliance allows mint ──┼─┐ │
│ 3. Mint tokens                    │ │ │
│ 4. Notify compliance              │ │ │
└───────────────────────────────────┼─┼─┘
                                    │ │
         ┌──────────────────────────┘ └──────┐
         │ isVerified()                      │
         ▼                                   │ canTransfer(0x0, to, amount)
┌─────────────────────┐                     │
│ IdentityRegistry    │                     ▼
└─────────────────────┘         ┌───────────────────────┐
                                │  ModularCompliance    │
         created(to, amount)    │  • Check all modules  │
         ─────────────────────▶ └───────────────────────┘
```

### Identity Verification Flow

```
┌──────────────────────────────────────────────────────────────┐
│              IdentityRegistry.isVerified()                    │
└───────────────────────────┬──────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌────────────────┐  ┌───────────────┐  ┌──────────────────────┐
│ Get identity   │  │ Get required  │  │ Get trusted issuers  │
│ from storage   │  │ claim topics  │  │ per claim topic      │
└────────┬───────┘  └───────┬───────┘  └───────┬──────────────┘
         │                  │                   │
         │                  │                   │
         ▼                  ▼                   ▼
┌────────────────┐  ┌───────────────┐  ┌──────────────────────┐
│ IRS.storedIden-│  │ CTR.getClaim  │  │ TIR.getTrustedIssu-  │
│ tity(address)  │  │ Topics()      │  │ ersForClaimTopic()   │
└────────────────┘  └───────────────┘  └──────────────────────┘
         │                  │                   │
         └──────────────────┴───────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────────┐
         │  For each required claim topic:      │
         │    1. Get claim from user's identity │
         │    2. Verify issuer is trusted       │
         │    3. Validate claim signature       │
         │    4. Check claim validity           │
         └──────────────────────────────────────┘
                            │
         ┌──────────────────┴──────────────────┐
         ▼                                     ▼
   ┌──────────┐                         ┌──────────┐
   │ All valid│                         │Any invalid│
   │ = VERIFIED│                        │ = REJECTED│
   └──────────┘                         └──────────┘
```

---

## Deployment Flow

### Full Suite Deployment via Gateway

```
┌─────────────────────────────────────────────────────────────┐
│                      Deployment Process                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────────────┐
    │  1. TREXGateway.deployTREXSuite()            │
    │     • Check deployer authorization           │
    │     • Check/collect deployment fee           │
    │     • Generate salt from owner + name        │
    └──────────────────┬───────────────────────────┘
                       │
                       ▼
    ┌──────────────────────────────────────────────┐
    │  2. TREXFactory.deployTREXSuite()            │
    │     Using CREATE2 for deterministic addresses│
    └──────────────────┬───────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
         ▼             ▼             ▼
    Deploy TIR    Deploy CTR    Deploy MC
         │             │             │
         └─────────────┼─────────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
         ▼             ▼             ▼
    Deploy IRS     Deploy IR    Deploy Token
         │             │             │
         └─────────────┼─────────────┘
                       │
                       ▼
    ┌──────────────────────────────────────────────┐
    │  3. Configuration Phase                      │
    │     • Create/Set OnChainID for token         │
    │     • Add claim topics to CTR                │
    │     • Add trusted issuers to TIR             │
    │     • Bind IRS to IR                         │
    │     • Add token as agent to IR               │
    │     • Add specified agents                   │
    │     • Add compliance modules to MC           │
    │     • Configure modules                      │
    └──────────────────┬───────────────────────────┘
                       │
                       ▼
    ┌──────────────────────────────────────────────┐
    │  4. Transfer Ownership                       │
    │     • Token → Owner                          │
    │     • IdentityRegistry → Owner               │
    │     • TrustedIssuersRegistry → Owner         │
    │     • ClaimTopicsRegistry → Owner            │
    │     • ModularCompliance → Owner              │
    └──────────────────────────────────────────────┘
```

### Deployment Limits

- **Max 5 claim issuers** at deployment
- **Max 5 claim topics** at deployment
- **Max 5 IR agents** at deployment
- **Max 5 token agents** at deployment
- **Max 30 compliance module actions** at deployment
- **Max 25 total modules** per compliance
- **Max 50 trusted issuers** total
- **Max 15 claim topics** total
- **Max 300 identity registries** per storage

---

## Architecture Diagrams

### Complete System Component Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              DEPLOYMENT LAYER                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────┐                    ┌──────────────────────────────┐    │
│  │  TREXGateway    │                    │   TREX Implementation        │    │
│  │                 │◄───────────────────│   Authority                  │    │
│  │  • Fee Mgmt     │                    │                              │    │
│  │  • Access Ctrl  │                    │   Manages upgrade paths      │    │
│  └────────┬────────┘                    └──────────────────────────────┘    │
│           │                                                                   │
│           ▼                                                                   │
│  ┌─────────────────┐                    ┌──────────────────────────────┐    │
│  │  TREXFactory    │◄───────────────────│   OnChainID Factory          │    │
│  │                 │                    │                              │    │
│  │  • CREATE2      │                    │   Creates identity contracts │    │
│  │  • Suite Deploy │                    └──────────────────────────────┘    │
│  └────────┬────────┘                                                         │
│           │                                                                   │
└───────────┼───────────────────────────────────────────────────────────────────┘
            │
            │ Deploys via Proxies
            │
┌───────────┼───────────────────────────────────────────────────────────────────┐
│           ▼                      CORE TOKEN LAYER                             │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                            Token Contract                             │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐                 │   │
│  │  │  TokenProxy │─▶│ Token Impl  │◄─│ TokenStorage │                 │   │
│  │  └─────────────┘  └─────────────┘  └──────────────┘                 │   │
│  │                                                                       │   │
│  │  ERC-20 + Extensions:                                                │   │
│  │  • Transfer with compliance                                          │   │
│  │  • Mint/Burn (Agent only)                                           │   │
│  │  • Freeze (full/partial)                                            │   │
│  │  • Recovery                                                          │   │
│  │  • Pause                                                             │   │
│  └────────┬────────────────────────┬────────────────────────────────────┘   │
│           │                        │                                         │
│           │ Calls                  │ Calls                                   │
│           │                        │                                         │
└───────────┼────────────────────────┼─────────────────────────────────────────┘
            │                        │
            │                        │
┌───────────┼────────────────────────┼─────────────────────────────────────────┐
│           ▼                        ▼            VERIFICATION LAYER           │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌────────────────────────────────────────────┐                             │
│  │       Identity Registry                    │                             │
│  │  ┌──────────────┐  ┌──────────────────┐   │                             │
│  │  │ IR Proxy     │─▶│ IR Implementation│   │                             │
│  │  └──────────────┘  └──────────────────┘   │                             │
│  │                                            │                             │
│  │  • Verify investor eligibility            │                             │
│  │  • Validate claims                        │                             │
│  │  • Manage identities                      │                             │
│  └────┬───────────────────┬───────────────┬──┘                             │
│       │                   │               │                                 │
│       │ Calls             │ Calls         │ Calls                           │
│       ▼                   ▼               ▼                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐           │
│  │ Claim Topics │  │  Trusted     │  │ Identity Registry      │           │
│  │ Registry     │  │  Issuers     │  │ Storage                │           │
│  │              │  │  Registry    │  │                        │           │
│  │ • Required   │  │              │  │ • Identity data        │           │
│  │   claims     │  │ • Trusted    │  │ • Country codes        │           │
│  │              │  │   issuers    │  │ • Multi-token support  │           │
│  └──────────────┘  └──────────────┘  └────────────────────────┘           │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
            │
            │
┌───────────┼───────────────────────────────────────────────────────────────────┐
│           ▼                      COMPLIANCE LAYER                             │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                    Modular Compliance                              │     │
│  │  ┌──────────────┐  ┌─────────────────┐  ┌────────────────┐       │     │
│  │  │ MC Proxy     │─▶│ MC Implementation│◄─│ MC Storage     │       │     │
│  │  └──────────────┘  └─────────────────┘  └────────────────┘       │     │
│  │                                                                    │     │
│  │  • canTransfer() - Pre-validation                                 │     │
│  │  • transferred() - Post-transfer hook                             │     │
│  │  • created() - Post-mint hook                                     │     │
│  │  • destroyed() - Post-burn hook                                   │     │
│  │  • Module management (max 25)                                     │     │
│  └────────────────────────────┬───────────────────────────────────────┘     │
│                               │                                             │
│                               │ Calls modules                               │
│                               ▼                                             │
│  ┌──────────────────────────────────────────────────────────────────┐     │
│  │                    Compliance Modules                             │     │
│  │  ┌──────────────────────────────────────────────────────────┐    │     │
│  │  │              AbstractModule (Base)                       │    │     │
│  │  │  • bindCompliance()                                      │    │     │
│  │  │  • unbindCompliance()                                    │    │     │
│  │  └──────────────────────────────────────────────────────────┘    │     │
│  │                                                                   │     │
│  │  ┌─────────────────────┐  ┌─────────────────────┐               │     │
│  │  │ CountryRestrictions │  │ CountryWhitelisting │               │     │
│  │  │  • Block countries  │  │  • Allow countries  │               │     │
│  │  └─────────────────────┘  └─────────────────────┘               │     │
│  │                                                                   │     │
│  │  ┌─────────────────────┐  ┌─────────────────────┐               │     │
│  │  │    MaxBalance       │  │    SupplyLimit      │               │     │
│  │  │  • Max per holder   │  │  • Total supply cap │               │     │
│  │  └─────────────────────┘  └─────────────────────┘               │     │
│  │                                                                   │     │
│  │  ┌─────────────────────┐  ┌─────────────────────┐               │     │
│  │  │   DayMonthLimits    │  │ ExchangeMonthly     │               │     │
│  │  │  • Time limits      │  │ Limits              │               │     │
│  │  └─────────────────────┘  └─────────────────────┘               │     │
│  │                                                                   │     │
│  │  ┌─────────────────────┐                                         │     │
│  │  │  ApproveTransfer    │  ... and more custom modules            │     │
│  │  │  • Manual approval  │                                         │     │
│  │  └─────────────────────┘                                         │     │
│  └───────────────────────────────────────────────────────────────────┘     │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
            │
            │
┌───────────┼───────────────────────────────────────────────────────────────────┐
│           ▼                    EXTERNAL LAYER                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                    OnChainID (External)                            │     │
│  │  ┌──────────────────┐  ┌──────────────────┐                       │     │
│  │  │ User Identity    │  │ Token Identity   │                       │     │
│  │  │ (IIdentity)      │  │ (IIdentity)      │                       │     │
│  │  │                  │  │                  │                       │     │
│  │  │ • Keys           │  │ • Token metadata │                       │     │
│  │  │ • Claims         │  │ • Issuer info    │                       │     │
│  │  │ • Approvals      │  │                  │                       │     │
│  │  └──────────────────┘  └──────────────────┘                       │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                    Claim Issuers (External)                        │     │
│  │  ┌──────────────────┐  ┌──────────────────┐                       │     │
│  │  │ KYC Provider     │  │ AML Provider     │  ... more issuers     │     │
│  │  │ (IClaimIssuer)   │  │ (IClaimIssuer)   │                       │     │
│  │  │                  │  │                  │                       │     │
│  │  │ • Issue claims   │  │ • Issue claims   │                       │     │
│  │  │ • Revoke claims  │  │ • Revoke claims  │                       │     │
│  │  │ • Validate claims│  │ • Validate claims│                       │     │
│  │  └──────────────────┘  └──────────────────┘                       │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Access Control & Roles Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Access Control Hierarchy                      │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│   Token Owner        │ ◄─── Highest authority
│  (Ownable)           │
└──────┬───────────────┘
       │
       │ Can manage:
       ├─▶ Token settings (name, symbol, OnChainID)
       ├─▶ Identity Registry address
       ├─▶ Compliance contract address
       ├─▶ Add/Remove Agents
       │
       ▼
┌──────────────────────┐
│   Token Agents       │
│  (AgentRole)         │
└──────┬───────────────┘
       │
       │ Can execute:
       ├─▶ mint()
       ├─▶ burn()
       ├─▶ forcedTransfer()
       ├─▶ freeze/unfreeze (address or partial)
       ├─▶ recoveryAddress()
       ├─▶ pause/unpause()
       │
       │
┌──────┴───────────────┐
│  Registry Owner      │
│  (Ownable)           │
└──────┬───────────────┘
       │
       │ Can manage:
       ├─▶ Add/Remove Registry Agents
       ├─▶ Set ClaimTopicsRegistry
       ├─▶ Set TrustedIssuersRegistry
       ├─▶ Set IdentityRegistryStorage
       │
       ▼
┌──────────────────────┐
│  Registry Agents     │
│  (AgentRole)         │
└──────┬───────────────┘
       │
       │ Can execute:
       ├─▶ registerIdentity()
       ├─▶ updateIdentity()
       ├─▶ deleteIdentity()
       ├─▶ updateCountry()
       │
       │
┌──────┴────────────────┐
│  Compliance Owner     │
│  (Ownable)            │
└──────┬────────────────┘
       │
       │ Can manage:
       ├─▶ addModule()
       ├─▶ removeModule()
       ├─▶ callModuleFunction()
       ├─▶ bindToken()
       ├─▶ unbindToken()
       │
       │
┌──────┴────────────────┐
│  TIR/CTR Owner        │
│  (Ownable)            │
└──────┬────────────────┘
       │
       │ Can manage:
       ├─▶ Add/Remove TrustedIssuers
       ├─▶ Update IssuerClaimTopics
       ├─▶ Add/Remove ClaimTopics
       │
       │
┌──────┴────────────────┐
│  Gateway Owner        │
│  (Ownable)            │
└──────┬────────────────┘
       │
       │ Can manage:
       ├─▶ Set Factory
       ├─▶ Set Public Deployment
       ├─▶ Set Deployment Fees
       ├─▶ Add/Remove Gateway Agents
       │
       ▼
┌──────────────────────┐
│  Gateway Agents      │
│  (AgentRole)         │
└──────┬───────────────┘
       │
       │ Can execute:
       ├─▶ Add/Remove Deployers
       ├─▶ Apply Fee Discounts
       │
       │
┌──────┴────────────────┐
│  Deployers            │
│  (Custom mapping)     │
└──────┬────────────────┘
       │
       │ Can execute:
       └─▶ Deploy TREX suites via Gateway
```

### Data Flow: Complete Transfer Process

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Step-by-Step Transfer Process                         │
└─────────────────────────────────────────────────────────────────────────┘

User initiates: token.transfer(recipient, 100)
│
├─▶ [1] Token Contract Checks
│   ├─ Is contract paused? (revert if yes)
│   ├─ Is sender frozen? (revert if yes)
│   ├─ Is recipient frozen? (revert if yes)
│   ├─ Sufficient unfrozen balance? (revert if no)
│   └─ Continue ✓
│
├─▶ [2] Identity Verification
│   ├─ Call: identityRegistry.isVerified(recipient)
│   │   ├─ Get identity: identityStorage.storedIdentity(recipient)
│   │   ├─ Identity exists? (return false if no)
│   │   ├─ Get required claims: claimTopicsRegistry.getClaimTopics()
│   │   ├─ No required claims? (return true)
│   │   ├─ For each claim topic:
│   │   │   ├─ Get trusted issuers: trustedIssuersRegistry
│   │   │   │     .getTrustedIssuersForClaimTopic(topic)
│   │   │   ├─ No issuers for topic? (return false)
│   │   │   ├─ Generate claimId = keccak256(issuer, topic)
│   │   │   ├─ Get claim: identity.getClaim(claimId)
│   │   │   ├─ Claim found and matches topic?
│   │   │   ├─ Validate: claimIssuer.isClaimValid(identity, topic, sig, data)
│   │   │   ├─ Valid? Continue to next topic
│   │   │   └─ Invalid? (return false)
│   │   └─ All claims valid? (return true)
│   └─ Recipient verified ✓
│
├─▶ [3] Compliance Pre-Check
│   ├─ Call: compliance.canTransfer(sender, recipient, 100)
│   │   ├─ For each bound module (up to 25):
│   │   │   ├─ Call: module.moduleCheck(sender, recipient, 100, compliance)
│   │   │   │   ├─ Example: CountryRestrictions
│   │   │   │   │   ├─ Get countries: identityRegistry.investorCountry()
│   │   │   │   │   ├─ Check if country blocked
│   │   │   │   │   └─ Return true/false
│   │   │   │   ├─ Example: MaxBalance
│   │   │   │   │   ├─ Get recipient balance
│   │   │   │   │   ├─ Check: balance + 100 <= maxBalance
│   │   │   │   │   └─ Return true/false
│   │   │   │   ├─ Example: DayMonthLimits
│   │   │   │   │   ├─ Check daily limit exceeded?
│   │   │   │   │   ├─ Check monthly limit exceeded?
│   │   │   │   │   └─ Return true/false
│   │   │   │   └─ ... other modules
│   │   │   └─ If any module returns false, stop
│   │   └─ All modules passed? (return true)
│   └─ Compliance check passed ✓
│
├─▶ [4] Execute Transfer
│   ├─ Call: _transfer(sender, recipient, 100)
│   │   ├─ balances[sender] -= 100
│   │   ├─ balances[recipient] += 100
│   │   └─ emit Transfer(sender, recipient, 100)
│   └─ Transfer executed ✓
│
├─▶ [5] Compliance Post-Hook
│   ├─ Call: compliance.transferred(sender, recipient, 100)
│   │   ├─ For each bound module:
│   │   │   ├─ Call: module.moduleTransferAction(sender, recipient, 100)
│   │   │   │   ├─ Example: DayMonthLimits
│   │   │   │   │   ├─ Update daily counter
│   │   │   │   │   └─ Update monthly counter
│   │   │   │   ├─ Example: ExchangeMonthlyLimits
│   │   │   │   │   └─ Update exchange volume
│   │   │   │   └─ ... other modules update state
│   │   │   └─ Continue to next module
│   │   └─ All modules notified
│   └─ Post-transfer hooks completed ✓
│
└─▶ [6] Return Success ✓

Total Contract Calls in this example:
  • Token: 1 (entry point)
  • IdentityRegistry: 1 (isVerified)
  • IdentityRegistryStorage: 1 (storedIdentity) + 1 (investorCountry per module)
  • ClaimTopicsRegistry: 1 (getClaimTopics)
  • TrustedIssuersRegistry: N (where N = number of claim topics)
  • User Identity Contract: M (where M = number of claims to check)
  • ClaimIssuers: M (isClaimValid calls)
  • ModularCompliance: 2 (canTransfer + transferred)
  • Compliance Modules: 2×K (where K = number of bound modules)

Approximate Gas Cost: 150,000 - 300,000 gas
(Varies based on number of modules and claim complexity)
```

---

## Key Design Patterns

### 1. Proxy Pattern (Upgradeability)

All main contracts use proxy pattern for upgradeability:

- Proxies: Hold state and delegate to implementation
- Implementation Authority: Manages implementation addresses
- Storage contracts: Separate storage to prevent collisions

### 2. Factory Pattern (Deployment)

- TREXFactory: Creates complete token ecosystems
- CREATE2: Deterministic address generation
- Batch deployment: Multiple tokens in one transaction

### 3. Module Pattern (Extensibility)

- ModularCompliance: Plugin architecture for rules
- AbstractModule: Base class for modules
- Up to 25 modules per token

### 4. Role-Based Access Control

- Owner: Ultimate authority (via Ownable)
- Agents: Operational permissions (via AgentRole)
- Modifiers: onlyOwner, onlyAgent

### 5. Registry Pattern

- Identity Registry: Central identity management
- Trusted Issuers Registry: Authorized claim issuers
- Claim Topics Registry: Required claim types

### 6. Hook Pattern

- Pre-transfer: canTransfer() validation
- Post-transfer: transferred() state updates
- Post-mint: created() notifications
- Post-burn: destroyed() notifications

---

## Security Considerations

### 1. Transfer Security

- Multi-layer validation (frozen, balance, identity, compliance)
- No transfers to unverified addresses
- Atomic operations with revert on failure

### 2. Identity Verification

- Claim validation from trusted issuers only
- Signature verification
- Revocation support through claim validity checks

### 3. Agent Permissions

- Critical operations restricted to agents
- Agent management by owner only
- Separation of concerns (token agents vs registry agents)

### 4. Compliance Enforcement

- Cannot bypass compliance checks
- All modules must approve transfer
- Post-transfer state updates mandatory

### 5. Upgradeability

- Proxy pattern allows bug fixes
- Owner controls upgrades
- Storage separation prevents conflicts

### 6. Reentrancy Protection

- No external calls before state changes
- OpenZeppelin contracts base
- Checks-Effects-Interactions pattern

---

## Testing & Verification

### Test Coverage

Tests located in `test/` directory:

- `token/token-transfer.test.ts` - Transfer logic
- `token/token-recovery.test.ts` - Recovery mechanism
- `compliance.test.ts` - Compliance modules
- `registries/*.test.ts` - Registry operations
- `factory.test.ts` - Factory deployment
- `gateway.test.ts` - Gateway access control

### Audit Status

- Audited by Hacken
- Report available: Tokeny_TREX-v4_SC_Audit_Report.pdf

---

## Summary of Contract Interactions

| Contract                     | Calls To                                                                        | Called By         |
| ---------------------------- | ------------------------------------------------------------------------------- | ----------------- |
| **Token**                    | IdentityRegistry, ModularCompliance                                             | User, Agents      |
| **IdentityRegistry**         | IdentityRegistryStorage, ClaimTopicsRegistry, TrustedIssuersRegistry, IIdentity | Token             |
| **ModularCompliance**        | Compliance Modules                                                              | Token             |
| **TrustedIssuersRegistry**   | None                                                                            | IdentityRegistry  |
| **ClaimTopicsRegistry**      | None                                                                            | IdentityRegistry  |
| **IdentityRegistryStorage**  | None                                                                            | IdentityRegistry  |
| **Compliance Modules**       | Token (read), IdentityRegistry (read)                                           | ModularCompliance |
| **TREXFactory**              | All Proxies, IIdFactory                                                         | TREXGateway       |
| **TREXGateway**              | TREXFactory, IERC20 (fees)                                                      | Deployers         |
| **Implementation Authority** | None                                                                            | All Proxies       |

---

## Conclusion

The T-REX protocol provides a comprehensive, modular, and upgradeable framework for compliant security token issuance. Its layered architecture separates concerns between token operations, identity verification, and compliance enforcement, making it highly flexible and maintainable.

**Key Strengths:**

- ✅ Modular compliance system
- ✅ Robust identity verification
- ✅ Upgradeability without redeployment
- ✅ Factory pattern for easy deployment
- ✅ Multi-layer security
- ✅ Gas-efficient batch operations
- ✅ Extensive role-based access control

**Use Cases:**

- Security token offerings (STOs)
- Real estate tokenization
- Private equity tokens
- Regulated asset tokenization
- Compliant DeFi integration

---

_Document Version: 1.0_  
_Last Updated: 2024_  
_Codebase Version: Solidity 0.8.17_  
_Standard: ERC-3643_
