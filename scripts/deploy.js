const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting deployment to BSC Testnet...");

  const KazakhKhanate = await hre.ethers.getContractFactory("KazakhKhanate");
  console.log("📝 Deploying KazakhKhanate contract...");
  
  const kazakhKhanate = await KazakhKhanate.deploy();
  console.log("⏳ Waiting for deployment transaction...");
  await kazakhKhanate.waitForDeployment();

  const deployedAddress = await kazakhKhanate.getAddress();
  console.log("✅ KazakhKhanate deployed to:", deployedAddress);
  console.log("📋 Copy this address and update the contractAddress in js/app.js");
  
  // Wait for some block confirmations
  console.log("⏳ Waiting for block confirmations...");
  // Get the deployment transaction
  const deploymentReceipt = await kazakhKhanate.deploymentTransaction().wait(5);
  
  // Verify contract on BSCScan
  console.log("🔍 Verifying contract on BSCScan...");
  try {
    await hre.run("verify:verify", {
      address: deployedAddress,
      constructorArguments: [],
    });
    console.log("✅ Contract verified on BSCScan");
  } catch (error) {
    console.log("❌ Contract verification failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 