import dotenv from "dotenv";

const shellPort = process.env.PORT;

// Precedence: shell/process PORT > .env.local > .env/defaults
dotenv.config({ path: ".env.local", override: true });
dotenv.config();

if (shellPort) {
	process.env.PORT = shellPort;
}
