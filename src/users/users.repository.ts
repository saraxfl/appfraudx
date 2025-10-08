/* eslint-disable prettier/prettier */

import { Injectable } from "@nestjs/common";
import { DbService } from "src/db/db.service";


export type User = {
    id: number;
    email: string;
    name: string;
    is_admin: 0 | 1;
    password_hash: string;
    salt: string;
};

export type UserDTO = {
  email: string;
  name: string;
  hashed_password: string;
  salt: string;
  is_admin?: 0 | 1;      
};

export type UpdateUserInput = {
  email?: string; 
  name?: string; 
};

@Injectable()
export class UsersRepository{
    constructor(private readonly db: DbService) {}

    async createUser({ email, name, hashed_password, salt, is_admin = 0 }: UserDTO): Promise<User> { 
    const sql = `INSERT INTO users (email, name, password_hash, is_admin, salt)
      VALUES (?, ?, ?, ?, ?)`;
    const [res]: any = await this.db.getPool().execute(sql, [
      email,
      name,
      hashed_password,
      is_admin,
      salt,
    ]);
    return { 
      id: res.insertId, 
      email, 
      name, 
      is_admin,
      password_hash: hashed_password,
      salt,
    };
  }

    async createAdmin({ email, name, hashed_password, salt }: UserDTO): Promise<User> {
    const is_admin = 1;
    const sql = `
      INSERT INTO users (email, name, password_hash, is_admin, salt)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [res]: any = await this.db.getPool().execute(sql, [
      email,
      name,
      hashed_password,
      is_admin,
      salt,
    ]);

    return {
      id: res.insertId,
      email,
      name,
      is_admin,
      password_hash: hashed_password,
      salt,
    };
  }

    async findByEmail(email:string): Promise<User | null> {
        const sql = `SELECT * FROM users WHERE email = '${email}' LIMIT 1`;
        const [rows] = await this.db.getPool().query(sql);
        const result= rows as User[];
        return result[0] || null;
    }

    async findById(id: number): Promise<User | null> {
        const sql = `SELECT * FROM users WHERE id = ? LIMIT 1`;
        const [rows] = await this.db.getPool().query(sql, [id]);
        const result = rows as User[];
        return result[0] || null;
    }

    async findAll() {
        const sql = `SELECT * FROM users ORDER BY id DESC`;
        const [rows] = await this.db.getPool().query(sql);
        return rows as any[]; 
    }

    async updateUser(id: number, data: UpdateUserInput): Promise<User> {
    const fields: string[] = [];
    const params: any[] = [];

    if (data.email !== undefined) {
      fields.push(`email = ?`);
      params.push(data.email);
    }
    if (data.name !== undefined) {
      fields.push(`name = ?`);
      params.push(data.name);
    }

    if (fields.length === 0) {
      const current = await this.findById(id);
      if (!current) throw new Error(`User ${id} not found`);
      return current;
    }

    const sql = `UPDATE users SET ${fields.join(", ")} WHERE id = ?`;
    params.push(id);

    await this.db.getPool().query(sql, params);

    const updated = await this.findById(id);
    if (!updated) throw new Error(`User ${id} not found after update`);
    return updated;
  }

}