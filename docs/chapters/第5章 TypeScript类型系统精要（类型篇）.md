---
title: 第5章 TypeScript类型系统精要（类型篇）
---

# TypeScript类型系统精要（类型篇）


## 5.1 基础类型系统

## number类型的数字字面量

### 概念定义

TypeScript 中的 number 类型对应 JavaScript 的 Number 类型，底层采用 IEEE 754 双精度 64 位浮点数格式。所有整数和小数在 TypeScript 里都属于 number 类型，不像 Java 或 C# 那样区分 int、float、double。

number 类型支持十进制、十六进制、八进制、二进制四种字面量写法，也包含一些特殊值如 Infinity、-Infinity 和 NaN。TypeScript 在编译期对 number 类型做静态检查，但不会区分整数和浮点数——它们都是 number。

### 语法与用法

#### 基本语法

```typescript
// 十进制字面量
let decimal: number = 42;

// 十六进制字面量（以 0x 或 0X 开头）
let hex: number = 0xff;       // 255

// 八进制字面量（以 0o 或 0O 开头，ES2015+）
let octal: number = 0o77;     // 63

// 二进制字面量（以 0b 或 0B 开头，ES2015+）
let binary: number = 0b1010;  // 10

// 浮点数
let float: number = 3.14;

// 科学计数法
let scientific: number = 1.5e3;  // 1500

// 数字分隔符（TypeScript 2.7+ / ES2021）
let million: number = 1_000_000;       // 1000000
let bytes: number = 0xff_ff_ff;        // 16777215
let bits: number = 0b1010_0001_1000;   // 2584
```

#### 特殊值

| 特殊值 | 说明 | 示例 |
|--------|------|------|
| Infinity | 正无穷大 | `1 / 0` 的结果 |
| -Infinity | 负无穷大 | `-1 / 0` 的结果 |
| NaN | 非数字（Not a Number） | `0 / 0` 或 `parseInt('abc')` |
| Number.MAX_SAFE_INTEGER | 最大安全整数 2^53 - 1 | 9007199254740991 |
| Number.MIN_SAFE_INTEGER | 最小安全整数 -(2^53 - 1) | -9007199254740991 |
| Number.EPSILON | 最小精度差 | 约 2.22e-16 |

### 基本示例

```typescript
// 声明不同进制的数字变量
let age: number = 25;              // 十进制整数
let price: number = 99.9;          // 十进制浮点数
let color: number = 0xff0000;      // 十六进制（红色 RGB）
let permission: number = 0o755;    // 八进制（Unix 文件权限）
let flags: number = 0b0010_0100;   // 二进制（位标志）

// 数字分隔符让大数字更易读
let population: number = 7_900_000_000;   // 79亿
let fileSize: number = 1_073_741_824;     // 1GB（字节数）

// 类型推断：不显式标注时 TypeScript 自动推断为 number
let inferred = 100;  // 推断为 number 类型
// inferred = 'hello';  // 编译错误：不能将 string 赋值给 number

// 特殊值也属于 number 类型
let inf: number = Infinity;
let nan: number = NaN;

console.log(typeof inf);   // "number"
console.log(typeof nan);   // "number"

// NaN 的特殊行为：NaN 不等于自身
console.log(NaN === NaN);        // false
console.log(Number.isNaN(NaN));  // true（推荐的判断方式）
```

### 进阶用法

```typescript
// 数字字面量类型：将 number 收窄为具体的值
type HttpSuccessCode = 200 | 201 | 204;
type HttpErrorCode = 400 | 401 | 403 | 404 | 500;
type HttpCode = HttpSuccessCode | HttpErrorCode;

// 只能赋值为这几个具体数字中的某一个
let status: HttpCode = 200;  // 合法
// let bad: HttpCode = 302;  // 编译错误：302 不在联合类型中

// 函数参数使用数字字面量类型做约束
function setOpacity(value: number): void {
    // 运行时检查范围
    if (value < 0 || value > 1) {
        throw new RangeError('opacity 必须在 0 到 1 之间');
    }
    console.log(`设置透明度为: ${value}`);
}

setOpacity(0.5);   // 合法
setOpacity(1);     // 合法
// setOpacity('1'); // 编译错误：string 类型不能赋值给 number

// 泛型中限制参数为 number
function clamp<T extends number>(value: T, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

const result = clamp(150, 0, 100);  // 返回 100
```

### 与 bigint 的对比

| 对比维度 | number | bigint |
|----------|--------|--------|
| 精度范围 | 双精度浮点，安全整数范围 -(2^53-1) 到 2^53-1 | 任意精度整数，无上限 |
| 小数支持 | 支持浮点小数 | 不支持小数 |
| 字面量写法 | `42`、`3.14` | `42n` |
| 混合运算 | 不能直接与 bigint 运算 | 不能直接与 number 运算 |
| typeof | `"number"` | `"bigint"` |
| JSON 支持 | 直接序列化 | 不能直接 JSON.stringify |
| 运行时要求 | 所有环境 | ES2020+ / target: es2020+ |

### 适用场景

- **常规数值计算：** 绝大多数业务场景的整数和浮点数运算，比如计数、金额（小数点后两位内）、坐标计算
- **位运算和标志位：** 使用二进制字面量定义位标志，进行按位运算
- **颜色值表示：** 用十六进制字面量表示 RGB 颜色值
- **数字字面量类型：** 限定某个变量只能取几个特定的数字值，比如 HTTP 状态码、错误码枚举

### 常见问题

#### 浮点数精度问题

JavaScript 的 number 类型使用 IEEE 754 双精度浮点数，某些十进制小数无法精确表示。

```typescript
// 经典的浮点精度问题
console.log(0.1 + 0.2);           // 0.30000000000000004
console.log(0.1 + 0.2 === 0.3);   // false

// 解决方案：使用 Number.EPSILON 做近似比较
function isEqual(a: number, b: number): boolean {
    return Math.abs(a - b) < Number.EPSILON;
}
console.log(isEqual(0.1 + 0.2, 0.3));  // true

// 或者用整数运算后再除（适用于金额等场景）
const priceInCents = 10 + 20;  // 用"分"做整数运算
const priceInYuan = priceInCents / 100;  // 最后转为"元"
```

#### 大整数精度丢失

超出安全整数范围（2^53 - 1）的整数会丢失精度。

```typescript
// 超出安全范围的整数
console.log(9007199254740992 === 9007199254740993);  // true（精度丢失！）

// 判断是否在安全范围内
console.log(Number.isSafeInteger(9007199254740991));  // true
console.log(Number.isSafeInteger(9007199254740992));  // false

// 需要处理大整数时应该使用 bigint 类型
const bigNum: bigint = 9007199254740993n;  // 精确表示
```

### 注意事项

- number 类型不区分整数和浮点数，TypeScript 编译器不会对整数溢出做编译期检查
- NaN 是 number 类型的合法值，但 NaN 不等于自身，判断时用 `Number.isNaN()` 而不是 `=== NaN`
- 数字分隔符 `_` 在 TypeScript 2.7+ 中可用，编译后会被移除，不影响运行时
- 不要用 `Number`（大写）作为类型注解，应该用 `number`（小写）。`Number` 是包装对象类型，`number` 是原始值类型
- 在金融等对精度要求高的场景中，不要直接用 number 做浮点运算，考虑使用整数运算或第三方精度库

### 总结

TypeScript 的 number 类型继承自 JavaScript 的 IEEE 754 双精度浮点数，支持十进制、十六进制、八进制、二进制四种字面量和数字分隔符。所有整数和小数都是 number 类型，特殊值 NaN 和 Infinity 也属于 number。使用时要注意浮点精度和大整数精度问题，金额计算建议用整数运算，超大整数用 bigint 类型。类型注解始终用小写的 `number` 而不是大写 `Number`。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## string类型的字符串字面量

### 概念定义

TypeScript 的 string 类型对应 JavaScript 的原始字符串类型，用于表示文本数据。字符串在内部以 UTF-16 编码存储，每个字符占 2 个字节（对于 BMP 之外的字符占 4 个字节，即代理对）。

TypeScript 中的字符串支持三种字面量写法：单引号、双引号和反引号（模板字符串）。在类型层面，string 是所有字符串值的宽类型，而具体的字符串值（如 `"hello"`）可以作为字符串字面量类型使用，这是 TypeScript 类型系统的强大特性之一。

### 语法与用法

#### 基本语法

```typescript
// 双引号字符串
let greeting: string = "Hello, World";

// 单引号字符串（功能与双引号完全相同）
let name: string = 'TypeScript';

// 模板字符串（反引号，支持换行和插值）
let message: string = `Hello, ${name}!`;

// 多行字符串（只有模板字符串支持）
let multiLine: string = `
  第一行
  第二行
  第三行
`;

// 转义字符
let escaped: string = "引号内的\"引号\"";
let newLine: string = "第一行\n第二行";
let tab: string = "列1\t列2";
let unicode: string = "\u4f60\u597d";  // "你好"
```

#### 模板字符串的表达式嵌入

```typescript
// 变量插值
let user: string = "张三";
let age: number = 28;
let info: string = `${user}今年${age}岁`;  // "张三今年28岁"

// 表达式插值
let price: number = 99.5;
let total: string = `总价: ${(price * 3).toFixed(2)}元`;  // "总价: 298.50元"

// 函数调用插值
let upper: string = `大写: ${"hello".toUpperCase()}`;  // "大写: HELLO"

// 嵌套模板字符串
let nested: string = `外层 ${`内层 ${"核心"}`} 结束`;
// "外层 内层 核心 结束"
```

### 基本示例

```typescript
// 字符串类型注解和类型推断
let explicit: string = "显式注解";     // 类型是 string
let implicit = "类型推断";              // 推断为 string 类型
// implicit = 42;  // 编译错误：不能将 number 赋值给 string

// 字符串常用方法（TypeScript 提供完整的类型提示）
let str: string = "Hello, TypeScript";

// 获取长度
console.log(str.length);           // 17

// 查找子串
console.log(str.indexOf("Type"));  // 7
console.log(str.includes("Script")); // true

// 截取
console.log(str.slice(7));         // "TypeScript"
console.log(str.substring(0, 5));  // "Hello"

// 替换
console.log(str.replace("Hello", "Hi"));  // "Hi, TypeScript"

// 分割
console.log(str.split(", "));     // ["Hello", "TypeScript"]

// 大小写
console.log(str.toUpperCase());   // "HELLO, TYPESCRIPT"
console.log(str.toLowerCase());   // "hello, typescript"

// 去除空白
let padded: string = "  hello  ";
console.log(padded.trim());       // "hello"
console.log(padded.trimStart());  // "hello  "
console.log(padded.trimEnd());    // "  hello"

// ES2021+ replaceAll
let repeated: string = "a-b-c-d";
console.log(repeated.replaceAll("-", "/"));  // "a/b/c/d"

// ES2022+ at() 方法
let word: string = "TypeScript";
console.log(word.at(0));    // "T"
console.log(word.at(-1));   // "t"（从末尾开始）
```

### 进阶用法

```typescript
// 字符串字面量类型：将 string 收窄为具体值
type Direction = "up" | "down" | "left" | "right";

function move(direction: Direction): void {
    console.log(`向 ${direction} 移动`);
}

move("up");      // 合法
// move("north"); // 编译错误：类型 "north" 不能赋给类型 Direction

// 模板字面量类型（TypeScript 4.1+）
type EventName = "click" | "scroll" | "mousemove";
type Handler = `on${Capitalize<EventName>}`;
// Handler = "onClick" | "onScroll" | "onMousemove"

// 标签模板（Tagged Template）的类型定义
function highlight(strings: TemplateStringsArray, ...values: unknown[]): string {
    // strings 是模板中的静态部分数组
    // values 是插值表达式的值数组
    return strings.reduce((result, str, i) => {
        const val = i < values.length ? `【${values[i]}】` : "";
        return result + str + val;
    }, "");
}

let username: string = "张三";
let role: string = "管理员";
let output = highlight`用户 ${username} 的角色是 ${role}`;
// "用户 【张三】 的角色是 【管理员】"
```

### 与相关类型的对比

| 对比维度 | string（原始类型） | String（包装对象） | 模板字面量类型 |
|----------|-------------------|-------------------|--------------|
| 写法 | `let s: string` | `let s: String` | `type T = \`hello\`` |
| 本质 | 原始值 | 对象 | 编译期类型 |
| typeof | `"string"` | `"object"` | 不适用 |
| 推荐度 | 始终推荐 | 不推荐作为类型注解 | 需要时使用 |
| 性能 | 好 | 差（有装箱开销） | 无运行时开销 |

### 适用场景

- **文本内容处理：** 用户输入、显示文本、文件内容等所有文本相关的变量声明
- **字符串字面量类型：** 限定函数参数只能接受特定字符串值，比如方向、状态、事件名
- **模板字符串拼接：** 需要嵌入变量或表达式的字符串拼接场景
- **API 参数约束：** 用联合字符串字面量类型约束 API 参数的可选值

### 常见问题

#### string 和 String 有什么区别

`string`（小写）是 TypeScript 的原始类型，对应 JavaScript 的原始字符串值。`String`（大写）是 JavaScript 的包装对象类型。在类型注解中应该始终用 `string`，不要用 `String`。

```typescript
// 正确：使用原始类型
let good: string = "hello";

// 错误：不要用包装对象类型
let bad: String = "hello";  // 能编译但不推荐

// String 对象和 string 原始值不兼容
let obj: String = new String("hello");
// let prim: string = obj;  // 编译错误：String 不能赋值给 string
```

#### 模板字符串中如何嵌入反引号

```typescript
// 使用转义字符 \` 在模板字符串中嵌入反引号
let code: string = `使用 \`const\` 声明常量`;
// "使用 `const` 声明常量"
```

### 注意事项

- 类型注解始终用小写 `string`，不要用大写 `String`
- 模板字符串可以跨行，但注意换行符会被保留在结果中
- 字符串在 JavaScript 中是不可变的，所有字符串方法都返回新字符串而不修改原字符串
- 字符串的 `length` 属性返回的是 UTF-16 编码单元数，对于 emoji 等 4 字节字符，length 可能不等于可见字符数
- 字符串字面量类型在联合类型中非常有用，但如果可选值太多（超过几十个），考虑用枚举代替

### 总结

TypeScript 的 string 类型对应 JavaScript 的原始字符串，支持单引号、双引号和模板字符串三种字面量写法。模板字符串通过 `${}` 支持变量和表达式插值。在类型层面，具体的字符串值可以作为字面量类型使用，配合联合类型能精确约束函数参数的可选值。类型注解用小写 `string` 而不是大写 `String`。TypeScript 4.1 引入的模板字面量类型进一步增强了字符串类型的表达能力。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## boolean类型的true/false

### 概念定义

TypeScript 的 boolean 类型对应 JavaScript 的布尔原始类型，只有两个值：true 和 false。boolean 是所有编程语言中最简单的类型之一，用于表示逻辑上的真和假。

在 TypeScript 的类型系统中，boolean 实际上等价于 `true | false` 这个联合字面量类型。也就是说，`true` 和 `false` 各自可以作为独立的字面量类型来使用，这在条件类型和类型守卫中非常有用。

### 语法与用法

```typescript
// 显式类型注解
let isDone: boolean = false;
let isActive: boolean = true;

// 类型推断（不写注解，TS 自动推断为 boolean）
let isVisible = true;   // 推断为 boolean
// isVisible = 1;        // 编译错误：number 不能赋值给 boolean

// const 声明时推断为字面量类型
const alwaysTrue = true;    // 推断为 true（字面量类型），不是 boolean
const alwaysFalse = false;  // 推断为 false（字面量类型）

// 布尔字面量类型
let mustBeTrue: true = true;
// mustBeTrue = false;  // 编译错误：false 不能赋值给 true
```

### 基本示例

```typescript
// 条件判断中的 boolean
let loggedIn: boolean = true;

if (loggedIn) {
    console.log("欢迎回来");
} else {
    console.log("请登录");
}

// 函数返回 boolean
function isEven(num: number): boolean {
    return num % 2 === 0;
}

console.log(isEven(4));   // true
console.log(isEven(7));   // false

// 比较运算的结果是 boolean
let a: number = 10;
let b: number = 20;
let isGreater: boolean = a > b;    // false
let isEqual: boolean = a === b;    // false

// 逻辑运算
let hasPermission: boolean = true;
let isAdmin: boolean = false;
let canEdit: boolean = hasPermission && isAdmin;   // false
let canView: boolean = hasPermission || isAdmin;   // true
let isRestricted: boolean = !hasPermission;        // false
```

### 进阶用法

```typescript
// 布尔字面量类型在泛型中的应用
interface FetchOptions {
    url: string;
    cache: boolean;
}

// 用字面量类型区分不同的行为
type StrictMode<T extends boolean> = T extends true
    ? { strict: true; warnings: string[] }
    : { strict: false };

let strictOn: StrictMode<true> = { strict: true, warnings: [] };
let strictOff: StrictMode<false> = { strict: false };

// 布尔类型在类型谓词中的使用
function isString(value: unknown): value is string {
    // 返回值是 boolean，但类型签名是类型谓词
    return typeof value === "string";
}

let input: unknown = "hello";
if (isString(input)) {
    // 在这个分支中，input 被窄化为 string 类型
    console.log(input.toUpperCase());  // 合法
}

// Boolean() 转换函数的使用
// 注意：Boolean() 不是类型注解，是运行时函数
let truthyValues: boolean[] = [
    Boolean(1),          // true
    Boolean("hello"),    // true
    Boolean({}),         // true
    Boolean([]),         // true
];

let falsyValues: boolean[] = [
    Boolean(0),          // false
    Boolean(""),         // false
    Boolean(null),       // false
    Boolean(undefined),  // false
    Boolean(NaN),        // false
];
```

### 与相关概念的对比

| 对比维度 | boolean 类型 | truthy/falsy 值 |
|----------|-------------|----------------|
| 属于 | TypeScript 类型系统 | JavaScript 运行时概念 |
| 可能的值 | 只有 true 和 false | 任何值都有 truthy/falsy 属性 |
| 类型检查 | 编译期检查 | 运行期行为 |
| 隐式转换 | TypeScript 不允许 number 等隐式当 boolean | JS 在 if 中自动转换 |

| 对比维度 | boolean（原始类型） | Boolean（包装对象） |
|----------|-------------------|-------------------|
| typeof | `"boolean"` | `"object"` |
| 推荐度 | 始终推荐 | 不推荐作为类型注解 |
| 在 if 中 | true 为真，false 为假 | 始终为真（对象都是 truthy） |

### 适用场景

- **开关标志：** 控制功能开启/关闭的标志变量，如 `isEnabled`、`isDarkMode`
- **条件判断：** 函数返回值用于 if/else 判断，如 `isValid()`、`hasPermission()`
- **类型谓词：** 作为类型守卫函数的返回类型基础
- **配置选项：** 接口中的布尔属性，如 `{ readonly: boolean; disabled: boolean }`

### 常见问题

#### 为什么 if 中可以放非 boolean 值但 TypeScript 不报错

TypeScript 的 `strictNullChecks` 开启时，if 条件位置接受任何类型的值（因为 JavaScript 本身就支持 truthy/falsy 隐式转换）。TypeScript 不会强制要求 if 条件必须是 boolean 类型。如果你想强制要求，可以用 ESLint 的 `@typescript-eslint/strict-boolean-expressions` 规则。

```typescript
// TypeScript 不报错，但逻辑上可能有隐患
let name: string = "";
if (name) {
    // 空字符串是 falsy，不会进入这里
    console.log(name);
}

// 更安全的写法：显式比较
if (name !== "") {
    console.log(name);
}
```

#### Boolean 对象的陷阱

```typescript
// 不要用 new Boolean() 创建布尔对象
let boolObj = new Boolean(false);
if (boolObj) {
    // 这里会执行！因为 boolObj 是对象，对象是 truthy
    console.log("这是一个陷阱");
}

// 正确做法：使用原始值
let boolPrim: boolean = false;
if (boolPrim) {
    // 不会执行
}
```

### 注意事项

- 类型注解用小写 `boolean`，不要用大写 `Boolean`
- `new Boolean(false)` 创建的是对象，在 if 中是 truthy，这是常见陷阱
- `!!` 双重否定是将任意值转为 boolean 的简写方式，等价于 `Boolean()`
- const 声明的布尔变量会被推断为字面量类型（`true` 或 `false`），而不是宽泛的 `boolean`
- TypeScript 不会阻止你在 if 中使用非 boolean 值，需要自己注意 truthy/falsy 的隐式转换

### 总结

boolean 是 TypeScript 最简单的类型之一，只有 true 和 false 两个值。它等价于 `true | false` 联合字面量类型。使用 const 声明时会推断为具体的字面量类型而非 boolean。类型注解始终用小写 `boolean`，不要用 `Boolean` 包装对象类型。在实际开发中，boolean 广泛用于条件判断、开关标志和类型谓词，需要注意 JavaScript truthy/falsy 隐式转换和 Boolean 对象的陷阱。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## null类型的null值

### 概念定义

TypeScript 的 null 类型只有一个值，就是 null。null 在语义上表示"有意设置的空值"，和 undefined 的"尚未初始化"不同。当开发者想明确表达一个变量"没有值"或"没有对象"时，用 null 来赋值。

在 TypeScript 中，null 的行为取决于 `strictNullChecks` 编译选项。关闭时，null 可以赋值给任何类型；开启时（推荐），null 是独立的类型，只能赋值给 null 本身或包含 null 的联合类型。

### 语法与用法

```typescript
// 开启 strictNullChecks 时的行为（推荐配置）

// null 类型的变量只能赋值为 null
let empty: null = null;

// 不能将 null 赋值给其他类型
let name: string = "hello";
// name = null;  // 编译错误：null 不能赋值给 string

// 需要用联合类型显式允许 null
let nickname: string | null = "小明";
nickname = null;   // 合法，因为类型包含 null

// 函数返回值可能为 null
function findUser(id: number): { name: string } | null {
    if (id === 1) {
        return { name: "张三" };
    }
    return null;  // 明确返回 null 表示"没找到"
}
```

### 基本示例

```typescript
// 实际开发中 null 的典型使用
interface User {
    id: number;
    name: string;
    avatar: string | null;  // 头像可能为空（用户未上传）
}

const user: User = {
    id: 1,
    name: "张三",
    avatar: null,  // 尚未设置头像
};

// 使用前需要做 null 检查（类型窄化）
function getAvatarUrl(user: User): string {
    if (user.avatar !== null) {
        // 这个分支中 avatar 被窄化为 string
        return `https://cdn.example.com/${user.avatar}`;
    }
    return "https://cdn.example.com/default-avatar.png";
}

// 可选链操作符处理可能为 null 的嵌套属性
interface Config {
    database: {
        host: string;
        port: number;
    } | null;
}

const config: Config = { database: null };
// 安全访问：如果 database 是 null，整个表达式返回 undefined
const host = config.database?.host;  // undefined
console.log(host);

// 空值合并操作符提供默认值
const dbHost = config.database?.host ?? "localhost";  // "localhost"
console.log(dbHost);
```

### 与 undefined 的对比

| 对比维度 | null | undefined |
|----------|------|-----------|
| 语义 | 有意设置的空值 | 尚未初始化，缺少值 |
| typeof | `"object"`（历史遗留 bug） | `"undefined"` |
| 转为数字 | 0 | NaN |
| 转为布尔 | false | false |
| 来源 | 开发者手动赋值 | JS 引擎自动赋予 |
| `== null` | true | true |
| `=== null` | true | false |
| JSON 序列化 | 保留为 null | 属性被省略 |

### 适用场景

- **表示"无对象"：** 变量类型是对象但当前没有值时，赋值为 null 比 undefined 更语义化
- **DOM 查询结果：** `document.getElementById()` 找不到元素时返回 null
- **API 响应字段：** 后端返回的 JSON 中，空字段通常用 null 表示
- **数据库映射：** 数据库中的 NULL 值映射到前端时用 null 表示

### 常见问题

#### typeof null 为什么返回 "object"

这是 JavaScript 的历史遗留 bug，从第一个版本就存在，无法修复（修复会破坏大量已有代码）。判断 null 时不要用 typeof，直接用 `=== null` 严格相等。

```typescript
console.log(typeof null);    // "object"（bug）
console.log(null === null);  // true（正确的判断方式）

// 判断值是否为 null 或 undefined 的简洁写法
function isNullish(value: unknown): value is null | undefined {
    return value == null;  // 宽松相等同时匹配 null 和 undefined
}
```

#### null 和 undefined 在项目中如何选择

团队中应该统一约定。常见的做法是：函数"找不到结果"返回 null，可选参数未传递时是 undefined。有些团队选择全部用 undefined（配合可选属性 `?`），有些选择 null 表示"明确的空"。重要的是团队内保持一致。

### 注意事项

- 开启 `strictNullChecks`（包含在 `strict: true` 中）是使用 null 类型的前提，关闭后 null 可以赋值给任何类型，失去类型安全
- `==` 宽松相等时 `null == undefined` 为 true，在需要同时判断两者时可以利用这个特性
- 可选链 `?.` 在遇到 null 或 undefined 时都会短路返回 undefined（不是 null）
- JSON.stringify 会保留 null 值，但会省略值为 undefined 的属性
- 不要用 `new` 调用 `null`，null 不是构造函数

### 总结

null 是 TypeScript 中表示"有意设置的空值"的独立类型，只有一个值 null。在 strictNullChecks 开启时，null 不能赋值给非 null 类型，需要通过联合类型 `T | null` 显式允许。和 undefined 的区别在于语义：null 是开发者主动设置的空，undefined 是系统自动产生的未初始化。使用前必须做 null 检查（类型窄化），可以通过 `!== null`、可选链 `?.`、空值合并 `??` 等方式安全地处理。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## undefined类型的undefined值

### 概念定义

TypeScript 的 undefined 类型只有一个值 undefined，表示"尚未初始化"或"缺少值"的状态。和 null 不同，undefined 通常不是开发者主动赋予的，而是 JavaScript 引擎在特定场景下自动产生的。

在 TypeScript 中，undefined 类型和 null 类型一样受 `strictNullChecks` 控制。开启后，undefined 不能赋值给 string、number 等非 undefined 类型，必须通过联合类型或可选属性显式允许。

### 语法与用法

```typescript
// undefined 类型的变量
let notAssigned: undefined = undefined;

// 开启 strictNullChecks 时，不能将 undefined 赋给其他类型
let name: string = "hello";
// name = undefined;  // 编译错误

// 联合类型允许 undefined
let maybeName: string | undefined = "张三";
maybeName = undefined;  // 合法

// 可选属性自动带有 undefined
interface User {
    name: string;
    bio?: string;  // 等价于 bio: string | undefined
}

// 可选参数也自动带有 undefined
function greet(name: string, prefix?: string): string {
    // prefix 的类型是 string | undefined
    return prefix ? `${prefix} ${name}` : name;
}

greet("张三");           // prefix 是 undefined
greet("张三", "尊敬的");  // prefix 是 "尊敬的"
```

### 基本示例

```typescript
// undefined 产生的常见场景

// 1. 声明未赋值（let 声明）
let x: number | undefined;
console.log(x);  // undefined

// 2. 函数没有 return
function doNothing(): void {
    // 没有 return 语句
}
const result = doNothing();
console.log(result);  // undefined

// 3. 访问不存在的对象属性
const obj: Record<string, number> = { a: 1 };
const val = obj["b"];  // undefined

// 4. 数组越界访问
const arr: number[] = [1, 2, 3];
const item = arr[10];  // undefined（运行时），但 TS 默认不检查越界

// 5. 解构赋值未匹配到值
const [first, second] = [100];
console.log(second);  // undefined

// 6. void 操作符
console.log(void 0);        // undefined
console.log(void "hello");  // undefined

// undefined 检查
function processValue(value: string | undefined): string {
    // 方式1：严格相等
    if (value !== undefined) {
        return value.toUpperCase();
    }
    
    // 方式2：typeof（对未声明变量更安全）
    // if (typeof value !== 'undefined') { ... }
    
    return "默认值";
}
```

### 进阶用法

```typescript
// void 0 获取 undefined 值（最安全的方式）
// 在某些老旧环境中 undefined 可能被覆盖，void 0 不会
const safeUndefined = void 0;

// 区分"属性不存在"和"属性值为 undefined"
interface Config {
    timeout?: number;  // 可选属性
}

const config1: Config = {};           // timeout 不存在
const config2: Config = { timeout: undefined };  // timeout 存在但值为 undefined

// 用 in 操作符区分两种情况
console.log("timeout" in config1);  // false
console.log("timeout" in config2);  // true

// 用 hasOwnProperty 区分
console.log(config1.hasOwnProperty("timeout"));  // false
console.log(config2.hasOwnProperty("timeout"));  // true

// 默认参数和 undefined 的关系
function createUser(name: string, age: number = 18): void {
    console.log(`${name}, ${age}`);
}

createUser("张三");            // "张三, 18"（age 使用默认值）
createUser("张三", undefined); // "张三, 18"（传 undefined 也触发默认值）
createUser("张三", 25);        // "张三, 25"（显式传值覆盖默认值）
// 注意：传 null 不会触发默认值
```

### 与 null 的对比

| 对比维度 | undefined | null |
|----------|-----------|------|
| 语义 | 缺少值、尚未初始化 | 有意设置的空值 |
| typeof | `"undefined"` | `"object"` |
| 转为数字 | NaN | 0 |
| JSON.stringify | 属性被省略 | 保留为 null |
| 默认参数触发 | 传 undefined 会触发默认值 | 传 null 不触发默认值 |
| 可选属性 | 可选属性的类型自动包含 undefined | 需要显式写 `| null` |
| 可选链结果 | `?.` 短路返回 undefined | `?.` 遇到 null 也返回 undefined |

### 适用场景

- **可选属性和可选参数：** TypeScript 中 `?` 语法自动关联 undefined
- **函数默认参数：** 未传参或传 undefined 时使用默认值
- **对象属性存在性检查：** 判断属性是否被赋值
- **类型守卫窄化：** 通过 `!== undefined` 排除 undefined 后安全使用

### 常见问题

#### 可选属性 `?` 和 `| undefined` 有什么区别

可选属性 `prop?: T` 表示属性可以不存在，等价于 `prop: T | undefined`，但在对象字面量赋值时有细微差别：可选属性允许整个属性缺失，而显式的 `| undefined` 要求属性必须存在（值可以是 undefined）。

```typescript
interface A {
    x?: number;       // 属性可以不存在
}
interface B {
    x: number | undefined;  // 属性必须存在，值可以是 undefined
}

const a: A = {};              // 合法，x 属性不存在
const b: B = { x: undefined }; // 合法，x 存在但值为 undefined
// const b2: B = {};           // 编译错误：缺少属性 x
```

#### 如何同时检查 null 和 undefined

```typescript
// 方式1：宽松相等（同时匹配 null 和 undefined）
function isNullish(value: unknown): boolean {
    return value == null;  // null == undefined 为 true
}

// 方式2：空值合并操作符（对 null 和 undefined 都生效）
let input: string | null | undefined = null;
let result = input ?? "默认值";  // "默认值"
```

### 注意事项

- TypeScript 数组的越界访问默认不做类型检查，`arr[100]` 的类型是 `T` 而不是 `T | undefined`。开启 `noUncheckedIndexedAccess`（TS 4.1+）可以让索引访问返回 `T | undefined`
- 传 undefined 给有默认值的参数会触发默认值，但传 null 不会
- void 类型和 undefined 类型有关联：void 表示函数没有返回值，函数体实际返回的是 undefined
- 在严格模式下，全局的 undefined 不可写不可配置，但在函数作用域内仍可以声明名为 undefined 的局部变量（不建议这么做）

### 总结

undefined 是 TypeScript 中表示"缺少值"或"尚未初始化"的独立类型，只有一个值 undefined。它通常由引擎自动产生（未赋值变量、缺失参数、不存在的属性等），而不是开发者主动设置。在 strictNullChecks 模式下，undefined 不能赋值给非 undefined 类型，可选属性 `?` 和可选参数会自动包含 undefined。和 null 的区别在于语义和某些运行时行为（如 typeof、JSON 序列化、默认参数触发）。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## symbol类型的Symbol值

### 概念定义

symbol 是 ES2015 引入的第七种原始类型，TypeScript 从 1.5 版本开始支持。每次调用 `Symbol()` 都会创建一个全局唯一且不可变的值，主要用途是作为对象属性的键，避免属性名冲突。

TypeScript 中 symbol 类型表示所有 Symbol 值的集合。此外，TypeScript 还支持 `unique symbol` 这一特殊子类型，用于将 const 声明的 Symbol 标记为一个独一无二的类型，使得类型系统能区分不同的 Symbol 常量。

### 语法与用法

```typescript
// 创建 symbol（每次调用都是唯一的）
let s1: symbol = Symbol();
let s2: symbol = Symbol("description");  // 可选的描述字符串，仅用于调试

// 唯一符号类型（只能用 const 声明）
const uniqueKey: unique symbol = Symbol("uniqueKey");
// unique symbol 是 symbol 的子类型，类型上独一无二

// Symbol 的唯一性
let a = Symbol("test");
let b = Symbol("test");
console.log(a === b);  // false（即使描述相同，Symbol 本身不同）

// Symbol.for() 创建全局共享的 Symbol
let global1 = Symbol.for("shared");
let global2 = Symbol.for("shared");
console.log(global1 === global2);  // true（同一个全局注册的 Symbol）
```

#### unique symbol 的限制

| 特性 | symbol | unique symbol |
|------|--------|--------------|
| 声明方式 | let/const/var 都可以 | 只能用 const 声明 |
| 类型兼容性 | 所有 symbol 值的宽类型 | 每个 unique symbol 类型唯一 |
| 相等比较 | 类型层面不能区分两个 symbol | 类型层面可以区分 |
| 用作接口键 | 不能 | 可以 |

### 基本示例

```typescript
// 用 Symbol 作为对象属性键，避免命名冲突
const ID: unique symbol = Symbol("id");
const NAME: unique symbol = Symbol("name");

interface User {
    [ID]: number;
    [NAME]: string;
    displayName: string;
}

const user: User = {
    [ID]: 1001,
    [NAME]: "张三",
    displayName: "张三丰",
};

// 访问 Symbol 属性
console.log(user[ID]);    // 1001
console.log(user[NAME]);  // "张三"

// Symbol 属性不会出现在常规遍历中
console.log(Object.keys(user));        // ["displayName"]（不包含 Symbol 键）
console.log(Object.getOwnPropertySymbols(user));  // [Symbol(id), Symbol(name)]

// Symbol 属性也不会被 JSON.stringify 序列化
console.log(JSON.stringify(user));  // {"displayName":"张三丰"}
```

### 进阶用法

```typescript
// Well-Known Symbols：JavaScript 内置的特殊 Symbol
// 用于自定义对象的语言级行为

// Symbol.iterator：让对象可被 for...of 迭代
class Range {
    constructor(private start: number, private end: number) {}

    // 实现迭代器协议
    [Symbol.iterator](): Iterator<number> {
        let current = this.start;
        const end = this.end;
        return {
            next(): IteratorResult<number> {
                if (current <= end) {
                    return { value: current++, done: false };
                }
                return { value: undefined as any, done: true };
            },
        };
    }
}

const range = new Range(1, 5);
for (const num of range) {
    console.log(num);  // 1, 2, 3, 4, 5
}

// Symbol.toPrimitive：自定义对象的类型转换
class Money {
    constructor(private amount: number, private currency: string) {}

    [Symbol.toPrimitive](hint: string): number | string {
        if (hint === "number") {
            return this.amount;
        }
        return `${this.amount} ${this.currency}`;
    }
}

const price = new Money(100, "CNY");
console.log(+price);       // 100（hint 为 "number"）
console.log(`${price}`);   // "100 CNY"（hint 为 "string"）
```

### 适用场景

- **属性键防冲突：** 在库或框架中用 Symbol 作为对象属性键，避免和用户代码的属性名冲突
- **元编程协议：** 通过 Well-Known Symbols（如 Symbol.iterator、Symbol.toPrimitive）自定义对象的语言行为
- **唯一标识符：** 用 Symbol 创建不可伪造的唯一标记，比如状态机的状态标识
- **类的私有属性模拟：** Symbol 属性不会出现在 Object.keys 和 for...in 中，可以模拟一定程度的隐藏

### 常见问题

#### Symbol 能不能作为 Map 的键

可以。Symbol 作为原始类型，可以作为 Map 的键，而且因为 Symbol 的唯一性，每个 Symbol 键都保证不冲突。

```typescript
const KEY_A: unique symbol = Symbol("a");
const KEY_B: unique symbol = Symbol("b");

const map = new Map<symbol, string>();
map.set(KEY_A, "值A");
map.set(KEY_B, "值B");
console.log(map.get(KEY_A));  // "值A"
```

#### Symbol 和 ES2022 的私有字段 # 有什么区别

Symbol 属性虽然不出现在常规遍历中，但通过 `Object.getOwnPropertySymbols()` 仍然可以访问到，不是真正的私有。ES2022 的 `#` 私有字段是语言层面的硬私有，外部完全不可访问。如果需要真正的私有属性，用 `#` 而不是 Symbol。

### 注意事项

- Symbol 不能用 `new Symbol()` 创建，会抛出 TypeError。它不是构造函数
- Symbol 不能隐式转为字符串或数字，`"prefix" + sym` 会报错，需要显式调用 `sym.toString()` 或 `sym.description`
- unique symbol 只能用 const 声明，let 和 var 声明的 symbol 只能标注为 symbol 宽类型
- `Symbol.for()` 创建的是全局共享的 Symbol，在不同模块中用相同的 key 会拿到同一个 Symbol
- TypeScript 的 target 需要设置为 es2015 或更高版本才能使用 Symbol

### 总结

symbol 是 JavaScript 的原始类型之一，每次调用 `Symbol()` 都产生全局唯一的值，主要用途是作为对象属性键防止命名冲突。TypeScript 额外提供了 `unique symbol` 子类型，让 const 声明的 Symbol 在类型层面也是独一无二的。Well-Known Symbols（如 Symbol.iterator）允许自定义对象的语言级行为。Symbol 属性不会出现在常规遍历和 JSON 序列化中，但不是真正的私有——需要真正的私有属性应使用 `#` 私有字段。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## bigint类型的BigInt值

### 概念定义

bigint 是 ES2020 引入的原始类型，TypeScript 从 3.2 版本开始支持。它用于表示任意精度的整数，没有 number 类型的安全整数范围限制（2^53 - 1）。当业务中需要处理超大整数（比如雪花 ID、加密算法、高精度计数器）时，bigint 是正确的选择。

bigint 和 number 是两个完全独立的类型域，不能直接混合运算，也不能隐式转换。这种设计是有意为之的，强制开发者在两种数值类型之间做显式选择。

### 语法与用法

```typescript
// 字面量语法：在整数后加 n
let big1: bigint = 100n;
let big2: bigint = 9007199254740993n;  // 超出 number 安全范围的值

// BigInt() 函数创建
let big3: bigint = BigInt(100);
let big4: bigint = BigInt("9007199254740993");

// 不同进制的 bigint 字面量
let hexBig: bigint = 0xFFn;      // 十六进制
let octBig: bigint = 0o77n;      // 八进制
let binBig: bigint = 0b1010n;    // 二进制

// 数字分隔符
let trillion: bigint = 1_000_000_000_000n;

// typeof 检测
console.log(typeof 42n);  // "bigint"
```

### 基本示例

```typescript
// bigint 的基本运算
let a: bigint = 100n;
let b: bigint = 200n;

// 支持常规算术运算符
console.log(a + b);   // 300n
console.log(a * b);   // 20000n
console.log(b - a);   // 100n
console.log(b / a);   // 2n（整数除法，不保留小数）
console.log(b % a);   // 0n
console.log(a ** 3n); // 1000000n（幂运算）

// bigint 除法是整数除法，直接截断小数部分
console.log(7n / 2n);  // 3n（不是 3.5n）

// 比较运算（bigint 和 number 可以比较，但不能混合计算）
console.log(100n === 100n);  // true
console.log(100n == 100);    // true（宽松相等允许跨类型比较）
console.log(100n === 100);   // false（严格相等类型不同）
console.log(100n > 99);      // true（比较运算允许 bigint 和 number 混合）
console.log(100n < 101);     // true

// bigint 不支持小数
// let invalid: bigint = 1.5n;  // 语法错误

// bigint 不支持一元 + 运算符
// let pos = +100n;  // TypeError

// 超大整数精确表示
let snowflakeId: bigint = 1234567890123456789n;
console.log(snowflakeId.toString());  // "1234567890123456789"（精确表示）

// 对比 number 的精度丢失
let numId: number = 1234567890123456789;
console.log(numId);  // 1234567890123456800（精度丢失！）
```

### 进阶用法

```typescript
// bigint 和 number 之间的显式转换
let bigVal: bigint = 100n;
let numVal: number = Number(bigVal);    // bigint -> number
let bigBack: bigint = BigInt(numVal);   // number -> bigint

// 注意：转换可能丢失精度
let hugeBig: bigint = 9007199254740993n;
let lostPrecision: number = Number(hugeBig);
console.log(lostPrecision);  // 9007199254740992（精度丢失）

// 在数据结构中使用 bigint
interface Transaction {
    id: bigint;
    amount: bigint;       // 用 bigint 存储金额（单位：分），避免浮点精度问题
    timestamp: bigint;    // 纳秒级时间戳
}

const tx: Transaction = {
    id: 1001n,
    amount: 9999999999n,  // 99999999.99 元
    timestamp: 1709280000000000000n,  // 纳秒时间戳
};

// bigint 在条件判断中的 truthy/falsy
console.log(Boolean(0n));   // false（0n 是 falsy）
console.log(Boolean(1n));   // true
console.log(Boolean(-1n));  // true

// bigint 的位运算
let flags: bigint = 0b1010n;
console.log(flags & 0b1100n);  // 0b1000n（按位与）
console.log(flags | 0b0101n);  // 0b1111n（按位或）
console.log(flags ^ 0b1100n);  // 0b0110n（按位异或）
console.log(~flags);           // -0b1011n（按位取反）
console.log(flags << 2n);      // 0b101000n（左移）
console.log(flags >> 1n);      // 0b101n（右移）
```

### 与 number 的对比

| 对比维度 | number | bigint |
|----------|--------|--------|
| 精度 | 双精度浮点，安全整数 -(2^53-1) ~ 2^53-1 | 任意精度整数，无上限 |
| 小数 | 支持 | 不支持 |
| typeof | `"number"` | `"bigint"` |
| 字面量 | `42`、`3.14` | `42n` |
| 混合运算 | 不能和 bigint 混合 | 不能和 number 混合 |
| Math 方法 | 支持 Math.abs() 等 | 不支持 Math 方法 |
| JSON 序列化 | 直接支持 | 默认不支持，会抛出 TypeError |
| 性能 | 快（硬件原生支持） | 慢（软件模拟任意精度） |
| target 要求 | 所有 | es2020 或更高 |

### 适用场景

- **雪花 ID / 分布式 ID：** 超过 53 位的整数 ID，number 会丢失精度
- **加密和哈希计算：** 需要处理超大整数的数学运算
- **高精度金融计算：** 用整数（单位：分或厘）存储金额，避免浮点精度问题
- **纳秒级时间戳：** 需要比毫秒更高精度的时间表示
- **大数据量计数：** 统计数据可能超出安全整数范围

### 常见问题

#### JSON.stringify 遇到 bigint 会报错

默认情况下，`JSON.stringify` 不能序列化 bigint 值，会抛出 `TypeError: Do not know how to serialize a BigInt`。

```typescript
// 报错
// JSON.stringify({ id: 100n });  // TypeError

// 解决方案1：自定义 toJSON
(BigInt.prototype as any).toJSON = function () {
    return this.toString();
};
console.log(JSON.stringify({ id: 100n }));  // {"id":"100"}

// 解决方案2：使用 replacer 函数
const data = { id: 100n, name: "test" };
const json = JSON.stringify(data, (key, value) => {
    return typeof value === "bigint" ? value.toString() : value;
});
console.log(json);  // {"id":"100","name":"test"}
```

#### bigint 能和 number 做比较但不能做运算

```typescript
// 比较运算允许混合
console.log(1n < 2);     // true（合法）
console.log(2n > 1);     // true（合法）
console.log(1n == 1);    // true（宽松相等合法）

// 算术运算不允许混合
// console.log(1n + 2);  // TypeError: Cannot mix BigInt and other types

// 必须显式转换
console.log(1n + BigInt(2));  // 3n
console.log(Number(1n) + 2); // 3
```

### 注意事项

- TypeScript 编译 target 必须是 `es2020` 或更高，否则不支持 bigint 字面量语法
- bigint 不能使用 Math 对象的方法（如 Math.abs），需要自己实现或用第三方库
- bigint 除法是整数除法，直接截断小数，不做四舍五入
- 0n 是 falsy 值，其他 bigint 值都是 truthy
- bigint 不支持一元 `+` 运算符（`+100n` 会报错），这和 number 不同
- 在数据库交互中，bigint 列的值需要驱动支持（如 mysql2 需要配置 `supportBigNumbers: true`）

### 总结

bigint 是 TypeScript 3.2+ 支持的原始类型，用于表示任意精度整数，解决了 number 类型在超大整数场景下的精度丢失问题。字面量语法是在数字后加 `n`（如 `100n`）。bigint 和 number 是完全独立的类型域，不能混合运算但可以比较。使用时要注意 JSON 序列化需要特殊处理、不支持 Math 方法、除法是整数除法、编译 target 需要 es2020+。适用于雪花 ID、加密计算、高精度金额和纳秒时间戳等场景。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## object类型的非原始类型

### 概念定义

TypeScript 中的 `object`（小写）类型表示所有非原始类型的值，也就是除了 number、string、boolean、symbol、bigint、null、undefined 之外的所有类型。它包括普通对象、数组、函数、Date、RegExp、Map、Set 等一切引用类型。

需要注意的是，TypeScript 中有三个容易混淆的"对象相关类型"：`object`（小写，非原始类型）、`Object`（大写，几乎所有值）、`{}`（空对象类型，几乎所有非 nullish 值）。三者的范围完全不同。

### 语法与用法

```typescript
// object 类型：只接受非原始类型
let obj: object;

obj = { name: "张三" };   // 对象，合法
obj = [1, 2, 3];          // 数组，合法
obj = function() {};       // 函数，合法
obj = new Date();          // Date，合法
obj = new Map();           // Map，合法

// obj = 42;              // 编译错误：number 是原始类型
// obj = "hello";         // 编译错误：string 是原始类型
// obj = true;            // 编译错误：boolean 是原始类型
// obj = null;            // 编译错误（strictNullChecks 下）
// obj = undefined;       // 编译错误（strictNullChecks 下）
```

### 基本示例

```typescript
// object 类型最常见的用途：约束参数必须是引用类型
function getKeys(obj: object): string[] {
    return Object.keys(obj);
}

getKeys({ a: 1, b: 2 });   // ["a", "b"]
getKeys([1, 2, 3]);         // ["0", "1", "2"]
// getKeys("hello");         // 编译错误：string 不能赋值给 object
// getKeys(42);              // 编译错误：number 不能赋值给 object

// Object.create() 的参数类型就是 object | null
const proto: object = { greet() { return "hello"; } };
const child = Object.create(proto);

// WeakMap 和 WeakSet 的键必须是 object 类型（或继承自 object）
const weakMap = new WeakMap<object, string>();
const key = { id: 1 };
weakMap.set(key, "value");
// weakMap.set("string", "value");  // 编译错误：string 不是 object
```

### 三种对象类型的对比

| 对比维度 | `object`（小写） | `Object`（大写） | `{}`（空对象字面量） |
|----------|-----------------|-----------------|-------------------|
| 含义 | 非原始类型 | 几乎所有值（有 toString 等方法的值） | 没有自身属性的类型 |
| 接受 number | 不接受 | 接受 | 接受 |
| 接受 string | 不接受 | 接受 | 接受 |
| 接受 boolean | 不接受 | 接受 | 接受 |
| 接受 null | 不接受 | 不接受（strictNullChecks） | 不接受（strictNullChecks） |
| 接受 undefined | 不接受 | 不接受（strictNullChecks） | 不接受（strictNullChecks） |
| 接受 {} | 接受 | 接受 | 接受 |
| 推荐度 | 特定场景推荐 | 不推荐 | 不推荐 |

```typescript
// 演示三者的区别
let a: object = { x: 1 };    // 合法
// let b: object = 42;        // 错误：原始类型

let c: Object = { x: 1 };    // 合法
let d: Object = 42;           // 合法（不推荐用 Object 类型）

let e: {} = { x: 1 };         // 合法
let f: {} = 42;                // 合法（{} 接受几乎所有非 nullish 值）
```

### 适用场景

- **约束参数为引用类型：** 当函数参数需要是对象、数组或函数（排除原始值）时使用 object
- **WeakMap/WeakSet 的键类型：** 这两个集合要求键必须是 object 类型
- **Object.create 的原型参数：** 原型必须是 object 或 null
- **泛型约束：** 用 `<T extends object>` 限制泛型参数必须是引用类型

### 常见问题

#### object 类型能访问属性吗

不能直接访问。object 类型只表示"是个引用类型"，不包含任何具体属性信息。如果需要访问属性，应该用接口、类型别名或 Record 等更具体的类型。

```typescript
let obj: object = { name: "张三" };
// console.log(obj.name);  // 编译错误：object 上不存在属性 name

// 解决方案：用更具体的类型
let user: { name: string } = { name: "张三" };
console.log(user.name);  // "张三"

// 或者用类型断言（不推荐，绕过了类型检查）
console.log((obj as any).name);  // "张三"
```

#### 什么时候用 object，什么时候用 Record 或接口

如果只需要确保值不是原始类型，用 `object`。如果需要描述对象的具体结构（有哪些属性），用接口或类型别名。如果需要键值对但不确定具体的键，用 `Record<string, unknown>`。

### 注意事项

- 不要用大写的 `Object` 作为类型注解，它接受原始值，违背了"对象类型"的直觉
- `object` 类型上不能访问任何自定义属性，需要做类型断言或用更具体的类型
- `{}` 空对象类型看起来像"空对象"，实际上接受几乎所有非 nullish 值（包括 number、string），容易误导
- 在泛型约束中，`T extends object` 是限制泛型为引用类型的标准写法

### 总结

`object`（小写）是 TypeScript 中表示非原始类型的类型，包含所有引用类型（对象、数组、函数等），排除 number、string、boolean、symbol、bigint、null、undefined。它和 `Object`（大写）、`{}`（空对象字面量类型）有本质区别：Object 和 {} 接受原始值，object 不接受。实际开发中，需要约束参数为引用类型时用 `object`，需要描述具体结构时用接口或类型别名，不要用 `Object` 或 `{}` 作为类型注解。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Array\&lt;T\>泛型数组类型

### 概念定义

TypeScript 提供了两种数组类型注解方式，`Array<T>` 是其中的泛型写法。`T` 是数组元素的类型参数，表示数组中每个元素都必须是 `T` 类型。这种写法和 `T[]` 完全等价，只是语法风格不同。

`Array<T>` 来源于 TypeScript 内置的 `Array` 接口定义，它继承自 `lib.es5.d.ts` 中的全局 `Array` 接口，包含了 push、pop、map、filter 等所有数组方法的类型签名。

### 语法与用法

```typescript
// 泛型数组语法
let numbers: Array<number> = [1, 2, 3];
let strings: Array<string> = ["a", "b", "c"];
let mixed: Array<string | number> = [1, "two", 3];

// 多维数组
let matrix: Array<Array<number>> = [[1, 2], [3, 4]];

// 对象数组
interface User {
    name: string;
    age: number;
}
let users: Array<User> = [
    { name: "张三", age: 25 },
    { name: "李四", age: 30 },
];
```

### 基本示例

```typescript
// 创建和操作泛型数组
let fruits: Array<string> = ["苹果", "香蕉", "橘子"];

// push：添加元素（类型检查生效）
fruits.push("西瓜");
// fruits.push(42);  // 编译错误：number 不能赋值给 string

// map：返回新数组，类型自动推断
let upperFruits: Array<string> = fruits.map((f) => f.toUpperCase());
// 等价于 string[]，TS 自动推断 map 的返回类型

// filter：返回子集数组
let longNames: Array<string> = fruits.filter((f) => f.length > 2);

// find：返回 T | undefined
let found: string | undefined = fruits.find((f) => f === "香蕉");

// reduce：类型由初始值决定
let totalLength: number = fruits.reduce((sum, f) => sum + f.length, 0);

// 空数组需要显式注解类型
let empty: Array<number> = [];  // 没有注解的话，TS 推断为 never[]
empty.push(1);  // 合法

// 类型推断：不加注解时 TS 根据初始值推断
let inferred = [1, 2, 3];         // 推断为 number[]
let mixedInferred = [1, "hello"];  // 推断为 (string | number)[]
```

### 进阶用法

```typescript
// 泛型函数中使用 Array<T>
function getFirst<T>(arr: Array<T>): T | undefined {
    return arr.length > 0 ? arr[0] : undefined;
}

let firstNum = getFirst([10, 20, 30]);    // 推断为 number | undefined
let firstStr = getFirst(["a", "b"]);       // 推断为 string | undefined

// 只读数组：ReadonlyArray<T>
let readonlyArr: ReadonlyArray<number> = [1, 2, 3];
// readonlyArr.push(4);    // 编译错误：ReadonlyArray 没有 push 方法
// readonlyArr[0] = 10;    // 编译错误：索引签名只读

// Array<T> 在 Promise 场景中的使用
async function fetchUsers(): Promise<Array<User>> {
    const response = await fetch("/api/users");
    return response.json();  // 返回 User 数组
}
```

### 与 T[] 简写的对比

| 对比维度 | Array\&lt;T\> | T[] |
|----------|-----------|-----|
| 含义 | 完全相同 | 完全相同 |
| 可读性 | 复杂类型时更清晰 | 简单类型时更简洁 |
| 嵌套数组 | `Array<Array<number>>` | `number[][]` |
| 联合类型数组 | `Array<string \| number>` | `(string \| number)[]` |
| 官方推荐 | 无偏好 | 无偏好 |

### 适用场景

- **复杂元素类型：** 元素类型是联合类型或嵌套泛型时，`Array<T>` 比 `T[]` 更清晰
- **泛型代码：** 在泛型函数或泛型类中统一使用 `Array<T>` 风格保持一致
- **只读数组：** `ReadonlyArray<T>` 只有泛型写法，没有简写形式
- **多维数组：** `Array<Array<T>>` 比 `T[][]` 在某些团队规范中更受欢迎

### 常见问题

#### Array\&lt;T\> 和 T[] 到底用哪个

两者编译后完全一样，选择哪个是团队风格问题。常见的做法是：简单类型用 `T[]`（如 `number[]`），复杂类型用 `Array<T>`（如 `Array<string | number>`）。ESLint 的 `@typescript-eslint/array-type` 规则可以强制统一风格。

#### 为什么空数组 [] 的类型是 never[]

当没有类型注解且初始值是空数组时，TypeScript 无法推断元素类型，在某些上下文中会推断为 `never[]`。给空数组加上类型注解即可解决。

```typescript
// 可能推断为 never[]
let arr = [];
// arr.push(1);  // 在严格模式某些场景下可能报错

// 正确做法：显式注解
let arr2: Array<number> = [];
arr2.push(1);  // 合法
```

### 注意事项

- `Array` 是引用类型，赋值和传参是传引用，修改会影响原数组
- 数组索引访问默认不做越界检查，`arr[100]` 的类型是 `T` 而不是 `T | undefined`（除非开启 `noUncheckedIndexedAccess`）
- `ReadonlyArray<T>` 只是编译期约束，运行时仍然是普通数组，可以通过类型断言绕过
- 不要用 `new Array<T>()` 创建数组，直接用字面量 `[]` 更简洁也不容易出错

### 总结

`Array<T>` 是 TypeScript 中数组类型的泛型写法，和 `T[]` 完全等价。`T` 指定了数组元素的类型，TypeScript 会对 push、赋值等操作做类型检查。复杂元素类型时 `Array<T>` 可读性更好，简单类型时 `T[]` 更简洁。需要不可变数组时使用 `ReadonlyArray<T>`。空数组建议加上显式类型注解避免推断为 `never[]`。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## T[]数组类型简写

### 概念定义

`T[]` 是 TypeScript 中数组类型的简写语法，和 `Array<T>` 完全等价。`T` 代表数组元素的类型，`[]` 后缀表示这是一个该类型的数组。这种写法更接近 JavaScript 开发者的习惯，也是社区中使用最广泛的数组类型注解方式。

TypeScript 编译器对 `T[]` 和 `Array<T>` 的处理完全一致，生成的类型信息相同，编译产物也没有任何区别。选择哪种写法纯粹是代码风格问题。

### 语法与用法

```typescript
// 基本数组类型简写
let numbers: number[] = [1, 2, 3];
let strings: string[] = ["hello", "world"];
let booleans: boolean[] = [true, false];

// 联合类型数组（需要括号包裹联合类型）
let mixed: (string | number)[] = [1, "two", 3];

// 对象类型数组
let users: { name: string; age: number }[] = [
    { name: "张三", age: 25 },
];

// 多维数组
let matrix: number[][] = [[1, 2], [3, 4]];
let cube: number[][][] = [[[1, 2], [3, 4]], [[5, 6], [7, 8]]];

// 只读数组简写（TypeScript 3.4+）
let readonly1: readonly number[] = [1, 2, 3];
// readonly1.push(4);  // 编译错误：readonly 数组没有 push
```

### 基本示例

```typescript
// 类型推断：不写注解时 TS 自动推断数组类型
let inferred = [1, 2, 3];           // number[]
let inferredStr = ["a", "b"];        // string[]
let inferredMix = [1, "a", true];    // (string | number | boolean)[]

// 数组方法的类型安全
let scores: number[] = [85, 92, 78, 95, 88];

// map 返回新类型的数组
let labels: string[] = scores.map((s) => `得分: ${s}`);

// filter 返回同类型数组
let highScores: number[] = scores.filter((s) => s >= 90);

// sort 原地排序
scores.sort((a, b) => a - b);  // a 和 b 自动推断为 number

// includes 参数类型检查
let hasScore: boolean = scores.includes(100);
// scores.includes("100");  // 编译错误：string 不能赋值给 number

// 解构赋值
let [first, second, ...rest]: number[] = scores;
// first: number, second: number, rest: number[]

// 展开运算符合并数组
let moreScores: number[] = [100, 99];
let allScores: number[] = [...scores, ...moreScores];
```

### 进阶用法

```typescript
// 函数参数和返回值使用 T[]
function unique<T>(arr: T[]): T[] {
    return [...new Set(arr)];
}

let nums = unique([1, 2, 2, 3, 3]);       // number[]
let strs = unique(["a", "b", "a"]);        // string[]

// 条件类型中提取数组元素类型
type ElementOf<T> = T extends (infer E)[] ? E : never;

type NumElement = ElementOf<number[]>;     // number
type StrElement = ElementOf<string[]>;     // string
type MixElement = ElementOf<(string | number)[]>;  // string | number

// 数组的 as const 断言
const directions = ["up", "down", "left", "right"] as const;
// 类型为 readonly ["up", "down", "left", "right"]（元组类型，不是 string[]）

type Direction = typeof directions[number];
// "up" | "down" | "left" | "right"
```

### 与 Array\&lt;T\> 的使用建议

| 场景 | 推荐写法 | 原因 |
|------|---------|------|
| 简单类型 | `number[]`、`string[]` | 更简洁 |
| 联合类型 | `(A \| B)[]` 或 `Array<A \| B>` | 两种都可，Array 省去括号 |
| 嵌套数组 | `number[][]` 或 `Array<number[]>` | 层级少时 `[][]` 更直观 |
| 只读数组 | `readonly number[]` | 比 `ReadonlyArray<number>` 简洁 |
| 泛型代码 | `Array<T>` | 和其他泛型风格一致 |

### 适用场景

- **日常开发：** 绝大多数数组声明用 `T[]` 简写即可
- **函数签名：** 参数和返回值的数组类型注解
- **接口属性：** 接口中的数组属性定义
- **类型别名：** 定义数组相关的类型别名

### 常见问题

#### 联合类型数组的括号问题

`string | number[]` 和 `(string | number)[]` 含义完全不同，容易写错。

```typescript
// string | number[] 表示：string 或者 number数组（两者之一）
let a: string | number[] = "hello";  // 合法
let b: string | number[] = [1, 2];   // 合法

// (string | number)[] 表示：元素是 string 或 number 的数组
let c: (string | number)[] = [1, "two", 3];  // 合法
// let d: (string | number)[] = "hello";       // 编译错误：不是数组

// 用 Array<T> 可以避免这个歧义
let e: Array<string | number> = [1, "two"];  // 不需要括号
```

### 注意事项

- `T[]` 和 `Array<T>` 完全等价，不要在同一个项目中混用两种风格
- 联合类型数组必须加括号：`(A | B)[]`，否则含义不同
- `readonly T[]` 是 TypeScript 3.4+ 的语法，等价于 `ReadonlyArray<T>`
- 数组类型检查只在编译期生效，运行时 TypeScript 不会阻止向数组中推入错误类型的值

### 总结

`T[]` 是 TypeScript 数组类型的简写语法，和 `Array<T>` 完全等价。简单类型用 `number[]` 更简洁，联合类型用 `(A | B)[]` 需注意括号，复杂泛型场景用 `Array<T>` 更清晰。`readonly T[]` 可以声明只读数组。两种写法在编译和运行时没有任何区别，选择哪种是团队代码风格的约定。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## [T, U]元组类型与固定长度

### 概念定义

元组（Tuple）是 TypeScript 特有的类型，JavaScript 中没有对应的原始类型。元组本质上是一个固定长度、每个位置有确定类型的数组。普通数组 `T[]` 中所有元素类型相同且长度不固定，而元组 `[T, U]` 中每个位置的元素类型可以不同，并且长度在编译期就确定了。

元组在 TypeScript 中的内部实现就是一个带有特殊索引签名的数组类型。编译后的 JavaScript 代码中，元组就是普通的数组，类型信息在运行时不存在。

### 语法与用法

```typescript
// 基本元组定义：[类型1, 类型2, ...]
let pair: [string, number] = ["张三", 25];

// 每个位置的类型独立
let record: [number, string, boolean] = [1, "active", true];

// 访问元素时获得精确类型
let name: string = pair[0];    // 类型是 string
let age: number = pair[1];     // 类型是 number

// 解构赋值也有精确类型
let [userName, userAge] = pair;
// userName: string, userAge: number
```

#### 元组的长度属性

```typescript
// 元组有精确的 length 类型
let tuple: [string, number, boolean] = ["a", 1, true];

// tuple.length 的类型是 3（字面量类型），不是 number
let len: 3 = tuple.length;

// 越界访问在编译期报错
// let fourth = tuple[3];  // 编译错误：索引 3 超出元组范围
```

### 基本示例

```typescript
// 函数返回多个值时，元组比对象更轻量
function getNameAndAge(): [string, number] {
    return ["张三", 25];
}

// 解构接收返回值
const [name, age] = getNameAndAge();
console.log(name);  // "张三"（类型是 string）
console.log(age);   // 25（类型是 number）

// React 的 useState 返回值就是一个元组
// const [count, setCount] = useState(0);
// 类型是 [number, Dispatch<SetStateAction<number>>]

// 元组作为函数参数
function setCoordinate(point: [number, number]): void {
    const [x, y] = point;
    console.log(`坐标: (${x}, ${y})`);
}

setCoordinate([10, 20]);
// setCoordinate([10]);        // 编译错误：缺少第二个元素
// setCoordinate([10, 20, 30]); // 编译错误：多出元素

// 命名元组（TypeScript 4.0+，提高可读性）
type Point = [x: number, y: number];
type Range = [start: number, end: number];

let point: Point = [100, 200];
let range: Range = [0, 100];
// 命名不影响类型检查，只是文档提示作用
```

### 进阶用法

```typescript
// 元组类型在泛型中的应用
function swap<A, B>(tuple: [A, B]): [B, A] {
    return [tuple[1], tuple[0]];
}

let swapped = swap(["hello", 42]);  // [number, string]
console.log(swapped);  // [42, "hello"]

// 元组的展开类型
type Concat<A extends unknown[], B extends unknown[]> = [...A, ...B];
type Result = Concat<[string, number], [boolean]>;
// Result = [string, number, boolean]

// 元组转联合类型
type TupleToUnion<T extends unknown[]> = T[number];
type Union = TupleToUnion<[string, number, boolean]>;
// Union = string | number | boolean

// 固定长度的参数列表
type EventHandler = [eventName: string, callback: () => void, once: boolean];

function bindEvent(...args: EventHandler): void {
    const [eventName, callback, once] = args;
    console.log(`绑定事件 ${eventName}, 一次性: ${once}`);
}

bindEvent("click", () => console.log("clicked"), false);
```

### 与数组的对比

| 对比维度 | 元组 [T, U] | 数组 T[] |
|----------|------------|---------|
| 长度 | 固定，编译期确定 | 不固定 |
| 元素类型 | 每个位置可以不同 | 所有元素类型相同 |
| length 类型 | 字面量数字（如 2, 3） | number |
| 越界访问 | 编译期报错 | 不报错（返回 T） |
| 典型用途 | 函数多返回值、坐标对 | 列表、集合 |

### 适用场景

- **函数返回多个值：** 用元组替代对象，更轻量（如 React useState）
- **固定结构的数据：** 坐标 `[x, y]`、颜色 `[r, g, b, a]`、范围 `[start, end]`
- **CSV 行解析：** 每一行的字段有固定顺序和类型
- **类型安全的参数列表：** 用元组约束函数参数的数量和类型

### 常见问题

#### 元组和数组在赋值时的兼容性

元组可以赋值给数组（宽化），但数组不能赋值给元组（窄化需要断言）。

```typescript
let tuple: [string, number] = ["hello", 42];
let arr: (string | number)[] = tuple;  // 合法：元组赋值给数组

let arr2: (string | number)[] = ["hello", 42];
// let tuple2: [string, number] = arr2;  // 编译错误：数组不能赋值给元组
let tuple2 = arr2 as [string, number];   // 类型断言可以绕过
```

#### 元组的 push 陷阱

TypeScript 不会阻止对元组调用 push，这是一个已知的类型系统限制。

```typescript
let tuple: [string, number] = ["hello", 42];
tuple.push("extra");  // 不报错！但破坏了元组的固定长度语义
console.log(tuple);   // ["hello", 42, "extra"]
console.log(tuple.length);  // 运行时是 3，但类型仍然是 2
```

### 注意事项

- 元组编译后就是普通数组，类型检查只在编译期有效
- TypeScript 不会阻止对元组使用 push/pop 等变异方法，如果需要真正的不可变元组，用 `readonly [T, U]`
- 命名元组（TypeScript 4.0+）的名字只是文档提示，不影响类型兼容性
- 元组的越界访问在编译期报错，但运行时不会

### 总结

元组 `[T, U]` 是 TypeScript 中固定长度、每个位置有确定类型的特殊数组类型。它的 length 属性是字面量数字类型，越界访问会在编译期报错。常见用途包括函数返回多个值（如 React useState）、坐标/颜色等固定结构数据。元组可以赋值给数组但反过来不行。注意 TypeScript 不阻止对元组调用 push 等方法，需要不可变性时用 readonly 元组。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 元组的可选元素与剩余元素

### 概念定义

TypeScript 的元组不仅支持固定长度的基本形式，还支持可选元素和剩余元素两种扩展语法。可选元素用 `?` 标记，表示该位置的元素可以不存在；剩余元素用 `...T[]` 表示，允许元组末尾有任意数量的同类型元素。

这两种语法让元组从"严格固定长度"变成了"弹性长度"，在描述函数参数列表、变长数据结构时特别有用。可选元素从 TypeScript 3.0 开始支持，剩余元素从 TypeScript 3.0 开始支持并在 4.0 中增强为可变元组类型。

### 语法与用法

#### 可选元素

```typescript
// 用 ? 标记可选位置
type Point2D = [number, number];
type Point3D = [number, number, number?];  // 第三个元素可选

let p1: Point3D = [10, 20];       // 合法，z 省略
let p2: Point3D = [10, 20, 30];   // 合法，z 存在

// length 类型变为联合：2 | 3
let len: 2 | 3 = p1.length;

// 可选元素的类型包含 undefined
let z: number | undefined = p2[2];  // 即使赋了值，类型也是 number | undefined

// 多个可选元素（可选元素必须在必选元素之后）
type Record = [string, number?, boolean?];
let r1: Record = ["name"];
let r2: Record = ["name", 25];
let r3: Record = ["name", 25, true];
```

#### 剩余元素

```typescript
// 用 ...T[] 标记剩余元素
type StringAndNumbers = [string, ...number[]];

let a: StringAndNumbers = ["hello"];              // 合法
let b: StringAndNumbers = ["hello", 1, 2, 3];    // 合法
let c: StringAndNumbers = ["hello", 1, 2, 3, 4, 5]; // 合法

// 第一个元素是 string，后面可以跟任意多个 number
// a[0] 的类型是 string
// a[1] 及之后的类型是 number

// 剩余元素在中间位置（TypeScript 4.0+ 可变元组）
type Sandwich = [string, ...number[], string];
let s: Sandwich = ["start", 1, 2, 3, "end"];  // 合法

// 剩余元素在开头
type EndWithBool = [...string[], boolean];
let e: EndWithBool = ["a", "b", true];  // 合法
```

### 基本示例

```typescript
// 实际场景：描述函数参数
// console.log 的参数就是一个带剩余元素的元组结构
function myLog(level: string, ...messages: string[]): void {
    console.log(`[${level}]`, ...messages);
}
myLog("INFO", "用户登录", "来自北京");
myLog("ERROR", "连接超时");

// 用元组类型描述上面函数的参数类型
type LogArgs = [level: string, ...messages: string[]];

// 可选元素场景：HTTP 请求配置
type FetchArgs = [url: string, method?: string, body?: string];

function request(...args: FetchArgs): void {
    const [url, method = "GET", body] = args;
    console.log(`${method} ${url}`);
    if (body) console.log(`Body: ${body}`);
}

request("/api/users");                        // 只传 url
request("/api/users", "POST");                // 传 url 和 method
request("/api/users", "POST", '{"name":"x"}'); // 全部传
```

### 进阶用法

```typescript
// 可变元组类型（TypeScript 4.0+）
// 用泛型表示不确定的元组部分
type Prepend<T, U extends unknown[]> = [T, ...U];

type WithId = Prepend<number, [string, boolean]>;
// WithId = [number, string, boolean]

// 函数参数的类型安全拼接
function concat<A extends unknown[], B extends unknown[]>(
    a: [...A],
    b: [...B]
): [...A, ...B] {
    return [...a, ...b];
}

let result = concat([1, "hello"], [true, 42]);
// result 的类型：[number, string, boolean, number]

// 用可变元组实现类型安全的 bind
type BindFirst<F extends (...args: any[]) => any> =
    F extends (first: infer A, ...rest: infer R) => infer Ret
        ? (...args: R) => Ret
        : never;

function add(a: number, b: number): number {
    return a + b;
}

type AddWithFirst = BindFirst<typeof add>;
// (...args: [b: number]) => number
```

### 可选元素与剩余元素的规则

| 规则 | 说明 |
|------|------|
| 可选元素位置 | 必须在所有必选元素之后 |
| 剩余元素位置 | TypeScript 4.0+ 可以在任意位置（开头、中间、末尾） |
| 可选 + 剩余 | 可选元素必须在剩余元素之前 |
| 多个剩余元素 | 一个元组中只能有一个剩余元素 |
| length 类型 | 有可选元素时是联合字面量，有剩余元素时是 number |

### 适用场景

- **函数参数描述：** 用带剩余元素的元组描述可变参数函数的参数类型
- **事件系统参数：** 不同事件有不同数量和类型的参数
- **数据格式解析：** CSV 行的前几列固定、后续列可变
- **API 参数组合：** 必选参数在前、可选参数在后的参数列表

### 常见问题

#### 可选元素和 undefined 的区别

可选元素 `T?` 表示该位置可以不存在（元组长度变短），而 `T | undefined` 表示该位置必须存在但值可以是 undefined。

```typescript
type A = [string, number?];          // 长度 1 或 2
type B = [string, number | undefined]; // 长度固定为 2

let a: A = ["hello"];        // 合法，第二个元素不存在
let b: B = ["hello", undefined]; // 必须显式传 undefined
// let b2: B = ["hello"];    // 编译错误：缺少第二个元素
```

#### 剩余元素放在中间时的推断

TypeScript 4.0+ 支持中间位置的剩余元素，但推断规则是贪婪匹配的——剩余部分会尽可能多地匹配元素。

```typescript
type Mid = [string, ...number[], boolean];

let m1: Mid = ["a", true];           // 剩余部分匹配 0 个 number
let m2: Mid = ["a", 1, 2, 3, true];  // 剩余部分匹配 3 个 number
```

### 注意事项

- 可选元素只能出现在必选元素之后，不能交叉排列
- 带有剩余元素的元组，length 属性类型是 number（不再是字面量数字）
- 可变元组类型（TypeScript 4.0+）在泛型函数中非常强大，但可读性可能下降
- 元组的可选和剩余特性只在编译期有效，运行时就是普通数组

### 总结

元组的可选元素 `?` 允许某些位置的元素不存在，使元组长度弹性化。剩余元素 `...T[]` 允许末尾（TypeScript 4.0+ 后可在任意位置）有任意数量的同类型元素。两者结合让元组能描述更复杂的数据结构，特别适合函数参数列表的类型描述。可选元素和 `T | undefined` 语义不同：前者允许长度变化，后者要求位置存在。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## readonly数组与元组的不可变性

### 概念定义

TypeScript 提供了 readonly 修饰符来创建不可变的数组和元组类型。标记为 readonly 后，所有会修改数组内容的方法（push、pop、splice、sort 等）都会在编译期被禁止调用，索引赋值也不被允许。

readonly 数组有三种等价写法：`readonly T[]`、`ReadonlyArray<T>`、`Readonly<T[]>`。readonly 元组的写法是 `readonly [T, U]`。这些都是编译期约束，运行时仍然是普通的 JavaScript 数组，没有真正的冻结效果。

### 语法与用法

```typescript
// readonly 数组的三种写法（完全等价）
let a: readonly number[] = [1, 2, 3];
let b: ReadonlyArray<number> = [1, 2, 3];
let c: Readonly<number[]> = [1, 2, 3];

// readonly 元组
let point: readonly [number, number] = [10, 20];

// 所有变异操作被禁止
// a.push(4);       // 编译错误：readonly 数组没有 push 方法
// a.pop();         // 编译错误
// a[0] = 10;       // 编译错误：索引签名只读
// a.sort();        // 编译错误：sort 会修改原数组
// a.splice(0, 1);  // 编译错误

// 非变异操作仍然可用
let first = a[0];          // 读取合法
let len = a.length;         // 获取长度合法
let mapped = a.map(x => x * 2);  // map 返回新数组，不修改原数组，合法
let filtered = a.filter(x => x > 1);  // 合法
let found = a.find(x => x === 2);     // 合法
let sliced = a.slice(0, 2);           // 合法
```

### 基本示例

```typescript
// 函数参数用 readonly 防止内部修改传入的数组
function sum(numbers: readonly number[]): number {
    // numbers.sort();  // 编译错误：不能修改 readonly 数组
    return numbers.reduce((acc, n) => acc + n, 0);
}

const data = [10, 20, 30];
console.log(sum(data));  // 60
// data 没有被修改，因为函数签名保证了不变性

// as const 创建深层只读元组
const colors = ["red", "green", "blue"] as const;
// 类型是 readonly ["red", "green", "blue"]
// 每个元素都是字面量类型，不是 string

// colors.push("yellow");  // 编译错误
// colors[0] = "pink";     // 编译错误

// 从 as const 数组提取联合类型
type Color = typeof colors[number];  // "red" | "green" | "blue"

// readonly 元组在函数返回值中的使用
function getConfig(): readonly [string, number] {
    return ["localhost", 3000];
}

const config = getConfig();
// config[0] = "remote";  // 编译错误：readonly 元组不可修改
```

### 进阶用法

```typescript
// 普通数组可以赋值给 readonly 数组（协变）
let mutable: number[] = [1, 2, 3];
let immutable: readonly number[] = mutable;  // 合法

// readonly 数组不能赋值给普通数组（反过来不行）
// let back: number[] = immutable;  // 编译错误

// 实际场景：配置对象中的只读数组属性
interface AppConfig {
    readonly allowedOrigins: readonly string[];
    readonly ports: readonly number[];
}

const config: AppConfig = {
    allowedOrigins: ["https://example.com", "https://api.example.com"],
    ports: [80, 443, 8080],
};

// config.allowedOrigins.push("https://evil.com");  // 编译错误
// config.ports[0] = 9999;                          // 编译错误

// 深层只读的递归类型
type DeepReadonly<T> = {
    readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

interface NestedData {
    items: { name: string; tags: string[] }[];
}

type ReadonlyNested = DeepReadonly<NestedData>;
// items 是 readonly 数组，每个元素的 tags 也是 readonly 数组
```

### readonly 数组的方法可用性

| 方法 | 普通数组 | readonly 数组 | 说明 |
|------|---------|--------------|------|
| push / pop | 可用 | 不可用 | 修改数组长度 |
| shift / unshift | 可用 | 不可用 | 修改数组长度 |
| splice | 可用 | 不可用 | 修改数组内容 |
| sort / reverse | 可用 | 不可用 | 原地修改顺序 |
| fill / copyWithin | 可用 | 不可用 | 原地修改内容 |
| 索引赋值 arr[i] = x | 可用 | 不可用 | 修改特定位置 |
| map / filter / slice | 可用 | 可用 | 返回新数组，不修改原数组 |
| find / findIndex | 可用 | 可用 | 只读操作 |
| reduce / forEach | 可用 | 可用 | 只读遍历 |
| includes / indexOf | 可用 | 可用 | 只读查找 |
| concat | 可用 | 可用 | 返回新数组 |

### 适用场景

- **函数参数保护：** 用 readonly 参数声明确保函数内部不会修改传入的数组
- **配置数据：** 应用配置、路由表等不应被运行时修改的数据
- **as const 常量：** 从常量数组提取联合类型时，as const 自动产生 readonly 元组
- **Redux/Vuex 状态：** 状态管理中的状态应该是不可变的，readonly 提供编译期保障

### 常见问题

#### readonly 是编译期还是运行时的

纯编译期。readonly 修饰符在编译后完全消失，运行时的数组仍然是普通的可变数组。如果需要运行时冻结，使用 `Object.freeze()`。

```typescript
const arr: readonly number[] = [1, 2, 3];
// 编译后就是普通数组，运行时仍然可以通过 any 或 JS 代码修改

// 运行时冻结
const frozen = Object.freeze([1, 2, 3]);
// frozen.push(4);  // 运行时 TypeError
// TypeScript 也会推断为 readonly number[]
```

#### 为什么普通数组可以赋值给 readonly 数组

这是类型系统的协变规则：可变数组比只读数组"能力更强"（既能读又能写），所以可以安全地赋值给只读数组（只需要读的能力）。反过来不行，因为只读数组不保证能写入。

### 注意事项

- readonly 数组和普通数组在运行时完全一样，readonly 只是编译期保护
- 普通数组可以赋值给 readonly 数组，反过来不行
- `as const` 会让数组变成 readonly 元组，每个元素都是字面量类型
- readonly 不是深层递归的，嵌套对象的属性不会自动变成 readonly
- `Object.freeze()` 既提供编译期只读推断，也提供运行时冻结，但也只是浅层冻结

### 总结

readonly 数组和元组是 TypeScript 的编译期不可变类型，禁止调用 push、pop、sort 等变异方法和索引赋值。三种等价写法：`readonly T[]`、`ReadonlyArray<T>`、`Readonly<T[]>`。普通数组可以赋值给 readonly 数组，反过来不行。`as const` 会自动产生 readonly 元组和字面量类型。readonly 只在编译期生效，运行时需要 `Object.freeze()` 配合。常用于函数参数保护、配置数据和状态管理的不可变性保障。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## object类型的属性结构与索引签名

### 概念定义

在 TypeScript 中，对象类型不仅可以通过 interface 或 type 定义具体的属性名和类型，还可以通过索引签名来描述"动态键名"的对象结构。索引签名定义了对象中所有用特定类型的键访问时，值应该是什么类型。

TypeScript 支持两种索引签名：字符串索引签名 `[key: string]: T` 和数字索引签名 `[key: number]: T`。两者可以同时存在，但数字索引签名的值类型必须是字符串索引签名值类型的子类型，因为 JavaScript 在访问数字索引时会先将数字转为字符串。

### 语法与用法

```typescript
// 具名属性：每个属性有明确的名字和类型
type User = {
    name: string;
    age: number;
    email: string;
};

// 索引签名：描述动态键名
type StringMap = {
    [key: string]: string;  // 任意字符串键，值为 string
};

// 具名属性 + 索引签名混合
type Config = {
    version: number;             // 固定属性
    [key: string]: string | number;  // 动态属性（值类型必须兼容 version 的类型）
};
```

### 基本示例

```typescript
// 定义一个翻译字典
type Dictionary = {
    [word: string]: string;
};

const enToZh: Dictionary = {
    hello: "你好",
    world: "世界",
    typescript: "类型脚本",
};

// 动态添加属性
enToZh["react"] = "反应";

// 访问不存在的键返回 string 类型（编译器不会报错）
let val: string = enToZh["nonexistent"];  // 运行时是 undefined，但类型是 string

// 对象字面量类型：直接描述对象的形状
function printUser(user: { name: string; age: number }): void {
    console.log(`${user.name}, ${user.age}岁`);
}

printUser({ name: "张三", age: 25 });
// printUser({ name: "张三", age: 25, email: "x@x.com" });
// 直接传字面量时会触发多余属性检查，报错

// 绕过多余属性检查：先赋值给变量
const data = { name: "张三", age: 25, email: "x@x.com" };
printUser(data);  // 合法，通过变量传递不做多余属性检查

// 可选属性
type Profile = {
    name: string;
    bio?: string;      // 可选
    avatar?: string;   // 可选
};

const profile: Profile = { name: "张三" };  // bio 和 avatar 可以不写
```

### 进阶用法

```typescript
// 混合固定属性和索引签名
// 固定属性的类型必须是索引签名值类型的子类型
type CSSStyles = {
    display: string;
    position: string;
    [prop: string]: string;  // 所有属性值必须是 string
};

const styles: CSSStyles = {
    display: "flex",
    position: "relative",
    color: "red",          // 动态属性
    fontSize: "16px",      // 动态属性
};

// Record 工具类型：索引签名的泛型简写
type UserRoles = Record<string, string[]>;
// 等价于 { [key: string]: string[] }

const roles: UserRoles = {
    admin: ["read", "write", "delete"],
    viewer: ["read"],
};

// 只读对象属性
type Immutable = {
    readonly id: number;
    readonly name: string;
};

const obj: Immutable = { id: 1, name: "张三" };
// obj.id = 2;  // 编译错误：readonly 属性不可修改

// 属性修饰符组合
type ComplexType = {
    readonly id: number;       // 只读必选
    name: string;              // 可写必选
    bio?: string;              // 可写可选
    readonly tag?: string;     // 只读可选
};
```

### 属性修饰符对比

| 修饰符 | 语法 | 说明 |
|--------|------|------|
| 必选 | `name: string` | 属性必须存在 |
| 可选 | `name?: string` | 属性可以不存在 |
| 只读 | `readonly name: string` | 属性不可修改 |
| 只读可选 | `readonly name?: string` | 属性可不存在且不可修改 |

### 适用场景

- **字典/映射结构：** 键不确定的对象，用索引签名描述
- **API 响应体：** 部分字段已知、部分字段动态的 JSON 对象
- **CSS 样式对象：** 键名是 CSS 属性名，值是字符串
- **配置对象：** 混合已知配置项和自定义扩展项

### 常见问题

#### 索引签名访问不存在的键不报错

索引签名默认假设任何键都存在且有值，编译器不会在访问不存在的键时报错。开启 `noUncheckedIndexedAccess`（TypeScript 4.1+）后，索引签名访问的返回类型会自动加上 `| undefined`。

```typescript
type Dict = { [key: string]: number };
const dict: Dict = { a: 1 };

// 默认行为：dict["nonexistent"] 类型是 number（不含 undefined）
// 开启 noUncheckedIndexedAccess 后：类型是 number | undefined

// 推荐开启该选项以获得更安全的类型检查
```

#### 固定属性和索引签名的类型冲突

固定属性的类型必须是索引签名值类型的子类型，否则报错。

```typescript
// 编译错误：number 不是 string 的子类型
// type Bad = {
//     count: number;           // number
//     [key: string]: string;   // 要求所有值是 string
// };

// 正确：让索引签名的值类型包含 number
type Good = {
    count: number;
    [key: string]: string | number;  // 包含 number
};
```

### 注意事项

- 对象字面量直接传参时会触发多余属性检查，通过中间变量传递则不会
- 索引签名中的键名（如 `key`）只是标签，不影响类型行为
- 数字索引签名和字符串索引签名可以共存，但数字索引的值类型必须兼容字符串索引的值类型
- `Record<K, V>` 是索引签名的简洁替代，推荐优先使用
- readonly 修饰符只在编译期生效，运行时对象属性仍然可以通过 JS 代码修改

### 总结

TypeScript 的对象类型通过具名属性描述固定结构，通过索引签名描述动态键名的结构。属性支持可选（`?`）和只读（`readonly`）修饰符。索引签名分为字符串索引和数字索引两种，固定属性的类型必须兼容索引签名的值类型。对象字面量直接传参有多余属性检查，通过变量传递则不会。推荐开启 `noUncheckedIndexedAccess` 提高索引访问的类型安全性。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## {[key: string]: T}字符串索引签名

### 概念定义

字符串索引签名 `{ [key: string]: T }` 是 TypeScript 中描述"任意字符串键名对象"的语法。它表示对象可以有任意数量的属性，只要键是字符串类型、值是 T 类型即可。这在描述字典、映射表、配置对象等键名不确定的数据结构时非常有用。

在 JavaScript 中，对象的属性键本质上都是字符串（或 Symbol），所以字符串索引签名实际上覆盖了绝大多数属性访问的情况。TypeScript 5.x 还支持用 `symbol` 或模板字面量类型作为索引签名的键类型。

### 语法与用法

```typescript
// 基本字符串索引签名
type StringMap = {
    [key: string]: number;  // key 只是标签名，可以用任何标识符
};

// 标签名不影响类型，以下完全等价
type Map1 = { [k: string]: number };
type Map2 = { [prop: string]: number };
type Map3 = { [whatever: string]: number };

// 使用示例
const scores: StringMap = {
    math: 95,
    english: 88,
    physics: 92,
};

// 动态访问
const subject = "math";
let score: number = scores[subject];  // 95

// 动态添加
scores["chemistry"] = 90;
```

### 基本示例

```typescript
// 字典类型：键值都是字符串
type Dictionary = {
    [word: string]: string;
};

const translations: Dictionary = {
    hello: "你好",
    goodbye: "再见",
    thanks: "谢谢",
};

// 遍历字典
for (const key in translations) {
    console.log(`${key} -> ${translations[key]}`);
}

// Object.entries 获取键值对
Object.entries(translations).forEach(([key, value]) => {
    console.log(`${key}: ${value}`);
});

// 索引签名配合具名属性
type Theme = {
    name: string;                // 固定属性
    [colorName: string]: string; // 动态颜色属性
};

const darkTheme: Theme = {
    name: "dark",
    primary: "#1a1a2e",
    secondary: "#16213e",
    accent: "#0f3460",
    background: "#0a0a0a",
};

// 固定属性 name 的类型是 string，满足索引签名值类型 string 的要求
```

### 进阶用法

```typescript
// 模板字面量索引签名（TypeScript 4.4+）
// 限制键名必须符合特定模式
type DataAttributes = {
    [key: `data-${string}`]: string;  // 键必须以 data- 开头
};

const attrs: DataAttributes = {
    "data-id": "123",
    "data-name": "widget",
    // "class": "box",  // 编译错误：键名不匹配 data-* 模式
};

// 联合字符串键的索引签名
type EventHandlers = {
    [key: `on${string}`]: (...args: any[]) => void;
};

const handlers: EventHandlers = {
    onClick: () => console.log("clicked"),
    onScroll: () => console.log("scrolled"),
    // "handler": () => {},  // 编译错误：不以 on 开头
};

// Record<string, T> 是字符串索引签名的简写
type ScoreMap = Record<string, number>;
// 完全等价于 { [key: string]: number }

// 用 Record 限制键的范围
type Subject = "math" | "english" | "physics";
type SubjectScores = Record<Subject, number>;

const myScores: SubjectScores = {
    math: 95,
    english: 88,
    physics: 92,
    // chemistry: 80,  // 编译错误：chemistry 不在 Subject 中
};
```

### 与 Record 和 Map 的对比

| 对比维度 | 索引签名 `{[k: string]: T}` | `Record<K, T>` | `Map<K, V>` |
|----------|---------------------------|----------------|-------------|
| 本质 | 类型注解 | 工具类型（编译期） | 运行时数据结构 |
| 键类型 | string / number / symbol | 字符串字面量联合或 string | 任意类型 |
| 键范围 | 不限 | 可限定为联合类型 | 不限 |
| 迭代 | for...in / Object.keys | for...in / Object.keys | for...of / forEach |
| 性能 | 对象属性访问 | 对象属性访问 | 哈希表查找 |
| 适用场景 | 类型描述 | 类型描述（更灵活） | 运行时键值存储 |

### 适用场景

- **国际化翻译表：** 键是语言代码或翻译键，值是翻译文本
- **CSS 样式对象：** 键是 CSS 属性名，值是属性值字符串
- **环境变量：** `process.env` 的类型就是 `{ [key: string]: string | undefined }`
- **表单数据：** 表单字段名不确定时，用字符串索引签名描述

### 常见问题

#### 索引签名访问不存在的键为什么不报错

默认情况下 TypeScript 假设索引签名中的所有键都存在，访问不存在的键不会报编译错误。可以开启 `noUncheckedIndexedAccess` 编译选项让返回类型自动加上 `| undefined`。

```typescript
// tsconfig.json: "noUncheckedIndexedAccess": true

type Dict = { [key: string]: number };
const dict: Dict = { a: 1 };

// 开启后 dict["b"] 的类型是 number | undefined
// 必须做非空检查后才能当 number 使用
const val = dict["b"];
if (val !== undefined) {
    console.log(val.toFixed(2));  // 安全
}
```

#### 具名属性类型和索引签名冲突

具名属性的类型必须是索引签名值类型的子类型。

```typescript
// 错误示例
// type Bad = {
//     count: number;          // number 不是 string 的子类型
//     [key: string]: string;  // 值类型要求 string
// };

// 正确：用联合类型兼容
type Good = {
    count: number;
    name: string;
    [key: string]: string | number;  // 兼容 count 和 name 的类型
};
```

### 注意事项

- 字符串索引签名会覆盖所有字符串键的属性类型，具名属性必须兼容
- 索引签名的键名标签（`key`、`prop` 等）只是文档作用，不影响类型
- TypeScript 4.4+ 支持模板字面量和 symbol 作为索引签名的键类型
- 推荐开启 `noUncheckedIndexedAccess` 获得更安全的索引访问类型检查
- 如果键的范围是已知的有限集合，优先用 `Record<K, T>` 而不是索引签名

### 总结

字符串索引签名 `{ [key: string]: T }` 用于描述键名不确定的对象类型，所有字符串键的值都必须是 T 类型。具名属性可以和索引签名混合使用，但类型必须兼容。TypeScript 4.4+ 支持模板字面量索引签名来限制键名模式。`Record<string, T>` 是其简洁替代。默认情况下访问不存在的键不报错，建议开启 `noUncheckedIndexedAccess` 提高安全性。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## {[key: number]: T}数字索引签名

### 概念定义

数字索引签名 `{ [key: number]: T }` 用于描述以数字作为键的对象结构。最典型的例子就是数组——数组本质上就是一个以数字为索引的对象。自定义类数组对象、矩阵数据结构、稀疏集合等场景也会用到数字索引签名。

需要理解的关键点是：JavaScript 中对象的属性键最终都是字符串。当你用数字 `0` 访问 `obj[0]` 时，JavaScript 引擎会先把 `0` 转成字符串 `"0"` 再做属性查找。因此，如果一个类型同时有数字索引签名和字符串索引签名，数字索引签名的值类型必须是字符串索引签名值类型的子类型。

### 语法与用法

```typescript
// 基本数字索引签名
type NumberIndexed = {
    [index: number]: string;
};

const arr: NumberIndexed = {
    0: "零",
    1: "一",
    2: "二",
};

console.log(arr[0]);   // "零"
console.log(arr[1]);   // "一"

// 类数组对象：数字索引 + length 属性
type ArrayLike<T> = {
    readonly length: number;
    [index: number]: T;
};

const arrayLike: ArrayLike<string> = {
    0: "a",
    1: "b",
    2: "c",
    length: 3,
};
```

### 基本示例

```typescript
// 数字索引签名描述的就是类似数组的访问方式
type Matrix = {
    [row: number]: number[];  // 每行是一个 number 数组
};

const matrix: Matrix = {
    0: [1, 2, 3],
    1: [4, 5, 6],
    2: [7, 8, 9],
};

console.log(matrix[1][2]);  // 6

// NodeList 的类型就使用了数字索引签名
// interface NodeListOf<TNode> {
//     readonly length: number;
//     [index: number]: TNode;
// }

// 自定义类数组：实现 DOM 查询结果类似的结构
type CustomList<T> = {
    readonly length: number;
    [index: number]: T;
    forEach(callback: (item: T, index: number) => void): void;
};

// 实际使用：HTMLCollection、arguments 对象等都是类数组
function example() {
    // arguments 对象就是一个类数组，有数字索引和 length
    // 在 TypeScript 中 arguments 的类型是 IArguments
    // interface IArguments {
    //     [index: number]: any;
    //     length: number;
    //     callee: Function;
    // }
}
```

### 进阶用法

```typescript
// 同时存在数字索引和字符串索引
type MixedIndex = {
    [key: string]: string | number;  // 字符串索引：值是 string | number
    [index: number]: string;          // 数字索引：值必须是 string（string | number 的子类型）
    length: number;                   // 具名属性：类型必须兼容字符串索引
};

// 为什么数字索引的值类型必须是字符串索引值类型的子类型？
// 因为 obj[0] 等价于 obj["0"]，数字键最终都转成字符串
// 如果 obj["0"] 返回 string | number，而 obj[0] 返回 string，
// 这是安全的（string 是 string | number 的子类型）

// 错误示例：
// type BadMixed = {
//     [key: string]: string;   // 字符串索引值是 string
//     [index: number]: number; // 数字索引值是 number，不是 string 的子类型
// };
// 编译错误：数字索引类型 number 不能赋值给字符串索引类型 string

// 用数字索引签名创建稀疏数组类型
type SparseArray<T> = {
    [index: number]: T | undefined;  // 可能有空位
    length: number;
};

const sparse: SparseArray<string> = {
    0: "first",
    5: "sixth",   // 中间有空位
    length: 10,
};
```

### 与字符串索引签名的对比

| 对比维度 | 数字索引 `[key: number]: T` | 字符串索引 `[key: string]: T` |
|----------|---------------------------|------------------------------|
| 键类型 | number | string |
| 实际键类型 | 运行时转为字符串 | 字符串 |
| 典型用途 | 类数组、矩阵 | 字典、映射表 |
| 共存规则 | 值类型必须是字符串索引值类型的子类型 | 无额外限制 |
| 对应数据结构 | Array、NodeList、arguments | 普通对象、Map-like |

### 适用场景

- **类数组对象：** 自定义类数组结构（有 length 和数字索引的对象）
- **矩阵/网格数据：** 行列用数字索引访问
- **DOM 集合：** NodeList、HTMLCollection 等 DOM API 返回的集合
- **稀疏数据：** 只有部分索引有值的数据结构

### 常见问题

#### for...in 遍历数字索引时键变成了字符串

`for...in` 遍历对象属性时，键总是字符串类型。即使定义了数字索引签名，遍历时拿到的键也是字符串。

```typescript
type NumMap = { [key: number]: string };
const map: NumMap = { 0: "a", 1: "b", 2: "c" };

for (const key in map) {
    // key 的类型是 string，不是 number
    console.log(typeof key);  // "string"
    console.log(key);         // "0", "1", "2"
}

// 如果需要数字键，用 Number() 转换
for (const key in map) {
    const numKey = Number(key);
    console.log(map[numKey]);  // "a", "b", "c"
}
```

#### 数组类型和数字索引签名的关系

TypeScript 的 `Array<T>` 接口定义中就包含了数字索引签名。数组就是一个带有数字索引签名、length 属性和各种方法的对象。

```typescript
// Array 接口的简化定义
// interface Array<T> {
//     [index: number]: T;
//     length: number;
//     push(...items: T[]): number;
//     pop(): T | undefined;
//     // ...更多方法
// }
```

### 注意事项

- JavaScript 中数字键最终都转成字符串，数字索引签名本质上是语义约束
- 同时有数字和字符串索引签名时，数字索引的值类型必须是字符串索引值类型的子类型
- `for...in` 遍历时键始终是 string 类型，即使对象只有数字键
- 数字索引签名不限制键必须是连续的整数，稀疏索引也是合法的
- 在现代 TypeScript 中，描述类数组时用 `ArrayLike<T>` 内置类型更方便

### 总结

数字索引签名 `{ [key: number]: T }` 用于描述以数字为键的对象结构，最典型的应用是类数组对象。由于 JavaScript 中数字键最终都转为字符串，当数字索引和字符串索引共存时，数字索引的值类型必须是字符串索引值类型的子类型。实际开发中，描述类数组推荐使用内置的 `ArrayLike<T>` 类型，自定义矩阵或稀疏数据结构时可以直接使用数字索引签名。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 函数类型(参数类型与返回类型)

### 概念定义

TypeScript 中的函数类型由参数类型和返回类型两部分组成。参数类型定义了函数接受什么类型的输入，返回类型定义了函数输出什么类型的值。TypeScript 会对函数的调用做类型检查，确保传入的参数类型正确、返回值的使用方式正确。

函数类型可以用函数声明、函数表达式、箭头函数、类型别名等多种方式定义。TypeScript 也支持对函数类型进行推断——如果返回值类型可以从函数体推断出来，可以省略不写。

### 语法与用法

```typescript
// 函数声明：参数和返回值类型注解
function add(a: number, b: number): number {
    return a + b;
}

// 箭头函数
const multiply = (a: number, b: number): number => a * b;

// 函数类型表达式（用类型别名定义函数签名）
type MathFn = (x: number, y: number) => number;

const subtract: MathFn = (x, y) => x - y;  // 参数类型从 MathFn 推断

// 调用签名写法（用于对象类型中）
type MathFnObj = {
    (x: number, y: number): number;
    description: string;  // 函数还可以有属性
};

// 返回类型推断：不写返回类型时 TS 自动推断
function greet(name: string) {
    return `Hello, ${name}`;  // 推断返回类型为 string
}
```

#### 参数与返回类型对照

| 语法形式 | 参数类型 | 返回类型 | 示例 |
|----------|---------|---------|------|
| 函数声明 | 参数名后 `: Type` | 参数列表后 `: Type` | `function f(a: number): string` |
| 箭头函数 | 同上 | 箭头 `=>` 前 `: Type` | `(a: number): string => ...` |
| 类型别名 | `(参数: Type)` | `=> Type` | `type F = (a: number) => string` |
| 调用签名 | `(参数: Type)` | `: Type` | `{ (a: number): string }` |

### 基本示例

```typescript
// 不同返回类型的函数
function getName(): string {
    return "张三";
}

function getAge(): number {
    return 25;
}

function isActive(): boolean {
    return true;
}

// 返回 void 表示函数不返回有意义的值
function logMessage(msg: string): void {
    console.log(msg);
    // 没有 return 或 return undefined
}

// 返回 never 表示函数永远不会正常返回
function throwError(message: string): never {
    throw new Error(message);
}

function infiniteLoop(): never {
    while (true) {
        // 永远不会退出
    }
}

// 函数作为参数传递
function applyOperation(a: number, b: number, operation: (x: number, y: number) => number): number {
    return operation(a, b);
}

const result = applyOperation(10, 5, (x, y) => x + y);  // 15
const result2 = applyOperation(10, 5, (x, y) => x * y);  // 50
```

### 进阶用法

```typescript
// 泛型函数：参数类型参数化
function identity<T>(value: T): T {
    return value;
}

let str = identity("hello");   // 推断为 string
let num = identity(42);         // 推断为 number

// 异步函数的返回类型
async function fetchData(url: string): Promise<string> {
    const response = await fetch(url);
    return response.text();
}
// 返回类型是 Promise<string>

// 函数类型的兼容性（参数逆变）
type Handler = (event: MouseEvent) => void;

// 参数少的可以赋值给参数多的（函数参数的双变性）
const simpleHandler: Handler = () => {
    console.log("handled");
    // 不使用 event 参数也是合法的
};

// 回调函数类型定义
type Callback<T> = (error: Error | null, result: T | null) => void;

function loadData(callback: Callback<string>): void {
    try {
        const data = "loaded data";
        callback(null, data);
    } catch (err) {
        callback(err as Error, null);
    }
}

loadData((error, result) => {
    if (error) {
        console.error(error.message);
    } else {
        console.log(result);
    }
});
```

### 适用场景

- **API 函数定义：** 明确标注请求参数类型和响应数据类型
- **回调函数约束：** 定义回调的参数和返回值类型，确保调用者传入正确的回调
- **事件处理器：** 约束事件回调的参数类型
- **高阶函数：** 接受函数作为参数或返回函数时，用函数类型确保类型安全

### 常见问题

#### 返回类型应该显式标注还是让 TS 推断

简单函数让 TS 自动推断即可，但公共 API、库的导出函数推荐显式标注返回类型，原因是：防止实现变化时返回类型意外改变，编译报错信息更清晰，IDE 提示更快。

```typescript
// 内部函数：推断即可
const double = (n: number) => n * 2;  // 推断为 number

// 公共 API：建议显式标注
export function parseConfig(raw: string): AppConfig {
    return JSON.parse(raw);
}
```

#### void 和 undefined 作为返回类型的区别

`void` 表示函数不返回有意义的值，调用者不应该使用返回值。`undefined` 表示函数明确返回 undefined。在回调类型中，`() => void` 允许回调返回任何值（返回值被忽略），而 `() => undefined` 要求回调必须返回 undefined。

```typescript
type VoidFn = () => void;
type UndefFn = () => undefined;

// void 回调可以返回任何值（返回值被忽略）
const fn1: VoidFn = () => 42;     // 合法
const fn2: VoidFn = () => "abc";  // 合法

// undefined 回调必须返回 undefined
// const fn3: UndefFn = () => 42;  // 编译错误
const fn4: UndefFn = () => undefined;  // 合法
```

### 注意事项

- 函数参数名在类型别名中只是标签，不要求和实现时的参数名一致
- 返回 void 的函数类型允许实现返回任何值，但调用者不应使用返回值
- never 返回类型表示函数不会正常结束（抛异常或无限循环）
- TypeScript 函数参数默认是双变的（bivariant），开启 `strictFunctionTypes` 后变为逆变
- 异步函数的返回类型自动被包装为 `Promise<T>`

### 总结

TypeScript 函数类型由参数类型和返回类型组成，支持函数声明、箭头函数、类型别名和调用签名等多种定义方式。返回类型可以显式标注也可以由编译器推断，公共 API 建议显式标注。特殊返回类型包括 void（无返回值）和 never（不会正常返回）。函数类型可以作为参数和返回值，是高阶函数和回调机制的类型基础。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 函数的可选参数(?)

### 概念定义

TypeScript 中函数的可选参数通过在参数名后加 `?` 来标记，表示调用时该参数可以不传。不传时参数值为 undefined。可选参数必须放在必选参数之后，不能出现在必选参数前面。

可选参数 `name?: string` 等价于 `name: string | undefined`，但二者有一个关键区别：可选参数允许调用时完全省略该参数，而 `string | undefined` 要求必须传一个参数（即使是 undefined）。

### 语法与用法

```typescript
// 可选参数用 ? 标记
function greet(name: string, greeting?: string): string {
    // greeting 的类型是 string | undefined
    if (greeting) {
        return `${greeting}, ${name}!`;
    }
    return `Hello, ${name}!`;
}

greet("张三");              // "Hello, 张三!"
greet("张三", "你好");      // "你好, 张三!"
// greet();                 // 编译错误：name 是必选参数
```

### 基本示例

```typescript
// 多个可选参数
function createUser(
    name: string,
    age?: number,
    email?: string
): { name: string; age?: number; email?: string } {
    return { name, age, email };
}

createUser("张三");                          // { name: "张三" }
createUser("张三", 25);                      // { name: "张三", age: 25 }
createUser("张三", 25, "zhang@example.com"); // 全部传入

// 可选参数在使用前需要做判断
function formatName(firstName: string, lastName?: string): string {
    if (lastName !== undefined) {
        // 在这个分支中 lastName 被窄化为 string
        return `${lastName} ${firstName}`;
    }
    return firstName;
}

console.log(formatName("三"));          // "三"
console.log(formatName("三", "张"));    // "张 三"

// 回调中的可选参数
function fetchData(
    url: string,
    onSuccess: (data: string) => void,
    onError?: (error: Error) => void   // 错误回调可选
): void {
    try {
        const data = "response data";
        onSuccess(data);
    } catch (err) {
        // 调用可选回调前必须检查是否存在
        if (onError) {
            onError(err as Error);
        }
    }
}

fetchData("/api/data", (data) => console.log(data));
fetchData("/api/data", (data) => console.log(data), (err) => console.error(err));
```

### 进阶用法

```typescript
// 可选参数 vs 默认参数
// 默认参数不需要 ?，未传时使用默认值而非 undefined
function connect(host: string, port: number = 3306): string {
    return `${host}:${port}`;
}

connect("localhost");       // "localhost:3306"（使用默认值）
connect("localhost", 5432); // "localhost:5432"

// 可选参数跳过中间参数的问题
function range(start: number, end?: number, step?: number): number[] {
    // 想只传 start 和 step 而跳过 end？做不到
    // 必须显式传 undefined
    const result: number[] = [];
    const actualEnd = end ?? start;
    const actualStep = step ?? 1;
    for (let i = start === actualEnd ? 0 : start; i < actualEnd; i += actualStep) {
        result.push(i);
    }
    return result;
}

range(10);                    // end 和 step 都省略
range(0, 10);                 // step 省略
range(0, 10, 2);              // 全部传入
range(0, undefined, 2);       // 跳过 end，必须传 undefined

// 解构参数中的可选属性（更优雅的方式）
interface FetchOptions {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    timeout?: number;
}

function request({ url, method = "GET", headers, timeout = 5000 }: FetchOptions): void {
    console.log(`${method} ${url} timeout=${timeout}`);
}

request({ url: "/api/users" });
request({ url: "/api/users", method: "POST", timeout: 10000 });
```

### 可选参数与相关语法的对比

| 语法 | 含义 | 不传时 | 传 undefined 时 |
|------|------|--------|----------------|
| `name?: string` | 可选参数 | 值为 undefined | 值为 undefined |
| `name: string \| undefined` | 必传参数（值可以是 undefined） | 编译错误 | 值为 undefined |
| `name: string = "default"` | 默认参数 | 使用默认值 | 使用默认值 |

### 适用场景

- **配置参数：** 函数有多个可选配置项，不需要每次都传
- **回调函数：** 某些回调是可选的（如错误回调）
- **兼容性 API：** 新增参数用可选参数不会破坏已有调用代码
- **工具函数：** 通用工具函数的扩展参数

### 常见问题

#### 可选参数和默认参数应该用哪个

如果有合理的默认值，用默认参数。如果参数"不存在"和"有值"是两种不同的逻辑分支，用可选参数。默认参数不需要 `?` 标记，TypeScript 自动推断它是可选的。

#### 可选参数必须放在最后吗

是的，可选参数必须在所有必选参数之后。如果需要中间位置的参数可选，改用对象参数（解构写法）。

```typescript
// 不合法：可选参数在必选参数之前
// function bad(a?: string, b: number): void {}  // 编译错误

// 用对象参数解决顺序问题
function flexible(options: { a?: string; b: number }): void {
    console.log(options.a, options.b);
}
flexible({ b: 42 });           // a 省略
flexible({ a: "hello", b: 42 }); // 全部传入
```

### 注意事项

- 可选参数必须在必选参数之后
- 可选参数的类型自动包含 `| undefined`，使用前需要做非空检查
- 默认参数传 undefined 时会使用默认值，但传 null 不会
- 如果可选参数多于 2-3 个，建议改用对象参数（options 模式），可读性更好
- 函数重载中的可选参数行为可能和直接定义的不同，需要注意

### 总结

函数可选参数用 `?` 标记，表示调用时可以不传该参数。不传时值为 undefined，使用前需要做非空检查或提供默认值。可选参数必须放在必选参数之后。和默认参数的区别是：默认参数在不传时使用预设值，可选参数在不传时是 undefined。多个可选参数时建议改用对象参数模式提高可读性。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 函数的默认参数

### 概念定义

TypeScript 函数的默认参数允许在声明函数时为参数指定一个默认值。当调用函数时没有传入该参数，或者显式传入 undefined 时，就会使用这个默认值。默认参数不需要加 `?` 标记，TypeScript 会自动将其视为可选参数。

默认参数的类型由默认值推断，也可以显式标注。如果显式标注的类型和默认值类型不一致，会产生编译错误。

### 语法与用法

```typescript
// 基本默认参数
function greet(name: string, greeting: string = "Hello"): string {
    return `${greeting}, ${name}!`;
}

greet("张三");           // "Hello, 张三!"（使用默认值）
greet("张三", "你好");    // "你好, 张三!"（覆盖默认值）
greet("张三", undefined); // "Hello, 张三!"（传 undefined 触发默认值）

// 默认参数的类型推断
function connect(host: string, port = 3306) {
    // port 的类型推断为 number（从默认值 3306 推断）
    return `${host}:${port}`;
}

// 复杂默认值：表达式、函数调用都可以
function createId(prefix: string = "ID", timestamp: number = Date.now()): string {
    return `${prefix}_${timestamp}`;
}
```

### 基本示例

```typescript
// 对象参数的默认值
interface RequestOptions {
    method: string;
    headers: Record<string, string>;
    timeout: number;
}

// 整个 options 参数有默认值
function request(url: string, options: RequestOptions = {
    method: "GET",
    headers: {},
    timeout: 5000,
}): void {
    console.log(`${options.method} ${url} timeout=${options.timeout}`);
}

request("/api/users");  // 使用默认 options

// 更常见的写法：解构 + 默认值
function fetchData(
    url: string,
    {
        method = "GET",
        headers = {},
        timeout = 5000,
    }: Partial<RequestOptions> = {}
): void {
    console.log(`${method} ${url} timeout=${timeout}`);
}

fetchData("/api/users");                              // 全部使用默认值
fetchData("/api/users", { method: "POST" });          // 覆盖 method
fetchData("/api/users", { timeout: 10000 });          // 覆盖 timeout

// 默认参数可以引用前面的参数
function createRange(start: number, end: number, step: number = end > start ? 1 : -1): number[] {
    const result: number[] = [];
    if (step > 0) {
        for (let i = start; i < end; i += step) result.push(i);
    } else {
        for (let i = start; i > end; i += step) result.push(i);
    }
    return result;
}

console.log(createRange(0, 5));      // [0, 1, 2, 3, 4]（step 默认 1）
console.log(createRange(5, 0));      // [5, 4, 3, 2, 1]（step 默认 -1）
console.log(createRange(0, 10, 2));  // [0, 2, 4, 6, 8]
```

### 与可选参数的对比

| 对比维度 | 默认参数 `= value` | 可选参数 `?` |
|----------|-------------------|-------------|
| 不传时的值 | 使用默认值 | undefined |
| 传 undefined 时 | 使用默认值 | 值为 undefined |
| 传 null 时 | 值为 null（不触发默认值） | 值为 null |
| 位置要求 | 可以在任意位置（但不在末尾时需传 undefined 跳过） | 必须在必选参数之后 |
| 类型推断 | 从默认值推断参数类型 | 类型是 `T \| undefined` |
| `?` 标记 | 不需要 | 需要 |

### 适用场景

- **配置参数：** 有合理默认值的配置项，如超时时间、请求方法、分页大小
- **工厂函数：** 创建对象时提供默认属性值
- **数学/工具函数：** 步长、精度、进制等参数提供常用默认值
- **UI 组件：** 组件的可选属性提供默认渲染行为

### 常见问题

#### 默认参数放在中间位置时如何跳过

默认参数如果不在最后，调用时需要显式传 undefined 来触发默认值。

```typescript
function format(prefix: string = "LOG", message: string, suffix: string = "."): string {
    return `[${prefix}] ${message}${suffix}`;
}

// 跳过 prefix 使用默认值
format(undefined, "系统启动");        // "[LOG] 系统启动."
format(undefined, "系统启动", "!");   // "[LOG] 系统启动!"
format("ERROR", "连接失败");          // "[ERROR] 连接失败."
```

#### null 不会触发默认值

传 null 和传 undefined 的行为不同。只有 undefined（包括不传参）才会触发默认值。

```typescript
function test(value: string | null = "default"): void {
    console.log(value);
}

test();           // "default"
test(undefined);  // "default"
test(null);       // null（不触发默认值）
```

### 注意事项

- 默认参数的默认值表达式在每次调用时求值，不是声明时一次性计算
- 传 null 不触发默认值，只有不传或传 undefined 才触发
- 默认参数不需要加 `?`，TypeScript 自动将其视为可选
- 默认值可以是表达式（包括函数调用），但要注意副作用
- 解构参数配合默认值是处理复杂配置对象的最佳实践

### 总结

函数默认参数用 `= value` 语法为参数提供默认值，不传或传 undefined 时使用默认值。默认参数不需要 `?` 标记，TypeScript 自动推断其为可选。和可选参数的核心区别是：默认参数不传时有具体的值，可选参数不传时是 undefined。传 null 不会触发默认值。复杂配置建议用解构参数配合默认值的模式。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 函数的剩余参数(...rest)

### 概念定义

剩余参数（Rest Parameters）使用 `...` 语法将函数的不定数量参数收集为一个数组。在 TypeScript 中，剩余参数的类型注解是一个数组类型或元组类型，编译器会对传入的每个参数做类型检查。

剩余参数必须是函数参数列表中的最后一个参数。它在运行时是一个真正的数组（不像 `arguments` 那样是类数组对象），可以直接使用数组方法。

### 语法与用法

```typescript
// 基本剩余参数：收集为同类型数组
function sum(...numbers: number[]): number {
    return numbers.reduce((acc, n) => acc + n, 0);
}

sum(1, 2, 3);        // 6
sum(10, 20, 30, 40); // 100
sum();               // 0（空数组）

// 剩余参数前可以有固定参数
function log(level: string, ...messages: string[]): void {
    console.log(`[${level}]`, ...messages);
}

log("INFO", "服务器启动", "端口 3000");
log("ERROR", "连接超时");

// 剩余参数使用元组类型（TypeScript 4.0+）
function createPerson(...args: [name: string, age: number, email?: string]): void {
    const [name, age, email] = args;
    console.log(`${name}, ${age}岁${email ? `, ${email}` : ""}`);
}

createPerson("张三", 25);
createPerson("张三", 25, "zhang@example.com");
```

### 基本示例

```typescript
// 类型安全的事件触发器
type EventMap = {
    click: [x: number, y: number];
    input: [value: string];
    resize: [width: number, height: number];
};

function emit<K extends keyof EventMap>(event: K, ...args: EventMap[K]): void {
    console.log(`触发事件: ${String(event)}`, ...args);
}

emit("click", 100, 200);        // 合法
emit("input", "hello");          // 合法
emit("resize", 1920, 1080);      // 合法
// emit("click", "wrong");       // 编译错误：类型不匹配

// 展开运算符传递剩余参数
function wrapper(...args: [string, number]): void {
    inner(...args);  // 展开传递给另一个函数
}

function inner(name: string, age: number): void {
    console.log(`${name}, ${age}`);
}

wrapper("张三", 25);
```

### 进阶用法

```typescript
// 泛型剩余参数
function applyAll<T extends unknown[]>(
    fn: (...args: T) => void,
    ...args: T
): void {
    fn(...args);
}

function greet(name: string, age: number): void {
    console.log(`${name}, ${age}岁`);
}

applyAll(greet, "张三", 25);  // 类型安全：参数类型从 greet 推断

// 合并多个数组（类型安全版）
function merge<T>(...arrays: T[][]): T[] {
    return arrays.flat();
}

const merged = merge([1, 2], [3, 4], [5, 6]);
// merged: number[] = [1, 2, 3, 4, 5, 6]

// 管道函数（利用剩余参数和泛型）
function pipe<T>(value: T, ...fns: ((arg: T) => T)[]): T {
    return fns.reduce((acc, fn) => fn(acc), value);
}

const result = pipe(
    5,
    (n) => n * 2,    // 10
    (n) => n + 3,    // 13
    (n) => n * n     // 169
);
console.log(result);  // 169
```

### 与 arguments 对象的对比

| 对比维度 | 剩余参数 `...rest` | arguments 对象 |
|----------|-------------------|---------------|
| 类型 | 真正的数组 `T[]` | 类数组对象 IArguments |
| 数组方法 | 直接使用 map/filter 等 | 需要先 Array.from 转换 |
| 箭头函数 | 可用 | 箭头函数没有 arguments |
| TypeScript 类型 | 精确的泛型类型检查 | any 类型，无检查 |
| 选择部分参数 | 和固定参数配合 | 只能通过索引区分 |

### 适用场景

- **可变参数函数：** 参数数量不确定的函数，如 Math.max、console.log 风格的 API
- **事件系统：** 不同事件有不同数量和类型的参数
- **函数包装：** 透传参数给内部函数
- **工具函数：** 合并数组、管道处理等

### 常见问题

#### 剩余参数和展开运算符的区别

剩余参数是"收集"——把多个参数收集为一个数组。展开运算符是"展开"——把一个数组展开为多个参数。两者语法相同（`...`）但方向相反。

```typescript
// 剩余参数：收集
function collect(...items: number[]): number[] {
    return items;
}

// 展开运算符：展开
const nums = [1, 2, 3] as const;
const result = collect(...nums);  // 展开数组作为参数传入
```

### 注意事项

- 剩余参数必须是参数列表中的最后一个
- 剩余参数在运行时是真正的数组，可以直接用数组方法
- 空的剩余参数是一个空数组 `[]`，不是 undefined
- 元组类型的剩余参数（TypeScript 4.0+）可以精确控制每个位置的类型
- 在泛型函数中，剩余参数配合展开运算符可以实现类型安全的参数透传

### 总结

剩余参数 `...rest` 用 `...` 将不定数量的参数收集为数组，类型注解为数组类型或元组类型。它必须是最后一个参数，运行时是真正的数组。TypeScript 4.0+ 支持元组类型的剩余参数实现精确的位置类型控制。配合泛型可以实现类型安全的参数透传和事件系统。相比 arguments 对象，剩余参数有精确的类型检查、是真正的数组、在箭头函数中可用。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 函数的this参数声明

### 概念定义

TypeScript 允许在函数参数列表的第一个位置声明一个特殊的 `this` 参数，用来指定函数体内 `this` 的类型。这个 `this` 参数是一个"假参数"——它不占实际的参数位置，调用时不需要传值，编译后会被完全移除。

JavaScript 中 `this` 的值取决于函数的调用方式，容易出错。TypeScript 的 this 参数声明让编译器能在编译期检查 `this` 的使用是否正确，避免运行时的 this 指向错误。

### 语法与用法

```typescript
// this 参数必须是第一个参数，类型注解指定 this 的类型
function getFullName(this: { firstName: string; lastName: string }): string {
    // 在函数体内 this 的类型被约束为指定的对象类型
    return `${this.firstName} ${this.lastName}`;
}

// 正确调用：this 指向匹配的对象
const user = {
    firstName: "张",
    lastName: "三",
    getFullName,  // 方法绑定到对象
};
console.log(user.getFullName());  // "张 三"

// 错误调用：直接调用时 this 不匹配
// getFullName();  // 编译错误：void 类型的 this 不能赋值给 { firstName, lastName }
```

### 基本示例

```typescript
// 类方法中的 this 参数
class Counter {
    count = 0;

    // 声明 this 参数确保方法被正确调用
    increment(this: Counter): void {
        this.count++;
    }

    getCount(this: Counter): number {
        return this.count;
    }
}

const counter = new Counter();
counter.increment();
console.log(counter.getCount());  // 1

// 将方法赋值给变量后调用会报错
// const fn = counter.increment;
// fn();  // 编译错误：this 类型不匹配

// 回调场景中的 this 参数
interface UIElement {
    addClickListener(onclick: (this: void, e: Event) => void): void;
}

// this: void 表示回调中不应该使用 this
class Button implements UIElement {
    addClickListener(onclick: (this: void, e: Event) => void): void {
        // 注册点击事件
    }
}

class Handler {
    info = "处理中";

    // 错误：这个方法使用了 this，不能传给 this: void 的回调
    // onClickBad(this: Handler, e: Event): void {
    //     console.log(this.info);
    // }

    // 正确：用箭头函数避免 this 问题
    onClickGood = (e: Event): void => {
        console.log(this.info);  // 箭头函数的 this 在定义时绑定
    };
}
```

### 进阶用法

```typescript
// 接口中的 this 参数
interface EventEmitter {
    on(event: string, callback: (this: void) => void): void;
    emit(event: string): void;
}

// 泛型 this 参数
function bindMethod<T>(obj: T, method: (this: T) => void): () => void {
    return method.bind(obj);
}

const person = {
    name: "张三",
    greet(this: { name: string }): void {
        console.log(`你好，我是${this.name}`);
    },
};

const boundGreet = bindMethod(person, person.greet);
boundGreet();  // "你好，我是张三"

// noImplicitThis 编译选项
// 开启后，函数中使用 this 时如果没有声明 this 参数类型，会报错
// 这迫使开发者显式声明 this 的类型，避免隐式 any

// tsconfig.json:
// {
//   "compilerOptions": {
//     "noImplicitThis": true  // 包含在 strict: true 中
//   }
// }
```

### 适用场景

- **对象方法：** 确保方法只能在正确的对象上调用
- **回调函数：** 用 `this: void` 声明回调不应使用 this
- **事件处理器：** 约束事件处理函数中 this 的类型
- **方法绑定：** 防止方法被赋值给变量后丢失 this 上下文

### 常见问题

#### this 参数和普通参数有什么区别

this 参数只在编译期存在，用于类型检查。编译后会被移除，不影响函数的实际参数数量。

```typescript
// TypeScript 源码
function greet(this: { name: string }, greeting: string): string {
    return `${greeting}, ${this.name}`;
}

// 编译后的 JavaScript（this 参数被移除）
// function greet(greeting) {
//     return greeting + ", " + this.name;
// }

// 调用时只传 greeting，不传 this
const obj = { name: "张三", greet };
obj.greet("你好");  // 只传一个参数
```

#### 箭头函数能声明 this 参数吗

不能。箭头函数没有自己的 this，它的 this 在定义时就绑定了外层作用域的 this。因此箭头函数不能声明 this 参数。

### 注意事项

- this 参数必须是参数列表的第一个位置
- this 参数编译后被移除，不影响运行时
- 箭头函数不能声明 this 参数（箭头函数没有自己的 this）
- 开启 `noImplicitThis`（包含在 `strict: true` 中）可以强制要求显式声明 this 类型
- `this: void` 表示函数不应该使用 this，适用于回调函数声明

### 总结

TypeScript 的 this 参数声明是一个编译期特性，用于约束函数体内 this 的类型。它写在参数列表的第一个位置，调用时不需要传值，编译后被移除。主要用途是确保对象方法被正确调用、回调函数中 this 的使用安全。`this: void` 声明表示函数不应使用 this。开启 `noImplicitThis` 可以强制要求所有使用 this 的函数都声明 this 参数类型。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 函数重载(Overload)的多签名定义

### 概念定义

TypeScript 函数重载允许同一个函数名定义多个不同的调用签名，每个签名对应不同的参数类型和返回类型组合。编译器会根据调用时传入的参数类型自动选择匹配的签名。函数重载由一组重载签名和一个实现签名组成，只有重载签名对外暴露，实现签名对外不可见。

和 Java、C# 不同，TypeScript 的重载不是多个函数体，而是多个类型签名对应一个函数实现。实现体内需要手动判断参数类型来区分不同调用方式的逻辑。

### 语法与用法

```typescript
// 重载签名（对外可见）
function format(value: string): string;
function format(value: number): string;
function format(value: Date): string;

// 实现签名（对外不可见，必须兼容所有重载签名）
function format(value: string | number | Date): string {
    if (typeof value === "string") {
        return value.trim();
    } else if (typeof value === "number") {
        return value.toFixed(2);
    } else {
        return value.toISOString();
    }
}

// 调用时 TypeScript 根据参数类型匹配重载签名
format("  hello  ");    // 返回类型是 string
format(3.14159);         // 返回类型是 string
format(new Date());      // 返回类型是 string
// format(true);          // 编译错误：没有匹配的重载签名
```

### 基本示例

```typescript
// 根据参数类型返回不同类型（重载的核心价值）
function createElement(tag: "div"): HTMLDivElement;
function createElement(tag: "span"): HTMLSpanElement;
function createElement(tag: "input"): HTMLInputElement;
function createElement(tag: string): HTMLElement;
function createElement(tag: string): HTMLElement {
    return document.createElement(tag);
}

// 调用时获得精确的返回类型
const div = createElement("div");      // HTMLDivElement
const span = createElement("span");    // HTMLSpanElement
const input = createElement("input");  // HTMLInputElement
const other = createElement("section"); // HTMLElement

// 参数数量不同的重载
function padding(all: number): string;
function padding(topBottom: number, leftRight: number): string;
function padding(top: number, right: number, bottom: number, left: number): string;
function padding(a: number, b?: number, c?: number, d?: number): string {
    if (b === undefined) {
        return `${a}px`;
    } else if (c === undefined) {
        return `${a}px ${b}px`;
    } else {
        return `${a}px ${b}px ${c}px ${d}px`;
    }
}

padding(10);            // "10px"
padding(10, 20);        // "10px 20px"
padding(10, 20, 10, 20); // "10px 20px 10px 20px"
// padding(10, 20, 30);  // 编译错误：没有 3 个参数的重载
```

### 进阶用法

```typescript
// 方法重载（类中）
class StringOrNumberParser {
    parse(input: string): number;
    parse(input: number): string;
    parse(input: string | number): string | number {
        if (typeof input === "string") {
            return parseInt(input, 10);
        }
        return input.toString();
    }
}

const parser = new StringOrNumberParser();
const num: number = parser.parse("42");    // 返回 number
const str: string = parser.parse(42);       // 返回 string

// 泛型重载
function getValue(key: "name"): string;
function getValue(key: "age"): number;
function getValue(key: "active"): boolean;
function getValue(key: string): string | number | boolean {
    const store: Record<string, string | number | boolean> = {
        name: "张三",
        age: 25,
        active: true,
    };
    return store[key];
}

const name: string = getValue("name");
const age: number = getValue("age");
const active: boolean = getValue("active");
```

### 重载签名的匹配规则

| 规则 | 说明 |
|------|------|
| 匹配顺序 | 从上到下依次匹配，找到第一个匹配的就停止 |
| 实现签名 | 对外不可见，不能直接按实现签名调用 |
| 兼容性 | 实现签名的参数类型必须兼容所有重载签名 |
| 签名数量 | 至少 2 个重载签名 + 1 个实现签名 |
| 具体优先 | 更具体的签名应放在更前面 |

### 适用场景

- **参数类型多态：** 同一个函数根据不同参数类型返回不同类型
- **参数数量多态：** 同一个函数支持不同数量的参数
- **DOM API 模拟：** 根据标签名返回对应的 HTML 元素类型
- **框架类型定义：** .d.ts 声明文件中为库函数提供精确的重载签名

### 常见问题

#### 重载和联合类型该用哪个

如果不同参数类型对应不同的返回类型，用重载。如果参数类型不同但返回类型相同，用联合类型更简洁。

```typescript
// 用重载：不同参数 -> 不同返回类型
function parse(input: string): number;
function parse(input: number): string;
function parse(input: string | number): string | number {
    return typeof input === "string" ? parseInt(input) : input.toString();
}

// 用联合类型：不同参数 -> 相同返回类型
function stringify(value: string | number | boolean): string {
    return String(value);
}
```

#### 为什么不能直接按实现签名调用

实现签名对外不可见，这是 TypeScript 的设计决定。外部调用者只能使用重载签名中定义的参数组合。

```typescript
function test(a: string): void;
function test(a: number): void;
function test(a: string | number): void { }

test("hello");  // 合法：匹配第一个重载
test(42);       // 合法：匹配第二个重载
// test(true);  // 编译错误：boolean 不匹配任何重载签名
```

### 注意事项

- 重载签名从上到下匹配，更具体的签名要放在前面
- 实现签名的参数和返回类型必须兼容所有重载签名
- 实现签名对外不可见，调用者不能绕过重载签名直接使用
- 过多的重载签名会降低代码可读性，超过 3-4 个时考虑用泛型条件类型替代
- 箭头函数和函数表达式不支持直接重载语法，需要用接口或类型别名

### 总结

函数重载允许同一个函数有多个调用签名，TypeScript 根据调用时的参数类型选择匹配的签名。由一组重载签名和一个实现签名组成，实现签名对外不可见。重载的核心价值是"不同参数类型 -> 不同返回类型"的精确类型推断。签名按从上到下的顺序匹配，具体的放前面。如果返回类型相同，直接用联合类型比重载更简洁。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 字面量类型(Literal Types)的精确值

### 概念定义

字面量类型是 TypeScript 类型系统中将具体的值提升为类型的机制。普通的 string 类型可以是任意字符串，而字面量类型 `"hello"` 只能是 `"hello"` 这一个值。TypeScript 支持三种字面量类型：字符串字面量、数字字面量和布尔字面量。

字面量类型本身用处有限，但和联合类型结合后就变得非常强大——可以精确约束变量只能取几个特定值中的某一个，这比枚举更轻量，也是 TypeScript 类型收窄和可辨识联合的基础。

### 语法与用法

```typescript
// 字符串字面量类型
let direction: "up" | "down" | "left" | "right" = "up";
direction = "down";   // 合法
// direction = "north"; // 编译错误：不在联合类型中

// 数字字面量类型
let statusCode: 200 | 201 | 204 | 400 | 404 | 500 = 200;

// 布尔字面量类型
let isTrue: true = true;
// isTrue = false;  // 编译错误：false 不能赋值给 true

// const 声明自动推断为字面量类型
const greeting = "hello";   // 类型是 "hello"，不是 string
const count = 42;            // 类型是 42，不是 number
const flag = true;           // 类型是 true，不是 boolean

// let 声明推断为宽类型
let greeting2 = "hello";    // 类型是 string
let count2 = 42;              // 类型是 number
```

### 基本示例

```typescript
// 用字面量联合类型约束函数参数
type Alignment = "left" | "center" | "right";

function setTextAlign(element: HTMLElement, align: Alignment): void {
    element.style.textAlign = align;
}

// setTextAlign(div, "justify");  // 编译错误：不在 Alignment 中

// 数字字面量类型约束特定值
type DiceRoll = 1 | 2 | 3 | 4 | 5 | 6;

function rollDice(): DiceRoll {
    return (Math.floor(Math.random() * 6) + 1) as DiceRoll;
}

const roll: DiceRoll = rollDice();
// const bad: DiceRoll = 7;  // 编译错误

// 字面量类型在函数返回值中的应用
function getStatus(code: number): "success" | "error" | "unknown" {
    if (code >= 200 && code < 300) return "success";
    if (code >= 400) return "error";
    return "unknown";
}

const status = getStatus(200);  // 类型是 "success" | "error" | "unknown"

// as const 将整个对象的值变为字面量类型
const config = {
    host: "localhost",
    port: 3000,
    debug: true,
} as const;
// config.host 的类型是 "localhost"，不是 string
// config.port 的类型是 3000，不是 number
```

### 进阶用法

```typescript
// 可辨识联合：用字面量类型区分不同形状
type Circle = { kind: "circle"; radius: number };
type Rectangle = { kind: "rectangle"; width: number; height: number };
type Triangle = { kind: "triangle"; base: number; height: number };

type Shape = Circle | Rectangle | Triangle;

function getArea(shape: Shape): number {
    switch (shape.kind) {
        case "circle":
            // shape 被窄化为 Circle
            return Math.PI * shape.radius ** 2;
        case "rectangle":
            // shape 被窄化为 Rectangle
            return shape.width * shape.height;
        case "triangle":
            // shape 被窄化为 Triangle
            return (shape.base * shape.height) / 2;
    }
}

// 模板字面量类型和字面量的结合
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";
type ApiPath = "/users" | "/posts" | "/comments";
type Endpoint = `${HttpMethod} ${ApiPath}`;
// "GET /users" | "GET /posts" | "GET /comments" | "POST /users" | ...（12种组合）

// 从字面量数组提取联合类型
const ROLES = ["admin", "editor", "viewer"] as const;
type Role = typeof ROLES[number];  // "admin" | "editor" | "viewer"
```

### 字面量类型的推断规则

| 声明方式 | 推断结果 | 示例 |
|----------|---------|------|
| `const x = "hello"` | 字面量类型 `"hello"` | 不可重新赋值 |
| `let x = "hello"` | 宽类型 `string` | 可重新赋值 |
| `const obj = { x: "hello" }` | 属性宽类型 `{ x: string }` | 属性可修改 |
| `const obj = { x: "hello" } as const` | 全部字面量 `{ readonly x: "hello" }` | 深层只读 |

### 适用场景

- **状态/模式标识：** 组件状态、加载状态、主题模式等有限值集合
- **可辨识联合：** 用字面量类型的 kind/type 字段区分不同的数据形状
- **API 参数约束：** HTTP 方法、排序方向、对齐方式等参数
- **配置常量：** 用 as const 提取常量数组为联合类型

### 常见问题

#### 为什么对象属性不自动推断为字面量类型

对象属性是可修改的（除非 readonly），所以 TypeScript 推断为宽类型。用 `as const` 可以让整个对象变成深层只读+字面量类型。

```typescript
const obj = { method: "GET" };
// obj.method 的类型是 string，因为 obj.method 可以被重新赋值

const obj2 = { method: "GET" } as const;
// obj2.method 的类型是 "GET"，因为 as const 让属性变成 readonly
```

#### 字面量类型和枚举应该用哪个

字面量联合类型更轻量，不产生运行时代码。枚举有运行时的对象，支持反向映射。一般来说，简单的字符串常量集合用字面量联合类型即可，需要运行时枚举值遍历时用枚举。

### 注意事项

- const 声明的原始值自动推断为字面量类型，let 和 var 推断为宽类型
- 对象属性默认不推断为字面量类型，需要 `as const` 强制
- 字面量类型是对应宽类型的子类型：`"hello"` 是 `string` 的子类型
- 字面量联合类型的成员数量不要太多（几十个以上），否则类型提示和编译速度会下降

### 总结

字面量类型将具体的值（字符串、数字、布尔）提升为类型，配合联合类型可以精确约束变量只能取特定值。const 声明自动推断字面量类型，对象属性需要 `as const` 强制。字面量类型是可辨识联合的基础，也是 TypeScript 类型收窄的关键机制。相比枚举，字面量联合类型更轻量且不产生运行时代码。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 模板字面量类型(Template Literal Types)

### 概念定义

模板字面量类型是 TypeScript 4.1 引入的特性，将 JavaScript 模板字符串的语法搬到了类型层面。它允许在类型定义中使用反引号和 `${}` 插值，将字符串字面量类型进行拼接和组合，生成新的字符串字面量类型。

当插值位置放入联合类型时，模板字面量类型会自动进行笛卡尔积展开——每种组合都会生成一个字面量类型成员。这让开发者能够用声明式的方式生成大量精确的字符串类型，而不需要手动逐一列举。

### 语法与用法

```typescript
// 基本拼接
type Greeting = `Hello, ${string}`;
// 匹配所有以 "Hello, " 开头的字符串

let a: Greeting = "Hello, World";     // 合法
let b: Greeting = "Hello, TypeScript"; // 合法
// let c: Greeting = "Hi, World";     // 编译错误：不以 "Hello, " 开头

// 联合类型的笛卡尔积展开
type Color = "red" | "green" | "blue";
type Size = "small" | "large";
type ColorSize = `${Color}-${Size}`;
// "red-small" | "red-large" | "green-small" | "green-large" | "blue-small" | "blue-large"

// 数字类型插值
type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
type DoubleDigit = `${Digit}${Digit}`;
// "00" | "01" | "02" | ... | "99"（100种组合）
```

### 基本示例

```typescript
// CSS 类名生成
type Breakpoint = "sm" | "md" | "lg" | "xl";
type Property = "margin" | "padding" | "gap";
type Direction = "top" | "right" | "bottom" | "left";

type ResponsiveClass = `${Breakpoint}:${Property}-${Direction}`;
// "sm:margin-top" | "sm:margin-right" | ... 大量组合

// 事件处理器属性名
type EventName = "click" | "focus" | "blur" | "change";
type HandlerName = `on${Capitalize<EventName>}`;
// "onClick" | "onFocus" | "onBlur" | "onChange"

// 配合内置字符串操作类型
type UpperEvent = Uppercase<EventName>;     // "CLICK" | "FOCUS" | "BLUR" | "CHANGE"
type LowerEvent = Lowercase<"CLICK">;       // "click"
type CapEvent = Capitalize<EventName>;      // "Click" | "Focus" | "Blur" | "Change"
type UncapEvent = Uncapitalize<"Click">;    // "click"

// 对象键名转换
type Getters<T> = {
    [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface Person {
    name: string;
    age: number;
}

type PersonGetters = Getters<Person>;
// { getName: () => string; getAge: () => number }
```

### 进阶用法

```typescript
// 模板字面量类型推断（infer 配合模板字面量）
type ExtractRouteParams<T extends string> =
    T extends `${string}:${infer Param}/${infer Rest}`
        ? Param | ExtractRouteParams<`/${Rest}`>
        : T extends `${string}:${infer Param}`
            ? Param
            : never;

type Params = ExtractRouteParams<"/users/:userId/posts/:postId">;
// "userId" | "postId"

// 类型安全的事件系统
type EventMap = {
    click: { x: number; y: number };
    input: { value: string };
    resize: { width: number; height: number };
};

type OnEvent<T extends string> = `on${Capitalize<T>}`;

type EventHandlers = {
    [K in keyof EventMap as OnEvent<string & K>]: (event: EventMap[K]) => void;
};
// {
//   onClick: (event: { x: number; y: number }) => void;
//   onInput: (event: { value: string }) => void;
//   onResize: (event: { width: number; height: number }) => void;
// }

// 深层路径类型（用模板字面量递归生成对象路径）
type PathOf<T, Prefix extends string = ""> = T extends object
    ? {
          [K in keyof T & string]: T[K] extends object
              ? `${Prefix}${K}` | PathOf<T[K], `${Prefix}${K}.`>
              : `${Prefix}${K}`;
      }[keyof T & string]
    : never;

interface Config {
    database: { host: string; port: number };
    server: { listen: string };
}

type ConfigPath = PathOf<Config>;
// "database" | "database.host" | "database.port" | "server" | "server.listen"
```

### 内置字符串操作类型

| 工具类型 | 作用 | 示例 |
|---------|------|------|
| `Uppercase<T>` | 全部转大写 | `Uppercase<"hello">` → `"HELLO"` |
| `Lowercase<T>` | 全部转小写 | `Lowercase<"HELLO">` → `"hello"` |
| `Capitalize<T>` | 首字母大写 | `Capitalize<"hello">` → `"Hello"` |
| `Uncapitalize<T>` | 首字母小写 | `Uncapitalize<"Hello">` → `"hello"` |

### 适用场景

- **事件处理器类型：** 从事件名自动生成 `onClick`、`onFocus` 等属性类型
- **CSS-in-JS：** 生成响应式类名、CSS 变量名等类型
- **路由参数提取：** 从路由路径字符串中提取参数名的类型
- **API 端点类型：** 组合 HTTP 方法和路径生成端点类型

### 常见问题

#### 模板字面量类型展开太多会怎样

联合类型成员有上限（通常约 10 万个），如果笛卡尔积展开后超过限制会报编译错误。避免对成员过多的联合类型做模板拼接。

#### 模板字面量类型和运行时模板字符串的关系

模板字面量类型是纯编译期的类型操作，不产生运行时代码。运行时的模板字符串是 JavaScript 语法。两者语法相似但工作在不同层面。

### 注意事项

- 模板字面量类型在 TypeScript 4.1+ 可用
- 联合类型插值会自动笛卡尔积展开，注意控制组合数量
- `string`、`number`、`boolean`、`bigint` 都可以作为模板插值类型
- 配合 `infer` 可以做字符串模式匹配和参数提取
- 递归模板字面量类型要注意深度限制

### 总结

模板字面量类型将模板字符串语法引入类型层面，通过 `${}` 插值拼接字符串字面量类型。联合类型插值自动笛卡尔积展开。配合 Capitalize 等内置字符串操作类型和 infer 模式匹配，可以实现事件处理器名生成、路由参数提取、对象键名转换等强大的类型编程。注意控制展开后的联合类型成员数量，避免超出编译器限制。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## any类型的类型检查禁用

### 概念定义

any 是 TypeScript 中最宽松的类型，它关闭了该变量上的所有类型检查。any 类型的值可以赋值给任何类型，也可以接收任何类型的赋值；可以访问任意属性、调用任意方法，编译器都不会报错。

any 的存在是为了 TypeScript 和 JavaScript 之间的渐进式迁移——当无法确定类型时，any 作为"逃生舱"让代码先跑起来。但过度使用 any 会让 TypeScript 退化为 JavaScript，失去类型安全的意义。现代 TypeScript 开发中应尽量避免 any，用 unknown 替代。

### 语法与用法

```typescript
// 显式标注 any
let anything: any = 42;
anything = "hello";      // 合法
anything = true;          // 合法
anything = { x: 1 };     // 合法
anything = [1, 2, 3];    // 合法

// any 可以访问任意属性和调用任意方法（不报错）
anything.nonExistent;           // 不报错
anything.method();              // 不报错
anything.deeply.nested.prop;    // 不报错

// any 可以赋值给任何类型（传染性）
let num: number = anything;     // 不报错！类型安全被破坏
let str: string = anything;     // 不报错！
```

### 基本示例

```typescript
// any 出现的常见场景

// 1. 未声明类型且无法推断
// 开启 noImplicitAny 后，以下代码会报错
// function process(data) { }  // data 隐式 any

// 2. JSON.parse 的返回类型就是 any
const data: any = JSON.parse('{"name":"张三"}');
console.log(data.name);  // 不报错，但失去了类型保护

// 3. 第三方库没有类型定义时
// const lib: any = require("untyped-library");

// 4. 类型断言为 any 绕过检查
const input = document.getElementById("input");
const value = (input as any).value;  // 绕过类型检查

// any 的传染性
function getLength(data: any): number {
    return data.length;  // 不报错，但如果 data 没有 length 属性，运行时会出错
}

getLength("hello");  // 5
getLength([1, 2]);   // 2
getLength(42);       // undefined（运行时不报错但结果错误）
```

### 与 unknown 的对比

| 对比维度 | any | unknown |
|----------|-----|---------|
| 接受赋值 | 任何类型都可以赋给 any | 任何类型都可以赋给 unknown |
| 赋值给其他类型 | any 可以赋给任何类型 | unknown 只能赋给 unknown 和 any |
| 属性访问 | 不检查，随便访问 | 必须先窄化类型才能访问 |
| 方法调用 | 不检查，随便调用 | 必须先窄化类型才能调用 |
| 类型安全 | 完全放弃 | 保持安全 |
| 推荐度 | 尽量避免 | 推荐替代 any |

```typescript
// unknown 比 any 安全
let val: unknown = "hello";
// val.toUpperCase();  // 编译错误：unknown 不能访问属性

// 必须先窄化
if (typeof val === "string") {
    val.toUpperCase();  // 合法：窄化为 string
}
```

### 适用场景

- **迁移旧代码：** 将 JavaScript 项目迁移到 TypeScript 时，暂时用 any 标注无法确定的类型
- **第三方库无类型：** 没有 @types 包的第三方库，暂时用 any
- **极端动态逻辑：** 确实需要完全动态的场景（非常少见）

### 常见问题

#### 如何减少项目中的 any

开启 `noImplicitAny`（包含在 `strict: true` 中），禁止隐式 any。用 ESLint 的 `@typescript-eslint/no-explicit-any` 规则警告显式 any。逐步将 any 替换为具体类型或 unknown。

#### any 和 as any 的区别

`any` 是类型注解，`as any` 是类型断言。`as any` 通常用于"双重断言"的中间步骤（`value as any as TargetType`），绕过两个不兼容类型之间的转换检查。两者都会破坏类型安全。

### 注意事项

- any 具有传染性：一旦某个值是 any，所有从它派生的值也是 any
- `noImplicitAny` 编译选项可以阻止隐式 any，推荐始终开启
- JSON.parse 返回 any，建议用 as 断言或 zod 等运行时验证库做类型安全解析
- 在 .d.ts 声明文件中，any 有时是必要的，但在应用代码中应尽量避免
- any 不等于"任意类型"的正确含义——它是"放弃类型检查"，unknown 才是"安全的任意类型"

### 总结

any 类型关闭了 TypeScript 的所有类型检查，允许任意赋值和属性访问。它是 JS 到 TS 迁移的逃生舱，但会让代码失去类型安全保障。any 具有传染性，会扩散到依赖它的其他变量。现代 TypeScript 开发应尽量用 unknown 替代 any，配合 `noImplicitAny` 编译选项和 ESLint 规则控制 any 的使用。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## unknown类型的类型安全顶层类型

### 概念定义

unknown 是 TypeScript 3.0 引入的类型，被称为"类型安全的 any"。和 any 一样，任何类型的值都可以赋给 unknown；但和 any 不同的是，unknown 类型的值在使用前必须先进行类型窄化（如 typeof 检查、instanceof 检查、类型断言等），否则不能访问属性、调用方法或赋值给其他类型。

unknown 是 TypeScript 类型系统中的顶层类型（Top Type），所有类型都是 unknown 的子类型。它和 any 形成对比：any 既是顶层类型也是底层类型（同时兼容所有类型的赋值和被赋值），而 unknown 只是顶层类型（只接受赋值，不能随意使用）。

### 语法与用法

```typescript
// unknown 接受任何类型的赋值
let val: unknown;
val = 42;
val = "hello";
val = true;
val = { x: 1 };
val = [1, 2, 3];
val = null;
val = undefined;

// 但不能直接使用
// val.toString();    // 编译错误
// val.x;             // 编译错误
// val + 1;           // 编译错误

// 必须先窄化类型
if (typeof val === "string") {
    console.log(val.toUpperCase());  // 合法：val 被窄化为 string
}

if (typeof val === "number") {
    console.log(val.toFixed(2));     // 合法：val 被窄化为 number
}
```

### 基本示例

```typescript
// 安全的 JSON 解析
function safeJsonParse(json: string): unknown {
    return JSON.parse(json);  // 返回 unknown 而不是 any
}

const data = safeJsonParse('{"name":"张三","age":25}');

// 使用前必须验证类型
if (
    typeof data === "object" &&
    data !== null &&
    "name" in data &&
    "age" in data
) {
    // data 在这个分支中被窄化
    console.log((data as { name: string; age: number }).name);
}

// 用类型谓词做更优雅的窄化
interface User {
    name: string;
    age: number;
}

function isUser(value: unknown): value is User {
    return (
        typeof value === "object" &&
        value !== null &&
        "name" in value &&
        typeof (value as User).name === "string" &&
        "age" in value &&
        typeof (value as User).age === "number"
    );
}

if (isUser(data)) {
    console.log(data.name);  // 合法：data 被窄化为 User
    console.log(data.age);
}

// 错误处理中的 unknown
function processError(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === "string") {
        return error;
    }
    return "未知错误";
}

// TypeScript 4.0+ catch 子句变量默认可以是 unknown
try {
    throw new Error("出错了");
} catch (err: unknown) {
    // err 是 unknown，必须先判断类型
    const message = processError(err);
    console.log(message);
}
```

### 进阶用法

```typescript
// unknown 在泛型约束中的应用
function safeStringify(value: unknown): string {
    if (typeof value === "string") return value;
    if (typeof value === "number") return value.toString();
    if (typeof value === "boolean") return value.toString();
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

// unknown 配合类型断言
function assertIsString(value: unknown): asserts value is string {
    if (typeof value !== "string") {
        throw new TypeError(`期望 string，收到 ${typeof value}`);
    }
}

let input: unknown = "hello";
assertIsString(input);
// 断言后 input 的类型被窄化为 string
console.log(input.toUpperCase());  // 合法

// Record<string, unknown> 替代 any 对象
function processData(data: Record<string, unknown>): void {
    // 每个属性值都是 unknown，使用前必须检查类型
    if (typeof data.name === "string") {
        console.log(data.name.toUpperCase());
    }
}
```

### unknown 的窄化方式

| 窄化方式 | 语法 | 适用场景 |
|---------|------|---------|
| typeof | `typeof val === "string"` | 原始类型判断 |
| instanceof | `val instanceof Date` | 类实例判断 |
| in 操作符 | `"name" in val` | 对象属性存在检查 |
| 类型谓词 | `function isX(v): v is X` | 自定义类型守卫 |
| 断言函数 | `function assert(v): asserts v is X` | 断言并抛错 |
| 类型断言 | `val as string` | 开发者自行保证（不安全） |

### 适用场景

- **API 响应处理：** 外部数据返回类型不确定时用 unknown 接收，然后验证
- **错误处理：** catch 子句的 error 参数用 unknown，确保安全处理
- **通用工具函数：** 接收任意类型参数但内部做安全处理的函数
- **替代 any：** 所有原本想用 any 的地方，优先考虑 unknown

### 常见问题

#### unknown 和 any 在函数参数中的选择

函数参数用 unknown 代替 any，强制函数内部做类型检查。返回值用 unknown 代替 any，强制调用者做类型检查。两者都比 any 更安全。

#### unknown 类型可以做哪些操作

unknown 值可以做的操作非常有限：赋值给 unknown 或 any、`typeof` 检查、`instanceof` 检查、相等比较（`===`、`!==`、`==`、`!=`）、逻辑运算（`&&`、`||`、`!`）、三元表达式条件位置。其他所有操作都需要先窄化。

### 注意事项

- unknown 是 TypeScript 3.0+ 的特性
- 任何值可以赋给 unknown，但 unknown 只能赋给 unknown 和 any
- 使用 unknown 值前必须窄化，否则编译错误
- `Record<string, unknown>` 是替代 `Record<string, any>` 的安全写法
- TypeScript 4.4+ 的 `useUnknownInCatchVariables` 选项可以让 catch 变量自动为 unknown

### 总结

unknown 是 TypeScript 的类型安全顶层类型，任何值都可以赋给它，但使用前必须进行类型窄化。它是 any 的安全替代品：any 放弃类型检查，unknown 保持类型检查。窄化方式包括 typeof、instanceof、in 操作符、类型谓词和断言函数。所有原本想用 any 的场景都应优先考虑 unknown，配合类型守卫做安全的类型判断。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## void类型的无返回值

### 概念定义

void 类型表示函数没有返回有意义的值。当一个函数执行某个操作（如打印日志、修改 DOM、发送请求）但不需要返回结果时，它的返回类型就是 void。void 函数实际运行时返回的是 undefined，但在类型层面 void 和 undefined 有重要区别。

void 最关键的特性是：当一个函数类型的返回值声明为 void 时，实现该类型的函数可以返回任何值，但调用者不应该使用这个返回值。这种设计让 Array.prototype.forEach 等接受回调的方法能兼容各种回调函数。

### 语法与用法

```typescript
// 函数返回 void
function logMessage(msg: string): void {
    console.log(msg);
    // 没有 return 或 return;（不返回值）
}

// 箭头函数返回 void
const printHello: () => void = () => {
    console.log("Hello");
};

// void 类型的变量只能赋值为 undefined
let v: void = undefined;
// let v2: void = null;      // 编译错误（strictNullChecks 下）
// let v3: void = "hello";   // 编译错误
```

### 基本示例

```typescript
// void 函数的典型场景
function updateTitle(title: string): void {
    document.title = title;
    // 只执行操作，不返回值
}

function addEventListener(event: string, handler: () => void): void {
    // handler 的返回类型是 void
}

// void 回调的特殊兼容性
// 声明为 void 返回的回调类型，实际可以返回任何值
type VoidCallback = () => void;

// 以下都合法，返回值被忽略
const cb1: VoidCallback = () => 42;
const cb2: VoidCallback = () => "hello";
const cb3: VoidCallback = () => true;

// 但调用者不应使用返回值
const result = cb1();  // result 的类型是 void，不能当 number 用
// const num: number = cb1();  // 编译错误：void 不能赋给 number

// 这就是为什么 forEach 的回调可以是有返回值的函数
const numbers = [1, 2, 3];
// Array.forEach 的回调类型是 (value: T) => void
numbers.forEach((n) => n * 2);  // 返回值被忽略，合法
```

### 与 undefined 和 never 的对比

| 对比维度 | void | undefined | never |
|----------|------|-----------|-------|
| 含义 | 没有有意义的返回值 | 值就是 undefined | 永远不会有返回值 |
| 函数返回 | 函数体不返回或 return; | 函数体 return undefined | 函数抛异常或无限循环 |
| 回调兼容性 | 允许回调返回任何值 | 要求回调必须返回 undefined | 不适用 |
| 变量赋值 | 只能赋 undefined | 只能赋 undefined | 不能赋任何值 |

```typescript
// void 函数：不返回有意义的值
function doWork(): void {
    console.log("working");
}

// undefined 函数：明确返回 undefined
function getNothing(): undefined {
    return undefined;  // 必须显式 return undefined
}

// never 函数：永远不会正常返回
function crash(): never {
    throw new Error("崩溃");
}
```

### 适用场景

- **副作用函数：** 只执行操作不返回结果的函数，如日志、DOM 操作、状态修改
- **回调函数类型：** 回调的返回值不重要时声明为 void，如 forEach、addEventListener
- **事件处理器：** 事件回调通常不需要返回值
- **生命周期钩子：** 框架的生命周期方法通常返回 void

### 常见问题

#### void 和 undefined 在函数返回类型中有什么区别

```typescript
// void 返回类型：函数可以不写 return
function a(): void {
    console.log("ok");
    // 不需要 return
}

// undefined 返回类型：必须显式 return undefined
function b(): undefined {
    console.log("ok");
    return undefined;  // 必须写
    // 或者 return;（TypeScript 5.1+ 允许）
}
```

#### 为什么 void 回调可以返回值

这是 TypeScript 的有意设计。如果 void 回调严格禁止返回值，那么 `[1,2,3].forEach(n => n * 2)` 这样的写法就会报错（因为箭头函数的简写形式会返回表达式的值）。void 回调的"返回值被忽略"语义解决了这个问题。

### 注意事项

- void 作为返回类型时，函数体可以不写 return
- void 回调类型允许实现返回任何值，但调用者不应使用返回值
- void 类型的变量只能赋值 undefined（strictNullChecks 下）
- 不要混淆 void（没有返回值）和 never（不可能返回）
- TypeScript 5.1+ 允许 `return;`（无值 return）用于 `(): undefined` 函数

### 总结

void 类型表示函数没有有意义的返回值，是副作用函数的标准返回类型。void 最重要的特性是回调兼容性：声明为 void 返回的回调类型允许实际返回任何值，但调用者不应使用返回值。这让 forEach 等方法能兼容各种回调。void 和 undefined 的区别在于：void 更宽松（不要求显式 return），undefined 更严格（必须返回 undefined）。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## never类型的不可达类型

### 概念定义

never 是 TypeScript 类型系统中的底层类型（Bottom Type），表示永远不会出现的值。没有任何值的类型是 never，它是所有类型的子类型，但没有任何类型是 never 的子类型（除了 never 本身）。

never 出现在两种场景：一是函数永远不会正常返回（抛出异常或无限循环），二是类型收窄后排除了所有可能性的分支。never 在穷尽性检查（exhaustiveness check）中扮演关键角色——如果 switch/if 的所有分支都已处理，剩余的 default 分支中变量类型就是 never。

### 语法与用法

```typescript
// 函数抛出异常：永远不会正常返回
function throwError(message: string): never {
    throw new Error(message);
}

// 无限循环：永远不会退出
function infiniteLoop(): never {
    while (true) {
        // 永不终止
    }
}

// never 类型的变量不能赋任何值
// let impossible: never = 42;  // 编译错误
// let impossible: never = undefined;  // 编译错误

// never 是所有类型的子类型
let n: never = throwError("crash");
let str: string = n;   // 合法：never 可以赋给任何类型
let num: number = n;   // 合法
```

### 基本示例

```typescript
// 穷尽性检查（Exhaustiveness Check）
type Shape = "circle" | "rectangle" | "triangle";

function getArea(shape: Shape): number {
    switch (shape) {
        case "circle":
            return Math.PI * 10 ** 2;
        case "rectangle":
            return 20 * 30;
        case "triangle":
            return (20 * 15) / 2;
        default:
            // 如果所有 case 都处理了，shape 在这里是 never
            const exhaustiveCheck: never = shape;
            return exhaustiveCheck;
    }
}

// 如果后来新增了一个形状但忘记加 case：
// type Shape = "circle" | "rectangle" | "triangle" | "pentagon";
// default 分支中 shape 的类型变成 "pentagon"，不能赋给 never
// 编译错误提醒你忘记处理 "pentagon" 了

// 类型收窄后的 never
function process(value: string | number): void {
    if (typeof value === "string") {
        console.log(value.toUpperCase());
    } else if (typeof value === "number") {
        console.log(value.toFixed(2));
    } else {
        // 这里 value 的类型是 never（所有可能都已排除）
        const unreachable: never = value;
    }
}
```

### 进阶用法

```typescript
// never 在条件类型中过滤联合成员
type NonNullable<T> = T extends null | undefined ? never : T;

type Result = NonNullable<string | null | undefined>;
// Result = string（null 和 undefined 被过滤为 never，从联合中移除）

// 利用 never 实现类型级别的错误提示
type CheckExhaustive<T extends never> = T;

// 从联合类型中排除特定成员
type Exclude<T, U> = T extends U ? never : T;

type Animals = "cat" | "dog" | "bird" | "fish";
type Mammals = Exclude<Animals, "bird" | "fish">;
// Mammals = "cat" | "dog"

// never 在映射类型中移除属性
type RemoveReadonly<T> = {
    [K in keyof T as T[K] extends Function ? K : never]: T[K];
};

interface User {
    name: string;
    age: number;
    greet(): void;
    save(): Promise<void>;
}

type UserMethods = RemoveReadonly<User>;
// { greet: () => void; save: () => Promise<void> }
// name 和 age 被过滤（映射为 never 键名会被移除）

// 断言函数使用 never
function assertNonNull<T>(value: T): asserts value is NonNullable<T> {
    if (value === null || value === undefined) {
        throw new Error("值不能为 null 或 undefined");
    }
}
```

### never 在类型系统中的位置

| 类型关系 | 说明 |
|---------|------|
| never 是所有类型的子类型 | never 可以赋给 string、number、any 等任何类型 |
| 没有类型是 never 的子类型 | string、number 等不能赋给 never |
| `T \| never` = `T` | never 在联合类型中被吸收（消失） |
| `T & never` = `never` | never 在交叉类型中吞噬一切 |
| 空联合类型就是 never | 当联合类型的所有成员被过滤后，结果是 never |

### 适用场景

- **穷尽性检查：** 确保 switch/if-else 处理了联合类型的所有成员
- **条件类型过滤：** 用 never 从联合类型中移除不需要的成员
- **异常函数标注：** 标注永远抛出异常的辅助函数
- **映射类型过滤：** 在映射类型中用 never 键名移除属性

### 常见问题

#### never 和 void 的区别

void 表示函数返回了但没有有意义的值（实际返回 undefined）。never 表示函数永远不会正常返回（抛异常或无限循环）。void 函数调用后代码继续执行，never 函数调用后代码不会继续。

#### 什么时候变量的类型会变成 never

当类型收窄排除了所有可能性时。例如 `string | number` 变量在排除 string 和 number 后，在 else 分支中就是 never。

### 注意事项

- never 是底层类型，是所有类型的子类型
- `T | never` 等于 `T`，never 在联合类型中"消失"
- `T & never` 等于 `never`，never 在交叉类型中"吞噬"
- 穷尽性检查是 never 最实用的应用，能在编译期发现遗漏的分支
- 不要把 never 和 void 混淆：void 是"返回了但没值"，never 是"不会返回"

### 总结

never 是 TypeScript 的底层类型，表示永远不会出现的值。它出现在抛异常的函数返回类型和类型收窄后排除所有可能的分支中。never 在联合类型中被吸收（消失），在条件类型中用于过滤成员。最重要的实际应用是穷尽性检查：在 default 分支赋值给 never 变量，当联合类型新增成员但忘记处理时，编译器会立即报错。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## enum数值枚举与字符串枚举

### 概念定义

枚举（enum）是 TypeScript 提供的为数不多的非类型层面扩展之一——它会编译为真实的 JavaScript 运行时代码。枚举定义了一组命名常量，让代码中使用具有语义的名字而不是魔法数字或字符串。

TypeScript 支持三种枚举：数值枚举（成员值是数字，默认从 0 自增）、字符串枚举（成员值是字符串）、异构枚举（混合数字和字符串，不推荐）。数值枚举支持反向映射（从值获取名字），字符串枚举不支持。

### 语法与用法

#### 数值枚举

```typescript
// 默认从 0 开始自增
enum Direction {
    Up,      // 0
    Down,    // 1
    Left,    // 2
    Right,   // 3
}

// 指定起始值
enum StatusCode {
    OK = 200,
    Created = 201,
    BadRequest = 400,
    NotFound = 404,
    ServerError = 500,
}

// 使用枚举
let dir: Direction = Direction.Up;
console.log(dir);  // 0

let status: StatusCode = StatusCode.NotFound;
console.log(status);  // 404

// 数值枚举的反向映射
console.log(Direction[0]);     // "Up"
console.log(Direction["Up"]);  // 0
```

#### 字符串枚举

```typescript
// 每个成员必须显式赋值字符串
enum Color {
    Red = "RED",
    Green = "GREEN",
    Blue = "BLUE",
}

let color: Color = Color.Red;
console.log(color);  // "RED"

// 字符串枚举没有反向映射
// console.log(Color["RED"]);  // undefined（不像数值枚举）
```

### 基本示例

```typescript
// 数值枚举的实际应用：权限位标志
enum Permission {
    None = 0,
    Read = 1 << 0,    // 1
    Write = 1 << 1,   // 2
    Execute = 1 << 2, // 4
    All = Read | Write | Execute,  // 7
}

// 组合权限
let userPermission: Permission = Permission.Read | Permission.Write;  // 3

// 检查权限
function hasPermission(userPerm: Permission, checkPerm: Permission): boolean {
    return (userPerm & checkPerm) === checkPerm;
}

console.log(hasPermission(userPermission, Permission.Read));    // true
console.log(hasPermission(userPermission, Permission.Execute)); // false

// 字符串枚举的实际应用：API 状态
enum LoadingState {
    Idle = "IDLE",
    Loading = "LOADING",
    Success = "SUCCESS",
    Error = "ERROR",
}

function renderUI(state: LoadingState): string {
    switch (state) {
        case LoadingState.Idle:
            return "等待操作";
        case LoadingState.Loading:
            return "加载中...";
        case LoadingState.Success:
            return "加载成功";
        case LoadingState.Error:
            return "加载失败";
    }
}
```

### 进阶用法

```typescript
// const enum：编译时内联，不生成运行时对象
const enum HttpMethod {
    GET = "GET",
    POST = "POST",
    PUT = "PUT",
    DELETE = "DELETE",
}

let method = HttpMethod.GET;
// 编译后直接变成：let method = "GET";
// 没有 HttpMethod 对象生成

// 枚举成员作为类型
enum Fruit {
    Apple,
    Banana,
    Orange,
}

// 枚举成员可以作为类型使用
function eatApple(fruit: Fruit.Apple): void {
    console.log("吃苹果");
}

eatApple(Fruit.Apple);   // 合法
// eatApple(Fruit.Banana); // 编译错误

// 计算成员（数值枚举支持）
enum FileAccess {
    None,
    Read = 1 << 1,
    Write = 1 << 2,
    ReadWrite = Read | Write,
    // 使用函数的枚举成员（计算成员必须在常量成员之后）
}
```

### 数值枚举与字符串枚举的对比

| 对比维度 | 数值枚举 | 字符串枚举 |
|----------|---------|-----------|
| 默认值 | 从 0 自增 | 必须显式赋值 |
| 反向映射 | 支持（值 → 名字） | 不支持 |
| 位运算 | 适合 | 不适合 |
| 调试可读性 | 差（显示数字） | 好（显示有意义的字符串） |
| 编译产物大小 | 较大（包含反向映射） | 较小 |
| 运行时值 | number | string |

### 适用场景

- **数值枚举：** 位标志/权限组合、状态码、需要反向映射的场景
- **字符串枚举：** API 状态、日志级别、配置选项等需要可读性的场景
- **const enum：** 追求编译产物体积最小、不需要运行时枚举对象的场景

### 常见问题

#### 枚举和字面量联合类型应该用哪个

字面量联合类型（如 `"GET" | "POST"`）不产生运行时代码，更轻量。枚举有运行时对象，支持遍历和反向映射。一般来说，简单常量集合用字面量联合，需要运行时操作（如遍历所有值、反向查找名字）时用枚举。

```typescript
// 字面量联合：轻量，无运行时开销
type Method = "GET" | "POST" | "PUT" | "DELETE";

// 枚举：有运行时对象
enum MethodEnum {
    GET = "GET",
    POST = "POST",
    PUT = "PUT",
    DELETE = "DELETE",
}

// 枚举可以遍历
Object.values(MethodEnum);  // ["GET", "POST", "PUT", "DELETE"]
```

#### 数值枚举的类型安全隐患

数值枚举接受任意数字赋值，这是一个已知的类型安全问题。

```typescript
enum Status { Active, Inactive }
let s: Status = 999;  // 不报错！任何数字都可以赋给数值枚举
// 字符串枚举没有这个问题
```

### 注意事项

- 数值枚举接受任意数字赋值，类型安全性不如字符串枚举
- const enum 编译后被内联，不能在运行时遍历或反向映射
- `preserveConstEnums` 编译选项可以让 const enum 也生成运行时对象
- 异构枚举（混合数字和字符串）会导致混乱，强烈不推荐
- 枚举是 TypeScript 为数不多的编译为运行时代码的特性，如果追求 JS 互操作性，用字面量联合类型

### 总结

TypeScript 枚举分为数值枚举和字符串枚举。数值枚举默认从 0 自增，支持反向映射和位运算，但接受任意数字赋值存在安全隐患。字符串枚举必须显式赋值，调试可读性好，类型安全性更强。const enum 编译时内联不生成运行时对象。对于简单常量集合，字面量联合类型是更轻量的替代方案；需要运行时操作时用枚举。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## const enum的编译时内联

### 概念定义

const enum 是 TypeScript 中带有 `const` 修饰符的枚举，它在编译时会被完全内联——所有引用枚举成员的地方都直接替换为成员的字面量值，不会生成运行时的枚举对象。这意味着 const enum 在编译后的 JavaScript 代码中完全消失，仅作为编译期的常量替换机制存在。

const enum 的核心优势是零运行时开销：不产生额外的 JavaScript 对象，减小编译产物体积。代价是失去运行时的枚举对象，不能遍历枚举成员，也不能做反向映射。

### 语法与用法

```typescript
// 定义 const enum
const enum Direction {
    Up = 0,
    Down = 1,
    Left = 2,
    Right = 3,
}

// 使用 const enum
let dir = Direction.Up;
console.log(Direction.Left);

// 编译后的 JavaScript（内联替换）：
// let dir = 0 /* Up */;
// console.log(2 /* Left */);
// 注意：没有 Direction 对象生成

// const 字符串枚举
const enum Color {
    Red = "RED",
    Green = "GREEN",
    Blue = "BLUE",
}

let c = Color.Red;
// 编译后：let c = "RED" /* Red */;
```

### 基本示例

```typescript
// HTTP 状态码（const enum 非常适合这种场景）
const enum HttpStatus {
    OK = 200,
    Created = 201,
    NoContent = 204,
    BadRequest = 400,
    Unauthorized = 401,
    Forbidden = 403,
    NotFound = 404,
    InternalError = 500,
}

function handleResponse(status: number): string {
    switch (status) {
        case HttpStatus.OK:
            return "请求成功";
        case HttpStatus.NotFound:
            return "资源未找到";
        case HttpStatus.InternalError:
            return "服务器错误";
        default:
            return "其他状态";
    }
}

// 编译后 switch 的 case 值直接是数字：
// case 200: return "请求成功";
// case 404: return "资源未找到";
// case 500: return "服务器错误";

// const enum 用于位标志
const enum FileMode {
    None = 0,
    Read = 1,
    Write = 2,
    Execute = 4,
    ReadWrite = Read | Write,       // 3
    All = Read | Write | Execute,   // 7
}

let mode = FileMode.ReadWrite;
// 编译后：let mode = 3 /* ReadWrite */;
```

### 与普通 enum 的对比

| 对比维度 | const enum | 普通 enum |
|----------|-----------|----------|
| 运行时对象 | 不生成 | 生成 |
| 编译产物 | 成员值直接内联 | 保留枚举对象代码 |
| 产物体积 | 小 | 大 |
| 反向映射 | 不支持 | 数值枚举支持 |
| 运行时遍历 | 不支持 | 支持 Object.values() |
| 使用场景 | 纯常量替换 | 需要运行时操作 |

```typescript
// 普通 enum 编译产物
enum NormalColor { Red, Green, Blue }
// 编译后生成：
// var NormalColor;
// (function (NormalColor) {
//     NormalColor[NormalColor["Red"] = 0] = "Red";
//     NormalColor[NormalColor["Green"] = 1] = "Green";
//     NormalColor[NormalColor["Blue"] = 2] = "Blue";
// })(NormalColor || (NormalColor = {}));

// const enum 编译产物
const enum ConstColor { Red, Green, Blue }
let x = ConstColor.Red;
// 编译后只有：
// let x = 0 /* Red */;
// 没有 ConstColor 对象
```

### 适用场景

- **性能敏感场景：** 编译产物体积和运行时性能要求高的项目
- **常量集合：** HTTP 状态码、错误码、权限位标志等纯常量
- **库的内部常量：** 库内部使用的常量不需要暴露给消费者
- **频繁引用的值：** 在大量 switch/if 中使用的常量值

### 常见问题

#### const enum 在声明文件（.d.ts）中的问题

const enum 从声明文件导出时有兼容性问题。如果库发布 .d.ts 文件包含 const enum，消费者的编译器需要能看到枚举定义才能内联。建议库作者开启 `preserveConstEnums` 或避免导出 const enum。

#### preserveConstEnums 选项的作用

开启 `preserveConstEnums` 后，const enum 仍然会生成运行时对象（和普通 enum 一样），但使用处仍然做内联替换。这兼顾了产物可调试性和内联优化。

```json
// tsconfig.json
{
    "compilerOptions": {
        "preserveConstEnums": true
    }
}
```

#### isolatedModules 模式下的限制

在 `isolatedModules: true` 模式下（如 Babel、esbuild 编译），const enum 的跨文件引用可能无法正确内联，因为这些工具是单文件编译的。建议在这种模式下避免导出 const enum，或使用普通 enum。

### 注意事项

- const enum 编译后完全消失，不能在运行时通过枚举对象访问
- 不能对 const enum 使用 `Object.keys()`、`Object.values()` 等运行时方法
- const enum 成员只能是常量表达式（字面量、其他 const enum 成员的引用、简单运算）
- 跨模块导出 const enum 在 `isolatedModules` 模式下有兼容性问题
- TypeScript 5.0+ 的 `--verbatimModuleSyntax` 选项也可能影响 const enum 的行为

### 总结

const enum 在编译时将所有成员引用直接替换为字面量值，不生成运行时对象，实现零开销的常量替换。适用于 HTTP 状态码、位标志等纯常量场景。代价是不支持运行时遍历和反向映射。在 `isolatedModules` 模式和声明文件导出时有兼容性问题，库作者应谨慎使用。`preserveConstEnums` 选项可以同时保留运行时对象和内联优化。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 联合类型(Union Types)的或关系

### 概念定义

联合类型（Union Type）用 `|` 运算符将两个或多个类型组合起来，表示值可以是其中任意一种类型。`A | B` 读作"A 或 B"，意味着变量的值要么是 A 类型，要么是 B 类型。

联合类型是 TypeScript 类型系统中最常用的组合机制之一。在使用联合类型的值时，只能访问所有成员类型共有的属性和方法；如果需要访问某个特定类型的属性，必须先通过类型收窄确定具体类型。

### 语法与用法

```typescript
// 基本联合类型
let value: string | number;
value = "hello";   // 合法
value = 42;         // 合法
// value = true;    // 编译错误：boolean 不在联合类型中

// 多类型联合
let id: string | number | null = null;
id = "abc-123";
id = 42;

// 函数参数和返回值使用联合类型
function formatId(id: string | number): string {
    // 只能访问 string 和 number 共有的方法
    return id.toString();  // toString 是共有方法
    // id.toUpperCase();   // 编译错误：number 没有 toUpperCase
}
```

### 基本示例

```typescript
// 联合类型的类型收窄
function printValue(value: string | number | boolean): void {
    if (typeof value === "string") {
        // 这个分支中 value 是 string
        console.log(value.toUpperCase());
    } else if (typeof value === "number") {
        // 这个分支中 value 是 number
        console.log(value.toFixed(2));
    } else {
        // 这个分支中 value 是 boolean
        console.log(value ? "真" : "假");
    }
}

// 联合类型在数组中的应用
let mixed: (string | number)[] = [1, "two", 3, "four"];

// 联合类型配合字面量类型
type Status = "idle" | "loading" | "success" | "error";

function setStatus(status: Status): void {
    console.log(`状态: ${status}`);
}

setStatus("loading");  // 合法
// setStatus("pending"); // 编译错误：不在联合类型中

// 可辨识联合（Discriminated Union）
type ApiResponse =
    | { status: "success"; data: string }
    | { status: "error"; message: string };

function handleResponse(response: ApiResponse): void {
    if (response.status === "success") {
        // 窄化为 { status: "success"; data: string }
        console.log(response.data);
    } else {
        // 窄化为 { status: "error"; message: string }
        console.log(response.message);
    }
}
```

### 进阶用法

```typescript
// 联合类型在泛型中的分发特性
type ToArray<T> = T extends any ? T[] : never;

type StrOrNumArray = ToArray<string | number>;
// string[] | number[]（分发后各自成为数组，再联合）
// 注意：不是 (string | number)[]

// 阻止分发：用元组包裹
type ToArrayNoDistribute<T> = [T] extends [any] ? T[] : never;
type MixedArray = ToArrayNoDistribute<string | number>;
// (string | number)[]（不分发）

// 联合类型的交叉运算
type A = "a" | "b" | "c";
type B = "b" | "c" | "d";
type Common = A & B;  // "b" | "c"（取交集）

// Extract 提取联合成员
type Extracted = Extract<string | number | boolean, string | boolean>;
// string | boolean

// Exclude 排除联合成员
type Excluded = Exclude<string | number | boolean, boolean>;
// string | number
```

### 类型收窄方式汇总

| 收窄方式 | 语法 | 适用类型 |
|---------|------|---------|
| typeof | `typeof x === "string"` | 原始类型 |
| instanceof | `x instanceof Date` | 类实例 |
| in 操作符 | `"name" in x` | 对象属性 |
| 相等检查 | `x === null` | 字面量值 |
| 真值检查 | `if (x)` | 排除 falsy 值 |
| 可辨识属性 | `x.kind === "circle"` | 可辨识联合 |
| 类型谓词 | `function isX(v): v is X` | 自定义判断 |

### 适用场景

- **多态参数：** 函数参数接受多种类型，内部根据类型做不同处理
- **可辨识联合：** 用字面量属性区分不同形状的数据（如 API 响应、Redux action）
- **可空类型：** `T | null` 或 `T | undefined` 表示值可能为空
- **配置选项：** 某些配置项可以接受不同类型的值（如 `string | string[]`）

### 常见问题

#### 联合类型成员太多影响性能吗

TypeScript 编译器处理联合类型有内部限制，极端情况下（成员超过数万）会导致编译变慢。正常业务代码中几十个成员的联合类型没有问题。

#### 联合类型和交叉类型的区别

联合类型 `A | B` 表示"A 或 B"，值是其中之一。交叉类型 `A & B` 表示"A 且 B"，值同时满足两者。对于对象类型，联合是"取其一"，交叉是"合并属性"。

```typescript
type Union = { a: string } | { b: number };
// 值是 { a: string } 或 { b: number }

type Intersection = { a: string } & { b: number };
// 值是 { a: string; b: number }（两者合并）
```

### 注意事项

- 使用联合类型的值时，只能访问所有成员类型共有的属性和方法
- 访问特定类型的属性前必须先做类型收窄
- 联合类型在条件类型中有分发特性，需要注意是否是期望的行为
- `T | never` 等于 `T`，never 在联合类型中会被消除
- 联合类型的成员顺序不影响类型兼容性，`A | B` 和 `B | A` 等价

### 总结

联合类型用 `|` 将多个类型组合为"或"关系，值可以是其中任意一种。使用前只能访问共有成员，需要类型收窄后才能访问特定类型的属性。可辨识联合是联合类型最强大的应用模式，通过字面量属性自动窄化类型。联合类型在条件类型中有分发特性，`T | never` 中 never 会被消除。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 交叉类型(Intersection Types)的与关系

### 概念定义

交叉类型（Intersection Type）用 `&` 运算符将两个或多个类型组合起来，表示值必须同时满足所有类型的要求。`A & B` 读作"A 且 B"，生成的类型拥有 A 和 B 的所有属性和方法。

对于对象类型来说，交叉类型相当于"合并属性"——新类型拥有两个类型的全部属性。对于原始类型来说，交叉往往产生 never（因为一个值不可能同时是 string 又是 number）。交叉类型在 mixin 模式、类型扩展和接口合并中非常有用。

### 语法与用法

```typescript
// 对象类型的交叉：合并属性
type HasName = { name: string };
type HasAge = { age: number };
type Person = HasName & HasAge;

// Person 同时拥有 name 和 age
const person: Person = {
    name: "张三",
    age: 25,
};

// 缺少任何一个属性都会报错
// const bad: Person = { name: "张三" };  // 编译错误：缺少 age

// 原始类型的交叉：通常产生 never
type Impossible = string & number;  // never
```

### 基本示例

```typescript
// 多个接口的交叉
interface Serializable {
    serialize(): string;
}

interface Loggable {
    log(): void;
}

interface Identifiable {
    id: number;
}

// 同时满足三个接口
type Entity = Serializable & Loggable & Identifiable;

const entity: Entity = {
    id: 1,
    serialize() {
        return JSON.stringify({ id: this.id });
    },
    log() {
        console.log(`Entity #${this.id}`);
    },
};

// 类型扩展：给已有类型添加属性
type WithTimestamp<T> = T & { createdAt: Date; updatedAt: Date };

interface User {
    name: string;
    email: string;
}

type TimestampedUser = WithTimestamp<User>;
// { name: string; email: string; createdAt: Date; updatedAt: Date }

const user: TimestampedUser = {
    name: "张三",
    email: "zhang@example.com",
    createdAt: new Date(),
    updatedAt: new Date(),
};
```

### 进阶用法

```typescript
// Mixin 模式：用交叉类型组合多个功能
type Constructor<T = {}> = new (...args: any[]) => T;

function Timestamped<T extends Constructor>(Base: T) {
    return class extends Base {
        createdAt = new Date();
        updatedAt = new Date();
    };
}

function Activatable<T extends Constructor>(Base: T) {
    return class extends Base {
        isActive = false;
        activate() { this.isActive = true; }
        deactivate() { this.isActive = false; }
    };
}

// 交叉类型在属性类型冲突时的行为
type A = { value: string; shared: number };
type B = { data: boolean; shared: string };
type AB = A & B;
// AB.shared 的类型是 number & string = never（冲突！）

// 避免属性冲突的正确做法
type SafeA = { value: string; shared: number };
type SafeB = { data: boolean; shared: number };  // shared 类型一致
type SafeAB = SafeA & SafeB;
// SafeAB.shared 的类型是 number（一致，无冲突）

// 函数类型的交叉：产生重载
type FnA = (x: string) => string;
type FnB = (x: number) => number;
type FnAB = FnA & FnB;
// FnAB 可以接受 string 参数返回 string，也可以接受 number 参数返回 number
```

### 与联合类型的对比

| 对比维度 | 交叉类型 `A & B` | 联合类型 `A \| B` |
|----------|-----------------|-----------------|
| 含义 | A 且 B（同时满足） | A 或 B（满足其一） |
| 对象类型 | 合并所有属性 | 取其中一种形状 |
| 原始类型 | 通常是 never | 可以是任一类型 |
| 属性访问 | 可以访问所有属性 | 只能访问共有属性 |
| 类型收窄 | 不需要 | 需要收窄 |
| 典型用途 | mixin、类型扩展 | 多态参数、可辨识联合 |

```typescript
// 交叉：值必须同时有 name 和 age
type Inter = { name: string } & { age: number };
const i: Inter = { name: "张三", age: 25 };  // 两个属性都必须有

// 联合：值是其中一种
type Union = { name: string } | { age: number };
const u1: Union = { name: "张三" };   // 只有 name 也合法
const u2: Union = { age: 25 };         // 只有 age 也合法
```

### 适用场景

- **类型扩展：** 给已有类型添加额外的属性（如时间戳、元数据）
- **Mixin 模式：** 将多个功能接口组合成一个类型
- **泛型约束增强：** 用交叉类型给泛型参数添加额外约束
- **API 响应组合：** 基础响应类型 & 分页信息类型 & 业务数据类型

### 常见问题

#### 同名属性类型冲突怎么办

当两个类型有同名属性但类型不同时，交叉后该属性的类型变成两者的交叉。如果是不兼容的原始类型（如 string & number），结果是 never，实际上该属性不可能有合法的值。

```typescript
type X = { id: string };
type Y = { id: number };
type XY = X & Y;
// XY 的 id 类型是 string & number = never
// 实际上不可能创建 XY 类型的值
```

#### 交叉类型和 extends 继承的区别

交叉类型是类型层面的合并，不产生运行时关系。extends 是面向对象的继承，有运行时原型链。交叉类型更灵活（可以组合任意类型），extends 更结构化（有父子关系）。

### 注意事项

- 对象类型交叉是合并属性，原始类型交叉通常是 never
- 同名属性类型不兼容时，交叉结果是 never，要注意避免
- 交叉类型不是"取两者共有属性"（那是联合类型的行为），而是"合并所有属性"
- 函数类型的交叉产生重载效果
- `T & never` 等于 `never`，never 在交叉类型中会吞噬一切

### 总结

交叉类型用 `&` 将多个类型合并为"且"关系，值必须同时满足所有类型。对象类型交叉是属性合并，原始类型交叉通常是 never。交叉类型广泛用于类型扩展、Mixin 模式和泛型约束增强。和联合类型的区别：交叉是"同时满足"，联合是"满足其一"。注意同名属性类型冲突会产生 never。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 类型断言(as)与非空断言(!)

### 概念定义

类型断言（Type Assertion）是开发者告诉 TypeScript 编译器"我比你更了解这个值的类型"的方式。它不会改变运行时行为，也不做运行时类型转换，仅在编译期改变编译器对变量的类型判断。TypeScript 提供两种类型断言语法：`as` 语法和尖括号语法。

非空断言操作符 `!` 是类型断言的一种特殊形式，用于告诉编译器某个值不是 null 或 undefined。它在变量后面加 `!`，移除类型中的 null 和 undefined。

### 语法与用法

```typescript
// as 语法（推荐，在 JSX 中不会和标签冲突）
let value: unknown = "hello";
let strLength: number = (value as string).length;

// 尖括号语法（不推荐在 .tsx 文件中使用）
let strLength2: number = (<string>value).length;

// 非空断言操作符 !
let element: HTMLElement | null = document.getElementById("app");
// element.innerHTML = "hello";  // 编译错误：可能为 null
element!.innerHTML = "hello";    // 非空断言：告诉编译器 element 不为 null

// 可选链和非空断言的对比
let name1 = element?.textContent;   // string | undefined（安全）
let name2 = element!.textContent;   // string（断言不为null，如果实际是null会运行时报错）
```

### 基本示例

```typescript
// 处理 DOM 元素
const input = document.getElementById("username") as HTMLInputElement;
// getElementById 返回 HTMLElement | null
// 断言为 HTMLInputElement 后可以访问 .value 属性
console.log(input.value);

// 处理 API 响应
interface User {
    id: number;
    name: string;
    email: string;
}

async function fetchUser(): Promise<User> {
    const response = await fetch("/api/user");
    const data = await response.json();  // any 类型
    return data as User;  // 断言为 User 类型
}

// 非空断言在赋值中的使用
interface Config {
    database?: {
        host: string;
        port: number;
    };
}

const config: Config = { database: { host: "localhost", port: 3306 } };
// 开发者确信 database 一定存在时用非空断言
const host: string = config.database!.host;

// 类型断言的限制：不能跨越不兼容的类型
// let num: number = "hello" as number;  // 编译错误

// 双重断言（先转 unknown/any，再转目标类型）
let num: number = ("hello" as unknown) as number;
// 能编译通过，但运行时 num 实际是字符串，非常危险
```

### 进阶用法

```typescript
// const 断言
let tuple = [1, "hello"] as const;
// 类型变为 readonly [1, "hello"]（字面量元组）

const config = {
    endpoint: "https://api.example.com",
    timeout: 5000,
} as const;
// 所有属性变为 readonly，值变为字面量类型

// satisfies 操作符（TypeScript 4.9+）
// 既保留字面量类型推断，又做类型检查
type ColorMap = Record<string, [number, number, number] | string>;

const colors = {
    red: [255, 0, 0],
    green: "#00ff00",
    blue: [0, 0, 255],
} satisfies ColorMap;
// colors.red 的类型是 [number, number, number]（保留了精确类型）
// colors.green 的类型是 string
// 如果写错了会报编译错误

// 断言函数
function assertIsString(value: unknown): asserts value is string {
    if (typeof value !== "string") {
        throw new TypeError(`期望 string，实际是 ${typeof value}`);
    }
}

let data: unknown = "hello";
assertIsString(data);
// 断言后 data 的类型变为 string
console.log(data.toUpperCase());  // 合法
```

### 类型断言方式对比

| 方式 | 语法 | 安全性 | 运行时效果 |
|------|------|--------|-----------|
| as 断言 | `value as Type` | 编译期，不安全 | 无 |
| 非空断言 | `value!` | 编译期，不安全 | 无 |
| 双重断言 | `value as any as Type` | 非常不安全 | 无 |
| 类型守卫 | `typeof / instanceof / in` | 安全（运行时检查） | 有 |
| 断言函数 | `asserts value is Type` | 安全（运行时抛错） | 有 |
| satisfies | `value satisfies Type` | 安全（保留推断） | 无 |

### 适用场景

- **DOM 操作：** 将 getElementById 的结果断言为具体的 HTML 元素类型
- **API 响应：** 将 JSON.parse 或 fetch 返回的数据断言为已知接口类型
- **第三方库类型不准确：** 库的类型定义不够精确时用断言补充
- **非空断言：** 开发者确信值不为 null 时消除编译器的 null 检查警告

### 常见问题

#### 类型断言和类型转换的区别

类型断言只改变编译器的类型判断，不做任何运行时转换。如果断言错误，运行时会出现类型不匹配的 bug。类型转换（如 `Number("42")`、`String(42)`）是真正的运行时操作。

#### 什么时候应该避免使用类型断言

当可以通过类型守卫（typeof、instanceof）或类型收窄达到目的时，不要用类型断言。类型断言绕过了编译器检查，是潜在的 bug 来源。只在编译器确实无法推断、而开发者有充分信心时使用。

### 注意事项

- 类型断言不做运行时检查，断言错误会导致运行时 bug
- 优先使用类型守卫和收窄，断言是最后手段
- 在 .tsx 文件中不能用尖括号语法，必须用 as 语法
- 非空断言 `!` 如果判断错误（值确实是 null），运行时会报 TypeError
- 双重断言（`as unknown as T`）几乎总是代码坏味道，应该重新审视类型设计
- TypeScript 4.9+ 的 satisfies 操作符在很多场景下比 as 断言更好

### 总结

类型断言用 `as` 告诉编译器值的类型，非空断言用 `!` 移除 null/undefined。两者都只在编译期生效，不做运行时检查，断言错误会导致运行时 bug。优先使用类型守卫和收窄做安全的类型判断，断言作为最后手段。TypeScript 4.9 引入的 satisfies 操作符在保留类型推断的同时做类型检查，是很多场景下比 as 更好的选择。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。



## 5.2 接口与类型别名

## interface的对象形状定义

### 概念定义

interface（接口）是 TypeScript 中定义对象结构的核心方式。它描述了对象应该具有哪些属性、每个属性是什么类型，以及对象应该有哪些方法。interface 只存在于编译期，编译后不会产生任何 JavaScript 代码。

interface 采用的是结构类型系统（Structural Typing）：只要对象的结构满足接口的要求，就认为该对象实现了该接口，不需要显式声明"implements"。这和 Java、C# 的名义类型系统（Nominal Typing）不同。

### 语法与用法

```typescript
// 基本 interface 定义
interface User {
    id: number;
    name: string;
    email: string;
}

// 使用 interface 做类型注解
const user: User = {
    id: 1,
    name: "张三",
    email: "zhang@example.com",
};

// 结构类型：不需要显式声明 implements，形状匹配即可
const anotherUser = {
    id: 2,
    name: "李四",
    email: "li@example.com",
    age: 25,  // 多出的属性
};

// 通过变量赋值时不做多余属性检查
const validUser: User = anotherUser;  // 合法

// 直接传递字面量时会做多余属性检查
// const badUser: User = {
//     id: 3, name: "王五", email: "wang@example.com", age: 30
// };
// 编译错误：对象字面量有多余属性 age
```

### 基本示例

```typescript
// 描述函数参数的形状
interface SearchParams {
    keyword: string;
    page: number;
    pageSize: number;
}

function searchUsers(params: SearchParams): void {
    console.log(`搜索: ${params.keyword}, 第${params.page}页`);
}

searchUsers({ keyword: "前端", page: 1, pageSize: 20 });

// 嵌套对象的 interface
interface Address {
    city: string;
    street: string;
    zipCode: string;
}

interface Company {
    name: string;
    address: Address;  // 嵌套引用另一个 interface
}

interface Employee {
    id: number;
    name: string;
    company: Company;
}

const employee: Employee = {
    id: 1,
    name: "张三",
    company: {
        name: "科技公司",
        address: {
            city: "北京",
            street: "中关村大街1号",
            zipCode: "100080",
        },
    },
};

// interface 作为函数返回类型
function createUser(name: string, email: string): User {
    return {
        id: Date.now(),
        name,
        email,
    };
}
```

### 进阶用法

```typescript
// 泛型 interface
interface ApiResponse<T> {
    code: number;
    message: string;
    data: T;
}

interface UserData {
    id: number;
    name: string;
}

// 使用时传入具体类型
const response: ApiResponse<UserData> = {
    code: 200,
    message: "success",
    data: { id: 1, name: "张三" },
};

// 数组类型的响应
const listResponse: ApiResponse<UserData[]> = {
    code: 200,
    message: "success",
    data: [
        { id: 1, name: "张三" },
        { id: 2, name: "李四" },
    ],
};

// interface 在类中的使用
interface Printable {
    print(): void;
}

class Document implements Printable {
    constructor(private content: string) {}

    print(): void {
        console.log(this.content);
    }
}
```

### 适用场景

- **API 数据结构：** 定义请求参数和响应数据的形状
- **组件 Props：** React/Vue 组件的属性类型定义
- **配置对象：** 应用配置、库配置的结构定义
- **领域模型：** 业务实体（用户、订单、商品等）的类型描述

### 常见问题

#### 对象字面量的多余属性检查

直接将对象字面量赋值给 interface 类型时，TypeScript 会检查多余属性。通过变量中转则不会。这是有意设计：字面量赋值时多余属性通常是拼写错误。

```typescript
interface Point {
    x: number;
    y: number;
}

// 直接字面量：多余属性报错
// const p: Point = { x: 1, y: 2, z: 3 };  // 报错：多余的 z

// 变量中转：不报错
const data = { x: 1, y: 2, z: 3 };
const p: Point = data;  // 合法
```

#### interface 和 class 的关系

interface 只定义形状（编译期），class 既定义形状也有实现（运行时）。class 可以 implements interface 来保证自己符合接口的形状。一个 class 可以实现多个 interface。

### 注意事项

- interface 编译后完全消失，不产生运行时代码
- TypeScript 使用结构类型系统，形状匹配即视为兼容
- 对象字面量直接赋值有多余属性检查，变量赋值没有
- interface 支持声明合并（同名 interface 自动合并属性）
- interface 命名约定：不需要加 I 前缀（如 IUser），直接用 User 即可

### 总结

interface 是 TypeScript 定义对象形状的核心工具，描述对象应有的属性和方法。基于结构类型系统，不需要显式 implements 声明，形状匹配就视为兼容。interface 只存在于编译期，不产生运行时代码。广泛用于 API 数据结构、组件 Props、配置对象和领域模型的类型定义。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## interface的可选属性(?)

### 概念定义

接口中的可选属性使用 `?` 标记，表示该属性在实现对象时可以不存在。可选属性的类型会自动包含 `| undefined`，在读取时需要做非空检查。可选属性是 TypeScript 中处理"部分数据"和"灵活配置"的核心机制。

### 语法与用法

```typescript
interface UserProfile {
    name: string;          // 必选属性
    age?: number;          // 可选属性
    bio?: string;          // 可选属性
    avatar?: string;       // 可选属性
}

// 只提供必选属性即可
const user1: UserProfile = { name: "张三" };

// 也可以提供部分或全部可选属性
const user2: UserProfile = { name: "李四", age: 25 };
const user3: UserProfile = { name: "王五", age: 30, bio: "前端开发", avatar: "avatar.png" };
```

### 基本示例

```typescript
// 配置对象中的可选属性
interface RequestConfig {
    url: string;
    method?: "GET" | "POST" | "PUT" | "DELETE";
    headers?: Record<string, string>;
    body?: string;
    timeout?: number;
}

function request(config: RequestConfig): void {
    // 可选属性需要做判断或提供默认值
    const method = config.method ?? "GET";
    const timeout = config.timeout ?? 5000;
    console.log(`${method} ${config.url} timeout=${timeout}`);
}

request({ url: "/api/users" });  // 只传必选参数
request({ url: "/api/users", method: "POST", body: '{"name":"张三"}' });

// 可选属性的类型窄化
interface Article {
    title: string;
    cover?: string;
}

function renderArticle(article: Article): string {
    // article.cover 的类型是 string | undefined
    if (article.cover) {
        return `<img src="${article.cover}"/><h1>${article.title}</h1>`;
    }
    return `<h1>${article.title}</h1>`;
}
```

### 进阶用法

```typescript
// Partial<T> 将所有属性变为可选
interface User {
    id: number;
    name: string;
    email: string;
}

// 更新操作只需要传部分字段
function updateUser(id: number, updates: Partial<User>): void {
    console.log(`更新用户 ${id}:`, updates);
}

updateUser(1, { name: "新名字" });         // 只更新 name
updateUser(1, { email: "new@example.com" }); // 只更新 email

// 可选属性和 exactOptionalPropertyTypes
// TypeScript 4.4+ 新增编译选项：exactOptionalPropertyTypes
// 开启后，可选属性不再自动包含 undefined
// 即 age?: number 表示"属性可以不存在"，但如果存在就必须是 number
// 不能显式赋值 undefined

// tsconfig.json: "exactOptionalPropertyTypes": true
// const bad: UserProfile = { name: "张三", age: undefined };  // 报错！
```

### 适用场景

- **配置对象：** 大量配置项中只有少数是必填的
- **表单数据：** 用户可能只填写了部分字段
- **更新操作：** PATCH 请求只传需要更新的字段
- **组件 Props：** React/Vue 组件中大部分 Props 有默认值，只需标为可选

### 常见问题

#### 可选属性和 `| undefined` 的区别

`age?: number` 允许属性完全不存在。`age: number | undefined` 要求属性必须存在但值可以是 undefined。开启 `exactOptionalPropertyTypes` 后这个区别更明显。

```typescript
interface A { age?: number }
interface B { age: number | undefined }

const a: A = {};                    // 合法：age 不存在
const b: B = { age: undefined };    // 合法：age 存在但值为 undefined
// const b2: B = {};                // 编译错误：缺少 age
```

### 注意事项

- 可选属性读取时类型自动包含 `| undefined`，使用前需做非空检查
- 使用 `??` 空值合并或 `?.` 可选链处理可选属性更简洁
- `exactOptionalPropertyTypes` 编译选项可以让可选属性和 undefined 的区别更严格
- Partial\&lt;T\> 工具类型可以一次性将所有属性变为可选

### 总结

接口的可选属性用 `?` 标记，表示属性可以不存在。读取时类型自动包含 undefined，需要做非空检查。可选属性广泛用于配置对象、表单数据和更新操作。和 `T | undefined` 的区别在于：可选属性允许属性缺失，`T | undefined` 要求属性存在。Partial\&lt;T\> 可以将所有属性转为可选。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## interface的只读属性(readonly)

### 概念定义

readonly 修饰符用于接口属性前，表示该属性在对象创建后不可修改。readonly 是编译期约束，不会影响运行时行为——编译后 readonly 完全消失，JavaScript 中对象属性仍然可以被修改。

readonly 和 const 的区别在于：const 用于变量声明（变量本身不可重新赋值），readonly 用于属性声明（属性值不可修改）。readonly 只保证引用不变，如果属性值是对象或数组，内部内容仍然可以修改（浅层只读）。

### 语法与用法

```typescript
interface User {
    readonly id: number;       // 只读：创建后不可修改
    readonly createdAt: Date;  // 只读
    name: string;              // 可写
    email: string;             // 可写
}

const user: User = {
    id: 1,
    createdAt: new Date(),
    name: "张三",
    email: "zhang@example.com",
};

user.name = "李四";           // 合法：可写属性
// user.id = 2;               // 编译错误：readonly 属性不可修改
// user.createdAt = new Date(); // 编译错误
```

### 基本示例

```typescript
// 配置对象：所有属性都只读
interface AppConfig {
    readonly apiUrl: string;
    readonly timeout: number;
    readonly debug: boolean;
}

const config: AppConfig = {
    apiUrl: "https://api.example.com",
    timeout: 5000,
    debug: false,
};

// config.debug = true;  // 编译错误

// readonly 数组属性
interface DataSet {
    readonly items: readonly number[];  // 属性只读 + 数组内容只读
    readonly name: string;
}

const dataset: DataSet = {
    items: [1, 2, 3],
    name: "样本数据",
};

// dataset.items = [4, 5, 6];  // 编译错误：属性只读
// dataset.items.push(4);       // 编译错误：数组内容只读

// 浅层只读的陷阱
interface Container {
    readonly data: { value: number };
}

const container: Container = { data: { value: 1 } };
// container.data = { value: 2 };  // 编译错误：data 属性只读
container.data.value = 2;           // 合法！readonly 是浅层的，内部对象属性可修改
```

### 进阶用法

```typescript
// Readonly<T> 工具类型：一次性将所有属性变为 readonly
interface MutableUser {
    id: number;
    name: string;
    email: string;
}

type ImmutableUser = Readonly<MutableUser>;
// 等价于：
// { readonly id: number; readonly name: string; readonly email: string }

// 深层只读的递归类型
type DeepReadonly<T> = {
    readonly [K in keyof T]: T[K] extends object
        ? T[K] extends Function
            ? T[K]
            : DeepReadonly<T[K]>
        : T[K];
};

interface NestedConfig {
    server: {
        host: string;
        port: number;
    };
    features: string[];
}

type FrozenConfig = DeepReadonly<NestedConfig>;
// server.host、server.port、features 内容都变成 readonly
```

### readonly 与 const 的对比

| 对比维度 | readonly | const |
|----------|----------|-------|
| 用于 | 对象属性 | 变量声明 |
| 含义 | 属性不可重新赋值 | 变量不可重新赋值 |
| 深度 | 浅层（内部属性可改） | 浅层（对象内容可改） |
| 编译后 | 消失 | 变为 const/var |

### 适用场景

- **不可变数据模型：** 数据库 ID、创建时间等不应被修改的字段
- **配置对象：** 应用配置在初始化后不应被修改
- **函数参数：** 保证函数内部不修改传入的对象属性
- **Redux/Vuex 状态：** 状态对象标记为 readonly 防止直接修改

### 常见问题

#### readonly 是运行时还是编译期的

纯编译期。readonly 在编译后完全消失，运行时没有任何保护。如果需要运行时冻结，配合 `Object.freeze()` 使用。

#### 如何实现深层只读

TypeScript 内置的 `Readonly<T>` 只是浅层只读。深层只读需要自定义递归类型，或使用第三方库（如 ts-essentials 的 `DeepReadonly`）。

### 注意事项

- readonly 只是编译期约束，运行时不保护
- readonly 是浅层的，嵌套对象的属性仍可修改
- `Readonly<T>` 工具类型将所有属性一次性变为 readonly
- 如果需要运行时不可变，配合 `Object.freeze()` 使用
- readonly 属性可以在构造函数中赋值（类的 readonly 属性）

### 总结

readonly 修饰符用于接口属性，表示属性创建后不可修改。它是编译期约束，编译后消失。readonly 是浅层的——属性引用不可变但内部内容可修改。`Readonly<T>` 可以一次性将所有属性变为 readonly，深层只读需要自定义递归类型。广泛用于不可变数据模型、配置对象和状态管理中的编译期保护。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## interface的方法定义与调用签名

### 概念定义

接口中定义方法有两种方式：方法简写语法和属性函数语法。此外，接口还可以定义调用签名（Call Signature），用来描述一个"可以被调用"的对象——既是函数，又可以有额外属性。

方法简写语法 `method(arg: T): R` 更简洁直观，属性函数语法 `method: (arg: T) => R` 在严格模式下参数检查更严格。调用签名语法 `(arg: T): R` 则用于描述可调用对象本身。

### 语法与用法

```typescript
// 方法简写语法
interface Calculator {
    add(a: number, b: number): number;
    subtract(a: number, b: number): number;
}

// 属性函数语法（完全等价，但 strictFunctionTypes 下参数检查更严格）
interface CalculatorAlt {
    add: (a: number, b: number) => number;
    subtract: (a: number, b: number) => number;
}

// 调用签名：描述可调用对象
interface Formatter {
    (input: string): string;           // 调用签名
    locale: string;                     // 附加属性
    setLocale(locale: string): void;   // 附加方法
}

// 使用调用签名
const fmt: Formatter = Object.assign(
    (input: string) => input.toUpperCase(),
    { locale: "zh-CN", setLocale(locale: string) { this.locale = locale; } }
);

console.log(fmt("hello"));   // "HELLO"（作为函数调用）
console.log(fmt.locale);      // "zh-CN"（访问属性）
```

### 基本示例

```typescript
// 接口中的方法定义
interface UserService {
    // 方法简写
    getById(id: number): Promise<User>;
    create(data: CreateUserDto): Promise<User>;
    update(id: number, data: Partial<User>): Promise<User>;
    delete(id: number): Promise<void>;
}

interface User {
    id: number;
    name: string;
}

interface CreateUserDto {
    name: string;
    email: string;
}

// 实现接口
const userService: UserService = {
    async getById(id) {
        return { id, name: "张三" };
    },
    async create(data) {
        return { id: Date.now(), name: data.name };
    },
    async update(id, data) {
        return { id, name: data.name ?? "unknown" };
    },
    async delete(id) {
        console.log(`删除用户 ${id}`);
    },
};

// 调用签名的重载
interface StringParser {
    (input: string): string[];
    (input: string, delimiter: string): string[];
    maxLength: number;
}
```

### 进阶用法

```typescript
// 泛型方法
interface Repository<T> {
    findAll(): Promise<T[]>;
    findById(id: number): Promise<T | null>;
    save(entity: T): Promise<T>;
    remove(id: number): Promise<boolean>;
}

// 接口中的泛型方法（方法本身有泛型参数）
interface Transformer {
    transform<T, U>(input: T, fn: (item: T) => U): U;
    transformAll<T, U>(inputs: T[], fn: (item: T) => U): U[];
}

const transformer: Transformer = {
    transform(input, fn) {
        return fn(input);
    },
    transformAll(inputs, fn) {
        return inputs.map(fn);
    },
};

// 类型安全的调用
const result = transformer.transform(42, (n) => n.toString());
// result 类型推断为 string
```

### 两种方法语法的对比

| 对比维度 | 方法简写 `m(x: T): R` | 属性函数 `m: (x: T) => R` |
|----------|----------------------|--------------------------|
| 可读性 | 更简洁 | 稍冗长 |
| strictFunctionTypes | 参数双变（bivariant） | 参数逆变（contravariant） |
| 重载支持 | 支持多个同名方法签名 | 不支持直接重载 |
| this 类型 | 可以声明 this 参数 | 可以声明 this 参数 |
| 推荐场景 | 一般接口方法 | 需要严格参数检查时 |

### 适用场景

- **服务接口：** 定义 API 服务层的方法签名（CRUD 操作）
- **策略模式：** 定义可互换的算法接口
- **可调用对象：** 既是函数又有属性的混合对象（如 jQuery 的 $ 函数）
- **插件系统：** 定义插件必须实现的方法集合

### 常见问题

#### 方法简写和属性函数在类型检查上有什么区别

在开启 `strictFunctionTypes` 后，属性函数语法对参数类型做逆变检查（更严格），方法简写语法对参数类型做双变检查（更宽松）。如果需要更严格的类型安全，用属性函数语法。

```typescript
interface Animal { name: string }
interface Dog extends Animal { breed: string }

// 方法简写：双变，以下赋值合法
interface Handler1 {
    handle(animal: Dog): void;
}

// 属性函数：逆变，以下赋值更严格
interface Handler2 {
    handle: (animal: Dog) => void;
}
```

#### 调用签名和函数类型别名的区别

调用签名写在接口内部，可以和其他属性共存。函数类型别名 `type F = (x: T) => R` 只描述函数本身，不能附加属性。

### 注意事项

- 方法简写语法更常用，属性函数语法在严格模式下更安全
- 调用签名用于描述"可调用且有属性"的对象
- 接口中可以有多个同名方法签名实现重载
- 泛型方法的类型参数写在方法名后面（`method<T>`），泛型接口的类型参数写在接口名后面（`Interface<T>`）
- 异步方法的返回类型用 `Promise<T>` 包装

### 总结

接口中定义方法有方法简写和属性函数两种语法，前者更简洁，后者在 `strictFunctionTypes` 下更严格。调用签名用于描述可调用对象，允许函数同时拥有额外属性。接口中可以定义泛型方法、异步方法和重载签名。方法简写适合大多数场景，需要严格参数类型检查时用属性函数语法。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## interface的构造签名(new)

### 概念定义

构造签名（Construct Signature）用于描述一个可以用 `new` 关键字调用的对象（即构造函数或类）。在接口中使用 `new (...args): T` 语法定义构造签名，表示该接口描述的是一个"可实例化"的东西。

构造签名和调用签名的区别在于：调用签名描述的是普通函数调用 `fn()`，构造签名描述的是构造调用 `new Fn()`。JavaScript 中的类本身就是构造函数，所以当需要把"类本身"作为参数传递时，就需要构造签名来描述其类型。

### 语法与用法

```typescript
// 构造签名：描述可以被 new 调用的对象
interface DateConstructor {
    new (): Date;                          // 无参构造
    new (value: number): Date;             // 数字参数构造
    new (dateString: string): Date;        // 字符串参数构造
    new (year: number, month: number, day?: number): Date;  // 多参数构造
}

// 简单的构造签名
interface Constructor<T> {
    new (...args: any[]): T;
}

// 使用构造签名作为函数参数
function createInstance<T>(Ctor: Constructor<T>): T {
    return new Ctor();
}
```

### 基本示例

```typescript
// 工厂函数：接收类本身作为参数
interface AnimalConstructor {
    new (name: string): Animal;
}

interface Animal {
    name: string;
    speak(): string;
}

class Dog implements Animal {
    constructor(public name: string) {}
    speak(): string {
        return `${this.name}: 汪汪`;
    }
}

class Cat implements Animal {
    constructor(public name: string) {}
    speak(): string {
        return `${this.name}: 喵喵`;
    }
}

// 工厂函数接收构造函数
function createAnimal(Ctor: AnimalConstructor, name: string): Animal {
    return new Ctor(name);
}

const dog = createAnimal(Dog, "旺财");
const cat = createAnimal(Cat, "小花");
console.log(dog.speak());  // "旺财: 汪汪"
console.log(cat.speak());  // "小花: 喵喵"

// 泛型构造签名
function create<T>(Ctor: new () => T): T {
    return new Ctor();
}

class UserService {
    fetchUsers() {
        return ["张三", "李四"];
    }
}

const service = create(UserService);
console.log(service.fetchUsers());  // ["张三", "李四"]
```

### 进阶用法

```typescript
// 抽象构造签名（TypeScript 4.2+）
// abstract 修饰的构造签名允许传入抽象类
type AbstractConstructor<T> = abstract new (...args: any[]) => T;

abstract class Shape {
    abstract area(): number;
}

class Circle extends Shape {
    constructor(private radius: number) { super(); }
    area(): number {
        return Math.PI * this.radius ** 2;
    }
}

// 接受抽象类或具体类
function getArea<T extends Shape>(ShapeClass: AbstractConstructor<T>, ...args: any[]): number {
    // 注意：不能直接 new 抽象类
    // 这里只是描述类型约束
    return 0;
}

// 同时具有调用签名和构造签名的接口
interface DateLike {
    (): string;              // 作为函数调用：Date() 返回字符串
    new (): Date;            // 作为构造函数：new Date() 返回 Date 对象
    now(): number;           // 静态方法
}

// Mixin 模式中的构造签名
type GConstructor<T = {}> = new (...args: any[]) => T;

function Timestamped<TBase extends GConstructor>(Base: TBase) {
    return class extends Base {
        timestamp = Date.now();
    };
}

function Activatable<TBase extends GConstructor>(Base: TBase) {
    return class extends Base {
        isActive = false;
        activate() { this.isActive = true; }
    };
}

class BaseUser {
    constructor(public name: string) {}
}

// 组合 Mixin
const TimestampedUser = Timestamped(BaseUser);
const FullUser = Activatable(TimestampedUser);

const user = new FullUser("张三");
console.log(user.name);        // "张三"
console.log(user.timestamp);   // 时间戳
user.activate();
console.log(user.isActive);    // true
```

### 构造签名与调用签名的对比

| 对比维度 | 构造签名 `new (): T` | 调用签名 `(): T` |
|----------|---------------------|-----------------|
| 调用方式 | `new Fn()` | `fn()` |
| 描述对象 | 类/构造函数 | 普通函数 |
| 返回值 | 实例对象 | 任意值 |
| 典型用途 | 工厂模式、DI 容器 | 回调、策略模式 |

### 适用场景

- **工厂模式：** 接收类作为参数，内部用 new 创建实例
- **依赖注入：** DI 容器注册和解析类时需要构造签名类型
- **Mixin 模式：** 高阶函数接收基类并返回增强后的类
- **类型安全的反射：** 运行时动态创建实例时保持类型安全

### 常见问题

#### 为什么不能直接用类的类型作为参数类型

类的类型（如 `Dog`）描述的是实例的形状，不是类本身。要描述"类本身"，需要用构造签名 `new () => Dog` 或 `typeof Dog`。

```typescript
// Dog 描述的是实例类型
function useInstance(dog: Dog): void {
    dog.speak();  // 使用实例
}

// new () => Dog 描述的是类本身
function useClass(DogClass: new (name: string) => Dog): void {
    const dog = new DogClass("旺财");  // 创建实例
}

// typeof Dog 也可以描述类本身
function useClass2(DogClass: typeof Dog): void {
    const dog = new DogClass("旺财");
}
```

### 注意事项

- 构造签名用 `new` 关键字区分于调用签名
- 类的实例类型和类本身的类型是不同的概念
- TypeScript 4.2+ 支持 `abstract` 构造签名，允许传入抽象类
- Mixin 模式中 `GConstructor<T> = new (...args: any[]) => T` 是常用的泛型构造签名
- 同一个接口可以同时有调用签名和构造签名（如 JavaScript 的 Date）

### 总结

构造签名用 `new (...args): T` 语法描述可以被 new 调用的对象（类/构造函数）。它解决了"把类本身作为参数传递"的类型描述问题，广泛用于工厂模式、依赖注入和 Mixin 模式。和调用签名的区别是：构造签名描述 `new Fn()`，调用签名描述 `fn()`。TypeScript 4.2+ 支持 abstract 构造签名，允许传入抽象类作为参数。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## interface的索引签名属性

### 概念定义

接口中的索引签名用于描述对象的动态属性——当属性名不确定时，通过索引签名定义所有动态键的值类型。接口支持字符串索引签名 `[key: string]: T` 和数字索引签名 `[key: number]: T`，也可以将索引签名与固定属性混合使用。

在接口中定义索引签名时，所有固定属性的类型必须是索引签名值类型的子类型。这是因为 JavaScript 中用字符串或数字访问属性最终都走同一套机制，TypeScript 需要确保类型一致性。

### 语法与用法

```typescript
// 字符串索引签名
interface StringDictionary {
    [key: string]: string;
}

const dict: StringDictionary = {
    hello: "你好",
    world: "世界",
};

// 数字索引签名
interface NumberIndexed {
    [index: number]: string;
}

const arr: NumberIndexed = {
    0: "第一个",
    1: "第二个",
};

// 混合固定属性和索引签名
interface MixedConfig {
    name: string;                  // 固定属性，类型必须兼容索引签名
    version: number;               // 固定属性
    [key: string]: string | number; // 索引签名：值类型包含 string 和 number
}
```

### 基本示例

```typescript
// 主题配置接口
interface ThemeColors {
    primary: string;
    secondary: string;
    [colorName: string]: string;  // 允许任意自定义颜色
}

const theme: ThemeColors = {
    primary: "#1890ff",
    secondary: "#52c41a",
    warning: "#faad14",     // 自定义颜色
    danger: "#ff4d4f",      // 自定义颜色
};

// 环境变量接口
interface ProcessEnv {
    NODE_ENV: "development" | "production" | "test";
    PORT?: string;
    [key: string]: string | undefined;  // 其他环境变量
}

// 类数组接口
interface ArrayLikeObj<T> {
    readonly length: number;
    [index: number]: T;
}

const items: ArrayLikeObj<string> = {
    0: "a",
    1: "b",
    2: "c",
    length: 3,
};
```

### 进阶用法

```typescript
// 只读索引签名
interface ReadonlyStringMap {
    readonly [key: string]: string;
}

const map: ReadonlyStringMap = { a: "1", b: "2" };
// map.a = "3";    // 编译错误：只读索引签名
// map.c = "4";    // 编译错误

// 模板字面量索引签名（TypeScript 4.4+）
interface DataAttributes {
    [key: `data-${string}`]: string;
}

const attrs: DataAttributes = {
    "data-id": "123",
    "data-name": "widget",
};

// 同时有字符串和数字索引签名
interface HybridCollection {
    [key: string]: string | number;  // 字符串索引
    [index: number]: string;          // 数字索引（必须是字符串索引值类型的子类型）
    length: number;                   // 固定属性
}

// 索引签名配合泛型
interface TypedMap<V> {
    [key: string]: V;
}

const numberMap: TypedMap<number> = { a: 1, b: 2, c: 3 };
const boolMap: TypedMap<boolean> = { enabled: true, visible: false };
```

### 适用场景

- **字典/映射：** 键名不确定的键值对集合
- **配置扩展：** 已知配置项加上自定义扩展项
- **CSS 样式对象：** CSS 属性名作为动态键
- **类数组对象：** 数字索引加 length 属性

### 常见问题

#### 固定属性类型和索引签名冲突

固定属性的类型必须是索引签名值类型的子类型。解决方法是扩大索引签名的值类型。

```typescript
// 错误：number 不是 string 的子类型
// interface Bad {
//     count: number;
//     [key: string]: string;
// }

// 正确：索引签名值类型包含 number
interface Good {
    count: number;
    [key: string]: string | number;
}
```

#### 索引签名和 Record 哪个更好

Record\&lt;string, T\> 是索引签名的简写形式，两者在类型层面等价。interface 中只能用索引签名语法，type 别名中两种都可以用。Record 更适合独立定义，索引签名适合在 interface 中和其他属性混用。

### 注意事项

- 固定属性的类型必须兼容索引签名的值类型
- 数字索引签名的值类型必须是字符串索引签名值类型的子类型
- readonly 可以应用于索引签名，禁止动态添加和修改属性
- `noUncheckedIndexedAccess` 编译选项让索引访问返回 `T | undefined`
- 模板字面量索引签名（TypeScript 4.4+）可以限制键名模式

### 总结

接口的索引签名用于描述动态键名的属性类型，支持字符串索引和数字索引。固定属性和索引签名混用时，固定属性类型必须兼容索引签名值类型。readonly 索引签名禁止修改。模板字面量索引签名可以限制键名模式。推荐开启 `noUncheckedIndexedAccess` 获得更安全的索引访问。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## interface的继承(extends)

### 概念定义

TypeScript 接口可以通过 `extends` 关键字继承一个或多个其他接口，子接口会获得父接口的所有属性和方法，并可以添加新的属性或覆盖父接口中兼容的属性类型。接口继承是 TypeScript 中组织和复用类型定义的核心机制。

接口支持多继承——一个接口可以同时 extends 多个接口，用逗号分隔。子接口必须满足所有父接口的要求，如果多个父接口有同名属性，它们的类型必须兼容。

### 语法与用法

```typescript
// 单继承
interface Animal {
    name: string;
    age: number;
}

interface Dog extends Animal {
    breed: string;      // 新增属性
    bark(): void;       // 新增方法
}

// Dog 拥有 name、age、breed 和 bark
const dog: Dog = {
    name: "旺财",
    age: 3,
    breed: "金毛",
    bark() { console.log("汪汪"); },
};

// 多继承
interface Serializable {
    serialize(): string;
}

interface Printable {
    print(): void;
}

interface Document extends Serializable, Printable {
    title: string;
    content: string;
}

// Document 同时拥有 serialize、print、title、content
const doc: Document = {
    title: "报告",
    content: "内容...",
    serialize() { return JSON.stringify({ title: this.title }); },
    print() { console.log(this.title); },
};
```

### 基本示例

```typescript
// 层级继承：多层接口链
interface BaseEntity {
    id: number;
    createdAt: Date;
    updatedAt: Date;
}

interface User extends BaseEntity {
    name: string;
    email: string;
}

interface Admin extends User {
    permissions: string[];
    role: "super_admin" | "admin";
}

// Admin 拥有 BaseEntity + User + 自身的所有属性
const admin: Admin = {
    id: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    name: "管理员",
    email: "admin@example.com",
    permissions: ["read", "write", "delete"],
    role: "super_admin",
};

// 接口继承类
class Point {
    x: number = 0;
    y: number = 0;
}

interface Point3D extends Point {
    z: number;
}

const point: Point3D = { x: 1, y: 2, z: 3 };
```

### 进阶用法

```typescript
// 属性类型覆盖（子接口属性类型必须是父接口的子类型）
interface Shape {
    color: string;
    area(): number;
}

interface Circle extends Shape {
    color: "red" | "blue";  // 窄化为字面量联合类型（string 的子类型，合法）
    radius: number;
    area(): number;
}

// 泛型接口继承
interface Repository<T> {
    findAll(): Promise<T[]>;
    findById(id: number): Promise<T | null>;
}

interface CrudRepository<T> extends Repository<T> {
    save(entity: T): Promise<T>;
    delete(id: number): Promise<void>;
}

interface User {
    id: number;
    name: string;
}

// 使用时传入具体类型
const userRepo: CrudRepository<User> = {
    async findAll() { return []; },
    async findById(id) { return null; },
    async save(entity) { return entity; },
    async delete(id) { console.log(`删除 ${id}`); },
};

// 多继承时同名属性类型必须兼容
interface A { shared: string }
interface B { shared: string }
interface AB extends A, B { }  // 合法：shared 类型一致

// interface C { shared: number }
// interface AC extends A, C { }  // 编译错误：shared 类型冲突
```

### 与其他继承方式的对比

| 对比维度 | interface extends | type 交叉 & | class extends |
|----------|------------------|-------------|---------------|
| 多继承 | 支持（逗号分隔） | 支持（& 连接） | 不支持（单继承） |
| 属性冲突 | 编译报错 | 静默合并为交叉（可能 never） | 编译报错 |
| 运行时 | 无 | 无 | 有原型链 |
| 声明合并 | 支持 | 不支持 | 不支持 |

### 适用场景

- **领域模型层级：** BaseEntity → User → Admin 的继承链
- **通用仓储模式：** Repository → CrudRepository → 具体实体仓储
- **组件 Props 扩展：** 基础 Props → 特定组件 Props
- **API 类型复用：** 基础响应 → 分页响应 → 具体业务响应

### 常见问题

#### 继承时属性类型可以改变吗

子接口可以重新声明父接口的属性，但新类型必须是原类型的子类型（窄化）。不能把 string 改成 number。

#### 多继承冲突怎么处理

如果两个父接口有同名属性但类型不同，编译器会报错。解决方法是确保所有父接口的同名属性类型兼容，或在子接口中重新声明一个兼容的类型。

### 注意事项

- 接口继承是编译期的类型组合，不产生运行时代码
- 子接口属性类型只能窄化，不能改为不兼容的类型
- 多继承时同名属性类型必须兼容
- 接口可以继承类（会继承类的实例属性和方法的类型，但不包括实现）
- 深层继承链不要太深，建议控制在 3-4 层以内

### 总结

接口通过 extends 实现单继承和多继承，子接口获得父接口的所有属性并可以添加新属性或窄化已有属性类型。多继承时同名属性类型必须兼容。和交叉类型的区别是：extends 在冲突时编译报错（更安全），交叉类型静默合并（可能产生 never）。广泛用于领域模型层级、仓储模式和组件 Props 扩展。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## interface的声明合并(Declaration Merging)

### 概念定义

声明合并（Declaration Merging）是 TypeScript 的一个独特特性：当同一作用域中出现多个同名的 interface 声明时，编译器会自动将它们的属性合并为一个接口。最终的接口包含所有声明中的所有属性和方法。

这个特性是 interface 和 type 的核心区别之一——type 不支持声明合并，同名 type 会直接报错。声明合并在扩展第三方库的类型定义、全局类型扩充等场景中非常有用。

### 语法与用法

```typescript
// 同名 interface 自动合并
interface User {
    id: number;
    name: string;
}

interface User {
    email: string;
    age: number;
}

// 合并后的 User 拥有所有属性
const user: User = {
    id: 1,
    name: "张三",
    email: "zhang@example.com",
    age: 25,
};
// 缺少任何一个属性都会报错
```

### 基本示例

```typescript
// 扩展第三方库的类型
// 假设第三方库定义了 Window 接口
// 我们可以通过声明合并添加自定义属性

// 在 global.d.ts 中
interface Window {
    __APP_CONFIG__: {
        apiUrl: string;
        version: string;
    };
    analytics: {
        track(event: string, data?: Record<string, unknown>): void;
    };
}

// 现在可以类型安全地访问
// window.__APP_CONFIG__.apiUrl
// window.analytics.track("page_view")

// 扩展 Express 的 Request 类型
// 在 types/express.d.ts 中
declare namespace Express {
    interface Request {
        user?: {
            id: number;
            role: string;
        };
        sessionId?: string;
    }
}

// 合并方法签名时的顺序规则
interface Logger {
    log(message: string): void;
}

interface Logger {
    log(message: string, level: string): void;
    log(message: string, level: string, timestamp: Date): void;
}

// 合并后，后声明的签名排在前面（优先匹配）
// 等价于：
// interface Logger {
//     log(message: string, level: string, timestamp: Date): void;
//     log(message: string, level: string): void;
//     log(message: string): void;
// }
```

### 进阶用法

```typescript
// 泛型接口的声明合并
interface Container<T> {
    value: T;
}

interface Container<T> {
    clone(): Container<T>;
}

// 合并后
const container: Container<string> = {
    value: "hello",
    clone() {
        return { value: this.value, clone: this.clone };
    },
};

// 枚举和命名空间也支持声明合并
enum Color {
    Red = "RED",
    Green = "GREEN",
}

// 命名空间可以和枚举合并，添加静态方法
namespace Color {
    export function fromHex(hex: string): Color {
        if (hex === "#ff0000") return Color.Red;
        return Color.Green;
    }
}

Color.fromHex("#ff0000");  // Color.Red

// 类和命名空间合并（给类添加静态属性）
class Album {
    label: Album.AlbumLabel = { name: "默认", address: "" };
}

namespace Album {
    export interface AlbumLabel {
        name: string;
        address: string;
    }
}

const album = new Album();
console.log(album.label.name);
```

### 声明合并的规则

| 合并场景 | 是否支持 | 规则 |
|---------|---------|------|
| interface + interface | 支持 | 属性合并，同名属性类型必须一致 |
| namespace + namespace | 支持 | 导出成员合并 |
| class + namespace | 支持 | 命名空间成员成为类的静态成员 |
| enum + namespace | 支持 | 命名空间成员成为枚举的静态方法 |
| function + namespace | 支持 | 命名空间成员成为函数的属性 |
| type + type | 不支持 | 同名 type 编译报错 |

### 适用场景

- **扩展第三方库类型：** 给 Window、Document、Express.Request 等添加自定义属性
- **插件系统类型：** 插件注册时扩展核心接口的类型
- **渐进式类型定义：** 在不同文件中逐步完善一个接口的定义
- **全局类型声明：** 在 .d.ts 文件中扩充全局类型

### 常见问题

#### 合并时属性类型冲突怎么办

同名属性的类型必须完全一致，否则编译报错。这是声明合并的安全机制。

```typescript
interface Config {
    port: number;
}

// interface Config {
//     port: string;  // 编译错误：后续声明中 port 类型必须和之前一致
// }
```

#### 声明合并和继承的区别

声明合并是"补充"同一个接口的属性，继承是创建一个新接口并获得父接口的属性。声明合并不创建新类型，继承创建新类型。

### 注意事项

- 同名属性类型必须完全一致，不能有冲突
- 方法签名合并时，后声明的排在前面（优先级更高）
- type 不支持声明合并，这是 interface 的独有特性
- 声明合并在 .d.ts 类型声明文件中最为常用
- 过度使用声明合并会让接口定义分散在多处，降低可读性

### 总结

声明合并是 interface 的独有特性，同名接口自动合并所有属性。同名属性类型必须一致，方法签名后声明的优先级更高。最常用于扩展第三方库类型（如 Window、Express.Request）和全局类型声明。type 不支持声明合并。声明合并虽然强大，但应避免过度使用导致接口定义分散。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 模块扩充(Module Augmentation)

### 概念定义

模块扩充（Module Augmentation）是 TypeScript 中在不修改原始模块代码的情况下，给已有模块添加新的类型声明的机制。通过 `declare module "模块名"` 语法，可以向第三方库或项目内的其他模块添加新的导出类型、接口属性或函数声明。

模块扩充建立在声明合并的基础上——在 `declare module` 块中声明的同名接口会和原模块中的接口自动合并。这让开发者能够在不 fork 第三方库的前提下扩展其类型定义，是 TypeScript 生态中类型补丁和插件系统的核心机制。

### 语法与用法

```typescript
// 扩充第三方模块的类型
// 文件：types/express-augment.d.ts

import { Request } from "express";

// declare module 必须在模块文件中（有 import/export 的文件）
declare module "express" {
    interface Request {
        user?: {
            id: number;
            name: string;
            role: string;
        };
        requestId?: string;
    }
}

// 现在 Express 的 Request 对象上可以类型安全地访问 user 和 requestId
// app.get("/api", (req, res) => {
//     console.log(req.user?.name);     // 类型安全
//     console.log(req.requestId);       // 类型安全
// });
```

### 基本示例

```typescript
// 扩充 Vue Router 的路由元信息
// 文件：types/vue-router.d.ts
import "vue-router";

declare module "vue-router" {
    interface RouteMeta {
        requiresAuth?: boolean;
        title?: string;
        permissions?: string[];
    }
}

// 扩充全局模块（global augmentation）
// 给 String.prototype 添加自定义方法的类型
export {};  // 确保文件是模块

declare global {
    interface String {
        toCapitalCase(): string;
    }

    interface Window {
        __INITIAL_STATE__: Record<string, unknown>;
    }
}

// 扩充项目内部模块
// 假设项目中有 src/config.ts 导出了 Config 接口

// 在 src/plugins/auth-config.ts 中
declare module "../config" {
    interface Config {
        auth: {
            provider: string;
            clientId: string;
        };
    }
}
```

### 进阶用法

```typescript
// 扩充 Axios 的类型
import "axios";

declare module "axios" {
    interface AxiosRequestConfig {
        retry?: number;
        retryDelay?: number;
        __retryCount?: number;
    }
}

// 使用时
// axios.get("/api/data", { retry: 3, retryDelay: 1000 });

// 扩充 CSS Modules 的类型
declare module "*.module.css" {
    const classes: Record<string, string>;
    export default classes;
}

declare module "*.module.scss" {
    const classes: Record<string, string>;
    export default classes;
}

// 扩充静态资源的导入类型
declare module "*.svg" {
    const content: string;
    export default content;
}

declare module "*.png" {
    const content: string;
    export default content;
}

// 扩充环境变量类型（Vite 项目）
/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string;
    readonly VITE_APP_TITLE: string;
    readonly VITE_DEBUG: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
```

### 模块扩充 vs 全局扩充

| 对比维度 | 模块扩充 `declare module "x"` | 全局扩充 `declare global` |
|----------|------------------------------|--------------------------|
| 作用范围 | 特定模块 | 全局作用域 |
| 前置条件 | 文件必须是模块（有 import/export） | 文件必须是模块 |
| 扩充对象 | 第三方模块的导出类型 | Window、String 等全局类型 |
| 典型用途 | Express Request、Vue Router Meta | 全局变量、原型方法类型 |

### 适用场景

- **Express/Koa 中间件：** 给 Request 对象添加自定义属性
- **Vue/React 插件：** 给框架核心类型添加插件提供的属性
- **静态资源导入：** 声明 .svg、.png、.css 等文件的导入类型
- **环境变量：** 声明 process.env 或 import.meta.env 的自定义变量类型

### 常见问题

#### 模块扩充不生效

确保声明文件是模块文件（包含 import 或 export 语句）。如果文件中没有任何 import/export，添加 `export {}` 让它成为模块。同时确保 tsconfig.json 的 `include` 包含了声明文件。

#### 模块扩充和 .d.ts 文件的关系

模块扩充通常写在 .d.ts 声明文件中，但也可以写在普通 .ts 文件中。.d.ts 文件的优势是不会编译为 JavaScript，纯粹用于类型声明。

### 注意事项

- 模块扩充只能添加新的声明，不能修改已有声明的类型
- 文件必须是模块（有 import/export），否则 declare module 会被当作环境声明
- 模块名必须和原始模块的导入路径完全匹配
- 全局扩充用 `declare global { }` 语法，必须在模块文件中
- 确保 tsconfig.json 的 include 配置包含了类型声明文件

### 总结

模块扩充通过 `declare module "模块名"` 在不修改原始代码的情况下扩展第三方模块的类型定义。它建立在接口声明合并的基础上，是 TypeScript 插件系统和类型补丁的核心机制。全局扩充用 `declare global` 扩展全局类型。两者都要求文件是模块。广泛用于 Express 中间件、Vue/React 插件、静态资源导入和环境变量的类型声明。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## type的类型别名定义

### 概念定义

type 关键字用于创建类型别名（Type Alias），它为任何类型表达式起一个新名字。类型别名不创建新类型，只是引用已有类型的快捷方式。和 interface 不同的是，type 可以给原始类型、联合类型、交叉类型、元组、函数类型等任意类型表达式起别名，而不仅限于对象类型。

类型别名在编译后完全消失，不产生任何 JavaScript 代码。它是 TypeScript 类型系统中最灵活的类型定义方式。

### 语法与用法

```typescript
// 原始类型别名
type ID = string | number;
type Name = string;

// 对象类型别名
type User = {
    id: ID;
    name: Name;
    email: string;
};

// 联合类型别名
type Status = "idle" | "loading" | "success" | "error";

// 元组类型别名
type Point = [number, number];
type Point3D = [number, number, number];

// 函数类型别名
type Callback = (error: Error | null, data: string) => void;
type Predicate<T> = (item: T) => boolean;

// 使用类型别名
const userId: ID = "abc-123";
const status: Status = "loading";
const origin: Point = [0, 0];
```

### 基本示例

```typescript
// 复杂联合类型起别名，提高可读性
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
type StatusCode = 200 | 201 | 204 | 400 | 401 | 403 | 404 | 500;

// 工具类型组合
type Nullable<T> = T | null;
type Optional<T> = T | undefined;
type Maybe<T> = T | null | undefined;

let name: Nullable<string> = null;
let age: Optional<number> = undefined;
let data: Maybe<string> = null;

// 对象类型别名
type ApiResponse<T> = {
    code: StatusCode;
    message: string;
    data: T;
    timestamp: number;
};

type UserListResponse = ApiResponse<User[]>;
type UserDetailResponse = ApiResponse<User>;

// 条件类型别名
type IsString<T> = T extends string ? true : false;

type A = IsString<string>;   // true
type B = IsString<number>;   // false

// 从现有类型派生新类型
type UserKeys = keyof User;              // "id" | "name" | "email"
type UserName = User["name"];             // string
type PartialUser = Partial<User>;         // 所有属性可选
type ReadonlyUser = Readonly<User>;       // 所有属性只读
```

### 进阶用法

```typescript
// 递归类型别名
type JSONValue =
    | string
    | number
    | boolean
    | null
    | JSONValue[]
    | { [key: string]: JSONValue };

const json: JSONValue = {
    name: "张三",
    age: 25,
    hobbies: ["编程", "阅读"],
    address: { city: "北京", street: "中关村" },
};

// 模板字面量类型别名
type EventName = `on${Capitalize<"click" | "focus" | "blur">}`;
// "onClick" | "onFocus" | "onBlur"

// 映射类型别名
type Getters<T> = {
    [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type UserGetters = Getters<User>;
// { getId: () => ID; getName: () => Name; getEmail: () => string }

// 条件类型 + infer 提取类型
type UnpackPromise<T> = T extends Promise<infer U> ? U : T;

type Resolved = UnpackPromise<Promise<string>>;  // string
type Same = UnpackPromise<number>;                 // number
```

### 适用场景

- **联合类型命名：** 给复杂的联合类型起一个有语义的名字
- **泛型工具类型：** 定义可复用的泛型类型转换工具
- **函数签名：** 给回调函数、事件处理器等函数类型起别名
- **类型运算结果：** 将条件类型、映射类型等复杂类型运算的结果命名

### 常见问题

#### type 和 interface 如何选择

对象类型两者都可以，interface 支持声明合并和 extends 继承，type 支持联合、交叉、条件、映射等高级类型操作。简单对象类型用 interface，复杂类型运算用 type。

#### type 可以递归引用自己吗

可以。TypeScript 支持递归类型别名，如 JSON 值类型、树结构类型等。但要注意避免无限递归导致编译器栈溢出。

### 注意事项

- type 不支持声明合并，同名 type 会编译报错
- type 编译后完全消失，不产生运行时代码
- type 可以给任何类型表达式起别名，不限于对象类型
- 递归类型别名要注意深度限制
- type 和 interface 在大多数场景下可以互换，选择一种风格并保持一致

### 总结

type 关键字创建类型别名，可以为任意类型表达式起名字，包括原始类型、联合类型、交叉类型、元组、函数类型和复杂的类型运算结果。type 比 interface 更灵活，支持联合、条件、映射等高级类型操作，但不支持声明合并。简单对象类型建议用 interface，复杂类型运算用 type。两者都是编译期特性，不产生运行时代码。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## type与interface的异同对比

### 概念定义

type（类型别名）和 interface（接口）是 TypeScript 中定义类型的两种核心方式。两者在描述对象类型时几乎可以互换，但在能力边界、扩展方式和适用场景上有明确的区别。理解它们的异同是 TypeScript 开发中最基础也最高频的知识点之一。

### 相同点

```typescript
// 两者都可以描述对象类型
interface UserI {
    id: number;
    name: string;
}

type UserT = {
    id: number;
    name: string;
};

// 两者都可以描述函数类型
interface FnI {
    (x: number, y: number): number;
}

type FnT = (x: number, y: number) => number;

// 两者都支持泛型
interface BoxI<T> {
    value: T;
}

type BoxT<T> = {
    value: T;
};

// 两者都可以被 class implements
class UserImpl implements UserI {
    id = 1;
    name = "张三";
}

class UserImpl2 implements UserT {
    id = 2;
    name = "李四";
}

// 两者可以互相扩展
interface ExtendedFromType extends UserT {
    email: string;
}

type ExtendedFromInterface = UserI & {
    email: string;
};
```

### 核心区别

| 对比维度 | interface | type |
|----------|-----------|------|
| 声明合并 | 支持（同名自动合并） | 不支持（同名报错） |
| 扩展方式 | extends 继承 | & 交叉类型 |
| 原始类型别名 | 不支持 | 支持（`type ID = string`） |
| 联合类型 | 不支持 | 支持（`type A = B \| C`） |
| 元组类型 | 不直接支持 | 支持（`type T = [string, number]`） |
| 映射类型 | 不支持 | 支持（`{ [K in keyof T]: ... }`） |
| 条件类型 | 不支持 | 支持（`T extends U ? X : Y`） |
| 计算属性名 | 不支持 | 支持（模板字面量键名） |
| 错误信息 | 显示接口名 | 可能展开为内联类型 |
| 性能 | 编译器内部有缓存优化 | 复杂类型运算可能较慢 |

### 基本示例

```typescript
// interface 独有：声明合并
interface Config {
    apiUrl: string;
}
interface Config {
    timeout: number;
}
// Config = { apiUrl: string; timeout: number }

// type 不能声明合并
// type Settings = { a: string };
// type Settings = { b: number };  // 编译错误：重复标识符

// type 独有：联合类型
type Result = "success" | "error";
// interface 无法定义联合类型

// type 独有：条件类型
type IsArray<T> = T extends any[] ? true : false;
type A = IsArray<number[]>;  // true
type B = IsArray<string>;    // false

// type 独有：映射类型
type ReadonlyMap<T> = {
    readonly [K in keyof T]: T[K];
};

// type 独有：从现有值提取类型
const defaults = { host: "localhost", port: 3000 };
type Defaults = typeof defaults;
// { host: string; port: number }
```

### 进阶对比

```typescript
// extends vs & 在属性冲突时的行为差异

// interface extends：冲突时编译报错（更安全）
interface Base { id: string }
// interface Child extends Base { id: number }
// 编译错误：id 类型不兼容

// type &：冲突时静默合并为交叉类型（可能产生 never）
type BaseT = { id: string };
type ChildT = BaseT & { id: number };
// ChildT.id 的类型是 string & number = never
// 不报错，但实际不可能有合法值

// 错误信息的差异
interface UserInterface {
    name: string;
}

type UserType = {
    name: string;
};

// 类型不匹配时，interface 显示接口名
// "Type X is not assignable to type 'UserInterface'"
// type 可能展开为内联结构
// "Type X is not assignable to type '{ name: string }'"
```

### 选择建议

```typescript
// 用 interface 的场景：
// 1. 定义对象/类的公共 API 形状
interface Repository<T> {
    findById(id: number): Promise<T>;
    save(entity: T): Promise<T>;
}

// 2. 需要声明合并（扩展第三方库类型）
declare module "express" {
    interface Request {
        user?: { id: number };
    }
}

// 3. 类的 implements
class UserRepo implements Repository<User> {
    async findById(id: number) { return { id, name: "张三" }; }
    async save(entity: User) { return entity; }
}

// 用 type 的场景：
// 1. 联合类型
type Theme = "light" | "dark" | "system";

// 2. 元组类型
type Coordinate = [number, number];

// 3. 工具类型和类型运算
type Nullable<T> = T | null;
type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

// 4. 从值提取类型
const routes = ["/home", "/about", "/contact"] as const;
type Route = typeof routes[number];
```

### 适用场景

- **interface：** 对象形状定义、API 接口、class implements、需要声明合并的场景
- **type：** 联合类型、元组、条件类型、映射类型、工具类型、从值提取类型

### 常见问题

#### 团队应该统一用哪个

推荐的策略是：对象类型优先用 interface（利用声明合并和更好的错误信息），非对象类型和类型运算用 type。保持团队风格一致即可，可以用 ESLint 的 `@typescript-eslint/consistent-type-definitions` 规则强制。

#### 性能有差异吗

interface 在编译器内部有命名缓存优化，复杂类型时 interface 的编译性能略好。但在实际项目中，差异几乎不可感知，不应作为选择的主要依据。

### 注意事项

- interface 的属性冲突在 extends 时编译报错，type 的 & 交叉可能静默产生 never
- interface 的错误信息通常更清晰（显示接口名），type 可能展开为内联结构
- 两者可以互相引用和扩展，不需要强制统一
- 复杂的类型编程（条件类型、映射类型、递归类型）只能用 type
- 扩展第三方库类型只能用 interface（依赖声明合并）

### 总结

type 和 interface 在描述对象类型时几乎等价，核心区别是：interface 支持声明合并和 extends 继承，type 支持联合类型、条件类型、映射类型等高级类型操作。interface 在属性冲突时编译报错更安全，type 的 & 交叉可能静默产生 never。推荐策略：对象类型优先 interface，非对象类型和类型运算用 type。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## type的交叉类型(&)

### 概念定义

交叉类型使用 `&` 运算符将多个类型合并为一个类型，新类型同时拥有所有参与类型的属性和方法。在 type 别名中，交叉类型是实现类型扩展和组合的主要方式，作用类似于 interface 的 extends 继承。

对于对象类型，交叉是"属性合并"；对于原始类型，交叉通常产生 never（一个值不可能同时是两种原始类型）。交叉类型在 Mixin、类型扩展、增强已有类型等场景中非常常用。

### 语法与用法

```typescript
// 基本交叉：合并对象属性
type HasId = { id: number };
type HasName = { name: string };
type HasEmail = { email: string };

type User = HasId & HasName & HasEmail;
// 等价于 { id: number; name: string; email: string }

const user: User = {
    id: 1,
    name: "张三",
    email: "zhang@example.com",
};
```

### 基本示例

```typescript
// 给已有类型添加属性
type BaseEntity = {
    id: number;
    createdAt: Date;
    updatedAt: Date;
};

type UserData = {
    name: string;
    email: string;
    role: "admin" | "user";
};

// 组合为完整的用户类型
type FullUser = BaseEntity & UserData;

const fullUser: FullUser = {
    id: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    name: "张三",
    email: "zhang@example.com",
    role: "admin",
};

// 泛型交叉：通用的类型增强
type WithTimestamp<T> = T & {
    createdAt: Date;
    updatedAt: Date;
};

type WithSoftDelete<T> = T & {
    deletedAt: Date | null;
    isDeleted: boolean;
};

type Article = {
    title: string;
    content: string;
};

// 层层增强
type PersistentArticle = WithTimestamp<WithSoftDelete<Article>>;
// { title: string; content: string; deletedAt: Date | null; isDeleted: boolean; createdAt: Date; updatedAt: Date }
```

### 进阶用法

```typescript
// 函数类型的交叉产生重载效果
type StringFn = (input: string) => string;
type NumberFn = (input: number) => number;
type OverloadedFn = StringFn & NumberFn;

// 交叉类型在 React Props 中的应用
type ButtonBaseProps = {
    onClick: () => void;
    disabled?: boolean;
    className?: string;
};

type IconButtonProps = ButtonBaseProps & {
    icon: string;
    iconPosition?: "left" | "right";
};

type LoadingButtonProps = ButtonBaseProps & {
    loading: boolean;
    loadingText?: string;
};

// 属性类型冲突时的行为
type A = { value: string };
type B = { value: number };
type AB = A & B;
// AB.value 的类型是 string & number = never
// 实际上不可能创建 AB 类型的值

// 正确的方式：确保同名属性类型兼容
type SafeA = { value: string | number };
type SafeB = { value: string };
type SafeAB = SafeA & SafeB;
// SafeAB.value 的类型是 (string | number) & string = string
```

### 交叉类型的运算规则

| 运算 | 结果 | 说明 |
|------|------|------|
| `{a: T} & {b: U}` | `{a: T; b: U}` | 不同属性合并 |
| `{a: T} & {a: U}` | `{a: T & U}` | 同名属性交叉 |
| `string & number` | `never` | 不兼容原始类型 |
| `T & never` | `never` | never 吞噬一切 |
| `T & unknown` | `T` | unknown 是恒等元素 |
| `T & any` | `any` | any 吞噬一切（除 never） |

### 适用场景

- **类型扩展：** 给已有类型添加额外属性（时间戳、软删除标记等）
- **Mixin 类型：** 将多个功能片段组合为一个完整类型
- **Props 组合：** React/Vue 组件 Props 的层级组合
- **泛型增强：** 通用的类型增强函数（WithTimestamp、WithPagination 等）

### 常见问题

#### 交叉类型和 interface extends 哪个更好

interface extends 在属性冲突时编译报错，交叉类型静默合并为 never。如果类型层级明确，推荐 interface extends；如果需要灵活组合多个类型片段，用交叉类型。

#### 交叉类型属性冲突怎么处理

确保参与交叉的类型没有同名但不兼容的属性。如果有，考虑用 Omit 先排除冲突属性再交叉。

```typescript
type A = { id: string; name: string };
type B = { id: number; email: string };

// 排除 B 的 id，使用 A 的 id
type Merged = A & Omit<B, "id">;
// { id: string; name: string; email: string }
```

### 注意事项

- 同名属性类型不兼容时交叉为 never，不会报编译错误
- `T & never` 等于 never，`T & unknown` 等于 T
- 交叉类型适合组合型的类型扩展，继承型的扩展用 interface extends
- 用 Omit 排除冲突属性后再交叉是常见的安全模式
- 过多的交叉层级会影响类型推断的可读性和编译性能

### 总结

type 的交叉类型用 `&` 将多个类型合并为一个，对象类型是属性合并，同名属性类型进一步交叉。它是 type 别名中实现类型扩展的主要方式，等价于 interface 的 extends。核心注意点是同名属性冲突会静默产生 never 而不报错，用 Omit 排除冲突属性是安全的解决方案。广泛用于类型增强、Mixin 组合和组件 Props 扩展。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## type的联合类型(|)

### 概念定义

联合类型是 type 别名中最常用的类型组合方式，使用 `|` 运算符将多个类型组合为"或"关系。联合类型表示值可以是其中任意一种类型。这是 interface 无法直接实现的能力——interface 只能描述单个对象形状，不能描述"A 或 B"的关系。

联合类型是 TypeScript 类型收窄、可辨识联合和模式匹配的基础，在日常开发中使用频率极高。

### 语法与用法

```typescript
// 原始类型联合
type StringOrNumber = string | number;

// 字面量联合
type Direction = "up" | "down" | "left" | "right";
type HttpStatus = 200 | 201 | 400 | 404 | 500;

// 对象类型联合
type Shape =
    | { kind: "circle"; radius: number }
    | { kind: "rectangle"; width: number; height: number };

// 使用联合类型
let value: StringOrNumber = "hello";
value = 42;       // 合法
// value = true;  // 编译错误
```

### 基本示例

```typescript
// 可辨识联合（Discriminated Union）
type ApiResult<T> =
    | { status: "success"; data: T }
    | { status: "error"; error: string }
    | { status: "loading" };

function handleResult(result: ApiResult<string>): string {
    switch (result.status) {
        case "success":
            // result 被窄化为 { status: "success"; data: string }
            return result.data;
        case "error":
            // result 被窄化为 { status: "error"; error: string }
            return `错误: ${result.error}`;
        case "loading":
            return "加载中...";
    }
}

// 函数参数的灵活输入
type Input = string | string[] | Record<string, string>;

function normalize(input: Input): string[] {
    if (typeof input === "string") {
        return [input];
    }
    if (Array.isArray(input)) {
        return input;
    }
    return Object.values(input);
}

normalize("hello");                    // ["hello"]
normalize(["a", "b"]);                 // ["a", "b"]
normalize({ x: "1", y: "2" });        // ["1", "2"]

// 从常量数组提取联合类型
const ROLES = ["admin", "editor", "viewer"] as const;
type Role = typeof ROLES[number];  // "admin" | "editor" | "viewer"
```

### 进阶用法

```typescript
// 条件类型中联合类型的分发特性
type ToArray<T> = T extends any ? T[] : never;

type Result = ToArray<string | number>;
// string[] | number[]（分发：每个成员单独套 T[]，再联合）

// 阻止分发：用元组包裹
type ToArrayNoDistribute<T> = [T] extends [any] ? T[] : never;
type Result2 = ToArrayNoDistribute<string | number>;
// (string | number)[]（不分发）

// 联合类型的类型运算
type MyExclude<T, U> = T extends U ? never : T;
type MyExtract<T, U> = T extends U ? T : never;

type Animals = "cat" | "dog" | "bird" | "fish";
type Pets = "cat" | "dog" | "hamster";

type WildAnimals = MyExclude<Animals, Pets>;   // "bird" | "fish"
type CommonPets = MyExtract<Animals, Pets>;     // "cat" | "dog"

// 可辨识联合配合穷尽检查
type Action =
    | { type: "INCREMENT"; payload: number }
    | { type: "DECREMENT"; payload: number }
    | { type: "RESET" };

function reducer(state: number, action: Action): number {
    switch (action.type) {
        case "INCREMENT":
            return state + action.payload;
        case "DECREMENT":
            return state - action.payload;
        case "RESET":
            return 0;
        default:
            // 穷尽检查：如果漏掉了某个 action，这里会编译报错
            const exhaustive: never = action;
            return state;
    }
}
```

### 联合类型与交叉类型的关系

| 运算 | 语法 | 含义 | 对象类型效果 |
|------|------|------|-------------|
| 联合 | A \| B | A 或 B | 值是其中一种形状 |
| 交叉 | A & B | A 且 B | 合并所有属性 |
| 组合 | (A & B) \| C | (A且B) 或 C | 分组组合 |

### 适用场景

- **状态机：** 用可辨识联合表示有限状态集合
- **Redux Action：** 每个 action 类型对应不同的 payload
- **API 响应：** 成功/失败/加载中等不同形态的响应
- **灵活参数：** 函数接受多种类型的输入

### 常见问题

#### 联合类型成员太多怎么办

联合类型成员数量没有硬性限制，但超过数百个时编译性能可能下降。可以考虑用索引签名、Record 或枚举替代超大联合类型。

#### 联合类型的值只能访问共有属性吗

是的，未做类型收窄前只能访问所有成员类型共有的属性和方法。用 typeof、instanceof、in 操作符或可辨识属性做收窄后，就可以访问特定类型的属性。

### 注意事项

- 联合类型只能用 type 定义，interface 不支持
- 使用联合类型的值前需要做类型收窄
- 条件类型中联合类型有分发特性，用 `[T]` 包裹可阻止
- `T | never` 等于 `T`，never 在联合中被消除
- 可辨识联合是联合类型最强大的模式，推荐在状态管理和 API 响应中使用

### 总结

type 的联合类型用 `|` 将多个类型组合为"或"关系，是 interface 无法直接实现的能力。联合类型在使用前需要类型收窄，可辨识联合通过字面量属性实现自动窄化。联合类型在条件类型中有分发特性。广泛用于状态机、Redux Action、API 响应和灵活参数的类型定义。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## type的映射类型基础

### 概念定义

映射类型（Mapped Types）是 TypeScript 中基于已有类型的键集合，通过遍历每个键并转换其值类型来生成新类型的机制。映射类型的语法借鉴了 JavaScript 的 `for...in` 循环：`{ [K in Keys]: T }`，其中 Keys 是键的联合类型，T 是每个键对应的新值类型。

映射类型是 TypeScript 内置工具类型（Partial、Required、Readonly、Pick 等）的实现基础，也是类型编程中最核心的操作之一。只有 type 别名支持映射类型，interface 不支持。

### 语法与用法

```typescript
// 基本映射类型语法
type MappedType = {
    [K in "a" | "b" | "c"]: string;
};
// 等价于 { a: string; b: string; c: string }

// 基于已有类型的键进行映射
type User = {
    id: number;
    name: string;
    email: string;
};

// 将所有属性变为可选
type OptionalUser = {
    [K in keyof User]?: User[K];
};
// { id?: number; name?: string; email?: string }

// 将所有属性变为只读
type ReadonlyUser = {
    readonly [K in keyof User]: User[K];
};
// { readonly id: number; readonly name: string; readonly email: string }
```

### 基本示例

```typescript
// 实现 Partial<T>
type MyPartial<T> = {
    [K in keyof T]?: T[K];
};

// 实现 Required<T>
type MyRequired<T> = {
    [K in keyof T]-?: T[K];  // -? 移除可选标记
};

// 实现 Readonly<T>
type MyReadonly<T> = {
    readonly [K in keyof T]: T[K];
};

// 实现 Record<K, T>
type MyRecord<K extends string | number | symbol, T> = {
    [P in K]: T;
};

// 实际使用
interface Todo {
    title: string;
    description: string;
    completed: boolean;
}

type PartialTodo = MyPartial<Todo>;
// { title?: string; description?: string; completed?: boolean }

type ReadonlyTodo = MyReadonly<Todo>;
// { readonly title: string; readonly description: string; readonly completed: boolean }

// 值类型转换：所有属性变为 getter 函数
type Getters<T> = {
    [K in keyof T]: () => T[K];
};

type TodoGetters = Getters<Todo>;
// { title: () => string; description: () => string; completed: () => boolean }
```

### 进阶用法

```typescript
// 键重映射 as（TypeScript 4.1+）
type RenamedGetters<T> = {
    [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type UserGetters = RenamedGetters<User>;
// { getId: () => number; getName: () => string; getEmail: () => string }

// 过滤属性：用 as never 移除不需要的键
type OnlyStringProps<T> = {
    [K in keyof T as T[K] extends string ? K : never]: T[K];
};

type StringUserProps = OnlyStringProps<User>;
// { name: string; email: string }（id 是 number，被过滤掉）

// 属性修饰符的添加和移除
type Mutable<T> = {
    -readonly [K in keyof T]: T[K];  // -readonly 移除只读标记
};

type WritableUser = Mutable<ReadonlyUser>;
// { id: number; name: string; email: string }（只读被移除）

// 深层映射（递归）
type DeepReadonly<T> = {
    readonly [K in keyof T]: T[K] extends object
        ? T[K] extends Function
            ? T[K]
            : DeepReadonly<T[K]>
        : T[K];
};
```

### 映射类型修饰符

| 修饰符 | 语法 | 作用 |
|--------|------|------|
| 添加只读 | `readonly [K in keyof T]` | 所有属性变为 readonly |
| 移除只读 | `-readonly [K in keyof T]` | 移除 readonly |
| 添加可选 | `[K in keyof T]?` | 所有属性变为可选 |
| 移除可选 | `[K in keyof T]-?` | 移除可选标记 |

### 适用场景

- **属性修饰符转换：** Partial、Required、Readonly 等类型转换
- **值类型转换：** 将属性值统一转换为 Promise、getter 函数等
- **键名重映射：** 生成 getter/setter 名、事件处理器名等
- **属性过滤：** 按值类型过滤属性，只保留特定类型的属性

### 常见问题

#### 映射类型和索引签名的区别

索引签名 `{ [key: string]: T }` 描述动态键名的类型。映射类型 `{ [K in Keys]: T }` 是遍历已知的键集合生成新类型。两者语法相似但用途不同。

#### 映射类型只能用 type 吗

是的，interface 不支持映射类型语法。所有基于映射类型的操作都必须用 type 别名定义。

### 注意事项

- 映射类型只能用 type 定义，interface 不支持
- `keyof T` 获取类型 T 的所有键的联合类型
- `T[K]` 索引访问获取键 K 对应的值类型
- `-?` 和 `-readonly` 用于移除修饰符，`+?` 和 `+readonly`（或直接省略 +）用于添加
- 键重映射 `as` 子句在 TypeScript 4.1+ 可用
- 递归映射类型要注意深度限制，避免无限递归

### 总结

映射类型通过 `{ [K in Keys]: T }` 语法遍历键集合生成新类型，是 Partial、Required、Readonly 等内置工具类型的实现基础。支持 `?`/`-?` 控制可选性、`readonly`/`-readonly` 控制只读性、`as` 子句进行键名重映射、`never` 过滤属性。映射类型只能用 type 定义，是 TypeScript 类型编程中最核心的操作之一。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。



## 5.3 类型操作与推断

## typeof操作符的类型查询

### 概念定义

TypeScript 中的 typeof 操作符有两种含义：一种是 JavaScript 运行时的 typeof（返回值的类型字符串），另一种是 TypeScript 类型层面的 typeof（从值推导出其类型）。类型层面的 typeof 出现在类型注解的位置，用于从已有的变量、常量或表达式中提取类型，避免手动重复定义类型。

类型查询 typeof 的核心价值是"从值到类型"的桥梁——当你已经有一个运行时的值（如配置对象、函数、类），想获取它的类型来做类型注解时，typeof 比手动写接口更简洁也更不易出错。

### 语法与用法

```typescript
// 运行时 typeof（JavaScript）
let x = "hello";
console.log(typeof x);  // "string"（运行时字符串）

// 类型层面 typeof（TypeScript）
let y: typeof x;  // y 的类型是 string（从 x 推导）

// 从对象值提取类型
const config = {
    apiUrl: "https://api.example.com",
    timeout: 5000,
    debug: false,
};

type Config = typeof config;
// { apiUrl: string; timeout: number; debug: boolean }

// 从函数提取类型
function createUser(name: string, age: number) {
    return { id: Date.now(), name, age };
}

type CreateUserFn = typeof createUser;
// (name: string, age: number) => { id: number; name: string; age: number }
```

### 基本示例

```typescript
// 从常量对象提取类型
const DEFAULT_OPTIONS = {
    method: "GET" as const,
    headers: { "Content-Type": "application/json" },
    timeout: 3000,
    retries: 3,
};

type RequestOptions = typeof DEFAULT_OPTIONS;
// {
//   method: "GET";
//   headers: { "Content-Type": string };
//   timeout: number;
//   retries: number;
// }

// 配合 as const 提取更精确的类型
const COLORS = ["red", "green", "blue"] as const;
type Colors = typeof COLORS;        // readonly ["red", "green", "blue"]
type Color = typeof COLORS[number]; // "red" | "green" | "blue"

// 从类提取类型
class UserService {
    private baseUrl = "/api/users";

    async getAll() { return []; }
    async getById(id: number) { return null; }
    async create(data: { name: string }) { return { id: 1, ...data }; }
}

// typeof UserService 是类本身的类型（构造函数类型）
type UserServiceClass = typeof UserService;

// InstanceType<typeof UserService> 是实例类型
type UserServiceInstance = InstanceType<typeof UserService>;
```

### 进阶用法

```typescript
// typeof 配合 keyof 获取对象的键类型
const STATUS_MAP = {
    active: 1,
    inactive: 0,
    pending: 2,
} as const;

type StatusKey = keyof typeof STATUS_MAP;   // "active" | "inactive" | "pending"
type StatusValue = typeof STATUS_MAP[StatusKey]; // 1 | 0 | 2

// typeof 配合 ReturnType 获取函数返回类型
function fetchData() {
    return {
        users: [] as { id: number; name: string }[],
        total: 0,
        page: 1,
    };
}

type FetchResult = ReturnType<typeof fetchData>;
// { users: { id: number; name: string }[]; total: number; page: number }

// typeof 配合 Parameters 获取函数参数类型
function search(keyword: string, page: number, pageSize: number) {
    // ...
}

type SearchParams = Parameters<typeof search>;
// [keyword: string, page: number, pageSize: number]
```

### 运行时 typeof 与类型层面 typeof 的对比

| 对比维度 | 运行时 typeof | 类型层面 typeof |
|----------|-------------|----------------|
| 出现位置 | 表达式中 | 类型注解位置 |
| 返回值 | 字符串（"string"等） | TypeScript 类型 |
| 编译后 | 保留 | 消失 |
| 用途 | 运行时类型判断 | 从值推导类型 |
| 精确度 | 7种基本结果 | 完全精确的 TS 类型 |

### 适用场景

- **从配置对象提取类型：** 避免手动定义配置接口
- **从函数提取返回类型：** `ReturnType<typeof fn>` 获取函数返回类型
- **从常量提取联合类型：** `as const` + typeof 提取字面量联合
- **从类提取构造函数类型：** `typeof ClassName` 获取类本身的类型

### 常见问题

#### typeof 只能用于变量和属性吗

类型层面的 typeof 只能用于标识符（变量名、属性访问），不能用于任意表达式。例如不能写 `type T = typeof fn()`，但可以用 `ReturnType<typeof fn>` 达到同样效果。

#### typeof 和手动定义接口哪个更好

如果类型是从已有运行时值派生的（如配置对象、常量映射），用 typeof 更好——保证类型和值始终同步。如果类型是独立定义的契约（如 API 接口），手动定义更清晰。

### 注意事项

- 类型层面 typeof 只能用于变量名和属性访问，不能用于函数调用表达式
- `typeof ClassName` 返回的是类的构造函数类型，不是实例类型
- 配合 `as const` 可以获得更精确的字面量类型
- typeof 编译后完全消失，不影响运行时
- `keyof typeof obj` 是从对象值提取键联合类型的常用模式

### 总结

TypeScript 类型层面的 typeof 从运行时值推导出编译期类型，是"值到类型"的桥梁。常用于从配置对象、常量映射和函数中提取类型，避免手动重复定义。配合 `as const` 获得字面量类型，配合 `keyof` 获得键联合类型，配合 `ReturnType` 获得函数返回类型。只能用于变量名和属性访问，不能用于表达式。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## keyof操作符的键类型提取

### 概念定义

keyof 是 TypeScript 的类型操作符，用于从对象类型中提取所有公共属性名，生成一个字符串字面量的联合类型。`keyof T` 的结果是类型 T 的所有键组成的联合类型。

keyof 是类型编程中最基础的操作符之一，几乎所有的映射类型、索引访问类型和泛型约束都依赖 keyof 来获取键的联合类型。它和 typeof 配合可以从运行时值中提取键的联合类型。

### 语法与用法

```typescript
interface User {
    id: number;
    name: string;
    email: string;
    age: number;
}

// keyof 提取所有键的联合类型
type UserKeys = keyof User;  // "id" | "name" | "email" | "age"

// 用 keyof 约束函数参数
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
    return obj[key];
}

const user: User = { id: 1, name: "张三", email: "z@x.com", age: 25 };

const name = getProperty(user, "name");   // 类型推断为 string
const age = getProperty(user, "age");     // 类型推断为 number
// getProperty(user, "address");          // 编译错误："address" 不在 keyof User 中
```

### 基本示例

```typescript
// keyof 用于索引签名
type StringMap = { [key: string]: number };
type StringMapKeys = keyof StringMap;  // string | number
// 注意：JavaScript 中数字索引最终转为字符串，所以也包含 number

type NumberMap = { [key: number]: string };
type NumberMapKeys = keyof NumberMap;  // number

// keyof 配合 typeof 从值提取键
const ROUTES = {
    home: "/",
    about: "/about",
    contact: "/contact",
    blog: "/blog",
};

type RouteKey = keyof typeof ROUTES;  // "home" | "about" | "contact" | "blog"

function navigate(route: RouteKey): void {
    const path = ROUTES[route];
    console.log(`导航到: ${path}`);
}

navigate("home");     // 合法
// navigate("login"); // 编译错误

// 类型安全的对象遍历
function printAllProperties<T extends object>(obj: T): void {
    const keys = Object.keys(obj) as (keyof T)[];
    keys.forEach((key) => {
        console.log(`${String(key)}: ${obj[key]}`);
    });
}
```

### 进阶用法

```typescript
// keyof 在映射类型中的核心作用
type Readonly<T> = {
    readonly [K in keyof T]: T[K];
};

type Partial<T> = {
    [K in keyof T]?: T[K];
};

// keyof 配合条件类型做属性过滤
type StringKeys<T> = {
    [K in keyof T]: T[K] extends string ? K : never;
}[keyof T];

type UserStringKeys = StringKeys<User>;  // "name" | "email"

// Pick 的实现依赖 keyof
type MyPick<T, K extends keyof T> = {
    [P in K]: T[P];
};

type UserBasic = MyPick<User, "id" | "name">;
// { id: number; name: string }

// keyof 联合类型和交叉类型
type A = { a: string; b: number };
type B = { b: number; c: boolean };

type KeysOfUnion = keyof (A | B);   // "b"（只有共有键）
type KeysOfInter = keyof (A & B);   // "a" | "b" | "c"（所有键）
```

### keyof 在不同类型上的行为

| 类型 | keyof 结果 | 说明 |
|------|-----------|------|
| `{ a: T; b: U }` | `"a" \| "b"` | 具名属性键 |
| `{ [k: string]: T }` | `string \| number` | 字符串索引包含 number |
| `{ [k: number]: T }` | `number` | 数字索引键 |
| `A \| B` | 共有键的联合 | 只有两者都有的键 |
| `A & B` | 所有键的联合 | 两者全部键 |
| `any` | `string \| number \| symbol` | 所有可能的键类型 |
| `unknown` | `never` | 没有已知的键 |

### 适用场景

- **类型安全的属性访问：** `getProperty<T, K extends keyof T>` 模式
- **映射类型遍历：** `[K in keyof T]` 遍历所有键
- **属性选择和排除：** Pick、Omit 的泛型约束
- **配置对象键约束：** 限制函数参数只能是对象的已知键

### 常见问题

#### Object.keys 返回 string[] 而不是 (keyof T)[]

这是 TypeScript 的有意设计。由于结构类型系统允许对象有多余属性，Object.keys 可能返回接口中没有定义的键。如果确信对象没有多余属性，可以用 `as (keyof T)[]` 断言。

#### keyof 联合类型为什么只有共有键

`keyof (A | B)` 只返回 A 和 B 共有的键，因为联合类型的值可能是 A 也可能是 B，只有共有键才能安全访问。

### 注意事项

- `keyof T` 返回的是公共属性键的联合类型
- 字符串索引签名的 keyof 结果包含 `string | number`
- `keyof (A | B)` 取共有键，`keyof (A & B)` 取全部键
- Object.keys() 返回 string[]，需要手动断言为 `(keyof T)[]`
- keyof 是映射类型、Pick、Omit 等工具类型的基础操作

### 总结

keyof 从对象类型中提取所有公共属性名组成联合类型，是类型编程最基础的操作符。配合泛型约束实现类型安全的属性访问，配合映射类型实现属性遍历和转换。keyof 联合类型取共有键，keyof 交叉类型取全部键。它是 Partial、Required、Pick、Omit 等内置工具类型的实现基础。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## in操作符的键迭代

### 概念定义

在 TypeScript 类型系统中，`in` 操作符有两种用途：一种是运行时的 `in` 操作符（检查对象是否有某个属性），另一种是类型层面的 `in` 关键字（在映射类型中遍历联合类型的每个成员）。

类型层面的 `in` 出现在映射类型的 `[K in Keys]` 语法中，K 依次取 Keys 联合类型中的每一个成员，生成对应的属性。这类似于 JavaScript 中的 `for...in` 循环，只不过是在类型层面对键进行遍历。

### 语法与用法

```typescript
// 类型层面 in：映射类型中的键迭代
type FromKeys<K extends string> = {
    [P in K]: boolean;  // P 遍历 K 联合类型的每个成员
};

type Flags = FromKeys<"dark" | "compact" | "rtl">;
// { dark: boolean; compact: boolean; rtl: boolean }

// 运行时 in：检查属性是否存在
const obj = { name: "张三", age: 25 };
console.log("name" in obj);     // true
console.log("email" in obj);    // false

// 运行时 in 用于类型守卫
function hasName(obj: unknown): obj is { name: string } {
    return typeof obj === "object" && obj !== null && "name" in obj;
}
```

### 基本示例

```typescript
// 映射类型中的 in 迭代
type User = {
    id: number;
    name: string;
    email: string;
};

// [K in keyof User] 遍历 "id" | "name" | "email"
type NullableUser = {
    [K in keyof User]: User[K] | null;
};
// { id: number | null; name: string | null; email: string | null }

// 从字面量联合生成对象类型
type HttpMethods = "GET" | "POST" | "PUT" | "DELETE";

type MethodHandlers = {
    [M in HttpMethods]: (url: string) => Promise<Response>;
};
// {
//   GET: (url: string) => Promise<Response>;
//   POST: (url: string) => Promise<Response>;
//   PUT: (url: string) => Promise<Response>;
//   DELETE: (url: string) => Promise<Response>;
// }

// 运行时 in 在类型守卫中的使用
type Circle = { kind: "circle"; radius: number };
type Rectangle = { kind: "rectangle"; width: number; height: number };
type Shape = Circle | Rectangle;

function getArea(shape: Shape): number {
    if ("radius" in shape) {
        // shape 被窄化为 Circle
        return Math.PI * shape.radius ** 2;
    } else {
        // shape 被窄化为 Rectangle
        return shape.width * shape.height;
    }
}
```

### 进阶用法

```typescript
// in 配合 as 做键重映射
type Getters<T> = {
    [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type UserGetters = Getters<User>;
// { getId: () => number; getName: () => string; getEmail: () => string }

// in 配合条件类型做属性过滤
type OnlyMethods<T> = {
    [K in keyof T as T[K] extends Function ? K : never]: T[K];
};

interface Service {
    name: string;
    version: number;
    start(): void;
    stop(): void;
}

type ServiceMethods = OnlyMethods<Service>;
// { start: () => void; stop: () => void }

// in 遍历模板字面量联合
type EventNames = "click" | "focus" | "blur";

type EventMap = {
    [E in EventNames as `on${Capitalize<E>}`]: (event: Event) => void;
};
// { onClick: (event: Event) => void; onFocus: ...; onBlur: ... }
```

### 运行时 in 与类型层面 in 的对比

| 对比维度 | 运行时 in | 类型层面 in |
|----------|----------|------------|
| 语法 | `"prop" in obj` | `[K in Keys]` |
| 用途 | 检查属性是否存在 | 遍历联合类型成员 |
| 出现位置 | 表达式/条件语句 | 映射类型定义 |
| 编译后 | 保留 | 消失 |
| 类型守卫 | 可以窄化联合类型 | 不适用 |

### 适用场景

- **映射类型：** 遍历键生成新类型（Partial、Readonly 等的实现基础）
- **类型守卫：** 运行时检查属性存在性来窄化联合类型
- **键名转换：** 配合 as 子句做键名重映射
- **属性过滤：** 配合条件类型按值类型过滤属性

### 常见问题

#### 运行时 in 操作符会检查原型链吗

会。`"toString" in obj` 返回 true，因为 toString 在原型链上。如果只想检查自身属性，用 `obj.hasOwnProperty("prop")` 或 `Object.hasOwn(obj, "prop")`。

#### 映射类型中 in 和 keyof 的关系

`[K in keyof T]` 是最常见的组合：keyof T 提供键的联合类型，in 遍历每个键。也可以直接用字面量联合类型替代 keyof T。

### 注意事项

- 类型层面的 in 只能出现在映射类型 `{ [K in Keys]: T }` 中
- 运行时的 in 会检查原型链上的属性，不仅是自身属性
- 运行时 in 用于类型守卫时，TypeScript 会自动窄化联合类型
- 映射类型中 in 配合 as 子句可以做键重映射和过滤
- `[K in keyof T]` 会保留原始属性的可选和只读修饰符

### 总结

in 操作符在 TypeScript 中有双重身份：运行时用于检查属性存在性和类型守卫窄化，类型层面用于映射类型中的键遍历。映射类型 `[K in Keys]` 是 Partial、Readonly、Record 等工具类型的实现基础。配合 as 子句可以做键名重映射，配合条件类型可以做属性过滤。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## as const的常量断言

### 概念定义

`as const` 是 TypeScript 3.4 引入的常量断言（Const Assertion），它将表达式的类型推断为最窄的字面量类型，同时让对象和数组的所有属性变为 readonly。as const 不做运行时转换，只在编译期影响类型推断。

没有 as const 时，`let x = "hello"` 推断为 string；加了 as const 后，`const x = "hello" as const` 推断为字面量类型 `"hello"`。对于对象和数组，as const 会递归地将所有属性变为 readonly 并推断为字面量类型。

### 语法与用法

```typescript
// 原始值的 as const
const greeting = "hello" as const;  // 类型："hello"（不是 string）
const count = 42 as const;           // 类型：42（不是 number）
const flag = true as const;          // 类型：true（不是 boolean）

// 数组的 as const：变为只读元组
const colors = ["red", "green", "blue"] as const;
// 类型：readonly ["red", "green", "blue"]

// 对象的 as const：所有属性变为 readonly + 字面量类型
const config = {
    host: "localhost",
    port: 3000,
    debug: false,
} as const;
// 类型：{ readonly host: "localhost"; readonly port: 3000; readonly debug: false }
```

### 基本示例

```typescript
// 从 as const 数组提取联合类型
const ROLES = ["admin", "editor", "viewer"] as const;
type Role = typeof ROLES[number];  // "admin" | "editor" | "viewer"

function hasRole(userRoles: Role[], required: Role): boolean {
    return userRoles.includes(required);
}

// 从 as const 对象提取键和值的类型
const STATUS_MAP = {
    active: 1,
    inactive: 0,
    pending: 2,
    banned: 3,
} as const;

type StatusKey = keyof typeof STATUS_MAP;     // "active" | "inactive" | "pending" | "banned"
type StatusValue = typeof STATUS_MAP[StatusKey]; // 1 | 0 | 2 | 3

// 枚举替代方案
const Direction = {
    Up: "UP",
    Down: "DOWN",
    Left: "LEFT",
    Right: "RIGHT",
} as const;

type Direction = typeof Direction[keyof typeof Direction];
// "UP" | "DOWN" | "LEFT" | "RIGHT"

function move(dir: Direction): void {
    console.log(`移动: ${dir}`);
}

move(Direction.Up);    // 合法
// move("DIAGONAL");   // 编译错误
```

### 进阶用法

```typescript
// as const 在函数参数中的应用
function defineRoutes<T extends readonly { path: string; name: string }[]>(routes: T): T {
    return routes;
}

const routes = defineRoutes([
    { path: "/", name: "home" },
    { path: "/about", name: "about" },
    { path: "/blog", name: "blog" },
] as const);

type RouteName = typeof routes[number]["name"];
// "home" | "about" | "blog"

// 深层嵌套对象的 as const
const theme = {
    colors: {
        primary: "#1890ff",
        secondary: "#52c41a",
        danger: "#ff4d4f",
    },
    spacing: [4, 8, 16, 24, 32],
    breakpoints: {
        sm: 640,
        md: 768,
        lg: 1024,
        xl: 1280,
    },
} as const;

type PrimaryColor = typeof theme.colors.primary;  // "#1890ff"
type Breakpoint = keyof typeof theme.breakpoints;  // "sm" | "md" | "lg" | "xl"

// satisfies 配合 as const（TypeScript 4.9+）
type ColorConfig = Record<string, [number, number, number] | string>;

const palette = {
    red: [255, 0, 0],
    green: "#00ff00",
    blue: [0, 0, 255],
} as const satisfies ColorConfig;
// 既保留字面量类型，又做类型检查
```

### as const 与其他方式的对比

| 对比维度 | as const | const 声明 | Object.freeze | enum |
|----------|---------|-----------|---------------|------|
| 字面量类型推断 | 深层全部 | 只顶层变量 | 不影响类型 | 枚举成员 |
| readonly | 深层全部 | 不添加 | 浅层 | 不适用 |
| 运行时效果 | 无 | 不可重新赋值 | 浅层冻结 | 有运行时对象 |
| 嵌套对象 | 递归 readonly | 不影响 | 不递归 | 不适用 |

### 适用场景

- **常量枚举替代：** 用 as const 对象替代 enum，不产生运行时代码
- **联合类型提取：** 从常量数组或对象提取联合类型
- **配置常量：** 主题配置、路由配置等不应被修改的常量
- **类型安全的查找表：** 状态映射、错误码映射等

### 常见问题

#### as const 和 Object.freeze 的区别

as const 是编译期的类型操作，不影响运行时。Object.freeze 是运行时的浅层冻结。两者可以配合使用：as const 提供编译期保护，Object.freeze 提供运行时保护。

#### 函数参数中如何使用 as const

TypeScript 5.0+ 支持在泛型参数前加 `const` 修饰符，让传入的字面量自动推断为常量类型，不需要调用方手动加 as const。

```typescript
// TypeScript 5.0+
function defineConfig<const T extends Record<string, unknown>>(config: T): T {
    return config;
}

// 调用时不需要 as const，自动推断为字面量类型
const cfg = defineConfig({ port: 3000, debug: true });
// cfg.port 的类型是 3000，不是 number
```

### 注意事项

- as const 是编译期特性，不影响运行时行为
- as const 对对象和数组是深层递归的（所有嵌套属性都变为 readonly + 字面量）
- as const 不能用于含有可变操作的表达式（如函数调用的返回值）
- TypeScript 5.0 的 const 泛型参数可以替代调用方的 as const
- as const 配合 satisfies（TypeScript 4.9+）可以同时保留字面量类型和做类型检查

### 总结

as const 将表达式推断为最窄的字面量类型，对象和数组的所有属性变为 readonly。它是提取联合类型、替代枚举、定义配置常量的核心工具。配合 `typeof` 和 `keyof` 可以从常量值中提取精确的类型信息。TypeScript 5.0 的 const 泛型参数进一步简化了使用，4.9 的 satisfies 可以同时做类型检查和保留字面量类型。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 类型断言as的显式指定

### 概念定义

类型断言（Type Assertion）使用 `as` 关键字告诉 TypeScript 编译器将某个值视为特定的类型。类型断言不做任何运行时转换或检查，只在编译期改变编译器的类型判断。它是开发者向编译器声明"我比你更了解这个值的类型"的方式。

TypeScript 对类型断言有一定限制：只能断言为"有重叠"的类型，不能跨越完全不兼容的类型（除非用双重断言）。这种限制防止了明显错误的断言。

### 语法与用法

```typescript
// as 语法（推荐）
let value: unknown = "hello";
let strLength: number = (value as string).length;

// 尖括号语法（在 .tsx 文件中不可用）
let strLength2: number = (<string>value).length;

// DOM 元素断言
const input = document.getElementById("username") as HTMLInputElement;
console.log(input.value);  // 可以访问 HTMLInputElement 特有的 value 属性

// API 响应断言
interface User {
    id: number;
    name: string;
}

const data = JSON.parse('{"id":1,"name":"张三"}') as User;
console.log(data.name);
```

### 基本示例

```typescript
// Canvas 元素断言
const canvas = document.querySelector("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");

// 联合类型窄化断言
function processValue(value: string | number): void {
    // 开发者确信此处一定是 string
    const str = value as string;
    console.log(str.toUpperCase());
}

// 接口兼容性断言
interface Cat {
    name: string;
    purr(): void;
}

interface Dog {
    name: string;
    bark(): void;
}

// Cat 和 Dog 有共同的 name 属性，存在类型重叠
function toCat(animal: Dog): Cat {
    return animal as unknown as Cat;  // 需要双重断言（不推荐）
}

// 更安全的做法：使用类型守卫
function isCat(animal: Cat | Dog): animal is Cat {
    return "purr" in animal;
}
```

### 进阶用法

```typescript
// satisfies 操作符（TypeScript 4.9+）作为更安全的替代
type ColorMap = Record<string, [number, number, number] | string>;

// as 断言：失去精确类型推断
const colors1 = {
    red: [255, 0, 0],
    green: "#00ff00",
} as ColorMap;
// colors1.red 的类型是 [number, number, number] | string（不精确）

// satisfies：保留精确推断 + 类型检查
const colors2 = {
    red: [255, 0, 0],
    green: "#00ff00",
} satisfies ColorMap;
// colors2.red 的类型是 [number, number, number]（精确）
// colors2.green 的类型是 string（精确）

// 断言函数：运行时验证 + 编译期窄化
function assertIsString(value: unknown): asserts value is string {
    if (typeof value !== "string") {
        throw new TypeError(`期望 string，实际是 ${typeof value}`);
    }
}

let input: unknown = "hello";
assertIsString(input);
// 断言通过后，input 的类型变为 string
console.log(input.toUpperCase());
```

### 类型断言的限制

| 断言方式 | 是否允许 | 说明 |
|---------|---------|------|
| `string as number` | 不允许 | 无类型重叠 |
| `unknown as string` | 允许 | unknown 和任何类型有重叠 |
| `any as string` | 允许 | any 和任何类型有重叠 |
| `string as unknown as number` | 允许 | 双重断言绕过检查（危险） |
| `HTMLElement as HTMLInputElement` | 允许 | 父子类型有重叠 |

### 适用场景

- **DOM 操作：** 将 getElementById 返回的 HTMLElement 断言为具体子类型
- **API 响应：** 将 JSON.parse 或 fetch 的 any 返回值断言为已知类型
- **类型窄化补充：** 编译器无法自动推断时手动指定类型
- **第三方库：** 库类型不够精确时用断言补充

### 常见问题

#### 类型断言和类型转换的区别

类型断言只影响编译器的类型判断，不做任何运行时转换。`"42" as number` 不会把字符串变成数字。运行时转换用 `Number("42")`、`parseInt("42")` 等。

#### 什么时候应该避免使用类型断言

当可以通过类型守卫（typeof、instanceof、in）或类型收窄达到目的时不要用断言。断言绕过了编译器检查，如果断言错误会导致运行时 bug。

### 注意事项

- 类型断言不做运行时转换，断言错误会导致运行时 bug
- 在 .tsx 文件中只能用 as 语法，不能用尖括号语法
- 优先使用类型守卫和收窄，断言是最后手段
- TypeScript 4.9 的 satisfies 在很多场景下比 as 更安全
- 断言函数（asserts x is T）提供运行时验证和编译期窄化的双重保障

### 总结

类型断言 as 在编译期将值视为特定类型，不做运行时转换。只能断言为有类型重叠的类型，完全不兼容的需要双重断言（不推荐）。优先使用类型守卫和收窄，断言作为最后手段。TypeScript 4.9 的 satisfies 操作符和断言函数是更安全的替代方案。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 非空断言!的后缀使用

### 概念定义

非空断言操作符 `!` 是 TypeScript 的后缀表达式操作符，写在变量或表达式后面，告诉编译器该值不是 null 也不是 undefined。它从类型中移除 null 和 undefined，让编译器允许直接访问属性和方法。

非空断言和类型断言一样，只在编译期生效，不做运行时检查。如果值实际上是 null 或 undefined，运行时会抛出 TypeError。它是一种"我确信这个值不为空"的开发者承诺。

### 语法与用法

```typescript
// 非空断言的基本语法
let element: HTMLElement | null = document.getElementById("app");

// 没有非空断言：编译器报错
// element.innerHTML = "hello";  // 错误：element 可能为 null

// 使用非空断言
element!.innerHTML = "hello";  // 告诉编译器 element 不为 null

// 链式调用中的非空断言
interface User {
    profile?: {
        avatar?: string;
    };
}

const user: User = { profile: { avatar: "photo.jpg" } };
const avatar: string = user.profile!.avatar!;  // 断言 profile 和 avatar 都不为 undefined
```

### 基本示例

```typescript
// Map.get 返回 T | undefined
const map = new Map<string, number>();
map.set("count", 42);

// 开发者确信 key 存在时用非空断言
const count: number = map.get("count")!;

// DOM 查询
function initApp(): void {
    const root = document.getElementById("root")!;  // 确信 root 元素存在
    const input = document.querySelector<HTMLInputElement>("#search")!;

    root.innerHTML = "<h1>应用已加载</h1>";
    input.focus();
}

// React ref 中的使用
// const inputRef = useRef<HTMLInputElement>(null);
// 在事件处理器中（确信 ref 已绑定）
// inputRef.current!.focus();

// 赋值断言（Definite Assignment Assertion）
let value!: number;  // 告诉编译器：value 在使用前一定会被赋值

function initialize() {
    value = 42;
}

initialize();
console.log(value);  // 不报错：编译器信任赋值断言
```

### 非空断言与可选链的对比

| 对比维度 | 非空断言 `x!` | 可选链 `x?.` |
|----------|-------------|-------------|
| 运行时行为 | 无保护（可能报错） | 安全短路（返回 undefined） |
| 编译期效果 | 移除 null/undefined | 结果类型包含 undefined |
| 值为 null 时 | 运行时 TypeError | 返回 undefined |
| 适用场景 | 确信不为空 | 不确定是否为空 |
| 安全性 | 不安全 | 安全 |

```typescript
interface Config {
    database?: {
        host: string;
        port: number;
    };
}

const config: Config = { database: { host: "localhost", port: 3306 } };

// 可选链：安全，结果类型包含 undefined
const host1 = config.database?.host;  // string | undefined

// 非空断言：不安全，结果类型是 string
const host2 = config.database!.host;  // string（如果 database 是 undefined 则运行时报错）
```

### 适用场景

- **DOM 元素确信存在：** 页面结构已知，元素一定存在时
- **Map/Set 确信有值：** 刚设置了值，立即获取时
- **初始化后的变量：** 变量在使用前一定会被赋值
- **React ref：** 在生命周期确保 ref 已绑定后使用

### 常见问题

#### 非空断言和 as 断言的区别

非空断言 `x!` 只移除 null 和 undefined，不改变其他类型。`x as T` 可以将类型断言为任何兼容的类型。非空断言是类型断言的一种特殊简写形式。

#### 什么时候应该用可选链而不是非空断言

如果不确定值是否为 null，用可选链 `?.` 更安全。只有当开发者有充分信心值不为 null（如 DOM 结构已知、刚设置了值）时才用非空断言。

### 注意事项

- 非空断言不做运行时检查，值为 null 时运行时会 TypeError
- 优先使用可选链 `?.` 和空值合并 `??`，非空断言是最后手段
- 赋值断言 `let x!: T` 用于确信变量在使用前会被赋值的场景
- 不要在不确定的情况下滥用非空断言，这会隐藏潜在的 null 引用 bug
- ESLint 的 `@typescript-eslint/no-non-null-assertion` 规则可以警告非空断言的使用

### 总结

非空断言 `!` 后缀操作符从类型中移除 null 和 undefined，是开发者"确信不为空"的承诺。它只在编译期生效，不做运行时保护。和可选链 `?.` 相比，非空断言不安全但结果类型更精确。优先使用可选链和空值合并，只在确信值不为空时使用非空断言。赋值断言 `let x!: T` 用于声明变量一定会在使用前被赋值。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 双重断言的绕过(不推荐)

### 概念定义

双重断言（Double Assertion）是将值先断言为 `unknown` 或 `any`，再断言为目标类型的写法：`value as unknown as TargetType`。TypeScript 的类型断言要求源类型和目标类型之间有"重叠"关系，当两个类型完全不兼容时直接断言会报错。双重断言通过中间的 unknown/any 绕过这一限制。

双重断言几乎总是代码坏味道，说明类型设计有问题或开发者在做不安全的操作。它完全绕过了编译器的类型检查，如果断言错误会导致运行时 bug 且难以排查。

### 语法与用法

```typescript
// 直接断言不兼容的类型会报错
// const num: number = "hello" as number;
// 编译错误：string 和 number 没有重叠

// 双重断言绕过：先转 unknown，再转目标类型
const num: number = "hello" as unknown as number;
// 编译通过，但运行时 num 实际是字符串 "hello"

// 等价写法：通过 any 中转
const num2: number = "hello" as any as number;
```

### 基本示例

```typescript
// 场景1：测试代码中模拟不完整的对象
interface ComplexService {
    getUser(id: number): Promise<{ id: number; name: string }>;
    getOrders(userId: number): Promise<{ id: number; total: number }[]>;
    sendEmail(to: string, subject: string): Promise<void>;
}

// 测试中只需要 mock 部分方法
const mockService = {
    getUser: async (id: number) => ({ id, name: "测试用户" }),
} as unknown as ComplexService;
// 不推荐，但在测试中有时难以避免

// 场景2：第三方库类型不准确
// 当库的类型定义有错误但无法修改时
declare function externalLib(): { data: string };

// 实际返回的是 number，但类型声明写错了
const result = externalLib().data as unknown as number;

// 场景3：遗留代码迁移
// 旧的 JavaScript 代码中存在类型不一致的情况
const legacyData: any = getLegacyData();
const typedData = legacyData as unknown as NewDataFormat;
```

### 为什么不推荐

```typescript
// 双重断言隐藏了类型错误
interface User {
    id: number;
    name: string;
}

interface Product {
    sku: string;
    price: number;
}

// 把 User 断言为 Product：编译通过但完全错误
const user: User = { id: 1, name: "张三" };
const product = user as unknown as Product;

// 运行时访问不存在的属性
console.log(product.sku);    // undefined（不是 string）
console.log(product.price);  // undefined（不是 number）
// 没有任何编译错误提示，bug 被隐藏了
```

### 替代方案

| 场景 | 双重断言（不推荐） | 推荐替代方案 |
|------|-------------------|-------------|
| 类型不兼容 | `x as unknown as T` | 重新设计类型关系 |
| 第三方库类型错误 | `x as unknown as T` | 提交类型修复 PR 或模块扩充 |
| 测试 mock | `{} as unknown as T` | 使用 Partial\&lt;T\> 或 mock 库 |
| 运行时类型不确定 | `x as unknown as T` | 使用 unknown + 类型守卫 |

```typescript
// 推荐：使用类型守卫替代双重断言
function isUser(value: unknown): value is User {
    return (
        typeof value === "object" &&
        value !== null &&
        "id" in value &&
        "name" in value
    );
}

const data: unknown = fetchData();
if (isUser(data)) {
    console.log(data.name);  // 安全访问
}

// 推荐：测试中使用 Partial
function createMockService(overrides: Partial<ComplexService>): ComplexService {
    return {
        getUser: async () => ({ id: 0, name: "" }),
        getOrders: async () => [],
        sendEmail: async () => {},
        ...overrides,
    };
}
```

### 适用场景

双重断言在极少数情况下不可避免：

- **紧急修复：** 生产环境的紧急 bug 修复，来不及重新设计类型
- **测试代码：** mock 复杂接口时简化类型构造
- **第三方库类型有误：** 短期内无法修复库的类型定义

### 常见问题

#### 双重断言和直接用 any 有什么区别

`value as any as T` 和 `value as unknown as T` 效果相同。用 unknown 中转语义更清晰（表示"先当作未知，再断言为目标"），用 any 中转更简短。两者都同样不安全。

#### 如何在团队中禁止双重断言

使用 ESLint 规则 `@typescript-eslint/no-unnecessary-type-assertion` 和代码审查。没有专门禁止双重断言的 ESLint 规则，需要靠团队规范和 review 把关。

### 注意事项

- 双重断言完全绕过类型检查，是最不安全的类型操作
- 断言错误不会有编译报错，bug 会隐藏到运行时
- 几乎所有使用双重断言的场景都有更安全的替代方案
- 如果必须使用，添加注释说明原因，并标记 TODO 后续修复
- 代码审查中应重点关注双重断言的使用

### 总结

双重断言 `value as unknown as T` 通过中间类型绕过 TypeScript 的类型兼容性检查，可以在任意两个不兼容的类型之间转换。它完全放弃了类型安全，断言错误会导致运行时 bug。几乎所有场景都有更安全的替代方案：类型守卫、模块扩充、Partial mock 等。只在紧急修复或第三方类型错误等极端情况下使用，必须附带注释说明原因。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 类型守卫(typeof)的窄化

### 概念定义

typeof 类型守卫是 TypeScript 中最常用的类型窄化方式，利用 JavaScript 运行时的 `typeof` 操作符判断值的类型，TypeScript 编译器在条件分支中自动将变量类型窄化为更具体的类型。

typeof 返回的字符串值有限：`"string"`、`"number"`、`"boolean"`、`"symbol"`、`"bigint"`、`"undefined"`、`"object"`、`"function"`。TypeScript 能识别这些检查并在对应分支中自动窄化类型。

### 语法与用法

```typescript
function process(value: string | number | boolean): string {
    if (typeof value === "string") {
        // value 被窄化为 string
        return value.toUpperCase();
    }
    if (typeof value === "number") {
        // value 被窄化为 number
        return value.toFixed(2);
    }
    // value 被窄化为 boolean
    return value ? "是" : "否";
}
```

### 基本示例

```typescript
// 联合类型的逐步窄化
function describe(input: string | number | boolean | undefined): string {
    if (typeof input === "undefined") {
        return "未定义";
    }
    if (typeof input === "string") {
        return `字符串: "${input}"，长度: ${input.length}`;
    }
    if (typeof input === "number") {
        return `数字: ${input}，是否整数: ${Number.isInteger(input)}`;
    }
    // input 被窄化为 boolean
    return `布尔值: ${input}`;
}

// typeof 在 switch 中的使用
function formatValue(value: string | number | boolean | object): string {
    switch (typeof value) {
        case "string":
            return `"${value}"`;
        case "number":
            return value.toString();
        case "boolean":
            return value ? "true" : "false";
        case "object":
            return JSON.stringify(value);
        default:
            return String(value);
    }
}

// typeof 配合三元表达式
function padLeft(value: string, padding: string | number): string {
    return typeof padding === "number"
        ? " ".repeat(padding) + value
        : padding + value;
}
```

### typeof 能识别的类型

| typeof 返回值 | 窄化后的类型 | 对应的值 |
|--------------|------------|---------|
| `"string"` | string | 字符串 |
| `"number"` | number | 数字（含 NaN、Infinity） |
| `"boolean"` | boolean | true/false |
| `"symbol"` | symbol | Symbol 值 |
| `"bigint"` | bigint | BigInt 值 |
| `"undefined"` | undefined | undefined |
| `"function"` | Function | 函数 |
| `"object"` | object（含 null） | 对象、数组、null |

### 适用场景

- **联合类型处理：** 根据原始类型做不同处理
- **参数重载模拟：** 函数接受多种类型参数，内部分别处理
- **安全类型转换：** 确认类型后安全地调用类型特有的方法
- **默认值处理：** 判断参数是否传入（typeof x === "undefined"）

### 常见问题

#### typeof null 的陷阱

`typeof null` 返回 `"object"`，这是 JavaScript 的历史遗留 bug。如果联合类型包含 null，typeof 守卫不能区分 null 和对象，需要额外的 null 检查。

```typescript
function process(value: string | object | null): void {
    if (typeof value === "object") {
        // value 是 object | null，不仅仅是 object
        if (value !== null) {
            // 现在 value 被窄化为 object
            console.log(Object.keys(value));
        }
    }
}
```

#### typeof 能区分数组和普通对象吗

不能。`typeof []` 返回 `"object"`。区分数组用 `Array.isArray()`，TypeScript 也能识别 Array.isArray 做类型窄化。

### 注意事项

- typeof 只能识别原始类型和 function，不能区分具体的对象类型
- `typeof null === "object"` 是 JavaScript 的 bug，需要额外判断
- typeof 不能区分数组和普通对象，用 Array.isArray() 替代
- TypeScript 自动识别 typeof 守卫并窄化类型，不需要额外注解
- typeof 守卫在 if/else、switch、三元表达式中都有效

### 总结

typeof 类型守卫利用运行时的 typeof 操作符在条件分支中自动窄化类型，是处理联合类型最常用的方式。能识别 string、number、boolean、symbol、bigint、undefined、function 和 object 七种结果。注意 typeof null 返回 "object" 的陷阱，以及 typeof 不能区分数组和普通对象的限制。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 类型守卫(instanceof)的窄化

### 概念定义

instanceof 类型守卫利用 JavaScript 运行时的 `instanceof` 操作符检查一个对象是否是某个类的实例，TypeScript 编译器在条件分支中自动将变量类型窄化为该类的实例类型。

instanceof 检查的是对象的原型链：`obj instanceof ClassName` 判断 ClassName.prototype 是否出现在 obj 的原型链上。它适用于类实例、内置对象（Date、Error、RegExp、Map 等）和自定义类。

### 语法与用法

```typescript
class HttpError {
    constructor(public statusCode: number, public message: string) {}
}

class ValidationError {
    constructor(public field: string, public message: string) {}
}

function handleError(error: HttpError | ValidationError): string {
    if (error instanceof HttpError) {
        // error 被窄化为 HttpError
        return `HTTP ${error.statusCode}: ${error.message}`;
    }
    // error 被窄化为 ValidationError
    return `字段 "${error.field}" 验证失败: ${error.message}`;
}
```

### 基本示例

```typescript
// 内置类型的 instanceof 守卫
function formatValue(value: Date | RegExp | Error): string {
    if (value instanceof Date) {
        // value 被窄化为 Date
        return value.toISOString();
    }
    if (value instanceof RegExp) {
        // value 被窄化为 RegExp
        return `正则: ${value.source}，标志: ${value.flags}`;
    }
    // value 被窄化为 Error
    return `错误: ${value.message}`;
}

// 自定义类层级的 instanceof
class Shape {
    constructor(public color: string) {}
}

class Circle extends Shape {
    constructor(color: string, public radius: number) {
        super(color);
    }
    area(): number {
        return Math.PI * this.radius ** 2;
    }
}

class Rectangle extends Shape {
    constructor(color: string, public width: number, public height: number) {
        super(color);
    }
    area(): number {
        return this.width * this.height;
    }
}

function describeShape(shape: Shape): string {
    if (shape instanceof Circle) {
        return `圆形，半径 ${shape.radius}，面积 ${shape.area().toFixed(2)}`;
    }
    if (shape instanceof Rectangle) {
        return `矩形，${shape.width}x${shape.height}，面积 ${shape.area()}`;
    }
    return `形状，颜色 ${shape.color}`;
}

// catch 中的 instanceof
function safeOperation(): void {
    try {
        throw new TypeError("类型错误");
    } catch (error) {
        if (error instanceof TypeError) {
            console.log(`类型错误: ${error.message}`);
        } else if (error instanceof RangeError) {
            console.log(`范围错误: ${error.message}`);
        } else {
            console.log("未知错误");
        }
    }
}
```

### instanceof 与 typeof 的对比

| 对比维度 | instanceof | typeof |
|----------|-----------|--------|
| 检查对象 | 类实例（原型链） | 原始类型和 function |
| 适用范围 | 类、内置对象 | 原始类型（string、number 等） |
| 能否区分自定义类 | 能 | 不能（都返回 "object"） |
| 能否检查接口 | 不能（接口无运行时存在） | 不能 |
| 跨 iframe | 可能失败 | 始终有效 |

### 适用场景

- **错误处理：** 区分不同类型的 Error（TypeError、RangeError、自定义 Error）
- **类层级：** 区分同一父类下的不同子类
- **内置对象：** 区分 Date、RegExp、Map、Set 等
- **DOM 元素：** 区分 HTMLInputElement、HTMLDivElement 等

### 常见问题

#### instanceof 能检查接口吗

不能。接口只存在于编译期，运行时完全消失。instanceof 需要运行时的构造函数。要检查是否满足接口形状，用 in 操作符或自定义类型谓词。

#### 跨 iframe 的 instanceof 问题

不同 iframe 有各自独立的全局对象，`[] instanceof Array` 在跨 iframe 场景中可能返回 false。用 `Array.isArray()` 替代数组的 instanceof 检查。

### 注意事项

- instanceof 检查原型链，子类实例也能通过父类的 instanceof 检查
- instanceof 不能用于接口和 type 类型别名（编译后不存在）
- 跨 iframe/realm 时 instanceof 可能失败
- 对于数组判断，Array.isArray() 比 instanceof Array 更可靠
- instanceof 在 TypeScript 的 switch 语句中不会自动窄化，需要用 if/else

### 总结

instanceof 类型守卫通过检查对象的原型链来窄化类型，适用于类实例和内置对象（Date、Error、RegExp 等）。和 typeof 互补：typeof 处理原始类型，instanceof 处理对象类型。instanceof 不能检查接口（编译后不存在），跨 iframe 时可能失败。广泛用于错误处理、类层级区分和 DOM 元素判断。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 类型守卫(in)的窄化

### 概念定义

in 类型守卫利用 JavaScript 的 `in` 操作符检查对象是否包含某个属性，TypeScript 在条件分支中根据属性的存在性自动窄化联合类型。`"prop" in obj` 返回 true 时，TypeScript 将 obj 窄化为包含该属性的类型成员。

in 守卫特别适合区分"形状不同"的对象联合类型——当联合类型的各成员有不同的属性时，通过检查特有属性来确定具体类型。

### 语法与用法

```typescript
interface Bird {
    fly(): void;
    layEggs(): void;
}

interface Fish {
    swim(): void;
    layEggs(): void;
}

function move(animal: Bird | Fish): void {
    if ("fly" in animal) {
        // animal 被窄化为 Bird（只有 Bird 有 fly 方法）
        animal.fly();
    } else {
        // animal 被窄化为 Fish
        animal.swim();
    }
}
```

### 基本示例

```typescript
// 区分不同形状的对象
interface TextInput {
    type: "text";
    value: string;
    placeholder?: string;
}

interface CheckboxInput {
    type: "checkbox";
    checked: boolean;
    label: string;
}

interface SelectInput {
    type: "select";
    options: string[];
    selectedIndex: number;
}

type FormInput = TextInput | CheckboxInput | SelectInput;

function renderInput(input: FormInput): string {
    if ("placeholder" in input) {
        // 窄化为 TextInput（只有 TextInput 有 placeholder）
        return `<input type="text" value="${input.value}" placeholder="${input.placeholder ?? ""}">`;
    }
    if ("checked" in input) {
        // 窄化为 CheckboxInput
        return `<input type="checkbox" ${input.checked ? "checked" : ""}> ${input.label}`;
    }
    // 窄化为 SelectInput
    return `<select>${input.options.map(o => `<option>${o}</option>`).join("")}</select>`;
}

// in 守卫用于 unknown 类型验证
function processData(data: unknown): string {
    if (typeof data === "object" && data !== null) {
        if ("name" in data && "age" in data) {
            // data 被窄化为 { name: unknown; age: unknown }
            return `${(data as { name: string }).name}, ${(data as { age: number }).age}`;
        }
    }
    return "无效数据";
}
```

### 进阶用法

```typescript
// in 守卫配合可辨识联合
type NetworkState =
    | { state: "loading" }
    | { state: "success"; data: string }
    | { state: "error"; error: Error };

function handleState(ns: NetworkState): string {
    // 用 in 检查特有属性
    if ("data" in ns) {
        return ns.data;  // 窄化为 success 分支
    }
    if ("error" in ns) {
        return ns.error.message;  // 窄化为 error 分支
    }
    return "加载中...";  // 窄化为 loading 分支
}

// in 守卫用于可选属性
interface BasicUser {
    name: string;
}

interface AdminUser {
    name: string;
    permissions: string[];
    adminLevel: number;
}

function greetUser(user: BasicUser | AdminUser): string {
    if ("permissions" in user) {
        // 窄化为 AdminUser
        return `管理员 ${user.name}，权限等级 ${user.adminLevel}`;
    }
    return `用户 ${user.name}`;
}
```

### 三种对象类型守卫的对比

| 守卫方式 | 语法 | 适用场景 | 限制 |
|---------|------|---------|------|
| in | `"prop" in obj` | 不同属性的联合类型 | 检查原型链 |
| instanceof | `obj instanceof Class` | 类实例 | 不适用于接口 |
| 可辨识属性 | `obj.kind === "x"` | 有公共辨识属性的联合 | 需要公共字面量属性 |

### 适用场景

- **联合类型区分：** 成员有不同属性时通过特有属性区分
- **API 响应处理：** 不同响应格式有不同的属性
- **unknown 类型验证：** 检查未知对象是否有预期的属性
- **插件/扩展判断：** 检查对象是否实现了某个扩展接口

### 常见问题

#### in 操作符会检查原型链吗

会。`"toString" in obj` 对任何对象都返回 true。进行 in 守卫时应检查对象自身的特有属性，避免使用原型链上的通用属性。

#### in 守卫和可辨识联合哪个更好

如果联合类型有公共的字面量属性（如 type、kind），用可辨识联合更直观。如果没有公共辨识属性，用 in 检查特有属性。

### 注意事项

- in 操作符检查原型链上的属性，不仅是自身属性
- 用于 in 守卫的属性应该是某个类型独有的，避免用共有属性
- in 守卫对 unknown 类型也有效，但窄化后属性值类型是 unknown
- 可辨识联合（用字面量属性值区分）通常比 in 守卫更清晰
- TypeScript 4.9+ 对 in 守卫的窄化行为有所增强

### 总结

in 类型守卫通过检查属性存在性窄化联合类型，适用于成员有不同属性的对象联合。和 typeof（原始类型）、instanceof（类实例）互补，in 专门处理不同形状的普通对象联合。注意 in 会检查原型链，应使用类型独有的属性做检查。如果联合类型有公共辨识属性，可辨识联合模式比 in 守卫更优雅。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 自定义类型谓词(is)的守卫函数

### 概念定义

自定义类型谓词（Type Predicate）是一种返回布尔值的函数，其返回类型用 `param is Type` 语法声明。当函数返回 true 时，TypeScript 编译器在调用方的条件分支中自动将参数窄化为指定的类型。

类型谓词解决了 typeof 和 instanceof 无法处理的复杂类型判断场景——当需要检查对象是否满足某个接口的形状、或者需要复杂的自定义逻辑来判断类型时，自定义类型谓词是唯一的选择。

### 语法与用法

```typescript
// 类型谓词函数的签名
// 返回类型 "value is string" 就是类型谓词
function isString(value: unknown): value is string {
    return typeof value === "string";
}

// 使用时 TypeScript 自动窄化
let data: unknown = "hello";
if (isString(data)) {
    // data 被窄化为 string
    console.log(data.toUpperCase());
}
```

### 基本示例

```typescript
// 检查对象是否满足接口形状
interface User {
    id: number;
    name: string;
    email: string;
}

function isUser(value: unknown): value is User {
    return (
        typeof value === "object" &&
        value !== null &&
        "id" in value &&
        typeof (value as User).id === "number" &&
        "name" in value &&
        typeof (value as User).name === "string" &&
        "email" in value &&
        typeof (value as User).email === "string"
    );
}

// API 响应处理
const response: unknown = JSON.parse('{"id":1,"name":"张三","email":"z@x.com"}');

if (isUser(response)) {
    // response 被窄化为 User
    console.log(response.name);   // 类型安全
    console.log(response.email);  // 类型安全
}

// 数组过滤中的类型谓词
const mixed: (string | number | null)[] = ["hello", 42, null, "world", null, 7];

// 使用类型谓词过滤
function isNonNull<T>(value: T | null): value is T {
    return value !== null;
}

const nonNullValues = mixed.filter(isNonNull);
// 类型：(string | number)[]（null 被过滤掉了）

// 进一步过滤
function isStringValue(value: string | number): value is string {
    return typeof value === "string";
}

const strings = nonNullValues.filter(isStringValue);
// 类型：string[]
```

### 进阶用法

```typescript
// 可辨识联合的类型谓词
type ApiResponse =
    | { success: true; data: unknown }
    | { success: false; error: string };

function isSuccess(response: ApiResponse): response is { success: true; data: unknown } {
    return response.success === true;
}

// 泛型类型谓词
function isArrayOf<T>(
    value: unknown,
    itemGuard: (item: unknown) => item is T
): value is T[] {
    return Array.isArray(value) && value.every(itemGuard);
}

function isNumber(value: unknown): value is number {
    return typeof value === "number";
}

const data: unknown = [1, 2, 3];
if (isArrayOf(data, isNumber)) {
    // data 被窄化为 number[]
    const sum = data.reduce((a, b) => a + b, 0);
    console.log(sum);  // 6
}

// 断言函数（asserts 版本的类型谓词）
function assertIsUser(value: unknown): asserts value is User {
    if (!isUser(value)) {
        throw new TypeError("值不是合法的 User 对象");
    }
}

const rawData: unknown = fetchData();
assertIsUser(rawData);
// 断言通过后，rawData 的类型变为 User
console.log(rawData.name);
```

### 类型谓词与其他守卫方式的对比

| 守卫方式 | 语法 | 灵活性 | 适用场景 |
|---------|------|--------|---------|
| typeof | `typeof x === "string"` | 低（只有7种） | 原始类型 |
| instanceof | `x instanceof Class` | 中（只限类） | 类实例 |
| in | `"prop" in x` | 中（只检查属性） | 对象属性存在性 |
| 类型谓词 | `function isX(v): v is X` | 高（任意逻辑） | 复杂形状检查 |
| 断言函数 | `function assert(v): asserts v is X` | 高 | 失败时抛错 |

### 适用场景

- **接口形状验证：** 检查 unknown 数据是否符合接口定义
- **API 响应验证：** 验证外部数据的结构和类型
- **数组过滤：** `Array.filter` 配合类型谓词保持正确的返回类型
- **复杂判断逻辑：** 需要多个条件组合判断类型的场景

### 常见问题

#### 类型谓词函数可以返回错误的判断吗

可以。TypeScript 不验证类型谓词函数内部的逻辑是否正确。如果函数返回 true 但值实际上不满足类型，会导致运行时 bug。开发者需要确保谓词函数的判断逻辑与声明的类型一致。

#### 为什么 Array.filter 需要类型谓词

`array.filter(x => x !== null)` 返回的类型仍然包含 null。TypeScript 不会自动从回调的条件推断窄化效果。用类型谓词 `array.filter(isNonNull)` 才能让返回的数组类型正确排除 null。

### 注意事项

- TypeScript 不验证谓词函数内部逻辑，错误的谓词会导致运行时 bug
- 类型谓词只能用于函数的返回类型声明，不能用于其他位置
- 谓词函数的参数必须是函数签名中的某个参数名
- 断言函数（asserts x is T）在判断失败时应抛出异常
- 泛型类型谓词可以构建可复用的验证工具链

### 总结

自定义类型谓词用 `param is Type` 语法声明返回类型，当函数返回 true 时自动窄化参数类型。它是处理复杂类型判断的终极方案，能验证接口形状、处理 API 响应、配合数组过滤。TypeScript 不验证谓词逻辑的正确性，开发者需要确保判断逻辑和声明的类型一致。断言函数是类型谓词的"抛错版本"，失败时抛出异常而不是返回 false。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 可辨识联合(Discriminated Unions)的窄化

### 概念定义

可辨识联合（Discriminated Union），也叫标签联合（Tagged Union），是一种联合类型的模式：联合的每个成员都有一个公共的字面量类型属性（辨识属性/标签），TypeScript 编译器通过检查这个属性的值来自动窄化到对应的成员类型。

可辨识联合是 TypeScript 中最强大、最常用的类型模式之一。它将"运行时值判断"和"编译期类型窄化"完美结合，广泛应用于状态管理、API 响应、Redux Action 和事件系统中。

### 语法与用法

```typescript
// 定义可辨识联合：每个成员有公共的 kind 属性（辨识属性）
type Shape =
    | { kind: "circle"; radius: number }
    | { kind: "rectangle"; width: number; height: number }
    | { kind: "triangle"; base: number; height: number };

function getArea(shape: Shape): number {
    switch (shape.kind) {
        case "circle":
            // shape 被窄化为 { kind: "circle"; radius: number }
            return Math.PI * shape.radius ** 2;
        case "rectangle":
            // shape 被窄化为 { kind: "rectangle"; width: number; height: number }
            return shape.width * shape.height;
        case "triangle":
            // shape 被窄化为 { kind: "triangle"; base: number; height: number }
            return (shape.base * shape.height) / 2;
    }
}
```

### 基本示例

```typescript
// API 响应的可辨识联合
type ApiResponse<T> =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "success"; data: T; timestamp: number }
    | { status: "error"; error: string; retryable: boolean };

function renderResponse(response: ApiResponse<string[]>): string {
    switch (response.status) {
        case "idle":
            return "等待请求";
        case "loading":
            return "加载中...";
        case "success":
            return `数据(${response.data.length}条)，时间: ${response.timestamp}`;
        case "error":
            return `错误: ${response.error}${response.retryable ? " (可重试)" : ""}`;
    }
}

// Redux Action 的可辨识联合
type CounterAction =
    | { type: "INCREMENT"; payload: number }
    | { type: "DECREMENT"; payload: number }
    | { type: "RESET" }
    | { type: "SET"; payload: number };

function counterReducer(state: number, action: CounterAction): number {
    switch (action.type) {
        case "INCREMENT":
            return state + action.payload;
        case "DECREMENT":
            return state - action.payload;
        case "RESET":
            return 0;
        case "SET":
            return action.payload;
    }
}

// 事件系统
type AppEvent =
    | { type: "USER_LOGIN"; userId: string; timestamp: Date }
    | { type: "USER_LOGOUT"; userId: string }
    | { type: "PAGE_VIEW"; path: string; referrer?: string }
    | { type: "ERROR"; message: string; stack?: string };

function logEvent(event: AppEvent): void {
    switch (event.type) {
        case "USER_LOGIN":
            console.log(`用户 ${event.userId} 登录于 ${event.timestamp}`);
            break;
        case "USER_LOGOUT":
            console.log(`用户 ${event.userId} 登出`);
            break;
        case "PAGE_VIEW":
            console.log(`页面访问: ${event.path}`);
            break;
        case "ERROR":
            console.error(`错误: ${event.message}`);
            break;
    }
}
```

### 进阶用法

```typescript
// 多层嵌套的可辨识联合
type Result<T, E = Error> =
    | { ok: true; value: T }
    | { ok: false; error: E };

function processResult<T>(result: Result<T>): T | null {
    if (result.ok) {
        return result.value;
    }
    console.error(result.error.message);
    return null;
}

// 可辨识联合配合泛型
type AsyncState<T> =
    | { phase: "idle" }
    | { phase: "pending" }
    | { phase: "fulfilled"; data: T }
    | { phase: "rejected"; error: Error };

function unwrap<T>(state: AsyncState<T>): T {
    if (state.phase === "fulfilled") {
        return state.data;
    }
    throw new Error(`状态不是 fulfilled，当前: ${state.phase}`);
}
```

### 可辨识联合的三要素

| 要素 | 说明 | 示例 |
|------|------|------|
| 公共辨识属性 | 所有成员都有的字面量类型属性 | `kind`、`type`、`status` |
| 字面量类型值 | 辨识属性的值必须是字面量类型 | `"circle"`、`"error"`、`200` |
| 联合类型 | 多个成员用 \| 组合 | `Circle \| Rectangle` |

### 适用场景

- **状态机：** 表示有限状态（idle/loading/success/error）
- **Redux/Zustand Action：** 每个 action 有不同的 payload 结构
- **API 响应：** 不同状态的响应有不同的数据字段
- **AST 节点：** 编译器/解析器中不同类型的语法节点
- **事件系统：** 不同事件携带不同的数据

### 常见问题

#### 辨识属性可以是数字或布尔字面量吗

可以。辨识属性的值只要是字面量类型就行，不限于字符串。`{ ok: true; data: T } | { ok: false; error: E }` 就是用布尔字面量做辨识。

#### 可辨识联合和普通联合类型有什么区别

可辨识联合是联合类型的一种模式，要求有公共的字面量辨识属性。普通联合类型不一定有公共辨识属性，需要用 typeof、instanceof 或 in 做窄化。可辨识联合的窄化最自然最安全。

### 注意事项

- 辨识属性的值必须是字面量类型（字符串、数字或布尔字面量）
- 辨识属性名在所有成员中必须相同
- switch/if-else 检查辨识属性值时，TypeScript 自动窄化
- 配合穷尽检查（never）可以确保所有分支都被处理
- 辨识属性建议用 `type`、`kind`、`status` 等语义明确的名字

### 总结

可辨识联合通过公共的字面量类型辨识属性实现自动类型窄化，是 TypeScript 最强大的类型模式。switch/if 检查辨识属性值时编译器自动窄化到对应的成员类型。广泛用于状态机、Redux Action、API 响应和事件系统。三要素：公共辨识属性、字面量类型值、联合类型。配合穷尽检查确保不遗漏分支。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 穷尽检查(Exhaustiveness Checking)的never

### 概念定义

穷尽检查（Exhaustiveness Checking）是利用 never 类型确保联合类型的所有成员都被处理的编程模式。当 switch/if-else 处理了联合类型的所有成员后，剩余的 default/else 分支中变量类型会变成 never。如果将该变量赋值给 never 类型的变量，编译器就能在联合类型新增成员但未处理时立即报错。

这种模式让编译器在代码维护阶段自动发现遗漏——当团队扩展联合类型新增成员时，所有使用穷尽检查的 switch 语句都会编译报错，提醒开发者补充新分支的处理逻辑。

### 语法与用法

```typescript
type Shape = "circle" | "rectangle" | "triangle";

function getArea(shape: Shape): number {
    switch (shape) {
        case "circle":
            return Math.PI * 10 ** 2;
        case "rectangle":
            return 20 * 30;
        case "triangle":
            return (20 * 15) / 2;
        default:
            // 所有 case 都处理了，shape 在这里是 never
            const _exhaustiveCheck: never = shape;
            return _exhaustiveCheck;
    }
}

// 如果新增 "pentagon" 但忘记加 case：
// type Shape = "circle" | "rectangle" | "triangle" | "pentagon";
// default 分支中 shape 的类型变成 "pentagon"，不能赋给 never
// 编译错误：Type '"pentagon"' is not assignable to type 'never'
```

### 基本示例

```typescript
// 辅助函数版本的穷尽检查
function assertNever(value: never): never {
    throw new Error(`未处理的值: ${JSON.stringify(value)}`);
}

// Redux Action 的穷尽检查
type Action =
    | { type: "INCREMENT"; payload: number }
    | { type: "DECREMENT"; payload: number }
    | { type: "RESET" };

function reducer(state: number, action: Action): number {
    switch (action.type) {
        case "INCREMENT":
            return state + action.payload;
        case "DECREMENT":
            return state - action.payload;
        case "RESET":
            return 0;
        default:
            return assertNever(action);
            // 如果 Action 新增了 { type: "SET"; payload: number }
            // 但没有加对应的 case，这里会编译报错
    }
}

// API 响应的穷尽检查
type ResponseStatus = "success" | "error" | "timeout" | "cancelled";

function getStatusMessage(status: ResponseStatus): string {
    switch (status) {
        case "success":
            return "请求成功";
        case "error":
            return "请求失败";
        case "timeout":
            return "请求超时";
        case "cancelled":
            return "请求已取消";
        default:
            return assertNever(status);
    }
}
```

### 进阶用法

```typescript
// 可辨识联合配合穷尽检查
type NetworkState =
    | { phase: "idle" }
    | { phase: "pending"; startTime: number }
    | { phase: "fulfilled"; data: string; endTime: number }
    | { phase: "rejected"; error: Error };

function describeState(state: NetworkState): string {
    switch (state.phase) {
        case "idle":
            return "空闲";
        case "pending":
            return `加载中（开始于 ${state.startTime}）`;
        case "fulfilled":
            return `完成：${state.data}`;
        case "rejected":
            return `失败：${state.error.message}`;
        default:
            return assertNever(state);
    }
}

// if-else 中的穷尽检查
function processValue(value: string | number | boolean): string {
    if (typeof value === "string") {
        return value.toUpperCase();
    }
    if (typeof value === "number") {
        return value.toFixed(2);
    }
    if (typeof value === "boolean") {
        return value ? "是" : "否";
    }
    // value 在这里是 never
    return assertNever(value);
}

// TypeScript 4.9+ satisfies 配合穷尽检查
type EventType = "click" | "hover" | "scroll";

const eventHandlers = {
    click: () => console.log("点击"),
    hover: () => console.log("悬停"),
    scroll: () => console.log("滚动"),
} satisfies Record<EventType, () => void>;
// 如果 EventType 新增成员但 eventHandlers 没有对应属性，编译报错
```

### 穷尽检查的两种实现方式

| 方式 | 代码 | 优点 | 缺点 |
|------|------|------|------|
| never 变量赋值 | `const _: never = x` | 简单直接 | 无运行时保护 |
| assertNever 函数 | `assertNever(x)` | 编译期 + 运行时双重保护 | 需要定义辅助函数 |

### 适用场景

- **状态机处理：** 确保所有状态分支都有对应的处理逻辑
- **Redux Reducer：** 确保所有 Action 类型都被处理
- **事件处理：** 确保所有事件类型都有处理器
- **枚举/联合类型转换：** 确保映射覆盖了所有成员

### 常见问题

#### 穷尽检查有运行时开销吗

never 变量赋值方式在编译后会被优化掉，没有运行时开销。assertNever 函数方式有运行时开销（调用函数并抛错），但能在运行时捕获未处理的情况。

#### 不用穷尽检查会怎样

TypeScript 的 `noImplicitReturns` 编译选项可以部分替代——如果函数声明了返回类型但某些分支没有返回，会编译报错。但 noImplicitReturns 不如穷尽检查精确，建议两者配合使用。

### 注意事项

- 穷尽检查依赖 never 类型的"不可赋值"特性
- assertNever 函数提供编译期和运行时双重保护
- 联合类型新增成员时，所有穷尽检查点都会编译报错
- switch 语句建议始终加 default 分支做穷尽检查
- satisfies Record\&lt;UnionType, T\> 是对象映射场景下的穷尽检查替代方案

### 总结

穷尽检查利用 never 类型确保联合类型的所有成员都被处理。当联合类型新增成员但代码未更新时，编译器自动报错。推荐使用 assertNever 辅助函数，同时提供编译期和运行时保护。这是维护大型代码库类型安全的核心模式，广泛用于状态机、Redux Reducer 和事件系统。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 类型推断(Inference)的上下文推断

### 概念定义

类型推断（Type Inference）是 TypeScript 编译器根据代码上下文自动确定变量、参数和返回值类型的能力，不需要开发者显式标注每一个类型。上下文推断（Contextual Typing）是类型推断的一种特殊形式：当表达式的类型由它所处的位置决定时，TypeScript 从外层上下文"反向"推断内层表达式的类型。

最典型的上下文推断发生在回调函数中——当函数参数的类型已知时，传入的回调函数的参数类型会被自动推断，不需要手动标注。

### 语法与用法

```typescript
// 基本类型推断：从初始值推断类型
let name = "张三";       // 推断为 string
let age = 25;             // 推断为 number
let active = true;        // 推断为 boolean
let items = [1, 2, 3];   // 推断为 number[]

// 上下文推断：回调参数类型从外层推断
const numbers = [1, 2, 3, 4, 5];

// map 的回调参数 n 自动推断为 number（从数组类型推断）
const doubled = numbers.map(n => n * 2);

// addEventListener 的回调参数 e 自动推断为 MouseEvent
document.addEventListener("click", (e) => {
    // e 被推断为 MouseEvent，可以访问 clientX、clientY
    console.log(e.clientX, e.clientY);
});
```

### 基本示例

```typescript
// 函数返回类型推断
function add(a: number, b: number) {
    return a + b;  // 返回类型自动推断为 number
}

function createUser(name: string, age: number) {
    return { id: Date.now(), name, age };
    // 返回类型推断为 { id: number; name: string; age: number }
}

// 变量声明的推断
const user = createUser("张三", 25);
// user 类型推断为 { id: number; name: string; age: number }

// 上下文推断在数组方法中的应用
const words = ["hello", "world", "typescript"];

// filter 回调的 w 自动推断为 string
const longWords = words.filter(w => w.length > 5);

// reduce 回调的参数从初始值和数组元素推断
const total = [10, 20, 30].reduce((sum, num) => sum + num, 0);
// sum: number, num: number（从初始值 0 和数组元素推断）

// 上下文推断在赋值中的应用
type Handler = (event: MouseEvent) => void;

// 赋值给 Handler 类型的变量时，回调参数自动推断
const onClick: Handler = (event) => {
    // event 被推断为 MouseEvent
    console.log(event.button);
};

// Promise 的上下文推断
const promise = new Promise<string>((resolve, reject) => {
    // resolve 推断为 (value: string) => void
    resolve("完成");
    // reject 推断为 (reason?: any) => void
});
```

### 进阶用法

```typescript
// 泛型函数的参数推断
function identity<T>(value: T): T {
    return value;
}

// T 从参数值自动推断
const str = identity("hello");    // T 推断为 "hello"（字面量类型）
const num = identity(42);          // T 推断为 42

// 条件表达式的推断
function getDefault(useString: boolean) {
    // 推断返回类型为 string | number
    return useString ? "默认值" : 0;
}

// 解构赋值的推断
const [first, ...rest] = [1, 2, 3, 4];
// first: number, rest: number[]

const { name: userName, age: userAge } = { name: "张三", age: 25 };
// userName: string, userAge: number

// 上下文推断在对象方法中的应用
interface EventEmitter<Events extends Record<string, any>> {
    on<K extends keyof Events>(event: K, handler: (data: Events[K]) => void): void;
}

interface AppEvents {
    login: { userId: string };
    logout: { reason: string };
    error: { message: string; code: number };
}

declare const emitter: EventEmitter<AppEvents>;

// handler 的 data 参数类型从事件名自动推断
emitter.on("login", (data) => {
    // data 推断为 { userId: string }
    console.log(data.userId);
});

emitter.on("error", (data) => {
    // data 推断为 { message: string; code: number }
    console.log(data.message, data.code);
});
```

### 类型推断的几种形式

| 推断形式 | 说明 | 示例 |
|---------|------|------|
| 初始值推断 | 从赋值的初始值推断变量类型 | `let x = 42` → number |
| 返回值推断 | 从 return 语句推断函数返回类型 | `function f() { return "hi" }` → string |
| 上下文推断 | 从外层类型推断内层参数类型 | `arr.map(x => x + 1)` |
| 泛型参数推断 | 从函数参数推断泛型类型参数 | `identity("hi")` → T = "hi" |
| 最佳公共类型 | 从多个值推断公共类型 | `[1, "a"]` → (string \| number)[] |

### 适用场景

- **回调函数：** 数组方法、事件处理器、Promise 回调的参数类型推断
- **泛型函数调用：** 自动推断泛型参数，不需要手动指定
- **变量声明：** 从初始值推断类型，减少冗余的类型标注
- **解构赋值：** 自动推断解构后各变量的类型

### 常见问题

#### 什么时候应该显式标注类型

函数的参数类型通常需要显式标注（除非有上下文推断）。函数返回类型建议在公共 API 中显式标注（防止内部修改意外改变返回类型）。局部变量通常不需要标注，让推断工作。

#### 类型推断和 any 的区别

类型推断是编译器根据上下文确定精确的类型，any 是放弃类型检查。推断出的类型是安全的，any 是不安全的。如果推断不出来（如未初始化的变量），开启 `noImplicitAny` 后会报错。

### 注意事项

- let 声明的变量推断为宽泛类型（如 string），const 声明推断为字面量类型（如 "hello"）
- 上下文推断在回调函数中最常见，不需要手动标注回调参数
- 泛型参数推断依赖函数参数的值，有时需要手动指定（如推断不够精确时）
- 公共 API 的函数建议显式标注返回类型，避免内部修改影响调用者
- `noImplicitAny` 编译选项可以在推断失败时报错，推荐始终开启

### 总结

TypeScript 的类型推断从代码上下文自动确定类型，上下文推断从外层类型反向推断内层表达式类型。最常见的场景是回调函数参数和泛型参数的自动推断。let 推断宽泛类型，const 推断字面量类型。局部变量通常不需要标注，公共 API 建议显式标注返回类型。推断和 any 完全不同——推断是安全的精确类型，any 是放弃检查。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 类型推断的泛型参数推断

### 概念定义

泛型参数推断是 TypeScript 编译器根据函数调用时传入的实际参数，自动推断泛型类型参数（如 T、U）的具体类型的能力。大多数情况下调用泛型函数不需要手动用尖括号指定类型参数，编译器能从参数值中推断出来。

泛型参数推断让泛型函数的调用和普通函数一样简洁，同时保持完整的类型安全。推断失败时（如无法从参数推断、或推断不够精确），可以手动指定类型参数。

### 语法与用法

```typescript
// 泛型函数定义
function identity<T>(value: T): T {
    return value;
}

// 自动推断：T 从参数值推断
const str = identity("hello");     // T 推断为 string
const num = identity(42);           // T 推断为 number
const arr = identity([1, 2, 3]);   // T 推断为 number[]

// 手动指定：显式传入类型参数
const str2 = identity<string>("hello");  // 手动指定 T 为 string

// const 上下文推断更精确的字面量类型
const literal = identity("hello" as const);  // T 推断为 "hello"
```

### 基本示例

```typescript
// 多泛型参数的推断
function pair<T, U>(first: T, second: U): [T, U] {
    return [first, second];
}

const p = pair("hello", 42);
// T 推断为 string，U 推断为 number
// 返回类型推断为 [string, number]

// 泛型约束下的推断
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
    return obj[key];
}

const user = { id: 1, name: "张三", age: 25 };
const name = getProperty(user, "name");
// T 推断为 { id: number; name: string; age: number }
// K 推断为 "name"
// 返回类型推断为 string

// 从回调函数参数推断泛型
function map<T, U>(array: T[], fn: (item: T) => U): U[] {
    return array.map(fn);
}

const lengths = map(["hello", "world"], (s) => s.length);
// T 推断为 string（从数组元素），U 推断为 number（从回调返回值）
// 返回类型推断为 number[]

// 泛型默认值
function createState<T = string>(initial: T): { value: T; set: (v: T) => void } {
    let value = initial;
    return {
        value,
        set(v: T) { value = v; },
    };
}

const state1 = createState("hello");  // T 推断为 string（从参数）
const state2 = createState<number>(0); // T 手动指定为 number
```

### 进阶用法

```typescript
// infer 关键字在条件类型中的推断
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

type FnReturn = ReturnType<(x: string) => number>;  // number

// 从 Promise 中提取类型
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;

type Result = Awaited<Promise<Promise<string>>>;  // string（递归解包）

// 推断元组中的元素类型
type First<T extends any[]> = T extends [infer F, ...any[]] ? F : never;
type Last<T extends any[]> = T extends [...any[], infer L] ? L : never;

type F = First<[string, number, boolean]>;  // string
type L = Last<[string, number, boolean]>;   // boolean

// TypeScript 5.0 const 泛型参数
function defineRoutes<const T extends readonly { path: string; name: string }[]>(
    routes: T
): T {
    return routes;
}

// T 自动推断为字面量元组类型，不需要调用方加 as const
const routes = defineRoutes([
    { path: "/", name: "home" },
    { path: "/about", name: "about" },
]);
// routes 的类型保留了字面量："home" | "about" 而不是 string
```

### 推断成功与失败的场景

| 场景 | 能否推断 | 说明 |
|------|---------|------|
| 从函数参数推断 T | 能 | `identity("hi")` → T = string |
| 从回调返回值推断 U | 能 | `map(arr, x => x.length)` → U = number |
| 无参数可推断 | 不能 | `create<T>()` 必须手动指定 |
| 多个参数推断冲突 | 部分 | 取最佳公共类型或报错 |
| 嵌套泛型 | 有时不能 | 深层嵌套可能需要手动指定 |
| const 泛型参数 | 能（TS 5.0+） | 自动推断字面量类型 |

### 适用场景

- **工具函数：** identity、pair、map 等通用函数的类型参数自动推断
- **API 客户端：** 从请求参数推断响应类型
- **状态管理：** 从初始值推断状态类型
- **条件类型：** 用 infer 从复杂类型中提取内部类型

### 常见问题

#### 推断出的类型不够精确怎么办

用 `as const` 让参数值推断为字面量类型，或手动指定类型参数。TypeScript 5.0 的 `const` 泛型参数可以自动推断字面量类型。

```typescript
// 推断为宽泛类型
const result1 = identity("hello");  // string

// 推断为字面量类型
const result2 = identity("hello" as const);  // "hello"

// TypeScript 5.0+：const 泛型参数
function id<const T>(value: T): T { return value; }
const result3 = id("hello");  // "hello"
```

#### 多个参数推断冲突时怎么处理

当多个参数位置都在推断同一个泛型参数但值类型不同时，TypeScript 会尝试找最佳公共类型。如果找不到就报错，需要手动指定。

### 注意事项

- 大多数泛型函数调用不需要手动指定类型参数
- 推断失败或不够精确时才手动指定
- `as const` 和 const 泛型参数可以让推断更精确
- infer 关键字只能在条件类型的 extends 子句中使用
- 复杂的嵌套泛型可能需要手动指定类型参数帮助推断

### 总结

泛型参数推断让编译器从函数参数自动确定泛型类型参数，使泛型函数调用和普通函数一样简洁。推断来源包括函数参数值、回调返回值和约束关系。推断不够精确时用 `as const` 或手动指定。TypeScript 5.0 的 const 泛型参数自动推断字面量类型。infer 关键字在条件类型中从复杂类型提取内部类型，是高级类型编程的核心工具。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。



## 5.4 泛型编程

## 泛型函数&lt;T>的参数化类型

### 概念定义

泛型函数是在函数名后面用尖括号声明类型参数（如 `<T>`）的函数，类型参数在调用时被具体类型替换。泛型让函数能处理多种类型的数据，同时保持输入和输出之间的类型关系，不需要用 any 放弃类型安全。

泛型函数的核心价值是"类型参数化"——把类型当作参数传递，让同一套逻辑适用于不同类型，且编译器能追踪每次调用中具体的类型流转。

### 语法与用法

```typescript
// 泛型函数声明
function identity<T>(value: T): T {
    return value;
}

// 调用时自动推断 T
const str = identity("hello");   // T 推断为 string，返回 string
const num = identity(42);         // T 推断为 number，返回 number

// 手动指定 T
const bool = identity<boolean>(true);

// 箭头函数的泛型
const getFirst = <T>(arr: T[]): T | undefined => {
    return arr[0];
};

// 注意：在 .tsx 文件中，<T> 会被解析为 JSX 标签
// 解决方式：<T,> 或 <T extends unknown>
const getFirstTsx = <T,>(arr: T[]): T | undefined => arr[0];
```

### 基本示例

```typescript
// 泛型函数：反转数组
function reverse<T>(items: T[]): T[] {
    return [...items].reverse();
}

const nums = reverse([1, 2, 3]);      // number[]
const strs = reverse(["a", "b"]);     // string[]

// 泛型函数：安全的对象属性访问
function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
    const result = {} as Pick<T, K>;
    keys.forEach((key) => {
        result[key] = obj[key];
    });
    return result;
}

interface User {
    id: number;
    name: string;
    email: string;
    age: number;
}

const user: User = { id: 1, name: "张三", email: "z@x.com", age: 25 };
const basic = pick(user, ["id", "name"]);
// 类型推断为 Pick<User, "id" | "name"> = { id: number; name: string }

// 泛型函数：创建工厂
function create<T>(Ctor: new () => T): T {
    return new Ctor();
}
```

### 进阶用法

```typescript
// 多泛型参数
function zip<T, U>(arr1: T[], arr2: U[]): [T, U][] {
    const length = Math.min(arr1.length, arr2.length);
    const result: [T, U][] = [];
    for (let i = 0; i < length; i++) {
        result.push([arr1[i], arr2[i]]);
    }
    return result;
}

const zipped = zip([1, 2, 3], ["a", "b", "c"]);
// [number, string][]

// 泛型约束
function longest<T extends { length: number }>(a: T, b: T): T {
    return a.length >= b.length ? a : b;
}

longest("hello", "world");     // string（有 length 属性）
longest([1, 2], [1, 2, 3]);   // number[]（有 length 属性）
// longest(10, 20);            // 编译错误：number 没有 length 属性

// 泛型函数类型
type MapFn<T, U> = (item: T, index: number) => U;

function customMap<T, U>(arr: T[], fn: MapFn<T, U>): U[] {
    return arr.map(fn);
}

const lengths = customMap(["hello", "world"], (s, i) => s.length);
// number[]
```

### 适用场景

- **数据结构操作：** 数组、链表、树等通用数据结构的操作函数
- **工具函数：** pick、omit、merge 等通用对象操作
- **API 请求封装：** 请求函数返回泛型类型的响应
- **事件系统：** 类型安全的事件发射和监听

### 常见问题

#### 泛型参数命名有什么约定

单字母大写：T（Type）、U（第二个类型）、K（Key）、V（Value）、E（Element）、R（Return）。复杂场景用有意义的名字如 TData、TResult。

#### 什么时候需要手动指定泛型参数

当编译器无法从参数推断（如无参数函数）、推断不够精确、或需要限定为更窄的类型时，手动指定泛型参数。

### 注意事项

- 泛型参数在调用时大多能自动推断，不需要手动指定
- .tsx 文件中箭头函数的泛型用 `<T,>` 或 `<T extends unknown>` 避免和 JSX 冲突
- 泛型约束用 `extends` 限制类型参数的范围
- 泛型函数编译后泛型完全消失，不影响运行时
- 避免不必要的泛型——如果类型参数只出现一次，可能不需要泛型

### 总结

泛型函数用 `<T>` 声明类型参数，让函数处理多种类型同时保持类型安全。调用时编译器自动推断类型参数，也可以手动指定。泛型约束用 extends 限制范围，多泛型参数用逗号分隔。泛型函数是构建可复用、类型安全工具函数的核心机制。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 泛型接口&lt;T>的参数化定义

### 概念定义

泛型接口是在接口名后面用尖括号声明类型参数的接口，使接口的属性类型和方法签名能够参数化。使用泛型接口时必须传入具体的类型参数（除非有默认值），让同一个接口定义适用于不同的数据类型。

泛型接口的典型应用是定义通用的数据容器（如 `Array<T>`、`Promise<T>`、`Map<K, V>`）和通用的服务接口（如 `Repository<T>`）。

### 语法与用法

```typescript
// 泛型接口定义
interface Box<T> {
    value: T;
    getValue(): T;
    setValue(newValue: T): void;
}

// 使用时传入具体类型
const stringBox: Box<string> = {
    value: "hello",
    getValue() { return this.value; },
    setValue(newValue) { this.value = newValue; },
};

const numberBox: Box<number> = {
    value: 42,
    getValue() { return this.value; },
    setValue(newValue) { this.value = newValue; },
};
```

### 基本示例

```typescript
// API 响应的泛型接口
interface ApiResponse<T> {
    code: number;
    message: string;
    data: T;
    timestamp: number;
}

interface User {
    id: number;
    name: string;
}

interface Product {
    sku: string;
    price: number;
}

// 不同的数据类型使用同一个响应接口
type UserResponse = ApiResponse<User>;
type ProductListResponse = ApiResponse<Product[]>;

const userResp: UserResponse = {
    code: 200,
    message: "success",
    data: { id: 1, name: "张三" },
    timestamp: Date.now(),
};

// 仓储模式的泛型接口
interface Repository<T> {
    findAll(): Promise<T[]>;
    findById(id: number): Promise<T | null>;
    save(entity: T): Promise<T>;
    delete(id: number): Promise<boolean>;
}

// 具体实现
class UserRepository implements Repository<User> {
    async findAll() { return []; }
    async findById(id: number) { return null; }
    async save(entity: User) { return entity; }
    async delete(id: number) { return true; }
}
```

### 进阶用法

```typescript
// 多泛型参数的接口
interface KeyValueStore<K, V> {
    get(key: K): V | undefined;
    set(key: K, value: V): void;
    has(key: K): boolean;
    delete(key: K): boolean;
}

// 泛型接口继承
interface ReadableStore<K, V> {
    get(key: K): V | undefined;
    has(key: K): boolean;
}

interface WritableStore<K, V> extends ReadableStore<K, V> {
    set(key: K, value: V): void;
    delete(key: K): boolean;
}

// 泛型接口的默认类型参数
interface EventEmitter<Events extends Record<string, any> = Record<string, any>> {
    on<K extends keyof Events>(event: K, handler: (data: Events[K]) => void): void;
    emit<K extends keyof Events>(event: K, data: Events[K]): void;
}

// 使用默认类型
const genericEmitter: EventEmitter = {} as EventEmitter;

// 指定具体事件类型
interface AppEvents {
    login: { userId: string };
    logout: void;
}

const appEmitter: EventEmitter<AppEvents> = {} as EventEmitter<AppEvents>;
```

### 适用场景

- **数据容器：** Box、List、Stack、Queue 等通用容器
- **API 响应：** 统一的响应结构配合不同的数据类型
- **仓储模式：** 通用的 CRUD 接口
- **事件系统：** 类型安全的事件发射器

### 常见问题

#### 泛型接口和泛型方法的区别

泛型接口的类型参数在接口名后声明，整个接口共享同一个 T。泛型方法的类型参数在方法名后声明，每次调用可以是不同的 T。两者可以组合使用。

#### 泛型接口必须指定类型参数吗

使用泛型接口时必须传入类型参数，除非接口定义了默认类型（`interface Box<T = string>`）。

### 注意事项

- 泛型接口使用时必须传入类型参数（或有默认值）
- 泛型接口支持继承（extends）和声明合并
- 类型参数可以有默认值：`<T = string>`
- 类型参数可以有约束：`<T extends Serializable>`
- 泛型接口编译后完全消失，不影响运行时

### 总结

泛型接口用 `<T>` 声明类型参数，让接口的属性和方法类型参数化。广泛用于 API 响应结构、仓储模式、数据容器和事件系统。使用时必须指定类型参数（除非有默认值）。支持多类型参数、约束、默认值和继承，是构建可复用类型定义的核心工具。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 泛型类&lt;T>的参数化实现

### 概念定义

泛型类是在类名后面用尖括号声明类型参数的类，让类的属性、方法参数和返回值能够参数化。实例化泛型类时传入具体类型，编译器会在该实例的所有操作中使用这个具体类型做类型检查。

泛型类的类型参数作用于实例成员（属性和方法），不作用于静态成员。静态成员不能引用类的泛型类型参数。

### 语法与用法

```typescript
// 泛型类定义
class Container<T> {
    private value: T;

    constructor(initialValue: T) {
        this.value = initialValue;
    }

    getValue(): T {
        return this.value;
    }

    setValue(newValue: T): void {
        this.value = newValue;
    }
}

// 实例化时指定类型
const strContainer = new Container<string>("hello");
strContainer.getValue();        // string
strContainer.setValue("world");  // 参数必须是 string

const numContainer = new Container(42);  // 从参数推断 T 为 number
numContainer.getValue();        // number
```

### 基本示例

```typescript
// 泛型栈（后进先出）
class Stack<T> {
    private items: T[] = [];

    push(item: T): void {
        this.items.push(item);
    }

    pop(): T | undefined {
        return this.items.pop();
    }

    peek(): T | undefined {
        return this.items[this.items.length - 1];
    }

    get size(): number {
        return this.items.length;
    }

    isEmpty(): boolean {
        return this.items.length === 0;
    }
}

const numberStack = new Stack<number>();
numberStack.push(1);
numberStack.push(2);
numberStack.pop();   // number | undefined

const stringStack = new Stack<string>();
stringStack.push("hello");
// stringStack.push(42);  // 编译错误：number 不能赋给 string

// 泛型队列（先进先出）
class Queue<T> {
    private items: T[] = [];

    enqueue(item: T): void {
        this.items.push(item);
    }

    dequeue(): T | undefined {
        return this.items.shift();
    }

    front(): T | undefined {
        return this.items[0];
    }

    get size(): number {
        return this.items.length;
    }
}
```

### 进阶用法

```typescript
// 多泛型参数的类
class Pair<T, U> {
    constructor(public first: T, public second: U) {}

    swap(): Pair<U, T> {
        return new Pair(this.second, this.first);
    }

    map<V, W>(fnFirst: (v: T) => V, fnSecond: (v: U) => W): Pair<V, W> {
        return new Pair(fnFirst(this.first), fnSecond(this.second));
    }
}

const pair = new Pair("hello", 42);
const swapped = pair.swap();  // Pair<number, string>

// 泛型类继承
class SortableList<T> extends Array<T> {
    sortBy(compareFn: (a: T, b: T) => number): this {
        return this.sort(compareFn) as this;
    }
}

// 泛型类实现泛型接口
interface Serializable<T> {
    serialize(): string;
    deserialize(data: string): T;
}

class JsonStore<T> implements Serializable<T> {
    constructor(private data: T) {}

    serialize(): string {
        return JSON.stringify(this.data);
    }

    deserialize(json: string): T {
        return JSON.parse(json) as T;
    }

    getData(): T {
        return this.data;
    }
}

const store = new JsonStore({ name: "张三", age: 25 });
const json = store.serialize();  // string
```

### 适用场景

- **数据结构：** Stack、Queue、LinkedList、Tree 等通用数据结构
- **容器类：** 存储和管理特定类型数据的容器
- **服务类：** 通用的 Repository、Service 基类
- **状态管理：** 类型安全的 Store 类

### 常见问题

#### 泛型类的静态成员能使用类型参数吗

不能。类型参数只作用于实例成员。静态成员在所有实例间共享，不能依赖特定的类型参数。

```typescript
class MyClass<T> {
    instanceProp: T;       // 合法：实例成员
    // static staticProp: T;  // 编译错误：静态成员不能引用类型参数

    constructor(value: T) {
        this.instanceProp = value;
    }
}
```

#### 泛型类和泛型工厂函数哪个更好

简单场景用工厂函数更轻量，需要维护状态或有多个相关方法时用泛型类。函数式风格偏好工厂函数，面向对象风格偏好泛型类。

### 注意事项

- 泛型类型参数只作用于实例成员，不作用于静态成员
- 实例化时可以从构造函数参数自动推断类型参数
- 泛型类可以继承其他泛型类或非泛型类
- 泛型类可以实现泛型接口
- 泛型类编译后泛型消失，运行时就是普通的 JavaScript 类

### 总结

泛型类用 `<T>` 声明类型参数，让类的属性和方法能够参数化。类型参数只作用于实例成员，不能用于静态成员。广泛用于数据结构（Stack、Queue）、容器类和服务类。支持多类型参数、继承和接口实现。实例化时可以从构造函数参数自动推断类型。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 泛型约束(extends)的类型限制

### 概念定义

泛型约束使用 `extends` 关键字限制泛型类型参数必须满足某种类型条件。`<T extends Constraint>` 表示 T 必须是 Constraint 的子类型，这样在函数体内就可以安全地访问 Constraint 上定义的属性和方法。

没有约束的泛型参数等同于 unknown，不能访问任何具体属性。通过约束，泛型在保持灵活性的同时，获得了对特定属性的安全访问能力。

### 语法与用法

```typescript
// 约束 T 必须有 length 属性
function longest<T extends { length: number }>(a: T, b: T): T {
    return a.length >= b.length ? a : b;
}

longest("hello", "hi");       // 合法：string 有 length
longest([1, 2], [1, 2, 3]);  // 合法：数组有 length
// longest(10, 20);           // 编译错误：number 没有 length

// 约束 K 必须是 T 的键
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
    return obj[key];
}

const user = { id: 1, name: "张三" };
getProperty(user, "name");    // 合法
// getProperty(user, "email"); // 编译错误："email" 不在 keyof typeof user 中
```

### 基本示例

```typescript
// 接口约束
interface HasId {
    id: number;
}

function findById<T extends HasId>(items: T[], id: number): T | undefined {
    return items.find(item => item.id === id);
}

interface User extends HasId { name: string }
interface Product extends HasId { sku: string; price: number }

const users: User[] = [{ id: 1, name: "张三" }, { id: 2, name: "李四" }];
const products: Product[] = [{ id: 1, sku: "A001", price: 99 }];

findById(users, 1);     // User | undefined
findById(products, 1);  // Product | undefined

// 多重约束（交叉类型）
interface Serializable { serialize(): string }
interface Loggable { log(): void }

function process<T extends Serializable & Loggable>(item: T): string {
    item.log();              // 可以调用 Loggable 的方法
    return item.serialize(); // 可以调用 Serializable 的方法
}

// 约束泛型参数之间的关系
function assign<T extends object, U extends Partial<T>>(target: T, source: U): T {
    return { ...target, ...source };
}
```

### 进阶用法

```typescript
// 构造函数约束
function createInstance<T>(Ctor: new (...args: any[]) => T, ...args: any[]): T {
    return new Ctor(...args);
}

class Animal {
    constructor(public name: string) {}
}

const animal = createInstance(Animal, "旺财");  // Animal

// 递归约束
interface TreeNode<T> {
    value: T;
    children: TreeNode<T>[];
}

function findInTree<T>(
    node: TreeNode<T>,
    predicate: (value: T) => boolean
): T | undefined {
    if (predicate(node.value)) return node.value;
    for (const child of node.children) {
        const result = findInTree(child, predicate);
        if (result !== undefined) return result;
    }
    return undefined;
}

// 条件类型中的约束
type ElementType<T> = T extends (infer E)[] ? E : T;

type A = ElementType<string[]>;   // string
type B = ElementType<number>;     // number

// 约束配合默认值
interface PaginatedResult<T, Meta extends object = { total: number }> {
    data: T[];
    meta: Meta;
}

// 使用默认 Meta
const result1: PaginatedResult<User> = {
    data: [],
    meta: { total: 0 },
};

// 自定义 Meta
const result2: PaginatedResult<User, { total: number; page: number }> = {
    data: [],
    meta: { total: 0, page: 1 },
};
```

### 常见约束模式

| 约束模式 | 语法 | 用途 |
|---------|------|------|
| 属性约束 | `T extends { prop: Type }` | 确保 T 有某个属性 |
| 键约束 | `K extends keyof T` | 确保 K 是 T 的键 |
| 接口约束 | `T extends Interface` | 确保 T 实现某个接口 |
| 多重约束 | `T extends A & B` | 确保 T 同时满足多个条件 |
| 构造函数约束 | `T extends new () => X` | 确保 T 是可实例化的类 |
| 互相约束 | `U extends Partial<T>` | 泛型参数之间的约束关系 |

### 适用场景

- **通用查找函数：** 约束集合元素必须有 id 属性
- **属性安全访问：** 约束键参数是对象的合法键
- **工厂模式：** 约束参数是可实例化的构造函数
- **Mixin 模式：** 约束基类的最小形状

### 常见问题

#### 约束和类型断言的区别

约束在定义时就限制了 T 的范围，函数体内可以安全访问约束类型的属性。断言是在使用时强制告诉编译器类型，不安全。约束是编译器验证的，断言是开发者声明的。

#### 可以用联合类型做约束吗

可以。`T extends string | number` 表示 T 只能是 string 或 number（或它们的子类型）。

### 注意事项

- 约束用 extends 而不是 implements，即使约束的是接口
- 没有约束的泛型参数等同于 unknown
- 约束只限制类型参数的下界，T 可以是约束类型的任何子类型
- 多重约束用交叉类型 `&` 连接
- 泛型参数之间可以互相约束

### 总结

泛型约束用 `T extends Constraint` 限制类型参数的范围，让泛型在保持灵活性的同时可以安全访问约束类型的属性。常见模式包括属性约束、键约束、接口约束、多重约束和构造函数约束。约束是编译器验证的类型安全机制，比类型断言更可靠。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 泛型默认类型参数

### 概念定义

泛型默认类型参数允许在声明泛型时为类型参数指定默认值，语法为 `<T = DefaultType>`。当使用泛型类型时，如果没有显式传入类型参数且编译器无法推断，就会使用默认类型。

默认类型参数让泛型在简单场景下不需要手动指定类型，降低使用门槛，同时在复杂场景下仍然可以传入自定义类型。这和函数参数的默认值是类似的概念。

### 语法与用法

```typescript
// 泛型接口的默认类型
interface Container<T = string> {
    value: T;
}

// 不指定类型参数：使用默认值 string
const c1: Container = { value: "hello" };

// 指定类型参数：覆盖默认值
const c2: Container<number> = { value: 42 };

// 泛型类的默认类型
class Store<T = any> {
    private data: T[] = [];

    add(item: T): void {
        this.data.push(item);
    }

    getAll(): T[] {
        return [...this.data];
    }
}

// 不指定类型：T 使用默认值 any
const anyStore = new Store();
anyStore.add("hello");
anyStore.add(42);

// 指定类型：覆盖默认值
const numStore = new Store<number>();
numStore.add(42);
// numStore.add("hello");  // 编译错误
```

### 基本示例

```typescript
// 多泛型参数的默认值
interface ApiResponse<TData = unknown, TError = string> {
    success: boolean;
    data?: TData;
    error?: TError;
}

// 使用所有默认值
const resp1: ApiResponse = { success: true };

// 只指定第一个参数，第二个用默认值
const resp2: ApiResponse<{ id: number; name: string }[]> = {
    success: true,
    data: [{ id: 1, name: "张三" }],
};

// 指定所有参数
const resp3: ApiResponse<null, { code: number; msg: string }> = {
    success: false,
    error: { code: 404, msg: "未找到" },
};

// 事件发射器的默认类型
interface EventEmitter<Events extends Record<string, any> = Record<string, any>> {
    on<K extends keyof Events>(event: K, handler: (data: Events[K]) => void): void;
    emit<K extends keyof Events>(event: K, data: Events[K]): void;
}

// 使用默认类型：事件名是任意字符串
declare const emitter1: EventEmitter;
emitter1.on("anything", (data: any) => {});

// 指定具体事件类型
interface AppEvents {
    login: { userId: string };
    logout: void;
}

declare const emitter2: EventEmitter<AppEvents>;
emitter2.on("login", (data) => {
    // data 推断为 { userId: string }
    console.log(data.userId);
});
```

### 进阶用法

```typescript
// 默认值配合约束
interface Paginated<
    T,
    Meta extends { total: number } = { total: number; page: number; pageSize: number }
> {
    data: T[];
    meta: Meta;
}

// 使用默认 Meta
const result1: Paginated<string> = {
    data: ["a", "b"],
    meta: { total: 2, page: 1, pageSize: 10 },
};

// 自定义 Meta（必须满足约束）
const result2: Paginated<string, { total: number; cursor: string }> = {
    data: ["a"],
    meta: { total: 1, cursor: "abc" },
};

// React 组件中的默认泛型（概念示例）
interface TableProps<T = Record<string, any>> {
    data: T[];
    columns: { key: keyof T; title: string }[];
    onRowClick?: (row: T) => void;
}
```

### 默认类型参数的规则

| 规则 | 说明 | 示例 |
|------|------|------|
| 有默认值的参数在无默认值之后 | 类似函数参数 | `<T, U = string>` 合法 |
| 默认值必须满足约束 | 默认值要兼容 extends | `<T extends object = {}>` |
| 推断优先于默认值 | 能推断时不用默认值 | 函数参数可推断 |
| 可以引用前面的参数 | 默认值可以依赖之前的参数 | `<T, U = T[]>` |

### 适用场景

- **通用组件/库：** 提供合理的默认类型，简化常见用法
- **API 响应接口：** 默认 data 为 unknown，按需指定具体类型
- **配置接口：** 默认配置类型，允许覆盖
- **渐进式类型化：** 默认 any 或 unknown，逐步收窄

### 常见问题

#### 函数调用时默认值什么时候生效

泛型函数调用时，如果能从参数推断类型，推断结果优先于默认值。只有在既没有显式指定、也无法推断时，默认值才生效。对于泛型接口和类型别名（没有值可推断），不指定就用默认值。

#### 有默认值的参数可以放在无默认值的前面吗

不可以。有默认值的类型参数必须排在没有默认值的参数后面，和函数的默认参数规则一致。

### 注意事项

- 有默认值的类型参数必须在无默认值参数之后
- 默认值必须满足 extends 约束
- 函数调用时推断优先于默认值
- 默认值可以引用之前声明的类型参数
- 默认值让泛型接口在简单场景下不需要传类型参数

### 总结

泛型默认类型参数用 `<T = DefaultType>` 语法，在未指定且无法推断时使用默认类型。它降低了泛型的使用门槛，让简单场景不需要手动指定类型参数。默认值必须满足约束，有默认值的参数必须在无默认值参数之后，函数调用时推断优先于默认值。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 泛型条件类型(Conditional Types)

### 概念定义

条件类型（Conditional Types）使用 `T extends U ? X : Y` 语法，根据类型 T 是否可以赋值给类型 U 来选择 X 或 Y 作为结果类型。它是类型层面的三元表达式，让类型系统具备了条件分支的能力。

条件类型是 TypeScript 高级类型编程的基石，内置工具类型 Exclude、Extract、NonNullable、ReturnType、Parameters 等都依赖条件类型实现。

### 语法与用法

```typescript
// 基本语法：T extends U ? TrueType : FalseType
type IsString<T> = T extends string ? true : false;

type A = IsString<string>;   // true
type B = IsString<number>;   // false
type C = IsString<"hello">;  // true（"hello" 是 string 的子类型）

// 实际应用：根据输入类型决定返回类型
type IdType<T> = T extends string ? string : number;

function processId<T extends string | number>(id: T): IdType<T> {
    // 实现略
    return id as any;
}
```

### 基本示例

```typescript
// 提取数组元素类型
type ElementType<T> = T extends (infer E)[] ? E : T;

type A = ElementType<string[]>;    // string
type B = ElementType<number[]>;    // number
type C = ElementType<boolean>;     // boolean（不是数组，返回自身）

// 提取 Promise 包裹的类型
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

type D = UnwrapPromise<Promise<string>>;  // string
type E = UnwrapPromise<number>;            // number

// 提取函数返回类型（ReturnType 的实现原理）
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

type F = MyReturnType<() => string>;              // string
type G = MyReturnType<(x: number) => boolean>;    // boolean

// 排除 null 和 undefined（NonNullable 的实现原理）
type MyNonNullable<T> = T extends null | undefined ? never : T;

type H = MyNonNullable<string | null | undefined>;  // string
```

### 进阶用法

```typescript
// 嵌套条件类型
type TypeName<T> =
    T extends string ? "string" :
    T extends number ? "number" :
    T extends boolean ? "boolean" :
    T extends undefined ? "undefined" :
    T extends Function ? "function" :
    "object";

type T1 = TypeName<string>;     // "string"
type T2 = TypeName<() => void>; // "function"
type T3 = TypeName<string[]>;   // "object"

// 条件类型配合映射类型
type ConditionalPick<T, Condition> = {
    [K in keyof T as T[K] extends Condition ? K : never]: T[K];
};

interface User {
    id: number;
    name: string;
    email: string;
    age: number;
    active: boolean;
}

type StringProps = ConditionalPick<User, string>;
// { name: string; email: string }

type NumberProps = ConditionalPick<User, number>;
// { id: number; age: number }

// 递归条件类型：深层解包 Promise
type DeepAwaited<T> = T extends Promise<infer U> ? DeepAwaited<U> : T;

type Nested = DeepAwaited<Promise<Promise<Promise<string>>>>;  // string
```

### 条件类型与其他类型操作的对比

| 类型操作 | 语法 | 能力 |
|---------|------|------|
| 联合类型 | `A \| B` | 类型的"或"关系 |
| 交叉类型 | `A & B` | 类型的"与"关系 |
| 映射类型 | `{ [K in Keys]: T }` | 键值变换 |
| 条件类型 | `T extends U ? X : Y` | 条件分支选择 |
| infer | `T extends F<infer U> ? U : T` | 模式匹配提取 |

### 适用场景

- **工具类型实现：** Exclude、Extract、ReturnType 等的底层实现
- **类型转换：** 根据输入类型动态计算输出类型
- **类型过滤：** 从联合类型中按条件筛选成员
- **类型解包：** 从 Promise、Array 等容器类型中提取内部类型

### 常见问题

#### 条件类型中的 never 有什么特殊行为

在分布式条件类型中，never 作为输入时会直接返回 never（因为 never 是空联合类型，没有成员可分布）。`IsString<never>` 的结果是 never，不是 true 也不是 false。

#### 条件类型能在运行时使用吗

不能。条件类型是纯编译期计算，编译后完全消失。运行时的条件判断用 if/else 或三元表达式。

### 注意事项

- 条件类型是编译期计算，不影响运行时
- 条件类型对联合类型有分布式行为（下一篇详细讲解）
- infer 关键字只能在条件类型的 extends 子句中使用
- 递归条件类型有深度限制，过深会报错
- never 在分布式条件类型中作为输入时直接返回 never

### 总结

条件类型 `T extends U ? X : Y` 是类型层面的三元表达式，根据类型关系选择结果类型。配合 infer 可以从复杂类型中提取内部类型。它是内置工具类型的实现基础，也是高级类型编程的核心机制。支持嵌套和递归，但有深度限制。编译后完全消失，不影响运行时。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 条件类型的分布式特性

### 概念定义

分布式条件类型（Distributive Conditional Types）是指当条件类型的被检查类型（extends 左边）是裸类型参数（Naked Type Parameter）且传入联合类型时，条件类型会自动对联合类型的每个成员分别应用，然后将结果合并为新的联合类型。

"裸类型参数"是指类型参数直接出现在 extends 左边，没有被包裹在其他类型结构中（如元组、数组、对象等）。这种分布式行为是 Exclude、Extract 等工具类型能够工作的核心机制。

### 语法与用法

```typescript
// 分布式条件类型
type ToArray<T> = T extends any ? T[] : never;

// 传入联合类型时，自动分布
type Result = ToArray<string | number>;
// 等价于 ToArray<string> | ToArray<number>
// 等价于 string[] | number[]

// 如果不想要分布式行为，用元组包裹
type ToArrayNonDist<T> = [T] extends [any] ? T[] : never;

type Result2 = ToArrayNonDist<string | number>;
// (string | number)[]（不分布，整体作为一个联合类型处理）
```

### 基本示例

```typescript
// Exclude 的实现原理（依赖分布式特性）
type MyExclude<T, U> = T extends U ? never : T;

type A = MyExclude<"a" | "b" | "c", "a">;
// 分布式展开：
// ("a" extends "a" ? never : "a") | ("b" extends "a" ? never : "b") | ("c" extends "a" ? never : "c")
// never | "b" | "c"
// 结果："b" | "c"

// Extract 的实现原理
type MyExtract<T, U> = T extends U ? T : never;

type B = MyExtract<string | number | boolean, string | boolean>;
// string | boolean

// NonNullable 的实现原理
type MyNonNullable<T> = T extends null | undefined ? never : T;

type C = MyNonNullable<string | null | undefined | number>;
// string | number

// 分布式的类型映射
type Stringify<T> = T extends any ? `${T & string}` : never;

type D = Stringify<"a" | "b" | "c">;
// "a" | "b" | "c"（每个成员分别应用模板字面量）
```

### 进阶用法

```typescript
// 利用分布式特性做联合类型转交叉类型
type UnionToIntersection<U> =
    (U extends any ? (arg: U) => void : never) extends (arg: infer I) => void
        ? I
        : never;

type Inter = UnionToIntersection<{ a: 1 } | { b: 2 }>;
// { a: 1 } & { b: 2 }

// 禁用分布式行为的场景
type IsNever<T> = [T] extends [never] ? true : false;

type E = IsNever<never>;    // true
type F = IsNever<string>;   // false

// 如果不用 [T] extends [never]，而是 T extends never：
type IsNeverBad<T> = T extends never ? true : false;
type G = IsNeverBad<never>;  // never（因为 never 是空联合，分布后无成员可应用）

// 分布式条件类型配合映射
type PromiseAll<T extends readonly unknown[]> = {
    [K in keyof T]: T[K] extends Promise<infer U> ? U : T[K];
};

type Resolved = PromiseAll<[Promise<string>, Promise<number>, boolean]>;
// [string, number, boolean]
```

### 分布式 vs 非分布式对比

| 特性 | 分布式（裸类型参数） | 非分布式（包裹后） |
|------|-------|---------|
| 语法 | `T extends U ? X : Y` | `[T] extends [U] ? X : Y` |
| 联合类型行为 | 每个成员分别应用 | 整体作为一个联合处理 |
| never 输入 | 返回 never | 正常判断 |
| 典型用途 | Exclude、Extract | IsNever、精确判断 |

### 适用场景

- **类型过滤：** Exclude、Extract 从联合类型中按条件筛选
- **类型清洗：** NonNullable 移除 null 和 undefined
- **联合类型遍历：** 对联合类型的每个成员分别做类型变换
- **类型反转：** UnionToIntersection 联合转交叉

### 常见问题

#### 什么是"裸类型参数"

裸类型参数是指类型参数直接出现在 extends 左边，没有被任何类型构造器包裹。`T extends string` 中的 T 是裸的，`T[] extends string[]` 中的 T 不是裸的，`[T] extends [string]` 中的 T 也不是裸的。

#### 为什么 never 在分布式条件类型中返回 never

never 在类型系统中相当于"空联合类型"（零个成员的联合）。分布式条件类型对每个联合成员应用，但 never 没有成员，所以结果也是 never（零个结果的联合）。

### 注意事项

- 分布式行为只在裸类型参数时发生
- 用 `[T] extends [U]` 可以禁用分布式行为
- never 在分布式条件类型中会直接返回 never
- boolean 实际上是 `true | false` 的联合，也会被分布
- 分布式特性是 Exclude、Extract、NonNullable 等工具类型的基础

### 总结

分布式条件类型在裸类型参数传入联合类型时，自动对每个成员分别应用条件类型并合并结果。这是 Exclude、Extract、NonNullable 等内置工具类型的实现基础。用 `[T] extends [U]` 包裹可以禁用分布式行为。never 作为空联合在分布式中直接返回 never，判断 never 类型需要用非分布式写法。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 条件类型的infer关键字

### 概念定义

`infer` 关键字只能在条件类型的 `extends` 子句中使用，用于声明一个待推断的类型变量。TypeScript 编译器会尝试从实际传入的类型中推断出 infer 声明的类型变量的具体值，然后在 true 分支中使用这个推断结果。

infer 的作用类似于"类型层面的模式匹配"——从一个复杂类型的特定位置提取出内部类型。ReturnType、Parameters、InstanceType 等内置工具类型都依赖 infer 实现。

### 语法与用法

```typescript
// 基本语法：在 extends 子句中用 infer 声明待推断的类型变量
type GetReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
//                                                     ^^^^^
//                                                     infer R 声明待推断的返回类型

type A = GetReturnType<() => string>;          // string
type B = GetReturnType<(x: number) => boolean>; // boolean
type C = GetReturnType<string>;                 // never（不是函数类型）
```

### 基本示例

```typescript
// 提取函数参数类型（Parameters 的实现原理）
type MyParameters<T> = T extends (...args: infer P) => any ? P : never;

type Params = MyParameters<(name: string, age: number) => void>;
// [name: string, age: number]

// 提取第一个参数类型
type FirstParam<T> = T extends (first: infer F, ...rest: any[]) => any ? F : never;

type First = FirstParam<(name: string, age: number) => void>;
// string

// 提取 Promise 内部类型（Awaited 的简化版）
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

type D = UnwrapPromise<Promise<string>>;  // string
type E = UnwrapPromise<Promise<number>>; // number
type F = UnwrapPromise<boolean>;          // boolean

// 提取数组元素类型
type ArrayElement<T> = T extends (infer E)[] ? E : never;

type G = ArrayElement<string[]>;   // string
type H = ArrayElement<number[]>;   // number

// 提取构造函数实例类型（InstanceType 的实现原理）
type MyInstanceType<T> = T extends new (...args: any[]) => infer I ? I : never;

class User { name = ""; age = 0; }
type UserInstance = MyInstanceType<typeof User>;  // User
```

### 进阶用法

```typescript
// 递归提取嵌套 Promise
type DeepAwaited<T> = T extends Promise<infer U> ? DeepAwaited<U> : T;

type Nested = DeepAwaited<Promise<Promise<Promise<string>>>>;  // string

// 提取元组的首尾元素
type Head<T extends any[]> = T extends [infer H, ...any[]] ? H : never;
type Tail<T extends any[]> = T extends [any, ...infer R] ? R : never;
type Last<T extends any[]> = T extends [...any[], infer L] ? L : never;

type H1 = Head<[string, number, boolean]>;  // string
type T1 = Tail<[string, number, boolean]>;  // [number, boolean]
type L1 = Last<[string, number, boolean]>;  // boolean

// 字符串模式匹配
type TrimLeft<S extends string> =
    S extends ` ${infer Rest}` ? TrimLeft<Rest> : S;

type Trimmed = TrimLeft<"   hello">;  // "hello"

// 提取对象值类型中的 Promise 结果
type ResolvedValues<T> = {
    [K in keyof T]: T[K] extends Promise<infer V> ? V : T[K];
};

interface AsyncData {
    user: Promise<{ name: string }>;
    count: Promise<number>;
    label: string;
}

type Resolved = ResolvedValues<AsyncData>;
// { user: { name: string }; count: number; label: string }

// 多位置 infer 的推断（同名 infer 取联合或交叉）
type Foo<T> = T extends {
    a: infer U;
    b: infer U;  // 同名 U，协变位置取联合类型
} ? U : never;

type R1 = Foo<{ a: string; b: number }>;  // string | number
```

### infer 在不同位置的提取

| 位置 | 语法 | 提取的内容 |
|------|------|-----------|
| 函数返回值 | `(...) => infer R` | 返回类型 |
| 函数参数 | `(arg: infer P) => any` | 参数类型 |
| 数组元素 | `(infer E)[]` | 元素类型 |
| Promise 内部 | `Promise<infer U>` | Promise 值类型 |
| 构造函数 | `new (...) => infer I` | 实例类型 |
| 元组首元素 | `[infer H, ...any[]]` | 第一个元素类型 |
| 字符串模板 | `` `${infer A}-${infer B}` `` | 模板各段 |

### 适用场景

- **工具类型实现：** ReturnType、Parameters、InstanceType、Awaited
- **元组操作：** 提取首尾元素、拆分元组
- **字符串类型操作：** 模式匹配、拆分、替换
- **递归类型解包：** 深层解包 Promise、数组等嵌套类型

### 常见问题

#### infer 可以在 extends 子句外使用吗

不能。infer 只能在条件类型的 extends 子句中声明。在 true 分支中使用推断出的类型变量，在 false 分支中该变量不可用。

#### 同名 infer 出现多次会怎样

协变位置（如返回值、属性值）的同名 infer 取联合类型；逆变位置（如函数参数）的同名 infer 取交叉类型。

### 注意事项

- infer 只能在条件类型的 extends 子句中使用
- infer 声明的类型变量只在 true 分支中可用
- 同名 infer 在协变位置取联合、逆变位置取交叉
- 递归 infer 有深度限制（TypeScript 默认约 100 层）
- infer 是实现高级工具类型的核心机制

### 总结

infer 在条件类型的 extends 子句中声明待推断的类型变量，实现类型层面的模式匹配。可以从函数返回值、参数、数组元素、Promise 内部、元组位置和字符串模板中提取类型。它是 ReturnType、Parameters、Awaited 等内置工具类型的实现基础，也是高级类型编程中最强大的类型提取机制。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 映射类型(Mapped Types)的键值变换

### 概念定义

映射类型（Mapped Types）通过遍历已有类型的键来生成新类型，语法为 `{ [K in Keys]: NewType }`。它类似于 JavaScript 中的 `for...in` 或 `Array.map`，对每个键应用一个类型变换，生成具有新属性类型的对象类型。

映射类型是 Partial、Required、Readonly、Pick、Record 等内置工具类型的实现基础，也是自定义类型转换工具的核心机制。

### 语法与用法

```typescript
// 基本语法
type MappedType<T> = {
    [K in keyof T]: T[K];  // 遍历 T 的每个键，保留原始值类型
};

// Readonly 的实现
type MyReadonly<T> = {
    readonly [K in keyof T]: T[K];  // 每个属性加 readonly
};

// Partial 的实现
type MyPartial<T> = {
    [K in keyof T]?: T[K];  // 每个属性变可选
};

// 值类型变换
type Nullable<T> = {
    [K in keyof T]: T[K] | null;  // 每个属性值可以是 null
};

interface User {
    id: number;
    name: string;
    email: string;
}

type ReadonlyUser = MyReadonly<User>;
// { readonly id: number; readonly name: string; readonly email: string }

type PartialUser = MyPartial<User>;
// { id?: number; name?: string; email?: string }

type NullableUser = Nullable<User>;
// { id: number | null; name: string | null; email: string | null }
```

### 基本示例

```typescript
// Record 的实现：从键联合生成对象类型
type MyRecord<K extends string | number | symbol, V> = {
    [P in K]: V;
};

type PageInfo = MyRecord<"home" | "about" | "contact", { title: string; url: string }>;
// { home: { title: string; url: string }; about: ...; contact: ... }

// Pick 的实现：选择部分属性
type MyPick<T, K extends keyof T> = {
    [P in K]: T[P];
};

type UserBasic = MyPick<User, "id" | "name">;
// { id: number; name: string }

// 值类型转换：所有属性变为 Promise
type Promisified<T> = {
    [K in keyof T]: Promise<T[K]>;
};

type AsyncUser = Promisified<User>;
// { id: Promise<number>; name: Promise<string>; email: Promise<string> }

// 值类型转换：所有属性变为 getter 函数
type Getters<T> = {
    [K in keyof T]: () => T[K];
};

type UserGetters = Getters<User>;
// { id: () => number; name: () => string; email: () => string }
```

### 进阶用法

```typescript
// 条件映射：根据值类型做不同变换
type StringifyNumbers<T> = {
    [K in keyof T]: T[K] extends number ? string : T[K];
};

type Stringified = StringifyNumbers<User>;
// { id: string; name: string; email: string }
// id 从 number 变为 string，name 和 email 保持 string

// 深层映射：递归处理嵌套对象
type DeepReadonly<T> = {
    readonly [K in keyof T]: T[K] extends object
        ? T[K] extends Function
            ? T[K]  // 函数不递归
            : DeepReadonly<T[K]>  // 对象递归处理
        : T[K];
};

interface Config {
    database: {
        host: string;
        port: number;
        options: {
            ssl: boolean;
        };
    };
    debug: boolean;
}

type ReadonlyConfig = DeepReadonly<Config>;
// 所有层级的属性都变为 readonly

// 映射类型保留修饰符
type KeepModifiers<T> = {
    [K in keyof T]: T[K];
    // 默认保留原始的 readonly 和 ? 修饰符
};
```

### 映射类型的键来源

| 键来源 | 语法 | 说明 |
|--------|------|------|
| 现有类型的键 | `[K in keyof T]` | 遍历 T 的所有键 |
| 字面量联合 | `[K in "a" \| "b"]` | 遍历指定的字面量 |
| 模板字面量 | `[K in \`on${string}\`]` | 匹配模板模式 |
| 枚举值 | `[K in MyEnum]` | 遍历枚举成员 |

### 适用场景

- **属性修饰：** 批量添加 readonly、optional 修饰符
- **值类型转换：** 将所有属性值包装为 Promise、函数、数组等
- **工具类型构建：** 实现 Partial、Required、Readonly、Pick、Record
- **深层转换：** 递归映射处理嵌套对象

### 常见问题

#### 映射类型和索引签名的区别

映射类型 `[K in Keys]` 遍历具体的键集合，生成确定的属性。索引签名 `[key: string]` 表示任意字符串键。映射类型结果的每个属性名是已知的，索引签名的属性名是未知的。

#### 映射类型会保留原始修饰符吗

默认保留。`[K in keyof T]: T[K]` 会保留 T 中属性的 readonly 和 ? 修饰符。可以用 +/- 修饰符显式添加或移除。

### 注意事项

- 映射类型默认保留原始属性的 readonly 和 ? 修饰符
- 映射类型只能用于对象类型的属性遍历
- 递归映射类型需要处理 Function 等不应递归的类型
- `keyof T` 只包含公共属性的键
- 映射类型编译后完全消失，不影响运行时

### 总结

映射类型 `{ [K in Keys]: NewType }` 通过遍历键生成新的对象类型，是批量属性变换的核心机制。默认保留 readonly 和 ? 修饰符。键来源可以是 keyof T、字面量联合或模板字面量。它是 Partial、Required、Readonly、Pick、Record 等内置工具类型的实现基础，支持条件映射和递归映射。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 映射类型的修饰符(+/-)

### 概念定义

映射类型中可以用 `+` 和 `-` 前缀来添加或移除属性的 `readonly` 和 `?`（可选）修饰符。`+` 表示添加修饰符（默认行为，可省略），`-` 表示移除修饰符。

这种机制让映射类型不仅能变换属性的值类型，还能精确控制属性的可选性和只读性。Required 和 Mutable（去 readonly）等工具类型就是通过 `-` 修饰符实现的。

### 语法与用法

```typescript
// 移除可选修饰符：Required 的实现
type MyRequired<T> = {
    [K in keyof T]-?: T[K];  // -? 移除可选，所有属性变为必填
};

// 移除只读修饰符：Mutable 的实现
type Mutable<T> = {
    -readonly [K in keyof T]: T[K];  // -readonly 移除只读
};

// 添加修饰符（+ 可省略）
type ReadonlyPartial<T> = {
    +readonly [K in keyof T]+?: T[K];
    // 等价于 readonly [K in keyof T]?: T[K];
};

interface User {
    readonly id: number;
    name: string;
    email?: string;
    age?: number;
}

type RequiredUser = MyRequired<User>;
// { readonly id: number; name: string; email: string; age: number }
// 所有 ? 被移除，但 readonly 保留

type MutableUser = Mutable<User>;
// { id: number; name: string; email?: string; age?: number }
// readonly 被移除，但 ? 保留
```

### 基本示例

```typescript
// 同时移除 readonly 和 ?
type MutableRequired<T> = {
    -readonly [K in keyof T]-?: T[K];
};

type FullMutable = MutableRequired<User>;
// { id: number; name: string; email: string; age: number }
// readonly 和 ? 都被移除

// 同时添加 readonly 和 ?
type ReadonlyOptional<T> = {
    readonly [K in keyof T]?: T[K];
};

type ROUser = ReadonlyOptional<User>;
// { readonly id: number; readonly name?: string; readonly email?: string; readonly age?: number }

// 实际应用：表单的初始状态（全部可选）和提交状态（全部必填）
interface FormData {
    username: string;
    password: string;
    email: string;
}

type FormDraft = Partial<FormData>;
// { username?: string; password?: string; email?: string }

type FormSubmit = Required<FormData>;
// { username: string; password: string; email: string }

// 冻结对象的类型（深层 readonly）
type Frozen<T> = {
    readonly [K in keyof T]: T[K] extends object
        ? T[K] extends Function
            ? T[K]
            : Frozen<T[K]>
        : T[K];
};
```

### 进阶用法

```typescript
// 选择性地修改修饰符
type RequiredKeys<T, K extends keyof T> = {
    [P in K]-?: T[P];
} & {
    [P in Exclude<keyof T, K>]: T[P];
};

interface Config {
    host?: string;
    port?: number;
    debug?: boolean;
    logLevel?: string;
}

// 只让 host 和 port 变必填，其余保持可选
type RequiredConfig = RequiredKeys<Config, "host" | "port">;
// { host: string; port: number; debug?: boolean; logLevel?: string }

// 选择性添加 readonly
type ReadonlyKeys<T, K extends keyof T> = {
    readonly [P in K]: T[P];
} & {
    [P in Exclude<keyof T, K>]: T[P];
};

interface State {
    id: number;
    name: string;
    count: number;
}

// 只让 id 变为 readonly
type ProtectedState = ReadonlyKeys<State, "id">;
// { readonly id: number; name: string; count: number }
```

### 修饰符操作一览

| 语法 | 效果 | 对应工具类型 |
|------|------|------------|
| `[K in keyof T]?: T[K]` | 添加可选 | Partial\&lt;T\> |
| `[K in keyof T]-?: T[K]` | 移除可选 | Required\&lt;T\> |
| `readonly [K in keyof T]: T[K]` | 添加只读 | Readonly\&lt;T\> |
| `-readonly [K in keyof T]: T[K]` | 移除只读 | Mutable\&lt;T\>（自定义） |
| `-readonly [K in keyof T]-?: T[K]` | 移除只读+可选 | 自定义 |

### 适用场景

- **表单处理：** 草稿状态全可选（Partial），提交时全必填（Required）
- **不可变数据：** 状态对象全 readonly（Readonly），需要修改时去 readonly（Mutable）
- **配置合并：** 默认配置全可选，最终配置全必填
- **选择性修改：** 只对部分属性添加或移除修饰符

### 常见问题

#### -? 会移除 undefined 吗

`-?` 移除可选标记。如果属性原本是 `name?: string`（等价于 `name?: string | undefined`），`-?` 后变成 `name: string`，undefined 也会被移除。但如果原本是 `name: string | undefined`（显式联合），`-?` 不会移除 undefined。

#### TypeScript 内置有 Mutable 工具类型吗

没有。Readonly 的逆操作需要自己定义 `type Mutable<T> = { -readonly [K in keyof T]: T[K] }`。

### 注意事项

- `+` 修饰符可以省略，`readonly` 等价于 `+readonly`，`?` 等价于 `+?`
- `-` 修饰符不可省略，必须显式写出
- 修饰符操作只影响当前层级，不递归到嵌套对象
- 深层修饰符变更需要自定义递归映射类型
- `-?` 会同时移除属性值中的 `| undefined`（由可选标记引入的）

### 总结

映射类型的 `+` 和 `-` 修饰符精确控制属性的 readonly 和 ? 修饰。`-?` 移除可选使属性必填（Required 的原理），`-readonly` 移除只读使属性可写。可以同时操作两个修饰符，也可以选择性地只对部分属性修改。修饰符操作只影响当前层级，深层操作需要递归映射。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 映射类型的键重映射(as)

### 概念定义

TypeScript 4.1 引入了映射类型的键重映射（Key Remapping），使用 `as` 子句在遍历键时将原始键名转换为新的键名。语法为 `{ [K in keyof T as NewKey]: T[K] }`。配合模板字面量类型和条件类型，可以实现键名转换、键过滤等高级操作。

键重映射极大增强了映射类型的表达能力——不仅能变换值类型，还能变换键名本身，甚至可以通过将键映射为 never 来过滤掉不需要的属性。

### 语法与用法

```typescript
// 基本键重映射：给所有键加前缀
type Prefixed<T, Prefix extends string> = {
    [K in keyof T as `${Prefix}_${string & K}`]: T[K];
};

interface User {
    id: number;
    name: string;
    email: string;
}

type PrefixedUser = Prefixed<User, "user">;
// { user_id: number; user_name: string; user_email: string }

// 键名过滤：映射为 never 可以移除属性
type OmitByType<T, U> = {
    [K in keyof T as T[K] extends U ? never : K]: T[K];
};

type WithoutStrings = OmitByType<User, string>;
// { id: number }（移除了所有 string 类型的属性）
```

### 基本示例

```typescript
// 生成 getter 方法名
type Getters<T> = {
    [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type UserGetters = Getters<User>;
// { getId: () => number; getName: () => string; getEmail: () => string }

// 生成 setter 方法名
type Setters<T> = {
    [K in keyof T as `set${Capitalize<string & K>}`]: (value: T[K]) => void;
};

type UserSetters = Setters<User>;
// { setId: (value: number) => void; setName: (value: string) => void; ... }

// 生成事件处理器名
type EventHandlers<T> = {
    [K in keyof T as `on${Capitalize<string & K>}Change`]: (newValue: T[K], oldValue: T[K]) => void;
};

type UserHandlers = EventHandlers<User>;
// { onIdChange: (n: number, o: number) => void; onNameChange: ...; ... }

// Omit 的实现（使用键重映射）
type MyOmit<T, K extends keyof T> = {
    [P in keyof T as P extends K ? never : P]: T[P];
};

type UserWithoutEmail = MyOmit<User, "email">;
// { id: number; name: string }
```

### 进阶用法

```typescript
// 按值类型分组属性
type PickByType<T, ValueType> = {
    [K in keyof T as T[K] extends ValueType ? K : never]: T[K];
};

interface Mixed {
    id: number;
    name: string;
    active: boolean;
    count: number;
    label: string;
}

type NumberProps = PickByType<Mixed, number>;
// { id: number; count: number }

type StringProps = PickByType<Mixed, string>;
// { name: string; label: string }

// 键名转换：驼峰转蛇形（简化版）
type CamelToSnake<S extends string> =
    S extends `${infer Head}${infer Tail}`
        ? Tail extends Uncapitalize<Tail>
            ? `${Lowercase<Head>}${CamelToSnake<Tail>}`
            : `${Lowercase<Head>}_${CamelToSnake<Tail>}`
        : S;

type SnakeCase<T> = {
    [K in keyof T as CamelToSnake<string & K>]: T[K];
};

interface ApiData {
    userId: number;
    userName: string;
    createdAt: string;
}

type SnakeApiData = SnakeCase<ApiData>;
// { user_id: number; user_name: string; created_at: string }

// 合并多个映射
type GettersAndSetters<T> = {
    [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
} & {
    [K in keyof T as `set${Capitalize<string & K>}`]: (value: T[K]) => void;
};
```

### 键重映射的常见模式

| 模式 | as 子句 | 效果 |
|------|---------|------|
| 添加前缀 | `as \`prefix_${K}\`` | 键名加前缀 |
| 首字母大写 | `as Capitalize<K>` | 键名首字母大写 |
| getter 命名 | `as \`get${Capitalize&lt;K>}\`` | 生成 getter 名 |
| 过滤属性 | `as T[K] extends X ? K : never` | 按值类型过滤 |
| 排除属性 | `as K extends X ? never : K` | 排除指定键 |

### 适用场景

- **API 层转换：** 驼峰/蛇形键名互转
- **访问器生成：** 自动生成 getter/setter 类型签名
- **属性过滤：** 按值类型筛选属性
- **事件系统：** 生成 on+事件名 的处理器类型

### 常见问题

#### 为什么需要 `string & K` 而不是直接用 K

keyof T 的结果类型是 `string | number | symbol`，模板字面量类型只能用 string。`string & K` 过滤出 K 中的字符串键，排除 number 和 symbol 键。

#### 键重映射为 never 和 Omit 有什么区别

效果相同，键重映射为 never 是 Omit 的一种实现方式。键重映射更灵活，可以基于值类型过滤，而 Omit 只能基于键名过滤。

### 注意事项

- 键重映射需要 TypeScript 4.1+
- 映射为 never 的键会被自动移除
- 模板字面量中的 K 需要用 `string & K` 确保是字符串类型
- 键重映射可以和修饰符（readonly、?）同时使用
- 复杂的键名转换（如完整的驼峰转蛇形）需要递归类型

### 总结

键重映射用 `as` 子句在映射类型中转换键名，支持模板字面量转换、条件过滤和键名计算。映射为 never 可以移除属性。广泛用于生成 getter/setter 类型、API 键名转换、按值类型过滤属性。需要 TypeScript 4.1+，模板字面量中用 `string & K` 确保键是字符串类型。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 模板字面量类型(Template Literal Types)

### 概念定义

模板字面量类型（Template Literal Types）是 TypeScript 4.1 引入的特性，使用与 JavaScript 模板字符串相同的反引号语法，在类型层面拼接和构造字符串字面量类型。语法为 `` `${TypeA}${TypeB}` ``，其中插值位置可以是字符串字面量类型、联合类型或其他模板字面量类型。

当插值位置是联合类型时，模板字面量类型会自动生成所有可能组合的联合类型，这种"笛卡尔积"展开是构建复杂字符串类型约束的基础。

### 语法与用法

```typescript
// 基本拼接
type Greeting = `hello ${string}`;  // 匹配所有以 "hello " 开头的字符串

type World = "world";
type HelloWorld = `hello ${World}`;  // "hello world"

// 联合类型的展开
type Color = "red" | "green" | "blue";
type Size = "small" | "large";

type ColorSize = `${Color}-${Size}`;
// "red-small" | "red-large" | "green-small" | "green-large" | "blue-small" | "blue-large"

// 内置字符串操作类型
type Upper = Uppercase<"hello">;      // "HELLO"
type Lower = Lowercase<"HELLO">;      // "hello"
type Cap = Capitalize<"hello">;        // "Hello"
type Uncap = Uncapitalize<"Hello">;    // "hello"
```

### 基本示例

```typescript
// CSS 属性类型
type CSSProperty = "margin" | "padding" | "border";
type Direction = "top" | "right" | "bottom" | "left";

type CSSDirectionalProperty = `${CSSProperty}-${Direction}`;
// "margin-top" | "margin-right" | ... | "border-left"（12种组合）

// 事件名类型
type EventName = "click" | "focus" | "blur" | "change";
type EventHandler = `on${Capitalize<EventName>}`;
// "onClick" | "onFocus" | "onBlur" | "onChange"

// HTTP 方法和路径
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";
type ApiPath = "/users" | "/posts" | "/comments";

type ApiEndpoint = `${HttpMethod} ${ApiPath}`;
// "GET /users" | "GET /posts" | ... | "DELETE /comments"

// 环境变量前缀约束
type EnvVar = `REACT_APP_${string}`;

function getEnv(key: EnvVar): string | undefined {
    return process.env[key];
}

getEnv("REACT_APP_API_URL");  // 合法
// getEnv("API_URL");          // 编译错误：不以 REACT_APP_ 开头
```

### 进阶用法

```typescript
// 模板字面量配合 infer 做字符串解析
type ExtractRouteParams<T extends string> =
    T extends `${string}:${infer Param}/${infer Rest}`
        ? Param | ExtractRouteParams<`/${Rest}`>
        : T extends `${string}:${infer Param}`
            ? Param
            : never;

type Params = ExtractRouteParams<"/users/:userId/posts/:postId">;
// "userId" | "postId"

// 驼峰转短横线
type CamelToKebab<S extends string> =
    S extends `${infer First}${infer Rest}`
        ? Rest extends Uncapitalize<Rest>
            ? `${Lowercase<First>}${CamelToKebab<Rest>}`
            : `${Lowercase<First>}-${CamelToKebab<Rest>}`
        : S;

type Kebab = CamelToKebab<"backgroundColor">;  // "background-color"
type Kebab2 = CamelToKebab<"fontSize">;          // "font-size"

// 类型安全的路由定义
type Route<Path extends string> = {
    path: Path;
    params: Record<ExtractRouteParams<Path>, string>;
};

const userRoute: Route<"/users/:userId"> = {
    path: "/users/:userId",
    params: { userId: "123" },  // 必须有 userId 属性
};

// 点表示法的嵌套路径
type DotPath<T, Prefix extends string = ""> =
    T extends object
        ? {
            [K in keyof T & string]: T[K] extends object
                ? DotPath<T[K], `${Prefix}${K}.`>
                : `${Prefix}${K}`;
        }[keyof T & string]
        : never;

interface Config {
    db: { host: string; port: number };
    app: { name: string };
}

type ConfigPaths = DotPath<Config>;
// "db.host" | "db.port" | "app.name"
```

### 内置字符串操作类型

| 类型 | 效果 | 示例 |
|------|------|------|
| `Uppercase<S>` | 全部大写 | `"hello"` → `"HELLO"` |
| `Lowercase<S>` | 全部小写 | `"HELLO"` → `"hello"` |
| `Capitalize<S>` | 首字母大写 | `"hello"` → `"Hello"` |
| `Uncapitalize<S>` | 首字母小写 | `"Hello"` → `"hello"` |

### 适用场景

- **事件系统：** 生成 onClick、onFocus 等事件处理器名
- **CSS 类型：** 约束 CSS 属性名的合法组合
- **路由系统：** 提取路由参数、约束路径格式
- **API 端点：** 类型安全的 HTTP 方法 + 路径组合
- **配置键：** 约束配置键的前缀或格式

### 常见问题

#### 模板字面量类型的组合数量有限制吗

有。联合类型展开的笛卡尔积不能超过一定数量（TypeScript 限制约 10 万个成员）。如果组合过多会报错。实际中应避免过多联合类型的交叉展开。

#### 模板字面量类型能做完整的字符串解析吗

可以做简单的模式匹配和拆分，但复杂的解析（如完整的正则匹配）不支持。TypeScript 的类型系统是图灵完备的，理论上可以做，但实际中有递归深度限制。

### 注意事项

- 需要 TypeScript 4.1+
- 联合类型插值会产生笛卡尔积，组合数量不能过大
- 配合 infer 可以做字符串模式匹配和解析
- 递归模板字面量类型有深度限制
- `string & K` 确保键名是字符串类型才能用于模板字面量

### 总结

模板字面量类型用反引号语法在类型层面拼接字符串字面量，联合类型插值自动生成笛卡尔积。配合 Capitalize 等内置操作和 infer 模式匹配，可以实现事件名生成、路由参数提取、键名转换等高级字符串类型操作。需要注意组合数量限制和递归深度限制。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 递归类型(Recursive Types)的定义

### 概念定义

递归类型是在类型定义中引用自身的类型，用于描述嵌套层级不确定的数据结构。TypeScript 支持接口、类型别名和条件类型中的递归引用。典型的递归数据结构包括树形结构、链表、嵌套对象和 JSON 类型等。

TypeScript 4.1 开始支持条件类型中的递归（如递归解包 Promise），之前版本只支持接口和类型别名的直接递归。递归类型有深度限制，过深的递归会触发编译器报错。

### 语法与用法

```typescript
// 递归接口：树节点
interface TreeNode<T> {
    value: T;
    children: TreeNode<T>[];  // 引用自身
}

// 递归类型别名：JSON 值
type JsonValue =
    | string
    | number
    | boolean
    | null
    | JsonValue[]           // 数组中的元素也是 JsonValue
    | { [key: string]: JsonValue };  // 对象的值也是 JsonValue

// 递归条件类型：深层解包 Promise
type DeepAwaited<T> = T extends Promise<infer U> ? DeepAwaited<U> : T;

type Result = DeepAwaited<Promise<Promise<Promise<string>>>>;  // string
```

### 基本示例

```typescript
// 文件系统结构
interface FileSystemEntry {
    name: string;
    type: "file" | "directory";
    size?: number;               // 文件大小（仅文件）
    children?: FileSystemEntry[]; // 子条目（仅目录）
}

const projectDir: FileSystemEntry = {
    name: "src",
    type: "directory",
    children: [
        { name: "index.ts", type: "file", size: 1024 },
        {
            name: "components",
            type: "directory",
            children: [
                { name: "App.tsx", type: "file", size: 2048 },
                { name: "Header.tsx", type: "file", size: 512 },
            ],
        },
    ],
};

// 链表
interface LinkedListNode<T> {
    value: T;
    next: LinkedListNode<T> | null;
}

const list: LinkedListNode<number> = {
    value: 1,
    next: {
        value: 2,
        next: {
            value: 3,
            next: null,
        },
    },
};

// 嵌套菜单
interface MenuItem {
    label: string;
    href?: string;
    children?: MenuItem[];
}

const menu: MenuItem[] = [
    { label: "首页", href: "/" },
    {
        label: "产品",
        children: [
            { label: "产品A", href: "/products/a" },
            { label: "产品B", href: "/products/b" },
        ],
    },
];
```

### 进阶用法

```typescript
// 深层 Readonly
type DeepReadonly<T> = {
    readonly [K in keyof T]: T[K] extends object
        ? T[K] extends Function
            ? T[K]
            : DeepReadonly<T[K]>
        : T[K];
};

// 深层 Partial
type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends object
        ? T[K] extends Function
            ? T[K]
            : DeepPartial<T[K]>
        : T[K];
};

interface Config {
    database: {
        host: string;
        port: number;
        credentials: {
            username: string;
            password: string;
        };
    };
    logging: {
        level: string;
        format: string;
    };
}

// 深层可选配置（用于部分覆盖默认配置）
type PartialConfig = DeepPartial<Config>;

const overrides: PartialConfig = {
    database: {
        credentials: {
            password: "new-password",  // 只覆盖密码
        },
    },
};

// 递归展平嵌套数组类型
type Flatten<T> = T extends (infer E)[]
    ? Flatten<E>    // 如果是数组，递归展平元素类型
    : T;            // 不是数组，返回自身

type A = Flatten<number[][][]>;  // number
type B = Flatten<string[]>;       // string
type C = Flatten<boolean>;        // boolean

// 获取嵌套对象的所有路径
type Paths<T, Prefix extends string = ""> = T extends object
    ? {
        [K in keyof T & string]:
            | `${Prefix}${K}`
            | Paths<T[K], `${Prefix}${K}.`>;
    }[keyof T & string]
    : never;

type ConfigPaths = Paths<Config>;
// "database" | "database.host" | "database.port" | "database.credentials" | ...
```

### 递归类型的常见模式

| 模式 | 用途 | 示例 |
|------|------|------|
| 接口自引用 | 树、链表等数据结构 | `children: TreeNode[]` |
| 条件递归 | 深层解包 | `DeepAwaited<T>` |
| 映射递归 | 深层属性变换 | `DeepReadonly<T>` |
| 展平递归 | 嵌套数组类型展平 | `Flatten<T>` |
| 路径递归 | 嵌套对象路径提取 | `Paths<T>` |

### 适用场景

- **树形数据：** 文件系统、菜单、组织架构、DOM 结构
- **深层工具类型：** DeepReadonly、DeepPartial、DeepRequired
- **类型解包：** 递归解包 Promise、数组等嵌套容器
- **路径提取：** 嵌套对象的点路径联合类型
- **JSON 类型：** 描述任意嵌套的 JSON 数据结构

### 常见问题

#### 递归类型有深度限制吗

有。TypeScript 条件类型递归深度限制约 100 层（不同版本可能有差异），超过会报错"Type instantiation is excessively deep and possibly infinite"。实际应用中很少需要这么深的递归。

#### 接口递归和类型别名递归有什么区别

接口的递归是天然支持的（接口是延迟求值的）。类型别名在 TypeScript 3.7+ 也支持直接递归。条件类型递归在 TypeScript 4.1+ 支持。

### 注意事项

- 递归类型有深度限制，过深会报编译错误
- 递归映射类型需要排除 Function 等不应递归的类型
- 接口递归比类型别名递归性能更好（延迟求值）
- 条件类型递归需要 TypeScript 4.1+
- 深层工具类型（DeepReadonly 等）不属于内置类型，需要自定义

### 总结

递归类型在定义中引用自身，用于描述嵌套层级不确定的数据结构和构建深层工具类型。接口自引用描述树、链表等数据结构；条件递归做深层解包；映射递归做深层属性变换。递归有深度限制，需要排除 Function 等不应递归的类型。DeepReadonly、DeepPartial 等深层工具类型是递归映射的典型应用。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 类型编程实战(类型体操入门)

### 概念定义

类型编程（Type-Level Programming），社区中常称为"类型体操"，是指利用 TypeScript 的类型系统进行复杂的类型计算和转换。TypeScript 的类型系统是图灵完备的，意味着理论上可以在类型层面实现任意计算逻辑。

类型体操的核心工具包括：泛型、条件类型、infer、映射类型、模板字面量类型和递归类型。掌握这些工具的组合运用，能够构建出强大的类型工具，在编译期捕获更多错误。

### 核心工具回顾

```typescript
// 类型体操的六大核心工具

// 1. 泛型：类型参数化
type Identity<T> = T;

// 2. 条件类型：类型分支
type IsString<T> = T extends string ? true : false;

// 3. infer：类型提取
type GetReturn<T> = T extends (...args: any[]) => infer R ? R : never;

// 4. 映射类型：属性遍历
type Readonly<T> = { readonly [K in keyof T]: T[K] };

// 5. 模板字面量：字符串操作
type EventName<T extends string> = `on${Capitalize<T>}`;

// 6. 递归类型：嵌套处理
type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };
```

### 基本示例

```typescript
// 实战1：实现 MyPick（从对象类型中选取属性）
type MyPick<T, K extends keyof T> = {
    [P in K]: T[P];
};

interface Todo {
    title: string;
    description: string;
    completed: boolean;
}

type TodoPreview = MyPick<Todo, "title" | "completed">;
// { title: string; completed: boolean }

// 实战2：实现 MyExclude（从联合类型中排除成员）
type MyExclude<T, U> = T extends U ? never : T;

type Result = MyExclude<"a" | "b" | "c", "a">;  // "b" | "c"

// 实战3：实现 MyOmit（从对象类型中排除属性）
type MyOmit<T, K extends keyof T> = {
    [P in keyof T as P extends K ? never : P]: T[P];
};

type TodoInfo = MyOmit<Todo, "completed">;
// { title: string; description: string }

// 实战4：实现 Awaited（解包 Promise）
type MyAwaited<T> = T extends Promise<infer U> ? MyAwaited<U> : T;

type AwaitedResult = MyAwaited<Promise<Promise<number>>>;  // number
```

### 进阶实战

```typescript
// 实战5：实现 TupleToUnion（元组转联合类型）
type TupleToUnion<T extends any[]> = T[number];

type Union = TupleToUnion<[string, number, boolean]>;
// string | number | boolean

// 实战6：实现 First（获取元组第一个元素类型）
type First<T extends any[]> = T extends [infer F, ...any[]] ? F : never;

type F = First<[3, 2, 1]>;  // 3

// 实战7：实现 Length（获取元组长度）
type Length<T extends readonly any[]> = T["length"];

type L = Length<[1, 2, 3]>;  // 3

// 实战8：实现 Includes（判断元组是否包含某类型）
type Includes<T extends any[], U> =
    T extends [infer First, ...infer Rest]
        ? Equal<First, U> extends true
            ? true
            : Includes<Rest, U>
        : false;

// 辅助类型：精确判断两个类型是否相等
type Equal<X, Y> =
    (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2)
        ? true
        : false;

// 实战9：实现 Trim（去除字符串两端空格）
type TrimLeft<S extends string> = S extends ` ${infer Rest}` ? TrimLeft<Rest> : S;
type TrimRight<S extends string> = S extends `${infer Rest} ` ? TrimRight<Rest> : S;
type Trim<S extends string> = TrimLeft<TrimRight<S>>;

type Trimmed = Trim<"  hello world  ">;  // "hello world"

// 实战10：实现 Replace（字符串替换）
type Replace<
    S extends string,
    From extends string,
    To extends string
> = From extends ""
    ? S
    : S extends `${infer Before}${From}${infer After}`
        ? `${Before}${To}${After}`
        : S;

type Replaced = Replace<"hello world", "world", "TypeScript">;
// "hello TypeScript"
```

### 类型体操的难度分级

| 难度 | 代表题目 | 核心技巧 |
|------|---------|---------|
| 简单 | Pick、Exclude、Readonly | 映射类型、条件类型基础 |
| 中等 | Omit、DeepReadonly、Trim | 键重映射、递归、模板字面量 |
| 困难 | UnionToIntersection、Currying | 逆变推断、递归泛型 |
| 地狱 | 类型解析器、类型计算器 | 递归极限、元组操作 |

### 适用场景

- **工具库类型：** 构建 lodash、ramda 等工具库的复杂类型定义
- **框架类型：** React、Vue 等框架的内部类型计算
- **API 类型安全：** 从 URL 模板自动提取参数类型
- **面试考核：** 前端高级岗位面试常见考察内容

### 常见问题

#### 类型体操在实际项目中有用吗

大部分项目不需要写复杂的类型体操。但理解类型体操能让你更好地使用和理解工具库的类型定义、排查复杂的类型错误、以及在需要时编写精确的自定义工具类型。

#### 如何练习类型体操

推荐 type-challenges 项目（GitHub 上的类型挑战集合），从简单题开始逐步提升。每道题都需要用纯类型操作实现特定的类型转换。

### 注意事项

- 类型体操是编译期计算，不影响运行时性能
- 复杂的递归类型有深度限制（约 100 层）
- 过度复杂的类型会降低编辑器的智能提示速度
- 实际项目中优先使用内置工具类型，避免重复造轮子
- 类型体操的可读性很差，复杂类型建议加注释说明意图

### 总结

类型体操利用泛型、条件类型、infer、映射类型、模板字面量和递归类型进行类型层面的编程。核心技巧包括：条件类型做分支、infer 做提取、映射类型做遍历、模板字面量做字符串操作、递归做深层处理。实际项目中不必追求过于复杂的类型体操，但掌握基础能力有助于理解框架类型定义和构建精确的自定义工具类型。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 协变与逆变(Covariance & Contravariance)

### 概念定义

协变（Covariance）和逆变（Contravariance）描述的是类型之间的子类型关系在复合类型中如何传递。当 A 是 B 的子类型时：

- **协变：** `F<A>` 也是 `F<B>` 的子类型，方向一致。例如 `Array<Dog>` 可以赋给 `Array<Animal>`。
- **逆变：** `F<B>` 反而是 `F<A>` 的子类型，方向相反。例如接受 `Animal` 参数的函数可以赋给接受 `Dog` 参数的函数。
- **不变：** 两个方向都不成立，`F<A>` 和 `F<B>` 互不兼容。
- **双变：** 两个方向都成立（TypeScript 在非严格模式下函数参数是双变的）。

理解协变逆变对于正确使用泛型和函数类型赋值至关重要，也是面试中常见的高级 TypeScript 考点。

### 语法与用法

```typescript
// 建立子类型关系
class Animal {
    name: string = "";
}

class Dog extends Animal {
    breed: string = "";
}

class Greyhound extends Dog {
    speed: number = 0;
}

// Dog 是 Animal 的子类型（Dog extends Animal）
// Greyhound 是 Dog 的子类型

// 协变：函数返回值位置
type Producer<T> = () => T;

// Producer<Dog> 可以赋给 Producer<Animal>（协变，方向一致）
const produceDog: Producer<Dog> = () => new Dog();
const produceAnimal: Producer<Animal> = produceDog;  // 合法

// 逆变：函数参数位置（strictFunctionTypes 开启时）
type Consumer<T> = (arg: T) => void;

// Consumer<Animal> 可以赋给 Consumer<Dog>（逆变，方向相反）
const consumeAnimal: Consumer<Animal> = (animal) => console.log(animal.name);
const consumeDog: Consumer<Dog> = consumeAnimal;  // 合法
// 接受 Animal 的函数可以安全地处理 Dog（Dog 是 Animal 的子类型）
```

### 基本示例

```typescript
// 协变位置（安全的"输出"位置）
interface Box<T> {
    value: T;           // 属性值是协变位置
    getValue(): T;      // 返回值是协变位置
}

const dogBox: Box<Dog> = { value: new Dog(), getValue: () => new Dog() };
const animalBox: Box<Animal> = dogBox;  // 合法：Dog 值可以当 Animal 用

// 逆变位置（安全的"输入"位置）
interface Handler<T> {
    handle(item: T): void;  // 参数是逆变位置
}

const animalHandler: Handler<Animal> = {
    handle(animal) { console.log(animal.name); }
};
const dogHandler: Handler<Dog> = animalHandler;  // 合法：处理 Animal 的也能处理 Dog

// 不变位置（同时输入和输出）
interface Ref<T> {
    current: T;         // 可读可写 → 不变
}

// strictFunctionTypes 开启时：
// Ref<Dog> 不能赋给 Ref<Animal>（写入 Animal 到 Dog 的 Ref 不安全）
// Ref<Animal> 也不能赋给 Ref<Dog>（读取时期望 Dog 但可能是其他 Animal）
```

### 进阶用法

```typescript
// 利用逆变实现 UnionToIntersection
type UnionToIntersection<U> =
    (U extends any ? (arg: U) => void : never) extends (arg: infer I) => void
        ? I
        : never;

// 原理：把联合类型的每个成员放到函数参数位置（逆变位置）
// 同名 infer 在逆变位置取交叉类型
type Result = UnionToIntersection<{ a: 1 } | { b: 2 }>;
// { a: 1 } & { b: 2 }

// TypeScript 中的 in/out 修饰符（4.7+）
// 显式标注泛型参数的型变方向
interface ReadonlyBox<out T> {    // out 表示协变
    getValue(): T;
}

interface WriteOnlyBox<in T> {    // in 表示逆变
    setValue(value: T): void;
}

interface MutableBox<in out T> {  // in out 表示不变
    getValue(): T;
    setValue(value: T): void;
}

// strictFunctionTypes 对方法的影响
interface Events {
    // 方法简写语法：双变（兼容性考虑）
    onClick(event: MouseEvent): void;

    // 属性函数语法：逆变（strictFunctionTypes 生效）
    onHover: (event: MouseEvent) => void;
}
```

### 型变位置总结

| 位置 | 型变方向 | 示例 |
|------|---------|------|
| 函数返回值 | 协变（out） | `() => T` |
| 函数参数 | 逆变（in） | `(arg: T) => void` |
| 只读属性 | 协变 | `readonly value: T` |
| 可写属性 | 不变 | `value: T`（可读可写） |
| 数组元素 | 协变（TypeScript 的设计选择） | `T[]` |
| Promise 值 | 协变 | `Promise<T>` |

### 适用场景

- **泛型设计：** 理解何时用 extends 约束是安全的
- **回调函数：** 理解为什么宽泛参数的回调可以赋给窄参数的
- **集合类型：** 理解数组、Set、Map 的类型兼容性
- **工具类型：** 利用逆变特性实现 UnionToIntersection

### 常见问题

#### 为什么 TypeScript 的数组是协变的

这是一种有意的设计妥协。严格来说数组是可变的应该是不变的，但不变会让很多合理的代码报错（如把 Dog[] 传给接受 Animal[] 的函数）。TypeScript 选择了实用性优先。

#### strictFunctionTypes 有什么影响

开启后，函数参数类型检查变为逆变（更严格更安全）。关闭时是双变（既允许协变也允许逆变，不安全但兼容性好）。方法简写语法不受影响，始终是双变。

### 注意事项

- 协变出现在"输出"位置（返回值、只读属性）
- 逆变出现在"输入"位置（函数参数）
- 同时输入输出的位置是不变的
- strictFunctionTypes 让函数参数类型检查变为逆变
- 方法简写语法 `method(x: T)` 始终是双变的，属性函数 `method: (x: T) => void` 受 strictFunctionTypes 影响
- TypeScript 4.7+ 的 in/out 修饰符可以显式标注型变方向

### 总结

协变和逆变描述子类型关系在复合类型中的传递方向。协变在输出位置（返回值），方向一致；逆变在输入位置（参数），方向相反；同时输入输出是不变。strictFunctionTypes 开启后函数参数是逆变的，更安全。TypeScript 4.7 引入 in/out 修饰符显式标注型变。理解型变对于正确设计泛型接口和理解类型兼容性规则至关重要。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。



## 5.5 工具类型详解

## Partial&lt;T>的可选属性转换

### 概念定义

`Partial<T>` 是 TypeScript 内置的工具类型，将类型 T 的所有属性变为可选属性（添加 `?` 修饰符）。它的实现原理是映射类型配合 `?` 修饰符遍历所有键。

Partial 最常见的用途是表示"部分更新"的数据——当你只需要修改对象的某些属性而不是全部属性时，Partial 让类型系统允许只传入部分属性。

### 实现原理

```typescript
// Partial 的内部实现
type Partial<T> = {
    [K in keyof T]?: T[K];  // 遍历 T 的所有键，每个属性加 ?
};
```

### 基本示例

```typescript
interface User {
    id: number;
    name: string;
    email: string;
    age: number;
}

// Partial<User> 让所有属性变为可选
type PartialUser = Partial<User>;
// {
//   id?: number;
//   name?: string;
//   email?: string;
//   age?: number;
// }

// 常见用法：更新函数只接收部分字段
function updateUser(id: number, updates: Partial<User>): User {
    const existingUser: User = { id, name: "张三", email: "z@x.com", age: 25 };
    return { ...existingUser, ...updates };
}

// 只更新 name 和 age，不需要传全部属性
updateUser(1, { name: "李四", age: 30 });
updateUser(1, { email: "new@x.com" });
updateUser(1, {});  // 不更新任何字段也合法

// 配置合并：默认配置 + 用户配置
interface AppConfig {
    theme: "light" | "dark";
    language: string;
    fontSize: number;
    showSidebar: boolean;
}

const defaultConfig: AppConfig = {
    theme: "light",
    language: "zh-CN",
    fontSize: 14,
    showSidebar: true,
};

function createConfig(overrides: Partial<AppConfig>): AppConfig {
    return { ...defaultConfig, ...overrides };
}

// 用户只覆盖部分配置
const userConfig = createConfig({ theme: "dark", fontSize: 16 });
```

### 进阶用法

```typescript
// 深层 Partial（内置 Partial 只处理第一层）
type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends object
        ? T[K] extends Function
            ? T[K]
            : DeepPartial<T[K]>
        : T[K];
};

interface NestedConfig {
    database: {
        host: string;
        port: number;
        credentials: {
            username: string;
            password: string;
        };
    };
    logging: {
        level: string;
    };
}

// 深层可选：嵌套属性也变为可选
type PartialConfig = DeepPartial<NestedConfig>;

const override: PartialConfig = {
    database: {
        credentials: {
            password: "new-pwd",  // 只覆盖密码
        },
    },
};
```

### Partial 与 Required 的对比

| 工具类型 | 效果 | 修饰符操作 |
|---------|------|-----------|
| `Partial<T>` | 所有属性变可选 | 添加 `?` |
| `Required<T>` | 所有属性变必填 | 移除 `?` |

### 适用场景

- **部分更新：** PATCH 请求的请求体，只传需要更新的字段
- **配置合并：** 默认配置 + 用户部分覆盖
- **表单草稿：** 表单填写过程中的中间状态
- **可选参数对象：** 函数的 options 参数

### 常见问题

#### Partial 是浅层的还是深层的

Partial 只处理第一层属性，嵌套对象的属性不会变为可选。需要深层可选要自定义 DeepPartial。

#### Partial&lt;T> 会让所有属性值可能是 undefined 吗

是的。可选属性的值类型会包含 undefined。`Partial<{ name: string }>` 中 name 的类型是 `string | undefined`。

### 注意事项

- Partial 只影响第一层属性，不递归处理嵌套对象
- 可选属性的值类型包含 undefined
- Partial 配合展开运算符是实现配置合并的标准模式
- 深层 Partial 需要自定义递归映射类型
- Partial 编译后完全消失，不影响运行时

### 总结

Partial&lt;T> 将所有属性变为可选，是处理部分更新、配置合并和表单草稿的标准工具类型。内部实现是映射类型加 `?` 修饰符。只影响第一层属性，深层可选需要自定义 DeepPartial。和 Required&lt;T> 互为逆操作。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Required&lt;T>的必选属性转换

### 概念定义

`Required<T>` 是 TypeScript 内置的工具类型，将类型 T 的所有可选属性变为必选属性（移除 `?` 修饰符）。它是 `Partial<T>` 的逆操作。

### 实现原理

```typescript
// Required 的内部实现
type Required<T> = {
    [K in keyof T]-?: T[K];  // -? 移除可选修饰符
};
```

### 基本示例

```typescript
interface UserOptions {
    name?: string;
    email?: string;
    age?: number;
    theme?: "light" | "dark";
}

// Required 让所有可选属性变为必填
type RequiredOptions = Required<UserOptions>;
// { name: string; email: string; age: number; theme: "light" | "dark" }

// 配置验证：确保最终配置没有缺失字段
function validateConfig(partial: UserOptions): Required<UserOptions> {
    const defaults: Required<UserOptions> = {
        name: "匿名用户",
        email: "none@example.com",
        age: 0,
        theme: "light",
    };
    return { ...defaults, ...partial };
}

// 表单提交：草稿状态可选，提交时必填
interface FormFields {
    username?: string;
    password?: string;
    confirmPassword?: string;
}

function submitForm(data: Required<FormFields>): void {
    // 所有字段在这里都是必填的
    console.log(data.username, data.password, data.confirmPassword);
}
```

### 适用场景

- **配置完整性：** 确保最终配置对象所有字段都有值
- **表单提交：** 草稿用 Partial，提交时用 Required 确保完整
- **数据库写入：** 写入前确保所有必要字段都已填充
- **API 请求体：** 确保请求参数完整

### 常见问题

#### Required 会移除属性值中的 undefined 吗

`-?` 会移除由可选标记引入的 `| undefined`。但如果属性原本显式定义为 `string | undefined`，Required 不会移除这个 undefined。

#### Required 是深层的吗

和 Partial 一样，Required 只影响第一层属性。嵌套对象的可选属性不受影响。

### 注意事项

- Required 只处理第一层属性
- `-?` 移除可选标记，同时移除由可选引入的 undefined
- Required 和 Partial 互为逆操作
- 深层 Required 需要自定义递归类型
- 编译后完全消失，不影响运行时

### 总结

Required&lt;T> 通过 `-?` 修饰符移除所有属性的可选标记，使全部属性变为必填。是 Partial 的逆操作，常用于配置验证、表单提交和数据完整性检查。只影响第一层，深层需自定义。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Readonly&lt;T>的只读属性转换

### 概念定义

`Readonly<T>` 是 TypeScript 内置的工具类型，将类型 T 的所有属性变为只读属性（添加 `readonly` 修饰符）。只读属性在赋值后不能被修改，任何尝试修改的操作都会在编译期报错。

### 实现原理

```typescript
// Readonly 的内部实现
type Readonly<T> = {
    readonly [K in keyof T]: T[K];  // 遍历所有键，添加 readonly
};
```

### 基本示例

```typescript
interface User {
    id: number;
    name: string;
    email: string;
}

type ReadonlyUser = Readonly<User>;
// { readonly id: number; readonly name: string; readonly email: string }

const user: ReadonlyUser = { id: 1, name: "张三", email: "z@x.com" };
// user.name = "李四";  // 编译错误：Cannot assign to 'name' because it is a read-only property

// 函数参数保护：防止函数内部修改传入的对象
function printUser(user: Readonly<User>): void {
    console.log(user.name);
    // user.name = "modified";  // 编译错误
}

// 状态管理中的不可变状态
interface AppState {
    count: number;
    todos: string[];
    user: { name: string; loggedIn: boolean };
}

function getState(): Readonly<AppState> {
    return { count: 0, todos: [], user: { name: "", loggedIn: false } };
}

const state = getState();
// state.count = 1;  // 编译错误
// 但 state.user.name = "张三" 不会报错（浅层 readonly）
```

### 进阶用法

```typescript
// 深层 Readonly
type DeepReadonly<T> = {
    readonly [K in keyof T]: T[K] extends object
        ? T[K] extends Function
            ? T[K]
            : DeepReadonly<T[K]>
        : T[K];
};

// 去除 Readonly（Mutable）
type Mutable<T> = {
    -readonly [K in keyof T]: T[K];
};

type MutableUser = Mutable<ReadonlyUser>;
// { id: number; name: string; email: string }（readonly 被移除）
```

### Readonly 与 Object.freeze 的对比

| 对比维度 | Readonly&lt;T> | Object.freeze |
|----------|------------|---------------|
| 作用时机 | 编译期 | 运行时 |
| 深度 | 浅层 | 浅层 |
| 编译后 | 消失 | 保留 |
| 性能影响 | 无 | 微小 |

### 适用场景

- **状态管理：** Redux/Zustand 中的不可变状态
- **函数参数保护：** 防止函数内部修改传入对象
- **配置常量：** 应用配置对象设为只读
- **React Props：** 组件 props 通常不应被修改

### 常见问题

#### Readonly 是浅层的吗

是的。嵌套对象的属性仍然可以修改。需要深层只读要自定义 DeepReadonly。

### 注意事项

- Readonly 只影响第一层属性
- readonly 是编译期检查，运行时无保护
- 配合 Object.freeze 可以同时获得编译期和运行时保护
- `-readonly` 修饰符可以移除 readonly
- 数组的只读版本是 `ReadonlyArray<T>` 或 `readonly T[]`

### 总结

Readonly&lt;T> 将所有属性变为只读，防止编译期的意外修改。只影响第一层，深层需自定义 DeepReadonly。配合 Object.freeze 实现编译期+运行时双重保护。广泛用于状态管理、函数参数保护和配置常量。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Record&lt;K, T>的记录类型构建

### 概念定义

`Record<K, T>` 是 TypeScript 内置的工具类型，用于构建一个对象类型，其属性键来自类型 K，属性值的类型都是 T。K 必须是 `string | number | symbol` 的子类型。

Record 常用于定义字典/映射类型，当对象的键是已知的联合类型、值类型统一时，Record 比手动定义每个属性更简洁。

### 实现原理

```typescript
// Record 的内部实现
type Record<K extends keyof any, T> = {
    [P in K]: T;
};
// keyof any 等价于 string | number | symbol
```

### 基本示例

```typescript
// 从联合类型生成对象类型
type Role = "admin" | "editor" | "viewer";

type RolePermissions = Record<Role, string[]>;
// { admin: string[]; editor: string[]; viewer: string[] }

const permissions: RolePermissions = {
    admin: ["read", "write", "delete"],
    editor: ["read", "write"],
    viewer: ["read"],
};

// 状态码映射
type HttpStatus = 200 | 400 | 404 | 500;

type StatusMessages = Record<HttpStatus, string>;

const messages: StatusMessages = {
    200: "请求成功",
    400: "请求参数错误",
    404: "资源未找到",
    500: "服务器内部错误",
};

// 通用字典类型
type Dictionary<T> = Record<string, T>;

const userMap: Dictionary<{ name: string; age: number }> = {
    user1: { name: "张三", age: 25 },
    user2: { name: "李四", age: 30 },
};
```

### 进阶用法

```typescript
// Record 配合枚举
enum Color {
    Red = "red",
    Green = "green",
    Blue = "blue",
}

type ColorHexMap = Record<Color, string>;

const colorHex: ColorHexMap = {
    [Color.Red]: "#ff0000",
    [Color.Green]: "#00ff00",
    [Color.Blue]: "#0000ff",
};

// Record 作为函数参数约束
function mapValues<K extends string, V, U>(
    obj: Record<K, V>,
    fn: (value: V) => U
): Record<K, U> {
    const result = {} as Record<K, U>;
    for (const key in obj) {
        result[key] = fn(obj[key]);
    }
    return result;
}

const prices = { apple: 5, banana: 3, cherry: 8 };
const doubled = mapValues(prices, (v) => v * 2);
// { apple: 10, banana: 6, cherry: 16 }
```

### Record 与索引签名的对比

| 对比维度 | Record&lt;K, T> | 索引签名 `{ [k: string]: T }` |
|----------|-------------|-------------------------------|
| 键的范围 | 可以限定为联合类型 | 任意 string/number |
| 类型安全 | 缺少键会报错 | 不检查键的完整性 |
| 用途 | 已知键集合 | 动态键 |

### 适用场景

- **枚举/联合映射：** 每个枚举成员或联合成员对应一个值
- **字典/查找表：** 键值对映射
- **配置表：** 多环境配置、多语言翻译
- **穷尽检查：** 确保联合类型的每个成员都有对应的值

### 常见问题

#### Record&lt;string, T> 和 { [key: string]: T } 有区别吗

功能上等价。Record 语义更明确，索引签名在接口中更常见。Record 不能在接口中直接使用（只能用 type 别名），索引签名可以。

### 注意事项

- K 限定为联合类型时，缺少任何一个键都会报错
- Record&lt;string, T> 等价于 `{ [key: string]: T }`
- Record 编译后消失，不影响运行时
- 配合 satisfies 可以同时保留字面量类型和检查完整性

### 总结

Record&lt;K, T> 从键类型 K 和值类型 T 构建对象类型。K 是联合类型时能确保每个成员都有对应的属性（穷尽性）。广泛用于枚举映射、字典、配置表和查找表。和索引签名功能相似但语义更明确、类型检查更严格。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Pick&lt;T, K>的键选择提取

### 概念定义

`Pick<T, K>` 是 TypeScript 内置的工具类型，从类型 T 中选取属性键集合 K 对应的属性，构建一个新类型。K 必须是 `keyof T` 的子类型，即只能选择 T 中已有的属性。

### 实现原理

```typescript
// Pick 的内部实现
type Pick<T, K extends keyof T> = {
    [P in K]: T[P];
};
```

### 基本示例

```typescript
interface User {
    id: number;
    name: string;
    email: string;
    age: number;
    avatar: string;
    createdAt: Date;
}

// 选取部分属性构建新类型
type UserBasic = Pick<User, "id" | "name">;
// { id: number; name: string }

type UserContact = Pick<User, "name" | "email">;
// { name: string; email: string }

// 列表页只展示部分字段
type UserListItem = Pick<User, "id" | "name" | "avatar">;

// API 响应中只返回部分字段
function getUserBasic(id: number): Pick<User, "id" | "name" | "email"> {
    // 从数据库查询后只返回需要的字段
    return { id, name: "张三", email: "z@x.com" };
}
```

### Pick 与 Omit 的对比

| 工具类型 | 操作方式 | 适用场景 |
|---------|---------|---------|
| `Pick<T, K>` | 选择要保留的键 | 保留少数属性时 |
| `Omit<T, K>` | 选择要排除的键 | 排除少数属性时 |

### 适用场景

- **API 响应裁剪：** 只返回客户端需要的字段
- **组件 Props：** 从完整类型中选取组件需要的属性
- **数据传输对象：** 创建只包含必要字段的 DTO 类型
- **表单类型：** 从完整实体中选取表单需要的字段

### 常见问题

#### Pick 的第二个参数必须是 T 的键吗

是的。`K extends keyof T` 约束了 K 只能是 T 中存在的键。传入不存在的键会编译报错。

### 注意事项

- K 必须是 keyof T 的子类型，不能选择不存在的键
- Pick 保留原始属性的修饰符（readonly、?）
- 当要排除的属性少于保留的属性时，用 Omit 更简洁
- Pick 编译后完全消失，不影响运行时

### 总结

Pick&lt;T, K> 从对象类型中选取指定键构建新类型，K 必须是 T 的已有键。常用于 API 响应裁剪、组件 Props 定义和数据传输对象。和 Omit 互补：属性少用 Pick 选择，属性多用 Omit 排除。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Omit&lt;T, K>的键排除省略

### 概念定义

`Omit<T, K>` 是 TypeScript 内置的工具类型，从类型 T 中排除属性键集合 K 对应的属性，返回剩余属性组成的新类型。它是 Pick 的逆操作。

### 实现原理

```typescript
// Omit 的内部实现
type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;
// 先用 Exclude 从 keyof T 中排除 K，再用 Pick 选取剩余的键
```

### 基本示例

```typescript
interface User {
    id: number;
    name: string;
    email: string;
    password: string;
    createdAt: Date;
}

// 排除敏感字段
type PublicUser = Omit<User, "password">;
// { id: number; name: string; email: string; createdAt: Date }

// 排除服务端生成的字段（创建时不需要传入）
type CreateUserDTO = Omit<User, "id" | "createdAt">;
// { name: string; email: string; password: string }

// React 组件：排除已注入的 props
interface FullProps {
    theme: string;
    locale: string;
    title: string;
    content: string;
}

// HOC 注入 theme 和 locale，外部只需传 title 和 content
type ExternalProps = Omit<FullProps, "theme" | "locale">;
// { title: string; content: string }
```

### 适用场景

- **排除敏感字段：** API 响应中去掉 password 等字段
- **创建 DTO：** 排除服务端生成的 id、createdAt 等字段
- **组件 Props：** 排除 HOC 已注入的 props
- **扩展类型：** Omit 后用交叉类型添加新属性

### 常见问题

#### Omit 的第二个参数可以传不存在的键吗

可以。Omit 的 K 约束是 `keyof any`（即 `string | number | symbol`），不要求是 T 的键。传入不存在的键不会报错，也不会有任何效果。这和 Pick 不同（Pick 要求 K 是 keyof T）。

### 注意事项

- Omit 的 K 不要求是 T 的已有键，传入不存在的键不报错
- Omit 保留原始属性的修饰符
- 当要保留的属性少于排除的属性时，用 Pick 更简洁
- Omit + 交叉类型可以实现"替换属性类型"的效果

### 总结

Omit&lt;T, K> 从对象类型中排除指定键构建新类型。K 不要求是 T 的已有键。常用于排除敏感字段、创建 DTO、排除 HOC 注入的 props。和 Pick 互补：排除少用 Omit，保留少用 Pick。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Exclude&lt;T, U>的联合类型排除

### 概念定义

`Exclude<T, U>` 是 TypeScript 内置的工具类型，从联合类型 T 中排除可以赋值给 U 的成员，返回剩余成员组成的新联合类型。它利用分布式条件类型对联合类型的每个成员分别判断。

### 实现原理

```typescript
// Exclude 的内部实现
type Exclude<T, U> = T extends U ? never : T;
// 分布式条件类型：对 T 联合的每个成员，如果能赋给 U 就排除（返回 never）
```

### 基本示例

```typescript
// 从联合类型中排除特定成员
type AllStatus = "active" | "inactive" | "pending" | "banned";
type ActiveStatus = Exclude<AllStatus, "inactive" | "banned">;
// "active" | "pending"

// 排除原始类型
type Mixed = string | number | boolean | null | undefined;
type NonNullPrimitive = Exclude<Mixed, null | undefined>;
// string | number | boolean

// Exclude 是 Omit 的底层依赖
// Omit<T, K> = Pick<T, Exclude<keyof T, K>>
type UserKeys = "id" | "name" | "email" | "password";
type PublicKeys = Exclude<UserKeys, "password">;
// "id" | "name" | "email"
```

### Exclude 与 Extract 的对比

| 工具类型 | 操作 | 保留的成员 |
|---------|------|-----------|
| `Exclude<T, U>` | 排除 | T 中不能赋给 U 的成员 |
| `Extract<T, U>` | 提取 | T 中能赋给 U 的成员 |

### 适用场景

- **联合类型过滤：** 从联合中移除特定成员
- **Omit 的底层实现：** 排除键后再 Pick
- **类型收窄：** 移除 null、undefined 等不需要的类型
- **事件过滤：** 排除不支持的事件类型

### 常见问题

#### Exclude 和 Omit 的区别

Exclude 操作的是联合类型（`"a" | "b" | "c"`），Omit 操作的是对象类型的属性。Omit 内部使用 Exclude 排除键后再用 Pick 选取。

### 注意事项

- Exclude 操作联合类型，不是对象类型
- 依赖分布式条件类型特性
- never 输入返回 never
- Exclude 和 Extract 互为逆操作
- `NonNullable<T>` 等价于 `Exclude<T, null | undefined>`

### 总结

Exclude&lt;T, U> 从联合类型中排除可赋值给 U 的成员。基于分布式条件类型实现，是 Omit 的底层依赖。和 Extract 互为逆操作。广泛用于联合类型过滤和键类型排除。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Extract&lt;T, U>的联合类型提取

### 概念定义

`Extract<T, U>` 是 TypeScript 内置的工具类型，从联合类型 T 中提取可以赋值给 U 的成员，返回这些成员组成的新联合类型。它是 Exclude 的逆操作。

### 实现原理

```typescript
// Extract 的内部实现
type Extract<T, U> = T extends U ? T : never;
// 分布式条件类型：对 T 联合的每个成员，如果能赋给 U 就保留
```

### 基本示例

```typescript
// 从联合类型中提取特定成员
type AllEvents = "click" | "focus" | "blur" | "scroll" | "resize" | "keydown";
type MouseEvents = Extract<AllEvents, "click" | "scroll">;
// "click" | "scroll"

// 提取满足条件的类型
type Mixed = string | number | boolean | (() => void) | { name: string };
type Functions = Extract<Mixed, Function>;
// () => void

type Primitives = Extract<Mixed, string | number | boolean>;
// string | number | boolean

// 可辨识联合中的提取
type Action =
    | { type: "INCREMENT"; payload: number }
    | { type: "DECREMENT"; payload: number }
    | { type: "RESET" }
    | { type: "SET"; payload: number };

type PayloadAction = Extract<Action, { payload: number }>;
// { type: "INCREMENT"; payload: number } | { type: "DECREMENT"; payload: number } | { type: "SET"; payload: number }
```

### 适用场景

- **联合类型筛选：** 从联合中提取满足条件的成员
- **事件过滤：** 从所有事件中提取特定类别的事件
- **可辨识联合过滤：** 按标签或属性提取特定成员
- **类型交集：** 提取两个联合类型的公共成员

### 常见问题

#### Extract 和交叉类型 & 的区别

Extract 从联合类型中筛选成员，结果仍是联合类型。交叉类型 & 合并对象类型的属性，结果是拥有所有属性的单一类型。两者操作对象和结果都不同。

### 注意事项

- Extract 操作联合类型，不是对象类型
- 依赖分布式条件类型特性
- Extract 和 Exclude 互为逆操作
- never 输入返回 never
- 提取条件基于类型兼容性（可赋值关系）

### 总结

Extract&lt;T, U> 从联合类型中提取可赋值给 U 的成员，是 Exclude 的逆操作。基于分布式条件类型实现，广泛用于联合类型筛选、事件过滤和可辨识联合按条件提取。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## NonNullable&lt;T>的null/undefined排除

### 概念定义

`NonNullable<T>` 是 TypeScript 内置的工具类型，从类型 T 中排除 `null` 和 `undefined`。它是 `Exclude<T, null | undefined>` 的简写形式，常用于在 strictNullChecks 模式下去除可空类型。

### 实现原理

```typescript
// NonNullable 的内部实现
type NonNullable<T> = T & {};
// 在 TypeScript 4.8+ 简化为交叉空对象，效果等同于排除 null 和 undefined
// 等价于早期版本的 T extends null | undefined ? never : T
```

### 基本示例

```typescript
// 排除 null 和 undefined
type MaybeString = string | null | undefined;
type DefiniteString = NonNullable<MaybeString>;  // string

type MaybeUser = { name: string } | null | undefined;
type DefiniteUser = NonNullable<MaybeUser>;  // { name: string }

// 在函数中使用
function processValue<T>(value: T): NonNullable<T> {
    if (value === null || value === undefined) {
        throw new Error("值不能为空");
    }
    return value as NonNullable<T>;
}

const result = processValue<string | null>("hello");
// result 的类型是 string（排除了 null）

// DOM 查询后排除 null
function getElement(id: string): NonNullable<ReturnType<typeof document.getElementById>> {
    const el = document.getElementById(id);
    if (!el) throw new Error(`元素 #${id} 不存在`);
    return el;  // HTMLElement（排除了 null）
}
```

### 适用场景

- **空值检查后：** 确认值不为空后的类型标注
- **API 响应处理：** 去除可能的 null/undefined 响应
- **Map.get 返回值：** 确信 key 存在时排除 undefined
- **可选属性访问：** 确信属性已赋值时排除 undefined

### 常见问题

#### NonNullable 和非空断言 ! 的区别

NonNullable 是类型层面的操作，需要配合运行时检查保证安全。非空断言 `!` 直接跳过检查，不安全。推荐用 NonNullable 配合运行时判空。

### 注意事项

- NonNullable 排除 null 和 undefined，不排除其他 falsy 值（0、""、false）
- 在 strictNullChecks 关闭时意义不大
- TypeScript 4.8 优化了 NonNullable 的实现
- 配合运行时检查使用更安全

### 总结

NonNullable&lt;T> 从类型中排除 null 和 undefined，是 strictNullChecks 模式下处理可空类型的标准工具。配合运行时空值检查使用，比非空断言更安全。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## ReturnType&lt;T>的返回类型提取

### 概念定义

`ReturnType<T>` 是 TypeScript 内置的工具类型，从函数类型 T 中提取返回值的类型。T 必须是函数类型，否则会报错。它基于条件类型和 infer 关键字实现。

### 实现原理

```typescript
// ReturnType 的内部实现
type ReturnType<T extends (...args: any) => any> =
    T extends (...args: any) => infer R ? R : any;
```

### 基本示例

```typescript
// 提取函数返回类型
function createUser(name: string, age: number) {
    return { id: Date.now(), name, age, createdAt: new Date() };
}

type User = ReturnType<typeof createUser>;
// { id: number; name: string; age: number; createdAt: Date }

// 提取箭头函数返回类型
type ParseResult = ReturnType<typeof JSON.parse>;  // any

// 提取 Promise 函数的返回类型
async function fetchUsers() {
    return [{ id: 1, name: "张三" }];
}

type FetchReturn = ReturnType<typeof fetchUsers>;
// Promise<{ id: number; name: string }[]>

// 配合 Awaited 获取 Promise 内部类型
type Users = Awaited<ReturnType<typeof fetchUsers>>;
// { id: number; name: string }[]

// 提取类方法的返回类型
class UserService {
    getUser(id: number) {
        return { id, name: "张三", email: "z@x.com" };
    }
}

type GetUserReturn = ReturnType<UserService["getUser"]>;
// { id: number; name: string; email: string }
```

### 适用场景

- **从函数推导类型：** 避免手动定义返回值的接口
- **API 响应类型：** 从 fetch 函数提取响应类型
- **工具函数类型同步：** 函数修改后，依赖的类型自动更新
- **第三方库类型：** 提取库函数的返回类型

### 常见问题

#### ReturnType 能处理重载函数吗

对于重载函数，ReturnType 只返回最后一个重载签名的返回类型。如果需要所有重载的返回类型，需要手动处理。

#### 异步函数的 ReturnType 是什么

异步函数的 ReturnType 是 `Promise<T>`。要获取 T，用 `Awaited<ReturnType<typeof fn>>`。

### 注意事项

- T 必须是函数类型，传入非函数类型会报错
- 对于运行时值要用 `typeof fn` 获取函数类型
- 异步函数返回 Promise 类型，需要配合 Awaited 解包
- 重载函数只取最后一个签名的返回类型
- ReturnType 编译后完全消失

### 总结

ReturnType&lt;T> 从函数类型中提取返回值类型，基于 infer 实现。常用于从已有函数推导返回类型，避免手动重复定义。异步函数配合 Awaited 解包 Promise。对运行时值用 `typeof fn` 获取类型。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Parameters&lt;T>的参数类型提取

### 概念定义

`Parameters<T>` 是 TypeScript 内置的工具类型，从函数类型 T 中提取参数类型，返回一个元组类型。元组的每个元素对应函数的一个参数类型。

### 实现原理

```typescript
// Parameters 的内部实现
type Parameters<T extends (...args: any) => any> =
    T extends (...args: infer P) => any ? P : never;
```

### 基本示例

```typescript
function search(keyword: string, page: number, pageSize: number): void {
    // ...
}

type SearchParams = Parameters<typeof search>;
// [keyword: string, page: number, pageSize: number]

// 索引访问获取单个参数类型
type FirstParam = Parameters<typeof search>[0];   // string
type SecondParam = Parameters<typeof search>[1];   // number

// 包装函数：保持参数类型一致
function withLogging<T extends (...args: any[]) => any>(
    fn: T,
    ...args: Parameters<T>
): ReturnType<T> {
    console.log("调用参数:", args);
    return fn(...args);
}

withLogging(search, "typescript", 1, 10);
// 参数类型自动匹配 search 的签名
```

### 适用场景

- **包装函数：** 保持包装后函数的参数类型和原函数一致
- **事件处理：** 提取事件处理函数的参数类型
- **函数组合：** 确保管道中函数参数和返回值类型匹配
- **测试 mock：** 确保 mock 函数的参数类型正确

### 常见问题

#### Parameters 能处理可选参数和剩余参数吗

能。可选参数在元组中保持可选标记，剩余参数保持剩余元素语法。`(a: string, b?: number, ...rest: boolean[])` 的 Parameters 结果是 `[a: string, b?: number, ...rest: boolean[]]`。

### 注意事项

- T 必须是函数类型
- 返回的是元组类型，可以用索引访问单个参数类型
- 保留参数名、可选标记和剩余参数语法
- 重载函数只取最后一个签名的参数

### 总结

Parameters&lt;T> 从函数类型中提取参数元组类型，基于 infer 实现。常用于包装函数、事件处理和函数组合场景，确保参数类型和原函数保持一致。可以用索引访问获取单个参数类型。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## ConstructorParameters&lt;T>的构造参数提取

### 概念定义

`ConstructorParameters<T>` 是 TypeScript 内置的工具类型，从构造函数类型 T 中提取构造参数类型，返回一个元组类型。T 必须是具有构造签名的类型（通常用 `typeof ClassName` 获取）。

### 实现原理

```typescript
// ConstructorParameters 的内部实现
type ConstructorParameters<T extends abstract new (...args: any) => any> =
    T extends abstract new (...args: infer P) => any ? P : never;
```

### 基本示例

```typescript
class User {
    constructor(
        public name: string,
        public age: number,
        public email?: string
    ) {}
}

type UserCtorParams = ConstructorParameters<typeof User>;
// [name: string, age: number, email?: string]

// 工厂函数：用构造参数类型保持一致
function createInstance<T extends new (...args: any[]) => any>(
    Ctor: T,
    ...args: ConstructorParameters<T>
): InstanceType<T> {
    return new Ctor(...args);
}

const user = createInstance(User, "张三", 25, "z@x.com");
// user 的类型是 User

// 内置类的构造参数
type DateParams = ConstructorParameters<typeof Date>;
// 复杂的重载联合

type ErrorParams = ConstructorParameters<typeof Error>;
// [message?: string, options?: ErrorOptions]

type MapParams = ConstructorParameters<typeof Map>;
// [entries?: readonly (readonly [any, any])[] | null]
```

### 适用场景

- **工厂函数：** 确保工厂函数的参数和类构造函数一致
- **依赖注入：** 自动推断类的构造依赖类型
- **序列化/反序列化：** 从存储的参数重建类实例
- **测试：** 构造 mock 对象时保持参数类型正确

### 常见问题

#### 和 Parameters 的区别

Parameters 提取普通函数的参数，ConstructorParameters 提取构造函数（new）的参数。构造函数类型用 `typeof ClassName` 获取。

### 注意事项

- T 必须是构造函数类型（有 new 签名）
- 用 `typeof ClassName` 获取类的构造函数类型
- 支持 abstract 类
- 重载构造函数只取最后一个签名

### 总结

ConstructorParameters&lt;T> 从构造函数类型中提取参数元组，和 Parameters 类似但专门用于构造函数。常用于工厂函数和依赖注入场景，确保构造参数类型一致。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## ThisParameterType&lt;T>的this类型提取

### 概念定义

`ThisParameterType<T>` 是 TypeScript 内置的工具类型，从函数类型 T 中提取 `this` 参数的类型。如果函数没有显式声明 `this` 参数，结果是 `unknown`。

TypeScript 允许在函数的第一个参数位置声明 `this` 参数来约束函数调用时的 this 上下文。this 参数不算真正的参数，编译后会被移除。

### 实现原理

```typescript
// ThisParameterType 的内部实现
type ThisParameterType<T> =
    T extends (this: infer U, ...args: never) => any ? U : unknown;
```

### 基本示例

```typescript
// 声明 this 参数的函数
function greet(this: { name: string }, greeting: string): string {
    return `${greeting}, ${this.name}`;
}

type ThisType = ThisParameterType<typeof greet>;
// { name: string }

// 没有 this 参数的函数
function add(a: number, b: number): number {
    return a + b;
}

type NoThis = ThisParameterType<typeof add>;
// unknown

// 类方法的 this 类型
class Counter {
    count = 0;

    increment(this: Counter): void {
        this.count++;
    }
}

type CounterThis = ThisParameterType<typeof Counter.prototype.increment>;
// Counter
```

### 适用场景

- **this 上下文分析：** 了解函数期望的 this 类型
- **函数绑定：** 确保 bind/call/apply 的 this 参数类型正确
- **装饰器：** 在装饰器中提取方法的 this 类型

### 常见问题

#### 如果函数没有声明 this 参数，结果是什么

结果是 `unknown`，表示无法确定 this 的类型。

### 注意事项

- this 参数必须是函数的第一个参数位置
- this 参数编译后会被移除，不影响运行时
- 没有 this 参数时返回 unknown
- 配合 OmitThisParameter 可以移除 this 参数

### 总结

ThisParameterType&lt;T> 从函数类型中提取 this 参数的类型。this 参数是 TypeScript 特有的语法，用于约束函数调用时的上下文。没有 this 参数时返回 unknown。常配合 OmitThisParameter 使用。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## OmitThisParameter&lt;T>的this参数省略

### 概念定义

`OmitThisParameter<T>` 是 TypeScript 内置的工具类型，从函数类型 T 中移除 `this` 参数，返回一个没有 this 约束的新函数类型。如果函数没有 this 参数，返回原始类型不变。

这个工具类型常用于将带 this 约束的方法转换为可以独立调用的函数，比如从类中提取方法后 bind 到特定对象。

### 实现原理

```typescript
// OmitThisParameter 的内部实现
type OmitThisParameter<T> =
    unknown extends ThisParameterType<T>
        ? T
        : T extends (...args: infer A) => infer R
            ? (...args: A) => R
            : T;
```

### 基本示例

```typescript
// 带 this 参数的函数
function greet(this: { name: string }, greeting: string): string {
    return `${greeting}, ${this.name}`;
}

type OriginalType = typeof greet;
// (this: { name: string }, greeting: string) => string

type WithoutThis = OmitThisParameter<typeof greet>;
// (greeting: string) => string

// 使用场景：bind 后的函数类型
const obj = { name: "张三" };
const boundGreet: WithoutThis = greet.bind(obj);
boundGreet("你好");  // "你好, 张三"

// 类方法提取
class Timer {
    private seconds = 0;

    tick(this: Timer): void {
        this.seconds++;
    }
}

type TickFn = OmitThisParameter<typeof Timer.prototype.tick>;
// () => void

const timer = new Timer();
const boundTick: TickFn = timer.tick.bind(timer);
```

### 适用场景

- **方法绑定：** bind 后的函数不再需要 this 约束
- **回调传递：** 将类方法作为回调传递时移除 this 约束
- **函数适配：** 适配不同 this 上下文的函数类型

### 常见问题

#### 和 Function.prototype.bind 的类型推断有什么关系

TypeScript 内部对 bind 方法有特殊的类型推断，会自动移除 this 参数。OmitThisParameter 让你在其他场景中手动做同样的事情。

### 注意事项

- 如果函数没有 this 参数，返回原始类型不变
- 配合 ThisParameterType 使用，一个提取一个移除
- bind 后的函数类型通常不需要手动使用 OmitThisParameter
- 编译后完全消失，不影响运行时

### 总结

OmitThisParameter&lt;T> 从函数类型中移除 this 参数约束。常用于 bind 后的函数类型标注和类方法作为回调传递的场景。和 ThisParameterType 配对使用。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## ThisType&lt;T>的this类型指定

### 概念定义

`ThisType<T>` 是 TypeScript 内置的工具类型，用于在对象字面量的方法中指定 `this` 的类型。它本身不做任何类型转换（实现是空接口），只作为一个标记被编译器识别，需要开启 `noImplicitThis` 编译选项才能生效。

ThisType 主要用于 Vue 2 的 Options API 和类似的"配置对象"模式中，让对象方法中的 this 自动指向正确的类型。

### 实现原理

```typescript
// ThisType 的内部实现（空接口，仅作标记）
interface ThisType<T> {}
```

### 基本示例

```typescript
// 定义一个带有 this 上下文的配置对象类型
type ObjectDescriptor<D, M> = {
    data?: D;
    methods?: M & ThisType<D & M>;  // methods 中的 this 指向 D & M
};

// 辅助函数
function makeObject<D, M>(desc: ObjectDescriptor<D, M>): D & M {
    const data: object = desc.data || {};
    const methods: object = desc.methods || {};
    return { ...data, ...methods } as D & M;
}

// 使用：methods 中的 this 自动指向 data + methods 的合并类型
const obj = makeObject({
    data: {
        x: 0,
        y: 0,
    },
    methods: {
        moveBy(dx: number, dy: number) {
            // this 的类型是 { x: number; y: number } & { moveBy: ... }
            this.x += dx;  // 合法：this 上有 x 属性
            this.y += dy;  // 合法：this 上有 y 属性
        },
    },
});

obj.x = 10;
obj.moveBy(5, 5);

// Vue 2 Options API 风格的示例
interface ComponentOptions<D, M, C> {
    data?(): D;
    methods?: M & ThisType<D & M & C>;
    computed?: C & ThisType<D & M & C>;
}
```

### 适用场景

- **Vue 2 Options API：** 让 data、methods、computed 中的 this 正确指向组件实例
- **配置对象模式：** 对象方法需要访问同一对象的其他属性
- **DSL 构建：** 领域特定语言中方法的 this 上下文指定
- **状态机定义：** 状态处理方法中访问状态机上下文

### 常见问题

#### ThisType 和 this 参数声明有什么区别

`this` 参数声明用于单个函数（`function f(this: T)`），ThisType 用于整个对象字面量的所有方法。ThisType 更适合配置对象模式。

#### 必须开启 noImplicitThis 吗

是的。ThisType 的标记效果依赖 noImplicitThis（或 strict 模式）。不开启时编译器不检查 this 类型，ThisType 无效。

### 注意事项

- ThisType 是空接口，不做任何类型转换，仅作编译器标记
- 需要 noImplicitThis 或 strict 模式才能生效
- 主要用于对象字面量中方法的 this 类型推断
- Vue 2 的类型定义大量使用 ThisType
- Vue 3 的 Composition API 不需要 ThisType

### 总结

ThisType&lt;T> 是一个编译器标记，让对象字面量方法中的 this 指向指定类型 T。它本身是空接口，不做类型转换。需要 noImplicitThis 生效。主要用于 Vue 2 Options API 和配置对象模式，让方法中的 this 自动具有正确的类型。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Uppercase&lt;T>的字符串大写转换

### 概念定义

`Uppercase<T>` 是 TypeScript 内置的字符串操作类型，将字符串字面量类型 T 中的所有字母转换为大写形式。它是编译器内部实现的固有类型（Intrinsic Type），不能用普通 TypeScript 代码实现。

### 基本示例

```typescript
// 基本转换
type Upper = Uppercase<"hello">;       // "HELLO"
type Upper2 = Uppercase<"TypeScript">; // "TYPESCRIPT"

// 联合类型自动分布
type Methods = Uppercase<"get" | "post" | "put" | "delete">;
// "GET" | "POST" | "PUT" | "DELETE"

// 配合模板字面量
type EventName = "click" | "focus" | "blur";
type UpperEvent = `ON_${Uppercase<EventName>}`;
// "ON_CLICK" | "ON_FOCUS" | "ON_BLUR"

// 环境变量命名
type ConfigKey = "apiUrl" | "dbHost" | "logLevel";
type EnvKey = `APP_${Uppercase<ConfigKey>}`;
// "APP_APIURL" | "APP_DBHOST" | "APP_LOGLEVEL"
```

### 四种字符串操作类型对比

| 工具类型 | 效果 | 示例 |
|---------|------|------|
| `Uppercase<S>` | 全部大写 | `"hello"` → `"HELLO"` |
| `Lowercase<S>` | 全部小写 | `"HELLO"` → `"hello"` |
| `Capitalize<S>` | 首字母大写 | `"hello"` → `"Hello"` |
| `Uncapitalize<S>` | 首字母小写 | `"Hello"` → `"hello"` |

### 适用场景

- **常量命名：** 生成大写的常量名类型
- **环境变量：** 约束环境变量的命名格式
- **HTTP 方法：** 约束为大写的方法名
- **配合模板字面量：** 组合生成复杂的字符串类型

### 注意事项

- 是编译器固有类型，不能用 TypeScript 代码自行实现
- 只作用于字符串字面量类型，对 string 无效（返回 string）
- 联合类型会自动分布

### 总结

Uppercase&lt;T> 将字符串字面量类型转换为全大写，是四种内置字符串操作类型之一。常配合模板字面量类型生成大写格式的类型约束。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Lowercase&lt;T>的字符串小写转换

### 概念定义

`Lowercase<T>` 是 TypeScript 内置的字符串操作类型，将字符串字面量类型 T 中的所有字母转换为小写形式。它是编译器固有类型（Intrinsic Type），和 Uppercase 互为逆操作。

### 基本示例

```typescript
// 基本转换
type Lower = Lowercase<"HELLO">;       // "hello"
type Lower2 = Lowercase<"TypeScript">; // "typescript"

// 联合类型自动分布
type LowerMethods = Lowercase<"GET" | "POST" | "PUT" | "DELETE">;
// "get" | "post" | "put" | "delete"

// 配合模板字面量
type Component = "Header" | "Footer" | "Sidebar";
type CssClass = `app-${Lowercase<Component>}`;
// "app-header" | "app-footer" | "app-sidebar"

// URL 路径生成
type Resource = "Users" | "Posts" | "Comments";
type ApiPath = `/api/${Lowercase<Resource>}`;
// "/api/users" | "/api/posts" | "/api/comments"
```

### 适用场景

- **CSS 类名：** 生成小写格式的类名类型
- **URL 路径：** 约束路径为小写格式
- **数据库表名：** 约束表名为小写
- **配合模板字面量：** 组合生成小写格式的类型约束

### 注意事项

- 编译器固有类型，不能用 TypeScript 代码自行实现
- 只作用于字符串字面量类型
- 联合类型会自动分布
- 和 Uppercase 互为逆操作

### 总结

Lowercase&lt;T> 将字符串字面量类型转换为全小写，常配合模板字面量类型生成小写格式的路径、类名等类型约束。和 Uppercase 互为逆操作。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Capitalize&lt;T>的字符串首字母大写

### 概念定义

`Capitalize<T>` 是 TypeScript 内置的字符串操作类型，将字符串字面量类型 T 的首字母转换为大写，其余字母保持不变。它是编译器固有类型，在键重映射和事件名生成中使用频率很高。

### 基本示例

```typescript
// 基本转换
type Cap = Capitalize<"hello">;        // "Hello"
type Cap2 = Capitalize<"typeScript">; // "TypeScript"

// 联合类型自动分布
type Events = Capitalize<"click" | "focus" | "blur">;
// "Click" | "Focus" | "Blur"

// 生成事件处理器名
type EventName = "click" | "change" | "submit";
type Handler = `on${Capitalize<EventName>}`;
// "onClick" | "onChange" | "onSubmit"

// 生成 getter/setter 名
type PropName = "name" | "age" | "email";
type Getter = `get${Capitalize<PropName>}`;
// "getName" | "getAge" | "getEmail"
type Setter = `set${Capitalize<PropName>}`;
// "setName" | "setAge" | "setEmail"

// 映射类型中的键重映射
interface User {
    name: string;
    age: number;
}

type UserGetters = {
    [K in keyof User as `get${Capitalize<string & K>}`]: () => User[K];
};
// { getName: () => string; getAge: () => number }
```

### 适用场景

- **事件处理器命名：** 生成 onClick、onChange 等 React 事件处理器名
- **getter/setter 生成：** 从属性名生成 getName、setName 类型
- **键重映射：** 在映射类型中转换属性名
- **API 命名约定：** 生成符合命名规范的方法名类型

### 注意事项

- 只转换首字母，其余字母不变
- 和 Uncapitalize 互为逆操作
- 联合类型会自动分布
- 在键重映射中需要用 `string & K` 确保键是字符串类型

### 总结

Capitalize&lt;T> 将字符串字面量类型的首字母转大写，是模板字面量类型和键重映射中最常用的字符串操作类型。广泛用于生成 React 事件处理器名、getter/setter 方法名等符合命名规范的类型。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Uncapitalize&lt;T>的字符串首字母小写

### 概念定义

`Uncapitalize<T>` 是 TypeScript 内置的字符串操作类型，将字符串字面量类型 T 的首字母转换为小写，其余字母保持不变。它是 Capitalize 的逆操作，是编译器固有类型。

### 基本示例

```typescript
// 基本转换
type Uncap = Uncapitalize<"Hello">;       // "hello"
type Uncap2 = Uncapitalize<"TypeScript">; // "typeScript"

// 联合类型自动分布
type Lower = Uncapitalize<"Click" | "Focus" | "Blur">;
// "click" | "focus" | "blur"

// 从事件处理器名反推事件名
type HandlerName = "onClick" | "onChange" | "onSubmit";

// 提取 on 后面的部分并首字母小写
type ExtractEvent<T extends string> =
    T extends `on${infer Event}` ? Uncapitalize<Event> : never;

type EventNames = ExtractEvent<HandlerName>;
// "click" | "change" | "submit"

// 类名转实例变量名
type ClassName = "UserService" | "AuthController" | "DataRepository";
type InstanceName = Uncapitalize<ClassName>;
// "userService" | "authController" | "dataRepository"
```

### 适用场景

- **事件名提取：** 从 onClick 反推出 click
- **变量命名：** 类名转驼峰实例名
- **反向映射：** Capitalize 操作的逆向还原
- **配合模板字面量和 infer 做字符串解析

### 注意事项

- 只转换首字母，其余字母不变
- 和 Capitalize 互为逆操作
- 联合类型会自动分布
- 编译器固有类型，不能用 TypeScript 代码实现

### 总结

Uncapitalize&lt;T> 将字符串字面量类型的首字母转小写，是 Capitalize 的逆操作。常用于从事件处理器名反推事件名、类名转实例变量名等场景。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Awaited&lt;T>的Promise解包类型

### 概念定义

`Awaited<T>` 是 TypeScript 4.5 引入的内置工具类型，递归解包 Promise 类型，提取最终的值类型。它模拟 `await` 表达式的行为——无论 Promise 嵌套多深，都能提取到最内层的值类型。

### 实现原理

```typescript
// Awaited 的简化实现（实际实现更复杂，处理了 thenable 等边界情况）
type Awaited<T> =
    T extends null | undefined ? T :
    T extends object & { then(onfulfilled: infer F, ...args: infer _): any } ?
        F extends ((value: infer V, ...args: infer _) => any) ?
            Awaited<V> :  // 递归解包
            never :
    T;  // 非 Promise 直接返回
```

### 基本示例

```typescript
// 基本解包
type A = Awaited<Promise<string>>;           // string
type B = Awaited<Promise<number>>;           // number

// 递归解包嵌套 Promise
type C = Awaited<Promise<Promise<string>>>;  // string
type D = Awaited<Promise<Promise<Promise<boolean>>>>;  // boolean

// 非 Promise 直接返回
type E = Awaited<string>;   // string
type F = Awaited<number>;   // number

// 联合类型中的 Promise
type G = Awaited<Promise<string> | Promise<number>>;  // string | number

// 配合 ReturnType 使用
async function fetchUser() {
    return { id: 1, name: "张三" };
}

type User = Awaited<ReturnType<typeof fetchUser>>;
// { id: number; name: string }

// Promise.all 的类型推断依赖 Awaited
async function loadData() {
    const [users, posts] = await Promise.all([
        fetch("/users").then(r => r.json() as Promise<{ name: string }[]>),
        fetch("/posts").then(r => r.json() as Promise<{ title: string }[]>),
    ]);
    // users: { name: string }[]
    // posts: { title: string }[]
}
```

### 适用场景

- **异步函数返回类型：** 配合 ReturnType 提取异步函数的实际返回值类型
- **Promise.all/race：** 内部类型推断依赖 Awaited
- **泛型异步工具：** 编写处理 Promise 的工具函数时提取内部类型
- **API 类型定义：** 从异步 API 函数推导响应数据类型

### 常见问题

#### Awaited 和手动写 `T extends Promise<infer U> ? U : T` 有什么区别

Awaited 能递归解包多层 Promise，手动写的只解包一层。Awaited 还处理了 thenable 对象和 null/undefined 等边界情况。

#### Awaited 之前怎么获取 Promise 内部类型

TypeScript 4.5 之前需要自定义：`type UnwrapPromise<T> = T extends Promise<infer U> ? UnwrapPromise<U> : T`。

### 注意事项

- TypeScript 4.5+ 才可用
- 递归解包，无论嵌套多深
- 非 Promise 类型直接返回自身
- 处理了 thenable 对象的情况
- Promise.all 等内部类型推断依赖 Awaited

### 总结

Awaited&lt;T> 递归解包 Promise 类型提取最终值类型，模拟 await 的行为。TypeScript 4.5 引入，之前需要自定义。常配合 ReturnType 使用获取异步函数的实际返回值类型。Promise.all/race 等的类型推断也依赖 Awaited。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## PropertyKey的内置联合类型

### 概念定义

`PropertyKey` 是 TypeScript 内置的类型别名，定义为 `string | number | symbol` 的联合类型。它表示 JavaScript 中所有合法的对象属性键类型。在 JavaScript 中，对象的属性键只能是字符串、数字或 Symbol 三种类型之一。

PropertyKey 等价于 `keyof any`，是 Record、映射类型等工具类型中约束键类型参数的基础类型。

### 实现原理

```typescript
// PropertyKey 的内部定义
type PropertyKey = string | number | symbol;

// 等价关系
type AlsoPropertyKey = keyof any;  // string | number | symbol
```

### 基本示例

```typescript
// PropertyKey 约束函数参数为合法的对象键
function getProperty(obj: object, key: PropertyKey): unknown {
    return (obj as any)[key];
}

const user = { name: "张三", age: 25 };
getProperty(user, "name");    // 合法：string 是 PropertyKey
getProperty(user, 0);          // 合法：number 是 PropertyKey
getProperty(user, Symbol());   // 合法：symbol 是 PropertyKey

// 在泛型约束中使用
function createRecord<K extends PropertyKey, V>(keys: K[], value: V): Record<K, V> {
    const result = {} as Record<K, V>;
    keys.forEach(key => { result[key] = value; });
    return result;
}

const record = createRecord(["a", "b", "c"], 0);
// Record<"a" | "b" | "c", number>

// Record 的定义中使用了 keyof any（等价于 PropertyKey）
type MyRecord<K extends keyof any, T> = {
    [P in K]: T;
};
```

### PropertyKey 的三种成员

| 类型 | 说明 | 示例 |
|------|------|------|
| string | 最常见的属性键 | `"name"`, `"age"` |
| number | 数组索引和数字键 | `0`, `1`, `100` |
| symbol | 唯一标识符键 | `Symbol("id")`, `Symbol.iterator` |

### 适用场景

- **泛型约束：** 约束泛型参数为合法的对象键类型
- **工具函数：** 通用的对象操作函数的键参数类型
- **Record 类型：** Record 的键约束就是 `keyof any`（即 PropertyKey）
- **类型判断：** 判断某个类型是否可以作为对象键

### 常见问题

#### PropertyKey 和 keyof any 完全等价吗

是的，完全等价。`keyof any` 的计算结果就是 `string | number | symbol`，和 PropertyKey 的定义一致。

### 注意事项

- PropertyKey 是 `string | number | symbol` 的类型别名
- 等价于 `keyof any`
- JavaScript 对象的所有属性键在运行时都会被转为字符串（number 键除外在数组中有特殊处理）
- 是 Record 和映射类型中键约束的基础类型

### 总结

PropertyKey 是 `string | number | symbol` 的内置类型别名，表示 JavaScript 中所有合法的对象属性键类型。等价于 `keyof any`，是 Record 等工具类型中约束键参数的基础类型。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## IterableIterator&lt;T>的可迭代类型

### 概念定义

`IterableIterator<T>` 是 TypeScript 内置的接口类型，表示一个既是可迭代对象（Iterable）又是迭代器（Iterator）的对象。它同时实现了 `Symbol.iterator` 方法和 `next()` 方法，可以用 `for...of` 循环遍历，也可以手动调用 `next()` 逐步获取值。

JavaScript 中的生成器函数（`function*`）返回的对象就是 IterableIterator 类型。Map、Set 的 `.keys()`、`.values()`、`.entries()` 等方法也返回 IterableIterator。

### 接口定义

```typescript
// Iterator 接口：有 next() 方法
interface Iterator<T, TReturn = any, TNext = undefined> {
    next(...args: [] | [TNext]): IteratorResult<T, TReturn>;
    return?(value?: TReturn): IteratorResult<T, TReturn>;
    throw?(e?: any): IteratorResult<T, TReturn>;
}

// Iterable 接口：有 Symbol.iterator 方法
interface Iterable<T> {
    [Symbol.iterator](): Iterator<T>;
}

// IterableIterator 接口：同时是 Iterable 和 Iterator
interface IterableIterator<T> extends Iterator<T> {
    [Symbol.iterator](): IterableIterator<T>;
}
```

### 基本示例

```typescript
// 生成器函数返回 IterableIterator（旧写法，现在推荐用 Generator）
function* range(start: number, end: number): IterableIterator<number> {
    for (let i = start; i < end; i++) {
        yield i;
    }
}

// 用 for...of 遍历
for (const num of range(0, 5)) {
    console.log(num);  // 0, 1, 2, 3, 4
}

// 手动调用 next()
const iter = range(0, 3);
iter.next();  // { value: 0, done: false }
iter.next();  // { value: 1, done: false }
iter.next();  // { value: 2, done: false }
iter.next();  // { value: undefined, done: true }

// Map/Set 的方法返回 IterableIterator
const map = new Map<string, number>([["a", 1], ["b", 2]]);

const keys: IterableIterator<string> = map.keys();
const values: IterableIterator<number> = map.values();
const entries: IterableIterator<[string, number]> = map.entries();

// 展开运算符（依赖 Iterable 协议）
const keyArray = [...map.keys()];  // string[]
```

### 进阶用法

```typescript
// 自定义可迭代类
class NumberRange implements Iterable<number> {
    constructor(private start: number, private end: number) {}

    // 实现 Symbol.iterator 方法
    [Symbol.iterator](): IterableIterator<number> {
        let current = this.start;
        const end = this.end;
        return {
            next(): IteratorResult<number> {
                if (current < end) {
                    return { value: current++, done: false };
                }
                return { value: undefined, done: true };
            },
            [Symbol.iterator]() {
                return this;  // 返回自身，同时满足 Iterable 协议
            },
        };
    }
}

const range2 = new NumberRange(1, 4);
for (const n of range2) {
    console.log(n);  // 1, 2, 3
}

// TypeScript 中更推荐用 Generator 类型
function* fibonacci(): Generator<number, void, undefined> {
    let a = 0, b = 1;
    while (true) {
        yield a;
        [a, b] = [b, a + b];
    }
}
```

### Iterable 相关类型对比

| 类型 | 特征 | 示例 |
|------|------|------|
| `Iterable<T>` | 有 `[Symbol.iterator]()` | 数组、Map、Set |
| `Iterator<T>` | 有 `next()` 方法 | 迭代器对象 |
| `IterableIterator<T>` | 同时有两者 | 生成器、Map.keys() |
| `Generator<T, R, N>` | 生成器专用，更精确 | function* 返回值 |

### 适用场景

- **生成器函数：** 标注生成器的返回类型
- **自定义迭代器：** 实现可 for...of 遍历的对象
- **惰性序列：** 按需生成值，不一次性加载所有数据
- **集合操作：** Map/Set 的 keys/values/entries 方法返回类型

### 常见问题

#### IterableIterator 和 Generator 类型哪个更好

Generator 类型 `Generator<T, TReturn, TNext>` 比 IterableIterator 更精确，能表达 return 值类型和 next 参数类型。新代码推荐用 Generator 类型标注生成器函数。

#### 数组是 IterableIterator 吗

数组是 Iterable（有 `[Symbol.iterator]()`），但不是 Iterator（没有直接的 `next()` 方法）。调用 `array[Symbol.iterator]()` 返回的是 IterableIterator。

### 注意事项

- IterableIterator 需要 `lib` 配置包含 `ES2015` 或更高版本
- 生成器函数新代码推荐用 Generator 类型代替 IterableIterator
- 自定义迭代器的 `[Symbol.iterator]()` 通常返回 this
- for...of 循环依赖 Iterable 协议
- 展开运算符 `...` 和解构赋值也依赖 Iterable 协议

### 总结

IterableIterator&lt;T> 表示同时满足 Iterable 和 Iterator 协议的对象，可以 for...of 遍历也可以手动 next()。生成器函数和 Map/Set 的迭代方法返回此类型。新代码中生成器推荐用更精确的 Generator 类型。需要 ES2015+ 的 lib 配置。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。



## 5.6 模块与配置

## ESM的import/export类型声明

### 概念定义

TypeScript 完全支持 ECMAScript Modules（ESM）的 import/export 语法，并在此基础上扩展了类型导入导出的能力。TypeScript 3.8 引入了 `import type` 和 `export type` 语法，专门用于只导入/导出类型信息，确保编译后这些导入语句被完全移除，不产生任何运行时代码。

在 TypeScript 中，普通的 import 既可以导入值也可以导入类型，但使用 `import type` 可以明确表达"这个导入只用于类型检查"的意图，有助于构建工具（如 esbuild、swc）正确地移除类型导入。

### 语法与用法

```typescript
// ===== 导出 =====

// 导出值（编译后保留）
export const API_URL = "https://api.example.com";
export function fetchUser(id: number) { /* ... */ }
export class UserService { /* ... */ }

// 导出类型（编译后移除）
export interface User {
    id: number;
    name: string;
}

export type UserRole = "admin" | "editor" | "viewer";

// 显式类型导出（TypeScript 3.8+）
export type { User, UserRole };

// 默认导出
export default class App { /* ... */ }

// 重新导出
export { fetchUser } from "./api";
export type { User } from "./types";

// ===== 导入 =====

// 普通导入（值和类型都可以）
import { API_URL, fetchUser, UserService } from "./api";
import { User, UserRole } from "./types";

// 类型导入（TypeScript 3.8+，编译后完全移除）
import type { User, UserRole } from "./types";

// 内联类型导入（TypeScript 4.5+）
import { fetchUser, type User, type UserRole } from "./api";
// fetchUser 是值导入（保留），User 和 UserRole 是类型导入（移除）

// 默认导入
import App from "./App";
import type App from "./App";  // 只导入类型

// 命名空间导入
import * as API from "./api";
import type * as Types from "./types";
```

### 基本示例

```typescript
// types.ts - 纯类型文件
export interface ApiResponse<T> {
    code: number;
    data: T;
    message: string;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

// api.ts - 混合值和类型
import type { ApiResponse, HttpMethod } from "./types";

// 只导入类型，编译后 import 语句被移除
export async function request<T>(
    url: string,
    method: HttpMethod,  // 类型使用
    body?: unknown
): Promise<ApiResponse<T>> {
    const response = await fetch(url, { method, body: JSON.stringify(body) });
    return response.json();
}

// user-service.ts - 内联类型导入
import { request, type ApiResponse } from "./api";
import type { HttpMethod } from "./types";

interface User {
    id: number;
    name: string;
}

export async function getUser(id: number): Promise<ApiResponse<User>> {
    return request<User>(`/users/${id}`, "GET");
}
```

### import type 与普通 import 的对比

| 对比维度 | `import { X }` | `import type { X }` | 内联 `import { type X }` |
|----------|---------------|---------------------|------------------------|
| 导入值 | 可以 | 不可以 | 可以（非 type 标记的） |
| 导入类型 | 可以 | 可以 | 可以（type 标记的） |
| 编译后保留 | 有值引用时保留 | 完全移除 | type 标记的移除 |
| 版本要求 | 所有版本 | TypeScript 3.8+ | TypeScript 4.5+ |

### 适用场景

- **纯类型文件：** 从 .d.ts 或纯类型模块导入时用 import type
- **构建优化：** 明确类型导入帮助 esbuild/swc 等工具正确处理
- **循环依赖避免：** 类型导入不产生运行时代码，可以打破循环依赖
- **代码意图表达：** 明确区分"这个导入是类型还是值"

### 常见问题

#### 什么时候必须用 import type

当 `isolatedModules` 编译选项开启时（Vite、esbuild 等需要），如果一个导入只被用作类型，必须用 `import type` 或内联 `type` 标记。否则编译器/打包工具无法判断是否可以移除该导入。

#### import type 导入的可以当值用吗

不可以。`import type { User } from "./types"` 导入的 User 只能用在类型位置（类型标注、泛型参数等），不能用在值位置（如 `new User()`、`instanceof User`）。

### 注意事项

- `import type` 导入的标识符只能用在类型位置
- 开启 `isolatedModules` 时，类型导入必须用 `import type` 标记
- TypeScript 4.5+ 的内联类型导入更灵活，一条语句中混合值和类型导入
- `export type` 同理，只导出类型
- 编译后类型导入完全消失，不影响运行时

### 总结

TypeScript 扩展了 ESM 的 import/export，增加了 `import type` 和 `export type` 专门用于类型导入导出。类型导入编译后完全移除，不产生运行时代码。TypeScript 4.5 的内联类型导入进一步简化了混合值/类型导入的写法。开启 `isolatedModules` 时类型导入必须显式标记。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## CommonJS的require/module.exports类型

### 概念定义

CommonJS（CJS）是 Node.js 传统的模块系统，使用 `require()` 导入模块、`module.exports` 或 `exports` 导出模块。TypeScript 支持 CommonJS 模块语法，并提供了类型安全的导入导出方式。

当 tsconfig.json 的 `module` 设置为 `commonjs` 时，TypeScript 会将 ESM 的 import/export 编译为 CommonJS 的 require/module.exports。TypeScript 也支持直接使用 CJS 语法，但推荐在 TypeScript 代码中使用 ESM 语法，让编译器处理转换。

### 语法与用法

```typescript
// ===== 导出方式 =====

// 方式1：ESM 语法（推荐，编译后自动转为 CJS）
export function add(a: number, b: number): number {
    return a + b;
}
export default class Calculator { /* ... */ }

// 方式2：TypeScript 的 CJS 导出语法
// export = 等价于 module.exports =
export = {
    add(a: number, b: number): number {
        return a + b;
    },
};

// ===== 导入方式 =====

// 方式1：ESM 语法（推荐）
import { add } from "./math";
import Calculator from "./calculator";

// 方式2：TypeScript 的 CJS 导入语法
// import x = require() 等价于 const x = require()
import math = require("./math");

// 方式3：直接使用 require（需要 @types/node）
const fs = require("fs");  // fs 的类型是 any（不推荐）

// 方式4：配合 esModuleInterop 使用 ESM 语法导入 CJS 模块
import fs from "fs";  // 需要 esModuleInterop: true
```

### 基本示例

```typescript
// math.ts - 使用 export = 导出（CJS 风格）
function add(a: number, b: number): number {
    return a + b;
}

function multiply(a: number, b: number): number {
    return a * b;
}

// export = 将整个对象作为模块导出
export = { add, multiply };

// app.ts - 导入 export = 导出的模块
import math = require("./math");
// 或者开启 esModuleInterop 后：
// import math from "./math";

console.log(math.add(1, 2));       // 3
console.log(math.multiply(3, 4));  // 12
```

### ESM 与 CJS 的对比

| 对比维度 | ESM (import/export) | CJS (require/module.exports) |
|----------|--------------------|-----------------------------|
| 加载时机 | 静态分析，编译时确定 | 动态加载，运行时确定 |
| 语法 | import/export | require/module.exports |
| Tree Shaking | 支持 | 不支持 |
| TypeScript 推荐 | 推荐 | 仅兼容旧代码 |
| 浏览器支持 | 原生支持 | 需要打包工具 |

### 适用场景

- **Node.js 旧项目：** 维护使用 CJS 的 Node.js 项目
- **第三方库兼容：** 导入只提供 CJS 格式的包
- **渐进迁移：** 从 CJS 逐步迁移到 ESM

### 常见问题

#### TypeScript 中应该用 ESM 还是 CJS 语法

推荐使用 ESM（import/export）语法。如果目标是 CJS 环境，设置 `module: "commonjs"`，编译器会自动将 ESM 转为 CJS。直接写 CJS 语法在 TypeScript 中类型推断能力较弱。

#### export = 和 export default 的区别

`export =` 是 TypeScript 的 CJS 兼容语法，一个模块只能有一个 `export =`。`export default` 是 ESM 语法。两者不能混用。导入 `export =` 的模块用 `import x = require()` 或开启 esModuleInterop 后用 `import x from`。

### 注意事项

- 推荐在 TypeScript 中使用 ESM 语法，让编译器处理到 CJS 的转换
- `export =` 和 `export default` 不能混用
- `import x = require()` 是 TypeScript 专有的 CJS 导入语法
- 开启 esModuleInterop 可以用 ESM 语法导入 CJS 模块
- 直接使用 `require()` 会丢失类型信息

### 总结

TypeScript 支持 CommonJS 的导入导出，但推荐使用 ESM 语法让编译器自动转换。`export =` 和 `import x = require()` 是 TypeScript 的 CJS 兼容语法。开启 esModuleInterop 可以用 ESM 语法无缝导入 CJS 模块。新项目应优先使用 ESM。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## .d.ts声明文件的作用

### 概念定义

`.d.ts` 文件（Declaration File）是 TypeScript 的类型声明文件，只包含类型信息，不包含任何实现代码。它的作用是为 JavaScript 库或模块提供类型定义，让 TypeScript 项目能够获得类型检查和智能提示。

声明文件不会被编译为 JavaScript，它只在编译期为编译器提供类型信息。DefinitelyTyped（@types/xxx）社区维护了大量 JavaScript 库的声明文件。

### 语法与用法

```typescript
// user.d.ts - 声明文件示例
// 只有类型声明，没有实现

// 接口声明
interface User {
    id: number;
    name: string;
    email: string;
}

// 函数声明（没有函数体）
declare function fetchUser(id: number): Promise<User>;

// 变量声明
declare const API_BASE: string;

// 类声明（没有方法实现）
declare class UserService {
    constructor(baseUrl: string);
    getUser(id: number): Promise<User>;
    getUsers(): Promise<User[]>;
}

// 模块声明
declare module "my-library" {
    export function doSomething(): void;
    export interface Config {
        debug: boolean;
    }
}
```

### 基本示例

```typescript
// 为第三方 JS 库编写声明文件
// lodash-custom.d.ts
declare module "lodash-custom" {
    // 导出函数声明
    export function chunk<T>(array: T[], size: number): T[][];
    export function debounce<F extends (...args: any[]) => any>(
        func: F,
        wait: number
    ): F;
    export function throttle<F extends (...args: any[]) => any>(
        func: F,
        wait: number
    ): F;
}

// 为全局变量编写声明
// global.d.ts
declare const __DEV__: boolean;
declare const __VERSION__: string;

// 在代码中直接使用（有类型提示）
if (__DEV__) {
    console.log(`版本: ${__VERSION__}`);
}

// 为 CSS Modules 编写声明
// css-modules.d.ts
declare module "*.module.css" {
    const classes: { readonly [key: string]: string };
    export default classes;
}

declare module "*.module.scss" {
    const classes: { readonly [key: string]: string };
    export default classes;
}

// 为图片资源编写声明
// assets.d.ts
declare module "*.png" {
    const src: string;
    export default src;
}

declare module "*.svg" {
    const src: string;
    export default src;
}
```

### 声明文件的来源

| 来源 | 说明 | 示例 |
|------|------|------|
| 内置声明 | TypeScript 自带的 lib.d.ts | DOM API、ES 标准库 |
| @types 包 | DefinitelyTyped 社区维护 | @types/node、@types/react |
| 库自带 | npm 包自带 .d.ts | axios、zod |
| 手动编写 | 项目中自定义的声明文件 | global.d.ts、env.d.ts |
| 编译生成 | tsc --declaration 生成 | 从 .ts 自动生成 .d.ts |

### 适用场景

- **第三方 JS 库：** 为没有类型定义的 JS 库添加类型
- **全局变量：** 声明构建工具注入的全局变量（如 `__DEV__`）
- **资源模块：** 声明 CSS Modules、图片等非 JS 模块的类型
- **库发布：** 发布 npm 包时附带 .d.ts 提供类型支持

### 常见问题

#### 声明文件放在哪里

项目根目录的 `types/` 或 `typings/` 文件夹，或者和源码同目录。需要在 tsconfig.json 的 `include` 中包含声明文件路径，或配置 `typeRoots`。

#### @types 包是什么

@types 是 DefinitelyTyped 项目发布在 npm 上的声明包。安装 `@types/lodash` 后 TypeScript 自动识别，不需要额外配置。

### 注意事项

- .d.ts 文件只包含类型声明，不能有实现代码
- 声明文件不会被编译为 JavaScript
- 全局声明文件不需要 import/export（否则变成模块声明文件）
- `tsc --declaration` 可以从 .ts 文件自动生成 .d.ts
- 声明文件中用 `declare` 关键字声明变量、函数、类等

### 总结

.d.ts 声明文件为 JavaScript 代码提供类型信息，只在编译期使用，不产生运行时代码。来源包括 TypeScript 内置、@types 社区包、库自带和手动编写。广泛用于第三方库类型定义、全局变量声明和资源模块类型声明。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## declare关键字的全局声明

### 概念定义

`declare` 关键字用于告诉 TypeScript 编译器某个变量、函数、类或模块已经在其他地方存在（如 JavaScript 文件、CDN 引入的库、运行时环境注入等），不需要 TypeScript 提供实现。declare 声明不会产生任何 JavaScript 代码，只在编译期提供类型信息。

declare 通常出现在 `.d.ts` 声明文件中，但也可以在普通 `.ts` 文件中使用来声明全局存在的变量或函数。

### 语法与用法

```typescript
// 声明全局变量
declare const __DEV__: boolean;
declare let currentUser: string | null;
declare var jQuery: (selector: string) => any;

// 声明全局函数
declare function greet(name: string): void;
declare function setTimeout(callback: () => void, ms: number): number;

// 声明全局类
declare class EventEmitter {
    on(event: string, listener: (...args: any[]) => void): this;
    emit(event: string, ...args: any[]): boolean;
}

// 声明枚举
declare enum Direction {
    Up,
    Down,
    Left,
    Right,
}
```

### 基本示例

```typescript
// global.d.ts - 为构建工具注入的全局变量提供类型
declare const __DEV__: boolean;
declare const __VERSION__: string;
declare const __BUILD_TIME__: string;

// 在代码中直接使用，有完整的类型检查
if (__DEV__) {
    console.log(`开发模式 v${__VERSION__}，构建于 ${__BUILD_TIME__}`);
}

// 为 CDN 引入的库声明类型
// 假设通过 <script> 标签引入了 lodash
declare const _: {
    chunk<T>(array: T[], size: number): T[][];
    debounce<F extends (...args: any[]) => any>(func: F, wait: number): F;
    cloneDeep<T>(value: T): T;
};

// 使用时有类型提示
const chunks = _.chunk([1, 2, 3, 4], 2);  // number[][]

// 为 window 上的自定义属性声明类型
declare interface Window {
    __APP_CONFIG__: {
        apiUrl: string;
        debug: boolean;
    };
}

const config = window.__APP_CONFIG__;
console.log(config.apiUrl);  // 有类型提示
```

### declare 可以声明的内容

| 声明类型 | 语法 | 说明 |
|---------|------|------|
| 变量 | `declare const/let/var x: T` | 全局变量 |
| 函数 | `declare function f(): T` | 全局函数 |
| 类 | `declare class C {}` | 全局类 |
| 枚举 | `declare enum E {}` | 全局枚举 |
| 命名空间 | `declare namespace N {}` | 全局命名空间 |
| 模块 | `declare module "x" {}` | 模块声明 |

### 适用场景

- **构建工具变量：** Webpack DefinePlugin、Vite define 注入的全局常量
- **CDN 库：** 通过 script 标签引入的第三方库
- **运行时环境：** Node.js 全局对象、浏览器 API 扩展
- **遗留代码：** 为没有类型定义的 JavaScript 代码提供类型

### 常见问题

#### declare 和直接写类型的区别

declare 声明的是"已经存在但没有类型定义"的东西，不产生代码。直接写 `const x: string = "hello"` 会产生 JavaScript 代码。declare 用于描述外部已有的东西，不是创建新东西。

#### declare 必须在 .d.ts 文件中吗

不必须。可以在任何 .ts 文件中使用 declare。但全局声明通常放在 .d.ts 文件中更清晰。

### 注意事项

- declare 不产生任何 JavaScript 代码
- declare 声明的变量/函数必须在运行时真实存在，否则运行时报错
- 全局 declare 声明不需要 export
- 在 .d.ts 文件中，顶层声明默认就是 declare 的（可以省略 declare 关键字）
- declare 只提供类型信息，不验证运行时实际值的类型

### 总结

declare 关键字告诉编译器某个标识符已经存在于运行时环境，只需要类型信息。不产生 JavaScript 代码，只在编译期使用。广泛用于声明构建工具注入的全局变量、CDN 库和运行时环境扩展。declare 声明必须和运行时实际存在的值匹配，否则运行时报错。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## declare module的模块扩充

### 概念定义

`declare module` 有两种用途：一是为没有类型定义的第三方模块提供类型声明（模块声明），二是向已有模块添加新的类型定义（模块扩充/Module Augmentation）。

模块扩充允许在不修改原始模块源码的情况下，为其添加新的导出成员。这在扩展第三方库的类型定义时非常有用，比如给 Express 的 Request 对象添加自定义属性。

### 语法与用法

```typescript
// 用途1：为无类型模块提供声明
declare module "untyped-library" {
    export function doSomething(input: string): number;
    export interface Config {
        debug: boolean;
        verbose: boolean;
    }
}

// 用途2：模块扩充（扩展已有模块）
// 必须在模块文件中（有 import/export 的文件）
import "express";

declare module "express" {
    interface Request {
        userId?: string;
        sessionId?: string;
    }
}
```

### 基本示例

```typescript
// 为 CSS Modules 提供类型声明
declare module "*.module.css" {
    const classes: { readonly [key: string]: string };
    export default classes;
}

// 为 JSON 文件提供类型声明
declare module "*.json" {
    const value: any;
    export default value;
}

// 扩展 Express 的 Request 类型
// express-augment.d.ts
import "express";

declare module "express" {
    interface Request {
        user?: {
            id: string;
            name: string;
            role: "admin" | "user";
        };
        startTime?: number;
    }
}

// 使用时 req.user 有类型提示
// app.ts
import express from "express";
const app = express();
app.use((req, res, next) => {
    req.user = { id: "1", name: "张三", role: "admin" };
    req.startTime = Date.now();
    next();
});

// 扩展 Vue Router 的 meta 类型
declare module "vue-router" {
    interface RouteMeta {
        requiresAuth?: boolean;
        title?: string;
    }
}
```

### 适用场景

- **第三方库类型扩展：** 给 Express、Koa 等库的类型添加自定义属性
- **无类型模块声明：** 为缺少类型定义的 JS 库提供基本声明
- **资源模块声明：** 声明 CSS、图片、JSON 等非 JS 模块的类型
- **框架类型扩展：** 扩展 Vue Router、Vuex 等框架的接口

### 常见问题

#### 模块扩充和声明合并的区别

模块扩充是在外部文件中向其他模块添加导出。声明合并是同一个模块中多次声明同名接口自动合并。模块扩充只能添加新成员，不能修改已有成员的类型。

#### 模块扩充必须在模块文件中吗

是的。包含模块扩充的文件必须有 import 或 export 语句（成为模块文件）。否则 declare module 被视为模块声明而非模块扩充。

### 注意事项

- 模块扩充只能添加新成员，不能修改已有成员类型
- 模块扩充文件必须是模块（有 import/export）
- 通配符模块声明（`*.css`）匹配所有符合模式的导入
- declare module 中不能有实现代码
- 模块名必须和 import 时的模块标识符完全匹配

### 总结

declare module 用于为无类型模块提供声明或扩充已有模块的类型。模块扩充可以在不修改源码的情况下向第三方库添加新的类型成员。广泛用于 Express 请求扩展、CSS Modules 声明和框架类型扩展。模块扩充文件必须是模块，且只能添加新成员。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## declare global的全局对象扩充

### 概念定义

`declare global` 用于在模块文件（有 import/export 的文件）中向全局作用域添加类型声明。正常情况下，模块文件中的声明都是模块局部的，不会影响全局。`declare global {}` 块让你能在模块文件中扩展全局类型，比如给 Window、NodeJS.ProcessEnv 添加自定义属性。

### 语法与用法

```typescript
// 必须在模块文件中使用（文件中有 import 或 export）
export {};  // 确保文件是模块

declare global {
    // 扩展 Window 接口
    interface Window {
        __APP_CONFIG__: {
            apiUrl: string;
            debug: boolean;
        };
    }

    // 添加全局变量
    var __DEV__: boolean;

    // 添加全局函数
    function __log__(message: string): void;
}
```

### 基本示例

```typescript
// env.d.ts - 扩展 Node.js 环境变量类型
export {};

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV: "development" | "production" | "test";
            PORT: string;
            DATABASE_URL: string;
            JWT_SECRET: string;
        }
    }
}

// 使用时有完整的类型提示和自动补全
const port = process.env.PORT;       // string
const env = process.env.NODE_ENV;    // "development" | "production" | "test"

// global.d.ts - 扩展全局 Window 对象
export {};

declare global {
    interface Window {
        ga: (...args: any[]) => void;        // Google Analytics
        dataLayer: Record<string, any>[];     // GTM 数据层
    }

    // 全局的自定义数组方法
    interface Array<T> {
        customFilter(predicate: (item: T) => boolean): T[];
    }
}
```

### 适用场景

- **环境变量类型：** 扩展 process.env 的类型定义
- **全局 API 扩展：** 给 Window、Document 添加自定义属性
- **原型方法扩展：** 给 Array、String 等内置类型添加方法声明
- **第三方脚本：** 声明通过 CDN 注入的全局变量

### 常见问题

#### declare global 和直接在 .d.ts 中声明全局类型有什么区别

如果 .d.ts 文件没有 import/export（即全局声明文件），顶层声明就是全局的，不需要 declare global。declare global 只在模块文件中才需要，用于"从模块中向全局注入类型"。

### 注意事项

- declare global 只能在模块文件中使用（有 import/export）
- 文件中至少有一个 import 或 export（空的 `export {}` 也可以）
- declare global 中只能添加新成员，不能修改已有成员类型
- 扩展内置类型（如 Array）要谨慎，避免命名冲突
- var 声明的全局变量在 declare global 中是合法的（let/const 不行）

### 总结

declare global 在模块文件中向全局作用域注入类型声明。常用于扩展 Window、process.env 和内置类型的接口。文件必须是模块（有 import/export）。全局声明文件（无 import/export 的 .d.ts）不需要 declare global，顶层声明直接就是全局的。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## declare namespace的命名空间

### 概念定义

`declare namespace` 用于声明一个全局的命名空间，将相关的类型、接口、函数和变量组织在一个命名空间下。命名空间是 TypeScript 早期用来组织代码的方式，在现代 TypeScript 中主要用于声明文件中为全局库（如 jQuery、Lodash 通过 script 标签引入）提供类型定义。

命名空间可以嵌套，也支持与同名接口、类、函数、枚举进行声明合并。

### 语法与用法

```typescript
// 声明全局命名空间
declare namespace MyLib {
    // 接口
    interface Config {
        debug: boolean;
        version: string;
    }

    // 函数
    function init(config: Config): void;
    function destroy(): void;

    // 变量
    const version: string;

    // 嵌套命名空间
    namespace Utils {
        function format(value: number): string;
        function parse(input: string): number;
    }
}

// 使用
MyLib.init({ debug: true, version: "1.0" });
MyLib.Utils.format(42);
```

### 基本示例

```typescript
// 为 jQuery 声明类型（script 标签引入方式）
declare namespace JQuery {
    interface EventObject {
        target: Element;
        type: string;
        preventDefault(): void;
    }
}

declare function $(selector: string): JQuery.EventObject[];
declare function $(callback: () => void): void;

// 为全局配置对象声明命名空间
declare namespace AppConfig {
    const apiUrl: string;
    const timeout: number;

    interface Database {
        host: string;
        port: number;
        name: string;
    }

    const database: Database;
}

// 使用
console.log(AppConfig.apiUrl);
console.log(AppConfig.database.host);
```

### 命名空间与模块的对比

| 对比维度 | 命名空间 (namespace) | 模块 (module) |
|----------|---------------------|---------------|
| 作用域 | 全局 | 文件级别 |
| 加载方式 | script 标签 | import/require |
| 现代推荐 | 仅用于声明文件 | 推荐 |
| Tree Shaking | 不支持 | 支持 |

### 适用场景

- **全局库声明：** 为通过 script 标签引入的库提供类型
- **类型组织：** 在声明文件中组织相关类型
- **遗留代码兼容：** 维护使用命名空间的旧 TypeScript 项目

### 常见问题

#### 现代项目还需要用 namespace 吗

不推荐在业务代码中使用 namespace，应该用 ESM 的 import/export。namespace 主要在 .d.ts 声明文件中使用，为全局库提供类型组织。

### 注意事项

- 现代 TypeScript 项目推荐用模块代替命名空间
- namespace 主要在声明文件中使用
- 命名空间可以嵌套
- 同名命名空间会自动合并（声明合并）
- 不要在模块文件中使用 namespace 组织代码

### 总结

declare namespace 在声明文件中组织全局库的类型定义，将相关类型放在同一命名空间下。现代项目中不推荐在业务代码中使用 namespace，应使用 ESM 模块。namespace 主要保留在声明文件和遗留代码兼容场景中。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## tsconfig.json的compilerOptions核心配置

### 概念定义

`tsconfig.json` 是 TypeScript 项目的配置文件，`compilerOptions` 是其中最核心的配置项，控制 TypeScript 编译器的行为：如何检查类型、输出什么格式的代码、支持哪些语法特性等。

一个 TypeScript 项目的类型安全程度、输出兼容性和开发体验，很大程度上取决于 compilerOptions 的配置。

### 基本示例

```json
{
    "compilerOptions": {
        // ===== 类型检查 =====
        "strict": true,                    // 开启所有严格类型检查
        "noImplicitAny": true,             // 禁止隐式 any
        "strictNullChecks": true,          // 严格空检查
        "strictFunctionTypes": true,       // 严格函数类型检查
        "noImplicitReturns": true,         // 禁止隐式返回
        "noImplicitThis": true,            // 禁止隐式 this
        "noUnusedLocals": true,            // 未使用的局部变量报错
        "noUnusedParameters": true,        // 未使用的参数报错

        // ===== 模块系统 =====
        "module": "ESNext",                // 模块系统输出格式
        "moduleResolution": "bundler",     // 模块解析策略
        "esModuleInterop": true,           // ESM/CJS 互操作
        "allowSyntheticDefaultImports": true, // 允许合成默认导入
        "isolatedModules": true,           // 每个文件独立编译

        // ===== 输出目标 =====
        "target": "ES2020",               // 编译输出的 JS 版本
        "lib": ["ES2020", "DOM", "DOM.Iterable"], // 包含的类型库

        // ===== 路径与输出 =====
        "baseUrl": ".",                    // 基础路径
        "paths": {                         // 路径别名
            "@/*": ["src/*"]
        },
        "outDir": "./dist",               // 输出目录
        "rootDir": "./src",               // 源码根目录

        // ===== 声明文件 =====
        "declaration": true,               // 生成 .d.ts
        "declarationMap": true,            // 生成 .d.ts.map
        "sourceMap": true,                 // 生成 .js.map

        // ===== 其他 =====
        "skipLibCheck": true,              // 跳过声明文件检查
        "forceConsistentCasingInFileNames": true, // 强制文件名大小写一致
        "resolveJsonModule": true,         // 允许导入 JSON
        "jsx": "react-jsx"                 // JSX 转换模式
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist"]
}
```

### 核心配置项分类

| 分类 | 配置项 | 作用 |
|------|--------|------|
| 类型检查 | strict, noImplicitAny | 控制类型检查严格程度 |
| 模块系统 | module, moduleResolution | 控制模块格式和解析方式 |
| 输出目标 | target, lib | 控制编译输出版本和可用 API |
| 路径配置 | baseUrl, paths | 配置模块路径别名 |
| 声明输出 | declaration, sourceMap | 控制辅助文件生成 |
| JSX | jsx | 控制 JSX 转换方式 |

### 适用场景

- **新项目初始化：** 配置合理的默认值
- **库开发：** 配置 declaration 生成类型文件
- **React/Vue 项目：** 配置 jsx 和框架相关选项
- **Node.js 项目：** 配置 module 和 target 为 Node 环境

### 常见问题

#### strict 包含哪些选项

strict: true 相当于同时开启 noImplicitAny、strictNullChecks、strictFunctionTypes、strictBindCallApply、strictPropertyInitialization、noImplicitThis、alwaysStrict。

#### 应该用什么 moduleResolution

现代前端项目（Vite/webpack）用 `bundler`，纯 Node.js ESM 项目用 `nodenext`，Node.js CJS 项目用 `node`。

### 注意事项

- 新项目建议 strict: true 开启全部严格检查
- moduleResolution 要和构建工具匹配
- target 决定编译输出的语法版本，lib 决定可用的类型定义
- skipLibCheck: true 可以加速编译但会跳过第三方声明检查
- isolatedModules: true 在使用 esbuild/swc 时必须开启

### 总结

compilerOptions 是 tsconfig.json 的核心，控制类型检查严格度、模块系统、输出目标和路径配置等。新项目建议开启 strict 模式，moduleResolution 选择和构建工具匹配的策略。合理的 compilerOptions 配置是 TypeScript 项目类型安全和开发体验的基础。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## strict模式的严格类型检查总开关

### 概念定义

`strict` 是 tsconfig.json 中 compilerOptions 的一个布尔选项，设为 true 时相当于同时开启所有严格类型检查选项。它是一个"总开关"，一次性启用多个严格检查，让 TypeScript 以最严格的模式检查代码。

新项目强烈建议从一开始就开启 strict: true。如果是旧项目迁移，可以先关闭 strict，逐个开启子选项，逐步收紧类型检查。

### strict 包含的子选项

```json
{
    "compilerOptions": {
        "strict": true
        // 等价于同时开启以下所有选项：
        // "noImplicitAny": true,
        // "strictNullChecks": true,
        // "strictFunctionTypes": true,
        // "strictBindCallApply": true,
        // "strictPropertyInitialization": true,
        // "noImplicitThis": true,
        // "useUnknownInCatchVariables": true,
        // "alwaysStrict": true
    }
}
```

### 各子选项说明

| 子选项 | 作用 |
|--------|------|
| noImplicitAny | 禁止隐式 any，未标注且无法推断的参数报错 |
| strictNullChecks | null 和 undefined 不再是所有类型的子类型 |
| strictFunctionTypes | 函数参数类型检查变为逆变（更严格） |
| strictBindCallApply | bind/call/apply 的参数类型严格检查 |
| strictPropertyInitialization | 类属性必须在构造函数中初始化 |
| noImplicitThis | 禁止隐式 this 类型为 any |
| useUnknownInCatchVariables | catch 的 error 类型为 unknown 而非 any |
| alwaysStrict | 输出的 JS 文件添加 "use strict" |

### 基本示例

```typescript
// strict: true 的效果

// noImplicitAny：参数必须标注类型
function greet(name: string) {  // 必须标注 name: string
    return `Hello, ${name}`;
}
// function greet(name) {}  // 报错：Parameter 'name' implicitly has an 'any' type

// strictNullChecks：null 不能赋给 string
let name: string = "张三";
// name = null;  // 报错：Type 'null' is not assignable to type 'string'
let maybeName: string | null = null;  // 需要显式联合 null

// strictPropertyInitialization：类属性必须初始化
class User {
    name: string;        // 报错：没有在构造函数中初始化
    age: number = 0;     // 合法：有初始值
    email?: string;      // 合法：可选属性

    constructor(name: string) {
        this.name = name;  // 在构造函数中赋值就不报错了
    }
}

// useUnknownInCatchVariables：catch error 是 unknown
try {
    throw new Error("出错了");
} catch (error) {
    // error 类型是 unknown，必须收窄后才能使用
    if (error instanceof Error) {
        console.log(error.message);  // 收窄后可以访问 message
    }
}
```

### 适用场景

- **新项目：** 从一开始就开启 strict: true
- **库开发：** 库的类型定义应该在 strict 模式下通过检查
- **团队协作：** 统一严格的类型检查标准

### 常见问题

#### 开启 strict 后报错太多怎么办

可以先设 strict: true，然后单独关闭某些子选项。比如 `"strict": true, "strictPropertyInitialization": false`。逐步修复后再逐个重新开启。

#### strict 会随 TypeScript 版本增加新的子选项吗

会。TypeScript 新版本可能会在 strict 中加入新的检查选项。升级 TypeScript 版本后，strict 模式下可能出现新的报错，这是正常的。

### 注意事项

- 新项目务必从一开始就开启 strict: true
- strict 是总开关，可以单独覆盖某个子选项
- TypeScript 版本升级可能增加 strict 的子选项
- strict 模式下的代码类型安全程度更高
- 旧项目迁移可以逐步开启子选项

### 总结

strict: true 是 TypeScript 严格类型检查的总开关，同时启用 noImplicitAny、strictNullChecks 等多个子选项。新项目应从一开始就开启，旧项目可以逐步启用子选项。strict 模式下代码的类型安全程度更高，能在编译期发现更多潜在错误。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## noImplicitAny的隐式any禁止

### 概念定义

`noImplicitAny` 是 tsconfig.json 中的编译选项，开启后禁止变量或参数的类型被隐式推断为 `any`。当 TypeScript 无法从上下文推断出类型时，如果没有显式标注，就会报错而不是默认使用 any。

这个选项是 strict 模式的子选项之一。开启后强制开发者为无法推断的参数显式标注类型，避免 any 类型在代码中悄悄扩散。

### 基本示例

```typescript
// noImplicitAny: true 时

// 报错：参数 'name' 隐式具有 'any' 类型
// function greet(name) {
//     return `Hello, ${name}`;
// }

// 正确：显式标注参数类型
function greet(name: string): string {
    return `Hello, ${name}`;
}

// 报错：回调参数隐式 any
// [1, 2, 3].reduce((acc, cur) => acc + cur);
// 需要标注初始值类型或泛型参数

// 正确：提供初始值让编译器推断
[1, 2, 3].reduce((acc, cur) => acc + cur, 0);

// 变量有初始值时不报错（能推断）
const count = 42;          // 推断为 number，不报错
let name = "张三";          // 推断为 string，不报错

// 变量无初始值时报错
// let data;               // 隐式 any，报错
let data: unknown;          // 显式标注
```

### 适用场景

- **所有新项目：** 作为 strict 的一部分默认开启
- **代码质量管控：** 防止 any 在代码中扩散
- **团队协作：** 强制显式类型标注

### 常见问题

#### 哪些情况下会触发隐式 any 报错

函数参数没有类型标注且无法从上下文推断、变量声明没有初始值且没有类型标注、解构参数没有类型标注。有上下文推断的回调函数参数不会报错。

### 注意事项

- strict: true 已包含 noImplicitAny
- 有上下文推断的场景（回调函数）不会报错
- 有初始值的变量可以自动推断，不需要额外标注
- 如果确实需要 any，必须显式写 `any`
- 这个选项不影响显式标注的 any

### 总结

noImplicitAny 禁止类型被隐式推断为 any，强制开发者为无法推断的参数和变量显式标注类型。是 strict 的子选项，防止 any 在代码中悄悄扩散。有上下文推断和初始值的场景不受影响。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## strictNullChecks的严格空检查

### 概念定义

`strictNullChecks` 是 tsconfig.json 中的编译选项，开启后 `null` 和 `undefined` 不再是所有类型的子类型，它们只能赋给各自的类型（以及 `void` 对于 undefined）。这意味着 `string` 类型的变量不能赋值为 null 或 undefined，必须用联合类型 `string | null` 显式声明可空。

这是 strict 模式最重要的子选项之一，开启后能在编译期捕获大量的空引用错误（相当于消除 JavaScript 中最常见的 "Cannot read property of null/undefined" 运行时错误）。

### 基本示例

```typescript
// strictNullChecks: true 时

// null 和 undefined 不能赋给 string
let name: string = "张三";
// name = null;       // 报错：Type 'null' is not assignable to type 'string'
// name = undefined;  // 报错

// 必须显式联合 null/undefined
let maybeName: string | null = null;    // 合法
let optionalAge: number | undefined;     // 合法

// 使用前必须判空
function getLength(str: string | null): number {
    // return str.length;  // 报错：str 可能是 null
    if (str === null) {
        return 0;
    }
    return str.length;  // 收窄后合法
}

// 可选参数自动包含 undefined
function greet(name?: string): string {
    // name 的类型是 string | undefined
    return `Hello, ${name ?? "World"}`;
}

// DOM 查询返回可空类型
const el = document.getElementById("app");  // HTMLElement | null
// el.textContent = "Hello";  // 报错：el 可能是 null
if (el) {
    el.textContent = "Hello";  // 收窄后合法
}
```

### 开启与关闭的对比

| 对比维度 | strictNullChecks: true | strictNullChecks: false |
|----------|----------------------|------------------------|
| null 赋给 string | 报错 | 允许 |
| DOM 查询返回类型 | `HTMLElement \| null` | `HTMLElement` |
| 可选属性类型 | `T \| undefined` | `T` |
| 空引用保护 | 编译期捕获 | 运行时崩溃 |

### 适用场景

- **所有项目：** 应该始终开启，是最有价值的严格选项
- **大型项目：** 在编译期而非运行时发现空引用错误
- **库开发：** 确保 API 的可空性表达准确

### 常见问题

#### 开启后如何处理大量的空检查报错

使用可选链 `?.`、空值合并 `??`、类型守卫 `if (x !== null)` 和非空断言 `!`（谨慎使用）。这些报错实际上暴露了代码中潜在的空引用 bug。

### 注意事项

- strict: true 已包含 strictNullChecks
- 这是 strict 中最有价值的单个选项
- 开启后需要用联合类型显式声明可空
- 可选属性（`?`）的值类型自动包含 undefined
- 配合可选链 `?.` 和空值合并 `??` 使用

### 总结

strictNullChecks 让 null 和 undefined 不再是所有类型的子类型，必须显式声明可空。这是消除空引用运行时错误的最有效手段，应该始终开启。配合可选链、空值合并和类型守卫处理可空值。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## strictFunctionTypes的严格函数类型

### 概念定义

`strictFunctionTypes` 是 tsconfig.json 中的编译选项，开启后函数参数的类型检查从双变（Bivariant）变为逆变（Contravariant）。这意味着函数类型赋值时，参数类型必须满足逆变规则——父类型函数可以赋给子类型函数，反过来不行。

这个选项只影响用属性函数语法（`callback: (x: T) => void`）声明的函数参数，不影响方法简写语法（`callback(x: T): void`）。方法简写始终是双变的。

### 基本示例

```typescript
class Animal {
    name: string = "";
}

class Dog extends Animal {
    breed: string = "";
}

// strictFunctionTypes: true 时

// 属性函数语法：逆变检查
type AnimalHandler = (animal: Animal) => void;
type DogHandler = (dog: Dog) => void;

const handleAnimal: AnimalHandler = (animal) => console.log(animal.name);
const handleDog: DogHandler = (dog) => console.log(dog.breed);

// 合法：AnimalHandler 可以赋给 DogHandler（逆变：参数从子到父）
const handler1: DogHandler = handleAnimal;

// 报错：DogHandler 不能赋给 AnimalHandler（逆变不允许参数从父到子）
// const handler2: AnimalHandler = handleDog;
// 原因：handleDog 期望 dog.breed，但 AnimalHandler 可能传入普通 Animal 没有 breed

// 方法简写语法：始终双变（不受 strictFunctionTypes 影响）
interface Events {
    onClick(event: MouseEvent): void;  // 方法简写，双变
    onHover: (event: MouseEvent) => void;  // 属性函数，受逆变约束
}
```

### 两种函数声明语法的对比

| 语法 | 示例 | 参数类型检查 |
|------|------|-------------|
| 属性函数语法 | `fn: (x: T) => void` | 逆变（strictFunctionTypes 生效） |
| 方法简写语法 | `fn(x: T): void` | 双变（始终，不受影响） |

### 适用场景

- **所有项目：** 作为 strict 的一部分默认开启
- **回调函数：** 确保回调参数类型安全
- **事件处理：** 检查事件处理器的参数类型兼容性

### 常见问题

#### 为什么方法简写不受影响

这是有意的设计。Array 等内置类型的方法（如 push、forEach）在严格逆变下会产生大量不兼容错误。方法简写保持双变是实用性和类型安全之间的折中。

### 注意事项

- strict: true 已包含 strictFunctionTypes
- 只影响属性函数语法，不影响方法简写语法
- 让函数参数类型检查更安全（逆变）
- 需要理解协变逆变才能理解这个选项的行为

### 总结

strictFunctionTypes 让属性函数语法的参数类型检查变为逆变，更严格更安全。方法简写语法不受影响，保持双变。是 strict 的子选项，能在编译期发现不安全的函数类型赋值。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## noImplicitReturns的隐式返回禁止

### 概念定义

`noImplicitReturns` 是 tsconfig.json 中的编译选项，开启后要求函数的所有代码路径都必须有显式的 return 语句。如果某个分支没有返回值而其他分支有返回值，编译器会报错。

这个选项不属于 strict 模式的子选项，需要单独开启。它能防止开发者遗漏某个条件分支的返回值，避免函数意外返回 undefined。

### 基本示例

```typescript
// noImplicitReturns: true 时

// 报错：不是所有代码路径都有返回值
// function getDiscount(level: string): number {
//     if (level === "vip") {
//         return 0.8;
//     }
//     if (level === "svip") {
//         return 0.5;
//     }
//     // 缺少 else 分支的 return
// }

// 正确：所有分支都有 return
function getDiscount(level: string): number {
    if (level === "vip") {
        return 0.8;
    }
    if (level === "svip") {
        return 0.5;
    }
    return 1;  // 默认无折扣
}

// switch 语句也需要所有分支都有 return
function getStatusText(code: number): string {
    switch (code) {
        case 200: return "成功";
        case 404: return "未找到";
        case 500: return "服务器错误";
        default: return "未知状态";  // 必须有 default
    }
}
```

### 适用场景

- **复杂条件逻辑：** 多分支函数容易遗漏返回值
- **switch 语句：** 确保所有 case 和 default 都有返回
- **代码审查辅助：** 自动发现遗漏的代码路径

### 常见问题

#### noImplicitReturns 是 strict 的一部分吗

不是。noImplicitReturns 不包含在 strict 中，需要单独设置。但大多数项目建议同时开启。

### 注意事项

- 不属于 strict 模式，需要单独开启
- 只检查声明了非 void 返回类型的函数
- 返回类型为 void 的函数不受影响
- 配合穷尽检查（never）使用效果更好

### 总结

noImplicitReturns 确保函数所有代码路径都有显式返回值，防止遗漏分支导致意外返回 undefined。不属于 strict 模式，需要单独开启。配合穷尽检查能更全面地保证函数返回值的完整性。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## noImplicitThis的隐式this禁止

### 概念定义

`noImplicitThis` 是 tsconfig.json 中的编译选项，开启后禁止函数中 `this` 的类型被隐式推断为 `any`。当 TypeScript 无法确定 this 的类型时，要求开发者显式声明 this 参数的类型。

这个选项是 strict 模式的子选项之一。它能防止在独立函数、回调函数和事件处理器中错误地使用 this。

### 基本示例

```typescript
// noImplicitThis: true 时

// 报错：this 隐式具有 any 类型
// function getArea() {
//     return this.width * this.height;  // this 类型不明确
// }

// 正确：显式声明 this 参数
function getArea(this: { width: number; height: number }): number {
    return this.width * this.height;
}

// 类方法中 this 自动推断为类实例，不需要显式声明
class Rectangle {
    constructor(public width: number, public height: number) {}

    getArea(): number {
        return this.width * this.height;  // this 自动推断为 Rectangle
    }
}

// 对象字面量方法中 this 可能需要配合 ThisType
const calculator = {
    value: 0,
    add(n: number) {
        this.value += n;  // 对象方法中 this 通常能正确推断
        return this;
    },
};
```

### 适用场景

- **独立函数：** 防止函数中的 this 是 any
- **事件处理：** 确保事件处理器的 this 类型正确
- **回调函数：** 防止回调中的 this 丢失类型

### 常见问题

#### 类方法需要声明 this 参数吗

通常不需要。类方法中 this 自动推断为类实例类型。只有在方法可能被提取为独立函数使用时，才需要显式声明 this 参数防止上下文丢失。

### 注意事项

- strict: true 已包含 noImplicitThis
- 类方法中 this 自动推断，通常不需要显式声明
- this 参数是 TypeScript 特有语法，编译后移除
- 箭头函数没有自己的 this，不受此选项影响
- 配合 ThisType&lt;T> 可以为对象字面量方法指定 this 类型

### 总结

noImplicitThis 禁止 this 被隐式推断为 any，要求无法推断 this 类型时显式声明。是 strict 的子选项。类方法中 this 自动推断不受影响，主要影响独立函数和回调中的 this 使用。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## moduleResolution的模块解析策略

### 概念定义

`moduleResolution` 是 tsconfig.json 中的编译选项，控制 TypeScript 如何解析模块导入语句中的模块路径。不同的解析策略决定了编译器在哪些目录和文件中查找导入的模块。

TypeScript 支持多种模块解析策略，需要根据项目的运行环境和构建工具选择合适的策略。选错策略会导致模块找不到、类型定义不正确等问题。

### 可选值

```json
{
    "compilerOptions": {
        // 可选值：
        "moduleResolution": "bundler"    // 现代前端项目（Vite/webpack）推荐
        // "moduleResolution": "nodenext" // Node.js ESM 项目推荐
        // "moduleResolution": "node16"   // 等价于 nodenext
        // "moduleResolution": "node"     // Node.js CJS 项目（旧版 Node 解析）
        // "moduleResolution": "classic"  // TypeScript 1.x 时代的旧策略，不推荐
    }
}
```

### 各策略的解析行为

| 策略 | 适用场景 | 解析 `import "foo"` 的查找顺序 |
|------|---------|-------------------------------|
| bundler | Vite/webpack 等打包器 | package.json exports → main → index |
| nodenext | Node.js ESM | package.json exports → 严格 ESM 规则 |
| node | Node.js CJS | node_modules → package.json main → index |
| classic | 旧项目 | 相对路径向上查找 |

### 基本示例

```typescript
// bundler 策略下的模块解析
// 支持 package.json 的 exports 字段
// 支持省略扩展名
// 支持 index 文件作为目录入口

// 以下导入在 bundler 策略下都能正确解析
import { useState } from "react";              // node_modules/react
import { Button } from "@/components/Button";   // 路径别名（需要 paths 配置）
import styles from "./App.module.css";           // 相对路径
import utils from "./utils";                     // 省略 .ts 扩展名

// nodenext 策略下的模块解析
// 严格要求：相对导入必须带扩展名
import { helper } from "./helper.js";  // 必须写 .js（即使源文件是 .ts）
// import { helper } from "./helper";  // 报错：不能省略扩展名
```

### 适用场景

- **Vite/webpack 项目：** 使用 `bundler`
- **Node.js ESM 项目：** 使用 `nodenext`
- **Node.js CJS 项目：** 使用 `node`
- **旧项目维护：** 可能使用 `node` 或 `classic`

### 常见问题

#### bundler 和 node 的主要区别

bundler 支持 package.json 的 `exports` 和 `imports` 字段，允许省略扩展名，更贴合打包工具的行为。node 是旧版 Node.js 的解析逻辑，不支持 exports 字段。

#### nodenext 为什么要求写 .js 扩展名

因为 Node.js ESM 规范要求相对导入必须带扩展名。TypeScript 源文件是 .ts，但编译后是 .js，所以导入时写 .js 扩展名。

### 注意事项

- moduleResolution 要和 module 选项以及构建工具匹配
- bundler 策略需要 TypeScript 5.0+
- nodenext 要求相对导入带 .js 扩展名
- 选错策略会导致模块解析失败或类型丢失
- paths 路径别名在所有策略下都可用

### 总结

moduleResolution 控制模块路径的解析方式。现代前端项目用 bundler，Node.js ESM 用 nodenext，Node.js CJS 用 node。策略必须和构建工具匹配，选错会导致模块解析失败。bundler 是 TypeScript 5.0 新增的策略，最贴合现代打包工具的行为。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## paths的路径映射配置

### 概念定义

`paths` 是 tsconfig.json 中 compilerOptions 的配置项，用于定义模块路径别名。它将导入语句中的路径模式映射到文件系统中的实际路径，让开发者可以用简短的别名代替冗长的相对路径。

paths 只影响 TypeScript 编译器的模块解析和类型检查，不会修改编译输出的代码。实际的路径重写需要构建工具（如 Vite 的 resolve.alias、webpack 的 resolve.alias）配合完成。

### 语法与用法

```json
{
    "compilerOptions": {
        "baseUrl": ".",
        "paths": {
            "@/*": ["src/*"],
            "@components/*": ["src/components/*"],
            "@utils/*": ["src/utils/*"],
            "@types/*": ["src/types/*"],
            "~/*": ["src/*"]
        }
    }
}
```

### 基本示例

```typescript
// 没有路径别名时的导入（深层嵌套很痛苦）
import { Button } from "../../../components/Button";
import { formatDate } from "../../../utils/date";
import type { User } from "../../../types/user";

// 配置路径别名后的导入
import { Button } from "@/components/Button";
import { formatDate } from "@/utils/date";
import type { User } from "@/types/user";

// 多路径映射：一个别名可以映射多个路径（按顺序查找）
// tsconfig.json:
// "paths": {
//     "@shared/*": ["packages/shared/src/*", "packages/common/src/*"]
// }

// 精确匹配（不带通配符）
// "paths": {
//     "jquery": ["node_modules/jquery/dist/jquery.slim.js"]
// }
```

### paths 配置与构建工具配合

| 构建工具 | 对应配置 | 配置位置 |
|----------|---------|---------|
| Vite | resolve.alias | vite.config.ts |
| webpack | resolve.alias | webpack.config.js |
| Jest | moduleNameMapper | jest.config.js |
| esbuild | alias | esbuild 配置 |

### 适用场景

- **大型项目：** 避免深层嵌套的相对路径
- **Monorepo：** 跨包引用使用路径别名
- **组件库：** 统一组件导入路径
- **代码重构：** 移动文件后只需修改路径映射

### 常见问题

#### paths 必须配合 baseUrl 使用吗

在 TypeScript 4.1 之前必须配合 baseUrl。TypeScript 4.1+ 允许不设 baseUrl 时使用 paths，此时路径相对于 tsconfig.json 所在目录。

#### paths 只影响类型检查吗

是的。paths 只让 TypeScript 编译器理解路径别名，不会修改输出的 JS 代码。需要构建工具配合做实际的路径重写。

### 注意事项

- paths 只影响 TypeScript 的类型解析，不影响运行时
- 构建工具需要配置对应的路径别名才能正常运行
- 通配符 `*` 表示匹配任意路径段
- 多个映射路径按顺序查找，找到第一个存在的就使用
- TypeScript 4.1+ 不再强制要求 baseUrl

### 总结

paths 配置模块路径别名，用简短的别名代替冗长的相对路径。只影响 TypeScript 编译器的类型解析，需要构建工具配合做运行时路径重写。大型项目中广泛使用 `@/*` 等别名简化导入路径。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## baseUrl的基础URL设置

### 概念定义

`baseUrl` 是 tsconfig.json 中 compilerOptions 的配置项，设置模块解析的基准目录。配置后，非相对路径的模块导入会以 baseUrl 为根目录进行解析。它通常和 paths 配合使用，为路径别名提供基准。

### 语法与用法

```json
{
    "compilerOptions": {
        "baseUrl": ".",       // 以 tsconfig.json 所在目录为基准
        // 或
        "baseUrl": "./src"    // 以 src 目录为基准
    }
}
```

### 基本示例

```typescript
// baseUrl: "./src" 时

// 以下导入从 src 目录开始解析
import { Button } from "components/Button";    // 解析为 src/components/Button
import { formatDate } from "utils/date";       // 解析为 src/utils/date

// 相对路径导入不受 baseUrl 影响
import { helper } from "./helper";             // 始终相对于当前文件

// baseUrl: "." 配合 paths 使用
// {
//     "baseUrl": ".",
//     "paths": { "@/*": ["src/*"] }
// }
import { Button } from "@/components/Button";  // 解析为 ./src/components/Button
```

### 适用场景

- **路径别名基准：** 为 paths 提供基准目录
- **简化导入：** 避免深层嵌套的相对路径
- **Monorepo：** 设置共享的基准目录

### 常见问题

#### baseUrl 在 TypeScript 4.1+ 还必须设置吗

如果只用 paths 路径别名，TypeScript 4.1+ 不再强制要求 baseUrl。paths 中的路径会相对于 tsconfig.json 所在目录解析。但设置 baseUrl 仍然有用，可以让非相对路径导入直接从指定目录解析。

#### baseUrl 会影响 node_modules 的解析吗

不会。node_modules 的解析有独立的逻辑，baseUrl 只影响非相对路径且不在 node_modules 中的模块。

### 注意事项

- baseUrl 只影响 TypeScript 编译器的模块解析
- 构建工具需要配合配置对应的路径解析
- 相对路径导入不受 baseUrl 影响
- TypeScript 4.1+ 使用 paths 不再强制要求 baseUrl
- 设为 "." 表示以 tsconfig.json 所在目录为基准

### 总结

baseUrl 设置模块解析的基准目录，配合 paths 实现路径别名。非相对路径的模块导入从 baseUrl 开始解析。TypeScript 4.1+ 不再强制要求配合 paths 使用，但设置它仍然可以简化导入路径。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## typeRoots的类型根目录

### 概念定义

`typeRoots` 是 tsconfig.json 中 compilerOptions 的配置项，指定 TypeScript 自动查找类型声明包的根目录列表。默认情况下，TypeScript 会自动包含 `node_modules/@types` 下的所有类型声明。配置 typeRoots 后，只有指定目录下的类型包会被自动包含。

### 语法与用法

```json
{
    "compilerOptions": {
        // 默认行为（不配置 typeRoots 时）：
        // 自动查找 ./node_modules/@types, ../node_modules/@types, ...

        // 自定义类型根目录
        "typeRoots": [
            "./node_modules/@types",  // 保留默认的 @types
            "./types"                  // 添加项目自定义类型目录
        ]
    }
}
```

### 基本示例

```typescript
// 项目结构
// project/
// ├── node_modules/@types/     ← 社区类型包（@types/node、@types/react 等）
// ├── types/                   ← 项目自定义类型
// │   ├── global/
// │   │   └── index.d.ts       ← 全局类型声明
// │   └── custom-lib/
// │       └── index.d.ts       ← 自定义库类型
// └── tsconfig.json

// tsconfig.json
// {
//     "compilerOptions": {
//         "typeRoots": ["./node_modules/@types", "./types"]
//     }
// }

// types/global/index.d.ts
declare const __APP_NAME__: string;
declare const __APP_VERSION__: string;

// types/custom-lib/index.d.ts
declare module "custom-lib" {
    export function doWork(): void;
}
```

### typeRoots 与 types 的对比

| 配置项 | 作用 | 粒度 |
|--------|------|------|
| typeRoots | 指定查找类型包的根目录 | 目录级别 |
| types | 从 typeRoots 中选择性包含特定类型包 | 包级别 |

### 适用场景

- **自定义类型目录：** 项目有独立的类型声明文件夹
- **Monorepo：** 多个项目共享类型声明
- **类型隔离：** 精确控制哪些目录的类型被包含

### 常见问题

#### 配置 typeRoots 后 @types 下的包不生效了

配置 typeRoots 会覆盖默认行为。如果想保留 @types 的自动包含，必须在 typeRoots 中显式包含 `./node_modules/@types`。

### 注意事项

- 配置 typeRoots 会覆盖默认的 @types 查找行为
- 要保留 @types，必须显式包含 `./node_modules/@types`
- typeRoots 中的每个目录下的子目录被视为一个类型包
- 配合 types 选项可以更精细地控制包含哪些类型包
- 大多数项目不需要配置 typeRoots，默认行为即可

### 总结

typeRoots 指定 TypeScript 查找类型声明包的根目录。默认是 node_modules/@types。配置后会覆盖默认行为，需要显式保留 @types 目录。大多数项目使用默认值即可，只有需要自定义类型目录时才配置。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## lib的库类型包含

### 概念定义

`lib` 是 tsconfig.json 中 compilerOptions 的配置项，指定 TypeScript 编译时包含哪些内置类型定义库（lib.d.ts 文件）。这些库定义了 JavaScript 运行时环境可用的 API 类型，如 DOM API、ES2015 的 Promise 和 Map、ES2020 的 BigInt 等。

如果不配置 lib，TypeScript 会根据 target 选项自动选择默认的库。手动配置 lib 后会覆盖默认值，需要显式列出所有需要的库。

### 语法与用法

```json
{
    "compilerOptions": {
        // 前端项目常见配置
        "lib": ["ES2020", "DOM", "DOM.Iterable"],

        // Node.js 项目（不需要 DOM）
        // "lib": ["ES2022"],

        // 需要最新 ES 特性
        // "lib": ["ESNext", "DOM", "DOM.Iterable"]
    }
}
```

### 常用库选项

| 库名称 | 内容 |
|--------|------|
| ES5 | ES5 基础类型（Array、Object 等） |
| ES2015 | Promise、Map、Set、Symbol、Iterator |
| ES2016 | Array.prototype.includes |
| ES2017 | Object.entries/values、async/await 类型 |
| ES2018 | Promise.finally、异步迭代 |
| ES2019 | Array.flat/flatMap、Object.fromEntries |
| ES2020 | BigInt、Promise.allSettled、globalThis |
| ES2021 | String.replaceAll、Promise.any |
| ES2022 | Array.at、Object.hasOwn、Error.cause |
| ES2023 | Array.findLast/findLastIndex |
| ESNext | 最新的所有 ES 特性 |
| DOM | 浏览器 DOM API（document、window 等） |
| DOM.Iterable | DOM 集合的可迭代支持 |
| WebWorker | Web Worker API |

### 基本示例

```typescript
// lib 包含 ES2020 时，以下类型可用
const map = new Map<string, number>();     // ES2015
const set = new Set<number>();              // ES2015
const p = Promise.allSettled([]);           // ES2020
const big = BigInt(100);                    // ES2020

// lib 包含 DOM 时，以下类型可用
const el = document.getElementById("app"); // DOM
const ctx = new AbortController();          // DOM
window.addEventListener("click", () => {}); // DOM

// lib 不包含 DOM 时，上述 DOM API 会报错
// 适用于 Node.js 项目，避免意外使用浏览器 API
```

### 适用场景

- **前端项目：** `["ES2020", "DOM", "DOM.Iterable"]`
- **Node.js 项目：** `["ES2022"]`（不包含 DOM）
- **通用库：** 根据最低支持的 ES 版本选择
- **Web Worker：** `["ES2020", "WebWorker"]`

### 常见问题

#### lib 和 target 的关系

target 决定编译输出的 JavaScript 语法版本，lib 决定可用的类型定义。两者独立配置。比如 target: ES5 但 lib 包含 ES2020，代码可以使用 Promise 类型但需要自行 polyfill。

#### 不配置 lib 会怎样

TypeScript 根据 target 自动选择默认库。target: ES2020 默认包含 ES2020 和 DOM。手动配置 lib 后覆盖默认值。

### 注意事项

- 手动配置 lib 后会覆盖 target 的默认库选择
- lib 只提供类型定义，不提供运行时 polyfill
- 前端项目通常需要 DOM 和 DOM.Iterable
- Node.js 项目不应包含 DOM
- ESNext 包含最新的所有 ES 特性，但可能不稳定

### 总结

lib 配置 TypeScript 包含的内置类型库，决定代码中可用的 API 类型。前端项目需要 DOM，Node.js 项目不需要。手动配置 lib 会覆盖默认值。lib 只提供类型定义不提供 polyfill，运行时支持需要另外处理。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## target的ECMAScript目标版本

### 概念定义

`target` 是 tsconfig.json 中 compilerOptions 的配置项，指定 TypeScript 编译输出的 JavaScript 版本。编译器会将高版本的语法特性（如箭头函数、async/await、可选链）降级为目标版本支持的语法。

target 决定了编译产物中可以使用哪些 JavaScript 语法。比如 target 设为 ES5 时，箭头函数会被转换为普通函数，class 会被转换为构造函数和原型链。

### 可选值

| target 值 | 输出语法特性 | 适用场景 |
|-----------|-------------|---------|
| ES5 | var、function、prototype | 需要支持 IE11 |
| ES2015/ES6 | let/const、箭头函数、class、Promise | 旧版浏览器 |
| ES2016 | 指数运算符 `**` | — |
| ES2017 | async/await | — |
| ES2018 | 异步迭代、rest/spread 属性 | — |
| ES2019 | 可选 catch 绑定 | — |
| ES2020 | 可选链 `?.`、空值合并 `??`、BigInt | 现代浏览器 |
| ES2021 | 逻辑赋值运算符 `&&=` `||=` `??=` | — |
| ES2022 | 类字段、top-level await、at() | 现代项目推荐 |
| ESNext | 最新的所有语法，不降级 | 由构建工具降级 |

### 基本示例

```typescript
// 源码
const greet = (name: string): string => `Hello, ${name}`;

class User {
    constructor(public name: string) {}
    greet() { return `Hi, ${this.name}`; }
}

const value = null;
const result = value ?? "default";

// target: ES5 编译输出
// var greet = function (name) { return "Hello, " + name; };
// var User = /** @class */ (function () {
//     function User(name) { this.name = name; }
//     User.prototype.greet = function () { return "Hi, " + this.name; };
//     return User;
// }());
// var result = value !== null && value !== void 0 ? value : "default";

// target: ES2020 编译输出（保留现代语法）
// const greet = (name) => `Hello, ${name}`;
// class User { ... }
// const result = value ?? "default";
```

### 适用场景

- **现代前端项目（Vite/webpack）：** target 设为 ESNext，由构建工具处理降级
- **Node.js 18+：** target 设为 ES2022
- **库发布：** 根据最低支持的运行时环境选择
- **需要兼容旧浏览器：** target 设为 ES5 或 ES2015

### 常见问题

#### target 和 lib 有什么区别

target 决定编译输出的语法版本（箭头函数是否降级等）。lib 决定可用的类型定义（Promise、Map 等 API 类型是否可用）。两者独立配置。

#### 现代项目 target 应该设成什么

如果使用 Vite/webpack 等构建工具，target 设为 ESNext（不降级，由构建工具处理）。如果 tsc 是最终编译器，根据运行时环境选择。

### 注意事项

- target 只控制语法降级，不提供 polyfill
- 需要 polyfill 的 API（如 Promise、Array.from）需要单独处理
- target 会影响默认的 lib 选择
- 现代项目通常让构建工具（Vite/webpack）处理降级
- ESNext 会随 TypeScript 版本更新，始终指向最新

### 总结

target 控制 TypeScript 编译输出的 JavaScript 语法版本。高版本语法会被降级为目标版本支持的语法。现代前端项目通常设为 ESNext 由构建工具处理降级。target 只管语法降级，API polyfill 需要另外处理。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## module的模块系统输出

### 概念定义

`module` 是 tsconfig.json 中 compilerOptions 的配置项，指定 TypeScript 编译输出的模块系统格式。它决定了 import/export 语句在编译后变成什么样的模块语法——是保持 ESM 格式、转换为 CommonJS 的 require/module.exports，还是其他模块格式。

### 可选值

| module 值 | 输出格式 | 适用场景 |
|-----------|---------|---------|
| ESNext / ES2022 | 保持 ESM（import/export） | Vite/webpack 前端项目 |
| NodeNext | ESM 或 CJS（根据 package.json type 字段） | Node.js 项目 |
| CommonJS | require / module.exports | Node.js CJS 项目 |
| AMD | define / require（AMD 格式） | 浏览器端旧项目 |
| UMD | 兼容 AMD 和 CJS | 发布通用库 |
| None | 不输出模块语法 | 全局脚本 |

### 基本示例

```typescript
// 源码
import { readFile } from "fs";
export function loadConfig(path: string) {
    return readFile(path, "utf-8");
}

// module: "ESNext" 输出（保持 ESM）
// import { readFile } from "fs";
// export function loadConfig(path) {
//     return readFile(path, "utf-8");
// }

// module: "CommonJS" 输出
// "use strict";
// Object.defineProperty(exports, "__esModule", { value: true });
// const fs_1 = require("fs");
// function loadConfig(path) {
//     return (0, fs_1.readFile)(path, "utf-8");
// }
// exports.loadConfig = loadConfig;
```

### 适用场景

- **Vite/webpack 项目：** `ESNext`（由打包工具处理模块）
- **Node.js ESM 项目：** `NodeNext`
- **Node.js CJS 项目：** `CommonJS`
- **库发布（双格式）：** 分别配置生成 ESM 和 CJS

### 常见问题

#### module 和 moduleResolution 的关系

module 决定输出的模块格式，moduleResolution 决定如何查找模块。两者需要配合：module: NodeNext 通常搭配 moduleResolution: nodenext，module: ESNext 搭配 moduleResolution: bundler。

#### 前端项目应该设什么

Vite/webpack 等打包器自己处理模块打包，TypeScript 只需保持 ESM 格式输出即可，设为 `ESNext` 或 `ES2022`。

### 注意事项

- module 和 target 独立配置：target 管语法版本，module 管模块格式
- module: NodeNext 会根据 package.json 的 type 字段决定输出 ESM 还是 CJS
- 前端项目通常设为 ESNext，由打包工具处理
- module 会影响 moduleResolution 的默认值
- 发布库时可能需要同时输出 ESM 和 CJS 两种格式

### 总结

module 控制编译输出的模块系统格式。前端项目设为 ESNext 保持 ESM 格式，Node.js 项目用 NodeNext 或 CommonJS。module 和 target 独立配置，和 moduleResolution 需要配合使用。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## esModuleInterop的ESM/CJS互操作

### 概念定义

`esModuleInterop` 是 tsconfig.json 中 compilerOptions 的配置项，开启后 TypeScript 会在编译输出中生成辅助代码，让 ESM 的 `import` 语法可以正确导入 CommonJS 模块。它解决了 ESM 和 CJS 之间的互操作性问题，特别是默认导入（default import）和命名空间导入的兼容性。

开启 esModuleInterop 后，`allowSyntheticDefaultImports` 也会自动开启。

### 问题背景

```typescript
// CJS 模块的导出方式
// express/index.js
// module.exports = function() { ... }

// 不开启 esModuleInterop 时的导入
import * as express from "express";  // 必须用命名空间导入
// import express from "express";    // 报错：没有 default 导出

// 开启 esModuleInterop 后
import express from "express";       // 合法：默认导入 CJS 模块
import * as fs from "fs";            // 也合法
```

### 基本示例

```typescript
// esModuleInterop: true 时

// 可以用默认导入语法导入 CJS 模块
import express from "express";
import React from "react";
import path from "path";
import fs from "fs";

// 编译器生成辅助函数处理互操作
// __importDefault 和 __importStar 辅助函数

// 不开启时，必须这样导入
// import * as express from "express";
// import * as React from "react";
// import * as path from "path";

// 开启后 allowSyntheticDefaultImports 自动生效
// 即使 CJS 模块没有 default 导出，也可以用 import x from 语法
```

### 开启与关闭的对比

| 对比维度 | esModuleInterop: true | esModuleInterop: false |
|----------|----------------------|------------------------|
| `import x from "cjs"` | 合法 | 报错（无 default 导出） |
| `import * as x from "cjs"` | 合法 | 合法 |
| 辅助代码 | 生成 __importDefault | 不生成 |
| 代码体积 | 略微增加 | 不增加 |

### 适用场景

- **所有使用 CJS 库的项目：** express、lodash 等 CJS 库的默认导入
- **React 项目：** `import React from "react"` 的标准写法
- **Node.js 项目：** 导入内置模块（fs、path）的默认导入

### 常见问题

#### esModuleInterop 和 allowSyntheticDefaultImports 的区别

`allowSyntheticDefaultImports` 只影响类型检查（允许编译器不报错），不生成辅助代码。`esModuleInterop` 同时影响类型检查和编译输出（生成辅助代码确保运行时正确）。推荐直接用 esModuleInterop。

#### 使用 Vite/webpack 时还需要开启吗

需要。虽然打包工具会处理模块互操作，但 esModuleInterop 还影响 TypeScript 的类型检查。不开启的话类型检查会报错。

### 注意事项

- 开启后 allowSyntheticDefaultImports 自动生效
- 会在编译输出中生成辅助函数
- 现代项目建议始终开启
- 配合 importHelpers: true 和 tslib 可以减少重复的辅助代码
- 几乎所有 TypeScript 项目模板都默认开启此选项

### 总结

esModuleInterop 解决 ESM 默认导入 CJS 模块的互操作问题，生成辅助代码确保运行时正确。现代项目建议始终开启。开启后可以用 `import x from "cjs-module"` 语法导入 CommonJS 模块。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## skipLibCheck的声明文件跳过检查

### 概念定义

`skipLibCheck` 是 tsconfig.json 中 compilerOptions 的配置项，开启后 TypeScript 会跳过所有 `.d.ts` 声明文件的类型检查。这包括 node_modules/@types 中的声明文件、第三方库自带的声明文件以及项目中的 .d.ts 文件。

skipLibCheck 的主要目的是加速编译和避免第三方声明文件之间的类型冲突。在大型项目中，不同版本的 @types 包之间可能存在类型不兼容的问题，skipLibCheck 可以绕过这些问题。

### 基本示例

```json
{
    "compilerOptions": {
        "skipLibCheck": true  // 跳过所有 .d.ts 文件的类型检查
    }
}
```

```typescript
// 开启 skipLibCheck 后

// 即使 @types/node 和 @types/react 之间存在类型冲突，也不会报错
// 即使某个第三方库的 .d.ts 文件有错误，也不会阻塞编译

// 项目自己的 .ts 文件仍然会被严格类型检查
// skipLibCheck 只跳过 .d.ts 文件，不跳过 .ts 文件

// 注意：项目中的 .d.ts 文件也会被跳过检查
// global.d.ts 中的类型错误不会被发现
```

### 开启与关闭的对比

| 对比维度 | skipLibCheck: true | skipLibCheck: false |
|----------|-------------------|---------------------|
| 编译速度 | 更快 | 更慢 |
| 第三方类型冲突 | 不报错 | 可能报错 |
| .d.ts 错误检测 | 跳过 | 检查 |
| 项目 .ts 检查 | 正常检查 | 正常检查 |

### 适用场景

- **大型项目：** 加速编译，节省 CI 时间
- **第三方类型冲突：** 不同 @types 包版本不兼容时绕过
- **快速原型：** 开发阶段减少不必要的类型错误干扰

### 常见问题

#### skipLibCheck 会降低项目的类型安全吗

对项目自己的 .ts 代码不会。skipLibCheck 只跳过 .d.ts 文件，项目代码仍然被严格检查。但项目中自定义的 .d.ts 声明文件的错误也不会被发现。

#### 什么时候不应该开启 skipLibCheck

开发 TypeScript 库并发布 .d.ts 时，应该关闭 skipLibCheck 确保自己的声明文件没有错误。

### 注意事项

- 只跳过 .d.ts 文件，不跳过 .ts 文件
- 项目中自定义的 .d.ts 也会被跳过
- 几乎所有现代 TypeScript 项目模板都默认开启
- 开发库时应关闭以确保声明文件正确
- 大型项目中可以显著提升编译速度

### 总结

skipLibCheck 跳过所有 .d.ts 声明文件的类型检查，加速编译并避免第三方类型冲突。项目自己的 .ts 代码不受影响。现代项目几乎都默认开启。开发发布库时应关闭以验证声明文件正确性。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## TS 5.4+的闭包类型收窄优化

### 概念定义

TypeScript 5.4 引入了闭包中的类型收窄优化（Narrowed Types in Closures）。在此之前，如果一个变量在 if 判断后被闭包（回调函数、Promise.then 等）捕获，TypeScript 无法在闭包内部保持收窄后的类型——编译器会"忘记"已经做过的类型守卫，变量的类型回退到收窄前的宽泛类型。

TypeScript 5.4 改进了控制流分析，使得在最后一次赋值之后创建的闭包中，收窄后的类型能够被正确保留。这减少了大量不必要的类型断言和重复的空值检查。

### 基本示例

```typescript
// TypeScript 5.4 之前的行为
function processOld(value: string | null) {
    if (value !== null) {
        // 这里 value 被收窄为 string
        console.log(value.toUpperCase());  // 合法

        // 但在闭包中，收窄丢失
        setTimeout(() => {
            // TypeScript 5.3-：value 的类型回退为 string | null
            // console.log(value.toUpperCase());  // 报错：value 可能是 null
            // 需要重新判空或断言
            console.log(value!.toUpperCase());  // 不得不用非空断言
        }, 100);
    }
}

// TypeScript 5.4+ 的优化行为
function processNew(value: string | null) {
    if (value !== null) {
        // value 被收窄为 string

        // 闭包中也能保持收窄后的类型
        setTimeout(() => {
            // TypeScript 5.4+：value 的类型仍然是 string
            console.log(value.toUpperCase());  // 合法，无需断言
        }, 100);

        // Promise 回调同样生效
        Promise.resolve().then(() => {
            console.log(value.length);  // 合法
        });

        // 数组方法回调也生效
        [1, 2, 3].forEach(() => {
            console.log(value.trim());  // 合法
        });
    }
}
```

### 进阶用法

```typescript
// 条件生效的前提：变量在最后一次赋值之后没有再被修改

function example1(items: string[] | null) {
    if (items !== null) {
        // items 在 if 之后没有被重新赋值，闭包中收窄生效
        items.forEach(item => {
            console.log(item.toUpperCase());
        });
    }
}

// 如果变量在闭包创建前被重新赋值，收窄不生效
function example2() {
    let value: string | null = "hello";

    if (value !== null) {
        value = getNewValue();  // 重新赋值，收窄失效

        setTimeout(() => {
            // value 的类型回退为 string | null
            // 因为 value 在收窄后被重新赋值了
        }, 100);
    }
}

function getNewValue(): string | null {
    return Math.random() > 0.5 ? "new" : null;
}

// const 变量始终可以在闭包中保持收窄
function example3(input: string | null) {
    if (input !== null) {
        const value = input;  // const 不会被重新赋值

        setTimeout(() => {
            console.log(value.toUpperCase());  // 始终合法
        }, 100);
    }
}
```

### 5.3 与 5.4 的闭包类型收窄对比

| 场景 | TypeScript 5.3- | TypeScript 5.4+ |
|------|----------------|-----------------|
| if 内的同步闭包 | 收窄丢失 | 收窄保留 |
| if 内的 setTimeout 回调 | 收窄丢失 | 收窄保留（未重新赋值时） |
| if 内的 Promise.then | 收窄丢失 | 收窄保留（未重新赋值时） |
| 变量重新赋值后的闭包 | 收窄丢失 | 收窄丢失（仍然不安全） |

### 适用场景

- **异步回调：** setTimeout、Promise.then 中使用收窄后的变量
- **数组方法：** forEach、map、filter 回调中使用收窄后的变量
- **事件监听：** addEventListener 回调中使用收窄后的变量

### 常见问题

#### 什么情况下闭包中的收窄仍然不生效

如果变量在类型守卫之后、闭包创建之前被重新赋值，收窄不会在闭包中保留。这是合理的——重新赋值可能改变了变量的类型。

#### 如何确保闭包中的收窄生效

使用 const 声明或确保变量在收窄后不再重新赋值。const 变量永远不会被重新赋值，闭包中的收窄始终有效。

### 注意事项

- TypeScript 5.4+ 才可用
- 只有在变量最后一次赋值之后创建的闭包中收窄才生效
- 变量被重新赋值后，收窄在闭包中失效
- const 变量在闭包中始终保持收窄
- 升级到 5.4 后可以删除很多不必要的非空断言

### 总结

TypeScript 5.4 优化了闭包中的类型收窄，在变量未被重新赋值的情况下，if 判断后创建的闭包能保持收窄后的类型。这消除了大量不必要的非空断言和重复判空。使用 const 变量可以确保闭包中的收窄始终有效。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## TS 5.4+的NoInfer&lt;T>工具类型

### 概念定义

`NoInfer<T>` 是 TypeScript 5.4 引入的内置工具类型，用于阻止编译器从某个位置推断泛型类型参数。当一个泛型函数有多个参数使用同一个类型参数 T 时，TypeScript 会从所有参数位置综合推断 T 的类型。NoInfer 可以让编译器忽略某个参数位置的类型推断，只从其他位置推断 T。

这在设计 API 时非常有用——当你希望某个参数的类型"跟随"其他参数的推断结果，而不是"参与"推断时，用 NoInfer 标记它。

### 语法与用法

```typescript
// 没有 NoInfer 的问题
function createFSM<S extends string>(config: {
    initial: S;
    states: S[];
}) {
    return config;
}

// TypeScript 从 initial 和 states 两个位置综合推断 S
// S 被推断为 "idle" | "loading" | "error" | "typo"
// "typo" 不会报错，因为它参与了 S 的推断
createFSM({
    initial: "idle",
    states: ["idle", "loading", "error", "typo"],  // "typo" 被允许
});

// 使用 NoInfer 阻止 initial 参与推断
function createFSMSafe<S extends string>(config: {
    initial: NoInfer<S>;  // 不从这里推断 S
    states: S[];           // 只从这里推断 S
}) {
    return config;
}

// S 只从 states 推断为 "idle" | "loading" | "error"
// initial 必须是 S 的子类型
createFSMSafe({
    initial: "idle",       // 合法：是 S 的成员
    states: ["idle", "loading", "error"],
});

createFSMSafe({
    initial: "typo",       // 报错："typo" 不在 states 中
    states: ["idle", "loading", "error"],
});
```

### 基本示例

```typescript
// 默认值必须是选项之一
function selectOption<T extends string>(
    options: T[],
    defaultValue: NoInfer<T>  // 默认值不参与 T 的推断
): T {
    return defaultValue;
}

selectOption(["red", "green", "blue"], "red");    // 合法
// selectOption(["red", "green", "blue"], "yellow"); // 报错

// 事件系统：回调参数类型跟随事件名
interface EventMap {
    click: { x: number; y: number };
    focus: { target: string };
    blur: { target: string };
}

function on<K extends keyof EventMap>(
    event: K,
    callback: (data: NoInfer<EventMap[K]>) => void  // 不从回调推断 K
): void {
    // ...
}

on("click", (data) => {
    // data 的类型是 { x: number; y: number }
    console.log(data.x, data.y);
});

// 容器组件：子组件类型跟随数据类型
function createList<T>(
    items: T[],
    renderItem: (item: NoInfer<T>) => string  // renderItem 不参与 T 的推断
): string[] {
    return items.map(renderItem);
}

const result = createList(
    [{ id: 1, name: "张三" }, { id: 2, name: "李四" }],
    (item) => item.name  // item 自动推断为 { id: number; name: string }
);
```

### NoInfer 的作用位置

| 场景 | 不使用 NoInfer | 使用 NoInfer |
|------|--------------|-------------|
| 默认值参数 | 默认值参与推断，拓宽了 T | 默认值只能是已推断的 T 的子类型 |
| 回调参数 | 回调参与推断，可能拓宽 T | 回调类型跟随其他位置的推断 |
| 约束参数 | 约束值参与推断 | 约束值必须符合其他位置推断的 T |

### 适用场景

- **选项与默认值：** 默认值必须是可选项之一
- **状态机：** 初始状态必须是已定义的状态之一
- **事件系统：** 回调参数类型跟随事件名
- **表单字段：** 字段值类型跟随字段定义

### 常见问题

#### NoInfer 之前怎么实现类似效果

在 5.4 之前需要用一些技巧，比如 `T & {}` 或拆分为两个泛型参数配合约束。NoInfer 提供了更清晰、更直接的方式。

#### NoInfer 会影响运行时吗

不会。NoInfer 是纯类型层面的操作，编译后完全消失。`NoInfer<T>` 在类型层面等价于 T，只是阻止了该位置的类型推断。

### 注意事项

- TypeScript 5.4+ 才可用
- NoInfer&lt;T> 在类型层面等价于 T，只影响推断行为
- 编译后完全消失，不影响运行时
- 放在不希望参与推断的参数位置上
- 适合设计"约束跟随"模式的 API

### 总结

NoInfer&lt;T> 阻止编译器从标记位置推断泛型参数，让该位置的类型"跟随"其他位置的推断结果。TypeScript 5.4 引入，解决了长期以来"默认值不应参与类型推断"的问题。广泛用于选项/默认值、状态机初始状态、事件系统回调等场景。编译后完全消失，不影响运行时。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


