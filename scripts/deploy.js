const hre = require('hardhat');

const { ethers } = hre;
const OnchainID = require('@onchain-id/solidity');
const fs = require('fs');
const path = require('path');

async function deployTREXInfrastructure() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying with account:', deployer.address);
  console.log('Account balance:', ethers.formatEther(await deployer.provider.getBalance(deployer.address)), 'ETH');

  // ============ STEP 1: Implementation Contracts ============
  console.log('\n📦 Step 1: Deploying Implementation Contracts...');

  const claimTopicsRegistryImplementation = await ethers.deployContract('ClaimTopicsRegistry', deployer);
  await claimTopicsRegistryImplementation.waitForDeployment();
  console.log('  ClaimTopicsRegistry impl:', await claimTopicsRegistryImplementation.getAddress());

  const trustedIssuersRegistryImplementation = await ethers.deployContract('TrustedIssuersRegistry', deployer);
  await trustedIssuersRegistryImplementation.waitForDeployment();
  console.log('  TrustedIssuersRegistry impl:', await trustedIssuersRegistryImplementation.getAddress());

  const identityRegistryStorageImplementation = await ethers.deployContract('IdentityRegistryStorage', deployer);
  await identityRegistryStorageImplementation.waitForDeployment();
  console.log('  IdentityRegistryStorage impl:', await identityRegistryStorageImplementation.getAddress());

  const identityRegistryImplementation = await ethers.deployContract('IdentityRegistry', deployer);
  await identityRegistryImplementation.waitForDeployment();
  console.log('  IdentityRegistry impl:', await identityRegistryImplementation.getAddress());

  const modularComplianceImplementation = await ethers.deployContract('ModularCompliance', deployer);
  await modularComplianceImplementation.waitForDeployment();
  console.log('  ModularCompliance impl:', await modularComplianceImplementation.getAddress());

  const tokenImplementation = await ethers.deployContract('Token', deployer);
  await tokenImplementation.waitForDeployment();
  console.log('  Token impl:', await tokenImplementation.getAddress());

  console.log('✅ All TREX implementations deployed');

  // ============ STEP 2: OnchainID Infrastructure ============
  console.log('\n📦 Step 2: Deploying OnchainID Infrastructure...');

  const identityImplementation = await new ethers.ContractFactory(
    OnchainID.contracts.Identity.abi,
    OnchainID.contracts.Identity.bytecode,
    deployer,
  ).deploy(deployer.address, true);
  await identityImplementation.waitForDeployment();
  console.log('  Identity impl (OnchainID):', await identityImplementation.getAddress());

  const identityImplementationAuthority = await new ethers.ContractFactory(
    OnchainID.contracts.ImplementationAuthority.abi,
    OnchainID.contracts.ImplementationAuthority.bytecode,
    deployer,
  ).deploy(await identityImplementation.getAddress());
  await identityImplementationAuthority.waitForDeployment();
  console.log('  OnchainID ImplementationAuthority:', await identityImplementationAuthority.getAddress());

  const identityFactory = await new ethers.ContractFactory(OnchainID.contracts.Factory.abi, OnchainID.contracts.Factory.bytecode, deployer).deploy(
    await identityImplementationAuthority.getAddress(),
  );
  await identityFactory.waitForDeployment();
  console.log('  IdFactory (OnchainID):', await identityFactory.getAddress());

  console.log('✅ OnchainID infrastructure deployed');

  // ============ STEP 3: TREX Implementation Authority ============
  console.log('\n📦 Step 3: Deploying TREX Implementation Authority...');

  const trexImplementationAuthority = await ethers.deployContract(
    'TREXImplementationAuthority',
    [true, ethers.ZeroAddress, ethers.ZeroAddress],
    deployer,
  );
  await trexImplementationAuthority.waitForDeployment();
  console.log('  TREXImplementationAuthority:', await trexImplementationAuthority.getAddress());

  const versionStruct = {
    major: 4,
    minor: 0,
    patch: 0,
  };
  const contractsStruct = {
    tokenImplementation: await tokenImplementation.getAddress(),
    ctrImplementation: await claimTopicsRegistryImplementation.getAddress(),
    irImplementation: await identityRegistryImplementation.getAddress(),
    irsImplementation: await identityRegistryStorageImplementation.getAddress(),
    tirImplementation: await trustedIssuersRegistryImplementation.getAddress(),
    mcImplementation: await modularComplianceImplementation.getAddress(),
  };

  const versionTx = await trexImplementationAuthority.connect(deployer).addAndUseTREXVersion(versionStruct, contractsStruct);
  await versionTx.wait();
  console.log('✅ TREX Implementation Authority configured with version 4.0.0');

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

  if (
    tokenImpl === ethers.ZeroAddress ||
    ctrImpl === ethers.ZeroAddress ||
    irImpl === ethers.ZeroAddress ||
    irsImpl === ethers.ZeroAddress ||
    tirImpl === ethers.ZeroAddress ||
    mcImpl === ethers.ZeroAddress
  ) {
    throw new Error('Implementation Authority not properly configured - some implementations are zero address');
  }

  // ============ STEP 4: TREXFactory ============
  console.log('\n📦 Step 4: Deploying TREXFactory...');

  const trexFactory = await ethers.deployContract(
    'TREXFactory',
    [await trexImplementationAuthority.getAddress(), await identityFactory.getAddress()],
    deployer,
  );
  await trexFactory.waitForDeployment();
  console.log('  TREXFactory:', await trexFactory.getAddress());

  const addFactoryTx = await identityFactory.connect(deployer).addTokenFactory(await trexFactory.getAddress());
  await addFactoryTx.wait();
  console.log('✅ TREXFactory deployed and registered with IdFactory');

  // ============ STEP 5: TREXGateway ============
  console.log('\n📦 Step 5: Deploying TREXGateway...');

  const trexGateway = await ethers.deployContract('TREXGateway', [await trexFactory.getAddress(), true], deployer);
  await trexGateway.waitForDeployment();
  console.log('  TREXGateway:', await trexGateway.getAddress());
  console.log('✅ TREXGateway deployed');

  // ============ STEP 6: Transfer Ownership & Configuration ============
  console.log('\n📦 Step 6: Configuring Ownership...');

  const SAFE_ADDRESS = process.env.SAFE_ADDRESS;
  if (!SAFE_ADDRESS || SAFE_ADDRESS === ethers.ZeroAddress) {
    throw new Error('SAFE_ADDRESS env variable is required for ownership transfers');
  }
  console.log('  Safe multisig address:', SAFE_ADDRESS);

  const transferTx = await trexFactory.transferOwnership(await trexGateway.getAddress());
  await transferTx.wait();
  console.log('  TREXFactory ownership transferred to Gateway');

  const transferIdFactoryTx = await identityFactory.connect(deployer).transferOwnership(SAFE_ADDRESS);
  await transferIdFactoryTx.wait();
  console.log('  IdFactory ownership transferred to Safe');

  const addDeployerTx = await trexGateway.connect(deployer).addDeployer(SAFE_ADDRESS);
  await addDeployerTx.wait();
  console.log('  Safe added as Gateway deployer');

  const transferGatewayTx = await trexGateway.connect(deployer).transferOwnership(SAFE_ADDRESS);
  await transferGatewayTx.wait();
  console.log('  TREXGateway ownership transferred to Safe');

  const setFactoryTx = await trexImplementationAuthority.setTREXFactory(await trexFactory.getAddress());
  await setFactoryTx.wait();
  console.log('  TREXFactory set in Implementation Authority');

  console.log('✅ Ownership configured');

  // ============ DEPLOYMENT SUMMARY ============
  const addresses = {
    tokenImpl: await tokenImplementation.getAddress(),
    irImpl: await identityRegistryImplementation.getAddress(),
    irsImpl: await identityRegistryStorageImplementation.getAddress(),
    mcImpl: await modularComplianceImplementation.getAddress(),
    tirImpl: await trustedIssuersRegistryImplementation.getAddress(),
    ctrImpl: await claimTopicsRegistryImplementation.getAddress(),
    identityImpl: await identityImplementation.getAddress(),
    identityImplAuthority: await identityImplementationAuthority.getAddress(),
    idFactory: await identityFactory.getAddress(),
    trexImplAuthority: await trexImplementationAuthority.getAddress(),
    trexFactory: await trexFactory.getAddress(),
    trexGateway: await trexGateway.getAddress(),
  };

  console.log(`\n${'='.repeat(70)}`);
  console.log('🎉 T-REX INFRASTRUCTURE DEPLOYMENT COMPLETE!');
  console.log('='.repeat(70));

  console.log('\n📋 TREX Implementation Contracts:');
  console.log('  Token:                    ', addresses.tokenImpl);
  console.log('  IdentityRegistry:         ', addresses.irImpl);
  console.log('  IdentityRegistryStorage:  ', addresses.irsImpl);
  console.log('  ModularCompliance:        ', addresses.mcImpl);
  console.log('  TrustedIssuersRegistry:   ', addresses.tirImpl);
  console.log('  ClaimTopicsRegistry:      ', addresses.ctrImpl);

  console.log('\n📋 OnchainID Contracts:');
  console.log('  Identity Implementation:  ', addresses.identityImpl);
  console.log('  Identity Impl Authority:  ', addresses.identityImplAuthority);
  console.log('  IdFactory:                ', addresses.idFactory);

  console.log('\n📋 Infrastructure Contracts:');
  console.log('  TREX Implementation Auth: ', addresses.trexImplAuthority);
  console.log('  TREXFactory:              ', addresses.trexFactory);
  console.log('  TREXGateway (entry point):', addresses.trexGateway);

  console.log(`\n${'='.repeat(70)}`);
  console.log('📌 NEXT STEPS:');
  console.log('  1. Use TREXGateway.deployTREXSuite() to deploy new tokens');
  console.log('  2. Configure claim issuers for identity verification');
  console.log('  3. Add compliance modules as needed');
  console.log('='.repeat(70));

  const deployment = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployer: deployer.address,
    safeAddress: SAFE_ADDRESS,
    timestamp: new Date().toISOString(),
    implementations: {
      token: addresses.tokenImpl,
      identityRegistry: addresses.irImpl,
      identityRegistryStorage: addresses.irsImpl,
      modularCompliance: addresses.mcImpl,
      trustedIssuersRegistry: addresses.tirImpl,
      claimTopicsRegistry: addresses.ctrImpl,
    },
    onchainId: {
      identityImplementation: addresses.identityImpl,
      identityImplementationAuthority: addresses.identityImplAuthority,
      identityFactory: addresses.idFactory,
    },
    infrastructure: {
      trexImplementationAuthority: addresses.trexImplAuthority,
      trexFactory: addresses.trexFactory,
      trexGateway: addresses.trexGateway,
    },
  };

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
    irs: ethers.ZeroAddress,
    ONCHAINID: ethers.ZeroAddress,
    irAgents: [deployerSigner.address],
    tokenAgents: [deployerSigner.address],
    complianceModules: [],
    complianceSettings: [],
  };

  const claimDetails = {
    claimTopics: [],
    issuers: [],
    issuerClaims: [],
  };

  const tx = await gateway.deployTREXSuite(tokenDetails, claimDetails);
  const receipt = await tx.wait();

  console.log('Token deployed! Transaction:', receipt.hash);
  return receipt;
}

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

module.exports = { deployTREXInfrastructure, deployTokenExample, main };

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
