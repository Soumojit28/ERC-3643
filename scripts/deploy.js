const hre = require('hardhat');
const { ethers } = hre;
const OnchainID = require('@onchain-id/solidity');
const fs = require('fs');
const path = require('path');

async function deployTREXInfrastructure() {
    const [deployer] = await ethers.getSigners();
    console.log('Deploying with account:', deployer.address);
    console.log('Account balance:', ethers.utils.formatEther(await deployer.getBalance()), 'ETH');

    // ============ STEP 1: Implementation Contracts ============
    console.log('\n📦 Step 1: Deploying Implementation Contracts...');
    
    const claimTopicsRegistryImplementation = await ethers.deployContract('ClaimTopicsRegistry', deployer);
    await claimTopicsRegistryImplementation.deployed();
    console.log('  ClaimTopicsRegistry impl:', claimTopicsRegistryImplementation.address);

    const trustedIssuersRegistryImplementation = await ethers.deployContract('TrustedIssuersRegistry', deployer);
    await trustedIssuersRegistryImplementation.deployed();
    console.log('  TrustedIssuersRegistry impl:', trustedIssuersRegistryImplementation.address);

    const identityRegistryStorageImplementation = await ethers.deployContract('IdentityRegistryStorage', deployer);
    await identityRegistryStorageImplementation.deployed();
    console.log('  IdentityRegistryStorage impl:', identityRegistryStorageImplementation.address);

    const identityRegistryImplementation = await ethers.deployContract('IdentityRegistry', deployer);
    await identityRegistryImplementation.deployed();
    console.log('  IdentityRegistry impl:', identityRegistryImplementation.address);

    const modularComplianceImplementation = await ethers.deployContract('ModularCompliance', deployer);
    await modularComplianceImplementation.deployed();
    console.log('  ModularCompliance impl:', modularComplianceImplementation.address);

    const tokenImplementation = await ethers.deployContract('Token', deployer);
    await tokenImplementation.deployed();
    console.log('  Token impl:', tokenImplementation.address);

    console.log('✅ All TREX implementations deployed');

    // ============ STEP 2: OnchainID Infrastructure ============
    console.log('\n📦 Step 2: Deploying OnchainID Infrastructure...');
    
    // Deploy Identity implementation from @onchain-id/solidity
    const identityImplementation = await new ethers.ContractFactory(
        OnchainID.contracts.Identity.abi,
        OnchainID.contracts.Identity.bytecode,
        deployer
    ).deploy(deployer.address, true);
    await identityImplementation.deployed();
    console.log('  Identity impl (OnchainID):', identityImplementation.address);

    // Deploy ImplementationAuthority for OnchainID
    const identityImplementationAuthority = await new ethers.ContractFactory(
        OnchainID.contracts.ImplementationAuthority.abi,
        OnchainID.contracts.ImplementationAuthority.bytecode,
        deployer
    ).deploy(identityImplementation.address);
    await identityImplementationAuthority.deployed();
    console.log('  OnchainID ImplementationAuthority:', identityImplementationAuthority.address);

    // Deploy IdFactory from @onchain-id/solidity
    const identityFactory = await new ethers.ContractFactory(
        OnchainID.contracts.Factory.abi,
        OnchainID.contracts.Factory.bytecode,
        deployer
    ).deploy(identityImplementationAuthority.address);
    await identityFactory.deployed();
    console.log('  IdFactory (OnchainID):', identityFactory.address);

    console.log('✅ OnchainID infrastructure deployed');

    // ============ STEP 3: TREX Implementation Authority ============
    console.log('\n📦 Step 3: Deploying TREX Implementation Authority...');
    
    const trexImplementationAuthority = await ethers.deployContract(
        'TREXImplementationAuthority',
        [true, ethers.ZeroAddress, ethers.ZeroAddress],
        deployer
    );
    await trexImplementationAuthority.deployed();
    console.log('  TREXImplementationAuthority:', trexImplementationAuthority.address);

    // Configure Implementation Authority with version and contracts
    const versionStruct = {
        major: 4,
        minor: 0,
        patch: 0,
    };
    const contractsStruct = {
        tokenImplementation: tokenImplementation.address,
        ctrImplementation: claimTopicsRegistryImplementation.address,
        irImplementation: identityRegistryImplementation.address,
        irsImplementation: identityRegistryStorageImplementation.address,
        tirImplementation: trustedIssuersRegistryImplementation.address,
        mcImplementation: modularComplianceImplementation.address,
    };
    
    const versionTx = await trexImplementationAuthority.connect(deployer).addAndUseTREXVersion(versionStruct, contractsStruct);
    await versionTx.wait();
    console.log('✅ TREX Implementation Authority configured with version 4.0.0');

    // Verify implementations are set correctly
    const tokenImpl = await trexImplementationAuthority.getTokenImplementation();
    const ctrImpl = await trexImplementationAuthority.getCTRImplementation();
    const irImpl = await trexImplementationAuthority.getIRImplementation();
    const irsImpl = await trexImplementationAuthority.getIRSImplementation();
    const tirImpl = await trexImplementationAuthority.getTIRImplementation();
    const mcImpl = await trexImplementationAuthority.getMCImplementation();
    
    console.log('  Verifying implementations:');
    console.log('    Token:', tokenImpl);
    console.log('    CTR:', ctrImpl);
    console.log('    IR:', irImpl);
    console.log('    IRS:', irsImpl);
    console.log('    TIR:', tirImpl);
    console.log('    MC:', mcImpl);

    if (tokenImpl === ethers.ZeroAddress || 
        ctrImpl === ethers.ZeroAddress ||
        irImpl === ethers.ZeroAddress ||
        irsImpl === ethers.ZeroAddress ||
        tirImpl === ethers.ZeroAddress ||
        mcImpl === ethers.ZeroAddress) {
        throw new Error('Implementation Authority not properly configured - some implementations are zero address');
    }

    // ============ STEP 4: TREXFactory ============
    console.log('\n📦 Step 4: Deploying TREXFactory...');
    
    const trexFactory = await ethers.deployContract(
        'TREXFactory',
        [trexImplementationAuthority.address, identityFactory.address],
        deployer
    );
    await trexFactory.deployed();
    console.log('  TREXFactory:', trexFactory.address);

    // CRITICAL: Add TREXFactory to IdFactory's allowed token factories
    // This allows TREXFactory to create token identities via IIdFactory.createTokenIdentity()
    const addFactoryTx = await identityFactory.connect(deployer).addTokenFactory(trexFactory.address);
    await addFactoryTx.wait();
    console.log('✅ TREXFactory deployed and registered with IdFactory');

    // ============ STEP 5: TREXGateway ============
    console.log('\n📦 Step 5: Deploying TREXGateway...');
    
    const trexGateway = await ethers.deployContract(
        'TREXGateway',
        [
            trexFactory.address,
            true, // public deployment enabled
        ],
        deployer
    );
    await trexGateway.deployed();
    console.log('  TREXGateway:', trexGateway.address);
    console.log('✅ TREXGateway deployed');

    // ============ STEP 6: Transfer Ownership & Configuration ============
    console.log('\n📦 Step 6: Configuring Ownership...');
    
    // Transfer Factory ownership to Gateway so Gateway can call factory.deployTREXSuite
    const transferTx = await trexFactory.transferOwnership(trexGateway.address);
    await transferTx.wait();
    console.log('  Factory ownership transferred to Gateway');

    // Set TREXFactory reference in Implementation Authority (required for changeImplementationAuthority)
    const setFactoryTx = await trexImplementationAuthority.setTREXFactory(trexFactory.address);
    await setFactoryTx.wait();
    console.log('  TREXFactory set in Implementation Authority');
    
    console.log('✅ Ownership configured');

    // ============ DEPLOYMENT SUMMARY ============
    console.log('\n' + '='.repeat(70));
    console.log('🎉 T-REX INFRASTRUCTURE DEPLOYMENT COMPLETE!');
    console.log('='.repeat(70));
    
    console.log('\n📋 TREX Implementation Contracts:');
    console.log('  Token:                    ', tokenImplementation.address);
    console.log('  IdentityRegistry:         ', identityRegistryImplementation.address);
    console.log('  IdentityRegistryStorage:  ', identityRegistryStorageImplementation.address);
    console.log('  ModularCompliance:        ', modularComplianceImplementation.address);
    console.log('  TrustedIssuersRegistry:   ', trustedIssuersRegistryImplementation.address);
    console.log('  ClaimTopicsRegistry:      ', claimTopicsRegistryImplementation.address);
    
    console.log('\n📋 OnchainID Contracts:');
    console.log('  Identity Implementation:  ', identityImplementation.address);
    console.log('  Identity Impl Authority:  ', identityImplementationAuthority.address);
    console.log('  IdFactory:                ', identityFactory.address);
    
    console.log('\n📋 Infrastructure Contracts:');
    console.log('  TREX Implementation Auth: ', trexImplementationAuthority.address);
    console.log('  TREXFactory:              ', trexFactory.address);
    console.log('  TREXGateway (entry point):', trexGateway.address);
    
    console.log('\n' + '='.repeat(70));
    console.log('📌 NEXT STEPS:');
    console.log('  1. Use TREXGateway.deployTREXSuite() to deploy new tokens');
    console.log('  2. Configure claim issuers for identity verification');
    console.log('  3. Add compliance modules as needed');
    console.log('='.repeat(70));

    const deployment = {
        network: hre.network.name,
        chainId: hre.network.config.chainId,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        implementations: {
            token: tokenImplementation.address,
            identityRegistry: identityRegistryImplementation.address,
            identityRegistryStorage: identityRegistryStorageImplementation.address,
            modularCompliance: modularComplianceImplementation.address,
            trustedIssuersRegistry: trustedIssuersRegistryImplementation.address,
            claimTopicsRegistry: claimTopicsRegistryImplementation.address,
        },
        onchainId: {
            identityImplementation: identityImplementation.address,
            identityImplementationAuthority: identityImplementationAuthority.address,
            identityFactory: identityFactory.address,
        },
        infrastructure: {
            trexImplementationAuthority: trexImplementationAuthority.address,
            trexFactory: trexFactory.address,
            trexGateway: trexGateway.address,
        },
    };

    // Save deployment to JSON file
    const deploymentsDir = path.join(__dirname, '..', 'deployments');
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    const deploymentFile = path.join(deploymentsDir, `${hre.network.name}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deployment, null, 2));
    console.log(`\n💾 Deployment saved to: ${deploymentFile}`);

    return deployment;
}

/**
 * Example: Deploy a new T-REX token suite via the Gateway
 * Call this after infrastructure is deployed
 */
async function deployTokenExample(gatewayAddress, deployerSigner) {
    const gateway = await ethers.getContractAt('TREXGateway', gatewayAddress, deployerSigner);
    
    const tokenDetails = {
        owner: deployerSigner.address,
        name: 'Example Security Token',
        symbol: 'EST',
        decimals: 18,
        irs: ethers.ZeroAddress, // Let factory create new IRS
        ONCHAINID: ethers.ZeroAddress, // Let factory create token OnchainID
        irAgents: [deployerSigner.address],
        tokenAgents: [deployerSigner.address],
        complianceModules: [],
        complianceSettings: [],
    };
    
    const claimDetails = {
        claimTopics: [], // Add claim topic IDs here (e.g., ethers.utils.id('KYC'))
        issuers: [], // Add trusted issuer addresses here
        issuerClaims: [], // Add claim topics per issuer
    };
    
    const tx = await gateway.deployTREXSuite(tokenDetails, claimDetails);
    const receipt = await tx.wait();
    
    console.log('Token deployed! Transaction:', receipt.transactionHash);
    return receipt;
}

// Main function for hardhat run
async function main() {
    try {
        const addresses = await deployTREXInfrastructure();
        console.log('\n✅ Save these addresses for future use!');
        console.log('\n📄 Deployment JSON:');
        console.log(JSON.stringify(addresses, null, 2));
        return addresses;
    } catch (error) {
        console.error('❌ Deployment failed:', error);
        process.exitCode = 1;
        throw error;
    }
}

// Export for testing and programmatic use
module.exports = { deployTREXInfrastructure, deployTokenExample, main };

// Run if executed directly: npx hardhat run scripts/deploy.js --network <network>
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}
