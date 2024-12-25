const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting deployment...");

  const KazakhKhanate = await hre.ethers.getContractFactory("KazakhKhanate");
  console.log("📝 Deploying KazakhKhanate contract...");
  
  const kazakhKhanate = await KazakhKhanate.deploy();
  console.log("⏳ Waiting for deployment transaction...");
  await kazakhKhanate.waitForDeployment();

  const deployedAddress = await kazakhKhanate.getAddress();
  console.log("✅ KazakhKhanate deployed to:", deployedAddress);
  console.log("📋 Copy this address and update the contractAddress in js/app.js");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 