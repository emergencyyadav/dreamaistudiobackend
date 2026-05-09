import { ethers } from 'ethers';
import * as bip39 from 'bip39';
import bs58 from 'bs58';
import crypto from 'crypto';

function ethToTron(ethAddress) {
    const hex = ethAddress.toLowerCase().replace('0x', '');
    const tronHex = '41' + hex;
    const tronBuffer = Buffer.from(tronHex, 'hex');

    const hash1 = crypto.createHash('sha256').update(tronBuffer).digest();
    const hash2 = crypto.createHash('sha256').update(hash1).digest();
    const checksum = hash2.subarray(0, 4);

    const finalAddress = Buffer.concat([tronBuffer, checksum]);
    return bs58.encode(finalAddress);
}

async function test() {
    const seed = await bip39.mnemonicToSeed('test test test test test test test test test test test junk');
    const hdNode = ethers.HDNodeWallet.fromSeed(seed);
    const tronNode = hdNode.derivePath("m/44'/195'/0'/0/1");
    console.log("Tron eth-equiv:", tronNode.address);
    console.log("Tron address:", ethToTron(tronNode.address));
}
test();
