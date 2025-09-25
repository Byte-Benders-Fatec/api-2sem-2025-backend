import { DataSource } from "typeorm"
import "reflect-metadata"
import "./configs/env";

const ormconfig = new DataSource({
    type: "mysql",
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT ? parseInt(process.env.DATABASE_PORT) : 3306,
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    synchronize: true,
    logging: false,
    entities: [
        "src/models/*.{ts,js}"
    ],
    migrations: [
        "migrations/*.{ts,js}"
    ],
    subscribers: [],
});

export default ormconfig;