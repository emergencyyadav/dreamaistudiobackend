#!/usr/bin/env python3
"""
Pump.fun Token Launch Script
Fixed Mint CA: 3ja2WF2F1CRiVVAxiDxQHj43ehfDPk36jTzajkGdCHCZ
Author / Dev: @caeseapia (https://x.com/caeseapia)
"""

import os
import sys
import json
import argparse
import requests
from pathlib import Path
from dotenv import load_dotenv

# Solana & Solders cryptography
from solders.keypair import Keypair
from solders.transaction import VersionedTransaction
from solders.rpc.requests import SendVersionedTransaction
from solders.rpc.config import RpcSendTransactionConfig
from solders.commitment_config import CommitmentLevel
import base58

load_dotenv()

# Fixed Contract Address generated previously
TARGET_CA = "3ja2WF2F1CRiVVAxiDxQHj43ehfDPk36jTzajkGdCHCZ"
DEFAULT_RPC_URL = os.getenv("SOLANA_RPC_URL", "https://api.mainnet-beta.solana.com")
PUMPPORTAL_API = "https://pumpportal.fun/api/trade-local"


def load_mint_keypair(keypair_path="token_mint_keypair.json"):
    """Loads the fixed token mint keypair and validates the public key."""
    if not os.path.exists(keypair_path):
        raise FileNotFoundError(
            f"❌ Mint keypair file '{keypair_path}' not found! "
            f"Run generate_token_mint.mjs first to recreate it."
        )

    with open(keypair_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if isinstance(data, list):
        mint_kp = Keypair.from_bytes(bytes(data))
    elif isinstance(data, str):
        # Base58 private key string
        mint_kp = Keypair.from_base58_string(data.strip())
    else:
        raise ValueError("Invalid format in token_mint_keypair.json")

    pubkey_str = str(mint_kp.pubkey())
    if pubkey_str != TARGET_CA:
        raise ValueError(
            f"⚠️ Keypair mismatch!\nLoaded: {pubkey_str}\nExpected: {TARGET_CA}"
        )

    return mint_kp


def load_payer_keypair(private_key_input=None):
    """Loads the creator/payer wallet keypair from argument, .env, or prompt."""
    pk = private_key_input or os.getenv("SOLANA_PRIVATE_KEY")

    if not pk:
        print("\n🔑 Please enter your Solana Payer/Deployer Wallet Private Key (Base58):")
        pk = input("> ").strip()

    if not pk:
        raise ValueError("Deployer private key cannot be empty.")

    # Clean input
    pk = pk.strip()

    # Could be Base58 string or JSON byte array
    if pk.startswith("[") and pk.endswith("]"):
        byte_list = json.loads(pk)
        return Keypair.from_bytes(bytes(byte_list))
    else:
        return Keypair.from_base58_string(pk)


def upload_to_pinata(image_path, name, symbol, description, twitter, telegram, website, pinata_jwt):
    """Uploads the image and metadata JSON to IPFS via Pinata."""
    headers = {"Authorization": f"Bearer {pinata_jwt}"}

    print(f"📦 [1/2] Uploading image '{image_path}' to IPFS via Pinata...")
    with open(image_path, "rb") as img_file:
        files = {
            "file": (os.path.basename(image_path), img_file),
            "network": (None, "public")
        }
        res = requests.post("https://uploads.pinata.cloud/v3/files", headers=headers, files=files, timeout=45)

    if res.status_code not in (200, 201):
        raise RuntimeError(f"Failed to upload image to Pinata: {res.text}")

    img_res_data = res.json()
    # Support Pinata v3 or legacy responses
    img_cid = img_res_data.get("data", {}).get("cid") or img_res_data.get("IpfsHash")
    if not img_cid:
        raise RuntimeError(f"Pinata did not return CID for image: {img_res_data}")

    image_uri = f"https://ipfs.io/ipfs/{img_cid}"
    print(f"✅ Image pinned to IPFS: {image_uri}")

    # Metadata JSON compliant with pump.fun standard
    metadata = {
        "name": name,
        "symbol": symbol,
        "description": description,
        "image": image_uri,
        "showName": True,
        "createdOn": "https://pump.fun",
        "twitter": twitter,
        "telegram": telegram,
        "website": website
    }

    print("📄 [2/2] Uploading token metadata JSON to IPFS...")
    files = {
        "file": ("metadata.json", json.dumps(metadata, indent=2), "application/json"),
        "network": (None, "public")
    }
    meta_res = requests.post("https://uploads.pinata.cloud/v3/files", headers=headers, files=files, timeout=30)

    if meta_res.status_code not in (200, 201):
        raise RuntimeError(f"Failed to upload metadata JSON to Pinata: {meta_res.text}")

    meta_res_data = meta_res.json()
    meta_cid = meta_res_data.get("data", {}).get("cid") or meta_res_data.get("IpfsHash")
    if not meta_cid:
        raise RuntimeError(f"Pinata did not return CID for metadata: {meta_res_data}")

    metadata_uri = f"https://ipfs.io/ipfs/{meta_cid}"
    print(f"✅ Token Metadata pinned to IPFS: {metadata_uri}")
    return metadata_uri


def get_wallet_sol_balance(rpc_url, pubkey):
    """Fetches current SOL balance for the wallet."""
    try:
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getBalance",
            "params": [str(pubkey)]
        }
        res = requests.post(rpc_url, json=payload, timeout=10).json()
        lamports = res.get("result", {}).get("value", 0)
        return lamports / 1_000_000_000.0
    except Exception as e:
        print(f"⚠️ Could not fetch wallet balance: {e}")
        return None


def launch_token(
    name: str,
    symbol: str,
    description: str,
    image_path: str,
    twitter: str,
    website: str,
    telegram: str = "",
    metadata_uri: str = None,
    dev_buy_sol: float = 0.0,
    slippage: float = 10.0,
    priority_fee: float = 0.0005,
    rpc_url: str = DEFAULT_RPC_URL,
    payer_private_key: str = None,
    mint_keypair_path: str = "token_mint_keypair.json",
    pinata_jwt: str = None
):
    print("=" * 65)
    print("🚀 PUMP.FUN TOKEN LAUNCHER (FIXED CA)")
    print("=" * 65)

    # 1. Load Fixed Mint Keypair
    mint_kp = load_mint_keypair(mint_keypair_path)
    mint_ca = str(mint_kp.pubkey())
    print(f"🎯 Verified Token CA: {mint_ca}")

    # 2. Load Payer Wallet
    payer_kp = load_payer_keypair(payer_private_key)
    payer_pub = str(payer_kp.pubkey())
    print(f"👛 Payer / Deployer Wallet: {payer_pub}")

    # 3. Check Wallet SOL Balance
    balance = get_wallet_sol_balance(rpc_url, payer_pub)
    if balance is not None:
        print(f"💰 Wallet Balance: {balance:.4f} SOL")
        min_required = dev_buy_sol + 0.04  # account rent + gas + buy
        if balance < min_required:
            print(f"⚠️ WARNING: Balance ({balance:.4f} SOL) might be low. Estimated required: ~{min_required:.4f} SOL")

    # 4. Resolve Metadata URI
    if not metadata_uri:
        pinata_key = pinata_jwt or os.getenv("PINATA_JWT")
        if pinata_key and os.path.exists(image_path):
            metadata_uri = upload_to_pinata(
                image_path=image_path,
                name=name,
                symbol=symbol,
                description=description,
                twitter=twitter,
                telegram=telegram,
                website=website,
                pinata_jwt=pinata_key
            )
        else:
            print("\n⚠️ No Pinata JWT provided or image not found.")
            print("Please enter the public IPFS or HTTPS URI to your token metadata JSON:")
            print("(e.g. https://ipfs.io/ipfs/Qm... or your hosted metadata.json link)")
            metadata_uri = input("> ").strip()
            if not metadata_uri:
                raise ValueError("A valid metadata URI is required to create the token.")

    print(f"\n📋 Metadata Summary:")
    print(f"   • Name:         {name}")
    print(f"   • Symbol:       {symbol}")
    print(f"   • Description:  {description}")
    print(f"   • Twitter:      {twitter}")
    print(f"   • Website:      {website}")
    print(f"   • Metadata URI: {metadata_uri}")
    print(f"   • Dev Buy SOL:  {dev_buy_sol} SOL")
    print(f"   • Priority Fee: {priority_fee} SOL")
    print(f"   • Slippage:     {slippage}%")
    print("=" * 65)

    confirm = input("⚠️ Are you ready to broadcast the token creation on Solana mainnet? (yes/no): ").strip().lower()
    if confirm not in ("y", "yes"):
        print("❌ Token launch aborted by user.")
        return

    # 5. Build Create Transaction via PumpPortal API
    print("\n📡 Requesting unsigned creation transaction from PumpPortal...")
    payload = {
        "publicKey": payer_pub,
        "action": "create",
        "tokenMetadata": {
            "name": name,
            "symbol": symbol,
            "uri": metadata_uri
        },
        "mint": mint_ca,
        "denominatedInSol": "true",
        "amount": dev_buy_sol,
        "slippage": slippage,
        "priorityFee": priority_fee,
        "pool": "pump"
    }

    res = requests.post(
        PUMPPORTAL_API,
        headers={"Content-Type": "application/json"},
        json=payload,
        timeout=30
    )

    if res.status_code != 200:
        raise RuntimeError(f"PumpPortal API Error ({res.status_code}): {res.text}")

    tx_bytes = res.content
    print(f"✅ Received transaction payload ({len(tx_bytes)} bytes)")

    # 6. Deserialize and Sign with BOTH Payer and Mint Keypairs
    print("✍️ Signing transaction with Payer wallet and Token Mint keypair...")
    tx = VersionedTransaction.from_bytes(tx_bytes)

    # Both signers are required
    signed_tx = VersionedTransaction(tx.message, [payer_kp, mint_kp])

    # 7. Broadcast via Solana RPC
    print(f"🛰️ Broadcasting transaction to RPC: {rpc_url}...")
    rpc_payload = SendVersionedTransaction(
        signed_tx,
        RpcSendTransactionConfig(
            skip_preflight=False,
            preflight_commitment=CommitmentLevel.Processed
        )
    ).to_json()

    rpc_res = requests.post(
        rpc_url,
        headers={"Content-Type": "application/json"},
        data=rpc_payload,
        timeout=40
    ).json()

    if "error" in rpc_res:
        raise RuntimeError(f"RPC Error: {json.dumps(rpc_res['error'], indent=2)}")

    signature = rpc_res.get("result")
    print("\n" + "=" * 65)
    print("🎉 TOKEN LAUNCHED SUCCESSFULLY!")
    print("=" * 65)
    print(f"📌 Contract Address (CA): {mint_ca}")
    print(f"📜 Tx Signature:          {signature}")
    print(f"🔗 Solscan:               https://solscan.io/tx/{signature}")
    print(f"💊 pump.fun:              https://pump.fun/coin/{mint_ca}")
    print(f"📊 Axiom:                 https://axiom.trade/trade/{mint_ca}")
    print(f"⚡ Padre:                 https://trade.padre.gg/trade/solana/{mint_ca}")
    print("=" * 65)


def main():
    parser = argparse.ArgumentParser(description="Launch a token on pump.fun with fixed CA.")
    parser.add_argument("--name", default="Luvora AI", help="Token Name (default: Luvora AI)")
    parser.add_argument("--symbol", default="LUVORA", help="Token Ticker/Symbol (default: LUVORA)")
    parser.add_argument("--description", default="Luvora AI - Limitless studio for uncensored creativity, deep conversations, and immersive roleplay.", help="Token Description")
    parser.add_argument("--image", default="./my-app/public/pump_fun_banner.png", help="Path to token image/banner file")
    parser.add_argument("--twitter", default="https://x.com/caeseapia", help="Twitter/X profile or launch tweet URL")
    parser.add_argument("--website", default="https://luvora.love", help="Project website URL")
    parser.add_argument("--telegram", default="", help="Telegram community link")
    parser.add_argument("--metadata-uri", default=None, help="Direct IPFS/HTTPS metadata URI (optional)")
    parser.add_argument("--buy", type=float, default=0.0, help="Initial dev buy amount in SOL (default: 0.0)")
    parser.add_argument("--slippage", type=float, default=10.0, help="Slippage tolerance percent (default: 10.0)")
    parser.add_argument("--priority-fee", type=float, default=0.0005, help="Priority fee in SOL (default: 0.0005)")
    parser.add_argument("--rpc", default=DEFAULT_RPC_URL, help="Solana RPC URL")
    parser.add_argument("--payer-key", default=None, help="Payer Base58 private key (or set SOLANA_PRIVATE_KEY in .env)")
    parser.add_argument("--keypair", default="token_mint_keypair.json", help="Path to token mint keypair JSON")

    args = parser.parse_args()

    try:
        launch_token(
            name=args.name,
            symbol=args.symbol,
            description=args.description,
            image_path=args.image,
            twitter=args.twitter,
            website=args.website,
            telegram=args.telegram,
            metadata_uri=args.metadata_uri,
            dev_buy_sol=args.buy,
            slippage=args.slippage,
            priority_fee=args.priority_fee,
            rpc_url=args.rpc,
            payer_private_key=args.payer_key,
            mint_keypair_path=args.keypair
        )
    except Exception as e:
        print(f"\n❌ Error during launch: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
