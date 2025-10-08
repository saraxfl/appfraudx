/* eslint-disable prettier/prettier */

import { Injectable, NotFoundException, BadRequestException,ConflictException } from "@nestjs/common";
import { UsersRepository } from "./users.repository";
import { sha256 } from "src/util/hash/hash.util";
import { createHmac, randomBytes } from 'crypto';

function sha256WithSalt(password: string, salt: string) {
  return createHmac('sha256', Buffer.from(salt, 'utf8'))
    .update(password, 'utf8')
    .digest('hex');
}


type UpdatePatch = { email?: string | null; name?: string | null };

@Injectable()
export class UserService {
    constructor(private readonly usersRepository: UsersRepository) {}

    async createUser(email: string, name: string, password: string) {
        console.log("Aqui cifraremos la contraseña");
        const salt = randomBytes(32).toString('hex');
        const hashed_password = sha256WithSalt(password, salt);
        return this.usersRepository.createUser({email, name, hashed_password, salt});
    }

    async createAdmin(email: string, name: string, password: string) {
        const salt = randomBytes(32).toString('hex');
        const hashed_password = sha256WithSalt(password, salt);
        return this.usersRepository.createAdmin({ email, name, hashed_password, salt });
    }

    async findById(id: number) {
        const user = await this.usersRepository.findById(id);
        if (!user) throw new NotFoundException(`User ${id} not found`);
        const { password_hash, salt, ...safeUser } = user;
        return safeUser;
    }

    async findAll() {
        const rows = await this.usersRepository.findAll();
        return rows.map(({ password_hash, salt, ...safe }) => safe);
    }

    async validateUser(email:string, password:string){
        const user = await this.usersRepository.findByEmail(email);
        if (!user) {
            return null;
        }

        const hashed = sha256WithSalt(password, user.salt);

        console.log(user);
        console.log("Password ingresada:", password);
        console.log("Salt de DB:", user.salt);
        console.log("Hash guardado:", user.password_hash);
        console.log("Hash calculado:", hashed);

        const isValid = user.password_hash === hashed;
        return isValid ? user : null;
    }

    async updateById(id: number, patch: UpdatePatch) {
    //Si no actualizan nada
    if (!patch || (patch.email == null && patch.name == null)) {
        throw new BadRequestException("Nada que actualizar");
    }

    const current = await this.usersRepository.findById(id);
    if (!current) throw new NotFoundException(`User ${id} not found`);

    // Verifica que no se repita el email si cambia
    if (patch.email && patch.email !== current.email) {
        const clash = await this.usersRepository.findByEmail(patch.email);
        if (clash && clash.id !== id) {
            throw new ConflictException("Email ya está en uso");
      }
    }

    const updated = await this.usersRepository.updateUser(id, {
        email: patch.email ?? undefined,
        name: patch.name ?? undefined,
    });

    const { password_hash, salt, ...safe } = updated;
    return safe;
  }
}