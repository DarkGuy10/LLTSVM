import { createMemory } from "./create-memory.ts";
import { Instructions } from "./enums.ts";

export class CPU {
  memory: DataView;
  registerNames: string[];
  registers: DataView;
  registerMap: Map<string, number>;
  constructor(memory: DataView) {
    this.memory = memory;

    this.registerNames = [
      "ip",
      "acc",
      "r1",
      "r2",
      "r3",
      "r4",
      "r5",
      "r6",
      "r7",
      "r8",
    ];

    this.registers = createMemory(this.registerNames.length * 2); // Each register is 16-bits long

    // Create a map of register name to memory offset
    this.registerMap = new Map();
    this.registerNames.forEach((name, i) => this.registerMap.set(name, i * 2));
  }

  getRegister(name: string) {
    if (!this.registerMap.has(name)) {
      throw new Error(`getRegister: No such register: ${name}`);
    }
    return this.registers.getUint16(this.registerMap.get(name) as number);
  }

  setRegister(name: string, value: number) {
    if (!this.registerMap.has(name)) {
      throw new Error(`setRegister: No such register: ${name}`);
    }
    this.registers.setUint16(this.registerMap.get(name) as number, value);
    return this.getRegister(name);
  }

  fetch(batchSize: 8 | 16 = 8) {
    const nextInstructionAddress = this.getRegister("ip");
    const instruction = this.memory[batchSize === 8 ? "getUint8" : "getUint16"](
      nextInstructionAddress,
    );
    this.setRegister("ip", nextInstructionAddress + (batchSize / 8));
    return instruction;
  }

  execute(instruction: Instructions) {
    switch (instruction) {
      case Instructions.MOV_LIT_REG: {
        const literal = this.fetch(16);
        const register = (this.fetch() % this.registerNames.length) * 2;
        this.registers.setUint16(register, literal);
        break;
      }

      case Instructions.MOV_REG_REG: {
        const registerFrom = (this.fetch() % this.registerNames.length) * 2;
        const registerTo = (this.fetch() % this.registerNames.length) * 2;
        const value = this.registers.getUint16(registerFrom);
        this.registers.setUint16(registerTo, value);
        return;
      }

      case Instructions.MOV_REG_MEM: {
        const registerFrom = (this.fetch() % this.registerNames.length) * 2;
        const address = this.fetch(16);
        const value = this.registers.getUint16(registerFrom);
        this.memory.setUint16(address, value);
        return;
      }

      case Instructions.MOV_MEM_REG: {
        const address = this.fetch(16);
        const registerTo = (this.fetch() % this.registerNames.length) * 2;
        const value = this.memory.getUint16(address);
        this.registers.setUint16(registerTo, value);
        return;
      }

      case Instructions.ADD_REG_REG: {
        const register1 = (this.fetch() % this.registerNames.length) * 2;
        const register2 = (this.fetch() % this.registerNames.length) * 2;
        const value1 = this.registers.getUint16(register1);
        const value2 = this.registers.getUint16(register2);
        this.setRegister("acc", value1 + value2);
        return;
      }

      case Instructions.JMP_NOT_EQL: {
        const value = this.fetch(16);
        const address = this.fetch(16);

        if (value !== this.getRegister("acc")) {
          this.setRegister("ip", address);
        }
        return;
      }

      default:
        throw new Error(
          `execute: Unknown instruction encountered: ${instruction}`,
        );
    }
  }

  step() {
    const instruction = this.fetch();
    this.execute(instruction);
  }
}
