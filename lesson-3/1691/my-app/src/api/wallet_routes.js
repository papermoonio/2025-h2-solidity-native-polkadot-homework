import express from 'express';
import cors from 'cors';
import { hexlify, randomBytes, verifyMessage } from 'ethers';

const app = express();
app.use(cors())
app.use(express.json());

const PORT = 3001;

const challenges = new Map(); // <challengeId: string, {address: string, text: string, used: boolean}>

app.post('/api/wallet/challenge', (req, res) => {
    const { address } = req.body; // string
    const nonce = Math.floor(Math.random() * 1000000).toString();
    const challengeText = `Sign this message to prove you own the wallet. Nonce: ${nonce}`;
    const challengeId = hexlify(randomBytes(16));
    challenges.set(challengeId, { address: address.toLowerCase(), text: challengeText, used: false });
    res.json({ challengeId: challengeId, challenge: challengeText });
});

app.post('/api/wallet/login', (req, res) => {
    const { address, challengeId, signature } = req.body; // string, string, string
    const challenge = challenges.get(challengeId);
    if(!challenge) {
        return res.status(400).json({ success: false, error: 'Invalid challenge ID' });
    }
    if(challenge.used) {
        return res.status(400).json({ success: false, error: 'Challenge already used' });
    }
    if(challenge.address !== address.toLowerCase()) {
        return res.status(400).json({ success: false, error: 'Address does not match challenge' });
    }

    const recovered = verifyMessage(challenge.text, signature);
    if(recovered.toLowerCase() !== address.toLowerCase()) {
        return res.status(400).json({ success: false, error: 'Invalid signature' });
    }

    challenge.used = true;

    const token = '';
    res.json({ success: true, token: token });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});