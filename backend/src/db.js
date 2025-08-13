import { Sequelize, DataTypes, Model } from 'sequelize';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

const dataDir = path.resolve(process.cwd(), 'backend', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export const sequelize = new Sequelize({
	dialect: 'sqlite',
	storage: path.join(dataDir, 'app.sqlite'),
	logging: false,
});

const ALGO = 'aes-256-gcm';
const KEY = crypto.createHash('sha256').update(process.env.ENCRYPTION_SECRET || 'dev').digest();

function encrypt(jsonValue) {
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv(ALGO, KEY, iv);
	const json = JSON.stringify(jsonValue);
	let enc = cipher.update(json, 'utf8', 'base64');
	enc += cipher.final('base64');
	const tag = cipher.getAuthTag().toString('base64');
	return `${iv.toString('base64')}:${tag}:${enc}`;
}

function decrypt(payload) {
	if (!payload) return null;
	const [ivB64, tagB64, dataB64] = payload.split(':');
	const iv = Buffer.from(ivB64, 'base64');
	const tag = Buffer.from(tagB64, 'base64');
	const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
	decipher.setAuthTag(tag);
	let dec = decipher.update(dataB64, 'base64', 'utf8');
	dec += decipher.final('utf8');
	return JSON.parse(dec);
}

export class Token extends Model {}
Token.init({
	id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
	userId: { type: DataTypes.STRING, allowNull: false },
	platform: { type: DataTypes.STRING, allowNull: false },
	payloadEnc: { type: DataTypes.TEXT, allowNull: false },
}, { sequelize, modelName: 'Token', tableName: 'tokens', timestamps: true });

export async function saveToken(userId, platform, payload) {
	const payloadEnc = encrypt(payload);
	const existing = await Token.findOne({ where: { userId, platform } });
	if (existing) {
		existing.payloadEnc = payloadEnc;
		await existing.save();
		return existing;
	}
	return Token.create({ userId, platform, payloadEnc });
}

export async function loadToken(userId, platform) {
	const row = await Token.findOne({ where: { userId, platform } });
	return row ? decrypt(row.payloadEnc) : null;
}

export async function initDb() {
	await sequelize.authenticate();
	await sequelize.sync();
}