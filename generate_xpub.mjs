import { ethers } from 'ethers';
import * as bip39 from 'bip39';
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log("\n🔒 SECURE OFFLINE XPUB EXTRACTOR 🔒\n");
console.log("This script runs 100% locally on your machine and never connects to the internet.");
console.log("It will mathematically extract the 'Extended Public Keys' (xpubs) for Base and TRON from your private seed.\n");

rl.question("Enter your 12 or 24-word Master Seed Phrase (it will NEVER be saved): ", async (seedPhrase) => {
    try {
        const isValid = bip39.validateMnemonic(seedPhrase.trim());
        if (!isValid) {
            console.log("⚠️ Warning: Seed phrase appears invalid, but proceeding anyway...");
        }

        const seed = await bip39.mnemonicToSeed(seedPhrase.trim());
        const hdNode = ethers.HDNodeWallet.fromSeed(seed);

        // Derive Base (Standard ERC-20 Account Node)
        const baseNode = hdNode.derivePath("m/44'/60'/0'");
        const baseXpub = baseNode.neuter().extendedKey;

        // Derive Tron (TRC-20 Account Node)
        const tronNode = hdNode.derivePath("m/44'/195'/0'");
        const tronXpub = tronNode.neuter().extendedKey;

        console.log("\n✅ SUCCESS! COPY THE STRINGS BELOW:\n");
        console.log("==========================================================");
        console.log("Add these TWO variables to your Railway Environment:");
        console.log(`BASE_XPUB=${baseXpub}`);
        console.log(`TRON_XPUB=${tronXpub}`);
        console.log("==========================================================\n");
        console.log("Once these are in Railway, you're done! Your backend will use these to generate public addresses mathematically.");

    } catch (e) {
        console.error("\n❌ Error extracting keys.");
        console.error(e.message);
    }
    rl.close();
});
