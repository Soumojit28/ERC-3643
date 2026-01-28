const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

/**
 * Verification script for T-REX infrastructure contracts
 * 
 * Usage: 
 *   npx hardhat run scripts/verify.js --network baseSepolia
 * 
 * Ensure BASESCAN_API_KEY is set in your .env file
 * 
 * The script reads deployment addresses from deployments/<network>.json
 * which is automatically created by the deploy script.
 */

async function loadDeployment(networkName) {
    const deploymentFile = path.join(__dirname, '..', 'deployments', `${networkName}.json`);
    
    if (!fs.existsSync(deploymentFile)) {
        throw new Error(`Deployment file not found: ${deploymentFile}\nRun deploy.js first or create the file manually.`);
    }
    
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    console.log(`📂 Loaded deployment from: ${deploymentFile}`);
    console.log(`   Network: ${deployment.network}`);
    console.log(`   Deployer: ${deployment.deployer}`);
    console.log(`   Timestamp: ${deployment.timestamp}`);
    
    return deployment;
}

async function verify(address, constructorArguments, contractName) {
    console.log(`\n📝 Verifying ${contractName} at ${address}...`);
    try {
        await hre.run('verify:verify', {
            address,
            constructorArguments,
        });
        console.log(`✅ ${contractName} verified successfully!`);
        return true;
    } catch (error) {
        if (error.message.includes('Already Verified') || error.message.includes('already verified')) {
            console.log(`⏭️  ${contractName} is already verified`);
            return true;
        }
        console.error(`❌ Failed to verify ${contractName}:`, error.message);
        return false;
    }
}

async function main() {
    console.log('🔍 Starting contract verification...\n');
    console.log('Network:', hre.network.name);
    
    // Load deployment addresses
    const deployment = await loadDeployment(hre.network.name);
    
    const results = {
        success: [],
        failed: [],
        skipped: [],
    };

    // ============ TREX Implementation Contracts (no constructor args) ============
    console.log('\n' + '='.repeat(60));
    console.log('📦 Verifying TREX Implementation Contracts...');
    console.log('='.repeat(60));

    const implContracts = [
        { address: deployment.implementations.claimTopicsRegistry, name: 'ClaimTopicsRegistry' },
        { address: deployment.implementations.trustedIssuersRegistry, name: 'TrustedIssuersRegistry' },
        { address: deployment.implementations.identityRegistryStorage, name: 'IdentityRegistryStorage' },
        { address: deployment.implementations.identityRegistry, name: 'IdentityRegistry' },
        { address: deployment.implementations.modularCompliance, name: 'ModularCompliance' },
        { address: deployment.implementations.token, name: 'Token' },
    ];

    for (const contract of implContracts) {
        const success = await verify(contract.address, [], contract.name);
        if (success) results.success.push(contract.name);
        else results.failed.push(contract.name);
    }

    // ============ OnchainID Contracts ============
    console.log('\n' + '='.repeat(60));
    console.log('📦 Verifying OnchainID Contracts...');
    console.log('='.repeat(60));
    console.log('⚠️  Note: OnchainID contracts use external bytecode and may require manual verification');

    // Identity Implementation - constructor(address initialManagementKey, bool isLibrary)
    try {
        const identitySuccess = await verify(
            deployment.onchainId.identityImplementation,
            [deployment.deployer, true],
            'Identity (OnchainID)'
        );
        if (identitySuccess) results.success.push('Identity');
        else results.failed.push('Identity');
    } catch (e) {
        console.log('⚠️  OnchainID Identity skipped (external bytecode)');
        results.skipped.push('Identity (OnchainID)');
    }

    // ImplementationAuthority - constructor(address implementation)
    try {
        const iaSuccess = await verify(
            deployment.onchainId.identityImplementationAuthority,
            [deployment.onchainId.identityImplementation],
            'ImplementationAuthority (OnchainID)'
        );
        if (iaSuccess) results.success.push('ImplementationAuthority (OnchainID)');
        else results.failed.push('ImplementationAuthority (OnchainID)');
    } catch (e) {
        console.log('⚠️  OnchainID ImplementationAuthority skipped (external bytecode)');
        results.skipped.push('ImplementationAuthority (OnchainID)');
    }

    // IdFactory - constructor(address implementationAuthority)
    try {
        const factorySuccess = await verify(
            deployment.onchainId.identityFactory,
            [deployment.onchainId.identityImplementationAuthority],
            'IdFactory (OnchainID)'
        );
        if (factorySuccess) results.success.push('IdFactory (OnchainID)');
        else results.failed.push('IdFactory (OnchainID)');
    } catch (e) {
        console.log('⚠️  OnchainID IdFactory skipped (external bytecode)');
        results.skipped.push('IdFactory (OnchainID)');
    }

    // ============ Infrastructure Contracts ============
    console.log('\n' + '='.repeat(60));
    console.log('📦 Verifying Infrastructure Contracts...');
    console.log('='.repeat(60));

    // TREXImplementationAuthority - constructor(bool referenceStatus, address trexFactory, address iaFactory)
    const trexIASuccess = await verify(
        deployment.infrastructure.trexImplementationAuthority,
        [true, hre.ethers.ZeroAddress, hre.ethers.ZeroAddress],
        'TREXImplementationAuthority'
    );
    if (trexIASuccess) results.success.push('TREXImplementationAuthority');
    else results.failed.push('TREXImplementationAuthority');

    // TREXFactory - constructor(address implementationAuthority_, address idFactory_)
    const trexFactorySuccess = await verify(
        deployment.infrastructure.trexFactory,
        [deployment.infrastructure.trexImplementationAuthority, deployment.onchainId.identityFactory],
        'TREXFactory'
    );
    if (trexFactorySuccess) results.success.push('TREXFactory');
    else results.failed.push('TREXFactory');

    // TREXGateway - constructor(address factory, bool publicDeploymentStatus)
    const trexGatewaySuccess = await verify(
        deployment.infrastructure.trexGateway,
        [deployment.infrastructure.trexFactory, true],
        'TREXGateway'
    );
    if (trexGatewaySuccess) results.success.push('TREXGateway');
    else results.failed.push('TREXGateway');

    // ============ Summary ============
    console.log('\n' + '='.repeat(60));
    console.log('📊 VERIFICATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successful: ${results.success.length}`);
    results.success.forEach(c => console.log(`   - ${c}`));
    
    if (results.failed.length > 0) {
        console.log(`\n❌ Failed: ${results.failed.length}`);
        results.failed.forEach(c => console.log(`   - ${c}`));
    }
    
    if (results.skipped.length > 0) {
        console.log(`\n⏭️  Skipped: ${results.skipped.length}`);
        results.skipped.forEach(c => console.log(`   - ${c}`));
    }

    console.log('\n' + '='.repeat(60));
    console.log('🔗 View contracts on block explorer:');
    
    // Get explorer URL based on network
    const explorerUrls = {
        baseSepolia: 'https://sepolia.basescan.org',
        base: 'https://basescan.org',
        sepolia: 'https://sepolia.etherscan.io',
        mainnet: 'https://etherscan.io',
    };
    const explorerUrl = explorerUrls[hre.network.name] || 'https://etherscan.io';
    
    console.log(`   ${explorerUrl}/address/${deployment.infrastructure.trexGateway}`);
    console.log('='.repeat(60));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
