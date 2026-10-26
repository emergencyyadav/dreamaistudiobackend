#!/usr/bin/env python3
"""
Simple 1-Click Token Launcher for pump.fun with Fixed CA
Fixed CA: 3ja2WF2F1CRiVVAxiDxQHj43ehfDPk36jTzajkGdCHCZ
"""

import os
import sys
import json
import requests
from dotenv import load_dotenv

from solders.keypair import Keypair
from solders.transaction import VersionedTransaction
from solders.rpc.requests import SendVersionedTransaction
from solders.rpc.config import RpcSendTransactionConfig
from solders.commitment_config import CommitmentLevel

load_dotenv()

# --- TOKEN DETAILS (PRE-FILLED) ---
TARGET_CA = "3ja2WF2F1CRiVVAxiDxQHj43ehfDPk36jTzajkGdCHCZ"
TOKEN_NAME = "luvora"
TOKEN_SYMBOL = "luvora.chat"
METADATA_URI = "https://raw.githubusercontent.com/emergencyyadav/dreamaistudiobackend/main/token_metadata.json"
RPC_URL = os.getenv("SOLANA_RPC_URL", "https://api.mainnet-beta.solana.com")
DEV_BUY_SOL = 0.0  # Change if you want to buy tokens on launch


def main():
    print("=" * 60)
    print("🚀 PUMP.FUN TOKEN LAUNCHER")
    print(f"📌 Token: {TOKEN_NAME} (${TOKEN_SYMBOL})")
    print(f"📌 Fixed CA: {TARGET_CA}")
    print("=" * 60)

    # 1. Load Fixed Mint Keypair
    if not os.path.exists("token_mint_keypair.json"):
        print("❌ Error: token_mint_keypair.json not found!")
        sys.exit(1)

    with open("token_mint_keypair.json", "r") as f:
        data = json.load(f)
    mint_kp = Keypair.from_bytes(bytes(data)) if isinstance(data, list) else Keypair.from_base58_string(data.strip())
    
    if str(mint_kp.pubkey()) != TARGET_CA:
        print(f"❌ Keypair mismatch: {mint_kp.pubkey()} != {TARGET_CA}")
        sys.exit(1)

    # 2. Load Deployer Private Key
    private_key = os.getenv("SOLANA_PRIVATE_KEY")
    if not private_key:
        print("\nEnter your Solana Deployer Wallet Private Key (Base58):")
        private_key = input("> ").strip()

    if not private_key:
        print("❌ Private key is required.")
        sys.exit(1)

    if private_key.startswith("[") and private_key.endswith("]"):
        payer_kp = Keypair.from_bytes(bytes(json.loads(private_key)))
    else:
        payer_kp = Keypair.from_base58_string(private_key)

    payer_pub = str(payer_kp.pubkey())
    print(f"👛 Deployer Wallet: {payer_pub}")

    # Check SOL Balance
    bal_res = requests.post(RPC_URL, json={
        "jsonrpc": "2.0", "id": 1, "method": "getBalance", "params": [payer_pub]
    }).json()
    sol_balance = bal_res.get("result", {}).get("value", 0) / 1_000_000_000
    print(f"💰 Wallet Balance: {sol_balance:.4f} SOL")

    if sol_balance < 0.035:
        print("\n⚠️ WARNING: Your wallet needs at least ~0.04 SOL for Solana network fees and account rent.")
        proceed = input("Do you still want to try? (y/n): ").strip().lower()
        if proceed != "y":
            print("Aborted.")
            sys.exit(0)

    # 3. Create Transaction via PumpPortal
    print("\n📡 Creating token on pump.fun...")
    payload = {
        "publicKey": payer_pub,
        "action": "create",
        "tokenMetadata": {
            "name": TOKEN_NAME,
            "symbol": TOKEN_SYMBOL,
            "uri": METADATA_URI
        },
        "mint": TARGET_CA,
        "denominatedInSol": "true",
        "amount": DEV_BUY_SOL,
        "slippage": 10,
        "priorityFee": 0.0005,
        "pool": "pump"
    }

    res = requests.post(
        "https://pumpportal.fun/api/trade-local",
        headers={"Content-Type": "application/json"},
        json=payload,
        timeout=30
    )

    if res.status_code != 200:
        print(f"❌ PumpPortal error: {res.text}")
        sys.exit(1)

    # 4. Sign with both Deployer and Mint Keypair
    tx = VersionedTransaction.from_bytes(res.content)
    signed_tx = VersionedTransaction(tx.message, [payer_kp, mint_kp])

    # 5. Broadcast to Solana
    print("🛰️ Sending to Solana network...")
    rpc_payload = SendVersionedTransaction(
        signed_tx,
        RpcSendTransactionConfig(skip_preflight=False, preflight_commitment=CommitmentLevel.Processed)
    ).to_json()

    rpc_res = requests.post(RPC_URL, headers={"Content-Type": "application/json"}, data=rpc_payload, timeout=40).json()

    if "error" in rpc_res:
        print(f"❌ Solana RPC error: {json.dumps(rpc_res['error'], indent=2)}")
        sys.exit(1)

    sig = rpc_res.get("result")
    print("\n" + "=" * 60)
    print("🎉 TOKEN DEPLOYED SUCCESSFULLY!")
    print(f"📌 CA:        {TARGET_CA}")
    print(f"📜 Tx:        https://solscan.io/tx/{sig}")
    print(f"💊 pump.fun:  https://pump.fun/coin/{TARGET_CA}")
    print("=" * 60)


if __name__ == "__main__":
    main()
