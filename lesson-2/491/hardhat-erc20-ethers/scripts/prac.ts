import { log } from "console";
import { mainnet } from "viem/chains";

type RemoveOptional<T> = {
  [K in keyof T]: T[K] extends undefined ? never : T[K];
};

type Foo = { a: string; b?: undefined };
type Result = RemoveOptional<Foo>; // { a: string; b: never }

type A<T> = T extends { b: infer K } ? K : "some";
type GetA<T> = T extends { a: infer U } ? U : never
type Example = GetA<{ a: boolean }>  // boolean
type Example2 = GetA<{ b: number }>  // never


type B = A<{ a: string, b: number }>;
// 等价于 A<1> | A<2> | A<3>
// => string | string | string
// => string



class Animal {
  static kingdom = "mammal"
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}

type AnimalType = Animal            // 实例类型
type AnimalCtor = typeof Animal     // 构造函数类型

type Validate2<S, D> =
  S extends { type: "string" }
  ? D extends string ? true : "Expected string"
  : S extends { type: "number" }
  ? D extends number ? true : "Expected number"
  : S extends { type: "boolean" }
  ? D extends boolean ? true : "Expected boolean"
  : S extends { type: "array", items: infer ItemSchema }
  ? D extends any[]
  ? Validate2<ItemSchema, D[number]>
  : "Expected array"
  : S extends { type: "object", properties: infer Props }
  ? D extends Record<string, any>
  ? { [K in keyof Props]:
    Validate2<Props[K], D[K & keyof D]> } extends Record<string, true>
  ? true
  : { [K in keyof Props]:
    Validate2<Props[K], D[K & keyof D]> }
  : "Expected object"
  : "Unknown schema";

type UserSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    age: { type: "number" },
    tags: { type: "array", items: { type: "string" } }
    some: { type: "string" }
  }
};

type Case1 = Validate2<UserSchema, {
  name: string;
  age: number;
  tags: string[];
  address: string;
}>; // ✅ true

type Case2 = Validate2<UserSchema, {
  name: string;
  age: string; // ❌ 不符合
  tags: string[];
}>; // false


function main() {
  const ctor: AnimalCtor = Animal     // OK
  const animal: AnimalType = new ctor("Luna")
  console.log(Animal.kingdom) // ✅ 访问静态成员
  console.log(animal)
}

main()