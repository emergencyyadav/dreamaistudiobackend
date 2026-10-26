import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Generate a brand new, cryptographically secure Solana Keypair
const mintKeypair = Keypair.generate();
const ca = mintKeypair.publicKey.toBase58();
const secretKeyArray = Array.from(mintKeypair.secretKey);
const secretKeyBs58 = bs58.encode(mintKeypair.secretKey);

// 2. Save keypair in standard Solana CLI format (JSON array of 64 bytes)
const outputPath = path.join(__dirname, 'token_mint_keypair.json');
fs.writeFileSync(outputPath, JSON.stringify(secretKeyArray), 'utf8');

console.log('==================================================');
console.log('🎉 SOLANA TOKEN MINT KEYPAIR GENERATED!');
console.log('==================================================');
console.log('📌 CONTRACT ADDRESS (CA / Mint):');
console.log(ca);
console.log('--------------------------------------------------');
console.log('🔑 Secret Key (Base58):');
console.log(secretKeyBs58);
console.log('📁 Secret Key File (Solana CLI format):');
console.log(outputPath);
console.log('==================================================');
console.log('🚀 HOW TO USE LATER WHEN LAUNCHING:');
console.log('1. Put the CA above on your website banner/links.');
console.log('2. When deploying on pump.fun via script/CLI/SDK, pass this exact mint keypair as the "mint".');
console.log('==================================================');
