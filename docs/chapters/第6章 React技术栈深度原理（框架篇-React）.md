---
title: 第6章 React技术栈深度原理（框架篇-React）
---

# React技术栈深度原理（框架篇-React）


## 6.1 JSX与组件基础

## JSX语法糖与React.createElement转换

### 概念说明

JSX（JavaScript XML）是 React 引入的语法扩展，允许在 JavaScript 代码中编写类似 HTML 的标记。JSX 本身不是合法的 JavaScript，它是一种语法糖，在编译阶段会被 Babel 或 TypeScript 编译器转换为普通的 JavaScript 函数调用。

在 React 17 之前，JSX 编译为 `React.createElement()` 调用，因此每个使用 JSX 的文件都必须导入 React。React 17 引入了全新的 JSX 转换（jsx-runtime），编译器会自动注入 `_jsx` 函数，不再需要手动导入 React。这个变化减少了样板代码，也为未来的优化铺平了道路。

### API 签名与参数

```typescript
// React 17 之前的经典转换
React.createElement(
    type: string | React.ComponentType,
    props: object | null,
    ...children: React.ReactNode[]
): React.ReactElement;

// React 17+ 的新 JSX 转换（由编译器自动注入）
import { jsx as _jsx } from "react/jsx-runtime";
_jsx(
    type: string | React.ComponentType,
    props: object  // children 合并到 props 中
): React.ReactElement;
```

| 参数 | 类型 | 是否必填 | 说明 |
|------|------|----------|------|
| type | string \| ComponentType | 是 | HTML 标签名或组件引用 |
| props | object \| null | 是 | 属性对象，包含所有 JSX 属性 |
| children | ReactNode[] | 否 | 子元素（经典转换中作为剩余参数） |

**返回值：** `React.ReactElement` 对象，描述了要渲染的 UI 结构。

### 基本示例

```jsx
// 示例说明：展示 JSX 与编译后代码的对应关系

// JSX 写法
const element = (
    <div className="container">
        <h1 id="title">Hello</h1>
        <p>这是一段文字</p>
    </div>
);

// React 17 之前编译结果（经典转换）
const element = React.createElement(
    "div",                              // type：HTML 标签名
    { className: "container" },         // props：属性对象
    React.createElement(                // 第一个子元素
        "h1",
        { id: "title" },
        "Hello"
    ),
    React.createElement(                // 第二个子元素
        "p",
        null,                           // 没有属性时为 null
        "这是一段文字"
    )
);

// React 17+ 编译结果（新 JSX 转换）
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";

const element = _jsxs("div", {
    className: "container",
    children: [                         // children 作为 props 的属性
        _jsx("h1", {
            id: "title",
            children: "Hello"
        }),
        _jsx("p", {
            children: "这是一段文字"
        })
    ]
});
```

**运行效果：** 两种编译方式生成的 ReactElement 对象结构完全相同，最终渲染结果一致。

### 内部原理

#### ReactElement 对象结构

JSX 编译后生成的 ReactElement 是一个普通的 JavaScript 对象，描述了 UI 的结构。React 在渲染阶段读取这个对象来构建真实 DOM。

```javascript
// ReactElement 的内部结构
const element = {
    $$typeof: Symbol.for("react.element"),  // 标识这是 React 元素（防 XSS）
    type: "div",                            // 元素类型
    key: null,                              // 用于 Diff 算法的 key
    ref: null,                              // ref 引用
    props: {                                // 所有属性和子元素
        className: "container",
        children: [
            { $$typeof: Symbol.for("react.element"), type: "h1", ... },
            { $$typeof: Symbol.for("react.element"), type: "p", ... }
        ]
    },
    _owner: null                            // 创建该元素的组件（开发模式用）
};
```

#### $$typeof 的安全作用

`$$typeof` 使用 Symbol 值，是为了防止 XSS 攻击。如果攻击者通过 JSON 注入一个看似 ReactElement 的对象，由于 JSON 不支持 Symbol，这个对象的 `$$typeof` 不会是正确的 Symbol，React 会拒绝渲染它。

#### 新旧 JSX 转换的区别

React 17 的新 JSX 转换（jsx-runtime）做了几个改变：编译器自动从 `react/jsx-runtime` 导入 `_jsx` 函数，不再需要手动 `import React`；children 从独立参数变成了 props 的属性；单个子元素用 `jsx`，多个子元素用 `jsxs`（便于内部优化）。

### 进阶用法

```jsx
// 进阶场景：动态创建元素和条件渲染的编译结果

// 组件作为 type
function Welcome({ name }) {
    return <h1>Hello, {name}</h1>;
}

const app = <Welcome name="张三" />;
// 编译为：_jsx(Welcome, { name: "张三" })
// type 是组件函数引用，不是字符串

// 条件渲染
const content = (
    <div>
        {isLoggedIn ? <Welcome name={user.name} /> : <LoginButton />}
    </div>
);
// 三元表达式直接保留在编译结果中
// _jsx("div", {
//     children: isLoggedIn
//         ? _jsx(Welcome, { name: user.name })
//         : _jsx(LoginButton, {})
// })

// 列表渲染
const list = (
    <ul>
        {items.map(item => (
            <li key={item.id}>{item.name}</li>
        ))}
    </ul>
);
// key 从 props 中提取出来，放到 ReactElement 的顶层 key 属性
```

### 与相关API的对比

| 对比维度 | 经典转换 (React.createElement) | 新 JSX 转换 (jsx-runtime) |
|----------|-------------------------------|--------------------------|
| React 版本 | 所有版本 | React 17+ |
| 是否需要 import React | 必须 | 不需要 |
| children 传递方式 | 作为剩余参数 | 作为 props.children |
| 编译配置 | `"jsx": "react"` | `"jsx": "react-jsx"` |
| 性能 | 标准 | 略微优化（减少参数传递） |

### 适用场景

- **日常组件开发：** JSX 是 React 组件的标准写法
- **动态组件创建：** 需要根据变量决定组件类型时，可以直接用 createElement
- **不支持 JSX 的环境：** 在不经过编译的脚本中，直接调用 createElement

### 常见问题

#### JSX 中组件名必须大写开头

**问题描述：** 小写开头的标签被当作 HTML 原生元素处理。

**原因分析：** JSX 编译器通过首字母大小写区分原生 HTML 标签和自定义组件。小写开头编译为字符串（`"div"`），大写开头编译为变量引用（`MyComponent`）。

**解决方案：**

```jsx
// 错误写法：小写开头被当作 HTML 标签
// function myComponent() { return <div>Hello</div>; }
// <myComponent />  →  createElement("myComponent", null) → 浏览器不认识

// 正确写法：组件名大写开头
function MyComponent() { return <div>Hello</div>; }
<MyComponent />  // → createElement(MyComponent, null) → 正确调用组件函数
```

#### JSX 表达式必须有一个根元素

**问题描述：** JSX 返回多个并列元素时报错。

**原因分析：** JSX 编译为单个 createElement 调用，必须有一个根元素。多个并列元素可以用 Fragment 包裹。

**解决方案：**

```jsx
// 错误写法
// return (
//     <h1>标题</h1>
//     <p>段落</p>
// );

// 正确写法：用 Fragment 包裹
return (
    <>
        <h1>标题</h1>
        <p>段落</p>
    </>
);
```

### 注意事项

- JSX 中的 `class` 要写成 `className`，`for` 要写成 `htmlFor`
- JSX 中的属性名使用 camelCase（如 `onClick`、`tabIndex`）
- JSX 中的布尔属性 `<input disabled />` 等价于 `<input disabled={true} />`
- React 17+ 项目的 tsconfig.json 应设置 `"jsx": "react-jsx"`
- JSX 中不能使用 if/for 语句，但可以使用三元表达式和 map

### 总结

JSX 是 React 的语法糖，编译后变成 createElement 或 _jsx 函数调用，生成描述 UI 结构的 ReactElement 对象。React 17 引入的新 JSX 转换不再需要手动导入 React。ReactElement 的 $$typeof 使用 Symbol 防止 XSS 注入。组件名必须大写开头，JSX 表达式必须有单一根元素。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## JSX的JavaScript表达式嵌入{}

### 概念说明

在 JSX 中，花括号 `{}` 是嵌入 JavaScript 表达式的语法。花括号内可以放入任何有效的 JavaScript 表达式，表达式的求值结果会被渲染到对应位置。这是 JSX 实现动态内容的核心机制。

需要注意的是，花括号内只能放**表达式**（有返回值的代码），不能放**语句**（如 if、for、switch）。表达式包括变量引用、函数调用、三元运算、逻辑运算、数组 map 等。

### 基本示例

```jsx
// 示例说明：展示各种表达式嵌入方式

import React from "react";

function ExpressionDemo() {
    const name = "张三";
    const age = 25;
    const isVip = true;
    const skills = ["React", "TypeScript", "Node.js"];

    return (
        <div>
            {/* 变量引用 */}
            <h1>用户: {name}</h1>

            {/* 算术表达式 */}
            <p>出生年份: {2025 - age}</p>

            {/* 函数调用 */}
            <p>大写名字: {name.toUpperCase()}</p>

            {/* 三元表达式（条件渲染） */}
            <p>身份: {isVip ? "VIP 会员" : "普通用户"}</p>

            {/* 逻辑与短路（条件渲染） */}
            {isVip && <span>VIP 专属标识</span>}

            {/* 数组 map（列表渲染） */}
            <ul>
                {skills.map((skill, index) => (
                    <li key={index}>{skill}</li>
                ))}
            </ul>

            {/* 模板字符串 */}
            <p>{`${name} 今年 ${age} 岁`}</p>

            {/* 对象属性访问 */}
            <p>技能数量: {skills.length}</p>
        </div>
    );
}

export default ExpressionDemo;
```

**运行效果：** 页面显示用户信息、计算结果、条件内容和技能列表，所有动态内容通过花括号表达式渲染。

### 内部原理

#### 表达式求值时机

花括号内的表达式在组件每次渲染时都会重新求值。JSX 编译后，表达式的结果直接成为 createElement/jsx 函数调用的参数值。

```javascript
// JSX
<p>年龄: {age}</p>

// 编译后：age 变量的值直接作为 children
_jsx("p", { children: ["年龄: ", age] });
// 每次渲染时，age 的当前值被传入
```

#### 可渲染的值类型

React 对花括号中表达式的返回值有明确的渲染规则：string 和 number 正常渲染为文本；boolean、null、undefined 不渲染任何内容（这是条件渲染的基础）；数组会展开渲染每个元素；对象不能直接渲染（会报错）。

### 与相关API的对比

| 表达式类型 | 渲染结果 | 示例 |
|-----------|---------|------|
| string | 文本 | `{"hello"}` → hello |
| number | 数字文本 | `{42}` → 42 |
| boolean | 不渲染 | `{true}` → 空 |
| null / undefined | 不渲染 | `{null}` → 空 |
| 数组 | 展开渲染 | `{[1,2,3]}` → 123 |
| 对象 | 报错 | `&lbrace;&lbrace;a:1&rbrace;&rbrace;` → Error |
| ReactElement | 渲染组件 | `{<Child />}` → 子组件 |

### 适用场景

- **动态文本：** 显示变量值、计算结果
- **条件渲染：** 三元表达式或逻辑与短路控制显示
- **列表渲染：** 数组 map 生成元素列表
- **属性动态绑定：** `<img src={imageUrl} />`

### 常见问题

#### 0 被意外渲染

**问题描述：** `{count && <Component />}` 当 count 为 0 时，页面上显示了 "0"。

**原因分析：** `0 && <Component />` 的结果是 `0`（number 类型），React 会将 number 渲染为文本。

**解决方案：**

```jsx
// 错误写法：count 为 0 时显示 "0"
{count && <ItemList />}

// 正确写法：转为布尔值
{count > 0 && <ItemList />}
// 或
{!!count && <ItemList />}
// 或用三元
{count ? <ItemList /> : null}
```

#### 对象不能直接渲染

**问题描述：** `Objects are not valid as a React child` 报错。

**原因分析：** 花括号中放入了普通对象，React 不知道如何将对象转为可渲染内容。

**解决方案：**

```jsx
const user = { name: "张三", age: 25 };

// 错误写法
// <p>{user}</p>  // 报错

// 正确写法：访问对象的具体属性
<p>{user.name}</p>

// 或转为 JSON 字符串（调试用）
<pre>{JSON.stringify(user, null, 2)}</pre>
```

### 注意事项

- 花括号内只能放表达式，不能放 if/for/switch 等语句
- boolean、null、undefined 不渲染，这是条件渲染的基础
- 数字 0 会被渲染为文本 "0"，注意 `&&` 短路的陷阱
- 对象不能直接渲染，需要访问具体属性或转为字符串
- 花括号可以用在 JSX 的内容位置和属性值位置
- 注释在 JSX 中用 `{/* 注释 */}` 语法

### 总结

花括号 `{}` 是 JSX 中嵌入 JavaScript 表达式的语法，支持变量、函数调用、三元运算、数组 map 等表达式。表达式在每次渲染时重新求值。boolean/null/undefined 不渲染（条件渲染的基础），对象不能直接渲染。注意数字 0 在 `&&` 短路中会被意外渲染。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## JSX的属性展开运算符{...props}

### 概念说明

JSX 支持使用展开运算符 `{...obj}` 将一个对象的所有属性一次性传递给组件或 HTML 元素。这种写法在高阶组件（HOC）、组件封装和属性透传场景中非常常见。展开运算符在编译后变成 Object.assign 或对象展开语法，将对象的每个键值对展开为独立的 props。

### 基本示例

```jsx
// 示例说明：展示属性展开的基本用法

import React from "react";

// 基本展开：将对象属性传递给组件
function UserCard({ name, age, email }) {
    return (
        <div>
            <h2>{name}</h2>
            <p>年龄: {age}</p>
            <p>邮箱: {email}</p>
        </div>
    );
}

function App() {
    const userProps = {
        name: "张三",
        age: 25,
        email: "zhangsan@example.com"
    };

    // 展开传递：等价于 name="张三" age={25} email="zhangsan@example.com"
    return <UserCard {...userProps} />;
}

// 展开与显式属性混合使用
function App2() {
    const baseProps = { name: "张三", age: 25 };

    // 显式属性会覆盖展开的同名属性
    return <UserCard {...baseProps} age={30} email="new@example.com" />;
    // 最终：name="张三" age={30} email="new@example.com"
}

export default App;
```

**运行效果：** UserCard 组件接收到完整的 props 并正常渲染用户信息。

### 内部原理

#### 编译结果

```javascript
// JSX
<UserCard {...userProps} age={30} />

// 编译为（新 JSX 转换）
_jsx(UserCard, {
    ...userProps,    // 对象展开
    age: 30          // 后面的属性覆盖前面的同名属性
});

// 等价于
_jsx(UserCard, Object.assign({}, userProps, { age: 30 }));
```

#### 属性覆盖规则

展开运算符遵循 JavaScript 的对象展开规则：后出现的同名属性覆盖先出现的。`{...props, age: 30}` 中，如果 props 中也有 age 属性，最终 age 的值是 30。

### 进阶用法

```jsx
// 进阶场景：属性透传和剩余属性收集

// 包装组件：透传所有属性给内部元素
function CustomButton({ variant, children, ...rest }) {
    // variant 和 children 被提取出来
    // 其余所有属性通过 rest 透传给 button
    const className = variant === "primary" ? "btn-primary" : "btn-default";

    return (
        <button className={className} {...rest}>
            {children}
        </button>
    );
}

// 使用时：onClick、disabled 等属性自动透传给内部 button
<CustomButton variant="primary" onClick={handleClick} disabled={isLoading}>
    提交
</CustomButton>
```

### 适用场景

- **组件封装：** 包装组件透传属性给内部元素
- **高阶组件：** HOC 将接收的 props 透传给被包装组件
- **动态属性：** 根据条件动态构建属性对象
- **表单组件：** 透传 onChange、value 等原生表单属性

### 常见问题

#### 展开传递了不必要的属性到 DOM

**问题描述：** React 警告 "Unknown prop `xxx` on `<div>` tag"。

**原因分析：** 展开运算符把所有属性都传给了 HTML 元素，包括自定义的非 DOM 属性。

**解决方案：**

```jsx
// 错误写法：customProp 传递到了 div 上
function Card({ customProp, ...rest }) {
    return <div {...rest} />;  // customProp 已被解构出去，不会传到 div
}

// 如果不小心透传了所有属性
// <div {...allProps} />  // 可能包含非 DOM 属性

// 正确写法：先解构出自定义属性，再展开剩余属性
function Card({ variant, onCustomEvent, ...htmlProps }) {
    return <div {...htmlProps} />;  // 只传递合法的 HTML 属性
}
```

### 注意事项

- 展开运算符会传递所有属性，包括不需要的属性
- 后面的属性覆盖前面的同名属性
- 透传给 HTML 元素时要过滤掉自定义属性
- 展开运算符是浅拷贝，嵌套对象仍然是引用
- 过度使用展开会让组件的 props 来源不清晰，影响可读性

### 总结

JSX 的展开运算符 `{...props}` 将对象属性一次性传递给组件，常用于组件封装和属性透传。编译后等价于对象展开或 Object.assign。使用时注意后面的属性覆盖前面的同名属性，透传给 HTML 元素时要先解构出自定义属性避免 DOM 警告。过度使用会降低代码可读性。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## JSX的子元素与children

### 概念说明

在 JSX 中，开标签和闭标签之间的内容会被自动收集为 `props.children`。children 可以是字符串、数字、JSX 元素、数组、函数或这些类型的混合。children 是 React 组件组合模式的基础，让父组件可以灵活地控制子组件的内容插入。

React 对 children 的处理有特殊逻辑：单个子元素时 children 是该元素本身，多个子元素时 children 是数组。字符串中的换行和多余空格会被压缩。

### 基本示例

```jsx
// 示例说明：展示 children 的各种形式

import React from "react";

// 接收 children 的容器组件
function Card({ title, children }) {
    return (
        <div className="card">
            <h2>{title}</h2>
            <div className="card-body">
                {children}
            </div>
        </div>
    );
}

function App() {
    return (
        <div>
            {/* 字符串 children */}
            <Card title="问候">Hello World</Card>

            {/* JSX 元素 children */}
            <Card title="用户信息">
                <p>姓名: 张三</p>
                <p>年龄: 25</p>
            </Card>

            {/* 混合 children：文本 + 元素 */}
            <Card title="混合">
                欢迎使用
                <strong>React</strong>
                框架
            </Card>

            {/* 表达式 children */}
            <Card title="列表">
                {["苹果", "香蕉", "橘子"].map((fruit, i) => (
                    <p key={i}>{fruit}</p>
                ))}
            </Card>
        </div>
    );
}

export default App;
```

**运行效果：** 四个 Card 组件分别渲染了字符串、多个段落、混合内容和列表内容。

### 内部原理

#### children 的传递机制

```javascript
// JSX
<Card title="问候">Hello World</Card>

// 编译后（新 JSX 转换）
_jsx(Card, {
    title: "问候",
    children: "Hello World"  // 单个字符串直接作为 children
});

// 多个子元素
<Card title="信息">
    <p>第一行</p>
    <p>第二行</p>
</Card>

// 编译后
_jsxs(Card, {
    title: "信息",
    children: [              // 多个子元素变成数组
        _jsx("p", { children: "第一行" }),
        _jsx("p", { children: "第二行" })
    ]
});
```

#### children 的类型不固定

单个子元素时 children 是该元素本身（字符串、ReactElement 等），多个子元素时 children 是数组。这就是为什么直接操作 children 时推荐使用 `React.Children` 工具方法，它能统一处理这两种情况。

### 适用场景

- **布局组件：** Card、Modal、Layout 等容器组件
- **组合模式：** 父组件控制布局，子内容由调用方决定
- **插槽模式：** 通过具名 props（如 header、footer）传递多个内容区域
- **Render Props：** children 作为函数实现渲染委托

### 常见问题

#### children 类型不确定导致的问题

**问题描述：** 对 children 调用数组方法（如 map）时，单个子元素会报错。

**原因分析：** 单个子元素时 children 不是数组，调用 `.map()` 会失败。

**解决方案：**

```jsx
// 错误写法：单个 children 不是数组
function List({ children }) {
    // 当只有一个子元素时，children 不是数组，.map 报错
    // return children.map((child, i) => <div key={i}>{child}</div>);
    return null;
}

// 正确写法：使用 React.Children.map
function List({ children }) {
    return React.Children.map(children, (child, i) => (
        <div key={i}>{child}</div>
    ));
}

// 或转为数组
function List({ children }) {
    const childArray = React.Children.toArray(children);
    return childArray.map((child, i) => <div key={i}>{child}</div>);
}
```

### 注意事项

- 单个子元素时 children 不是数组，多个才是数组
- 操作 children 时使用 React.Children 工具方法更安全
- 布尔值、null、undefined 作为 children 不渲染
- JSX 中的空行和缩进空格会被压缩
- children 和其他 props 一样是只读的，不应该修改

### 总结

children 是 JSX 标签之间内容的自动收集机制，作为 props.children 传递给组件。单个子元素时 children 是该元素本身，多个时是数组。操作 children 推荐用 React.Children 工具方法。children 是 React 组件组合模式的基础，让容器组件可以灵活地接收和渲染任意内容。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## JSX的布尔属性与默认值

### 概念说明

在 JSX 中，布尔属性（如 disabled、checked、readOnly）可以省略值，只写属性名时默认为 `true`。这和 HTML 的布尔属性行为一致。同时，JSX 支持通过条件表达式动态设置属性值，实现属性的有条件传递。

### 基本示例

```jsx
// 示例说明：展示布尔属性的各种写法

import React from "react";

function FormDemo() {
    const isSubmitting = true;

    return (
        <form>
            {/* 布尔属性省略值，等价于 disabled={true} */}
            <input type="text" disabled />

            {/* 显式传递布尔值 */}
            <input type="text" disabled={true} />
            <input type="text" disabled={false} />

            {/* 动态布尔属性 */}
            <button disabled={isSubmitting}>
                {isSubmitting ? "提交中..." : "提交"}
            </button>

            {/* 多个布尔属性 */}
            <input
                type="checkbox"
                checked
                readOnly
            />

            {/* 条件性传递属性：属性值为 undefined 时等于不传该属性 */}
            <input
                type="text"
                placeholder="请输入"
                disabled={isSubmitting ? true : undefined}
            />
        </form>
    );
}

export default FormDemo;
```

**运行效果：** 表单中部分输入框被禁用，按钮根据提交状态动态切换禁用和文案。

### 内部原理

#### 布尔属性的编译

```javascript
// JSX
<input disabled />

// 编译后：省略值等于 true
_jsx("input", { disabled: true });

// JSX
<input disabled={false} />

// 编译后：false 时 React 不会将该属性渲染到 DOM
_jsx("input", { disabled: false });
// 实际 DOM 上不会出现 disabled 属性
```

#### undefined 和 false 的区别

属性值为 `undefined` 时，React 不传递该属性（等于没写）。属性值为 `false` 时，对于 HTML 布尔属性（如 disabled），React 会从 DOM 上移除该属性；对于非布尔属性（如 className），`false` 会被转为字符串 "false"。

### 适用场景

- **表单控件：** disabled、checked、readOnly 等状态控制
- **ARIA 属性：** aria-hidden、aria-expanded 等无障碍属性
- **条件属性：** 根据状态动态决定是否传递某个属性

### 常见问题

#### 字符串 "false" 被当作 true

**问题描述：** `<input disabled="false" />` 仍然是禁用状态。

**原因分析：** HTML 布尔属性只要存在就生效，和值无关。字符串 "false" 不等于布尔值 false。

**解决方案：**

```jsx
// 错误写法：字符串 "false" 仍然禁用
// <input disabled="false" />

// 正确写法：用布尔值
<input disabled={false} />
// 或不传该属性
<input />
```

### 注意事项

- 省略属性值等于传递 `true`
- `disabled={false}` 会从 DOM 上移除 disabled 属性
- 属性值为 `undefined` 等于不传递该属性
- 不要用字符串 "true"/"false" 作为布尔属性值
- 自定义组件的 props 没有布尔属性的特殊处理，需要自己处理默认值

### 总结

JSX 布尔属性省略值时默认为 true，和 HTML 行为一致。false 和 undefined 都会导致属性不出现在 DOM 上。动态布尔属性通过条件表达式控制。注意不要用字符串 "false" 代替布尔值 false。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Fragment的短语法<></>

### 概念说明

`<></>` 是 React Fragment 的简写语法，允许组件返回多个并列元素而不需要额外的 DOM 包裹节点。Fragment 不会在真实 DOM 中产生任何元素，仅起到分组作用。

React 16.2 引入了 Fragment 和其短语法。在此之前，组件的 render 方法必须返回单个根元素，常常需要多包一层无意义的 `<div>`，导致 DOM 层级增加和 CSS 布局问题。

### 基本示例

```jsx
// 示例说明：使用 Fragment 短语法返回多个并列元素

import React from "react";

// 没有 Fragment 时：需要多余的 div 包裹
function TableRowOld() {
    return (
        <div>  {/* 多余的 div 破坏了 table 结构 */}
            <td>姓名</td>
            <td>年龄</td>
        </div>
    );
}

// 使用 Fragment 短语法：没有多余的 DOM 节点
function TableRow() {
    return (
        <>
            <td>张三</td>
            <td>25</td>
        </>
    );
}

function Table() {
    return (
        <table>
            <tbody>
                <tr>
                    <TableRow />  {/* DOM 中直接是 td，没有多余包裹 */}
                </tr>
            </tbody>
        </table>
    );
}

export default Table;
```

**运行效果：** 表格正确渲染，DOM 中 tr 直接包含 td 元素，没有多余的包裹节点。

### 内部原理

#### Fragment 的编译

```javascript
// JSX 短语法
<>
    <p>第一段</p>
    <p>第二段</p>
</>

// 编译后
_jsxs(Fragment, {
    children: [
        _jsx("p", { children: "第一段" }),
        _jsx("p", { children: "第二段" })
    ]
});
// Fragment 是 React.Fragment 的引用
// 渲染时 React 跳过 Fragment 节点，直接渲染其 children
```

#### Fragment 在 Fiber 树中的表现

Fragment 在 Fiber 树中仍然存在一个 Fiber 节点（tag 为 Fragment），但在 Commit 阶段提交到真实 DOM 时，React 跳过 Fragment 节点，直接将其子节点挂载到父 DOM 元素上。

### 适用场景

- **表格组件：** tr 下只能直接包含 td/th，不能插入 div
- **列表组件：** dl 下的 dt/dd 分组
- **Flex/Grid 布局：** 避免多余 div 破坏布局结构
- **组件返回多个元素：** 不需要额外包裹节点的任何场景

### 常见问题

#### 短语法不支持 key 属性

**问题描述：** 在列表渲染中使用 `<>` 无法添加 key。

**原因分析：** 短语法 `<></>` 不接受任何属性，包括 key。需要 key 时必须使用显式的 `<React.Fragment key={...}>`。

**解决方案：**

```jsx
// 错误写法：短语法不能传 key
// {items.map(item => (
//     <key={item.id}>  // 语法错误
//         <dt>{item.term}</dt>
//         <dd>{item.desc}</dd>
//     </>
// ))}

// 正确写法：使用显式 Fragment
{items.map(item => (
    <React.Fragment key={item.id}>
        <dt>{item.term}</dt>
        <dd>{item.desc}</dd>
    </React.Fragment>
))}
```

### 注意事项

- `<></>` 不接受任何属性（包括 key）
- 需要 key 时使用 `<React.Fragment key={...}>`
- Fragment 不产生 DOM 节点
- Fragment 在 Fiber 树中仍然占有节点
- 不要为了避免 Fragment 而用数组返回（数组方式需要手动给每个元素加 key）

### 总结

Fragment 短语法 `<></>` 让组件返回多个并列元素而不增加 DOM 层级。编译后使用 React.Fragment 组件，渲染时跳过 Fragment 直接挂载子节点。短语法不支持 key 属性，需要 key 时使用显式 `<React.Fragment>`。常用于表格、列表和布局组件中避免多余的 DOM 包裹。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Fragment的显式React.Fragment与key

### 概念说明

`<React.Fragment>` 是 Fragment 的显式写法，和短语法 `<></>` 功能相同，但支持传递 `key` 属性。在列表渲染中，当每个迭代项需要返回多个并列元素时，必须使用显式 Fragment 并传递 key，因为短语法不接受任何属性。

key 是 React Diff 算法识别列表元素身份的依据。即使是 Fragment 这种不产生 DOM 的节点，在列表中也需要 key 来帮助 React 正确地复用和更新子树。

### API 签名与参数

```typescript
// 显式 Fragment 用法
<React.Fragment key={uniqueKey}>
    {children}
</React.Fragment>
```

| 参数 | 类型 | 是否必填 | 说明 |
|------|------|----------|------|
| key | string \| number | 列表中必填 | 唯一标识符，用于 Diff 算法 |
| children | ReactNode | 否 | 子元素 |

### 基本示例

```jsx
// 示例说明：在列表渲染中使用显式 Fragment 传递 key

import React from "react";

// 定义列表：每一项需要渲染 dt 和 dd 两个并列元素
const glossary = [
    { id: 1, term: "JSX", desc: "JavaScript 的语法扩展" },
    { id: 2, term: "Props", desc: "组件的输入参数" },
    { id: 3, term: "State", desc: "组件的内部状态" },
];

function Glossary() {
    return (
        <dl>
            {glossary.map(item => (
                // 显式 Fragment：支持 key 属性
                <React.Fragment key={item.id}>
                    <dt>{item.term}</dt>
                    <dd>{item.desc}</dd>
                </React.Fragment>
            ))}
        </dl>
    );
}

export default Glossary;
```

**运行效果：** 定义列表正确渲染，DOM 中 dl 直接包含 dt 和 dd 元素，没有多余的包裹节点。每组 dt/dd 通过 Fragment 的 key 正确关联。

### 内部原理

#### Fragment key 在 Diff 中的作用

```javascript
// Fragment 在 Fiber 树中的表现
// 第一次渲染
Fragment (key="1") → dt("JSX") + dd("JavaScript 的语法扩展")
Fragment (key="2") → dt("Props") + dd("组件的输入参数")
Fragment (key="3") → dt("State") + dd("组件的内部状态")

// 列表顺序变化后，React 通过 key 匹配 Fragment
// 找到 key 相同的 Fragment 后，对其 children 做最小化更新
// 没有 key 的话 React 只能按索引对比，导致不必要的 DOM 操作
```

### 与相关API的对比

| 对比维度 | 短语法 `<></>` | 显式 `<React.Fragment>` |
|----------|---------------|------------------------|
| key 属性 | 不支持 | 支持 |
| 其他属性 | 不支持 | 只支持 key |
| 语法简洁度 | 更简洁 | 稍冗长 |
| 适用场景 | 非列表场景 | 列表中返回多个并列元素 |

### 适用场景

- **列表渲染返回多个元素：** map 中每项需要返回多个并列元素
- **定义列表 dl/dt/dd：** dt 和 dd 必须并列在 dl 下
- **表格行组：** 多个 tr 组成逻辑分组
- **任何需要 key 的 Fragment 场景**

### 常见问题

#### Fragment 只支持 key，不支持其他属性

**问题描述：** 想给 Fragment 添加 className 或事件处理。

**原因分析：** Fragment 不产生 DOM 节点，无法承载 DOM 属性。它只是一个分组标记。

**解决方案：**

```jsx
// 错误写法：Fragment 不支持 className
// <React.Fragment className="group">...</React.Fragment>

// 正确写法：需要属性就用 div 等实际 DOM 元素
<div className="group">
    <dt>{item.term}</dt>
    <dd>{item.desc}</dd>
</div>
```

### 注意事项

- Fragment 只接受 key 属性，不接受其他任何属性
- 列表渲染中必须给 Fragment 传 key
- 不需要 key 时优先使用短语法 `<></>`
- Fragment 不产生 DOM 节点，不能承载样式和事件
- 可以用 `import { Fragment } from "react"` 简化写法

### 总结

显式 `<React.Fragment>` 和短语法功能相同但支持 key 属性。在列表渲染中每项返回多个并列元素时必须使用显式 Fragment 传递 key。Fragment 只接受 key，不支持其他属性。不需要 key 的场景优先用短语法 `<></>`。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 函数组件的声明与Props接收

### 概念说明

函数组件是 React 中定义组件的主流方式。它是一个普通的 JavaScript 函数，接收 `props` 对象作为参数，返回 JSX（ReactElement）描述要渲染的 UI。自从 React 16.8 引入 Hooks 后，函数组件可以拥有状态和副作用，完全替代了类组件。

函数组件的命名必须以大写字母开头，这样 JSX 编译器才能将其识别为自定义组件而非 HTML 标签。

### API 签名与参数

```typescript
// 函数组件的 TypeScript 类型签名
type FC<P = {}> = (props: P) => React.ReactElement | null;

// 实际声明方式（推荐直接标注 props 类型）
function ComponentName(props: PropsType): JSX.Element {
    return <div>...</div>;
}
```

| 参数 | 类型 | 是否必填 | 说明 |
|------|------|----------|------|
| props | object | 是（自动传入） | 包含所有传递给组件的属性和 children |

**返回值：** `React.ReactElement | null`，返回 JSX 元素或 null（不渲染任何内容）。

### 基本示例

```tsx
// 示例说明：展示函数组件的多种声明方式和 Props 接收

import React from "react";

// 定义 Props 类型
interface UserCardProps {
    name: string;
    age: number;
    email?: string;       // 可选属性
}

// 方式1：函数声明（推荐）
function UserCard(props: UserCardProps) {
    return (
        <div className="user-card">
            <h2>{props.name}</h2>
            <p>年龄: {props.age}</p>
            {props.email && <p>邮箱: {props.email}</p>}
        </div>
    );
}

// 方式2：解构 Props（最常用）
function UserCardDestructured({ name, age, email }: UserCardProps) {
    return (
        <div className="user-card">
            <h2>{name}</h2>
            <p>年龄: {age}</p>
            {email && <p>邮箱: {email}</p>}
        </div>
    );
}

// 方式3：箭头函数
const UserCardArrow = ({ name, age, email }: UserCardProps) => {
    return (
        <div className="user-card">
            <h2>{name}</h2>
            <p>年龄: {age}</p>
            {email && <p>邮箱: {email}</p>}
        </div>
    );
};

// 使用组件
function App() {
    return (
        <div>
            <UserCard name="张三" age={25} email="z@example.com" />
            <UserCardDestructured name="李四" age={30} />
        </div>
    );
}

export default App;
```

**运行效果：** 页面渲染两张用户卡片，包含姓名、年龄和可选的邮箱信息。

### 内部原理

#### 函数组件的调用过程

React 在渲染函数组件时，直接调用该函数并传入 props 对象。函数返回的 ReactElement 被用于构建 Fiber 树。每次组件需要更新时，函数会被重新调用，生成新的 ReactElement 与旧的做 Diff 对比。

```javascript
// React 内部简化流程
function renderFunctionComponent(Component, props) {
    // 1. 直接调用函数组件
    const element = Component(props);
    // 2. 用返回的 element 构建/更新 Fiber 子树
    reconcileChildren(currentFiber, element);
}
```

#### Props 是只读的

React 不会对 props 做深冻结，但在概念上 props 是不可变的。组件不应该修改自己的 props，这是单向数据流的基础。修改 props 会导致不可预测的行为。

### 与相关API的对比

| 对比维度 | 函数组件 | 类组件 |
|----------|---------|--------|
| 语法 | 普通函数 | class extends Component |
| 状态管理 | Hooks (useState) | this.state |
| 生命周期 | useEffect | componentDidMount 等 |
| this 绑定 | 无 this 问题 | 需要绑定 this |
| 代码量 | 更少 | 更多 |
| 官方推荐 | 推荐 | 仅维护旧代码 |

### 适用场景

- **所有新组件：** React 官方推荐函数组件 + Hooks
- **UI 展示组件：** 纯展示型组件
- **容器组件：** 配合 Hooks 管理状态和副作用
- **高阶组件替代：** 自定义 Hook 替代 HOC

### 常见问题

#### React.FC 还推荐使用吗

**问题描述：** 是否应该用 `React.FC<Props>` 声明组件。

**原因分析：** `React.FC` 会隐式包含 children 属性（React 18 已修复），且对泛型组件支持不好。

**解决方案：**

```tsx
// 不推荐：React.FC
const MyComponent: React.FC<Props> = (props) => { ... };

// 推荐：直接标注 props 类型
function MyComponent(props: Props) { ... }
// 或
function MyComponent({ name, age }: Props) { ... }
```

### 注意事项

- 组件名必须大写开头
- 函数组件每次渲染都会重新执行整个函数体
- Props 是只读的，不应该在组件内修改
- 推荐直接标注 props 类型，而非使用 React.FC
- 函数组件不能返回 undefined（会报错），可以返回 null

### 总结

函数组件是 React 定义组件的主流方式，接收 props 返回 JSX。推荐用解构参数接收 props 并直接标注 TypeScript 类型，不推荐 React.FC。每次渲染时函数重新执行，props 是只读的。自 Hooks 引入后，函数组件完全替代了类组件。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 函数组件的默认参数与默认值

### 概念说明

函数组件的 Props 默认值有两种实现方式：JavaScript 原生的参数默认值语法和 React 的 `defaultProps` 静态属性。在现代 React 开发中，推荐使用 JavaScript 原生的解构默认值，因为它更简洁、类型推断更好，而且 `defaultProps` 在函数组件上已经被标记为即将废弃（React 18.3 警告，React 19 移除）。

### 基本示例

```tsx
// 示例说明：展示两种设置默认值的方式

import React from "react";

interface ButtonProps {
    text: string;
    variant?: "primary" | "secondary" | "danger";  // 可选属性
    size?: "small" | "medium" | "large";
    disabled?: boolean;
}

// 推荐方式：解构参数默认值
function Button({
    text,
    variant = "primary",      // 默认 "primary"
    size = "medium",           // 默认 "medium"
    disabled = false           // 默认 false
}: ButtonProps) {
    const className = `btn btn-${variant} btn-${size}`;

    return (
        <button className={className} disabled={disabled}>
            {text}
        </button>
    );
}

// 使用组件
function App() {
    return (
        <div>
            {/* 使用所有默认值 */}
            <Button text="默认按钮" />
            {/* variant="primary", size="medium", disabled=false */}

            {/* 覆盖部分默认值 */}
            <Button text="危险操作" variant="danger" size="large" />
        </div>
    );
}

export default App;
```

**运行效果：** 第一个按钮使用默认样式（primary、medium），第二个按钮使用自定义样式（danger、large）。

### 内部原理

#### 解构默认值的工作机制

JavaScript 解构默认值只在属性值为 `undefined` 时生效。传入 `null` 时不会使用默认值，因为 null 是一个有效的值。

```javascript
// 解构默认值
function Button({ size = "medium" }) {
    console.log(size);
}

Button({ size: "large" });     // "large" - 有值，不用默认
Button({ size: undefined });   // "medium" - undefined 触发默认值
Button({});                    // "medium" - 属性不存在等于 undefined
Button({ size: null });        // null - null 不触发默认值
```

### 与相关API的对比

| 对比维度 | 解构默认值 | defaultProps |
|----------|-----------|-------------|
| 语法 | `{ x = 1 }: Props` | `Comp.defaultProps = { x: 1 }` |
| TypeScript 支持 | 完美推断 | 类型推断较弱 |
| React 19 支持 | 支持 | 函数组件已移除 |
| 官方推荐 | 推荐 | 不推荐 |
| null 处理 | null 不触发默认值 | null 不触发默认值 |

### 适用场景

- **可选配置：** 组件的样式、尺寸、变体等可选配置项
- **行为开关：** disabled、loading 等布尔型开关属性
- **回调函数：** 提供空函数作为默认回调

### 常见问题

#### 对象或数组作为默认值导致重复创建

**问题描述：** 每次渲染都创建新的默认对象/数组，可能导致子组件不必要的重渲染。

**原因分析：** 解构默认值在每次函数调用时都执行，`{ style = {} }` 每次渲染都创建一个新的空对象。

**解决方案：**

```tsx
// 问题写法：每次渲染创建新对象
function Card({ style = {}, items = [] }: Props) {
    // style 和 items 每次渲染都是新引用
    return <div style={style}>...</div>;
}

// 正确写法：将默认值提取为模块级常量
const DEFAULT_STYLE = {};
const DEFAULT_ITEMS: string[] = [];

function Card({ style = DEFAULT_STYLE, items = DEFAULT_ITEMS }: Props) {
    // 默认值引用稳定，不会触发不必要的重渲染
    return <div style={style}>...</div>;
}
```

### 注意事项

- React 19 已移除函数组件的 defaultProps 支持
- 使用解构默认值代替 defaultProps
- undefined 触发默认值，null 不触发
- 对象/数组默认值提取为模块级常量，避免每次渲染创建新引用
- 默认值在 TypeScript 中不影响类型（仍需在 interface 中标记为可选）

### 总结

函数组件推荐用 JavaScript 解构默认值设置 Props 默认值，defaultProps 已在 React 19 中移除。默认值只在 undefined 时生效，null 不触发。对象/数组默认值应提取为模块级常量保持引用稳定。TypeScript 中可选属性用 `?` 标记。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 函数组件的返回值类型约束

### 概念说明

函数组件的返回值必须是 React 可以渲染的类型（ReactNode）。在 TypeScript 中，函数组件的返回类型通常标注为 `JSX.Element`、`React.ReactElement` 或 `React.ReactNode`。React 19 将函数组件的返回类型更新为 `React.ReactNode`，允许返回字符串、数字、布尔值、null、undefined、Fragment 和数组等。

### API 签名与参数

```typescript
// React 18 及之前：返回 ReactElement | null
function Component(props: Props): React.ReactElement | null;

// React 19：返回 ReactNode（更宽泛）
function Component(props: Props): React.ReactNode;

// ReactNode 的定义
type ReactNode =
    | ReactElement
    | string
    | number
    | boolean
    | null
    | undefined
    | Iterable<ReactNode>;
```

### 基本示例

```tsx
// 示例说明：展示函数组件的各种合法返回值

import React from "react";

// 返回 JSX 元素（最常见）
function NormalComponent(): JSX.Element {
    return <div>Hello</div>;
}

// 返回 null（不渲染任何内容）
function ConditionalComponent({ show }: { show: boolean }) {
    if (!show) return null;  // 合法：不渲染
    return <div>内容</div>;
}

// 返回字符串（React 16+ 支持）
function StringComponent(): React.ReactNode {
    return "纯文本内容";
}

// 返回数组（需要给每个元素加 key）
function ArrayComponent(): React.ReactNode {
    return [
        <p key="1">第一段</p>,
        <p key="2">第二段</p>,
    ];
}

// 返回 Fragment
function FragmentComponent() {
    return (
        <>
            <p>第一段</p>
            <p>第二段</p>
        </>
    );
}
```

**运行效果：** 各组件根据返回值类型正确渲染对应内容。

### 内部原理

#### React 的渲染分支

React 在渲染时根据组件返回值的类型走不同的处理分支：ReactElement 走正常的协调（Reconciliation）流程；字符串和数字创建文本节点；null/undefined/boolean 不渲染（跳过）；数组则迭代处理每个元素。

```javascript
// React 内部简化的渲染逻辑
function reconcileChildFibers(returnFiber, newChild) {
    if (typeof newChild === "object" && newChild !== null) {
        // ReactElement：创建 Fiber 节点
        return reconcileSingleElement(returnFiber, newChild);
    }
    if (typeof newChild === "string" || typeof newChild === "number") {
        // 字符串/数字：创建文本 Fiber 节点
        return reconcileSingleTextNode(returnFiber, String(newChild));
    }
    if (Array.isArray(newChild)) {
        // 数组：迭代处理每个元素
        return reconcileChildrenArray(returnFiber, newChild);
    }
    // null/undefined/boolean：删除旧节点（不渲染）
    return deleteRemainingChildren(returnFiber);
}
```

### 适用场景

- **条件渲染：** 返回 null 表示不渲染
- **纯文本组件：** 直接返回字符串
- **列表组件：** 返回元素数组
- **高阶组件：** 返回包装后的 ReactElement

### 常见问题

#### 返回 undefined 导致报错

**问题描述：** React 18 中函数组件返回 undefined 会报错。

**原因分析：** React 18 中函数组件不允许返回 undefined（类组件的 render 也不允许）。这是为了区分"忘记写 return"和"有意不渲染"。React 19 放宽了这个限制。

**解决方案：**

```tsx
// React 18 中错误写法
// function Component() {
//     // 忘记 return，隐式返回 undefined → 报错
// }

// 正确写法：明确返回 null 表示不渲染
function Component() {
    return null;  // 明确表示不渲染
}
```

### 注意事项

- React 18 中函数组件不能返回 undefined（React 19 允许）
- 返回 null 表示有意不渲染
- 返回数组时每个元素需要 key
- TypeScript 中推荐直接标注返回类型为 `JSX.Element` 或让类型推断
- 不要返回普通对象（非 ReactElement），会报错

### 总结

函数组件可以返回 JSX 元素、null、字符串、数字、数组和 Fragment。React 内部根据返回值类型走不同的渲染分支。React 18 中不能返回 undefined，React 19 放宽了限制。条件渲染时用 null 明确表示不渲染。TypeScript 中推荐让类型推断自动确定返回类型。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 类组件的extends Component

### 概念说明

类组件通过 `class MyComponent extends React.Component` 声明，继承 React.Component 基类获得组件的生命周期方法、setState 状态管理和 forceUpdate 等能力。类组件是 React 16.8 之前管理状态和副作用的唯一方式。

React 官方从 React 16.8 开始推荐函数组件 + Hooks，类组件不再是首选。但理解类组件对维护旧代码和理解 React 内部机制仍然重要。React 没有废弃类组件的计划，它们会继续得到支持。

### API 签名与参数

```typescript
// React.Component 的泛型签名
class Component<P = {}, S = {}, SS = any> {
    constructor(props: P);
    readonly props: Readonly<P>;
    state: Readonly<S>;
    setState(
        state: S | ((prevState: S, props: P) => S | null) | null,
        callback?: () => void
    ): void;
    forceUpdate(callback?: () => void): void;
    render(): React.ReactNode;
}
```

| 泛型参数 | 说明 |
|----------|------|
| P | Props 类型 |
| S | State 类型 |
| SS | getSnapshotBeforeUpdate 的返回值类型 |

### 基本示例

```tsx
// 示例说明：展示类组件的基本声明和使用

import React, { Component } from "react";

// 定义 Props 和 State 类型
interface CounterProps {
    initialCount?: number;
    step?: number;
}

interface CounterState {
    count: number;
}

// 类组件声明
class Counter extends Component<CounterProps, CounterState> {
    // 构造函数：初始化 state
    constructor(props: CounterProps) {
        super(props);  // 必须调用 super(props)
        this.state = {
            count: props.initialCount ?? 0,
        };
    }

    // 实例方法（需要绑定 this 或用箭头函数）
    increment = () => {
        const step = this.props.step ?? 1;
        this.setState(prevState => ({
            count: prevState.count + step,
        }));
    };

    decrement = () => {
        const step = this.props.step ?? 1;
        this.setState(prevState => ({
            count: prevState.count - step,
        }));
    };

    // render 方法：返回 JSX
    render() {
        return (
            <div>
                <p>计数: {this.state.count}</p>
                <button onClick={this.decrement}>-</button>
                <button onClick={this.increment}>+</button>
            </div>
        );
    }
}

export default Counter;
```

**运行效果：** 页面显示计数器，点击按钮增减计数值。

### 内部原理

#### Component 基类提供的能力

React.Component 基类在原型上定义了 `setState` 和 `forceUpdate` 方法。setState 不是直接修改 state，而是将更新任务放入更新队列，由 React 调度器统一处理。这保证了批量更新和并发安全。

```javascript
// React 源码简化
Component.prototype.setState = function(partialState, callback) {
    // 将更新入队，不立即执行
    this.updater.enqueueSetState(this, partialState, callback);
};

Component.prototype.forceUpdate = function(callback) {
    this.updater.enqueueForceUpdate(this, callback);
};
```

#### PureComponent 的区别

`React.PureComponent` 继承自 Component，区别是自动实现了 `shouldComponentUpdate`，对 props 和 state 做浅比较。如果浅比较结果相同则跳过渲染。等价于函数组件的 `React.memo`。

### 与相关API的对比

| 对比维度 | Component | PureComponent |
|----------|-----------|---------------|
| shouldComponentUpdate | 需要手动实现 | 自动浅比较 |
| 渲染优化 | 默认总是渲染 | 浅比较跳过不必要的渲染 |
| 适用场景 | 需要自定义比较逻辑 | props/state 为简单值时 |

### 适用场景

- **维护旧代码：** 已有的类组件项目
- **Error Boundaries：** 目前只有类组件可以实现（componentDidCatch）
- **getSnapshotBeforeUpdate：** 需要在 DOM 更新前获取信息的场景

### 常见问题

#### this 绑定问题

**问题描述：** 事件处理器中 this 为 undefined。

**原因分析：** 普通方法在作为回调传递时丢失了 this 上下文。

**解决方案：**

```tsx
class MyComponent extends Component {
    // 方式1：箭头函数类属性（推荐）
    handleClick = () => {
        console.log(this);  // 正确指向组件实例
    };

    // 方式2：构造函数中绑定
    constructor(props: {}) {
        super(props);
        this.handleClick2 = this.handleClick2.bind(this);
    }
    handleClick2() {
        console.log(this);
    }

    render() {
        return <button onClick={this.handleClick}>点击</button>;
    }
}
```

### 注意事项

- constructor 中必须调用 `super(props)`
- 推荐用箭头函数类属性避免 this 绑定问题
- 不要直接修改 `this.state`，必须用 `setState`
- 类组件在 React 19 中仍然支持，但不推荐新代码使用
- Error Boundaries 目前只能用类组件实现

### 总结

类组件通过继承 React.Component 获得 setState、生命周期等能力。构造函数中初始化 state，render 方法返回 JSX。推荐用箭头函数类属性避免 this 绑定问题。新代码推荐函数组件 + Hooks，类组件主要用于维护旧代码和 Error Boundaries。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 类组件的render方法

### 概念说明

`render()` 是类组件中唯一必须实现的方法，负责返回描述 UI 的 ReactElement。React 在组件挂载和每次状态/属性更新时都会调用 render 方法。render 必须是纯函数——相同的 props 和 state 应该返回相同的结果，不能在 render 中执行副作用（如修改 state、发起网络请求、操作 DOM）。

### 基本示例

```tsx
// 示例说明：render 方法的各种返回值

import React, { Component } from "react";

interface Props {
    isLoggedIn: boolean;
    items: string[];
}

class Dashboard extends Component<Props> {
    render() {
        const { isLoggedIn, items } = this.props;

        // 条件渲染：返回 null 不渲染
        if (!isLoggedIn) {
            return null;
        }

        // 正常返回 JSX
        return (
            <div className="dashboard">
                <h1>控制台</h1>
                <ul>
                    {items.map((item, index) => (
                        <li key={index}>{item}</li>
                    ))}
                </ul>
            </div>
        );
    }
}

export default Dashboard;
```

**运行效果：** 登录状态下显示控制台和列表，未登录时不渲染任何内容。

### 内部原理

#### render 的调用时机

React 在以下情况调用 render：组件首次挂载、调用 setState 更新状态、父组件重新渲染导致 props 变化、调用 forceUpdate。render 返回的 ReactElement 与上次的结果做 Diff 对比，计算出最小 DOM 更新。

```javascript
// React 内部简化流程
function updateClassComponent(fiber) {
    const instance = fiber.stateNode;  // 类组件实例
    // 调用 render 获取新的 ReactElement
    const nextChildren = instance.render();
    // 与上次渲染结果做 Diff
    reconcileChildren(fiber, nextChildren);
}
```

#### render 必须是纯函数

render 在 React 18 的 Strict Mode 下会被调用两次（开发模式），用来检测是否有副作用。如果 render 中有副作用（如修改外部变量），两次调用会暴露问题。

### 适用场景

- **所有类组件：** render 是类组件唯一必须实现的方法
- **条件渲染：** 在 render 中根据 state/props 决定渲染内容
- **列表渲染：** 在 render 中用 map 生成元素列表

### 常见问题

#### render 中不能调用 setState

**问题描述：** 在 render 中调用 setState 导致无限循环。

**原因分析：** setState 触发重新渲染，重新渲染又调用 render，render 中又调用 setState，形成无限循环。

**解决方案：**

```tsx
// 错误写法：render 中调用 setState
// render() {
//     this.setState({ count: 1 });  // 无限循环
//     return <div>{this.state.count}</div>;
// }

// 正确写法：在生命周期或事件处理器中调用 setState
class MyComponent extends Component {
    componentDidMount() {
        this.setState({ count: 1 });  // 正确：在生命周期中
    }
    handleClick = () => {
        this.setState({ count: 1 });  // 正确：在事件处理器中
    };
    render() {
        return <div onClick={this.handleClick}>{this.state.count}</div>;
    }
}
```

### 注意事项

- render 是类组件唯一必须实现的方法
- render 必须是纯函数，不能有副作用
- render 不能调用 setState（会导致无限循环）
- render 可以返回 JSX、null、字符串、数字、数组、Fragment
- render 不能返回 undefined（会报错）
- Strict Mode 下 render 会被调用两次（开发模式）

### 总结

render 方法是类组件的核心，每次渲染时被调用返回 ReactElement。必须是纯函数，不能有副作用，不能调用 setState。返回值与上次做 Diff 计算最小 DOM 更新。在 Strict Mode 下会被调用两次以检测副作用。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 类组件的props与state

### 概念说明

`props` 和 `state` 是类组件中两个核心的数据来源。props 是从父组件传入的外部数据，组件自身不能修改；state 是组件内部维护的私有数据，通过 setState 方法更新。两者的变化都会触发组件重新渲染。

props 代表组件的"配置"，由外部控制；state 代表组件的"状态"，由自身管理。这种区分是 React 单向数据流的基础。

### 基本示例

```tsx
// 示例说明：展示 props 和 state 的区别与配合使用

import React, { Component } from "react";

// Props 类型：从外部传入，只读
interface UserFormProps {
    initialName: string;    // 初始值由父组件提供
    onSubmit: (name: string) => void;  // 回调函数
}

// State 类型：组件内部维护
interface UserFormState {
    name: string;           // 当前输入值
    isDirty: boolean;       // 是否被修改过
}

class UserForm extends Component<UserFormProps, UserFormState> {
    constructor(props: UserFormProps) {
        super(props);
        // state 初始化：可以使用 props 作为初始值
        this.state = {
            name: props.initialName,
            isDirty: false,
        };
    }

    // 更新 state
    handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({
            name: e.target.value,
            isDirty: true,
        });
    };

    handleSubmit = () => {
        // 通过 props 回调通知父组件
        this.props.onSubmit(this.state.name);
    };

    render() {
        return (
            <div>
                <input
                    value={this.state.name}
                    onChange={this.handleChange}
                />
                {this.state.isDirty && <span>已修改</span>}
                <button onClick={this.handleSubmit}>提交</button>
            </div>
        );
    }
}

export default UserForm;
```

**运行效果：** 输入框显示初始名称，修改后出现"已修改"提示，点击提交通过回调通知父组件。

### 内部原理

#### setState 的异步更新

setState 不会立即修改 this.state，而是将更新放入队列，由 React 批量处理。在事件处理器和生命周期方法中，多个 setState 调用会被合并为一次渲染。

```javascript
// setState 的更新流程
this.setState({ count: 1 });
console.log(this.state.count);  // 可能还是旧值，因为 setState 是异步的

// 需要基于前一个 state 更新时，用函数式 setState
this.setState(prevState => ({
    count: prevState.count + 1
}));
```

#### props 的不可变性

React 会冻结 props 对象（开发模式下），直接修改 `this.props.xxx = newValue` 会报错。props 只能由父组件通过重新渲染来更新。

### 与相关API的对比

| 对比维度 | props | state |
|----------|-------|-------|
| 数据来源 | 父组件传入 | 组件内部创建 |
| 可修改性 | 只读 | 通过 setState 修改 |
| 更新触发 | 父组件重新渲染 | 调用 setState |
| 用途 | 组件配置、回调 | 组件内部状态 |

### 适用场景

- **props：** 组件配置、数据传递、事件回调
- **state：** 表单输入值、UI 状态（展开/折叠）、计数器、加载状态

### 常见问题

#### 用 props 初始化 state 后 props 变化不同步

**问题描述：** 用 `this.state = { name: props.initialName }` 初始化后，父组件更新 props 时 state 不会自动更新。

**原因分析：** constructor 只在组件挂载时调用一次，之后 props 变化不会重新执行 constructor。

**解决方案：**

```tsx
// 方案1：用 key 强制重新挂载组件
<UserForm key={userId} initialName={user.name} />
// userId 变化时组件重新挂载，constructor 重新执行

// 方案2：完全受控组件（不用 state，直接用 props）
function UserForm({ name, onChange }) {
    return <input value={name} onChange={onChange} />;
}
```

### 注意事项

- 不要直接修改 `this.state`，必须用 `setState`
- setState 是异步的，不能立即读取更新后的值
- 需要基于前一个 state 更新时，用函数式 setState
- 用 props 初始化 state 是"不受控"模式，要注意同步问题
- props 是只读的，不要在组件内修改 props

### 总结

props 是外部传入的只读数据，state 是组件内部维护的可变状态。setState 异步更新 state 并触发重新渲染。用 props 初始化 state 时注意后续 props 变化不会自动同步。需要基于前值更新时用函数式 setState。两者变化都触发重渲染。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Props的单向数据流特性

### 概念说明

单向数据流（One-Way Data Flow）是 React 的核心设计原则。数据只能从父组件通过 props 向下传递给子组件，子组件不能直接修改父组件的数据。如果子组件需要改变父组件的状态，必须通过父组件传递的回调函数间接实现。

这种设计让数据流向可预测——永远是从上到下。当出现 bug 时，只需要沿着组件树向上追溯就能找到数据的来源。相比双向数据绑定，单向数据流在大型应用中更容易调试和维护。

### 基本示例

```tsx
// 示例说明：展示单向数据流的完整链路

import React, { useState } from "react";

// 父组件：拥有状态，通过 props 向下传递
function Parent() {
    const [items, setItems] = useState<string[]>(["React", "Vue"]);

    // 回调函数：子组件通过它间接修改父组件状态
    const addItem = (newItem: string) => {
        setItems(prev => [...prev, newItem]);
    };

    const removeItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div>
            <h1>技能列表 ({items.length})</h1>
            {/* 数据向下流：items 通过 props 传给子组件 */}
            <ItemList items={items} onRemove={removeItem} />
            {/* 回调向下传：addItem 通过 props 传给子组件 */}
            <AddItemForm onAdd={addItem} />
        </div>
    );
}

// 子组件：接收数据和回调，不直接修改父组件状态
function ItemList({ items, onRemove }: {
    items: string[];
    onRemove: (index: number) => void;
}) {
    return (
        <ul>
            {items.map((item, index) => (
                <li key={index}>
                    {item}
                    <button onClick={() => onRemove(index)}>删除</button>
                </li>
            ))}
        </ul>
    );
}

function AddItemForm({ onAdd }: { onAdd: (item: string) => void }) {
    const [value, setValue] = useState("");

    const handleSubmit = () => {
        if (value.trim()) {
            onAdd(value.trim());  // 通过回调通知父组件
            setValue("");
        }
    };

    return (
        <div>
            <input value={value} onChange={e => setValue(e.target.value)} />
            <button onClick={handleSubmit}>添加</button>
        </div>
    );
}

export default Parent;
```

**运行效果：** 父组件管理列表数据，子组件展示列表和提供添加表单。数据从父流向子，操作通过回调从子流回父。

### 内部原理

#### 数据流向

```
父组件 state
    │
    ├── props (数据) ──→ 子组件 A ──→ 渲染 UI
    │
    └── props (回调) ──→ 子组件 B ──→ 用户交互
                                        │
                                        └── 调用回调 ──→ 父组件 setState ──→ 重新渲染
```

单向数据流形成了一个循环：父组件状态变化 → 子组件 props 变化 → 子组件重新渲染 → 用户交互 → 回调通知父组件 → 父组件状态变化。数据始终沿同一方向流动。

### 与相关API的对比

| 对比维度 | 单向数据流 (React) | 双向绑定 (Vue v-model) |
|----------|-------------------|----------------------|
| 数据方向 | 父 → 子 | 父 ↔ 子 |
| 子组件修改数据 | 通过回调间接修改 | 直接修改（语法糖） |
| 可预测性 | 高 | 中等 |
| 代码量 | 稍多 | 较少 |
| 调试难度 | 容易追踪 | 需要理解绑定机制 |

### 适用场景

- **所有 React 组件通信：** 父子组件之间的数据传递
- **表单组件：** 受控组件模式（value + onChange）
- **状态提升：** 多个子组件共享状态时，状态提升到公共父组件

### 常见问题

#### Props Drilling（属性透传地狱）

**问题描述：** 深层嵌套组件需要某个数据，必须逐层传递 props。

**原因分析：** 单向数据流要求数据从父到子逐层传递，中间层组件被迫传递自己不需要的 props。

**解决方案：**

```tsx
// 问题：逐层传递
// App → Layout → Sidebar → UserInfo → Avatar
// 每一层都要传 user props

// 方案1：Context API
const UserContext = React.createContext<User | null>(null);

function App() {
    const [user, setUser] = useState<User>(currentUser);
    return (
        <UserContext.Provider value={user}>
            <Layout />  {/* 中间层不需要传 user */}
        </UserContext.Provider>
    );
}

function Avatar() {
    const user = useContext(UserContext);  // 直接消费
    return <img src={user?.avatar} />;
}

// 方案2：组件组合（将组件作为 props 传递）
function Layout({ avatar }: { avatar: React.ReactNode }) {
    return <div>{avatar}</div>;
}
```

### 注意事项

- 数据只能从父到子通过 props 传递
- 子组件通过回调函数间接修改父组件状态
- 深层传递用 Context 或状态管理库解决
- 不要为了避免 Props Drilling 过度使用 Context
- 组件组合（Composition）也能减少 Props Drilling

### 总结

单向数据流是 React 的核心原则，数据从父到子通过 props 传递，子组件通过回调间接修改父组件状态。这让数据流向可预测，调试方便。深层传递导致的 Props Drilling 可以用 Context API 或组件组合模式解决。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Props的只读性(immutability)

### 概念说明

React 中的 props 是只读的（immutable）。组件不能修改自己接收到的 props，就像纯函数不能修改传入的参数一样。这是 React 单向数据流的基础保证——只有数据的"拥有者"（父组件）才能修改数据，子组件只能读取和使用。

React 在开发模式下会冻结（Object.freeze）props 对象，尝试修改 props 会抛出错误。在生产模式下虽然不冻结，但修改 props 会导致不可预测的行为，因为 React 的渲染机制依赖 props 的不可变性。

### 基本示例

```tsx
// 示例说明：展示 props 只读性和正确的数据修改方式

import React, { useState } from "react";

interface ItemProps {
    item: { name: string; count: number };
    onUpdate: (newCount: number) => void;
}

function ItemCard({ item, onUpdate }: ItemProps) {
    // 错误：直接修改 props（开发模式下报错）
    // item.count = item.count + 1;  // TypeError: Cannot assign to read only property

    // 正确：通过回调通知父组件修改
    const handleIncrement = () => {
        onUpdate(item.count + 1);
    };

    return (
        <div>
            <span>{item.name}: {item.count}</span>
            <button onClick={handleIncrement}>+1</button>
        </div>
    );
}

// 父组件拥有数据，负责修改
function App() {
    const [item, setItem] = useState({ name: "苹果", count: 0 });

    const handleUpdate = (newCount: number) => {
        // 创建新对象，而不是修改原对象
        setItem(prev => ({ ...prev, count: newCount }));
    };

    return <ItemCard item={item} onUpdate={handleUpdate} />;
}

export default App;
```

**运行效果：** 点击按钮计数增加，数据修改由父组件完成，子组件只负责展示和触发回调。

### 内部原理

#### React 冻结 props 的机制

```javascript
// React 内部（开发模式）简化逻辑
function createElement(type, config, children) {
    const props = {};
    // ... 从 config 复制属性到 props
    
    // 开发模式下冻结 props 对象
    if (__DEV__) {
        Object.freeze(props);
    }
    
    return {
        $$typeof: REACT_ELEMENT_TYPE,
        type,
        props,  // 冻结后的 props
        // ...
    };
}
```

#### 不可变性对渲染优化的作用

React.memo 和 shouldComponentUpdate 通过浅比较 props 来决定是否跳过渲染。如果直接修改 props 对象的属性而不创建新引用，浅比较会认为 props 没有变化，导致组件不更新。不可变性保证了每次更新都创建新的引用，浅比较能正确检测到变化。

### 适用场景

- **所有组件：** props 只读是 React 的基本约束
- **性能优化：** 不可变数据让 React.memo 的浅比较有效
- **状态管理：** Redux 等库也要求不可变更新

### 常见问题

#### 修改 props 中的数组或对象

**问题描述：** `props.items.push(newItem)` 修改了 props 中的数组。

**原因分析：** Object.freeze 是浅冻结，嵌套对象/数组的内部属性仍然可以被修改（不冻结深层）。修改后引用不变，React 检测不到变化。

**解决方案：**

```tsx
// 错误写法：直接修改 props 中的数组
// props.items.push(newItem);  // 不报错但行为不正确

// 正确写法：在父组件中创建新数组
const handleAdd = (newItem: string) => {
    setItems(prev => [...prev, newItem]);  // 创建新数组
};
```

### 注意事项

- 开发模式下 React 冻结 props，生产模式不冻结
- Object.freeze 是浅冻结，嵌套对象可能被意外修改
- 修改 props 不会触发重新渲染，导致 UI 不一致
- 始终通过回调函数让父组件修改数据
- 不可变更新：用展开运算符或 immer 创建新对象

### 总结

Props 是只读的，React 在开发模式下通过 Object.freeze 冻结 props 对象。组件不能直接修改 props，必须通过回调让数据拥有者（父组件）修改。不可变性是浅比较优化（React.memo）正确工作的前提。嵌套数据的修改需要创建新引用。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Props的解构与重命名

### 概念说明

在函数组件中，props 通常通过 JavaScript 的解构赋值语法直接在参数位置提取所需属性。解构让代码更简洁，避免在组件内反复写 `props.xxx`。解构时还可以对属性进行重命名（别名），用于解决命名冲突或提升语义。

### 基本示例

```tsx
// 示例说明：展示 props 解构和重命名的各种用法

import React from "react";

interface UserProps {
    name: string;
    age: number;
    email?: string;
    className?: string;       // 常见：与 HTML 属性同名
    onChange?: (value: string) => void;
}

// 基本解构：直接提取属性
function UserCard({ name, age, email }: UserProps) {
    return (
        <div>
            <h2>{name}</h2>
            <p>年龄: {age}</p>
            {email && <p>邮箱: {email}</p>}
        </div>
    );
}

// 解构 + 重命名：用冒号语法给属性起别名
function StyledCard({ className: wrapperClass, name, age }: UserProps) {
    // className 被重命名为 wrapperClass，避免与内部变量冲突
    return (
        <div className={wrapperClass}>
            <h2 className="card-title">{name}</h2>
            <p>年龄: {age}</p>
        </div>
    );
}

// 解构 + 默认值 + 重命名
function ConfigCard({
    name,
    age,
    email: contactEmail = "未填写",    // 重命名 + 默认值
    className: cssClass = "card",      // 重命名 + 默认值
}: UserProps) {
    return (
        <div className={cssClass}>
            <h2>{name}</h2>
            <p>联系邮箱: {contactEmail}</p>
        </div>
    );
}

// 解构 + 剩余属性收集
function FlexibleCard({ name, age, ...rest }: UserProps) {
    // rest 包含 email、className、onChange 等剩余属性
    return (
        <div {...rest}>
            <h2>{name}</h2>
            <p>年龄: {age}</p>
        </div>
    );
}

export default UserCard;
```

**运行效果：** 各组件正确接收和使用 props，重命名后的变量在组件内部使用。

### 内部原理

#### 解构的编译结果

解构是 JavaScript 语法，编译后变为普通的属性访问。TypeScript/Babel 编译后，解构赋值被转换为 `var name = props.name;` 这样的代码。性能上和直接访问 `props.name` 没有区别。

### 适用场景

- **所有函数组件：** 解构 props 是标准写法
- **命名冲突：** 用重命名避免与局部变量同名
- **属性透传：** 用剩余属性收集不需要的属性并透传
- **默认值：** 解构时设置可选属性的默认值

### 常见问题

#### 解构嵌套对象

**问题描述：** props 中有嵌套对象时如何解构。

**解决方案：**

```tsx
interface Props {
    user: {
        name: string;
        address: {
            city: string;
        };
    };
}

// 嵌套解构（可读性较差，不推荐深层嵌套）
function Component({ user: { name, address: { city } } }: Props) {
    return <p>{name} - {city}</p>;
}

// 推荐：只解构第一层，深层用点号访问
function ComponentBetter({ user }: Props) {
    return <p>{user.name} - {user.address.city}</p>;
}
```

### 注意事项

- 解构在参数位置进行，不需要在函数体内再解构
- 重命名语法是 `{ 原名: 新名 }`，冒号后面是别名不是类型
- 剩余属性（`...rest`）透传给子元素时注意过滤自定义属性
- 深层嵌套解构可读性差，建议只解构第一层
- TypeScript 中解构和类型标注的冒号容易混淆

### 总结

Props 解构是函数组件的标准写法，让代码更简洁。支持重命名（`{ a: b }`）、默认值（`{ a = 1 }`）和剩余属性收集（`...rest`）。重命名用于解决命名冲突，剩余属性用于属性透传。深层嵌套解构可读性差，建议只解构第一层。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Props的展开传递风险

### 概念说明

Props 展开传递（`{...props}`）虽然方便，但也带来了一些风险：可能传递不必要的属性到 DOM 元素上引起警告、破坏组件封装性让 props 来源不清晰、意外覆盖组件内部的属性、以及传递敏感数据到不该接收的组件中。

在实际开发中，展开传递应该谨慎使用，尤其是在组件层级较深的场景中。

### 基本示例

```tsx
// 示例说明：展示展开传递的常见风险

import React from "react";

interface ButtonProps {
    label: string;
    variant: "primary" | "danger";
    isLoading: boolean;
    onClick: () => void;
}

// 风险1：自定义属性泄漏到 DOM
function BadButton(props: ButtonProps) {
    // variant 和 isLoading 不是合法的 HTML 属性
    // React 会在控制台输出警告：Unknown prop `variant` on <button> tag
    return <button {...props}>{props.label}</button>;
}

// 正确做法：先解构出自定义属性
function GoodButton({ label, variant, isLoading, ...htmlProps }: ButtonProps) {
    const className = `btn btn-${variant}`;
    return (
        <button className={className} disabled={isLoading} {...htmlProps}>
            {isLoading ? "加载中..." : label}
        </button>
    );
}

// 风险2：意外覆盖内部属性
function OverrideRisk(props: Record<string, unknown>) {
    // 如果 props 中包含 className，会覆盖组件自己的 className
    return <div className="internal-style" {...props} />;
    // 正确顺序：展开在前，内部属性在后
    // return <div {...props} className="internal-style" />;
}

// 风险3：来源不清晰
function DeepComponent(props: Record<string, unknown>) {
    // 当 props 被层层展开传递时，很难追踪某个属性的来源
    return <ChildComponent {...props} />;
}

function ChildComponent(props: Record<string, unknown>) {
    return <GrandChildComponent {...props} />;
    // GrandChildComponent 接收的 props 来源模糊
}

function GrandChildComponent(props: any) {
    return <div>{String(props.name)}</div>;
}

export default GoodButton;
```

**运行效果：** BadButton 在控制台产生 DOM 属性警告，GoodButton 正确过滤了自定义属性。

### 内部原理

#### React 的 DOM 属性检查

React 在渲染 HTML 元素时会检查属性是否是合法的 DOM 属性。不合法的属性会在开发模式下输出警告。这个检查发生在 Commit 阶段将属性设置到 DOM 元素时。自定义组件不做这个检查，因为自定义组件的 props 是自定义的。

### 适用场景

- **底层 UI 组件：** 需要展开传递 HTML 原生属性时，先过滤自定义属性
- **高阶组件：** 透传 props 给被包装组件时

### 常见问题

#### 如何安全地展开传递

**问题描述：** 需要透传 HTML 属性但不想传递自定义属性到 DOM。

**解决方案：**

```tsx
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant: "elevated" | "outlined";
    loading: boolean;
}

// 安全的展开传递：解构出自定义属性，剩余的都是合法 HTML 属性
function Card({ variant, loading, children, ...htmlProps }: CardProps) {
    return (
        <div
            {...htmlProps}  // 只包含合法的 HTML 属性
            className={`card card-${variant} ${htmlProps.className ?? ""}`}
        >
            {loading ? <span>加载中...</span> : children}
        </div>
    );
}
```

### 注意事项

- 展开到 HTML 元素前先解构出自定义属性
- 注意展开顺序：后面的属性覆盖前面的
- 深层展开传递让 props 来源难以追踪
- 展开可能传递敏感数据（如 token）到不需要的组件
- 使用 TypeScript 的 `extends React.HTMLAttributes` 约束可透传的属性

### 总结

Props 展开传递的风险包括：自定义属性泄漏到 DOM、意外覆盖内部属性、来源不清晰。安全做法是先解构出自定义属性再展开剩余属性。注意展开顺序决定了属性覆盖关系。TypeScript 的类型约束可以帮助限制可展开的属性范围。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 组件组合(Composition)的children模式

### 概念说明

组件组合（Composition）是 React 推荐的代码复用方式，通过将组件嵌套在其他组件中来构建复杂 UI。children 模式是最基础的组合方式——父组件通过 `props.children` 接收子内容，自己只负责提供布局和样式包裹，具体渲染什么内容由调用方决定。

这种模式让组件职责分离：容器组件管理布局和行为，内容由使用者灵活传入。React 官方推荐用组合代替继承来实现组件复用。

### 基本示例

```tsx
// 示例说明：展示 children 模式的容器组件

import React, { ReactNode } from "react";

// 通用卡片容器：只负责样式包裹
interface CardProps {
    title: string;
    children: ReactNode;
}

function Card({ title, children }: CardProps) {
    return (
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>{title}</h3>
            <div className="card-body">
                {children}
            </div>
        </div>
    );
}

// 通用对话框容器
interface DialogProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
}

function Dialog({ isOpen, onClose, children }: DialogProps) {
    if (!isOpen) return null;

    return (
        <div className="dialog-overlay" onClick={onClose}>
            <div className="dialog-content" onClick={e => e.stopPropagation()}>
                {children}
                <button onClick={onClose}>关闭</button>
            </div>
        </div>
    );
}

// 使用：调用方决定渲染什么内容
function App() {
    return (
        <div>
            <Card title="用户信息">
                <p>姓名: 张三</p>
                <p>年龄: 25</p>
            </Card>

            <Card title="操作面板">
                <button>编辑</button>
                <button>删除</button>
            </Card>
        </div>
    );
}

export default App;
```

**运行效果：** 两张卡片使用相同的容器样式，但内容完全不同。Card 组件不关心具体内容，只提供统一的视觉包裹。

### 内部原理

#### children 的传递机制

children 是一个特殊的 prop，JSX 标签之间的内容自动成为 children。容器组件在渲染时将 children 插入到指定位置，实现了"插槽"效果。

```javascript
// 调用方
<Card title="标题">
    <p>内容</p>
</Card>

// 等价于
_jsx(Card, {
    title: "标题",
    children: _jsx("p", { children: "内容" })
});

// Card 组件内部：{children} 就是 <p>内容</p>
```

#### 组合 vs 继承

React 团队明确表示：在 Facebook 的数千个组件中，没有发现需要用继承来解决的场景。组合模式比继承更灵活——继承是"是什么"关系，组合是"有什么"关系。组合允许在运行时动态改变内容，而继承是编译时固定的。

### 适用场景

- **布局组件：** PageLayout、Sidebar、Header 等
- **UI 容器：** Card、Modal、Drawer、Tooltip
- **功能包裹：** ErrorBoundary、ThemeProvider、AuthGuard
- **页面模板：** 统一页面结构，内容区域由各页面自定义

### 常见问题

#### children 类型该怎么标注

**问题描述：** TypeScript 中 children 的类型标注不清楚。

**解决方案：**

```tsx
import { ReactNode, ReactElement } from "react";

// 最常用：接受任何可渲染内容
interface Props {
    children: ReactNode;
}

// 严格：只接受 React 元素（不接受字符串、数字）
interface StrictProps {
    children: ReactElement;
}

// 只接受单个子元素
interface SingleChildProps {
    children: ReactElement;
}

// 接受函数作为 children（Render Props 模式）
interface RenderProps {
    children: (data: { count: number }) => ReactNode;
}
```

### 注意事项

- children 模式让组件职责清晰：容器管布局，调用方管内容
- 优先用组合而非继承实现复用
- children 类型用 ReactNode 覆盖最广
- 容器组件不应该对 children 的具体类型做假设
- 多个内容区域的需求用具名 props（插槽模式）解决

### 总结

children 模式是 React 组件组合的基础，容器组件通过 props.children 接收并渲染调用方传入的内容。这种模式实现了职责分离：容器管布局，内容由使用者决定。React 推荐用组合代替继承。TypeScript 中 children 通常标注为 ReactNode。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 组件组合的插槽(Slot)模式

### 概念说明

插槽模式是 children 模式的扩展。当一个容器组件有多个内容区域时，单靠 children 只能填充一个位置。插槽模式通过具名 props 传递多个 ReactNode，让调用方可以分别控制不同区域的内容。这类似于 Vue 的具名插槽（named slots），但 React 中通过普通 props 实现。

常见的插槽包括 header、footer、sidebar、icon、prefix、suffix 等，每个插槽对应组件模板中的一个占位区域。

### 基本示例

```tsx
// 示例说明：展示多插槽的页面布局组件

import React, { ReactNode } from "react";

// 多插槽的页面布局
interface PageLayoutProps {
    header: ReactNode;      // 头部插槽
    sidebar: ReactNode;     // 侧边栏插槽
    children: ReactNode;    // 主内容区（默认插槽）
    footer?: ReactNode;     // 底部插槽（可选）
}

function PageLayout({ header, sidebar, children, footer }: PageLayoutProps) {
    return (
        <div className="page-layout">
            <header className="page-header">{header}</header>
            <div className="page-body">
                <aside className="page-sidebar">{sidebar}</aside>
                <main className="page-content">{children}</main>
            </div>
            {footer && <footer className="page-footer">{footer}</footer>}
        </div>
    );
}

// 使用：每个区域传入不同的内容
function App() {
    return (
        <PageLayout
            header={<h1>网站标题</h1>}
            sidebar={
                <nav>
                    <a href="/">首页</a>
                    <a href="/about">关于</a>
                </nav>
            }
            footer={<p>版权信息 2025</p>}
        >
            <article>
                <h2>文章标题</h2>
                <p>文章正文内容...</p>
            </article>
        </PageLayout>
    );
}

export default App;
```

**运行效果：** 页面呈现完整的布局结构，头部、侧边栏、主内容区和底部分别渲染各自传入的内容。

### 进阶用法

```tsx
// 进阶场景：带图标和操作按钮的列表项组件

import React, { ReactNode } from "react";

interface ListItemProps {
    icon?: ReactNode;           // 左侧图标插槽
    title: string;
    description?: string;
    actions?: ReactNode;        // 右侧操作按钮插槽
}

function ListItem({ icon, title, description, actions }: ListItemProps) {
    return (
        <div style={{ display: "flex", alignItems: "center", padding: "12px 0" }}>
            {/* 图标插槽 */}
            {icon && <div style={{ marginRight: 12 }}>{icon}</div>}

            {/* 内容区 */}
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "bold" }}>{title}</div>
                {description && <div style={{ color: "#666" }}>{description}</div>}
            </div>

            {/* 操作插槽 */}
            {actions && <div>{actions}</div>}
        </div>
    );
}

// 使用
function UserList() {
    return (
        <div>
            <ListItem
                icon={<img src="/avatar.png" width={40} height={40} alt="" />}
                title="张三"
                description="前端工程师"
                actions={
                    <>
                        <button>编辑</button>
                        <button>删除</button>
                    </>
                }
            />
        </div>
    );
}

export default UserList;
```

### 与相关API的对比

| 对比维度 | children 模式 | 插槽模式 | Render Props |
|----------|-------------|---------|-------------|
| 内容区域数量 | 1 个 | 多个 | 1 个（带数据） |
| 数据传递 | 无 | 无 | 容器向内容传数据 |
| 使用复杂度 | 低 | 中 | 高 |
| 适用场景 | 单区域容器 | 多区域布局 | 需要共享数据 |

### 适用场景

- **页面布局：** header、sidebar、content、footer 多区域
- **表单组件：** label、input、errorMessage、helpText 多区域
- **列表项：** icon、title、subtitle、actions 多区域
- **对话框：** title、content、footer 多区域

### 常见问题

#### 插槽太多导致 JSX 冗长

**问题描述：** 传入的插槽内容太多，组件调用变得很长。

**解决方案：**

```tsx
// 当插槽过多时，将相关插槽内容提取为独立组件
function App() {
    return (
        <PageLayout
            header={<AppHeader />}      // 提取为独立组件
            sidebar={<AppSidebar />}
            footer={<AppFooter />}
        >
            <PageContent />
        </PageLayout>
    );
}
```

### 注意事项

- 插槽本质是类型为 ReactNode 的普通 props
- children 是默认插槽，具名 props 是具名插槽
- 可选插槽用 `?` 标记并在渲染时条件判断
- 插槽内容过多时提取为独立组件保持可读性
- React 没有"插槽"这个专有概念，这是一种使用模式

### 总结

插槽模式通过具名 ReactNode props 为容器组件提供多个内容区域。children 作为默认插槽，其他具名 props 作为具名插槽。适用于多区域布局（页面、对话框、列表项等）。当插槽过多时，将内容提取为独立组件保持可读性。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 组件继承(Inheritance)的反模式

### 概念说明

在 React 中，组件继承（一个组件 extends 另一个组件）被认为是反模式。React 官方明确推荐使用组合（Composition）而非继承（Inheritance）来实现组件复用。Facebook 在其数千个 React 组件中没有发现需要用组件继承来解决的场景。

继承的问题在于它创建了紧耦合的层级关系，子类依赖父类的实现细节，修改父类可能破坏所有子类。而组合是松耦合的，组件之间通过 props 接口交互，内部实现可以独立变化。

### 基本示例

```tsx
// 示例说明：对比继承写法（反模式）和组合写法（推荐）

import React, { Component } from "react";

// ===== 反模式：组件继承 =====

// 基础按钮
class BaseButton extends Component<{ onClick: () => void }> {
    getClassName() {
        return "btn";
    }
    render() {
        return (
            <button className={this.getClassName()} onClick={this.props.onClick}>
                {this.renderContent()}
            </button>
        );
    }
    renderContent(): React.ReactNode {
        return "按钮";
    }
}

// 继承扩展（反模式：紧耦合，依赖父类实现细节）
class PrimaryButton extends BaseButton {
    getClassName() {
        return "btn btn-primary";
    }
    renderContent() {
        return "主要按钮";
    }
}

// ===== 推荐：组合模式 =====

interface ButtonProps {
    variant?: "default" | "primary" | "danger";
    children: React.ReactNode;
    onClick: () => void;
}

// 通用按钮：通过 props 控制变体
function Button({ variant = "default", children, onClick }: ButtonProps) {
    const className = `btn btn-${variant}`;
    return (
        <button className={className} onClick={onClick}>
            {children}
        </button>
    );
}

// 特化按钮：通过组合固定部分 props
function PrimaryButtonComposed({ children, onClick }: Omit<ButtonProps, "variant">) {
    return (
        <Button variant="primary" onClick={onClick}>
            {children}
        </Button>
    );
}

export { Button, PrimaryButtonComposed };
```

### 与相关API的对比

| 对比维度 | 继承 (Inheritance) | 组合 (Composition) |
|----------|-------------------|-------------------|
| 耦合度 | 紧耦合 | 松耦合 |
| 灵活性 | 低（固定层级） | 高（运行时组合） |
| 复用粒度 | 类级别 | 组件/Hook 级别 |
| 修改影响 | 父类修改影响所有子类 | 各组件独立 |
| React 推荐 | 不推荐 | 推荐 |

### 适用场景

- **继承的唯一合理场景：** `extends React.Component`（这是框架要求，不是业务继承）
- **所有业务复用场景都应该用组合：** 包装组件、自定义 Hook、Render Props

### 常见问题

#### 需要共享逻辑怎么办

**问题描述：** 多个组件需要相同的逻辑（如数据获取、表单验证），不用继承该怎么复用。

**原因分析：** 继承只能单继承，逻辑复用不灵活。

**解决方案：**

```tsx
// 方案1：自定义 Hook（最推荐）
function useFormValidation(initialValues: Record<string, string>) {
    const [values, setValues] = useState(initialValues);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => { /* 验证逻辑 */ };
    const handleChange = (field: string, value: string) => {
        setValues(prev => ({ ...prev, [field]: value }));
    };

    return { values, errors, validate, handleChange };
}

// 多个组件都可以使用这个 Hook
function LoginForm() {
    const { values, errors, handleChange } = useFormValidation({ email: "", password: "" });
    return <form>...</form>;
}

function RegisterForm() {
    const { values, errors, handleChange } = useFormValidation({ name: "", email: "" });
    return <form>...</form>;
}

// 方案2：组合包装
function withAuth(WrappedComponent: React.ComponentType) {
    return function AuthComponent(props: any) {
        const isAuthenticated = useAuth();
        if (!isAuthenticated) return <LoginPage />;
        return <WrappedComponent {...props} />;
    };
}
```

### 注意事项

- 不要让业务组件继承其他业务组件
- extends React.Component 是框架约束，不是业务继承
- 自定义 Hook 是逻辑复用的首选方式
- 组合比继承更灵活，可以在运行时动态改变
- 如果发现自己在写继承，重新考虑用组合或自定义 Hook

### 总结

组件继承是 React 的反模式，官方推荐用组合代替继承。继承创建紧耦合关系，组合是松耦合的。逻辑复用用自定义 Hook，UI 复用用组合包装组件。extends React.Component 是框架要求，不属于业务继承。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## React.Children.map的子元素遍历

### 概念说明

`React.Children.map` 是 React 提供的工具方法，用于安全地遍历 `props.children`。它解决了 children 类型不固定的问题——单个子元素时 children 不是数组，直接调用 `.map()` 会报错。React.Children.map 能统一处理单个元素、多个元素、null、undefined 等各种情况。

该方法还会自动为返回的元素添加合适的 key（如果原始元素没有 key）。

### API 签名与参数

```typescript
React.Children.map(
    children: React.ReactNode,
    fn: (child: React.ReactNode, index: number) => React.ReactNode
): React.ReactNode[]
```

| 参数 | 类型 | 是否必填 | 说明 |
|------|------|----------|------|
| children | ReactNode | 是 | 要遍历的 children |
| fn | (child, index) => ReactNode | 是 | 对每个子元素执行的回调函数 |

**返回值：** 一个新的 ReactNode 数组。如果 children 为 null 或 undefined，返回 null。

### 基本示例

```tsx
// 示例说明：用 React.Children.map 为每个子元素添加包裹

import React, { ReactNode } from "react";

// 为每个子元素添加统一的间距包裹
interface SpacedListProps {
    gap?: number;
    children: ReactNode;
}

function SpacedList({ gap = 8, children }: SpacedListProps) {
    return (
        <div>
            {React.Children.map(children, (child, index) => (
                <div key={index} style={{ marginBottom: index < React.Children.count(children) - 1 ? gap : 0 }}>
                    {child}
                </div>
            ))}
        </div>
    );
}

// 使用：无论传入一个还是多个子元素都能正确处理
function App() {
    return (
        <SpacedList gap={16}>
            <p>第一段</p>
            <p>第二段</p>
            <p>第三段</p>
        </SpacedList>
    );
}

export default App;
```

**运行效果：** 每个段落之间有 16px 的间距，最后一个段落没有底部间距。

### 内部原理

#### 与原生数组 map 的区别

```javascript
// 原生 map：children 必须是数组
// 单个子元素时报错
// children.map(fn);  // TypeError: children.map is not a function

// React.Children.map：统一处理所有情况
// 内部逻辑简化
function childrenMap(children, fn) {
    if (children == null) return null;  // null/undefined 返回 null
    const result = [];
    // 内部展平嵌套数组和 Fragment
    traverseAllChildren(children, (child, index) => {
        result.push(fn(child, index));
    });
    return result;
}
```

React.Children.map 还会展平嵌套的数组（但不展平 Fragment），并为每个返回的元素生成稳定的 key。

### 与相关API的对比

| 对比维度 | React.Children.map | Array.prototype.map |
|----------|-------------------|-------------------|
| null/undefined 处理 | 返回 null | 报错 |
| 单元素处理 | 正常工作 | 报错（不是数组） |
| 嵌套数组 | 自动展平 | 不展平 |
| key 生成 | 自动添加 | 不处理 |

### 适用场景

- **间距组件：** 为子元素添加统一间距
- **动画容器：** 为每个子元素包裹动画组件
- **权限控制：** 过滤掉无权限的子元素
- **样式注入：** 给每个子元素添加额外的 className 或 style

### 常见问题

#### React.Children.map 会跳过 boolean、null、undefined

**问题描述：** 条件渲染产生的 false/null 子元素不会出现在遍历中。

**原因分析：** React.Children.map 会过滤掉不可渲染的值（boolean、null、undefined），只遍历有效的子元素。

**解决方案：** 这通常是期望行为，不需要特殊处理。

### 注意事项

- React.Children.map 能安全处理单个元素、多个元素和 null
- 会自动展平嵌套数组
- 会过滤 boolean、null、undefined
- 返回的元素会自动获得稳定的 key
- 现代 React 中，某些场景可以用 React.Children.toArray 配合原生 map 替代

### 总结

React.Children.map 安全遍历 children，统一处理单元素、多元素和 null 情况。相比原生数组 map，它能自动展平嵌套数组、过滤不可渲染值、生成稳定 key。适用于需要对每个子元素做包裹或变换的容器组件。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## React.Children.forEach的子元素遍历

### 概念说明

`React.Children.forEach` 和 `React.Children.map` 功能类似，都是安全遍历 `props.children` 的工具方法。区别在于 forEach 不返回新数组，只执行回调函数的副作用操作。适用于只需要遍历子元素做统计、收集信息或触发副作用，而不需要生成新的子元素列表的场景。

### API 签名与参数

```typescript
React.Children.forEach(
    children: React.ReactNode,
    fn: (child: React.ReactNode, index: number) => void
): void
```

| 参数 | 类型 | 是否必填 | 说明 |
|------|------|----------|------|
| children | ReactNode | 是 | 要遍历的 children |
| fn | (child, index) => void | 是 | 对每个子元素执行的回调（无返回值） |

**返回值：** `void`，不返回任何内容。

### 基本示例

```tsx
// 示例说明：用 forEach 统计子元素信息

import React, { ReactNode, ReactElement, isValidElement } from "react";

// 统计子元素中各类型的数量
interface ChildStatsProps {
    children: ReactNode;
}

function ChildStats({ children }: ChildStatsProps) {
    let elementCount = 0;
    let textCount = 0;

    // forEach 不返回新数组，只做统计
    React.Children.forEach(children, (child) => {
        if (isValidElement(child)) {
            elementCount++;
        } else if (typeof child === "string" || typeof child === "number") {
            textCount++;
        }
    });

    return (
        <div>
            <p>React 元素数: {elementCount}</p>
            <p>文本节点数: {textCount}</p>
            <div>{children}</div>
        </div>
    );
}

function App() {
    return (
        <ChildStats>
            <p>段落一</p>
            纯文本
            <p>段落二</p>
            <span>行内元素</span>
        </ChildStats>
    );
}

export default App;
```

**运行效果：** 显示子元素的统计信息：React 元素数 3，文本节点数 1，下方正常渲染所有子内容。

### 与相关API的对比

| 对比维度 | React.Children.map | React.Children.forEach |
|----------|-------------------|----------------------|
| 返回值 | ReactNode[] | void |
| 用途 | 变换子元素生成新数组 | 遍历执行副作用 |
| 类似原生 API | Array.map | Array.forEach |

### 适用场景

- **子元素统计：** 计算子元素数量或类型分布
- **信息收集：** 从子元素的 props 中提取信息
- **验证检查：** 检查子元素是否符合预期类型

### 注意事项

- forEach 不返回值，不能用于生成新的子元素列表
- 和 map 一样能安全处理单元素、null、undefined
- 同样会过滤 boolean、null、undefined
- 需要变换子元素时用 map，只需遍历时用 forEach

### 总结

React.Children.forEach 安全遍历 children 但不返回新数组，适用于统计、收集信息和验证等只需副作用的场景。和 map 的区别就是有无返回值。同样能处理单元素和 null 的边界情况。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## React.Children.toArray的扁平化

### 概念说明

`React.Children.toArray` 将 `props.children` 转换为一个扁平的数组。它会展平嵌套数组、过滤掉 null/undefined/boolean 等不可渲染的值，并为每个元素添加稳定的 key。转换后的数组可以使用原生数组方法（sort、filter、slice 等）进行操作。

这个方法在需要对 children 做排序、过滤、截取等数组操作时非常有用，是 React.Children 工具集中使用频率较高的方法。

### API 签名与参数

```typescript
React.Children.toArray(
    children: React.ReactNode
): React.ReactElement[]
```

| 参数 | 类型 | 是否必填 | 说明 |
|------|------|----------|------|
| children | ReactNode | 是 | 要转换的 children |

**返回值：** 扁平化后的 ReactElement 数组，每个元素都有稳定的 key。

### 基本示例

```tsx
// 示例说明：用 toArray 对子元素进行排序和过滤

import React, { ReactNode, isValidElement } from "react";

// 反转子元素顺序
interface ReversedProps {
    children: ReactNode;
}

function Reversed({ children }: ReversedProps) {
    // 转为数组后可以用原生数组方法
    const childArray = React.Children.toArray(children);
    return <>{childArray.reverse()}</>;
}

// 只保留前 N 个子元素
interface LimitProps {
    max: number;
    children: ReactNode;
}

function Limit({ max, children }: LimitProps) {
    const childArray = React.Children.toArray(children);
    return <>{childArray.slice(0, max)}</>;
}

// 过滤特定类型的子元素
function OnlyButtons({ children }: { children: ReactNode }) {
    const childArray = React.Children.toArray(children);
    const buttons = childArray.filter(
        child => isValidElement(child) && child.type === "button"
    );
    return <div>{buttons}</div>;
}

function App() {
    return (
        <div>
            <Reversed>
                <p>第一段</p>
                <p>第二段</p>
                <p>第三段</p>
            </Reversed>

            <Limit max={2}>
                <li>项目1</li>
                <li>项目2</li>
                <li>项目3</li>
            </Limit>
        </div>
    );
}

export default App;
```

**运行效果：** Reversed 组件将三个段落反序显示，Limit 组件只显示前两个列表项。

### 内部原理

#### 扁平化与 key 生成

```javascript
// toArray 内部逻辑简化
function toArray(children) {
    const result = [];
    // 递归遍历，展平嵌套数组
    traverseAllChildren(children, (child, nameSoFar) => {
        if (child != null && typeof child !== "boolean") {
            // 为每个元素生成基于路径的稳定 key
            // key 格式如 ".0", ".1", ".0.0"（基于嵌套层级）
            result.push(
                isValidElement(child)
                    ? cloneAndReplaceKey(child, nameSoFar)
                    : child
            );
        }
    });
    return result;
}
```

toArray 生成的 key 是基于子元素在原始 children 结构中的路径位置，保证了即使 children 结构变化，key 也是稳定的。

### 与相关API的对比

| 对比维度 | toArray | map | forEach |
|----------|---------|-----|---------|
| 返回值 | 扁平数组 | 变换后的数组 | void |
| 后续操作 | 可用原生数组方法 | 直接作为渲染结果 | 无 |
| 适用场景 | 需要排序/过滤/截取 | 变换每个元素 | 遍历副作用 |

### 适用场景

- **排序子元素：** 对 children 重新排序
- **截取子元素：** 显示前 N 个子元素
- **过滤子元素：** 按条件筛选特定子元素
- **统计数量：** 获取有效子元素的精确数量

### 常见问题

#### toArray 会改变原始 key

**问题描述：** 元素原本的 key 被 toArray 重写了。

**原因分析：** toArray 会为每个元素生成新的 key（基于路径前缀 + 原始 key）。这保证了扁平化后 key 的唯一性，但可能和原始 key 不同。

**解决方案：** 如果需要保留原始 key，可以用 `React.Children.forEach` 手动收集到数组中。

### 注意事项

- toArray 会展平嵌套数组但不展平 Fragment
- 会过滤 null、undefined、boolean
- 会为每个元素重新生成 key
- 返回的数组可以安全地使用所有原生数组方法
- 对于简单的遍历变换，React.Children.map 更直接

### 总结

React.Children.toArray 将 children 转为扁平数组，支持原生数组方法（排序、过滤、截取）。会自动展平嵌套、过滤不可渲染值、生成稳定 key。适用于需要对子元素做数组操作的场景。简单变换用 map 更直接，复杂操作用 toArray。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## React.Children.only的单子验证

### 概念说明

`React.Children.only` 用于验证 `props.children` 是否只有一个子元素。如果 children 是单个有效的 React 元素，则返回该元素；如果 children 为空、有多个子元素、或者不是有效的 React 元素（如纯文本），则抛出错误。

这个方法常用于要求"必须且只能传入一个子组件"的场景，比如 Context.Provider、Tooltip、AnimatePresence 等包裹型组件。

### API 签名与参数

```typescript
React.Children.only(
    children: React.ReactNode
): React.ReactElement
```

| 参数 | 类型 | 是否必填 | 说明 |
|------|------|----------|------|
| children | ReactNode | 是 | 要验证的 children |

**返回值：** 唯一的子 ReactElement。如果不满足条件则抛出错误。

### 基本示例

```tsx
// 示例说明：用 only 确保容器组件只接收单个子元素

import React, { ReactElement, cloneElement } from "react";

// Tooltip 组件：必须且只能包裹一个子元素
interface TooltipProps {
    text: string;
    children: ReactElement;  // 类型约束为单个 ReactElement
}

function Tooltip({ text, children }: TooltipProps) {
    // 验证只有一个子元素，否则抛出错误
    const child = React.Children.only(children);

    // 给唯一的子元素添加 title 属性
    return cloneElement(child, {
        title: text,
        style: { ...child.props.style, cursor: "help" },
    });
}

// 正确使用：传入一个子元素
function App() {
    return (
        <Tooltip text="这是提示信息">
            <span>鼠标悬停查看提示</span>
        </Tooltip>
    );
}

// 错误使用：传入多个子元素会在运行时抛出错误
// <Tooltip text="提示">
//     <span>元素一</span>
//     <span>元素二</span>
// </Tooltip>
// Error: React.Children.only expected to receive a single React element child.

export default App;
```

**运行效果：** span 元素获得 title 属性和手型光标，鼠标悬停显示提示文字。传入多个子元素时运行时报错。

### 内部原理

#### only 的检查逻辑

```javascript
// React 源码简化
function onlyChild(children) {
    // 必须是有效的 React 元素
    if (!isValidElement(children)) {
        throw new Error(
            "React.Children.only expected to receive a single React element child."
        );
    }
    return children;
}
```

only 的检查很简单：children 必须是一个 ReactElement（通过 isValidElement 验证）。字符串、数字、null、数组都不通过。

### 与相关API的对比

| 对比维度 | React.Children.only | React.Children.count | React.Children.toArray |
|----------|--------------------|--------------------|----------------------|
| 作用 | 验证并返回唯一子元素 | 统计子元素数量 | 转为数组 |
| 多子元素 | 抛出错误 | 返回数量 | 返回数组 |
| 返回值 | ReactElement | number | ReactElement[] |

### 适用场景

- **Tooltip/Popover：** 必须包裹单个触发元素
- **动画组件：** AnimatePresence 等只能包裹单个子元素
- **cloneElement 场景：** 需要给唯一子元素注入 props
- **类型安全：** 运行时验证 children 结构

### 常见问题

#### 纯文本子元素不通过验证

**问题描述：** `<Wrapper>纯文本</Wrapper>` 抛出错误。

**原因分析：** only 要求 children 是一个有效的 ReactElement，纯文本字符串不是 ReactElement。

**解决方案：**

```tsx
// 错误：纯文本不通过
// <Tooltip text="提示">纯文本</Tooltip>

// 正确：用元素包裹
<Tooltip text="提示">
    <span>文本内容</span>
</Tooltip>
```

### 注意事项

- only 不通过时抛出运行时错误，不是编译时检查
- 纯文本、数字、null、数组都不通过验证
- TypeScript 中用 `children: ReactElement` 类型约束可以在编译时提前发现问题
- Fragment 的子元素也不通过（Fragment 本身是一个元素，但其 children 可能有多个）
- 配合 cloneElement 使用时经常需要 only 做前置验证

### 总结

React.Children.only 验证 children 是否为单个有效的 ReactElement，不满足则抛出错误。常用于 Tooltip、动画组件等只能包裹单个子元素的场景。配合 TypeScript 的 `children: ReactElement` 类型约束可以同时获得编译时和运行时的保护。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## React.isValidElement的验证

### 概念说明

`React.isValidElement` 用于检查一个值是否是有效的 React 元素（ReactElement）。它通过检查对象的 `$$typeof` 属性是否等于 `Symbol.for("react.element")` 来判断。这个方法在需要区分 React 元素和其他类型值（字符串、数字、普通对象）时非常有用。

常见使用场景包括：动态渲染前的类型检查、容器组件对 children 类型的验证、以及工具函数中对参数类型的判断。

### API 签名与参数

```typescript
React.isValidElement(object: any): object is React.ReactElement
```

| 参数 | 类型 | 是否必填 | 说明 |
|------|------|----------|------|
| object | any | 是 | 要检查的值 |

**返回值：** `boolean`，如果是有效的 ReactElement 返回 true，否则返回 false。TypeScript 中返回类型是类型谓词（type predicate），可以自动收窄类型。

### 基本示例

```tsx
// 示例说明：用 isValidElement 做类型判断

import React, { isValidElement, ReactNode, cloneElement } from "react";

// 检查各种值
console.log(isValidElement(<div />));           // true - JSX 元素
console.log(isValidElement(<MyComponent />));   // true - 组件元素
console.log(isValidElement("hello"));           // false - 字符串
console.log(isValidElement(42));                // false - 数字
console.log(isValidElement(null));              // false - null
console.log(isValidElement({ type: "div" }));   // false - 普通对象

// 实际应用：根据 children 类型做不同处理
interface SmartContainerProps {
    children: ReactNode;
}

function SmartContainer({ children }: SmartContainerProps) {
    return (
        <div>
            {React.Children.map(children, child => {
                if (isValidElement(child)) {
                    // 是 React 元素：可以安全使用 cloneElement 注入 props
                    return cloneElement(child, {
                        className: `enhanced ${child.props.className || ""}`,
                    });
                }
                // 不是 React 元素（字符串、数字等）：用 span 包裹
                return <span className="text-wrapper">{child}</span>;
            })}
        </div>
    );
}

function App() {
    return (
        <SmartContainer>
            <p>这是段落</p>
            纯文本内容
            <button>按钮</button>
            {42}
        </SmartContainer>
    );
}

export default App;
```

**运行效果：** p 和 button 元素被注入了 enhanced 类名，纯文本和数字被 span 包裹并添加了 text-wrapper 类名。

### 内部原理

#### $$typeof 检查

```javascript
// React 源码简化
function isValidElement(object) {
    return (
        typeof object === "object" &&
        object !== null &&
        object.$$typeof === REACT_ELEMENT_TYPE  // Symbol.for("react.element")
    );
}
// 只有通过 React.createElement 或 JSX 创建的对象才有正确的 $$typeof
// 手动构造的普通对象不会通过检查
```

#### TypeScript 类型收窄

```typescript
function process(value: ReactNode) {
    if (isValidElement(value)) {
        // 这里 value 的类型被收窄为 ReactElement
        console.log(value.props);   // 合法
        console.log(value.type);    // 合法
        console.log(value.key);     // 合法
    }
}
```

### 适用场景

- **条件渲染：** 根据 children 是元素还是文本做不同处理
- **cloneElement 前置检查：** cloneElement 要求参数是 ReactElement
- **工具函数：** 判断参数类型
- **容器组件：** 只对 React 元素注入 props，跳过文本节点

### 常见问题

#### isValidElement 不检查组件类型

**问题描述：** 想判断子元素是否是特定组件。

**原因分析：** isValidElement 只判断是否是 ReactElement，不区分是什么组件。

**解决方案：**

```tsx
// 检查是否是特定组件
function isSpecificComponent(child: ReactNode, Component: React.ComponentType) {
    return isValidElement(child) && child.type === Component;
}

// 使用
React.Children.forEach(children, child => {
    if (isSpecificComponent(child, TabPanel)) {
        // 是 TabPanel 组件
    }
});
```

### 注意事项

- isValidElement 只检查是否是 ReactElement，不检查组件类型
- 字符串、数字、boolean、null 都返回 false
- 普通对象即使结构类似 ReactElement 也返回 false（缺少 $$typeof）
- TypeScript 中返回类型谓词，可以自动收窄类型
- 配合 React.Children.map 和 cloneElement 使用是常见模式

### 总结

React.isValidElement 通过检查 $$typeof 属性判断值是否为有效的 ReactElement。返回类型谓词可以在 TypeScript 中自动收窄类型。常用于 children 的类型判断、cloneElement 前置检查和容器组件对不同类型子元素的差异化处理。不检查具体的组件类型，需要时通过 `child.type === Component` 判断。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。



## 6.2 状态管理Hooks

## useState的初始状态与更新函数

### 概念说明

`useState` 是 React 最基础的状态 Hook，用于在函数组件中声明和管理状态。它接收一个初始值作为参数，返回一个包含当前状态值和更新函数的数组。每次调用更新函数会触发组件重新渲染，React 会用新的状态值重新执行组件函数。

useState 是 React 16.8 引入的，它让函数组件拥有了和类组件 this.state / this.setState 等价的能力，是 Hooks 体系中使用频率最高的 Hook。

### API 签名与参数

```typescript
function useState<S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>];

type SetStateAction<S> = S | ((prevState: S) => S);
type Dispatch<A> = (value: A) => void;
```

| 参数 | 类型 | 是否必填 | 说明 |
|------|------|----------|------|
| initialState | S \| () => S | 是 | 初始状态值，或返回初始值的函数（惰性初始化） |

**返回值：** `[state, setState]` 元组。state 是当前状态值，setState 是更新函数。

### 基本示例

```tsx
// 示例说明：展示 useState 的基本用法

import React, { useState } from "react";

function Counter() {
    // 声明状态：count 初始值为 0
    const [count, setCount] = useState(0);
    // 声明状态：name 初始值为字符串
    const [name, setName] = useState("张三");

    return (
        <div>
            <p>计数: {count}</p>
            <button onClick={() => setCount(count + 1)}>+1</button>
            <button onClick={() => setCount(0)}>重置</button>

            <p>姓名: {name}</p>
            <input value={name} onChange={e => setName(e.target.value)} />
        </div>
    );
}

export default Counter;
```

**运行效果：** 页面显示计数器和姓名输入框。点击按钮改变计数，输入框实时更新姓名。每次状态变化都触发组件重新渲染。

### 内部原理

#### Hooks 链表结构

React 在 Fiber 节点上维护一个 Hooks 链表，每个 useState 调用对应链表中的一个节点。首次渲染时创建节点并存储初始值，后续渲染时按顺序读取链表中已有的值。这就是为什么 Hooks 不能放在条件语句中——必须保证每次渲染的调用顺序一致。

```javascript
// React 内部简化的 Hooks 结构
fiber.memoizedState = {
    memoizedState: 0,       // 当前状态值
    queue: { pending: null }, // 更新队列
    next: {                  // 下一个 Hook（链表）
        memoizedState: "张三",
        queue: { pending: null },
        next: null
    }
};
```

#### setState 的更新流程

调用 setState 时，React 不会立即更新状态，而是创建一个更新对象放入更新队列。在下一次渲染时，React 从队列中取出所有更新，按顺序计算出最终状态值。

```javascript
// setState 内部简化流程
function dispatchSetState(fiber, queue, action) {
    // 1. 创建更新对象
    const update = { action, next: null };
    // 2. 放入更新队列（环形链表）
    enqueueUpdate(queue, update);
    // 3. 调度重新渲染
    scheduleUpdateOnFiber(fiber);
}
```

### 进阶用法

```tsx
// 进阶场景：管理复杂对象状态

import React, { useState } from "react";

interface FormData {
    username: string;
    email: string;
    age: number;
}

function UserForm() {
    const [form, setForm] = useState<FormData>({
        username: "",
        email: "",
        age: 0,
    });

    // 更新对象的某个属性：必须创建新对象（不可变更新）
    const updateField = (field: keyof FormData, value: string | number) => {
        setForm(prev => ({
            ...prev,         // 展开旧对象
            [field]: value,  // 覆盖指定属性
        }));
    };

    return (
        <div>
            <input
                value={form.username}
                onChange={e => updateField("username", e.target.value)}
                placeholder="用户名"
            />
            <input
                value={form.email}
                onChange={e => updateField("email", e.target.value)}
                placeholder="邮箱"
            />
            <input
                type="number"
                value={form.age}
                onChange={e => updateField("age", Number(e.target.value))}
                placeholder="年龄"
            />
        </div>
    );
}

export default UserForm;
```

### 与相关API的对比

| 对比维度 | useState | useReducer |
|----------|---------|-----------|
| 适用场景 | 简单状态（基本值、简单对象） | 复杂状态逻辑（多字段联动） |
| 更新方式 | 直接设值或函数式更新 | dispatch action |
| 代码量 | 少 | 多（需要定义 reducer） |
| 状态逻辑位置 | 分散在组件内 | 集中在 reducer 函数中 |

### 适用场景

- **基本值状态：** 计数器、开关、输入值
- **简单对象状态：** 表单数据（字段不多时）
- **UI 状态：** 弹窗开关、Tab 选中、展开/折叠
- **临时数据：** 搜索关键词、过滤条件

### 常见问题

#### 直接修改状态对象不触发渲染

**问题描述：** 修改了对象属性但页面没有更新。

**原因分析：** React 通过 Object.is 比较新旧状态，直接修改对象属性引用不变，React 认为状态没变化。

**解决方案：**

```tsx
const [user, setUser] = useState({ name: "张三", age: 25 });

// 错误写法：直接修改对象属性，引用不变
// user.age = 26;
// setUser(user);  // Object.is(oldUser, newUser) === true，不触发渲染

// 正确写法：创建新对象
setUser({ ...user, age: 26 });
// 或函数式更新
setUser(prev => ({ ...prev, age: 26 }));
```

#### 更新后立即读取状态值还是旧的

**问题描述：** setState 后立即 console.log(state) 输出旧值。

**原因分析：** setState 是异步的，state 在当前渲染闭包中不会变化，要等到下一次渲染才更新。

**解决方案：**

```tsx
const [count, setCount] = useState(0);

function handleClick() {
    setCount(count + 1);
    console.log(count);  // 还是 0，不是 1
    // 状态值在下一次渲染时才更新
    // 如果需要在更新后执行操作，用 useEffect 监听 count 变化
}
```

### 注意事项

- useState 不能放在条件语句、循环、嵌套函数中
- setState 使用 Object.is 比较，相同值不触发重渲染
- 对象/数组状态必须创建新引用才能触发更新
- setState 在当前渲染周期内是"异步"的
- 初始值只在首次渲染时使用，后续渲染忽略

### 总结

useState 是函数组件管理状态的基础 Hook，返回状态值和更新函数。内部通过 Fiber 节点上的 Hooks 链表存储状态，setState 将更新入队后调度重渲染。对象/数组状态必须创建新引用才能触发更新。简单状态用 useState，复杂逻辑用 useReducer。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useState的函数式初始值(惰性初始化)

### 概念说明

`useState` 支持传入一个函数作为初始值，称为惰性初始化（Lazy Initialization）。这个函数只在组件首次渲染时执行一次，后续重新渲染时会被忽略。适用于初始值的计算开销较大的场景，如从 localStorage 读取数据、解析大型数据结构等。

如果直接传入表达式（而非函数），该表达式在每次渲染时都会执行，即使结果只在首次渲染时使用。惰性初始化避免了这种不必要的重复计算。

### API 签名与参数

```typescript
// 直接传值
const [state, setState] = useState(initialValue);

// 惰性初始化（传入函数）
const [state, setState] = useState(() => computeExpensiveValue());
```

| 传参方式 | 执行时机 | 适用场景 |
|----------|---------|---------|
| 直接传值 | 每次渲染都求值（但只首次使用） | 简单值（0、""、true） |
| 传入函数 | 只在首次渲染时执行 | 昂贵计算、localStorage 读取 |

### 基本示例

```tsx
// 示例说明：对比直接传值和惰性初始化的区别

import React, { useState } from "react";

// 模拟昂贵计算
function getInitialTodos() {
    console.log("执行了昂贵的初始化计算");
    // 假设这里从 localStorage 读取或做复杂计算
    const stored = localStorage.getItem("todos");
    return stored ? JSON.parse(stored) : [];
}

// 错误做法：每次渲染都执行 getInitialTodos()
function TodoListBad() {
    // getInitialTodos() 每次渲染都执行，浪费性能
    const [todos, setTodos] = useState(getInitialTodos());
    return <div>{todos.length} 个待办</div>;
}

// 正确做法：传入函数，只在首次渲染时执行
function TodoListGood() {
    // 传入函数引用，React 只在首次渲染时调用它
    const [todos, setTodos] = useState(() => getInitialTodos());
    // 或直接传函数引用
    // const [todos, setTodos] = useState(getInitialTodos);

    const addTodo = (text: string) => {
        setTodos(prev => [...prev, { id: Date.now(), text }]);
    };

    return (
        <div>
            <p>{todos.length} 个待办</p>
            <button onClick={() => addTodo("新任务")}>添加</button>
        </div>
    );
}

export default TodoListGood;
```

**运行效果：** TodoListGood 只在首次渲染时执行一次 localStorage 读取，后续点击按钮触发的重渲染不会重复执行初始化函数。

### 内部原理

#### React 对惰性初始化的处理

```javascript
// React 内部简化逻辑
function mountState(initialState) {
    const hook = mountWorkInProgressHook();
    // 如果 initialState 是函数，调用它获取初始值
    if (typeof initialState === "function") {
        initialState = initialState();  // 只在 mount 时调用
    }
    hook.memoizedState = initialState;
    // ...
    return [hook.memoizedState, dispatchSetState];
}

function updateState() {
    const hook = updateWorkInProgressHook();
    // 更新阶段完全不关心 initialState，直接从 hook 链表读取
    // ...
    return [hook.memoizedState, dispatchSetState];
}
```

首次渲染（mount）时检查 initialState 是否是函数并调用。后续渲染（update）时直接跳过初始值，从 Hooks 链表读取已有的状态。

### 适用场景

- **localStorage/sessionStorage 读取：** 初始化时从存储读取数据
- **URL 参数解析：** 从 URL 中解析初始状态
- **大型数据处理：** 初始化时做复杂数据转换
- **第三方库初始化：** 创建开销较大的初始对象

### 常见问题

#### 传入函数调用和传入函数引用的区别

**问题描述：** `useState(fn())` 和 `useState(fn)` 的行为不同。

**解决方案：**

```tsx
// useState(fn())：每次渲染都执行 fn()，传入的是返回值
const [state, setState] = useState(getInitialValue());  // fn 每次都执行

// useState(fn)：传入函数引用，React 只在首次渲染时调用
const [state, setState] = useState(getInitialValue);    // fn 只执行一次

// useState(() => fn())：箭头函数包裹，同样只首次执行
const [state, setState] = useState(() => getInitialValue());
```

### 注意事项

- 初始化函数只在首次渲染时执行一次
- 初始化函数必须是纯函数，不应有副作用
- 简单值（0、""、true、[]）直接传入即可，不需要惰性初始化
- 注意 `useState(fn)` 和 `useState(fn())` 的区别
- 初始化函数不接收参数

### 总结

惰性初始化通过传入函数让 useState 的初始值只在首次渲染时计算。适用于 localStorage 读取、复杂计算等开销较大的初始化场景。注意 `useState(fn)` 传函数引用和 `useState(fn())` 传调用结果的区别。简单值不需要惰性初始化。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useState的批量更新(Batching)机制

### 概念说明

批量更新（Batching）是 React 的性能优化机制。当在同一个事件处理函数中多次调用 setState 时，React 不会每次调用都触发一次重新渲染，而是将所有更新收集起来，合并为一次渲染。这避免了不必要的中间渲染，提升了性能。

React 18 引入了自动批处理（Automatic Batching），将批量更新扩展到了所有场景——包括 setTimeout、Promise.then、原生事件处理器等。在 React 17 及之前，只有 React 合成事件和生命周期方法中的更新才会被批处理。

### 基本示例

```tsx
// 示例说明：展示批量更新的行为

import React, { useState } from "react";

function BatchingDemo() {
    const [count, setCount] = useState(0);
    const [flag, setFlag] = useState(false);

    console.log("组件渲染了"); // 观察渲染次数

    // React 18：两次 setState 只触发一次渲染（自动批处理）
    const handleClick = () => {
        setCount(c => c + 1);  // 不会立即渲染
        setFlag(f => !f);      // 不会立即渲染
        // 两个更新合并，只触发一次渲染
    };

    // React 18：setTimeout 中也自动批处理
    const handleAsync = () => {
        setTimeout(() => {
            setCount(c => c + 1);  // React 18：不会立即渲染
            setFlag(f => !f);      // React 18：不会立即渲染
            // 合并为一次渲染
            // React 17：这里会触发两次渲染（不在批处理范围内）
        }, 0);
    };

    return (
        <div>
            <p>count: {count}, flag: {String(flag)}</p>
            <button onClick={handleClick}>同步更新</button>
            <button onClick={handleAsync}>异步更新</button>
        </div>
    );
}

export default BatchingDemo;
```

**运行效果：** 无论点击哪个按钮，React 18 中都只触发一次渲染。控制台只输出一次"组件渲染了"。

### 内部原理

#### 批处理的执行流程

```javascript
// React 18 的自动批处理简化逻辑
let isBatchingUpdates = false;
let pendingUpdates = [];

function setState(update) {
    pendingUpdates.push(update);
    if (!isBatchingUpdates) {
        // 通过微任务调度，确保同步代码执行完后再统一处理
        queueMicrotask(() => {
            isBatchingUpdates = true;
            // 一次性处理所有待更新
            flushUpdates(pendingUpdates);
            pendingUpdates = [];
            isBatchingUpdates = false;
        });
    }
}
```

React 18 使用 `createRoot` 启用并发模式后，所有更新默认进入自动批处理。底层通过调度机制（Scheduler）将同一轮事件循环中的更新合并。

### 与相关API的对比

| 对比维度 | React 17 批处理 | React 18 自动批处理 |
|----------|----------------|-------------------|
| 合成事件中 | 批处理 | 批处理 |
| 生命周期/useEffect 中 | 批处理 | 批处理 |
| setTimeout 中 | 不批处理（每次 setState 都渲染） | 批处理 |
| Promise.then 中 | 不批处理 | 批处理 |
| 原生事件中 | 不批处理 | 批处理 |

### 适用场景

- **表单提交：** 同时更新多个状态字段
- **数据加载：** 同时设置数据和加载状态
- **复杂交互：** 一个操作需要更新多个独立状态

### 常见问题

#### 需要在某次更新后立即读取 DOM

**问题描述：** 批处理导致 DOM 更新延迟，需要强制同步刷新。

**原因分析：** 批处理将多次更新合并为一次渲染，中间状态不会反映到 DOM。

**解决方案：**

```tsx
import { flushSync } from "react-dom";

function handleClick() {
    // flushSync 强制同步刷新，跳出批处理
    flushSync(() => {
        setCount(c => c + 1);
    });
    // 这里 DOM 已经更新
    console.log(document.getElementById("count")?.textContent);

    flushSync(() => {
        setFlag(f => !f);
    });
    // 这里 DOM 再次更新
    // 总共触发两次渲染
}
```

### 注意事项

- React 18 的自动批处理需要使用 `createRoot` 而非 `ReactDOM.render`
- 批处理不影响状态的最终正确性，只减少中间渲染次数
- `flushSync` 可以强制跳出批处理，但应该极少使用
- 函数式更新 `setState(prev => ...)` 在批处理中能正确基于前值更新
- 批处理是性能优化，开发者通常不需要特别关注

### 总结

React 18 的自动批处理将所有场景中的多次 setState 合并为一次渲染，包括 setTimeout、Promise、原生事件等。这是对 React 17 只在合成事件中批处理的扩展。极少数需要同步更新的场景可以用 flushSync。批处理减少了不必要的渲染，提升性能。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useState的闭包陷阱与陈旧状态

### 概念说明

闭包陷阱（Stale Closure）是 React 函数组件中最常见的 bug 来源之一。函数组件每次渲染都会创建一个新的闭包，闭包中捕获的是当次渲染时的状态值。如果在异步操作（setTimeout、事件监听、Promise）中引用了状态值，拿到的是闭包创建时的旧值，不是最新的值。

这不是 React 的 bug，而是 JavaScript 闭包的正常行为。理解这个机制对写出正确的 React 代码至关重要。

### 基本示例

```tsx
// 示例说明：展示闭包陷阱的典型场景

import React, { useState, useRef, useEffect } from "react";

function ClosureTrap() {
    const [count, setCount] = useState(0);

    // 闭包陷阱：setTimeout 中的 count 是创建回调时的值
    const handleDelayedAlert = () => {
        setTimeout(() => {
            // 这里的 count 是点击按钮时的值，不是 3 秒后的最新值
            alert(`count 是: ${count}`);
        }, 3000);
    };
    // 快速点击 5 次 +1，然后点击延迟弹窗
    // 3 秒后弹窗显示的是点击"延迟弹窗"时的 count 值，不是最新值

    return (
        <div>
            <p>count: {count}</p>
            <button onClick={() => setCount(c => c + 1)}>+1</button>
            <button onClick={handleDelayedAlert}>延迟3秒弹窗</button>
        </div>
    );
}

export default ClosureTrap;
```

**运行效果：** 点击"+1"增加计数，然后点击"延迟弹窗"，在等待期间继续点击"+1"。3秒后弹窗显示的是点击弹窗按钮时的旧值，而非最新值。

### 内部原理

#### 每次渲染都是独立的闭包

```javascript
// 第 1 次渲染：count = 0
function ClosureTrap() {
    const count = 0;  // 这次渲染中 count 始终是 0
    const handleClick = () => {
        setTimeout(() => {
            alert(count);  // 永远弹出 0
        }, 3000);
    };
}

// 第 2 次渲染（点击 +1 后）：count = 1
function ClosureTrap() {
    const count = 1;  // 这次渲染中 count 始终是 1
    // 但之前创建的 setTimeout 回调仍然引用第 1 次渲染的 count = 0
}
```

每次渲染都是一个独立的函数调用，有自己的作用域。异步回调捕获的是创建它时所在渲染的变量值。

### 进阶用法

```tsx
// 解决闭包陷阱的几种方案

import React, { useState, useRef, useCallback, useEffect } from "react";

function SolutionDemo() {
    const [count, setCount] = useState(0);

    // 方案1：useRef 保存最新值
    const countRef = useRef(count);
    countRef.current = count;  // 每次渲染同步最新值到 ref

    const handleDelayedAlert1 = () => {
        setTimeout(() => {
            // ref.current 始终是最新值
            alert(`最新 count: ${countRef.current}`);
        }, 3000);
    };

    // 方案2：函数式更新获取最新值（适用于 setState 场景）
    const handleTripleIncrement = () => {
        // 错误：三次都基于同一个闭包中的 count，结果只 +1
        // setCount(count + 1);
        // setCount(count + 1);
        // setCount(count + 1);

        // 正确：函数式更新，每次基于最新的 prev 值
        setCount(prev => prev + 1);
        setCount(prev => prev + 1);
        setCount(prev => prev + 1);
        // 结果 +3
    };

    return (
        <div>
            <p>count: {count}</p>
            <button onClick={() => setCount(c => c + 1)}>+1</button>
            <button onClick={handleDelayedAlert1}>ref方案弹窗</button>
            <button onClick={handleTripleIncrement}>+3</button>
        </div>
    );
}

export default SolutionDemo;
```

### 常见问题

#### useEffect 中的闭包陷阱

**问题描述：** useEffect 中使用了 state 值，但拿到的是旧值。

**原因分析：** useEffect 的回调也是闭包，捕获的是当次渲染的值。如果依赖项数组不正确，回调不会重新创建，一直引用旧值。

**解决方案：**

```tsx
// 错误：空依赖数组，interval 回调永远用初始 count = 0
// useEffect(() => {
//     const id = setInterval(() => {
//         setCount(count + 1);  // 永远是 0 + 1 = 1
//     }, 1000);
//     return () => clearInterval(id);
// }, []);

// 正确方案1：函数式更新
useEffect(() => {
    const id = setInterval(() => {
        setCount(prev => prev + 1);  // 基于最新值 +1
    }, 1000);
    return () => clearInterval(id);
}, []);

// 正确方案2：把 count 加入依赖项（但每次都重新创建定时器）
useEffect(() => {
    const id = setInterval(() => {
        setCount(count + 1);
    }, 1000);
    return () => clearInterval(id);
}, [count]);
```

### 适用场景

- **定时器：** setInterval/setTimeout 中使用状态值
- **事件监听：** addEventListener 回调中使用状态值
- **异步请求：** fetch/axios 回调中使用状态值
- **动画帧：** requestAnimationFrame 回调中使用状态值

### 注意事项

- 函数组件每次渲染创建新的闭包，捕获当次渲染的值
- 异步回调中的状态值可能是旧的（陈旧闭包）
- 用 useRef 存储最新值是读取最新状态的通用方案
- 函数式更新 `setState(prev => ...)` 解决基于前值更新的问题
- ESLint 的 exhaustive-deps 规则能帮助发现依赖遗漏

### 总结

闭包陷阱源于 JavaScript 闭包机制——每次渲染的闭包捕获当次的状态值。异步回调中拿到的可能是旧值。解决方案包括：useRef 存储最新值、函数式 setState 基于前值更新、正确设置 useEffect 依赖项。理解闭包陷阱是写正确 React 代码的关键。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useState的函数式更新(prev => next)

### 概念说明

`setState` 除了直接传入新值外，还支持传入一个函数，该函数接收前一个状态值作为参数，返回新的状态值。这种方式称为函数式更新（Functional Update）。函数式更新能确保每次更新都基于最新的状态值，避免了闭包陷阱中因捕获旧值导致的错误。

当多次 setState 调用被批量处理时，函数式更新能正确地链式计算：第一次更新的结果作为第二次更新的输入，依此类推。

### API 签名与参数

```typescript
// 直接传值
setState(newValue: S): void;

// 函数式更新
setState((prevState: S) => S): void;
```

| 更新方式 | 语法 | 行为 |
|----------|------|------|
| 直接传值 | `setState(newValue)` | 用 newValue 替换当前状态 |
| 函数式更新 | `setState(prev => newValue)` | 基于前一个状态计算新状态 |

### 基本示例

```tsx
// 示例说明：对比直接传值和函数式更新在批量调用时的差异

import React, { useState } from "react";

function CounterDemo() {
    const [count, setCount] = useState(0);

    // 直接传值：三次调用结果都是 count + 1 = 1（基于同一个闭包中的 count）
    const addThreeBad = () => {
        setCount(count + 1);  // 0 + 1 = 1
        setCount(count + 1);  // 0 + 1 = 1（count 还是 0）
        setCount(count + 1);  // 0 + 1 = 1（count 还是 0）
        // 最终结果：1（不是 3）
    };

    // 函数式更新：每次基于前一个值计算，正确 +3
    const addThreeGood = () => {
        setCount(prev => prev + 1);  // 0 + 1 = 1
        setCount(prev => prev + 1);  // 1 + 1 = 2
        setCount(prev => prev + 1);  // 2 + 1 = 3
        // 最终结果：3
    };

    return (
        <div>
            <p>count: {count}</p>
            <button onClick={addThreeBad}>直接传值 +3（实际只+1）</button>
            <button onClick={addThreeGood}>函数式更新 +3（正确）</button>
        </div>
    );
}

export default CounterDemo;
```

**运行效果：** 点击"直接传值"按钮只加1，点击"函数式更新"按钮正确加3。

### 内部原理

#### 更新队列的处理

```javascript
// React 处理更新队列时的简化逻辑
function processUpdateQueue(queue, baseState) {
    let newState = baseState;
    let update = queue.first;

    while (update !== null) {
        if (typeof update.action === "function") {
            // 函数式更新：用前一个状态作为参数调用函数
            newState = update.action(newState);
        } else {
            // 直接传值：直接替换
            newState = update.action;
        }
        update = update.next;
    }

    return newState;
}

// 三次直接传值 setCount(count + 1)：
// queue: [1, 1, 1]  最终结果 1

// 三次函数式更新 setCount(prev => prev + 1)：
// queue: [fn, fn, fn]  fn(0)=1, fn(1)=2, fn(2)=3 最终结果 3
```

### 适用场景

- **基于前值更新：** 计数器增减、切换布尔值
- **批量更新：** 同一事件中多次更新同一状态
- **异步回调：** setTimeout/Promise 中更新状态（避免闭包陷阱）
- **数组/对象操作：** 向数组添加元素、更新对象属性

### 进阶用法

```tsx
// 进阶场景：数组和对象的函数式更新

import React, { useState } from "react";

interface Todo {
    id: number;
    text: string;
    done: boolean;
}

function TodoApp() {
    const [todos, setTodos] = useState<Todo[]>([]);

    // 添加元素
    const addTodo = (text: string) => {
        setTodos(prev => [...prev, { id: Date.now(), text, done: false }]);
    };

    // 删除元素
    const removeTodo = (id: number) => {
        setTodos(prev => prev.filter(todo => todo.id !== id));
    };

    // 切换完成状态
    const toggleTodo = (id: number) => {
        setTodos(prev =>
            prev.map(todo =>
                todo.id === id ? { ...todo, done: !todo.done } : todo
            )
        );
    };

    return (
        <div>
            <button onClick={() => addTodo("新任务")}>添加</button>
            {todos.map(todo => (
                <div key={todo.id}>
                    <span style={{ textDecoration: todo.done ? "line-through" : "none" }}>
                        {todo.text}
                    </span>
                    <button onClick={() => toggleTodo(todo.id)}>切换</button>
                    <button onClick={() => removeTodo(todo.id)}>删除</button>
                </div>
            ))}
        </div>
    );
}

export default TodoApp;
```

### 常见问题

#### 什么时候必须用函数式更新

**问题描述：** 不确定什么时候该用直接传值还是函数式更新。

**解决方案：**

```tsx
// 规则：如果新值依赖旧值，用函数式更新
setCount(prev => prev + 1);           // 依赖旧值，函数式
setItems(prev => [...prev, newItem]); // 依赖旧值，函数式
setFlag(prev => !prev);               // 依赖旧值，函数式

// 规则：如果新值与旧值无关，直接传值即可
setName("张三");                       // 不依赖旧值，直接传
setCount(0);                           // 重置，不依赖旧值，直接传
setItems([]);                          // 清空，不依赖旧值，直接传
```

### 注意事项

- 函数式更新能避免闭包陷阱中的陈旧状态问题
- 多次调用时，函数式更新能正确链式计算
- 更新函数必须是纯函数，不能有副作用
- 更新函数返回的值如果和当前值相同（Object.is），不触发重渲染
- 复杂的状态更新逻辑建议改用 useReducer

### 总结

函数式更新 `setState(prev => next)` 确保每次更新基于最新的状态值，避免闭包陷阱和批量更新中的旧值问题。新值依赖旧值时用函数式更新，新值与旧值无关时直接传值。更新函数是纯函数，在更新队列中链式执行。复杂更新逻辑推荐用 useReducer。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useReducer的reducer函数定义

### 概念说明

`useReducer` 是 React 提供的状态管理 Hook，适用于复杂的状态逻辑。它的核心是 reducer 函数——一个纯函数，接收当前状态和动作对象，返回新的状态。reducer 的概念借鉴自 Redux，遵循 `(state, action) => newState` 的模式。

useReducer 将状态更新逻辑从组件中抽离到独立的 reducer 函数中，让状态变化可预测、可测试。当一个状态的更新依赖多个字段，或者有多种不同类型的更新操作时，useReducer 比多个 useState 更清晰。

### API 签名与参数

```typescript
function useReducer<R extends Reducer<any, any>>(
    reducer: R,
    initialArg: ReducerState<R>,
    init?: (arg: ReducerState<R>) => ReducerState<R>
): [ReducerState<R>, Dispatch<ReducerAction<R>>];

// Reducer 类型
type Reducer<S, A> = (state: S, action: A) => S;
```

| 参数 | 类型 | 是否必填 | 说明 |
|------|------|----------|------|
| reducer | (state, action) => newState | 是 | 纯函数，根据 action 计算新状态 |
| initialArg | S | 是 | 初始状态值 |
| init | (arg) => S | 否 | 惰性初始化函数 |

**返回值：** `[state, dispatch]` 元组。state 是当前状态，dispatch 是发送动作的函数。

### 基本示例

```tsx
// 示例说明：用 useReducer 实现计数器

import React, { useReducer } from "react";

// 定义状态类型
interface CounterState {
    count: number;
}

// 定义动作类型（使用联合类型实现类型安全）
type CounterAction =
    | { type: "increment" }
    | { type: "decrement" }
    | { type: "reset"; payload: number }
    | { type: "set"; payload: number };

// reducer 函数：纯函数，不能有副作用
function counterReducer(state: CounterState, action: CounterAction): CounterState {
    switch (action.type) {
        case "increment":
            return { count: state.count + 1 };
        case "decrement":
            return { count: state.count - 1 };
        case "reset":
            return { count: action.payload };
        case "set":
            return { count: action.payload };
        default:
            // TypeScript 的 never 类型确保所有 action 都被处理
            const _exhaustive: never = action;
            return state;
    }
}

function Counter() {
    const [state, dispatch] = useReducer(counterReducer, { count: 0 });

    return (
        <div>
            <p>计数: {state.count}</p>
            <button onClick={() => dispatch({ type: "increment" })}>+1</button>
            <button onClick={() => dispatch({ type: "decrement" })}>-1</button>
            <button onClick={() => dispatch({ type: "reset", payload: 0 })}>重置</button>
            <button onClick={() => dispatch({ type: "set", payload: 100 })}>设为100</button>
        </div>
    );
}

export default Counter;
```

**运行效果：** 计数器支持增减、重置和设置指定值，所有状态变化都通过 dispatch action 触发。

### 内部原理

#### reducer 的执行流程

```javascript
// React 内部简化逻辑
function updateReducer(reducer) {
    const hook = updateWorkInProgressHook();
    const queue = hook.queue;
    let newState = hook.memoizedState;

    // 遍历更新队列中的所有 action
    let update = queue.pending;
    while (update !== null) {
        // 调用 reducer 计算新状态
        newState = reducer(newState, update.action);
        update = update.next;
    }

    hook.memoizedState = newState;
    return [newState, queue.dispatch];
}
```

#### reducer 必须是纯函数

reducer 不能修改传入的 state 对象，必须返回新对象。不能有副作用（网络请求、DOM 操作、随机数等）。React 在 Strict Mode 下会调用 reducer 两次来检测不纯的行为。

### 适用场景

- **复杂状态逻辑：** 状态有多个字段且更新逻辑复杂
- **多种更新类型：** 同一个状态有多种不同的更新方式
- **状态依赖关系：** 一个字段的更新依赖其他字段的值
- **可测试性要求：** reducer 是纯函数，容易单元测试

### 常见问题

#### reducer 中直接修改了 state

**问题描述：** 状态更新后组件没有重新渲染。

**原因分析：** 直接修改 state 对象，引用不变，React 检测不到变化。

**解决方案：**

```tsx
// 错误写法：直接修改 state
function badReducer(state: { items: string[] }, action: { type: "add"; item: string }) {
    // state.items.push(action.item);  // 直接修改，引用不变
    // return state;                    // 返回同一个引用，不触发渲染
    return state;
}

// 正确写法：创建新对象
function goodReducer(state: { items: string[] }, action: { type: "add"; item: string }) {
    return {
        ...state,
        items: [...state.items, action.item],  // 创建新数组
    };
}
```

### 注意事项

- reducer 必须是纯函数，不能有副作用
- 必须返回新的状态对象，不能修改原 state
- switch 语句中的 default 分支应返回当前 state
- TypeScript 中用联合类型定义 action 确保类型安全
- reducer 函数定义在组件外部，避免每次渲染重新创建

### 总结

useReducer 的核心是 reducer 纯函数，遵循 `(state, action) => newState` 模式。将状态更新逻辑集中管理，让状态变化可预测、可测试。必须返回新对象不能直接修改 state。TypeScript 中用联合类型定义 action 确保所有操作类型被正确处理。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useReducer的初始状态与惰性初始化

### 概念说明

`useReducer` 支持两种初始化方式。第一种是直接传入初始状态作为第二个参数；第二种是惰性初始化——传入原始参数作为第二个参数，再传入一个初始化函数作为第三个参数，React 会用 `init(initialArg)` 计算初始状态。

惰性初始化的优势在于：初始化逻辑可以提取到 reducer 外部，方便复用；初始化函数只在首次渲染时执行；还可以用于实现"重置到初始状态"的功能。

### API 签名与参数

```typescript
// 方式1：直接传入初始状态
useReducer(reducer, initialState);

// 方式2：惰性初始化
useReducer(reducer, initialArg, init);
// 初始状态 = init(initialArg)
```

| 参数 | 类型 | 说明 |
|------|------|------|
| reducer | (state, action) => newState | 状态更新函数 |
| initialArg | any | 直接初始值或传给 init 的参数 |
| init | (arg) => State | 惰性初始化函数（可选） |

### 基本示例

```tsx
// 示例说明：展示两种初始化方式和惰性初始化的重置功能

import React, { useReducer } from "react";

interface TodoState {
    todos: { id: number; text: string; done: boolean }[];
    filter: "all" | "active" | "done";
}

type TodoAction =
    | { type: "add"; text: string }
    | { type: "toggle"; id: number }
    | { type: "setFilter"; filter: TodoState["filter"] }
    | { type: "reset" };

// 惰性初始化函数：从 props 计算初始状态
function createInitialState(initialTodos: string[]): TodoState {
    console.log("初始化函数执行"); // 只在首次渲染时执行
    return {
        todos: initialTodos.map((text, i) => ({ id: i, text, done: false })),
        filter: "all",
    };
}

function todoReducer(state: TodoState, action: TodoAction): TodoState {
    switch (action.type) {
        case "add":
            return {
                ...state,
                todos: [...state.todos, { id: Date.now(), text: action.text, done: false }],
            };
        case "toggle":
            return {
                ...state,
                todos: state.todos.map(t =>
                    t.id === action.id ? { ...t, done: !t.done } : t
                ),
            };
        case "setFilter":
            return { ...state, filter: action.filter };
        case "reset":
            // 重置：无法直接用 initialArg，需要在组件中处理
            return createInitialState([]);
        default:
            return state;
    }
}

// 使用惰性初始化
function TodoApp({ defaultTodos }: { defaultTodos: string[] }) {
    // 第三个参数 createInitialState 只在首次渲染时执行
    const [state, dispatch] = useReducer(
        todoReducer,
        defaultTodos,          // initialArg：传给 init 的参数
        createInitialState     // init：惰性初始化函数
    );

    return (
        <div>
            <p>待办数量: {state.todos.length}</p>
            <button onClick={() => dispatch({ type: "add", text: "新任务" })}>
                添加
            </button>
            <button onClick={() => dispatch({ type: "reset" })}>重置</button>
        </div>
    );
}

export default TodoApp;
```

**运行效果：** 组件首次渲染时执行初始化函数，将传入的默认待办转为状态对象。后续渲染不再执行初始化。

### 内部原理

#### 惰性初始化的执行时机

```javascript
// React 内部简化逻辑
function mountReducer(reducer, initialArg, init) {
    const hook = mountWorkInProgressHook();

    // 如果有 init 函数，用它计算初始状态
    const initialState = init !== undefined
        ? init(initialArg)   // 惰性初始化：init(initialArg)
        : initialArg;        // 直接使用 initialArg

    hook.memoizedState = initialState;
    // ...
}
```

### 与相关API的对比

| 对比维度 | 直接传入初始状态 | 惰性初始化 |
|----------|----------------|-----------|
| 语法 | `useReducer(reducer, state)` | `useReducer(reducer, arg, init)` |
| 执行时机 | 每次渲染都求值（仅首次使用） | init 只在首次渲染执行 |
| 重置功能 | 需要额外保存初始值 | init 函数可复用于重置 |
| 适用场景 | 初始值简单 | 初始值需要计算 |

### 适用场景

- **从 props 计算初始状态：** 需要对 props 做转换后作为初始状态
- **昂贵初始化：** 初始状态计算开销较大
- **重置功能：** 需要将状态重置到初始值

### 注意事项

- init 函数只在首次渲染时执行一次
- init 函数必须是纯函数
- 惰性初始化让初始化逻辑可以独立测试
- 直接传入对象字面量每次渲染都创建新对象（但只首次使用）
- 简单初始状态直接传入即可，不需要惰性初始化

### 总结

useReducer 支持惰性初始化，通过第三个参数 init 函数在首次渲染时计算初始状态。这样初始化逻辑可复用（如重置功能）、可测试，且避免不必要的重复计算。简单初始状态直接传入第二个参数即可。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useReducer的dispatch动作分发

### 概念说明

`dispatch` 是 useReducer 返回的动作分发函数，用于向 reducer 发送动作（action）来触发状态更新。调用 `dispatch(action)` 后，React 会用当前状态和传入的 action 调用 reducer 函数，计算出新状态并触发重新渲染。

dispatch 函数的引用在组件的整个生命周期中保持稳定（referential identity），不会因为重新渲染而改变。这意味着它可以安全地传递给子组件，不会导致不必要的重渲染，也可以从 useEffect 的依赖数组中省略。

### API 签名与参数

```typescript
type Dispatch<A> = (action: A) => void;

// action 通常是一个包含 type 字段的对象
interface Action {
    type: string;
    payload?: any;
}
```

| 参数 | 类型 | 说明 |
|------|------|------|
| action | A | 动作对象，通常包含 type 和可选的 payload |

**返回值：** `void`，dispatch 没有返回值。

### 基本示例

```tsx
// 示例说明：展示 dispatch 的各种使用方式

import React, { useReducer } from "react";

interface State {
    count: number;
    step: number;
}

type Action =
    | { type: "increment" }
    | { type: "decrement" }
    | { type: "setStep"; payload: number }
    | { type: "reset" };

function reducer(state: State, action: Action): State {
    switch (action.type) {
        case "increment":
            return { ...state, count: state.count + state.step };
        case "decrement":
            return { ...state, count: state.count - state.step };
        case "setStep":
            return { ...state, step: action.payload };
        case "reset":
            return { count: 0, step: 1 };
        default:
            return state;
    }
}

function StepCounter() {
    const [state, dispatch] = useReducer(reducer, { count: 0, step: 1 });

    return (
        <div>
            <p>计数: {state.count}（步长: {state.step}）</p>
            {/* dispatch 不同类型的 action */}
            <button onClick={() => dispatch({ type: "increment" })}>增加</button>
            <button onClick={() => dispatch({ type: "decrement" })}>减少</button>
            <button onClick={() => dispatch({ type: "reset" })}>重置</button>

            <label>
                步长:
                <input
                    type="number"
                    value={state.step}
                    onChange={e => dispatch({
                        type: "setStep",
                        payload: Number(e.target.value)
                    })}
                />
            </label>
        </div>
    );
}

export default StepCounter;
```

**运行效果：** 计数器按照设定的步长增减，修改步长输入框改变每次增减的幅度，重置按钮恢复初始状态。

### 内部原理

#### dispatch 的稳定引用

```javascript
// React 内部简化逻辑
function mountReducer(reducer, initialState) {
    const hook = mountWorkInProgressHook();
    hook.memoizedState = initialState;

    const queue = { pending: null, dispatch: null };
    // dispatch 通过 bind 绑定了 fiber 和 queue，引用稳定
    queue.dispatch = dispatchReducerAction.bind(null, currentFiber, queue);
    hook.queue = queue;

    return [hook.memoizedState, queue.dispatch];
}

// 后续渲染时返回同一个 dispatch 引用
function updateReducer(reducer) {
    const hook = updateWorkInProgressHook();
    // dispatch 引用不变
    return [hook.memoizedState, hook.queue.dispatch];
}
```

#### dispatch 触发的更新流程

调用 dispatch 后，action 被放入更新队列，React 调度一次重新渲染。在渲染阶段，React 从队列中取出所有 action，依次调用 reducer 计算最终状态。

### 适用场景

- **事件处理：** 按钮点击、表单提交等用户交互
- **子组件通信：** 将 dispatch 传递给子组件，子组件通过 dispatch 通知父组件
- **异步操作后更新：** 在 fetch/Promise 完成后 dispatch 更新结果

### 常见问题

#### dispatch 后状态不会立即更新

**问题描述：** dispatch 后立即读取 state，值还是旧的。

**原因分析：** 和 setState 一样，dispatch 是异步的，state 在当前渲染闭包中不变。

**解决方案：**

```tsx
const handleClick = () => {
    dispatch({ type: "increment" });
    // state.count 这里还是旧值
    // 需要在下一次渲染或 useEffect 中读取新值
};
```

### 注意事项

- dispatch 引用稳定，可以安全地从依赖数组中省略
- dispatch 后状态不会立即更新（和 setState 一致）
- dispatch 的 action 应该描述"发生了什么"，而不是"怎么更新"
- 多次 dispatch 在同一事件中会被批量处理（React 18）
- dispatch 传递给子组件比传递回调函数更稳定（不会因父组件渲染而创建新引用）

### 总结

dispatch 是 useReducer 返回的动作分发函数，引用在组件生命周期内稳定不变。通过发送包含 type 的 action 对象触发 reducer 计算新状态。dispatch 的稳定引用使其适合传递给子组件，不会导致不必要的重渲染。dispatch 后状态在当前渲染中不会立即更新。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useReducer的复杂状态逻辑管理

### 概念说明

useReducer 在管理复杂状态逻辑时优势明显。当一个组件的状态包含多个相互关联的字段，或者同一个操作需要同时更新多个字段时，使用多个 useState 会导致状态更新分散、逻辑混乱。useReducer 将所有状态更新逻辑集中到一个 reducer 函数中，每种操作对应一个 action type，状态变化清晰可追踪。

典型场景包括：表单管理（多字段联动）、数据请求（loading/error/data 三态）、购物车（增删改查）、多步骤流程（步骤切换、数据回填）等。

### 基本示例

```tsx
// 示例说明：用 useReducer 管理数据请求的三态

import React, { useReducer, useEffect } from "react";

// 状态类型：包含多个关联字段
interface FetchState<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
}

// 动作类型
type FetchAction<T> =
    | { type: "FETCH_START" }
    | { type: "FETCH_SUCCESS"; payload: T }
    | { type: "FETCH_ERROR"; payload: string };

// 通用的数据请求 reducer
function fetchReducer<T>(state: FetchState<T>, action: FetchAction<T>): FetchState<T> {
    switch (action.type) {
        case "FETCH_START":
            // 开始请求：设置 loading，清除旧错误
            return { data: null, loading: true, error: null };
        case "FETCH_SUCCESS":
            // 请求成功：设置数据，关闭 loading
            return { data: action.payload, loading: false, error: null };
        case "FETCH_ERROR":
            // 请求失败：设置错误信息，关闭 loading
            return { data: null, loading: false, error: action.payload };
        default:
            return state;
    }
}

interface User {
    id: number;
    name: string;
}

function UserList() {
    const [state, dispatch] = useReducer(fetchReducer<User[]>, {
        data: null,
        loading: false,
        error: null,
    });

    useEffect(() => {
        dispatch({ type: "FETCH_START" });

        fetch("/api/users")
            .then(res => res.json())
            .then(data => dispatch({ type: "FETCH_SUCCESS", payload: data }))
            .catch(err => dispatch({ type: "FETCH_ERROR", payload: err.message }));
    }, []);

    if (state.loading) return <p>加载中...</p>;
    if (state.error) return <p>错误: {state.error}</p>;
    if (!state.data) return null;

    return (
        <ul>
            {state.data.map(user => (
                <li key={user.id}>{user.name}</li>
            ))}
        </ul>
    );
}

export default UserList;
```

**运行效果：** 组件挂载后显示"加载中"，请求成功后显示用户列表，失败则显示错误信息。三个状态字段通过 reducer 统一管理，保证了状态一致性。

### 内部原理

#### 状态一致性保证

使用多个 useState 管理关联状态时，可能出现中间不一致的状态。比如设置了 loading = false 但还没设置 data，此时组件处于既不 loading 也没有 data 的空白状态。reducer 在一次 dispatch 中同时更新所有相关字段，保证了状态的原子性。

```javascript
// 用 useState 的问题：可能出现中间不一致状态
setLoading(false);
// 此刻渲染：loading=false, data=null, error=null（空白状态）
setData(result);

// 用 useReducer：一次 dispatch 同时更新所有字段
dispatch({ type: "FETCH_SUCCESS", payload: result });
// 状态原子更新：loading=false, data=result, error=null
```

### 进阶用法

```tsx
// 进阶场景：购物车状态管理

import React, { useReducer } from "react";

interface CartItem {
    id: number;
    name: string;
    price: number;
    quantity: number;
}

interface CartState {
    items: CartItem[];
    discount: number;
}

type CartAction =
    | { type: "ADD_ITEM"; payload: Omit<CartItem, "quantity"> }
    | { type: "REMOVE_ITEM"; payload: number }
    | { type: "UPDATE_QUANTITY"; payload: { id: number; quantity: number } }
    | { type: "APPLY_DISCOUNT"; payload: number }
    | { type: "CLEAR_CART" };

function cartReducer(state: CartState, action: CartAction): CartState {
    switch (action.type) {
        case "ADD_ITEM": {
            const existing = state.items.find(item => item.id === action.payload.id);
            if (existing) {
                // 已存在：数量 +1
                return {
                    ...state,
                    items: state.items.map(item =>
                        item.id === action.payload.id
                            ? { ...item, quantity: item.quantity + 1 }
                            : item
                    ),
                };
            }
            // 不存在：添加新商品
            return {
                ...state,
                items: [...state.items, { ...action.payload, quantity: 1 }],
            };
        }
        case "REMOVE_ITEM":
            return {
                ...state,
                items: state.items.filter(item => item.id !== action.payload),
            };
        case "UPDATE_QUANTITY":
            return {
                ...state,
                items: state.items.map(item =>
                    item.id === action.payload.id
                        ? { ...item, quantity: Math.max(0, action.payload.quantity) }
                        : item
                ).filter(item => item.quantity > 0),
            };
        case "APPLY_DISCOUNT":
            return { ...state, discount: action.payload };
        case "CLEAR_CART":
            return { items: [], discount: 0 };
        default:
            return state;
    }
}

function ShoppingCart() {
    const [cart, dispatch] = useReducer(cartReducer, { items: [], discount: 0 });

    const total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const finalTotal = total * (1 - cart.discount / 100);

    return (
        <div>
            <h2>购物车</h2>
            {cart.items.map(item => (
                <div key={item.id}>
                    <span>{item.name} x{item.quantity} = ¥{item.price * item.quantity}</span>
                    <button onClick={() => dispatch({
                        type: "UPDATE_QUANTITY",
                        payload: { id: item.id, quantity: item.quantity - 1 }
                    })}>-</button>
                    <button onClick={() => dispatch({
                        type: "UPDATE_QUANTITY",
                        payload: { id: item.id, quantity: item.quantity + 1 }
                    })}>+</button>
                    <button onClick={() => dispatch({ type: "REMOVE_ITEM", payload: item.id })}>删除</button>
                </div>
            ))}
            <p>总计: ¥{finalTotal.toFixed(2)}</p>
            <button onClick={() => dispatch({ type: "CLEAR_CART" })}>清空购物车</button>
        </div>
    );
}

export default ShoppingCart;
```

### 与相关API的对比

| 对比维度 | 多个 useState | useReducer |
|----------|-------------|-----------|
| 状态一致性 | 可能出现中间状态 | 原子更新 |
| 逻辑集中度 | 分散在各处理函数中 | 集中在 reducer 中 |
| 可测试性 | 需要渲染组件测试 | 纯函数可直接测试 |
| 代码量 | 状态少时更少 | 需要定义 action 类型 |
| 适用复杂度 | 简单、独立的状态 | 复杂、关联的状态 |

### 适用场景

- **数据请求三态：** loading / error / data 联动
- **购物车：** 增删改查多种操作
- **表单管理：** 多字段联动验证
- **多步骤流程：** 步骤切换、数据回填
- **撤销/重做：** 维护历史状态栈

### 常见问题

#### useReducer 和 useState 如何选择

**问题描述：** 不确定何时该用 useReducer。

**解决方案：**

```
选择 useState 的场景：
- 状态是独立的基本值（count、name、isOpen）
- 状态更新逻辑简单（直接赋值或简单计算）
- 状态之间没有关联

选择 useReducer 的场景：
- 状态有多个关联字段
- 同一操作需要更新多个字段
- 更新逻辑复杂（条件判断、查找、合并）
- 需要将更新逻辑提取出来复用或测试
```

### 注意事项

- reducer 必须是纯函数，所有状态字段在一次 dispatch 中原子更新
- 复杂的 reducer 可以拆分为子 reducer 再组合
- action type 用字符串常量或枚举，避免拼写错误
- TypeScript 联合类型确保 action 的类型安全
- reducer 定义在组件外部，避免每次渲染重新创建

### 总结

useReducer 适合管理复杂的关联状态，将更新逻辑集中到 reducer 纯函数中。一次 dispatch 原子更新所有相关字段，避免中间不一致状态。购物车、数据请求三态、多步骤流程等场景优先考虑 useReducer。简单独立的状态仍然用 useState。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useContext的上下文消费

### 概念说明

`useContext` 是 React 提供的上下文消费 Hook，用于在函数组件中读取最近的 Context Provider 提供的值。它替代了类组件中的 `Context.Consumer` 组件和 `static contextType` 模式，语法更简洁。

Context 解决了 Props Drilling（逐层传递）问题，让深层嵌套的组件可以直接访问祖先组件提供的数据，而不需要通过中间层逐层传递 props。常见使用场景包括主题、语言、用户认证状态等全局数据。

### API 签名与参数

```typescript
// 创建 Context
const MyContext = React.createContext<T>(defaultValue);

// 提供值
<MyContext.Provider value={contextValue}>
    {children}
</MyContext.Provider>

// 消费值
const value = useContext(MyContext);
```

| API | 参数 | 说明 |
|-----|------|------|
| createContext(default) | 默认值 | 创建 Context 对象，默认值在没有 Provider 时使用 |
| Provider value={...} | 提供的值 | 向后代组件提供 Context 值 |
| useContext(Context) | Context 对象 | 读取最近的 Provider 的值 |

**返回值：** 最近的 Provider 提供的 value，如果没有 Provider 则返回 createContext 的默认值。

### 基本示例

```tsx
// 示例说明：用 Context 实现主题切换

import React, { createContext, useContext, useState, ReactNode } from "react";

// 定义 Context 类型
interface ThemeContextType {
    theme: "light" | "dark";
    toggleTheme: () => void;
}

// 创建 Context（默认值用于没有 Provider 时）
const ThemeContext = createContext<ThemeContextType | null>(null);

// Provider 组件：封装 Context 提供逻辑
function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<"light" | "dark">("light");

    const toggleTheme = () => {
        setTheme(prev => prev === "light" ? "dark" : "light");
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

// 自定义 Hook：封装 useContext 并添加空值检查
function useTheme() {
    const context = useContext(ThemeContext);
    if (context === null) {
        throw new Error("useTheme 必须在 ThemeProvider 内部使用");
    }
    return context;
}

// 消费组件：无论嵌套多深都能直接访问
function Header() {
    const { theme, toggleTheme } = useTheme();
    return (
        <header style={{ background: theme === "dark" ? "#333" : "#fff" }}>
            <button onClick={toggleTheme}>
                当前主题: {theme}，点击切换
            </button>
        </header>
    );
}

// 应用根组件
function App() {
    return (
        <ThemeProvider>
            <Header />
        </ThemeProvider>
    );
}

export default App;
```

**运行效果：** Header 组件直接消费主题上下文，点击按钮切换明暗主题，背景色随之变化。

### 内部原理

#### Context 的传播机制

Context 值变化时，React 会从 Provider 向下遍历 Fiber 树，找到所有消费该 Context 的组件，并标记它们需要更新。这些组件会跳过 React.memo 或 shouldComponentUpdate 的优化，强制重新渲染。

```javascript
// 简化的 Context 传播流程
function propagateContextChange(provider, newValue) {
    let fiber = provider.child;
    // 深度优先遍历所有后代
    while (fiber !== null) {
        // 检查是否有 useContext 依赖这个 Context
        if (fiber.dependencies?.includes(context)) {
            // 标记需要更新，跳过 memo 优化
            markWorkInProgressReceivedUpdate(fiber);
            scheduleUpdateOnFiber(fiber);
        }
        fiber = getNextFiber(fiber);
    }
}
```

### 适用场景

- **主题切换：** 全局明暗主题
- **国际化：** 多语言切换
- **用户认证：** 登录状态和用户信息
- **全局配置：** API 地址、功能开关

### 常见问题

#### 没有 Provider 时使用默认值

**问题描述：** useContext 返回了 undefined 或默认值。

**原因分析：** 组件没有被对应的 Provider 包裹，useContext 返回 createContext 的默认值。

**解决方案：**

```tsx
// 方案：自定义 Hook 中添加空值检查
function useTheme() {
    const context = useContext(ThemeContext);
    if (context === null) {
        throw new Error("useTheme 必须在 ThemeProvider 内部使用");
    }
    return context;  // TypeScript 自动收窄为非 null 类型
}
```

### 注意事项

- Context 值变化会导致所有消费该 Context 的组件重新渲染
- createContext 的默认值仅在没有 Provider 时使用
- 推荐封装自定义 Hook（如 useTheme）并添加空值检查
- 不要用 Context 替代所有的 props 传递，只用于真正的"全局"数据
- Context 值是对象时要注意引用稳定性，避免不必要的重渲染

### 总结

useContext 用于消费最近的 Provider 提供的 Context 值，解决 Props Drilling 问题。Context 值变化时所有消费组件强制重渲染。推荐用自定义 Hook 封装 useContext 并做空值检查。适用于主题、国际化、认证等全局数据，不要滥用。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useContext的上下文值变化监听

### 概念说明

当 Context Provider 的 value 发生变化时，所有通过 useContext 消费该 Context 的组件都会自动重新渲染。React 使用 `Object.is` 比较新旧 value，如果不同则触发消费组件的更新。这个更新是强制的——即使消费组件被 React.memo 包裹也无法跳过。

这种机制确保了上下文数据的一致性，但也带来了性能隐患：如果 Provider 的 value 是一个每次渲染都创建的新对象，所有消费组件都会不必要地重新渲染。

### 基本示例

```tsx
// 示例说明：展示 Context 值变化如何触发消费组件更新

import React, { createContext, useContext, useState, ReactNode } from "react";

interface UserContextType {
    name: string;
    setName: (name: string) => void;
}

const UserContext = createContext<UserContextType | null>(null);

function UserProvider({ children }: { children: ReactNode }) {
    const [name, setName] = useState("张三");

    // 每次 UserProvider 渲染，value 都是新对象
    // 所有消费 UserContext 的组件都会重新渲染
    return (
        <UserContext.Provider value={{ name, setName }}>
            {children}
        </UserContext.Provider>
    );
}

// 消费组件：Context 值变化时自动重新渲染
function UserDisplay() {
    const ctx = useContext(UserContext);
    console.log("UserDisplay 渲染了");
    return <p>用户: {ctx?.name}</p>;
}

// 即使用 React.memo 包裹，Context 变化时仍然会重新渲染
const MemoizedDisplay = React.memo(function MemoDisplay() {
    const ctx = useContext(UserContext);
    console.log("MemoDisplay 也渲染了");
    return <p>Memo用户: {ctx?.name}</p>;
});

function App() {
    return (
        <UserProvider>
            <UserDisplay />
            <MemoizedDisplay />
        </UserProvider>
    );
}

export default App;
```

**运行效果：** name 变化时，UserDisplay 和 MemoizedDisplay 都重新渲染，React.memo 无法阻止 Context 变化引起的更新。

### 内部原理

#### Context 变化检测

```javascript
// React 内部简化逻辑
function updateContextConsumer(fiber, context) {
    const newValue = readContext(context);
    const oldValue = fiber.memoizedProps.value;

    // 使用 Object.is 比较
    if (!Object.is(oldValue, newValue)) {
        // 值不同：强制更新消费组件
        // 跳过 shouldComponentUpdate 和 React.memo
        markWorkInProgressReceivedUpdate();
    }
}
```

#### 为什么 React.memo 挡不住 Context 更新

React.memo 只对 props 做浅比较。useContext 的更新不走 props 的比较流程，而是通过 Context 的内部传播机制直接标记组件需要更新。这两个是独立的更新路径。

### 进阶用法

```tsx
// 进阶场景：稳定化 Provider value 避免不必要的重渲染

import React, { createContext, useContext, useState, useMemo, useCallback, ReactNode } from "react";

interface AuthContextType {
    user: { name: string; role: string } | null;
    login: (name: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<{ name: string; role: string } | null>(null);

    // 用 useCallback 稳定化函数引用
    const login = useCallback((name: string) => {
        setUser({ name, role: "user" });
    }, []);

    const logout = useCallback(() => {
        setUser(null);
    }, []);

    // 用 useMemo 稳定化 value 对象
    // 只有 user 变化时才创建新的 value 对象
    const value = useMemo(() => ({
        user,
        login,
        logout,
    }), [user, login, logout]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export { AuthProvider, AuthContext };
```

### 适用场景

- **全局状态同步：** 确保所有消费组件看到最新的 Context 值
- **主题切换：** 主题变化时所有使用主题的组件同步更新
- **认证状态：** 登录/登出时所有依赖认证的组件更新

### 常见问题

#### Provider value 每次渲染都是新对象

**问题描述：** Provider 所在组件每次渲染都创建新的 value 对象，导致所有消费组件无意义地重渲染。

**原因分析：** `value=&lbrace;&lbrace; name, setName &rbrace;&rbrace;` 每次渲染创建新对象，Object.is 比较为 false。

**解决方案：**

```tsx
// 错误：每次渲染创建新对象
<MyContext.Provider value={{ name, setName }}>

// 正确：用 useMemo 稳定化
const value = useMemo(() => ({ name, setName }), [name]);
<MyContext.Provider value={value}>
```

### 注意事项

- Context 值变化会强制更新所有消费组件，React.memo 无法阻止
- Provider 的 value 要用 useMemo 稳定化，避免不必要的重渲染
- value 中的函数要用 useCallback 稳定化
- 如果只有部分消费组件需要某些字段，考虑拆分 Context
- 频繁变化的值不适合放在 Context 中（会导致大范围重渲染）

### 总结

Context 值变化时所有消费组件强制重渲染，React.memo 无法阻止。Provider 的 value 应该用 useMemo 稳定化，函数用 useCallback 包裹。频繁变化的值不适合放在 Context 中。需要细粒度更新控制时考虑拆分 Context 或使用状态管理库。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Context的拆分优化(减少重渲染)

### 概念说明

Context 的一个性能问题是：Provider 的 value 中任何字段变化，都会导致所有消费该 Context 的组件重新渲染——即使某些组件只用到了没有变化的字段。解决方案是将一个大的 Context 拆分为多个小的 Context，每个 Context 只包含相关联的数据，让组件只订阅自己需要的部分。

另一种常见的拆分方式是将"状态"和"操作函数"分离到两个 Context 中。状态变化频繁，但操作函数（dispatch、setter）的引用通常是稳定的。分离后，只使用操作函数的组件不会因为状态变化而重渲染。

### 基本示例

```tsx
// 示例说明：将状态和操作函数拆分为两个 Context

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";

// 拆分前：一个大 Context
// const AppContext = createContext({ theme, user, setTheme, setUser });
// theme 变化时，只用 user 的组件也会重渲染

// 拆分后：按职责分开

// Context 1：主题状态
interface ThemeState { theme: "light" | "dark" }
const ThemeStateContext = createContext<ThemeState>({ theme: "light" });

// Context 2：主题操作
interface ThemeActions { toggleTheme: () => void }
const ThemeActionsContext = createContext<ThemeActions>({ toggleTheme: () => {} });

// Context 3：用户状态
interface UserState { name: string; role: string }
const UserStateContext = createContext<UserState>({ name: "", role: "" });

// Provider 组件：嵌套提供多个 Context
function AppProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<"light" | "dark">("light");
    const [user] = useState({ name: "张三", role: "admin" });

    const toggleTheme = useCallback(() => {
        setTheme(prev => prev === "light" ? "dark" : "light");
    }, []);

    // 操作函数的 value 引用稳定
    const actions = useMemo(() => ({ toggleTheme }), [toggleTheme]);

    return (
        <ThemeStateContext.Provider value={{ theme }}>
            <ThemeActionsContext.Provider value={actions}>
                <UserStateContext.Provider value={user}>
                    {children}
                </UserStateContext.Provider>
            </ThemeActionsContext.Provider>
        </ThemeStateContext.Provider>
    );
}

// 只消费主题状态的组件：theme 变化时重渲染
function ThemeDisplay() {
    const { theme } = useContext(ThemeStateContext);
    console.log("ThemeDisplay 渲染");
    return <p>当前主题: {theme}</p>;
}

// 只消费操作函数的组件：theme 变化时不重渲染
function ThemeToggle() {
    const { toggleTheme } = useContext(ThemeActionsContext);
    console.log("ThemeToggle 渲染");
    return <button onClick={toggleTheme}>切换主题</button>;
}

// 只消费用户状态的组件：theme 变化时不重渲染
function UserDisplay() {
    const { name } = useContext(UserStateContext);
    console.log("UserDisplay 渲染");
    return <p>用户: {name}</p>;
}

function App() {
    return (
        <AppProvider>
            <ThemeDisplay />
            <ThemeToggle />
            <UserDisplay />
        </AppProvider>
    );
}

export default App;
```

**运行效果：** 点击切换主题时，只有 ThemeDisplay 重新渲染。ThemeToggle 和 UserDisplay 不会重渲染，因为它们订阅的 Context 值没有变化。

### 内部原理

#### 拆分的优化原理

每个 useContext 独立订阅一个 Context。当某个 Provider 的 value 变化时，只有订阅了该 Context 的组件被标记更新。拆分后，不相关的状态变化不会波及到不需要的组件。

```
拆分前：
AppContext.value 变化 → 所有消费组件更新

拆分后：
ThemeStateContext.value 变化 → 只有消费 ThemeState 的组件更新
UserStateContext.value 不变  → 消费 UserState 的组件不更新
ThemeActionsContext.value 不变 → 消费 ThemeActions 的组件不更新
```

### 与相关API的对比

| 优化方式 | 实现 | 效果 |
|----------|------|------|
| Context 拆分 | 多个小 Context | 组件只订阅需要的部分 |
| useMemo 稳定化 value | Provider 的 value 用 useMemo | 减少不必要的 value 变化 |
| 状态/操作分离 | state 和 dispatch 分开 | 操作组件不因状态变化重渲染 |
| 组件提取 | 消费组件提取为独立组件 | 缩小重渲染范围 |

### 适用场景

- **全局状态管理：** 主题、用户、语言等不同类型的全局数据
- **状态频繁变化：** 某些状态频繁更新但只有少量组件关心
- **大型应用：** 消费组件众多，需要精细控制重渲染

### 常见问题

#### 拆分太多导致 Provider 嵌套地狱

**问题描述：** 多个 Provider 层层嵌套，代码不美观。

**解决方案：**

```tsx
// 用工具函数组合多个 Provider
function composeProviders(...providers: React.FC<{ children: ReactNode }>[]) {
    return function ComposedProvider({ children }: { children: ReactNode }) {
        return providers.reduceRight(
            (child, Provider) => <Provider>{child}</Provider>,
            children
        );
    };
}

const AllProviders = composeProviders(
    ThemeProvider,
    UserProvider,
    AuthProvider,
);

function App() {
    return (
        <AllProviders>
            <MainContent />
        </AllProviders>
    );
}
```

### 注意事项

- 按职责拆分 Context，不要把所有数据放在一个 Context 中
- 状态和操作函数分离是高性价比的优化手段
- Provider 嵌套多时可以用组合函数简化
- 过度拆分也会增加复杂度，需要权衡
- 如果拆分后仍有性能问题，考虑使用 Zustand 等状态管理库

### 总结

Context 拆分是解决 Context 导致过度重渲染的有效手段。将不相关的数据拆分为多个小 Context，组件只订阅自己需要的部分。状态和操作函数分离是常用模式。Provider 嵌套多时可以用组合函数简化。过度拆分会增加复杂度，需要根据实际性能瓶颈权衡。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Context的默认值与undefined处理

### 概念说明

`createContext(defaultValue)` 的默认值只在组件没有被对应的 Provider 包裹时才会使用。如果组件在 Provider 内部，即使 Provider 的 value 是 undefined，也不会使用默认值——默认值仅作为"没有 Provider"的兜底。

这个行为常常导致困惑：开发者传入了 undefined 作为 Provider 的 value，期望使用默认值，但实际上拿到的就是 undefined。理解这个机制对正确使用 Context 很重要。

### 基本示例

```tsx
// 示例说明：展示默认值的生效时机

import React, { createContext, useContext } from "react";

// 创建 Context，默认值为 "默认主题"
const ThemeContext = createContext<string>("默认主题");

// 场景1：没有 Provider → 使用默认值
function NoProviderDemo() {
    const theme = useContext(ThemeContext);
    return <p>主题: {theme}</p>;  // 输出: "默认主题"
}

// 场景2：有 Provider 且传入了值 → 使用传入的值
function WithProviderDemo() {
    return (
        <ThemeContext.Provider value="暗色主题">
            <ThemeConsumer />
        </ThemeContext.Provider>
    );
}

// 场景3：有 Provider 但 value 是 undefined → 拿到 undefined，不是默认值
function UndefinedValueDemo() {
    return (
        <ThemeContext.Provider value={undefined as any}>
            <ThemeConsumer />
        </ThemeContext.Provider>
    );
}

function ThemeConsumer() {
    const theme = useContext(ThemeContext);
    return <p>主题: {theme ?? "未定义"}</p>;
}

function App() {
    return (
        <div>
            <h3>无 Provider</h3>
            <NoProviderDemo />        {/* "默认主题" */}

            <h3>有 Provider</h3>
            <WithProviderDemo />      {/* "暗色主题" */}

            <h3>Provider value=undefined</h3>
            <UndefinedValueDemo />    {/* undefined，不是 "默认主题" */}
        </div>
    );
}

export default App;
```

**运行效果：** 无 Provider 时显示默认值，有 Provider 时显示传入的值，value 为 undefined 时显示 undefined 而非默认值。

### 内部原理

#### React 的默认值查找逻辑

```javascript
// React 内部简化逻辑
function readContext(context) {
    // 从当前 Fiber 向上查找最近的 Provider
    const provider = findNearestProvider(currentFiber, context);

    if (provider !== null) {
        // 找到 Provider：返回 Provider 的 value（即使是 undefined）
        return provider.memoizedProps.value;
    } else {
        // 没有 Provider：返回 createContext 的默认值
        return context._defaultValue;
    }
}
```

### 进阶用法

```tsx
// 进阶场景：用 null 作为默认值 + 自定义 Hook 做空值保护

import React, { createContext, useContext, ReactNode } from "react";

interface AuthContextType {
    user: { name: string } | null;
    logout: () => void;
}

// 用 null 作为默认值，明确表示"没有 Provider"
const AuthContext = createContext<AuthContextType | null>(null);

// 自定义 Hook：统一处理 null 检查
function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (context === null) {
        throw new Error(
            "useAuth 必须在 AuthProvider 内部使用。" +
            "请确保组件被 <AuthProvider> 包裹。"
        );
    }
    return context;
}

// Provider 组件
function AuthProvider({ children }: { children: ReactNode }) {
    const value: AuthContextType = {
        user: { name: "张三" },
        logout: () => console.log("登出"),
    };
    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export { AuthProvider, useAuth };
```

### 与相关API的对比

| 场景 | 默认值是否生效 | useContext 返回值 |
|------|-------------|-----------------|
| 无 Provider | 生效 | defaultValue |
| Provider value={具体值} | 不生效 | 具体值 |
| Provider value={undefined} | 不生效 | undefined |
| Provider value={null} | 不生效 | null |

### 适用场景

- **独立组件库：** 组件可能在没有 Provider 的环境中使用，需要合理的默认值
- **开发时错误检测：** 默认值为 null，自定义 Hook 中抛出错误提示缺少 Provider
- **测试环境：** 用默认值简化测试设置

### 常见问题

#### 默认值应该设为什么

**问题描述：** 不确定 createContext 的默认值该传什么。

**解决方案：**

```tsx
// 方案1：null + 自定义 Hook 抛错（推荐）
// 明确告诉开发者必须在 Provider 内使用
const MyContext = createContext<MyType | null>(null);

// 方案2：有意义的默认值（适合组件库）
// 即使没有 Provider 也能正常工作
const ThemeContext = createContext({ theme: "light", fontSize: 14 });

// 方案3：空对象/空函数（不推荐）
// 掩盖了缺少 Provider 的错误
// const MyContext = createContext({ fn: () => {} });
```

### 注意事项

- 默认值只在没有 Provider 时生效
- Provider value={undefined} 不会回退到默认值
- 推荐用 null 作为默认值 + 自定义 Hook 做空值检查
- 默认值的类型应该和 Provider value 的类型一致
- 默认值在 TypeScript 中影响类型推断

### 总结

createContext 的默认值仅在组件没有被 Provider 包裹时使用，Provider 传入 undefined 不会回退到默认值。推荐用 null 作为默认值并在自定义 Hook 中做空值检查，这样能在开发时及时发现缺少 Provider 的错误。组件库场景可以提供有意义的默认值让组件独立可用。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useSyncExternalStore的外部状态同步

### 概念说明

`useSyncExternalStore` 是 React 18 引入的 Hook，用于安全地将外部状态源（External Store）订阅到 React 组件中。所谓"外部状态源"是指不由 React 管理的状态，如第三方状态管理库（Redux、Zustand）、浏览器 API（window.innerWidth、navigator.onLine）、自定义发布-订阅系统等。

在 React 18 的并发模式下，渲染可以被中断和恢复。如果在渲染过程中外部状态发生了变化，组件可能读到不一致的数据（tearing 撕裂问题）。useSyncExternalStore 通过同步读取保证了数据一致性。

### API 签名与参数

```typescript
function useSyncExternalStore<T>(
    subscribe: (onStoreChange: () => void) => () => void,
    getSnapshot: () => T,
    getServerSnapshot?: () => T
): T;
```

| 参数 | 类型 | 是否必填 | 说明 |
|------|------|----------|------|
| subscribe | (callback) => unsubscribe | 是 | 订阅外部状态变化，返回取消订阅函数 |
| getSnapshot | () => T | 是 | 获取当前状态快照（必须返回不可变值） |
| getServerSnapshot | () => T | 否 | SSR 时获取服务端快照 |

**返回值：** 当前的状态快照值。

### 基本示例

```tsx
// 示例说明：用 useSyncExternalStore 订阅浏览器在线状态

import React, { useSyncExternalStore } from "react";

// 订阅函数：监听 online/offline 事件
function subscribeOnlineStatus(callback: () => void) {
    window.addEventListener("online", callback);
    window.addEventListener("offline", callback);
    // 返回取消订阅函数
    return () => {
        window.removeEventListener("online", callback);
        window.removeEventListener("offline", callback);
    };
}

// 获取快照函数：返回当前在线状态
function getOnlineSnapshot(): boolean {
    return navigator.onLine;
}

// SSR 快照：服务端默认在线
function getServerOnlineSnapshot(): boolean {
    return true;
}

function OnlineStatus() {
    const isOnline = useSyncExternalStore(
        subscribeOnlineStatus,
        getOnlineSnapshot,
        getServerOnlineSnapshot
    );

    return (
        <div>
            <span style={{ color: isOnline ? "green" : "red" }}>
                {isOnline ? "在线" : "离线"}
            </span>
        </div>
    );
}

export default OnlineStatus;
```

**运行效果：** 组件实时显示浏览器的在线/离线状态。断网时自动切换为红色"离线"，恢复后切换为绿色"在线"。

### 内部原理

#### 防止 Tearing（撕裂）

```javascript
// React 18 并发模式下的问题
// 渲染开始时读取 store.value = "A"
// 渲染被中断，store.value 变为 "B"
// 渲染恢复后继续读取，可能一部分组件用 "A"，另一部分用 "B"
// 这就是 tearing（撕裂）

// useSyncExternalStore 的解决方案
function useSyncExternalStore(subscribe, getSnapshot) {
    // 1. 同步读取快照
    const snapshot = getSnapshot();
    // 2. 在 commit 阶段检查快照是否还是最新的
    // 3. 如果快照已过期，强制同步重新渲染
    // 4. 确保整个渲染过程使用同一个快照值
    return snapshot;
}
```

### 进阶用法

```tsx
// 进阶场景：封装一个简单的外部 Store

import { useSyncExternalStore } from "react";

// 创建一个简单的外部 Store
function createStore<T>(initialState: T) {
    let state = initialState;
    const listeners = new Set<() => void>();

    return {
        getSnapshot: () => state,
        subscribe: (listener: () => void) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        setState: (newState: T | ((prev: T) => T)) => {
            state = typeof newState === "function"
                ? (newState as (prev: T) => T)(state)
                : newState;
            // 通知所有订阅者
            listeners.forEach(listener => listener());
        },
    };
}

// 使用
const counterStore = createStore(0);

function Counter() {
    const count = useSyncExternalStore(
        counterStore.subscribe,
        counterStore.getSnapshot
    );

    return (
        <div>
            <p>计数: {count}</p>
            <button onClick={() => counterStore.setState(prev => prev + 1)}>+1</button>
        </div>
    );
}
```

### 适用场景

- **第三方状态库集成：** Redux、Zustand、MobX 等库的 React 绑定
- **浏览器 API 订阅：** window 尺寸、在线状态、媒体查询
- **自定义发布-订阅：** WebSocket 消息、EventEmitter
- **跨框架状态共享：** 非 React 管理的全局状态

### 常见问题

#### getSnapshot 每次返回新引用导致无限循环

**问题描述：** 组件不断重新渲染。

**原因分析：** getSnapshot 每次调用都返回一个新的对象引用，React 认为状态一直在变化。

**解决方案：**

```tsx
// 错误：每次返回新对象
// const getSnapshot = () => ({ width: window.innerWidth });

// 正确：返回不可变的基本值或缓存的引用
let cachedSize = { width: window.innerWidth };
function getSnapshot() {
    const newWidth = window.innerWidth;
    if (cachedSize.width !== newWidth) {
        cachedSize = { width: newWidth };
    }
    return cachedSize;
}
```

### 注意事项

- getSnapshot 必须返回不可变值（或缓存的引用）
- subscribe 函数的引用应该稳定（定义在组件外部或用 useCallback）
- SSR 场景需要提供 getServerSnapshot
- 这个 Hook 主要供库作者使用，应用开发者较少直接使用
- React 18 之前的版本可以用 `use-sync-external-store` polyfill

### 总结

useSyncExternalStore 是 React 18 提供的安全订阅外部状态源的 Hook，解决了并发模式下的 tearing 问题。通过 subscribe 订阅变化、getSnapshot 同步读取快照，保证渲染过程中数据一致。getSnapshot 必须返回不可变值。主要供状态管理库和浏览器 API 订阅场景使用。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useSyncExternalStore的并发安全

### 概念说明

React 18 的并发模式允许渲染被中断和恢复，这引入了"撕裂"（Tearing）问题：在同一次渲染中，不同组件可能读取到外部状态源的不同版本，导致 UI 不一致。`useSyncExternalStore` 通过强制同步读取来保证并发安全——确保整个渲染树在同一次渲染中看到的外部状态是一致的。

在 React 17 的同步模式下不存在撕裂问题，因为渲染过程不会被中断。但 React 18 默认启用并发特性后，所有订阅外部状态源的场景都需要考虑并发安全。

### 基本示例

```tsx
// 示例说明：展示并发模式下撕裂问题及 useSyncExternalStore 的保护

import React, { useSyncExternalStore } from "react";

// 外部状态源
let externalState = { color: "red" };
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
    listeners.add(callback);
    return () => listeners.delete(callback);
}

function getSnapshot() {
    return externalState;
}

function setExternalState(newState: typeof externalState) {
    externalState = newState;
    listeners.forEach(fn => fn());
}

// 安全的消费组件：使用 useSyncExternalStore
function SafeColorDisplay() {
    const state = useSyncExternalStore(subscribe, getSnapshot);
    // 在并发模式下，即使渲染被中断再恢复，
    // 这个组件读到的 state 和其他组件一致
    return <div style={{ color: state.color }}>安全显示: {state.color}</div>;
}

// 不安全的方式（仅作对比说明）
// function UnsafeColorDisplay() {
//     const [, forceUpdate] = React.useReducer(c => c + 1, 0);
//     React.useEffect(() => {
//         const unsub = subscribe(forceUpdate);
//         return unsub;
//     }, []);
//     // 并发模式下可能读到不一致的值
//     return <div>{externalState.color}</div>;
// }

function App() {
    return (
        <div>
            <SafeColorDisplay />
            <SafeColorDisplay />
            <button onClick={() => setExternalState({ color: "blue" })}>
                切换颜色
            </button>
        </div>
    );
}

export default App;
```

**运行效果：** 两个 SafeColorDisplay 组件在任何时刻都显示相同的颜色值，不会出现一个显示 red 另一个显示 blue 的情况。

### 内部原理

#### 撕裂的发生机制

```
并发模式下的撕裂场景：

时间线：
1. React 开始渲染 → 组件A 读取 store.value = "red"
2. 渲染被高优先级更新中断
3. 在中断期间，外部代码修改 store.value = "blue"
4. React 恢复渲染 → 组件B 读取 store.value = "blue"
5. 结果：组件A 显示 "red"，组件B 显示 "blue" → 撕裂
```

#### useSyncExternalStore 的防撕裂机制

```javascript
// React 内部简化逻辑
function useSyncExternalStore(subscribe, getSnapshot) {
    // 1. 在渲染阶段同步读取快照
    const snapshot = getSnapshot();

    // 2. 在 commit 阶段（DOM 更新后）检查快照是否仍然一致
    useEffect(() => {
        const currentSnapshot = getSnapshot();
        if (!Object.is(snapshot, currentSnapshot)) {
            // 快照已过期：强制同步重新渲染
            // 这次重渲染不会被中断，保证一致性
            forceStoreRerender();
        }
    });

    // 3. 订阅外部状态变化
    useEffect(() => {
        const handleChange = () => {
            const newSnapshot = getSnapshot();
            if (!Object.is(snapshot, newSnapshot)) {
                // 状态变化：触发重新渲染
                forceStoreRerender();
            }
        };
        return subscribe(handleChange);
    }, [subscribe]);

    return snapshot;
}
```

### 与相关API的对比

| 对比维度 | useSyncExternalStore | useState + useEffect |
|----------|---------------------|---------------------|
| 并发安全 | 安全（防撕裂） | 不安全（可能撕裂） |
| 数据一致性 | 保证同一渲染中一致 | 不保证 |
| 适用状态源 | 外部状态源 | React 内部状态 |
| React 版本 | 18+ | 所有版本 |

### 适用场景

- **状态管理库：** Redux、Zustand 等库的 React 绑定层
- **浏览器 API：** 需要在并发模式下安全读取的外部状态
- **跨组件共享的外部数据：** 多个组件需要读取同一外部数据源

### 常见问题

#### 什么时候需要关心并发安全

**问题描述：** 是否所有外部状态订阅都需要用 useSyncExternalStore。

**解决方案：**

```
需要用 useSyncExternalStore 的场景：
- 使用 createRoot（并发模式）
- 多个组件读取同一外部状态源
- 状态可能在渲染过程中被外部代码修改

不需要的场景：
- React 内部状态（useState、useReducer 已经并发安全）
- 只有一个组件消费的外部状态
- 仍在使用 ReactDOM.render（同步模式，无撕裂风险）
```

### 注意事项

- useSyncExternalStore 是 React 18 并发模式下订阅外部状态的标准方式
- React 自身的 useState/useReducer 已经是并发安全的，不需要额外处理
- subscribe 函数应该在外部状态变化时调用回调，不能遗漏
- getSnapshot 在渲染过程中可能被多次调用，必须是纯函数
- 库作者应该使用此 Hook，应用开发者通常通过库间接使用

### 总结

useSyncExternalStore 解决了 React 18 并发模式下外部状态源的撕裂问题。通过同步读取快照和 commit 阶段的一致性检查，保证整个渲染树看到一致的外部状态。React 内部状态已经并发安全，此 Hook 主要用于外部状态源的订阅。是状态管理库实现并发安全 React 绑定的基础。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useSyncExternalStore的getSnapshot

### 概念说明

`getSnapshot` 是 `useSyncExternalStore` 的第二个参数，负责返回外部状态源的当前快照值。React 通过调用 getSnapshot 获取当前状态，并用 `Object.is` 与上一次的快照进行比较，决定是否需要重新渲染消费组件。

getSnapshot 有两个核心要求：它必须返回不可变的值（immutable）；在外部状态没有变化时，连续调用必须返回相同的引用。违反这些要求会导致无限渲染循环或状态不一致。

### API 签名与参数

```typescript
// getSnapshot 签名
type GetSnapshot<T> = () => T;

// 在 useSyncExternalStore 中的位置
useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot?);
```

| 要求 | 说明 |
|------|------|
| 返回不可变值 | 返回的值不应该在后续被修改 |
| 引用稳定性 | 状态未变化时，连续调用返回同一引用 |
| 纯函数 | 不能有副作用，可以在渲染期间多次调用 |

### 基本示例

```tsx
// 示例说明：正确和错误的 getSnapshot 实现

import { useSyncExternalStore } from "react";

// 外部 Store
let storeData = { count: 0, name: "张三" };
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
}

// 正确：返回基本值（天然不可变）
function getCountSnapshot(): number {
    return storeData.count;
}

// 正确：返回缓存的对象引用
let cachedSnapshot = storeData;
function getStoreSnapshot() {
    // 只有在 storeData 真正变化时才更新缓存
    if (cachedSnapshot !== storeData) {
        cachedSnapshot = storeData;
    }
    return cachedSnapshot;
}

// 错误：每次调用都创建新对象
// function getBadSnapshot() {
//     return { count: storeData.count };  // 每次新引用 → 无限循环
// }

function CounterDisplay() {
    const count = useSyncExternalStore(subscribe, getCountSnapshot);
    return <p>计数: {count}</p>;
}

function StoreDisplay() {
    const data = useSyncExternalStore(subscribe, getStoreSnapshot);
    return <p>{data.name}: {data.count}</p>;
}

// 更新 Store
function updateStore(newData: Partial<typeof storeData>) {
    storeData = { ...storeData, ...newData };
    listeners.forEach(fn => fn());
}
```

**运行效果：** 组件正确订阅外部状态，状态变化时更新，状态不变时不重渲染。

### 内部原理

#### React 如何使用 getSnapshot

```javascript
// React 内部简化逻辑
function useSyncExternalStore(subscribe, getSnapshot) {
    // 渲染阶段：调用 getSnapshot 获取当前值
    const nextSnapshot = getSnapshot();
    const prevSnapshot = hook.memoizedState;

    // 用 Object.is 比较
    if (!Object.is(prevSnapshot, nextSnapshot)) {
        // 值不同：更新存储的快照，标记需要渲染
        hook.memoizedState = nextSnapshot;
    }

    // 注意：getSnapshot 可能在一次渲染中被多次调用
    // 每次都必须返回相同的值（除非外部状态确实变了）
    return hook.memoizedState;
}
```

### 适用场景

- **基本值快照：** 返回 number、string、boolean 等基本值
- **对象快照：** 返回缓存的不可变对象引用
- **选择器模式：** 从大的状态中选取子集

### 常见问题

#### getSnapshot 返回新对象导致无限循环

**问题描述：** 组件不断重新渲染，控制台可能出现 "Maximum update depth exceeded"。

**原因分析：** getSnapshot 每次返回新对象引用，Object.is 比较永远为 false，React 不断触发更新。

**解决方案：**

```tsx
// 错误：每次创建新对象
// const getSnapshot = () => ({ width: window.innerWidth, height: window.innerHeight });

// 正确方案1：缓存引用
let cached = { width: window.innerWidth, height: window.innerHeight };

function getWindowSize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (cached.width !== w || cached.height !== h) {
        cached = { width: w, height: h };  // 只在值变化时创建新引用
    }
    return cached;
}

// 正确方案2：返回基本值
function getWidth() {
    return window.innerWidth;  // 基本值，Object.is 正确比较
}
```

#### 选择器模式的实现

**问题描述：** 只需要外部状态的一部分，如何避免无关字段变化导致重渲染。

**解决方案：**

```tsx
// 选择器：只提取需要的字段
let cachedName = storeData.name;
function getNameSnapshot() {
    if (cachedName !== storeData.name) {
        cachedName = storeData.name;
    }
    return cachedName;
}

// 使用：只有 name 变化时才重渲染
function NameDisplay() {
    const name = useSyncExternalStore(subscribe, getNameSnapshot);
    return <p>{name}</p>;
}
```

### 注意事项

- getSnapshot 必须返回不可变值或缓存的引用
- 状态未变化时连续调用必须返回相同引用（Object.is 相等）
- 每次返回新对象会导致无限循环
- 基本值（string、number、boolean）天然满足要求
- 对象值需要手动缓存，只在实际变化时更新引用
- getSnapshot 是纯函数，可能在渲染期间被多次调用

### 总结

getSnapshot 是 useSyncExternalStore 的状态读取函数，必须返回不可变值且在状态未变时返回相同引用。基本值天然满足要求，对象值需要手动缓存引用。每次返回新对象会导致无限渲染循环。选择器模式可以只订阅状态的子集，减少不必要的重渲染。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useSyncExternalStore的server snapshot

### 概念说明

`useSyncExternalStore` 的第三个参数 `getServerSnapshot` 用于服务端渲染（SSR）场景。在服务端没有浏览器 API（如 window、navigator、localStorage），直接调用客户端的 getSnapshot 会报错。getServerSnapshot 提供了一个服务端环境下的状态快照，确保 SSR 能正常完成。

当使用 Next.js 等 SSR 框架时，如果订阅了浏览器专属的外部状态源（如窗口尺寸、在线状态），必须提供 getServerSnapshot，否则服务端渲染时会抛出错误。

### API 签名与参数

```typescript
useSyncExternalStore<T>(
    subscribe: (onStoreChange: () => void) => () => void,
    getSnapshot: () => T,
    getServerSnapshot?: () => T   // 服务端渲染时使用的快照函数
): T;
```

| 参数 | 环境 | 说明 |
|------|------|------|
| getSnapshot | 客户端 | 从浏览器 API 或外部 Store 读取状态 |
| getServerSnapshot | 服务端 | 提供合理的默认值，不依赖浏览器 API |

### 基本示例

```tsx
// 示例说明：订阅窗口宽度，支持 SSR

import { useSyncExternalStore } from "react";

// 订阅窗口 resize 事件
function subscribeWindowWidth(callback: () => void) {
    window.addEventListener("resize", callback);
    return () => window.removeEventListener("resize", callback);
}

// 客户端快照：读取实际窗口宽度
function getWidthSnapshot(): number {
    return window.innerWidth;
}

// 服务端快照：提供合理的默认值（服务端没有 window 对象）
function getServerWidthSnapshot(): number {
    return 1024;  // 假设默认桌面宽度
}

function useWindowWidth(): number {
    return useSyncExternalStore(
        subscribeWindowWidth,
        getWidthSnapshot,
        getServerWidthSnapshot  // SSR 时使用
    );
}

// 使用
function ResponsiveLayout() {
    const width = useWindowWidth();
    const isMobile = width < 768;

    return (
        <div>
            <p>窗口宽度: {width}px</p>
            {isMobile ? <MobileNav /> : <DesktopNav />}
        </div>
    );
}

function MobileNav() {
    return <nav>移动端导航</nav>;
}

function DesktopNav() {
    return <nav>桌面端导航</nav>;
}

export default ResponsiveLayout;
```

**运行效果：** 服务端渲染时使用 1024px 作为默认宽度，客户端 hydration 后使用实际窗口宽度。如果实际宽度与服务端默认值不同，React 会在 hydration 后自动更新。

### 内部原理

#### SSR 与 Hydration 的执行流程

```
1. 服务端渲染：
   - 调用 getServerSnapshot() → 返回 1024
   - 生成 HTML: <nav>桌面端导航</nav>

2. 客户端 Hydration：
   - 调用 getSnapshot() → 返回实际宽度（如 375）
   - 与服务端快照比较：1024 !== 375
   - 触发客户端重新渲染，更新为 <nav>移动端导航</nav>

3. 后续交互：
   - 窗口 resize → subscribe 的回调被触发
   - 调用 getSnapshot() 获取新宽度
   - 与缓存值比较，不同则重新渲染
```

#### 不提供 getServerSnapshot 时的报错

如果在 SSR 环境下不提供第三个参数，React 会抛出错误：

```
Error: Missing getServerSnapshot, which is required for server-rendered content.
```

### 进阶用法

```tsx
// 进阶场景：订阅在线状态，支持 SSR

import { useSyncExternalStore } from "react";

function subscribeOnline(callback: () => void) {
    window.addEventListener("online", callback);
    window.addEventListener("offline", callback);
    return () => {
        window.removeEventListener("online", callback);
        window.removeEventListener("offline", callback);
    };
}

function getOnlineSnapshot(): boolean {
    return navigator.onLine;
}

// 服务端假设在线
function getServerOnlineSnapshot(): boolean {
    return true;
}

function useOnlineStatus(): boolean {
    return useSyncExternalStore(
        subscribeOnline,
        getOnlineSnapshot,
        getServerOnlineSnapshot
    );
}

export { useOnlineStatus };
```

### 与相关API的对比

| 对比维度 | getSnapshot | getServerSnapshot |
|----------|------------|-------------------|
| 执行环境 | 客户端（浏览器） | 服务端（Node.js） |
| 可用 API | window、navigator、DOM | 无浏览器 API |
| 调用时机 | 客户端渲染和 hydration | 服务端渲染 |
| 是否必须 | 是 | SSR 时必须，纯客户端可省略 |

### 适用场景

- **响应式布局：** 窗口尺寸订阅需要 SSR 默认值
- **在线/离线状态：** 服务端默认假设在线
- **媒体查询：** 服务端提供默认匹配结果
- **localStorage 数据：** 服务端提供空值或默认值

### 常见问题

#### Hydration 不匹配警告

**问题描述：** 服务端和客户端渲染结果不同，React 输出 hydration mismatch 警告。

**原因分析：** getServerSnapshot 返回的值与客户端 getSnapshot 的实际值不同，导致服务端 HTML 和客户端 DOM 不一致。

**解决方案：**

```tsx
// 这种不匹配是预期行为，React 会在 hydration 后更新为正确值
// 如果想避免闪烁，可以在服务端和客户端都渲染两种可能的 UI，
// 通过 CSS 控制显示隐藏

// 或者使用 suppressHydrationWarning
<div suppressHydrationWarning>
    {/* 可能不匹配的内容 */}
</div>
```

### 注意事项

- SSR 环境中必须提供 getServerSnapshot，否则报错
- getServerSnapshot 不能依赖浏览器 API
- 服务端快照应该返回合理的默认值
- Hydration 后 React 会自动用客户端快照更新
- 服务端和客户端快照不一致会产生短暂的内容闪烁
- 纯客户端渲染（不使用 SSR）可以省略第三个参数

### 总结

getServerSnapshot 是 useSyncExternalStore 的 SSR 支持参数，在服务端渲染时提供不依赖浏览器 API 的默认状态值。使用 Next.js 等 SSR 框架订阅浏览器状态时必须提供此参数。Hydration 后 React 自动切换为客户端实际值。服务端快照应该返回合理的默认值以减少内容闪烁。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。



## 6.3 副作用Hooks

## useEffect的副作用函数执行时机

### 概念说明

`useEffect` 是 React 中处理副作用的核心 Hook。副作用指的是那些超出纯渲染范围的操作，比如数据请求、DOM 操作、事件订阅、定时器等。useEffect 的回调函数在组件渲染完成并且浏览器完成绘制（Paint）之后异步执行，不会阻塞页面的视觉更新。

具体来说，useEffect 的执行时机是：组件的 JSX 被转化为真实 DOM 并提交到页面（Commit 阶段）→ 浏览器完成布局和绘制 → useEffect 回调在下一个微任务或宏任务中执行。这保证了用户能先看到渲染结果，副作用不会延迟首屏显示。

### API 签名与参数

```typescript
function useEffect(
    effect: () => (void | (() => void)),
    deps?: ReadonlyArray<unknown>
): void;
```

| 参数 | 类型 | 是否必填 | 说明 |
|------|------|----------|------|
| effect | () => void \| (() => void) | 是 | 副作用函数，可选返回清理函数 |
| deps | unknown[] | 否 | 依赖项数组，控制 effect 的执行时机 |

**返回值：** `void`

### 基本示例

```tsx
// 示例说明：展示 useEffect 在不同依赖项配置下的执行时机

import React, { useState, useEffect } from "react";

function EffectTimingDemo() {
    const [count, setCount] = useState(0);
    const [name, setName] = useState("张三");

    // 场景1：无依赖项数组 → 每次渲染后都执行
    useEffect(() => {
        console.log("每次渲染后执行");
    });

    // 场景2：空依赖项数组 → 只在挂载后执行一次
    useEffect(() => {
        console.log("组件挂载后执行一次");
        // 相当于类组件的 componentDidMount
    }, []);

    // 场景3：有依赖项 → 依赖项变化时执行
    useEffect(() => {
        console.log(`count 变化了: ${count}`);
        document.title = `计数: ${count}`;
    }, [count]);  // 只有 count 变化时执行

    return (
        <div>
            <p>count: {count}</p>
            <button onClick={() => setCount(c => c + 1)}>+1</button>
            <p>name: {name}</p>
            <input value={name} onChange={e => setName(e.target.value)} />
        </div>
    );
}

export default EffectTimingDemo;
```

**运行效果：** 首次渲染后三个 effect 都执行。点击 +1 时，场景1和场景3执行，场景2不执行。修改 name 时，只有场景1执行。

### 内部原理

#### useEffect 在 React 渲染流程中的位置

```
组件函数执行（Render 阶段）
    ↓
生成虚拟 DOM，进行 Diff 比较
    ↓
将变化提交到真实 DOM（Commit 阶段）
    ↓
浏览器进行布局（Layout）和绘制（Paint）
    ↓
useEffect 回调异步执行（不阻塞绘制）
```

#### 依赖项比较机制

```javascript
// React 内部简化逻辑
function updateEffect(create, deps) {
    const prevDeps = hook.memoizedState.deps;

    if (deps !== undefined) {
        // 逐个用 Object.is 比较依赖项
        let changed = false;
        for (let i = 0; i < deps.length; i++) {
            if (!Object.is(deps[i], prevDeps[i])) {
                changed = true;
                break;
            }
        }
        if (!changed) {
            return;  // 依赖项没变，跳过本次 effect
        }
    }

    // 调度 effect 在绘制后异步执行
    schedulePassiveEffect(create);
}
```

### 与相关API的对比

| 对比维度 | useEffect | useLayoutEffect |
|----------|----------|----------------|
| 执行时机 | 浏览器绘制后异步执行 | DOM 更新后、浏览器绘制前同步执行 |
| 是否阻塞绘制 | 不阻塞 | 阻塞 |
| 适用场景 | 数据请求、事件订阅、日志 | DOM 测量、防闪烁 |
| 性能影响 | 低 | 可能导致卡顿 |

### 适用场景

- **数据请求：** 组件挂载后发起 API 请求
- **事件订阅：** 订阅 WebSocket、window 事件等
- **DOM 操作：** 不影响视觉的 DOM 读取和修改
- **日志记录：** 页面访问统计、用户行为追踪
- **定时器：** setInterval、setTimeout 的设置和清理

### 常见问题

#### useEffect 不是 componentDidMount 的直接替代

**问题描述：** 把 useEffect 当作 componentDidMount 使用，发现行为不完全一致。

**原因分析：** componentDidMount 在 DOM 更新后同步执行（类似 useLayoutEffect），而 useEffect 是异步执行的。如果在 effect 中读取 DOM 尺寸并更新状态，可能会产生闪烁。

**解决方案：**

```tsx
// 需要同步执行的场景用 useLayoutEffect
import { useLayoutEffect } from "react";

useLayoutEffect(() => {
    // DOM 更新后立即同步执行
    const height = ref.current.getBoundingClientRect().height;
    setHeight(height);
}, []);
```

### 注意事项

- useEffect 在浏览器绘制后异步执行，不阻塞视觉更新
- 无依赖项数组：每次渲染后都执行
- 空依赖项数组 `[]`：只在挂载后执行一次
- 有依赖项：依赖项变化时执行（Object.is 比较）
- effect 函数不能是 async 函数（不能直接返回 Promise）
- 需要同步执行时用 useLayoutEffect

### 总结

useEffect 在浏览器完成绘制后异步执行副作用，不阻塞页面渲染。通过依赖项数组控制执行时机：无数组每次渲染都执行，空数组只挂载时执行，有依赖项则依赖变化时执行。它不完全等同于 componentDidMount，需要同步执行的场景应使用 useLayoutEffect。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useEffect的清理函数(Cleanup)执行

### 概念说明

useEffect 的回调函数可以返回一个清理函数（Cleanup Function）。清理函数的作用是在副作用"失效"时执行清理操作，防止内存泄漏和过期的副作用残留。清理函数在两个时机执行：组件卸载时，以及下一次 effect 执行前（用于清理上一次 effect 的残留）。

典型需要清理的副作用包括：事件监听器（removeEventListener）、定时器（clearInterval/clearTimeout）、订阅（unsubscribe）、AbortController（取消请求）等。如果不清理，这些副作用会在组件卸载后继续运行，造成内存泄漏或对已卸载组件调用 setState。

### 基本示例

```tsx
// 示例说明：展示清理函数的两种执行时机

import React, { useState, useEffect } from "react";

function Timer() {
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        console.log("设置定时器");
        // 副作用：创建定时器
        const id = setInterval(() => {
            setSeconds(prev => prev + 1);
        }, 1000);

        // 清理函数：清除定时器
        return () => {
            console.log("清理定时器");
            clearInterval(id);
        };
    }, []);  // 空依赖：挂载时设置，卸载时清理

    return <p>计时: {seconds}秒</p>;
}

function ChatRoom({ roomId }: { roomId: string }) {
    useEffect(() => {
        console.log(`连接到房间: ${roomId}`);
        const connection = createConnection(roomId);
        connection.connect();

        // 清理函数：roomId 变化或组件卸载时断开旧连接
        return () => {
            console.log(`断开房间: ${roomId}`);
            connection.disconnect();
        };
    }, [roomId]);  // roomId 变化时：先清理旧连接，再建立新连接

    return <p>当前房间: {roomId}</p>;
}

// 模拟连接
function createConnection(roomId: string) {
    return {
        connect: () => console.log(`已连接 ${roomId}`),
        disconnect: () => console.log(`已断开 ${roomId}`),
    };
}

function App() {
    const [show, setShow] = useState(true);
    const [room, setRoom] = useState("general");

    return (
        <div>
            <button onClick={() => setShow(s => !s)}>
                {show ? "卸载Timer" : "挂载Timer"}
            </button>
            {show && <Timer />}

            <select value={room} onChange={e => setRoom(e.target.value)}>
                <option value="general">综合</option>
                <option value="tech">技术</option>
            </select>
            <ChatRoom roomId={room} />
        </div>
    );
}

export default App;
```

**运行效果：** 卸载 Timer 时清理定时器。切换房间时，先断开旧房间连接，再连接新房间。

### 内部原理

#### 清理函数的执行顺序

```
依赖项变化时的执行顺序：

1. 组件重新渲染（新的 JSX）
2. React 提交 DOM 变化
3. 浏览器绘制
4. 执行上一次 effect 的清理函数（旧闭包中的 cleanup）
5. 执行本次 effect 的回调函数（新闭包中的 effect）

卸载时的执行顺序：
1. 组件从 DOM 中移除
2. 执行最后一次 effect 的清理函数
```

```javascript
// React 内部简化逻辑
function commitPassiveUnmountEffects(fiber) {
    const effect = fiber.memoizedState;
    if (effect.destroy !== undefined) {
        // 先执行清理函数
        effect.destroy();
    }
}

function commitPassiveMountEffects(fiber) {
    const effect = fiber.memoizedState;
    // 再执行新的 effect，保存返回的清理函数
    effect.destroy = effect.create();
}
```

### 适用场景

- **事件监听：** addEventListener / removeEventListener
- **定时器：** setInterval / clearInterval
- **订阅：** WebSocket、EventEmitter 的 subscribe / unsubscribe
- **请求取消：** AbortController 的 abort
- **第三方库：** 地图、图表库实例的销毁

### 常见问题

#### 对已卸载的组件调用 setState

**问题描述：** 控制台警告 "Can't perform a React state update on an unmounted component"。

**原因分析：** 异步操作（如 fetch）完成后组件已卸载，但回调仍然尝试 setState。

**解决方案：**

```tsx
useEffect(() => {
    // 使用 AbortController 取消请求
    const controller = new AbortController();

    fetch("/api/data", { signal: controller.signal })
        .then(res => res.json())
        .then(data => {
            // 请求未被取消时才更新状态
            setData(data);
        })
        .catch(err => {
            if (err.name !== "AbortError") {
                setError(err.message);
            }
        });

    // 清理：取消请求
    return () => controller.abort();
}, []);
```

#### Strict Mode 下 effect 执行两次

**问题描述：** 开发模式下 effect 和清理函数各执行了两次。

**原因分析：** React Strict Mode 会故意 mount → unmount → mount 组件来检测副作用是否正确清理。

**解决方案：** 这只在开发模式下发生，生产模式正常。确保清理函数能正确撤销副作用即可。

### 注意事项

- 清理函数在下一次 effect 执行前和组件卸载时运行
- 清理函数捕获的是上一次渲染的闭包变量
- 忘记清理会导致内存泄漏
- Strict Mode 下 effect 执行两次是预期行为
- 清理函数不需要处理所有边界情况，只需撤销 effect 创建的副作用

### 总结

useEffect 的清理函数在两个时机执行：下一次 effect 执行前（清理旧副作用）和组件卸载时。需要清理的副作用包括事件监听、定时器、订阅和网络请求。忘记清理会导致内存泄漏。Strict Mode 下双重执行是用来检测清理逻辑是否正确。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useEffect的依赖项数组比较(浅比较)

### 概念说明

useEffect 通过依赖项数组（deps）决定是否重新执行 effect。React 使用 `Object.is` 对依赖项数组中的每一项逐个进行浅比较（Shallow Comparison）。只要有一项不同，就重新执行 effect；如果所有项都相同，则跳过本次 effect。

浅比较只比较值本身或引用地址，不会递归比较对象内部的属性。这意味着即使两个对象内容完全相同，但如果引用不同（每次渲染都创建了新对象），React 会认为依赖项发生了变化。

### 基本示例

```tsx
// 示例说明：展示浅比较对不同类型依赖项的影响

import React, { useState, useEffect } from "react";

function ShallowCompareDemo() {
    const [count, setCount] = useState(0);
    const [name, setName] = useState("张三");

    // 基本值依赖：Object.is(0, 0) === true，不重新执行
    // Object.is(0, 1) === false，重新执行
    useEffect(() => {
        console.log(`count 变化: ${count}`);
    }, [count]);

    // 字符串依赖：值相同则不执行
    useEffect(() => {
        console.log(`name 变化: ${name}`);
    }, [name]);

    // 对象依赖：每次渲染创建新对象，引用不同，每次都执行
    const config = { theme: "dark" };  // 每次渲染都是新引用
    useEffect(() => {
        console.log("config 变化（实际内容没变，但引用变了）");
    }, [config]);  // 每次渲染都执行，因为 config 引用每次不同

    return (
        <div>
            <p>count: {count}</p>
            <button onClick={() => setCount(c => c + 1)}>+1</button>
            <button onClick={() => setName("张三")}>设置相同name</button>
        </div>
    );
}

export default ShallowCompareDemo;
```

**运行效果：** 点击 +1 时 count effect 执行。点击"设置相同name"不触发 name effect（值没变）。config effect 每次渲染都执行（引用总是新的）。

### 内部原理

#### Object.is 的比较规则

```javascript
// React 内部的依赖项比较
function areHookInputsEqual(nextDeps, prevDeps) {
    for (let i = 0; i < prevDeps.length; i++) {
        if (Object.is(nextDeps[i], prevDeps[i])) {
            continue;  // 相同，检查下一项
        }
        return false;  // 有一项不同，需要重新执行
    }
    return true;  // 全部相同，跳过执行
}

// Object.is 的行为
Object.is(1, 1);           // true（基本值相同）
Object.is("a", "a");       // true
Object.is(true, true);     // true
Object.is(null, null);     // true
Object.is(NaN, NaN);       // true（特殊：=== 是 false）
Object.is({}, {});          // false（不同引用）
Object.is([], []);          // false（不同引用）
const obj = {};
Object.is(obj, obj);       // true（同一引用）
```

### 与相关API的对比

| 数据类型 | 每次渲染是否创建新引用 | 浅比较结果 | effect 是否重新执行 |
|----------|---------------------|-----------|-------------------|
| number/string/boolean | 否（基本值） | 值相同则 true | 值不变则不执行 |
| 函数（内联定义） | 是 | false | 每次都执行 |
| 对象字面量 | 是 | false | 每次都执行 |
| 数组字面量 | 是 | false | 每次都执行 |
| useState 的 state | 否（引用稳定） | 值相同则 true | 值不变则不执行 |
| useRef 的 ref | 否（引用稳定） | true | 不执行 |

### 适用场景

- **基本值依赖：** count、name、isOpen 等直接用作依赖
- **引用类型依赖：** 需要用 useMemo/useCallback 稳定化后再用作依赖
- **精确控制执行：** 通过依赖项数组精确控制 effect 何时重新执行

### 常见问题

#### 对象/数组依赖导致 effect 每次都执行

**问题描述：** effect 明明依赖项内容没变，但每次渲染都执行。

**原因分析：** 在渲染函数中创建的对象/数组/函数，每次渲染都是新引用。

**解决方案：**

```tsx
// 错误：对象每次渲染都是新引用
const options = { page: 1, size: 10 };
useEffect(() => {
    fetchData(options);
}, [options]);  // 每次渲染都执行

// 方案1：用 useMemo 稳定化对象引用
const options = useMemo(() => ({ page: 1, size: 10 }), []);
useEffect(() => {
    fetchData(options);
}, [options]);  // 只在 options 真正变化时执行

// 方案2：将基本值作为依赖项
const page = 1;
const size = 10;
useEffect(() => {
    fetchData({ page, size });
}, [page, size]);  // 基本值比较，稳定
```

### 注意事项

- 浅比较只比较引用或基本值，不递归比较对象内部
- 内联创建的对象、数组、函数每次渲染都是新引用
- 用 useMemo 稳定化对象依赖，用 useCallback 稳定化函数依赖
- 尽量用基本值作为依赖项，避免引用类型
- Object.is(NaN, NaN) 是 true，和 === 不同
- 依赖项数组的长度不应在渲染间变化

### 总结

useEffect 用 Object.is 逐项浅比较依赖项数组。基本值（number、string、boolean）比较值本身，引用类型比较引用地址。每次渲染内联创建的对象/数组/函数引用总是新的，会导致 effect 每次执行。用 useMemo/useCallback 稳定化引用，或直接用基本值作为依赖项。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useEffect的依赖项完整性检查(ESLint)

### 概念说明

`eslint-plugin-react-hooks` 提供了 `exhaustive-deps` 规则，用于检查 useEffect、useMemo、useCallback 等 Hook 的依赖项数组是否完整。如果 effect 回调中引用了某个响应式变量（props、state、从它们派生的值），但依赖项数组中没有包含它，ESLint 会发出警告。

这条规则的目的是防止闭包陷阱——漏掉依赖项会导致 effect 中使用的变量是旧值，产生难以排查的 bug。React 官方强烈建议始终开启这条规则，不要随意禁用。

### 基本示例

```tsx
// 示例说明：展示 exhaustive-deps 规则的检查行为

import React, { useState, useEffect } from "react";

function SearchComponent({ query }: { query: string }) {
    const [results, setResults] = useState<string[]>([]);

    // ESLint 警告：React Hook useEffect has a missing dependency: 'query'
    // useEffect(() => {
    //     fetchResults(query).then(setResults);
    // }, []);  // 缺少 query 依赖

    // 正确：包含所有依赖项
    useEffect(() => {
        fetchResults(query).then(setResults);
    }, [query]);  // query 变化时重新请求

    return (
        <ul>
            {results.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
    );
}

// ESLint 也会检查函数依赖
function DataFetcher({ url, onSuccess }: { url: string; onSuccess: (data: any) => void }) {
    // 警告：missing dependency 'onSuccess'
    // useEffect(() => {
    //     fetch(url).then(res => res.json()).then(onSuccess);
    // }, [url]);

    // 正确：包含 onSuccess
    useEffect(() => {
        fetch(url).then(res => res.json()).then(onSuccess);
    }, [url, onSuccess]);  // 需要父组件用 useCallback 稳定化 onSuccess

    return null;
}

async function fetchResults(query: string): Promise<string[]> {
    return [`结果: ${query}`];
}

export default SearchComponent;
```

### 内部原理

#### exhaustive-deps 规则的检查逻辑

ESLint 插件通过静态分析 effect 回调中引用的变量，与依赖项数组中列出的变量做对比：

```
1. 扫描 effect 函数体中引用的所有变量
2. 过滤出"响应式"变量（props、state、从它们派生的值）
3. 排除不需要依赖的变量（useRef.current、组件外部常量、setState/dispatch）
4. 对比依赖项数组：
   - 缺少的变量 → 发出 "missing dependency" 警告
   - 多余的变量 → 发出 "unnecessary dependency" 警告
```

#### 不需要加入依赖项的值

```tsx
// 以下值在组件生命周期内引用稳定，不需要加入依赖项
const [count, setCount] = useState(0);
const ref = useRef(0);
const dispatch = useDispatch();  // Redux dispatch

useEffect(() => {
    setCount(1);        // setState 引用稳定，不需要依赖
    ref.current = 1;    // ref 引用稳定，不需要依赖
    dispatch(action);   // dispatch 引用稳定，不需要依赖
}, []);  // ESLint 不会警告
```

### 适用场景

- **所有使用 useEffect 的场景：** 始终开启 exhaustive-deps 规则
- **团队协作：** 统一依赖项管理规范
- **代码审查：** 自动检测潜在的闭包陷阱

### 常见问题

#### 加了函数依赖导致无限循环

**问题描述：** 按照 ESLint 提示加了函数到依赖项，导致 effect 无限执行。

**原因分析：** 内联定义的函数每次渲染都是新引用，加入依赖项后每次都不同。

**解决方案：**

```tsx
// 问题：内联函数每次渲染新引用
function Parent() {
    // 每次渲染都创建新的 fetchData
    const fetchData = () => fetch("/api/data");

    return <Child fetchData={fetchData} />;
}

// 方案1：用 useCallback 稳定化
function Parent() {
    const fetchData = useCallback(() => fetch("/api/data"), []);
    return <Child fetchData={fetchData} />;
}

// 方案2：把函数移到 effect 内部
function Child({ url }: { url: string }) {
    useEffect(() => {
        // 函数定义在 effect 内部，不需要作为依赖项
        const fetchData = () => fetch(url);
        fetchData().then(/* ... */);
    }, [url]);  // 只依赖 url

    return null;
}
```

#### 想要只执行一次但 ESLint 要求加依赖

**问题描述：** 想在挂载时执行一次，但 effect 中引用了 props/state。

**解决方案：**

```tsx
// 如果确实只想执行一次，考虑是否真的不需要响应依赖变化
// 大多数情况下，ESLint 的建议是正确的

// 如果确实是特殊场景（如初始化第三方库），可以用 ref 标记
const initialized = useRef(false);
useEffect(() => {
    if (!initialized.current) {
        initialized.current = true;
        initializeLibrary(config);
    }
}, [config]);  // 满足 ESLint，但只执行一次
```

### 注意事项

- 始终开启 exhaustive-deps 规则，不要全局禁用
- 遵循规则建议，添加缺少的依赖项
- 函数依赖用 useCallback 稳定化，对象依赖用 useMemo 稳定化
- 可以把函数定义移到 effect 内部来消除函数依赖
- `// eslint-disable-next-line` 只在极少数确认安全的场景使用
- setState、dispatch、useRef 的引用稳定，不需要加入依赖

### 总结

exhaustive-deps 规则确保 useEffect 的依赖项完整，防止闭包陷阱。effect 中引用的响应式变量都应该出现在依赖项数组中。函数依赖用 useCallback 稳定化或移到 effect 内部。setState 和 dispatch 引用稳定不需要依赖。始终开启此规则，极少数场景才用注释禁用。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useEffect的空依赖数组[]的挂载/卸载模式

### 概念说明

当 useEffect 的依赖项数组为空数组 `[]` 时，effect 回调只在组件挂载后执行一次，清理函数只在组件卸载时执行一次。这种模式等价于类组件的 `componentDidMount`（挂载）和 `componentWillUnmount`（卸载）的组合。

空依赖数组告诉 React："这个 effect 不依赖任何响应式变量，只需要在挂载时运行一次。"适用于一次性的初始化操作，如设置全局事件监听、初始化第三方库、建立 WebSocket 连接等。

### 基本示例

```tsx
// 示例说明：展示空依赖数组的挂载/卸载模式

import React, { useState, useEffect, useRef } from "react";

function WindowResizeTracker() {
    const [size, setSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight,
    });

    // 空依赖数组：挂载时添加监听，卸载时移除监听
    useEffect(() => {
        console.log("组件挂载：添加 resize 监听");

        const handleResize = () => {
            setSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        window.addEventListener("resize", handleResize);

        // 清理函数：组件卸载时移除监听
        return () => {
            console.log("组件卸载：移除 resize 监听");
            window.removeEventListener("resize", handleResize);
        };
    }, []);  // 空数组：只执行一次

    return (
        <p>窗口尺寸: {size.width} x {size.height}</p>
    );
}

// 第三方库初始化示例
function ChartComponent() {
    const chartRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // 挂载时初始化图表
        const chart = initChart(chartRef.current!);

        // 卸载时销毁图表实例，释放内存
        return () => {
            chart.destroy();
        };
    }, []);

    return <div ref={chartRef} style={{ width: 600, height: 400 }} />;
}

function initChart(container: HTMLDivElement) {
    console.log("图表初始化");
    return {
        destroy: () => console.log("图表销毁"),
    };
}

export default WindowResizeTracker;
```

**运行效果：** 组件挂载时添加窗口 resize 监听并输出日志，窗口尺寸实时更新。组件卸载时自动移除监听。

### 内部原理

#### 空依赖数组的执行逻辑

```javascript
// React 内部简化逻辑
function updateEffect(create, deps) {
    const prevDeps = hook.memoizedState.deps;

    if (deps.length === 0) {
        // 空数组：与上次比较结果始终为"相同"
        // 首次挂载时 prevDeps 为 null，执行 effect
        // 后续渲染 prevDeps 为 []，与 [] 比较全部相同，跳过
        if (prevDeps !== null) {
            return;  // 跳过执行
        }
    }

    // 首次挂载或依赖变化时，调度 effect
    schedulePassiveEffect(create);
}
```

### 与相关API的对比

| 依赖项配置 | 执行时机 | 类组件等价 |
|-----------|---------|-----------|
| 无依赖项数组 | 每次渲染后 | componentDidMount + componentDidUpdate |
| 空数组 `[]` | 挂载后一次 | componentDidMount |
| 有依赖项 `[a, b]` | 依赖变化时 | componentDidUpdate（部分） |

### 适用场景

- **全局事件监听：** window resize、scroll、keydown
- **第三方库初始化：** 图表、地图、编辑器等
- **WebSocket 连接：** 建立连接和断开连接
- **页面访问统计：** 发送一次性的 PV 记录
- **DOM 测量：** 挂载后测量元素尺寸（配合 useLayoutEffect 更好）

### 常见问题

#### Strict Mode 下执行了两次

**问题描述：** 开发模式下 effect 执行了两次。

**原因分析：** React Strict Mode 故意执行 mount → unmount → mount 来检测副作用清理是否正确。

**解决方案：**

```tsx
// 这是预期行为，只在开发模式下发生
// 确保清理函数能正确撤销副作用即可
useEffect(() => {
    const connection = createConnection();
    connection.connect();
    return () => connection.disconnect();  // 正确清理
}, []);
// Strict Mode：connect → disconnect → connect
// 生产模式：connect（只一次）
```

#### 空依赖数组中使用了外部变量

**问题描述：** effect 中引用了 props 或 state，但依赖项为空数组，ESLint 警告。

**原因分析：** effect 中使用的变量在后续渲染中可能变化，但空依赖数组让 effect 不会重新执行，导致使用旧值。

**解决方案：**

```tsx
// 错误：使用了 userId 但不依赖它
// useEffect(() => {
//     fetchUser(userId);  // userId 变化后不会重新请求
// }, []);

// 正确：加入依赖项
useEffect(() => {
    fetchUser(userId);
}, [userId]);  // userId 变化时重新请求
```

### 注意事项

- 空依赖数组 `[]` 表示 effect 不依赖任何响应式变量
- effect 中引用了 props/state 就不应该用空数组（ESLint 会警告）
- 清理函数在组件卸载时执行，防止内存泄漏
- Strict Mode 下双重执行是预期行为，用于检测清理逻辑
- 空依赖数组中的 effect 不等于"只执行一次"——它是"不依赖任何变量"

### 总结

空依赖数组 `[]` 让 useEffect 只在挂载后执行一次，清理函数在卸载时执行，等价于 componentDidMount + componentWillUnmount。适用于一次性初始化和全局事件监听。effect 中引用了响应式变量时不应该用空数组。Strict Mode 下的双重执行是用于检测清理逻辑的正确性。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useEffect的依赖项对象/数组比较陷阱

### 概念说明

useEffect 的依赖项通过 Object.is 进行浅比较，对于对象和数组只比较引用地址。在函数组件中，每次渲染都会重新执行函数体，内联创建的对象和数组每次都是新的引用，即使内容完全相同。这导致 useEffect 在每次渲染后都认为依赖项发生了变化，从而重复执行 effect。

这是 React Hooks 中最常见的性能陷阱之一，严重时会导致无限循环渲染。

### 基本示例

```tsx
// 示例说明：展示对象/数组依赖项的陷阱

import React, { useState, useEffect, useMemo } from "react";

function UserProfile({ userId }: { userId: number }) {
    const [user, setUser] = useState<any>(null);

    // 陷阱：每次渲染创建新的 options 对象
    const options = { headers: { "Authorization": "Bearer token" } };

    // 这个 effect 每次渲染都执行，因为 options 引用每次不同
    useEffect(() => {
        console.log("发起请求（不应该每次渲染都执行）");
        fetch(`/api/users/${userId}`, options)
            .then(res => res.json())
            .then(setUser);
    }, [userId, options]);  // options 每次都是新引用

    return <div>{user?.name}</div>;
}

// 正确做法：用 useMemo 稳定化对象
function UserProfileFixed({ userId }: { userId: number }) {
    const [user, setUser] = useState<any>(null);

    // useMemo 缓存对象引用，依赖项不变时返回同一引用
    const options = useMemo(() => ({
        headers: { "Authorization": "Bearer token" }
    }), []);  // 空依赖：引用始终不变

    useEffect(() => {
        fetch(`/api/users/${userId}`, options)
            .then(res => res.json())
            .then(setUser);
    }, [userId, options]);  // options 引用稳定，只有 userId 变化时执行

    return <div>{user?.name}</div>;
}

export default UserProfileFixed;
```

**运行效果：** 第一个组件每次渲染都发起请求（错误），第二个组件只在 userId 变化时发起请求（正确）。

### 内部原理

#### 为什么内联对象每次都是新引用

```javascript
// 函数组件每次渲染都重新执行
function Component() {
    // 每次执行都创建新的对象字面量
    const obj = { a: 1 };  // 新引用
    const arr = [1, 2, 3];  // 新引用
    const fn = () => {};     // 新引用

    // Object.is 比较引用
    // 上次渲染的 { a: 1 } !== 本次渲染的 { a: 1 }
    // 即使内容完全相同
}
```

### 与相关API的对比

| 解决方案 | 方式 | 适用场景 |
|----------|------|---------|
| useMemo | 缓存对象/数组引用 | 对象/数组作为依赖项 |
| useCallback | 缓存函数引用 | 函数作为依赖项 |
| 提取基本值 | 用基本值替代对象依赖 | 对象中只有少量字段被使用 |
| 移到组件外部 | 常量定义在组件外 | 不依赖 props/state 的常量 |

### 适用场景

- **API 请求配置：** 请求头、查询参数等配置对象
- **样式对象：** 内联 style 对象
- **过滤条件：** 搜索条件、排序配置
- **图表配置：** 第三方库的配置对象

### 常见问题

#### 数组依赖项导致 effect 反复执行

**问题描述：** 传入数组 prop 作为依赖项，effect 每次渲染都执行。

**原因分析：** 父组件每次渲染创建新的数组引用传给子组件。

**解决方案：**

```tsx
// 父组件
function Parent() {
    // 错误：每次渲染创建新数组
    // return <Child items={[1, 2, 3]} />;

    // 正确：用 useMemo 稳定化
    const items = useMemo(() => [1, 2, 3], []);
    return <Child items={items} />;
}

// 子组件：或者用基本值替代数组依赖
function Child({ items }: { items: number[] }) {
    // 方案1：直接使用 items（需要父组件稳定化）
    useEffect(() => {
        processItems(items);
    }, [items]);

    // 方案2：用 JSON.stringify 做深比较（简单场景可用）
    const itemsKey = JSON.stringify(items);
    useEffect(() => {
        processItems(items);
    }, [itemsKey]);

    return null;
}

function processItems(items: number[]) {
    console.log("处理数据", items);
}
```

### 注意事项

- 内联创建的对象/数组/函数每次渲染都是新引用
- 用 useMemo 稳定化对象依赖，用 useCallback 稳定化函数依赖
- 不依赖 props/state 的常量可以移到组件外部
- 尽量用基本值替代对象作为依赖项
- JSON.stringify 做深比较适用于简单数据结构，复杂场景性能差
- 不要为了消除警告随意添加空的依赖项数组

### 总结

对象和数组在 useEffect 依赖项中只做引用比较，内联创建的对象每次渲染都是新引用，导致 effect 每次都执行。解决方案包括：useMemo 稳定化引用、提取基本值作为依赖、将常量移到组件外部。这是 Hooks 中最常见的性能陷阱，理解引用比较机制是避免问题的关键。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useEffect的竞态条件(Race Condition)处理

### 概念说明

竞态条件（Race Condition）是指在 useEffect 中发起异步请求时，由于依赖项快速变化导致多个请求并发执行，后发起的请求可能先返回，先发起的请求后返回，最终组件显示了过期的数据。

例如，用户快速切换搜索关键词 A → B → C，如果请求 A 的响应最后才到达，组件会显示 A 的结果而不是 C 的结果。这在搜索框、Tab 切换、路由跳转等场景中非常常见。

### 基本示例

```tsx
// 示例说明：展示竞态条件问题及解决方案

import React, { useState, useEffect } from "react";

// 问题代码：存在竞态条件
function SearchBad({ query }: { query: string }) {
    const [results, setResults] = useState<string[]>([]);

    useEffect(() => {
        // 快速切换 query 时，多个请求并发
        // 后发起的请求可能先返回
        fetch(`/api/search?q=${query}`)
            .then(res => res.json())
            .then(data => {
                setResults(data);  // 可能设置了过期的结果
            });
    }, [query]);

    return <ul>{results.map((r, i) => <li key={i}>{r}</li>)}</ul>;
}

// 方案1：使用 cleanup 标志位
function SearchWithFlag({ query }: { query: string }) {
    const [results, setResults] = useState<string[]>([]);

    useEffect(() => {
        let cancelled = false;  // 标志位：标记请求是否过期

        fetch(`/api/search?q=${query}`)
            .then(res => res.json())
            .then(data => {
                // 只有未被取消的请求才更新状态
                if (!cancelled) {
                    setResults(data);
                }
            });

        // 清理函数：query 变化时标记上一次请求为过期
        return () => {
            cancelled = true;
        };
    }, [query]);

    return <ul>{results.map((r, i) => <li key={i}>{r}</li>)}</ul>;
}

// 方案2：使用 AbortController 真正取消请求
function SearchWithAbort({ query }: { query: string }) {
    const [results, setResults] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);

        fetch(`/api/search?q=${query}`, { signal: controller.signal })
            .then(res => res.json())
            .then(data => {
                setResults(data);
                setLoading(false);
            })
            .catch(err => {
                // AbortError 是正常取消，不需要处理
                if (err.name !== "AbortError") {
                    console.error("请求失败:", err);
                    setLoading(false);
                }
            });

        // 清理函数：取消上一次的请求
        return () => controller.abort();
    }, [query]);

    return (
        <div>
            {loading && <p>搜索中...</p>}
            <ul>{results.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </div>
    );
}

export default SearchWithAbort;
```

**运行效果：** 快速切换 query 时，方案1忽略过期响应，方案2直接取消过期请求。组件始终显示最新 query 的结果。

### 内部原理

#### 竞态条件的发生机制

```
时间线（query: A → B → C 快速切换）：

t1: query=A → 发起请求A
t2: query=B → 清理A的effect → 发起请求B
t3: query=C → 清理B的effect → 发起请求C
t4: 请求C响应到达 → setResults(C的数据)
t5: 请求A响应到达 → setResults(A的数据)  ← 过期数据覆盖了正确数据
t6: 请求B响应到达 → setResults(B的数据)  ← 又被覆盖

没有竞态处理时，最终显示请求B的数据（最后到达的响应）
但用户期望看到请求C的数据（最后发起的请求）
```

#### AbortController vs 标志位

```
标志位方案：
- 请求仍然在网络层执行完毕
- 只是响应被忽略
- 浪费了网络带宽

AbortController 方案：
- 请求在网络层被真正取消
- 节省了网络带宽
- 浏览器可以复用连接
```

### 与相关API的对比

| 方案 | 是否取消网络请求 | 复杂度 | 兼容性 |
|------|----------------|--------|--------|
| cancelled 标志位 | 否（只忽略响应） | 低 | 全兼容 |
| AbortController | 是（真正取消） | 中 | 现代浏览器 |
| React Query/SWR | 是（内置处理） | 低（封装好了） | 需要引入库 |

### 适用场景

- **搜索框：** 输入关键词实时搜索
- **Tab 切换：** 切换 Tab 加载不同数据
- **路由跳转：** 页面切换时取消上一页的请求
- **下拉选择：** 选项变化触发数据加载

### 常见问题

#### async/await 中如何处理竞态

**问题描述：** 使用 async/await 语法时如何加入竞态处理。

**解决方案：**

```tsx
useEffect(() => {
    const controller = new AbortController();

    // useEffect 不能直接用 async，需要内部定义 async 函数
    async function fetchData() {
        try {
            const res = await fetch(`/api/data?id=${id}`, {
                signal: controller.signal,
            });
            const data = await res.json();
            setData(data);
        } catch (err: any) {
            if (err.name !== "AbortError") {
                setError(err.message);
            }
        }
    }

    fetchData();

    return () => controller.abort();
}, [id]);
```

### 注意事项

- 任何依赖项变化触发的异步请求都可能存在竞态条件
- AbortController 是首选方案，能真正取消网络请求
- cancelled 标志位是简单的后备方案
- useEffect 回调不能直接是 async 函数
- React Query、SWR 等库内置了竞态处理，推荐在实际项目中使用
- 清理函数中的取消操作是防止竞态的关键

### 总结

竞态条件是 useEffect 中异步请求的常见问题，依赖项快速变化时后发先至的响应会覆盖正确数据。解决方案包括 cancelled 标志位（忽略过期响应）和 AbortController（真正取消请求）。AbortController 是首选方案。实际项目中推荐使用 React Query 或 SWR 等库，它们内置了竞态处理。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useLayoutEffect的同步执行时机(DOM突变后)

### 概念说明

`useLayoutEffect` 的签名和 useEffect 完全一致，但执行时机不同。useLayoutEffect 在 React 将变化提交到 DOM 之后、浏览器执行绘制（Paint）之前同步执行。这意味着在 useLayoutEffect 回调中可以同步读取和修改 DOM，浏览器会在回调完成后才进行绘制，用户看到的是修改后的结果。

这个时机等价于类组件的 `componentDidMount` 和 `componentDidUpdate`。当需要在用户看到界面之前就完成 DOM 测量或修改时，useLayoutEffect 是正确的选择。

### API 签名与参数

```typescript
function useLayoutEffect(
    effect: () => (void | (() => void)),
    deps?: ReadonlyArray<unknown>
): void;
```

| 参数 | 类型 | 是否必填 | 说明 |
|------|------|----------|------|
| effect | () => void \| (() => void) | 是 | 同步执行的副作用函数 |
| deps | unknown[] | 否 | 依赖项数组 |

### 基本示例

```tsx
// 示例说明：用 useLayoutEffect 在绘制前测量 DOM 并调整布局

import React, { useState, useLayoutEffect, useRef } from "react";

function Tooltip({ targetRect, children }: {
    targetRect: { top: number; left: number; width: number };
    children: React.ReactNode;
}) {
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    // useLayoutEffect：在绘制前测量 tooltip 尺寸并计算位置
    // 如果用 useEffect，tooltip 会先显示在错误位置，再跳到正确位置（闪烁）
    useLayoutEffect(() => {
        const tooltip = tooltipRef.current;
        if (!tooltip) return;

        const { height } = tooltip.getBoundingClientRect();
        // 计算 tooltip 应该显示在目标元素上方还是下方
        const y = targetRect.top - height > 0
            ? targetRect.top - height - 8  // 上方有空间，显示在上方
            : targetRect.top + 30;          // 上方没空间，显示在下方

        setPosition({
            x: targetRect.left + targetRect.width / 2,
            y,
        });
    }, [targetRect]);

    return (
        <div
            ref={tooltipRef}
            style={{
                position: "absolute",
                left: position.x,
                top: position.y,
                transform: "translateX(-50%)",
            }}
        >
            {children}
        </div>
    );
}

export default Tooltip;
```

**运行效果：** Tooltip 直接出现在正确位置，不会先闪烁在错误位置再跳到正确位置。

### 内部原理

#### 执行时机对比

```
React 渲染流程：

1. 组件函数执行（Render 阶段）
2. React 计算 DOM 变化（Diff）
3. React 将变化提交到真实 DOM（Commit 阶段）
   ↓
4. useLayoutEffect 同步执行 ← 在这里！浏览器还没绘制
   ↓
5. 浏览器执行布局（Layout）和绘制（Paint）
   ↓
6. useEffect 异步执行 ← 在这里！用户已经看到画面
```

#### 同步执行的含义

```javascript
// useLayoutEffect 的执行是同步的
// 浏览器主线程被阻塞，直到回调完成才会绘制

function commitLayoutEffects(fiber) {
    // 同步执行 useLayoutEffect
    const effect = fiber.updateQueue;
    if (effect.tag & LayoutEffect) {
        // 先执行清理函数
        if (effect.destroy) effect.destroy();
        // 再执行新的 effect
        effect.destroy = effect.create();
        // 这里是同步的，不会让出主线程
    }
}
// 所有 useLayoutEffect 完成后，浏览器才开始绘制
```

### 与相关API的对比

| 对比维度 | useEffect | useLayoutEffect |
|----------|----------|----------------|
| 执行时机 | 绘制后异步 | 绘制前同步 |
| 是否阻塞绘制 | 不阻塞 | 阻塞 |
| DOM 读取 | 可以，但用户已看到中间状态 | 可以，用户看不到中间状态 |
| DOM 修改 | 会导致闪烁 | 不会闪烁 |
| 性能影响 | 低 | 回调耗时长会导致卡顿 |
| 默认选择 | 优先使用 | 只在需要时使用 |

### 适用场景

- **DOM 测量：** 读取元素尺寸、位置用于布局计算
- **防闪烁修改：** 修改 DOM 后用户不应看到中间状态
- **Tooltip/Popover 定位：** 根据内容尺寸计算弹出位置
- **滚动位置恢复：** 页面切换后恢复滚动位置
- **动画初始化：** 在绘制前设置动画起始状态

### 常见问题

#### useLayoutEffect 导致页面卡顿

**问题描述：** 使用 useLayoutEffect 后页面响应变慢。

**原因分析：** useLayoutEffect 是同步执行的，如果回调耗时过长会阻塞浏览器绘制。

**解决方案：**

```tsx
// 只在 useLayoutEffect 中做必要的 DOM 读取
useLayoutEffect(() => {
    // 快速读取 DOM 信息
    const rect = ref.current.getBoundingClientRect();
    setPosition({ x: rect.left, y: rect.top });
    // 不要在这里做耗时操作（网络请求、大量计算等）
}, []);

// 耗时操作放在 useEffect 中
useEffect(() => {
    // 数据请求、日志记录等不影响视觉的操作
    fetchData();
}, []);
```

### 注意事项

- useLayoutEffect 在绘制前同步执行，会阻塞浏览器绘制
- 回调中只做必要的 DOM 测量和修改，避免耗时操作
- 默认优先使用 useEffect，只在需要防闪烁时使用 useLayoutEffect
- SSR 环境下 useLayoutEffect 会输出警告（服务端没有 DOM）
- SSR 场景可以用 useEffect 替代，或使用条件判断

### 总结

useLayoutEffect 在 DOM 更新后、浏览器绘制前同步执行，适用于需要在用户看到界面之前完成 DOM 测量或修改的场景。它能防止闪烁但会阻塞绘制，回调中应只做快速的 DOM 操作。默认优先使用 useEffect，只在确需防闪烁时才用 useLayoutEffect。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useLayoutEffect的闪烁避免应用

### 概念说明

useLayoutEffect 最核心的应用场景是避免视觉闪烁（Flash of Unstyled Content）。当组件需要先渲染出初始状态，然后根据 DOM 测量结果调整布局时，如果用 useEffect，用户会先看到初始状态再看到调整后的状态，产生明显的闪烁。useLayoutEffect 在浏览器绘制前同步执行，用户只会看到调整后的最终结果。

### 基本示例

```tsx
// 示例说明：自适应高度的折叠面板，避免展开时的闪烁

import React, { useState, useRef, useLayoutEffect } from "react";

interface CollapsibleProps {
    isOpen: boolean;
    children: React.ReactNode;
}

function Collapsible({ isOpen, children }: CollapsibleProps) {
    const contentRef = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState<number | "auto">(0);

    // useLayoutEffect：在绘制前测量内容高度并设置
    // 用 useEffect 会导致：先显示 height=0，再跳到实际高度（闪烁）
    useLayoutEffect(() => {
        if (isOpen) {
            // 展开：测量内容实际高度
            const contentHeight = contentRef.current?.scrollHeight ?? 0;
            setHeight(contentHeight);
        } else {
            // 折叠：高度设为 0
            setHeight(0);
        }
    }, [isOpen]);

    return (
        <div
            style={{
                height: typeof height === "number" ? `${height}px` : height,
                overflow: "hidden",
                transition: "height 0.3s ease",
            }}
        >
            <div ref={contentRef}>
                {children}
            </div>
        </div>
    );
}

// 使用
function App() {
    const [open, setOpen] = useState(false);

    return (
        <div>
            <button onClick={() => setOpen(o => !o)}>
                {open ? "折叠" : "展开"}
            </button>
            <Collapsible isOpen={open}>
                <p>这是一段可以折叠的内容。</p>
                <p>它的高度会根据内容自适应。</p>
                <p>展开和折叠都有平滑的过渡动画。</p>
            </Collapsible>
        </div>
    );
}

export default App;
```

**运行效果：** 点击按钮时，面板平滑地展开或折叠，没有闪烁。高度在绘制前就已经设置为正确值。

### 进阶用法

```tsx
// 进阶场景：动态定位的下拉菜单

import React, { useState, useRef, useLayoutEffect } from "react";

interface DropdownProps {
    trigger: React.ReactNode;
    children: React.ReactNode;
}

function Dropdown({ trigger, children }: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [placement, setPlacement] = useState<"bottom" | "top">("bottom");
    const triggerRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // 在绘制前计算下拉菜单应该出现在上方还是下方
    useLayoutEffect(() => {
        if (!isOpen || !triggerRef.current || !menuRef.current) return;

        const triggerRect = triggerRef.current.getBoundingClientRect();
        const menuHeight = menuRef.current.scrollHeight;
        const viewportHeight = window.innerHeight;

        // 下方空间不够则显示在上方
        if (triggerRect.bottom + menuHeight > viewportHeight && triggerRect.top > menuHeight) {
            setPlacement("top");
        } else {
            setPlacement("bottom");
        }
    }, [isOpen]);

    return (
        <div style={{ position: "relative" }}>
            <div ref={triggerRef} onClick={() => setIsOpen(o => !o)}>
                {trigger}
            </div>
            {isOpen && (
                <div
                    ref={menuRef}
                    style={{
                        position: "absolute",
                        [placement === "bottom" ? "top" : "bottom"]: "100%",
                        left: 0,
                        minWidth: "200px",
                        border: "1px solid #ddd",
                        background: "#fff",
                        zIndex: 1000,
                    }}
                >
                    {children}
                </div>
            )}
        </div>
    );
}

export default Dropdown;
```

### 与相关API的对比

| 场景 | 用 useEffect | 用 useLayoutEffect |
|------|-------------|-------------------|
| Tooltip 定位 | 先出现在默认位置再跳到正确位置 | 直接出现在正确位置 |
| 折叠面板 | 先显示完整内容再缩小 | 直接以正确高度显示 |
| 滚动恢复 | 先滚动到顶部再跳回之前位置 | 直接显示在正确滚动位置 |
| 动画起始 | 先显示终态再回到起始状态 | 从起始状态开始动画 |

### 适用场景

- **折叠面板：** 根据内容高度设置容器高度
- **Tooltip/Popover：** 根据内容尺寸计算弹出方向
- **下拉菜单：** 判断上方还是下方显示
- **虚拟滚动：** 测量行高调整滚动位置
- **滚动位置恢复：** 页面切换后恢复到之前的滚动位置

### 常见问题

#### useLayoutEffect 中 setState 导致双重渲染

**问题描述：** 在 useLayoutEffect 中调用 setState 会触发同步的额外渲染。

**原因分析：** useLayoutEffect 中的 setState 是同步处理的，React 会在当前绘制之前完成这次额外渲染。

**解决方案：**

```tsx
// 这种双重渲染是预期行为且性能可接受
// 因为两次渲染都在绘制前完成，用户只看到最终结果
useLayoutEffect(() => {
    const height = ref.current.scrollHeight;
    setHeight(height);  // 触发同步重渲染，但不会闪烁
}, [content]);

// 如果能避免 setState 更好：直接操作 DOM
useLayoutEffect(() => {
    ref.current.style.height = ref.current.scrollHeight + "px";
}, [content]);
```

### 注意事项

- useLayoutEffect 中的 setState 会触发同步的额外渲染（但不会闪烁）
- 只在需要防闪烁的场景使用，大多数场景 useEffect 足够
- 回调中的计算应该尽量快速，避免阻塞绘制太久
- SSR 环境下会输出警告，可以改用 useEffect 或条件判断
- 能通过直接操作 DOM 解决的，不需要 setState

### 总结

useLayoutEffect 的核心应用是防闪烁：在浏览器绘制前同步完成 DOM 测量和布局调整，用户只看到最终结果。适用于折叠面板、Tooltip 定位、下拉菜单方向判断等需要根据 DOM 尺寸计算位置的场景。其中的 setState 会触发同步额外渲染但不产生闪烁。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useLayoutEffect与useEffect的选择

### 概念说明

useEffect 和 useLayoutEffect 的 API 签名完全相同，区别在于执行时机。useEffect 在浏览器绘制后异步执行，不阻塞视觉更新；useLayoutEffect 在 DOM 更新后、浏览器绘制前同步执行，会阻塞绘制。选择哪个取决于副作用是否需要在用户看到界面之前完成。

React 官方建议：默认使用 useEffect，只在出现视觉闪烁问题时才切换到 useLayoutEffect。

### 基本示例

```tsx
// 示例说明：同一个场景分别用两种 Hook 的效果对比

import React, { useState, useEffect, useLayoutEffect, useRef } from "react";

// 场景：根据内容宽度决定是否显示省略号
function TextWithEllipsis({ text }: { text: string }) {
    const ref = useRef<HTMLSpanElement>(null);
    const [isTruncated, setIsTruncated] = useState(false);

    // 用 useEffect：文本先完整显示，再突然变成省略号（闪烁）
    // 用 useLayoutEffect：直接显示最终状态（无闪烁）
    useLayoutEffect(() => {
        const el = ref.current;
        if (el) {
            // 比较 scrollWidth 和 clientWidth 判断是否溢出
            setIsTruncated(el.scrollWidth > el.clientWidth);
        }
    }, [text]);

    return (
        <div style={{ display: "flex", alignItems: "center", maxWidth: 200 }}>
            <span
                ref={ref}
                style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                }}
            >
                {text}
            </span>
            {isTruncated && (
                <button style={{ marginLeft: 4 }}>展开</button>
            )}
        </div>
    );
}

export default TextWithEllipsis;
```

**运行效果：** 使用 useLayoutEffect 时，文本和"展开"按钮同时出现，没有闪烁。

### 与相关API的对比

| 选择标准 | useEffect | useLayoutEffect |
|----------|----------|----------------|
| 数据请求 | 推荐 | 不需要 |
| 事件订阅 | 推荐 | 不需要 |
| 日志记录 | 推荐 | 不需要 |
| DOM 尺寸测量 | 会闪烁 | 推荐 |
| 元素位置调整 | 会闪烁 | 推荐 |
| 滚动位置设置 | 会闪烁 | 推荐 |
| 动画起始状态 | 会闪烁 | 推荐 |
| 焦点管理 | 可能闪烁 | 推荐 |

### 适用场景

**选择 useEffect 的场景：**
- **网络请求：** 数据获取不影响初始布局
- **事件监听：** window.addEventListener
- **定时器：** setInterval/setTimeout
- **日志和分析：** 页面访问记录
- **外部订阅：** WebSocket、状态管理库

**选择 useLayoutEffect 的场景：**
- **DOM 测量后调整布局：** 读取尺寸、位置并据此修改样式
- **Tooltip/Popover 定位：** 根据内容尺寸计算弹出方向
- **动画初始化：** 设置动画起始状态
- **焦点管理：** 条件渲染后立即聚焦
- **滚动位置恢复：** 路由切换后恢复滚动位置

### 常见问题

#### SSR 环境下 useLayoutEffect 警告

**问题描述：** 服务端渲染时控制台输出 `useLayoutEffect does nothing on the server` 警告。

**原因分析：** 服务端没有 DOM，useLayoutEffect 无法执行。

**解决方案：**

```tsx
import { useEffect, useLayoutEffect } from "react";

// 方案：根据环境选择 Hook
const useIsomorphicLayoutEffect =
    typeof window !== "undefined" ? useLayoutEffect : useEffect;

// 在组件中使用
function Component() {
    useIsomorphicLayoutEffect(() => {
        // 客户端：useLayoutEffect 时机执行
        // 服务端：useEffect 时机执行（不会警告）
    }, []);
}
```

### 注意事项

- 默认使用 useEffect，只在需要防闪烁时才用 useLayoutEffect
- useLayoutEffect 阻塞绘制，回调不能耗时太长
- SSR 环境下 useLayoutEffect 会警告，用 isomorphic 方案解决
- 两者的清理函数和依赖项机制完全相同
- 不确定用哪个时，先用 useEffect，出现闪烁再换 useLayoutEffect

### 总结

默认使用 useEffect（异步、不阻塞绘制），只在需要 DOM 测量后调整布局、避免闪烁的场景才用 useLayoutEffect（同步、阻塞绘制）。两者 API 相同，只是执行时机不同。SSR 环境下 useLayoutEffect 需要特殊处理。判断标准：如果 effect 中的操作影响视觉且用户会看到中间状态，用 useLayoutEffect。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useInsertionEffect的CSS-in-JS样式注入

### 概念说明

`useInsertionEffect` 是 React 18 引入的 Hook，专为 CSS-in-JS 库（如 styled-components、Emotion）设计。它在 DOM 突变之前同步执行，比 useLayoutEffect 更早。这个时机让 CSS-in-JS 库可以在 React 向 DOM 插入新节点之前就注入相关的 `<style>` 标签，确保新节点出现时样式已经就绪。

普通开发者几乎不需要直接使用 useInsertionEffect，它是供 CSS-in-JS 库作者使用的底层 API。

### API 签名与参数

```typescript
function useInsertionEffect(
    effect: () => (void | (() => void)),
    deps?: ReadonlyArray<unknown>
): void;
```

| 参数 | 类型 | 是否必填 | 说明 |
|------|------|----------|------|
| effect | () => void \| (() => void) | 是 | 在 DOM 突变前执行的回调 |
| deps | unknown[] | 否 | 依赖项数组 |

### 基本示例

```tsx
// 示例说明：CSS-in-JS 库如何使用 useInsertionEffect 注入样式

import React, { useInsertionEffect } from "react";

// 简化的 CSS-in-JS 实现
const styleCache = new Map<string, HTMLStyleElement>();

function useCSS(rule: string): string {
    // 生成唯一的类名
    const className = "css-" + hashString(rule);

    // useInsertionEffect：在 DOM 突变前注入样式
    useInsertionEffect(() => {
        if (!styleCache.has(className)) {
            // 创建 <style> 标签并注入到 <head>
            const style = document.createElement("style");
            style.textContent = `.${className} { ${rule} }`;
            document.head.appendChild(style);
            styleCache.set(className, style);
        }

        // 清理函数：移除样式（组件卸载时）
        return () => {
            const style = styleCache.get(className);
            if (style) {
                document.head.removeChild(style);
                styleCache.delete(className);
            }
        };
    }, [rule]);

    return className;
}

// 简单的字符串哈希
function hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString(36);
}

// 使用
function StyledButton() {
    const className = useCSS("background: blue; color: white; padding: 8px 16px;");

    return <button className={className}>样式按钮</button>;
}

export default StyledButton;
```

**运行效果：** 按钮渲染时样式已经注入到 `<head>` 中，不会出现无样式的闪烁。

### 内部原理

#### 三种 Effect Hook 的执行顺序

```
React 渲染流程中的执行顺序：

1. 组件函数执行（Render 阶段）
2. useInsertionEffect 同步执行 ← 最早！DOM 还没更新
3. React 将变化提交到真实 DOM（Commit - Mutation 阶段）
4. useLayoutEffect 同步执行 ← DOM 已更新，浏览器未绘制
5. 浏览器执行布局和绘制
6. useEffect 异步执行 ← 最晚！浏览器已绘制
```

#### 为什么 CSS-in-JS 需要这么早

如果在 useLayoutEffect 中注入样式，DOM 节点已经插入但样式还没注入，useLayoutEffect 中读取 DOM 尺寸时可能得到不正确的值（因为样式还没生效）。useInsertionEffect 在 DOM 突变前注入样式，确保后续的 DOM 操作能读到正确的布局信息。

### 与相关API的对比

| 对比维度 | useInsertionEffect | useLayoutEffect | useEffect |
|----------|-------------------|----------------|----------|
| 执行时机 | DOM 突变前 | DOM 突变后、绘制前 | 绘制后 |
| 能否访问 DOM | 不能（DOM 还没更新） | 能 | 能 |
| 能否访问 refs | 不能 | 能 | 能 |
| 目标用户 | CSS-in-JS 库作者 | 需要 DOM 测量的开发者 | 普通开发者 |

### 适用场景

- **CSS-in-JS 库：** styled-components、Emotion、Linaria 等的样式注入
- **动态样式表：** 运行时创建和管理 `<style>` 标签

### 常见问题

#### 能否在 useInsertionEffect 中读取 DOM

**问题描述：** 想在 useInsertionEffect 中获取元素尺寸。

**原因分析：** useInsertionEffect 在 DOM 突变前执行，此时 DOM 还没有更新，refs 指向旧的 DOM 状态。

**解决方案：**

```tsx
// 错误：useInsertionEffect 中不能读取更新后的 DOM
// useInsertionEffect(() => {
//     const height = ref.current.offsetHeight;  // 旧的 DOM
// }, []);

// 正确：用 useLayoutEffect 读取 DOM
useLayoutEffect(() => {
    const height = ref.current.offsetHeight;  // 更新后的 DOM
}, []);
```

### 注意事项

- useInsertionEffect 是给 CSS-in-JS 库作者使用的，普通开发者不需要
- 回调中不能访问更新后的 DOM 和 refs
- 回调中不能调用 setState（会导致错误）
- 执行时机最早，在 DOM 突变之前
- 如果不是在开发 CSS-in-JS 库，请使用 useEffect 或 useLayoutEffect

### 总结

useInsertionEffect 是 React 18 为 CSS-in-JS 库设计的底层 Hook，在 DOM 突变前同步执行，用于在 DOM 节点插入之前注入样式。它比 useLayoutEffect 更早执行，但不能访问 DOM 和 refs。普通开发者不需要使用这个 Hook，它是库级别的 API。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useInsertionEffect的DOM插入前执行

### 概念说明

useInsertionEffect 的执行时机是在 React 的 Commit 阶段中的 Mutation 子阶段之前，即 React 尚未将新的 DOM 节点插入页面、也未修改已有 DOM 节点之前。这个时机是三种 Effect Hook 中最早的，专门为了让 CSS-in-JS 库能在 DOM 变更发生前就将样式规则注入到文档中。

理解这个执行顺序对于掌握 React 的 Commit 阶段内部工作机制很有帮助。Commit 阶段分为三个子阶段：Before Mutation（useInsertionEffect）→ Mutation（DOM 操作）→ Layout（useLayoutEffect）。useEffect 则在整个 Commit 阶段结束后异步调度。

### 基本示例

```tsx
// 示例说明：验证三种 Effect Hook 的执行顺序

import React, { useEffect, useLayoutEffect, useInsertionEffect, useRef } from "react";

function ExecutionOrderDemo() {
    const ref = useRef<HTMLDivElement>(null);

    useInsertionEffect(() => {
        // 最先执行：DOM 还没更新
        console.log("1. useInsertionEffect - DOM 未更新");
        console.log("   ref.current:", ref.current?.textContent);
        // 首次挂载时 ref.current 为 null
        // 更新时 ref.current 指向旧的 DOM
    });

    useLayoutEffect(() => {
        // 第二执行：DOM 已更新，浏览器未绘制
        console.log("2. useLayoutEffect - DOM 已更新，未绘制");
        console.log("   ref.current:", ref.current?.textContent);
        // ref.current 指向更新后的 DOM
    });

    useEffect(() => {
        // 最后执行：浏览器已绘制
        console.log("3. useEffect - 已绘制");
        console.log("   ref.current:", ref.current?.textContent);
    });

    return <div ref={ref}>内容</div>;
}

export default ExecutionOrderDemo;
```

**运行效果：** 控制台按顺序输出 1、2、3，展示了三种 Hook 的执行先后。useInsertionEffect 中读到的 ref 是旧 DOM，useLayoutEffect 和 useEffect 中是新 DOM。

### 内部原理

#### Commit 阶段的三个子阶段

```
Commit 阶段详细流程：

┌─ Before Mutation 子阶段 ─┐
│  useInsertionEffect 执行   │  ← DOM 还是旧的
│  （注入 <style> 标签）      │
└───────────────────────────┘
           ↓
┌─ Mutation 子阶段 ─────────┐
│  插入新 DOM 节点            │  ← DOM 操作发生在这里
│  更新已有 DOM 属性          │
│  删除废弃 DOM 节点          │
└───────────────────────────┘
           ↓
┌─ Layout 子阶段 ───────────┐
│  useLayoutEffect 执行      │  ← DOM 已经是新的
│  类组件 componentDidMount  │
│  类组件 componentDidUpdate │
└───────────────────────────┘
           ↓
浏览器绘制（Paint）
           ↓
useEffect 异步执行
```

#### 为什么要在 DOM 插入前执行

CSS-in-JS 库需要在 DOM 节点被插入之前就把样式准备好。如果在 DOM 插入后再注入样式（useLayoutEffect），虽然浏览器还没绘制，但其他 useLayoutEffect 中的 DOM 测量可能读到错误的布局值（因为样式还没生效）。在 DOM 插入前注入样式，确保了整个 Commit 阶段的 DOM 操作和后续测量都在正确的样式下进行。

### 与相关API的对比

| 执行阶段 | Hook | 能否访问新 DOM | 能否 setState |
|----------|------|-------------|-------------|
| Before Mutation | useInsertionEffect | 不能 | 不能 |
| Mutation | （React 内部 DOM 操作） | — | — |
| Layout | useLayoutEffect | 能 | 能（同步重渲染） |
| 绘制后 | useEffect | 能 | 能 |

### 适用场景

- **CSS-in-JS 样式注入：** 在 DOM 节点出现前注入对应的样式规则
- **全局样式表管理：** 动态管理 `<style>` 标签的创建和销毁

### 常见问题

#### useInsertionEffect 中调用 setState 会怎样

**问题描述：** 在 useInsertionEffect 中更新状态。

**原因分析：** useInsertionEffect 在 Commit 阶段的最早时机执行，此时不允许触发新的渲染。

**解决方案：**

```tsx
// 错误：useInsertionEffect 中不能 setState
// useInsertionEffect(() => {
//     setSomeState(value);  // 会导致错误或不可预测的行为
// }, []);

// 正确：需要 setState 的副作用放在 useLayoutEffect 或 useEffect 中
useLayoutEffect(() => {
    const height = ref.current.offsetHeight;
    setHeight(height);  // 在 Layout 阶段可以 setState
}, []);
```

### 注意事项

- useInsertionEffect 在 DOM 突变前执行，不能访问更新后的 DOM
- 不能在回调中调用 setState
- 不能在回调中读取 refs（指向旧 DOM 或 null）
- 这是 CSS-in-JS 库的专用 API，普通开发者不应使用
- 清理函数也在 DOM 突变前执行
- React 18 新增，之前的版本没有这个 Hook

### 总结

useInsertionEffect 在 React Commit 阶段的 Before Mutation 子阶段执行，早于 DOM 操作和 useLayoutEffect。它不能访问新 DOM、不能 setState，专为 CSS-in-JS 库在 DOM 插入前注入样式而设计。理解它的执行时机有助于理解 React Commit 阶段的内部工作流程。普通开发者不需要直接使用。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useEffectEvent的实验性事件处理

### 概念说明

`useEffectEvent` 是 React 团队提出的实验性 Hook（截至 2025 年仍处于 RFC 阶段，未正式发布到稳定版本）。它解决的是 useEffect 中一个长期存在的痛点：effect 需要读取最新的 props 或 state，但又不想把这些值加入依赖项（因为不想在这些值变化时重新执行 effect）。

典型场景是事件回调中需要读取最新的状态值，但这个回调被 useEffect 使用。useEffectEvent 创建的函数始终能读取到最新的 props/state，但它不是响应式的——不会触发 effect 重新执行。

### API 签名与参数

```typescript
// 实验性 API，需要从 react 导入（仅在实验版本中可用）
function useEffectEvent<T extends (...args: any[]) => any>(fn: T): T;
```

| 参数 | 类型 | 说明 |
|------|------|------|
| fn | (...args) => any | 事件处理函数，始终读取最新的 props/state |

**返回值：** 一个稳定引用的函数，调用时执行传入的 fn（使用最新闭包值）。

### 基本示例

```tsx
// 示例说明：展示 useEffectEvent 解决的问题
// 注意：这是实验性 API，以下代码展示的是设计意图

import React, { useState, useEffect } from "react";
// import { useEffectEvent } from "react";  // 实验性导入

// 问题场景：聊天室连接需要在 roomId 变化时重新连接，
// 但连接成功后需要用最新的 theme 发送日志

// 当前的解决方式（不理想）
function ChatRoomCurrent({ roomId, theme }: { roomId: string; theme: string }) {
    useEffect(() => {
        const connection = createConnection(roomId);
        connection.on("connected", () => {
            // 需要读取最新的 theme，但 theme 不应该触发重新连接
            logVisit(roomId, theme);
        });
        connection.connect();

        return () => connection.disconnect();
    }, [roomId, theme]);
    // theme 加入依赖项后，切换主题也会断开重连——这不是我们想要的

    return <p>房间: {roomId}</p>;
}

// 使用 useEffectEvent 的理想方式（实验性）
// function ChatRoomIdeal({ roomId, theme }: { roomId: string; theme: string }) {
//     // useEffectEvent 创建的函数始终读取最新的 theme
//     // 但不会作为 effect 的响应式依赖
//     const onConnected = useEffectEvent(() => {
//         logVisit(roomId, theme);  // 始终读取最新的 theme
//     });
//
//     useEffect(() => {
//         const connection = createConnection(roomId);
//         connection.on("connected", () => {
//             onConnected();  // 调用 Effect Event
//         });
//         connection.connect();
//         return () => connection.disconnect();
//     }, [roomId]);  // 只依赖 roomId，theme 变化不触发重新连接
//
//     return <p>房间: {roomId}</p>;
// }

// 当前的替代方案：使用 useRef 存储最新值
function ChatRoomWithRef({ roomId, theme }: { roomId: string; theme: string }) {
    const themeRef = React.useRef(theme);
    themeRef.current = theme;  // 每次渲染同步最新值

    useEffect(() => {
        const connection = createConnection(roomId);
        connection.on("connected", () => {
            // 通过 ref 读取最新的 theme
            logVisit(roomId, themeRef.current);
        });
        connection.connect();

        return () => connection.disconnect();
    }, [roomId]);  // 只依赖 roomId

    return <p>房间: {roomId}</p>;
}

function createConnection(roomId: string) {
    const handlers: Record<string, Function[]> = {};
    return {
        on(event: string, handler: Function) {
            if (!handlers[event]) handlers[event] = [];
            handlers[event].push(handler);
        },
        connect() {
            console.log(`连接到 ${roomId}`);
            handlers["connected"]?.forEach(h => h());
        },
        disconnect() {
            console.log(`断开 ${roomId}`);
        },
    };
}

function logVisit(roomId: string, theme: string) {
    console.log(`访问 ${roomId}，主题: ${theme}`);
}

export default ChatRoomWithRef;
```

**运行效果：** 使用 ref 方案时，切换主题不会导致重新连接，但连接成功的日志能读取到最新的主题值。

### 内部原理

#### useEffectEvent 的设计原理

```javascript
// useEffectEvent 的概念性实现
function useEffectEvent(fn) {
    // 内部用 ref 存储最新的函数
    const ref = useRef(fn);
    // 每次渲染同步最新的函数（包含最新的闭包值）
    ref.current = fn;

    // 返回一个稳定引用的包装函数
    // 调用时执行 ref.current（即最新的 fn）
    return useCallback((...args) => {
        return ref.current(...args);
    }, []);  // 空依赖：引用永远稳定
}
```

本质上 useEffectEvent 是对"useRef + 同步更新"模式的官方封装，让 ESLint 规则能正确识别这种模式，不再要求将 Effect Event 加入依赖项。

### 与相关API的对比

| 方案 | 读取最新值 | 是否触发 effect 重执行 | ESLint 兼容 |
|------|----------|---------------------|------------|
| 加入依赖项 | 是 | 是（不想要的行为） | 兼容 |
| useRef 手动同步 | 是 | 否 | 需要禁用规则 |
| useEffectEvent | 是 | 否 | 兼容（专门支持） |

### 适用场景

- **effect 中的事件回调：** 连接成功后的日志记录
- **定时器中读取最新状态：** setInterval 回调中需要最新值但不想重建定时器
- **事件监听器中的状态：** addEventListener 回调需要最新值

### 常见问题

#### 当前如何替代 useEffectEvent

**问题描述：** useEffectEvent 还没正式发布，如何实现类似效果。

**解决方案：**

```tsx
// 方案：自定义 Hook 模拟 useEffectEvent
import { useRef, useCallback } from "react";

function useEventCallback<T extends (...args: any[]) => any>(fn: T): T {
    const fnRef = useRef(fn);
    fnRef.current = fn;

    return useCallback((...args: any[]) => {
        return fnRef.current(...args);
    }, []) as T;
}

// 使用
function MyComponent({ roomId, theme }: { roomId: string; theme: string }) {
    const onConnected = useEventCallback(() => {
        logVisit(roomId, theme);
    });

    useEffect(() => {
        const conn = createConnection(roomId);
        conn.on("connected", onConnected);
        conn.connect();
        return () => conn.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId]);  // onConnected 引用稳定，但 ESLint 可能警告

    return null;
}
```

### 注意事项

- useEffectEvent 截至 2025 年仍是实验性 API，不在 React 稳定版中
- 当前可以用 useRef + useCallback 模式替代
- Effect Event 函数不应该传递给子组件或其他 Hook
- Effect Event 只能在 useEffect 内部调用
- 关注 React RFC 和版本更新，等待正式发布

### 总结

useEffectEvent 是 React 的实验性 Hook，解决了 effect 中需要读取最新状态但不想将其作为依赖项的问题。它本质上是 useRef 同步模式的官方封装，配合 ESLint 规则使用。当前未正式发布，可用 useRef + useCallback 自定义 Hook 替代。关注 React 版本更新以获取正式支持。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。



## 6.4 性能优化Hooks

## React.memo的浅比较(shallow compare)原理

### 概念说明

`React.memo` 是一个高阶组件（HOC），用于对函数组件进行性能优化。它会在组件重新渲染前，对新旧 props 进行浅比较（Shallow Compare）。如果所有 props 都没有变化，React 会跳过本次渲染，直接复用上一次的渲染结果。

浅比较的含义是：对 props 对象的每一个顶层属性，使用 `Object.is` 进行比较。基本值比较值本身，引用类型只比较引用地址，不递归比较对象内部属性。这意味着，如果父组件每次渲染都给子组件传入新的对象引用（即使内容相同），React.memo 仍然会认为 props 发生了变化。

### API 签名与参数

```typescript
function memo<P extends object>(
    Component: React.FC<P>,
    arePropsEqual?: (prevProps: P, nextProps: P) => boolean
): React.MemoExoticComponent<React.FC<P>>;
```

| 参数 | 类型 | 是否必填 | 说明 |
|------|------|----------|------|
| Component | React.FC | 是 | 需要优化的函数组件 |
| arePropsEqual | (prev, next) => boolean | 否 | 自定义比较函数 |

**返回值：** 包裹后的记忆化组件。

### 基本示例

```tsx
// 示例说明：展示 React.memo 的浅比较行为

import React, { useState, memo } from "react";

// 未优化的子组件：父组件每次渲染都会重新渲染
function ExpensiveListRaw({ items, title }: { items: string[]; title: string }) {
    console.log("ExpensiveList 渲染了");
    return (
        <div>
            <h3>{title}</h3>
            <ul>
                {items.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
        </div>
    );
}

// 用 React.memo 包裹：props 不变时跳过渲染
const ExpensiveList = memo(ExpensiveListRaw);

function App() {
    const [count, setCount] = useState(0);
    // items 定义在组件外部或用 useMemo，引用稳定
    const items = React.useMemo(() => ["苹果", "香蕉", "橙子"], []);

    return (
        <div>
            <p>count: {count}</p>
            <button onClick={() => setCount(c => c + 1)}>+1</button>
            {/* count 变化时 App 重新渲染，但 ExpensiveList 的 props 没变，跳过渲染 */}
            <ExpensiveList items={items} title="水果列表" />
        </div>
    );
}

export default App;
```

**运行效果：** 点击 +1 时，App 重新渲染，但 ExpensiveList 不会重新渲染（控制台不输出），因为 items 和 title 都没有变化。

### 内部原理

#### 浅比较的实现

```javascript
// React 内部的浅比较逻辑（shallowEqual）
function shallowEqual(objA, objB) {
    // 同一引用直接返回 true
    if (Object.is(objA, objB)) return true;

    // 非对象类型或 null 直接返回 false
    if (typeof objA !== "object" || objA === null ||
        typeof objB !== "object" || objB === null) {
        return false;
    }

    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);

    // 属性数量不同
    if (keysA.length !== keysB.length) return false;

    // 逐个属性用 Object.is 比较
    for (let i = 0; i < keysA.length; i++) {
        if (!Object.prototype.hasOwnProperty.call(objB, keysA[i]) ||
            !Object.is(objA[keysA[i]], objB[keysA[i]])) {
            return false;
        }
    }
    return true;
}
```

#### memo 组件的更新判断

```javascript
// React 内部简化逻辑
function updateMemoComponent(current, workInProgress, Component) {
    const prevProps = current.memoizedProps;
    const nextProps = workInProgress.pendingProps;

    // 使用浅比较（或自定义比较函数）
    const compare = Component.compare || shallowEqual;
    if (compare(prevProps, nextProps)) {
        // props 没变：跳过渲染，复用上次结果
        return bailoutOnAlreadyFinishedWork();
    }

    // props 变了：重新渲染组件
    return renderComponent(workInProgress);
}
```

### 适用场景

- **列表项组件：** 列表中的单个 item 组件，父组件重新渲染时大部分 item 的 props 没变
- **纯展示组件：** 只根据 props 渲染 UI，没有内部状态
- **昂贵渲染组件：** 包含大量 DOM 节点或复杂计算的组件

### 常见问题

#### 传入内联对象导致 memo 失效

**问题描述：** 用了 React.memo 但组件仍然每次都渲染。

**原因分析：** 父组件每次渲染创建了新的对象/数组/函数引用传给子组件。

**解决方案：**

```tsx
function Parent() {
    const [count, setCount] = useState(0);

    // 错误：每次渲染创建新的 style 对象
    // <MemoChild style={{ color: "red" }} />

    // 正确：用 useMemo 稳定化对象
    const style = React.useMemo(() => ({ color: "red" }), []);

    // 错误：每次渲染创建新的回调函数
    // <MemoChild onClick={() => console.log("click")} />

    // 正确：用 useCallback 稳定化函数
    const onClick = React.useCallback(() => console.log("click"), []);

    return <MemoChild style={style} onClick={onClick} />;
}
```

### 注意事项

- React.memo 只做浅比较，不递归比较嵌套对象
- 传给 memo 组件的 props 中的对象/数组/函数需要用 useMemo/useCallback 稳定化
- memo 不能阻止组件内部 state 或 context 变化导致的重渲染
- 不要对所有组件都加 memo，浅比较本身有开销
- memo 是性能优化手段，不是行为保证——React 可能在某些情况下仍然重新渲染

### 总结

React.memo 对函数组件的 props 做浅比较，props 不变时跳过重新渲染。浅比较用 Object.is 逐个比较顶层属性，引用类型只比较引用地址。需要配合 useMemo/useCallback 稳定化引用类型的 props 才能发挥作用。适用于渲染开销大且 props 变化不频繁的组件。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## React.memo的自定义比较函数

### 概念说明

`React.memo` 的第二个参数接受一个自定义比较函数 `arePropsEqual`，用于替代默认的浅比较逻辑。当默认的浅比较无法满足需求时——比如需要深比较某些嵌套对象，或者只关注特定的 props 变化——可以提供自定义比较函数来精确控制组件何时跳过渲染。

自定义比较函数接收 `prevProps` 和 `nextProps` 两个参数，返回 `true` 表示 props 相同（跳过渲染），返回 `false` 表示 props 不同（重新渲染）。注意这与类组件的 `shouldComponentUpdate` 返回值含义相反。

### API 签名与参数

```typescript
const MemoComponent = React.memo(Component, arePropsEqual);

// arePropsEqual 签名
type ArePropsEqual<P> = (prevProps: Readonly<P>, nextProps: Readonly<P>) => boolean;
// 返回 true → props 相同，跳过渲染
// 返回 false → props 不同，重新渲染
```

### 基本示例

```tsx
// 示例说明：自定义比较函数只比较关键 props

import React, { memo, useState } from "react";

interface UserCardProps {
    user: {
        id: number;
        name: string;
        avatar: string;
    };
    style: React.CSSProperties;
    onSelect: (id: number) => void;
    debugTimestamp: number;  // 调试用的时间戳，不影响渲染
}

function UserCardRaw({ user, style, onSelect }: UserCardProps) {
    console.log(`UserCard ${user.id} 渲染`);
    return (
        <div style={style} onClick={() => onSelect(user.id)}>
            <img src={user.avatar} alt={user.name} />
            <span>{user.name}</span>
        </div>
    );
}

// 自定义比较：只比较影响渲染的 props，忽略 debugTimestamp
const UserCard = memo(UserCardRaw, (prevProps, nextProps) => {
    // 比较 user 对象的关键字段（深比较部分字段）
    if (prevProps.user.id !== nextProps.user.id) return false;
    if (prevProps.user.name !== nextProps.user.name) return false;
    if (prevProps.user.avatar !== nextProps.user.avatar) return false;

    // 比较 style 引用
    if (prevProps.style !== nextProps.style) return false;

    // 比较 onSelect 引用
    if (prevProps.onSelect !== nextProps.onSelect) return false;

    // 忽略 debugTimestamp
    return true;  // 其他 props 都相同，跳过渲染
});

function App() {
    const [count, setCount] = useState(0);
    const user = { id: 1, name: "张三", avatar: "/avatar.png" };
    const style = React.useMemo(() => ({ padding: 16 }), []);
    const onSelect = React.useCallback((id: number) => console.log(id), []);

    return (
        <div>
            <button onClick={() => setCount(c => c + 1)}>计数: {count}</button>
            <UserCard
                user={user}
                style={style}
                onSelect={onSelect}
                debugTimestamp={Date.now()}  // 每次渲染都不同，但被自定义比较忽略
            />
        </div>
    );
}

export default App;
```

**运行效果：** 点击计数按钮时，debugTimestamp 每次都变，但自定义比较函数忽略了它，UserCard 不会重新渲染。

### 内部原理

#### 自定义比较函数的调用位置

```javascript
// React 内部简化逻辑
function updateMemoComponent(current, workInProgress, Component) {
    const prevProps = current.memoizedProps;
    const nextProps = workInProgress.pendingProps;

    // 优先使用自定义比较函数
    const compare = Component.compare;  // 即 React.memo 的第二个参数

    if (compare !== null) {
        // 有自定义比较：调用它
        if (compare(prevProps, nextProps)) {
            return bailout();  // 返回 true，跳过渲染
        }
    } else {
        // 没有自定义比较：使用默认的浅比较
        if (shallowEqual(prevProps, nextProps)) {
            return bailout();
        }
    }

    // 比较结果为 false，重新渲染
    return renderComponent(workInProgress);
}
```

### 与相关API的对比

| 对比维度 | 默认浅比较 | 自定义比较函数 |
|----------|----------|--------------|
| 比较逻辑 | 所有 props 的 Object.is | 开发者自定义 |
| 适用场景 | props 简单、引用稳定 | 需要深比较或忽略某些 props |
| 性能 | 固定开销 | 取决于比较逻辑的复杂度 |
| 维护成本 | 无 | 需要随 props 变化更新比较逻辑 |

### 适用场景

- **忽略无关 props：** 某些 props 不影响渲染输出
- **深比较特定字段：** 嵌套对象的特定属性需要深比较
- **性能敏感场景：** 列表中大量 item 组件，需要精确控制渲染

### 常见问题

#### 自定义比较函数遗漏了新增的 props

**问题描述：** 后来给组件新增了 prop，但忘记在比较函数中处理，导致组件不响应新 prop 的变化。

**解决方案：**

```tsx
// 建议：比较函数用"排除法"而非"逐个列举法"
const MyComponent = memo(Component, (prevProps, nextProps) => {
    // 排除法：先浅比较所有 props，再对特殊 props 做额外处理
    const { debugInfo: prevDebug, ...prevRest } = prevProps;
    const { debugInfo: nextDebug, ...nextRest } = nextProps;
    // 对其余 props 做浅比较
    return shallowEqual(prevRest, nextRest);
    // 这样新增的 props 会自动被浅比较覆盖
});
```

### 注意事项

- 返回 true 表示跳过渲染，false 表示重新渲染（与 shouldComponentUpdate 相反）
- 自定义比较函数应该尽量简单，复杂的深比较可能比直接重渲染更耗时
- 比较函数需要覆盖所有影响渲染的 props，遗漏会导致 bug
- 如果只是为了深比较，考虑用 useMemo 在父组件稳定化 props 更好
- 不要在比较函数中产生副作用

### 总结

React.memo 的自定义比较函数替代默认浅比较，精确控制组件何时跳过渲染。返回 true 跳过，false 重渲染。适用于需要忽略无关 props 或对嵌套对象做深比较的场景。比较函数应简单且覆盖所有影响渲染的 props。大多数情况下，在父组件用 useMemo/useCallback 稳定化 props 比自定义比较函数更好。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## React.memo的Props稳定性要求

### 概念说明

React.memo 通过浅比较 props 来决定是否跳过渲染。要让 React.memo 发挥作用，传给它的 props 必须在值不变时保持引用稳定（Referential Stability）。如果父组件每次渲染都创建新的对象、数组或函数引用传给 memo 组件，浅比较永远返回 false，memo 等于没用。

Props 稳定性是 React 性能优化的基础。需要配合 useMemo（稳定化对象/数组）、useCallback（稳定化函数）、以及将常量提取到组件外部等手段来保证。

### 基本示例

```tsx
// 示例说明：展示不稳定 props 导致 memo 失效及修复方案

import React, { useState, useMemo, useCallback, memo } from "react";

interface ListProps {
    items: string[];
    config: { pageSize: number };
    onItemClick: (item: string) => void;
}

const MemoList = memo(function List({ items, config, onItemClick }: ListProps) {
    console.log("List 渲染了");
    return (
        <ul>
            {items.slice(0, config.pageSize).map(item => (
                <li key={item} onClick={() => onItemClick(item)}>{item}</li>
            ))}
        </ul>
    );
});

// 错误：所有 props 都不稳定
function AppBad() {
    const [count, setCount] = useState(0);

    return (
        <div>
            <button onClick={() => setCount(c => c + 1)}>计数: {count}</button>
            <MemoList
                items={["苹果", "香蕉", "橙子"]}       // 每次渲染新数组
                config={{ pageSize: 10 }}                // 每次渲染新对象
                onItemClick={(item) => console.log(item)} // 每次渲染新函数
            />
            {/* memo 完全失效，每次都重新渲染 */}
        </div>
    );
}

// 正确：所有 props 都稳定
function AppGood() {
    const [count, setCount] = useState(0);

    // useMemo 稳定化数组和对象
    const items = useMemo(() => ["苹果", "香蕉", "橙子"], []);
    const config = useMemo(() => ({ pageSize: 10 }), []);

    // useCallback 稳定化函数
    const onItemClick = useCallback((item: string) => {
        console.log(item);
    }, []);

    return (
        <div>
            <button onClick={() => setCount(c => c + 1)}>计数: {count}</button>
            <MemoList items={items} config={config} onItemClick={onItemClick} />
            {/* memo 正常工作，count 变化时 List 不重渲染 */}
        </div>
    );
}

export default AppGood;
```

**运行效果：** AppBad 中每次点击计数按钮 List 都渲染；AppGood 中 List 不渲染。

### 内部原理

#### 为什么内联值不稳定

```javascript
// 函数组件每次渲染都重新执行函数体
function Parent() {
    // 以下每次渲染都创建新引用
    const arr = [1, 2, 3];             // 新数组引用
    const obj = { a: 1 };              // 新对象引用
    const fn = () => {};               // 新函数引用
    const jsx = <div>hello</div>;      // 新 JSX 元素

    // 即使内容完全相同，Object.is 比较引用不同
    // memo 的浅比较会认为 props 变了
}
```

### 与相关API的对比

| Props 类型 | 稳定化方式 | 示例 |
|-----------|-----------|------|
| 基本值 | 天然稳定 | `count={5}` `name="张三"` |
| 对象/数组 | useMemo | `useMemo(() => ({...}), [deps])` |
| 函数 | useCallback | `useCallback(() => {...}, [deps])` |
| 常量 | 提取到组件外部 | 模块级别的 const |
| 组件/JSX | useMemo | `useMemo(() => <Child />, [])` |

### 适用场景

- **列表组件：** 父组件频繁更新但列表数据不变
- **表单组件：** 表单某个字段变化不应导致其他字段的子组件重渲染
- **仪表盘：** 多个独立的图表组件，数据源独立更新

### 常见问题

#### children prop 导致 memo 失效

**问题描述：** 传递 JSX children 给 memo 组件，每次都重渲染。

**原因分析：** `<MemoComp><div>内容</div></MemoComp>` 中的 children 是每次渲染新创建的 JSX 元素。

**解决方案：**

```tsx
// 方案1：用 useMemo 缓存 children
function Parent() {
    const children = useMemo(() => <div>内容</div>, []);
    return <MemoComp>{children}</MemoComp>;
}

// 方案2：将 children 提取为独立组件
const Content = memo(() => <div>内容</div>);
function Parent() {
    return <MemoComp><Content /></MemoComp>;
    // 注意：这里 children 仍然是新的 JSX 引用
    // 需要在 MemoComp 的比较函数中特殊处理
}
```

### 注意事项

- 基本值 props（string、number、boolean）天然稳定，不需要额外处理
- 对象和数组用 useMemo 稳定化
- 函数用 useCallback 稳定化
- 不依赖 props/state 的常量提取到组件外部
- 不是所有组件都需要 memo，只对渲染开销大的组件优化
- React 19 Compiler 将自动处理 props 稳定性，未来可能不需要手动优化

### 总结

React.memo 要发挥作用，传入的 props 必须在值不变时保持引用稳定。对象/数组用 useMemo，函数用 useCallback，常量提取到组件外部。基本值天然稳定。不稳定的 props 会让 memo 完全失效。React 19 Compiler 的自动记忆化将在编译时自动处理这些问题。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useMemo的缓存计算值

### 概念说明

`useMemo` 是 React 的性能优化 Hook，用于缓存计算结果。它接收一个创建函数和依赖项数组，只有当依赖项发生变化时才重新执行创建函数计算新值，否则返回上一次缓存的结果。这避免了每次渲染都执行昂贵的计算。

useMemo 的缓存是基于依赖项的——依赖项不变，返回缓存值；依赖项变了，重新计算。React 不保证缓存永远有效，在内存压力下可能丢弃缓存，因此 useMemo 是性能优化手段，不是语义保证。

### API 签名与参数

```typescript
function useMemo<T>(factory: () => T, deps: ReadonlyArray<unknown>): T;
```

| 参数 | 类型 | 是否必填 | 说明 |
|------|------|----------|------|
| factory | () => T | 是 | 计算函数，返回需要缓存的值 |
| deps | unknown[] | 是 | 依赖项数组，变化时重新计算 |

**返回值：** 缓存的计算结果。

### 基本示例

```tsx
// 示例说明：用 useMemo 缓存昂贵的过滤和排序计算

import React, { useState, useMemo } from "react";

interface Product {
    id: number;
    name: string;
    price: number;
    category: string;
}

function ProductList({ products }: { products: Product[] }) {
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState<"name" | "price">("name");
    const [count, setCount] = useState(0);  // 无关的状态

    // useMemo：只有 products、search、sortBy 变化时才重新计算
    // count 变化时不会重新计算
    const filteredAndSorted = useMemo(() => {
        console.log("执行过滤和排序");
        const filtered = products.filter(p =>
            p.name.toLowerCase().includes(search.toLowerCase())
        );
        return filtered.sort((a, b) => {
            if (sortBy === "name") return a.name.localeCompare(b.name);
            return a.price - b.price;
        });
    }, [products, search, sortBy]);

    return (
        <div>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索" />
            <select value={sortBy} onChange={e => setSortBy(e.target.value as "name" | "price")}>
                <option value="name">按名称</option>
                <option value="price">按价格</option>
            </select>
            <button onClick={() => setCount(c => c + 1)}>无关计数: {count}</button>

            <ul>
                {filteredAndSorted.map(p => (
                    <li key={p.id}>{p.name} - ¥{p.price}</li>
                ))}
            </ul>
        </div>
    );
}

export default ProductList;
```

**运行效果：** 输入搜索词或切换排序时重新计算列表。点击"无关计数"按钮时不重新计算（控制台不输出），直接使用缓存值。

### 内部原理

#### useMemo 的缓存机制

```javascript
// React 内部简化逻辑
function mountMemo(factory, deps) {
    const hook = mountWorkInProgressHook();
    const value = factory();  // 首次渲染：执行计算
    hook.memoizedState = [value, deps];  // 缓存值和依赖项
    return value;
}

function updateMemo(factory, deps) {
    const hook = updateWorkInProgressHook();
    const [prevValue, prevDeps] = hook.memoizedState;

    // 逐个比较依赖项
    if (areHookInputsEqual(deps, prevDeps)) {
        return prevValue;  // 依赖项没变，返回缓存值
    }

    const value = factory();  // 依赖项变了，重新计算
    hook.memoizedState = [value, deps];
    return value;
}
```

### 适用场景

- **昂贵计算：** 大数据量的过滤、排序、聚合
- **稳定化引用：** 为 React.memo 子组件提供稳定的对象/数组 props
- **派生状态：** 从 props 或 state 派生的复杂数据结构

### 常见问题

#### 什么时候不需要 useMemo

**问题描述：** 不确定是否需要用 useMemo。

**解决方案：**

```tsx
// 不需要 useMemo 的场景
const fullName = firstName + " " + lastName;  // 简单字符串拼接
const isAdult = age >= 18;                     // 简单比较
const doubled = count * 2;                     // 简单数学运算

// 需要 useMemo 的场景
const sorted = useMemo(() => largeArray.sort(...), [largeArray]);  // 大数组排序
const tree = useMemo(() => buildTree(data), [data]);               // 复杂数据转换
const config = useMemo(() => ({ theme, locale }), [theme, locale]); // 稳定化对象引用
```

### 注意事项

- useMemo 是性能优化，不是语义保证——React 可能在某些情况下丢弃缓存
- 不要在 useMemo 的 factory 中执行副作用
- 简单计算不需要 useMemo，缓存本身也有开销
- 依赖项数组遵循与 useEffect 相同的规则
- React 19 Compiler 将自动处理记忆化，未来可能不需要手动 useMemo

### 总结

useMemo 缓存计算结果，依赖项不变时返回缓存值，避免重复执行昂贵计算。适用于大数据量处理和稳定化引用类型。简单计算不需要 useMemo。它是性能优化手段，不保证缓存永远有效。React 19 Compiler 的自动记忆化将减少手动使用 useMemo 的需求。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useMemo的依赖项稳定性

### 概念说明

useMemo 的依赖项数组决定了缓存何时失效。和 useEffect 一样，React 用 `Object.is` 逐项比较新旧依赖项。如果依赖项中包含了每次渲染都创建的新引用（内联对象、内联函数），useMemo 的缓存会在每次渲染时都失效，缓存完全没有意义。

确保依赖项的稳定性是 useMemo 正确工作的前提。依赖项应该是基本值、useState 返回的 state、useRef 的 ref 对象，或者已经通过 useMemo/useCallback 稳定化过的值。

### 基本示例

```tsx
// 示例说明：依赖项不稳定导致 useMemo 缓存失效

import React, { useState, useMemo } from "react";

interface FilterConfig {
    minPrice: number;
    maxPrice: number;
}

function ProductFilter({ products }: { products: { name: string; price: number }[] }) {
    const [minPrice, setMinPrice] = useState(0);
    const [maxPrice, setMaxPrice] = useState(1000);
    const [count, setCount] = useState(0);

    // 错误：config 每次渲染都是新对象，useMemo 缓存每次都失效
    // const config = { minPrice, maxPrice };
    // const filtered = useMemo(() => {
    //     console.log("重新过滤");
    //     return products.filter(p => p.price >= config.minPrice && p.price <= config.maxPrice);
    // }, [products, config]);  // config 每次新引用，缓存无效

    // 正确方案1：直接用基本值作为依赖项
    const filtered = useMemo(() => {
        console.log("重新过滤");
        return products.filter(p => p.price >= minPrice && p.price <= maxPrice);
    }, [products, minPrice, maxPrice]);  // 基本值，稳定

    // 正确方案2：如果确实需要对象，用 useMemo 稳定化
    // const config = useMemo(() => ({ minPrice, maxPrice }), [minPrice, maxPrice]);
    // const filtered = useMemo(() => {
    //     return products.filter(p => p.price >= config.minPrice && p.price <= config.maxPrice);
    // }, [products, config]);

    return (
        <div>
            <input type="number" value={minPrice} onChange={e => setMinPrice(Number(e.target.value))} />
            <input type="number" value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))} />
            <button onClick={() => setCount(c => c + 1)}>无关计数: {count}</button>
            <p>过滤结果: {filtered.length} 个商品</p>
        </div>
    );
}

export default ProductFilter;
```

**运行效果：** 使用基本值依赖项时，点击"无关计数"不会重新过滤。使用内联对象依赖项时，每次渲染都重新过滤。

### 内部原理

#### 依赖项比较流程

```javascript
// React 内部的依赖项比较
function areHookInputsEqual(nextDeps, prevDeps) {
    for (let i = 0; i < prevDeps.length; i++) {
        if (Object.is(nextDeps[i], prevDeps[i])) {
            continue;
        }
        return false;  // 有一项不同，缓存失效
    }
    return true;  // 全部相同，使用缓存
}

// 不稳定的依赖项
const obj = { a: 1 };  // 每次渲染新引用
Object.is(prevObj, obj);  // false，缓存失效

// 稳定的依赖项
const num = 42;  // 基本值
Object.is(42, 42);  // true，使用缓存
```

### 与相关API的对比

| 依赖项类型 | 是否稳定 | 解决方案 |
|-----------|---------|---------|
| number/string/boolean | 稳定 | 直接使用 |
| useState 的 state | 稳定 | 直接使用 |
| useRef 的 ref | 稳定 | 直接使用（但 ref.current 变化不触发更新） |
| 内联对象 `{}` | 不稳定 | useMemo 包裹或拆成基本值 |
| 内联数组 `[]` | 不稳定 | useMemo 包裹 |
| 内联函数 `() => {}` | 不稳定 | useCallback 包裹 |
| props 中的对象 | 取决于父组件 | 父组件负责稳定化 |

### 适用场景

- **避免链式缓存失效：** useMemo A 依赖 useMemo B 的结果，B 不稳定会导致 A 也失效
- **稳定化传给子组件的 props：** memo 子组件需要稳定的 props
- **复杂计算的有效缓存：** 确保只在真正需要时重新计算

### 常见问题

#### useMemo 的依赖项是另一个 useMemo 的结果

**问题描述：** 链式 useMemo 中上游不稳定导致下游全部失效。

**解决方案：**

```tsx
// 确保链条中每一环都稳定
const config = useMemo(() => ({ min: minPrice, max: maxPrice }), [minPrice, maxPrice]);
const filtered = useMemo(() => filterProducts(products, config), [products, config]);
const sorted = useMemo(() => sortProducts(filtered, sortBy), [filtered, sortBy]);
// config 稳定 → filtered 稳定 → sorted 稳定
```

### 注意事项

- 优先使用基本值作为依赖项，避免引用类型
- 引用类型依赖项必须先用 useMemo/useCallback 稳定化
- 依赖项数组中不要放 useRef.current（它的变化不触发重渲染）
- 链式 useMemo 中每一环都要保证稳定性
- ESLint exhaustive-deps 规则也适用于 useMemo

### 总结

useMemo 的依赖项必须稳定才能有效缓存。基本值天然稳定，引用类型需要用 useMemo/useCallback 稳定化或拆解为基本值。不稳定的依赖项导致缓存每次失效，useMemo 白用。链式 useMemo 中每一环都要保证稳定性，否则连锁失效。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useMemo的昂贵计算优化场景

### 概念说明

useMemo 最直接的用途是缓存昂贵的计算结果。所谓"昂贵"指的是计算耗时较长，可能导致渲染卡顿的操作，比如对大数组的遍历、排序、过滤、聚合，复杂的数学运算，大型数据结构的转换等。通过 useMemo 缓存这些结果，只在相关数据变化时才重新计算，避免了不必要的性能消耗。

判断一个计算是否"昂贵"的方法：用 `console.time` 测量执行时间，如果超过 1ms 左右，就值得用 useMemo 缓存。

### 基本示例

```tsx
// 示例说明：大数据量的搜索和统计计算

import React, { useState, useMemo } from "react";

// 模拟大量数据
function generateOrders(count: number) {
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        product: `商品${i % 100}`,
        amount: Math.random() * 1000,
        status: ["pending", "shipped", "delivered"][i % 3],
        date: new Date(2024, i % 12, (i % 28) + 1).toISOString(),
    }));
}

const allOrders = generateOrders(50000);  // 5万条订单

function OrderDashboard() {
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("all");
    const [highlightId, setHighlightId] = useState(-1);  // 无关状态

    // 昂贵计算：在5万条数据中过滤
    const filteredOrders = useMemo(() => {
        console.time("过滤订单");
        const result = allOrders.filter(order => {
            const matchSearch = order.product.includes(search);
            const matchStatus = status === "all" || order.status === status;
            return matchSearch && matchStatus;
        });
        console.timeEnd("过滤订单");
        return result;
    }, [search, status]);

    // 昂贵计算：统计总金额
    const totalAmount = useMemo(() => {
        console.time("计算总额");
        const sum = filteredOrders.reduce((acc, order) => acc + order.amount, 0);
        console.timeEnd("计算总额");
        return sum;
    }, [filteredOrders]);

    // 昂贵计算：按状态分组统计
    const statusStats = useMemo(() => {
        const stats: Record<string, { count: number; amount: number }> = {};
        filteredOrders.forEach(order => {
            if (!stats[order.status]) {
                stats[order.status] = { count: 0, amount: 0 };
            }
            stats[order.status].count++;
            stats[order.status].amount += order.amount;
        });
        return stats;
    }, [filteredOrders]);

    return (
        <div>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索商品" />
            <select value={status} onChange={e => setStatus(e.target.value)}>
                <option value="all">全部</option>
                <option value="pending">待处理</option>
                <option value="shipped">已发货</option>
                <option value="delivered">已送达</option>
            </select>

            {/* 修改 highlightId 不会重新执行上面的昂贵计算 */}
            <button onClick={() => setHighlightId(Math.random())}>
                高亮随机行
            </button>

            <p>总金额: ¥{totalAmount.toFixed(2)}</p>
            <p>结果数量: {filteredOrders.length}</p>
            {Object.entries(statusStats).map(([s, stat]) => (
                <p key={s}>{s}: {stat.count}条, ¥{stat.amount.toFixed(2)}</p>
            ))}
        </div>
    );
}

export default OrderDashboard;
```

**运行效果：** 搜索和筛选时重新计算过滤和统计。点击"高亮随机行"只触发重渲染，不重新执行昂贵计算。

### 内部原理

#### 缓存的成本与收益

```
不用 useMemo：
每次渲染 → 执行过滤（5ms） + 执行统计（3ms） = 8ms

用 useMemo：
依赖项变化时：执行过滤 + 执行统计 + 缓存比较开销 ≈ 8.1ms
依赖项不变时：缓存比较开销 ≈ 0.01ms

结论：如果组件频繁因无关状态重渲染，useMemo 节省的时间远大于比较开销
```

### 与相关API的对比

| 场景 | 是否需要 useMemo | 原因 |
|------|-----------------|------|
| 5万条数据排序 | 需要 | 排序耗时数十毫秒 |
| 复杂递归计算 | 需要 | 计算耗时可能较长 |
| 大型树形结构构建 | 需要 | 遍历和构建耗时 |
| 简单加法 `a + b` | 不需要 | 计算耗时忽略不计 |
| 字符串拼接 | 不需要 | 几乎零开销 |
| 布尔判断 | 不需要 | 比 useMemo 的开销还小 |

### 适用场景

- **大数据过滤/排序：** 处理千条以上数据的数组操作
- **数据聚合统计：** 求和、分组、计数等
- **树形结构转换：** 平铺数据转树形结构
- **正则匹配：** 对大量文本进行正则搜索
- **图表数据处理：** 将原始数据转为图表需要的格式

### 常见问题

#### 如何判断计算是否足够"昂贵"

**问题描述：** 不确定是否需要 useMemo。

**解决方案：**

```tsx
// 用 console.time 测量
console.time("计算耗时");
const result = expensiveCalculation(data);
console.timeEnd("计算耗时");

// 经验判断：
// < 0.1ms：不需要 useMemo
// 0.1ms - 1ms：可选，频繁重渲染时考虑
// > 1ms：建议使用 useMemo
// > 10ms：必须使用 useMemo
```

### 注意事项

- useMemo 的 factory 必须是纯函数，不能有副作用
- 只对真正昂贵的计算使用 useMemo，过度使用增加代码复杂度
- useMemo 不保证缓存永远有效，代码逻辑不应依赖缓存
- 用 console.time 验证计算是否值得缓存
- React DevTools Profiler 可以帮助定位性能瓶颈

### 总结

useMemo 适用于缓存耗时超过 1ms 的昂贵计算，如大数据过滤、排序、聚合、树形结构转换等。通过 console.time 测量确认计算是否足够昂贵。简单计算不需要 useMemo，缓存的比较开销可能比直接计算更大。只在确认有性能瓶颈时使用。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useCallback的缓存函数引用

### 概念说明

`useCallback` 用于缓存函数的引用。在函数组件中，每次渲染都会重新创建内联函数，即使函数体完全相同，引用也是新的。useCallback 接收一个函数和依赖项数组，只在依赖项变化时才创建新的函数引用，否则返回上一次缓存的函数。

useCallback 的主要用途是配合 React.memo 子组件——当函数作为 props 传递给 memo 包裹的子组件时，稳定的函数引用可以避免子组件不必要的重渲染。

### API 签名与参数

```typescript
function useCallback<T extends (...args: any[]) => any>(
    callback: T,
    deps: ReadonlyArray<unknown>
): T;
```

| 参数 | 类型 | 是否必填 | 说明 |
|------|------|----------|------|
| callback | T | 是 | 需要缓存的函数 |
| deps | unknown[] | 是 | 依赖项数组，变化时创建新函数 |

**返回值：** 缓存的函数引用。

### 基本示例

```tsx
// 示例说明：useCallback 配合 React.memo 避免子组件重渲染

import React, { useState, useCallback, memo } from "react";

// memo 子组件：props 不变时跳过渲染
const SearchInput = memo(function SearchInput({
    value,
    onChange,
}: {
    value: string;
    onChange: (value: string) => void;
}) {
    console.log("SearchInput 渲染了");
    return (
        <input
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="搜索"
        />
    );
});

function App() {
    const [search, setSearch] = useState("");
    const [count, setCount] = useState(0);

    // 不用 useCallback：每次渲染创建新函数，SearchInput 每次都重渲染
    // const handleChange = (value: string) => setSearch(value);

    // 用 useCallback：函数引用稳定，SearchInput 不会因 count 变化而重渲染
    const handleChange = useCallback((value: string) => {
        setSearch(value);
    }, []);  // setSearch 引用稳定，不需要依赖

    return (
        <div>
            <SearchInput value={search} onChange={handleChange} />
            <p>计数: {count}</p>
            <button onClick={() => setCount(c => c + 1)}>+1</button>
        </div>
    );
}

export default App;
```

**运行效果：** 点击 +1 时 App 重渲染，但 SearchInput 不重渲染（因为 value 和 onChange 都没变）。

### 内部原理

#### useCallback 的缓存机制

```javascript
// React 内部简化逻辑
function mountCallback(callback, deps) {
    const hook = mountWorkInProgressHook();
    hook.memoizedState = [callback, deps];  // 缓存函数和依赖项
    return callback;
}

function updateCallback(callback, deps) {
    const hook = updateWorkInProgressHook();
    const [prevCallback, prevDeps] = hook.memoizedState;

    if (areHookInputsEqual(deps, prevDeps)) {
        return prevCallback;  // 依赖项没变，返回缓存的函数
    }

    hook.memoizedState = [callback, deps];
    return callback;  // 依赖项变了，返回新函数
}
```

### 适用场景

- **传递给 memo 子组件的回调：** 避免子组件因函数引用变化而重渲染
- **作为 useEffect 的依赖项：** 稳定的函数引用不会触发 effect 重新执行
- **传递给自定义 Hook 的回调：** 保持引用稳定

### 常见问题

#### 不配合 React.memo 使用 useCallback 没有意义

**问题描述：** 到处使用 useCallback 但没有 memo 子组件。

**解决方案：**

```tsx
// 无意义的 useCallback：子组件没有用 memo 包裹
function Parent() {
    const onClick = useCallback(() => {}, []);
    // Child 没有 memo，无论 onClick 是否稳定都会重渲染
    return <Child onClick={onClick} />;
}

// 有意义的 useCallback：配合 memo 子组件
const MemoChild = memo(Child);
function Parent() {
    const onClick = useCallback(() => {}, []);
    return <MemoChild onClick={onClick} />;  // onClick 稳定，MemoChild 跳过渲染
}
```

### 注意事项

- useCallback 必须配合 React.memo 或作为 useEffect 依赖才有实际优化效果
- 单独使用 useCallback 反而增加了缓存的开销
- 依赖项数组遵循 exhaustive-deps 规则
- `useCallback(fn, deps)` 等价于 `useMemo(() => fn, deps)`
- React 19 Compiler 将自动处理函数缓存

### 总结

useCallback 缓存函数引用，依赖项不变时返回同一引用。必须配合 React.memo 子组件或作为 useEffect 依赖项才有优化效果。单独使用 useCallback 没有意义，反而增加开销。`useCallback(fn, deps)` 等价于 `useMemo(() => fn, deps)`。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useCallback的子组件重渲染优化

### 概念说明

函数组件每次渲染都会重新创建内部的函数。当这些函数作为 props 传递给 React.memo 包裹的子组件时，每次新的函数引用都会让 memo 的浅比较认为 props 发生了变化，导致子组件不必要地重新渲染。useCallback 缓存函数引用，使子组件能正确跳过重渲染。

这在列表渲染场景中尤其重要。如果有 1000 个列表项组件，父组件状态变化时，不稳定的回调函数会导致所有 1000 个子组件都重新渲染，即使它们的数据没有任何变化。

### 基本示例

```tsx
// 示例说明：列表场景中 useCallback 的优化效果

import React, { useState, useCallback, memo } from "react";

interface TodoItemProps {
    id: number;
    text: string;
    done: boolean;
    onToggle: (id: number) => void;
    onDelete: (id: number) => void;
}

// memo 包裹的列表项组件
const TodoItem = memo(function TodoItem({ id, text, done, onToggle, onDelete }: TodoItemProps) {
    console.log(`TodoItem ${id} 渲染`);
    return (
        <li>
            <input
                type="checkbox"
                checked={done}
                onChange={() => onToggle(id)}
            />
            <span style={{ textDecoration: done ? "line-through" : "none" }}>{text}</span>
            <button onClick={() => onDelete(id)}>删除</button>
        </li>
    );
});

function TodoList() {
    const [todos, setTodos] = useState([
        { id: 1, text: "学习 React", done: false },
        { id: 2, text: "写文档", done: false },
        { id: 3, text: "做测试", done: true },
    ]);
    const [input, setInput] = useState("");

    // useCallback 稳定化回调函数
    const handleToggle = useCallback((id: number) => {
        setTodos(prev => prev.map(t =>
            t.id === id ? { ...t, done: !t.done } : t
        ));
    }, []);

    const handleDelete = useCallback((id: number) => {
        setTodos(prev => prev.filter(t => t.id !== id));
    }, []);

    // 输入框变化时，只有 input 状态改变
    // 因为 handleToggle 和 handleDelete 引用稳定，TodoItem 不会重渲染
    return (
        <div>
            <input value={input} onChange={e => setInput(e.target.value)} />
            <ul>
                {todos.map(todo => (
                    <TodoItem
                        key={todo.id}
                        id={todo.id}
                        text={todo.text}
                        done={todo.done}
                        onToggle={handleToggle}
                        onDelete={handleDelete}
                    />
                ))}
            </ul>
        </div>
    );
}

export default TodoList;
```

**运行效果：** 在输入框中输入文字时，TodoItem 组件不会重新渲染。勾选某个待办时，只有该项重渲染（done 变化），其他项跳过。

### 内部原理

#### 不用 useCallback 的渲染流程

```
Parent 重渲染
  ↓ 创建新的 onToggle 函数引用
  ↓ 创建新的 onDelete 函数引用
  ↓
Child1（memo）→ props.onToggle 引用变了 → 重渲染
Child2（memo）→ props.onDelete 引用变了 → 重渲染
Child3（memo）→ 两个函数引用都变了 → 重渲染
... 所有子组件都重渲染
```

#### 用 useCallback 的渲染流程

```
Parent 重渲染
  ↓ onToggle 从缓存返回，引用不变
  ↓ onDelete 从缓存返回，引用不变
  ↓
Child1（memo）→ props 都没变 → 跳过渲染
Child2（memo）→ props 都没变 → 跳过渲染
Child3（memo）→ props 都没变 → 跳过渲染
... 所有子组件都跳过
```

### 与相关API的对比

| 场景 | 无优化 | 只用 memo | memo + useCallback |
|------|--------|----------|-------------------|
| 父组件重渲染 | 所有子组件重渲染 | 函数 props 导致全部重渲染 | 只有数据变化的子组件重渲染 |
| 1000个列表项 | 1000次渲染 | 1000次渲染 | 0-1次渲染 |

### 适用场景

- **长列表：** 大量列表项组件接收回调函数 props
- **表单字段：** 多个字段组件接收 onChange 回调
- **树形组件：** 节点组件接收展开/折叠回调
- **表格组件：** 单元格组件接收编辑/选择回调

### 常见问题

#### useCallback 中需要使用最新的 state

**问题描述：** useCallback 的依赖项为空，但回调中需要读取 state。

**解决方案：**

```tsx
// 方案：用函数式 setState，不需要依赖 state
const handleToggle = useCallback((id: number) => {
    // 函数式更新：prev 始终是最新的 state
    setTodos(prev => prev.map(t =>
        t.id === id ? { ...t, done: !t.done } : t
    ));
}, []);  // 空依赖，引用永远稳定
```

### 注意事项

- useCallback 必须配合 React.memo 子组件才有优化效果
- 函数式 setState 让回调不需要依赖 state，保持引用稳定
- 列表场景是 useCallback 最典型的应用场景
- 不要给每个函数都加 useCallback，只在传递给 memo 子组件时使用
- React 19 Compiler 将自动处理函数引用缓存

### 总结

useCallback 配合 React.memo 子组件，通过稳定的函数引用避免子组件不必要的重渲染。在列表、表单、表格等多子组件场景中效果显著。结合函数式 setState 可以让回调保持空依赖。单独使用 useCallback 没有优化效果，必须和 memo 搭配。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useCallback的依赖项完整性

### 概念说明

useCallback 的依赖项数组和 useEffect 遵循相同的规则：回调函数中引用的所有响应式变量（props、state、从它们派生的值）都必须出现在依赖项数组中。ESLint 的 `exhaustive-deps` 规则会检查依赖项的完整性，遗漏依赖项会导致回调函数中使用的是旧值（闭包陷阱）。

依赖项完整性和函数引用稳定性之间存在天然矛盾：依赖项越多，函数引用越不稳定。解决这个矛盾的方法包括：函数式 setState、useRef 存储最新值、将不需要的依赖从回调中移除等。

### 基本示例

```tsx
// 示例说明：展示依赖项遗漏导致的 bug 和正确处理方式

import React, { useState, useCallback } from "react";

function ChatSender({ roomId }: { roomId: string }) {
    const [message, setMessage] = useState("");
    const [theme, setTheme] = useState("light");

    // 错误：遗漏了 roomId 依赖，发送时用的可能是旧的 roomId
    // const sendMessage = useCallback(() => {
    //     sendToRoom(roomId, message);  // roomId 是旧值
    //     setMessage("");
    // }, [message]);  // ESLint 警告：missing dependency 'roomId'

    // 正确：包含所有依赖项
    const sendMessage = useCallback(() => {
        sendToRoom(roomId, message);
        setMessage("");
    }, [roomId, message]);  // roomId 和 message 都在依赖项中

    return (
        <div>
            <input value={message} onChange={e => setMessage(e.target.value)} />
            <button onClick={sendMessage}>发送到 {roomId}</button>
        </div>
    );
}

function sendToRoom(roomId: string, message: string) {
    console.log(`[${roomId}] ${message}`);
}

export default ChatSender;
```

### 进阶用法

```tsx
// 进阶场景：减少依赖项让函数引用更稳定

import React, { useState, useCallback, useRef } from "react";

function OptimizedChat({ roomId }: { roomId: string }) {
    const [message, setMessage] = useState("");

    // 方案1：用 useRef 存储不需要触发更新的值
    const messageRef = useRef(message);
    messageRef.current = message;

    // roomId 变化时函数重建，message 变化时不重建
    const sendMessage = useCallback(() => {
        sendToRoom(roomId, messageRef.current);
        setMessage("");
    }, [roomId]);  // 只依赖 roomId

    // 方案2：将所有状态放入函数式 setState
    const sendMessage2 = useCallback(() => {
        // 通过函数式 setState 读取最新的 message
        setMessage(currentMessage => {
            if (currentMessage.trim()) {
                sendToRoom(roomId, currentMessage);
            }
            return "";  // 清空输入
        });
    }, [roomId]);

    return (
        <div>
            <input value={message} onChange={e => setMessage(e.target.value)} />
            <button onClick={sendMessage}>发送</button>
        </div>
    );
}

function sendToRoom(roomId: string, message: string) {
    console.log(`[${roomId}] ${message}`);
}

export default OptimizedChat;
```

### 与相关API的对比

| 减少依赖的方式 | 适用场景 | 注意事项 |
|---------------|---------|---------|
| 函数式 setState | 更新状态时需要旧值 | 不能在 setState 中产生其他副作用 |
| useRef 存储值 | 只需要读取最新值 | ref.current 变化不触发渲染 |
| 移到组件外部 | 不依赖组件内部值 | 只适合纯函数或常量 |
| 拆分回调 | 不同依赖的逻辑分开 | 增加代码量 |

### 适用场景

- **事件回调：** 需要引用 props 和 state 的事件处理函数
- **定时器回调：** setInterval 中需要最新值但不想重建定时器
- **传递给子组件的回调：** 需要平衡引用稳定性和值的新鲜度

### 常见问题

#### 依赖项太多导致 useCallback 频繁重建

**问题描述：** useCallback 有多个依赖项，任何一个变化都导致函数重建，memo 优化失效。

**解决方案：**

```tsx
// 使用 useReducer 替代多个 useState
// dispatch 引用永远稳定，不需要作为依赖项
const [state, dispatch] = useReducer(reducer, initialState);

const handleSubmit = useCallback(() => {
    dispatch({ type: "submit", payload: state });
}, [state]);

// 或者：将依赖项通过 ref 传递
const stateRef = useRef(state);
stateRef.current = state;

const handleSubmit = useCallback(() => {
    // 通过 ref 读取最新 state，依赖项为空
    processSubmit(stateRef.current);
}, []);
```

### 注意事项

- 遵循 exhaustive-deps 规则，包含所有响应式依赖
- 函数式 setState 可以避免 state 作为依赖项
- useRef 可以在不添加依赖项的情况下读取最新值
- dispatch 引用稳定，不需要加入依赖项
- 不要为了减少依赖项而用 `// eslint-disable-next-line`

### 总结

useCallback 的依赖项必须包含回调中引用的所有响应式变量。依赖项完整性和引用稳定性之间的矛盾可以通过函数式 setState、useRef、useReducer 的 dispatch 等方式解决。始终遵循 exhaustive-deps 规则，不要随意禁用 ESLint 检查。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useCallback与useMemo的关系

### 概念说明

`useCallback` 和 `useMemo` 本质上是同一个机制的两种表现形式。useCallback 缓存的是函数本身，useMemo 缓存的是函数的返回值。事实上，`useCallback(fn, deps)` 完全等价于 `useMemo(() => fn, deps)`——useMemo 返回的是传入函数的执行结果，当传入的函数返回另一个函数时，效果就和 useCallback 一样。

理解这个等价关系有助于在实际开发中做出正确选择：需要缓存计算结果用 useMemo，需要缓存函数引用用 useCallback。

### 基本示例

```tsx
// 示例说明：展示 useCallback 和 useMemo 的等价性

import React, { useState, useCallback, useMemo } from "react";

function EquivalenceDemo() {
    const [count, setCount] = useState(0);

    // 这两种写法完全等价
    const handleClickA = useCallback(() => {
        console.log("clicked", count);
    }, [count]);

    const handleClickB = useMemo(() => {
        // useMemo 的 factory 返回一个函数
        return () => {
            console.log("clicked", count);
        };
    }, [count]);

    // handleClickA 和 handleClickB 行为完全一致
    // 都在 count 变化时创建新函数，不变时返回缓存的函数

    // useMemo 缓存计算结果
    const doubled = useMemo(() => count * 2, [count]);

    // useCallback 缓存函数引用
    const increment = useCallback(() => setCount(c => c + 1), []);

    return (
        <div>
            <p>count: {count}, doubled: {doubled}</p>
            <button onClick={increment}>+1</button>
        </div>
    );
}

export default EquivalenceDemo;
```

### 内部原理

#### React 源码中的实现

```javascript
// React 内部，useCallback 和 useMemo 共享相同的底层机制

function mountCallback(callback, deps) {
    const hook = mountWorkInProgressHook();
    hook.memoizedState = [callback, deps];  // 直接缓存函数
    return callback;
}

function mountMemo(nextCreate, deps) {
    const hook = mountWorkInProgressHook();
    const nextValue = nextCreate();          // 执行 factory，缓存返回值
    hook.memoizedState = [nextValue, deps];
    return nextValue;
}

// useCallback(fn, deps) 等价于：
// useMemo(() => fn, deps)
// 因为 useMemo 会执行 () => fn，返回 fn 本身
```

### 与相关API的对比

| 对比维度 | useCallback | useMemo |
|----------|-----------|--------|
| 缓存内容 | 函数本身 | 函数的返回值 |
| 典型用途 | 稳定化回调函数引用 | 缓存昂贵计算结果 |
| 语法 | `useCallback(fn, deps)` | `useMemo(() => value, deps)` |
| 等价写法 | `useMemo(() => fn, deps)` | 无直接等价 |
| 配合场景 | React.memo 子组件的回调 | 昂贵计算、稳定化对象引用 |

### 适用场景

**选择 useCallback 的场景：**
- 函数作为 props 传递给 memo 子组件
- 函数作为 useEffect 的依赖项
- 函数传递给自定义 Hook

**选择 useMemo 的场景：**
- 缓存昂贵的计算结果（过滤、排序、聚合）
- 稳定化对象/数组引用
- 派生状态的计算

### 常见问题

#### 什么时候用 useCallback 什么时候用 useMemo

**解决方案：**

```tsx
// 缓存函数 → useCallback
const handleClick = useCallback(() => {
    doSomething(id);
}, [id]);

// 缓存值 → useMemo
const sortedList = useMemo(() => {
    return list.sort((a, b) => a - b);
}, [list]);

// 缓存对象 → useMemo
const config = useMemo(() => ({
    theme: "dark",
    locale: "zh",
}), []);

// 缓存"返回函数的函数"的结果（即缓存函数）→ 两种都行，useCallback 更语义化
```

### 注意事项

- `useCallback(fn, deps)` 等价于 `useMemo(() => fn, deps)`
- 缓存函数用 useCallback（语义更清晰）
- 缓存计算结果用 useMemo
- 两者都是性能优化，不是语义保证
- 两者的依赖项规则完全相同
- React 19 Compiler 将自动处理两者的使用

### 总结

useCallback 缓存函数引用，useMemo 缓存计算结果，两者共享相同的底层缓存机制。`useCallback(fn, deps)` 等价于 `useMemo(() => fn, deps)`。缓存函数用 useCallback 更语义化，缓存值用 useMemo。两者的依赖项规则完全一致。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useDeferredValue的低优先级更新

### 概念说明

`useDeferredValue` 是 React 18 引入的并发特性 Hook，用于将某个值标记为"低优先级"。当有高优先级更新（如用户输入）发生时，React 会优先处理高优先级更新，延迟处理低优先级的 deferred value 更新。这样用户输入能保持流畅，而昂贵的渲染（如大列表过滤）会在输入空闲后才执行。

useDeferredValue 接收一个值，返回该值的延迟版本。在高优先级更新期间，返回的是旧值；高优先级更新完成后，React 会用新值重新渲染一次。

### API 签名与参数

```typescript
function useDeferredValue<T>(value: T): T;

// React 19 新增：支持初始值
function useDeferredValue<T>(value: T, initialValue?: T): T;
```

| 参数 | 类型 | 说明 |
|------|------|------|
| value | T | 需要延迟的值 |
| initialValue | T（React 19） | 首次渲染时使用的初始值 |

**返回值：** 值的延迟版本，在高优先级更新期间返回旧值。

### 基本示例

```tsx
// 示例说明：搜索框输入保持流畅，列表过滤延迟执行

import React, { useState, useDeferredValue, useMemo } from "react";

// 模拟大量数据
const allItems = Array.from({ length: 20000 }, (_, i) => `项目 ${i + 1}`);

function SearchApp() {
    const [query, setQuery] = useState("");

    // query 的延迟版本：输入时保持旧值，输入停止后更新
    const deferredQuery = useDeferredValue(query);

    // 用延迟值做昂贵的过滤计算
    const filteredItems = useMemo(() => {
        return allItems.filter(item =>
            item.toLowerCase().includes(deferredQuery.toLowerCase())
        );
    }, [deferredQuery]);  // 依赖延迟值，不是实时值

    // 判断是否正在等待延迟更新
    const isStale = query !== deferredQuery;

    return (
        <div>
            <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="搜索..."
            />
            <div style={{ opacity: isStale ? 0.5 : 1, transition: "opacity 0.2s" }}>
                <p>显示 {filteredItems.length} 条结果</p>
                <ul>
                    {filteredItems.slice(0, 100).map(item => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

export default SearchApp;
```

**运行效果：** 快速输入时输入框立即响应，列表区域显示半透明（正在更新），输入停止后列表更新为最新结果。

### 内部原理

#### 延迟更新的调度机制

```
用户快速输入 "abc"：

t1: 输入 "a" → 高优先级：query="a"，低优先级：deferredQuery 排队
t2: 输入 "ab" → 高优先级：query="ab"，低优先级：deferredQuery 排队（覆盖上一次）
t3: 输入 "abc" → 高优先级：query="abc"，低优先级：deferredQuery 排队（覆盖）
t4: 输入停止 → React 处理低优先级：deferredQuery="abc"
                → 只执行一次昂贵的列表过滤

整个过程输入框始终流畅响应
```

### 适用场景

- **搜索过滤：** 输入框实时输入，列表延迟过滤
- **Tab 切换：** 切换 Tab 时旧内容保持显示直到新内容准备好
- **图表更新：** 数据频繁变化时延迟图表重绘
- **大列表渲染：** 数据变化时延迟列表重新渲染

### 常见问题

#### useDeferredValue 和 debounce 有什么区别

**问题描述：** 两者都能延迟更新，如何选择。

**解决方案：**

```
useDeferredValue：
- React 内部调度，自动适应设备性能
- 快设备上延迟几乎感知不到，慢设备上延迟更长
- 不丢弃中间值，只是延迟处理
- 可以被高优先级更新中断

debounce：
- 固定延迟时间（如 300ms）
- 不考虑设备性能
- 丢弃延迟期间的中间触发
- 不与 React 渲染调度集成
```

### 注意事项

- useDeferredValue 需要 React 18+ 和 createRoot
- 返回的延迟值用于驱动昂贵的渲染，不是驱动用户交互
- 配合 useMemo 使用效果更好（避免延迟值变化时还是做不必要的计算）
- isStale 状态（query !== deferredQuery）可用于显示加载指示
- React 19 新增 initialValue 参数用于首次渲染的占位值

### 总结

useDeferredValue 将值标记为低优先级，高优先级更新期间返回旧值，空闲后更新为新值。适用于搜索过滤、大列表渲染等场景，保持用户输入流畅。与 debounce 不同，它由 React 调度器管理，自动适应设备性能。配合 useMemo 使用效果更佳。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useDeferredValue的延迟渲染效果

### 概念说明

useDeferredValue 的延迟渲染效果体现在：当传入的值快速变化时，React 不会立即用最新值渲染组件，而是先用旧值完成当前渲染，等到空闲时再用新值触发一次后台渲染。如果在后台渲染过程中又有新的高优先级更新进来，React 会中断后台渲染，优先处理高优先级更新。

这种延迟渲染的特点是：旧内容保持可见（不会出现空白或 loading），直到新内容准备好后才替换。这比 Suspense 的 fallback 体验更好——用户看到的是略微过时但完整的内容，而不是 loading 骨架屏。

### 基本示例

```tsx
// 示例说明：Tab 切换时保持旧内容显示，直到新内容准备好

import React, { useState, useDeferredValue, memo, useMemo } from "react";

// 模拟昂贵的列表组件
const HeavyList = memo(function HeavyList({ category }: { category: string }) {
    // 模拟大量 DOM 节点渲染
    const items = useMemo(() => {
        const result = [];
        for (let i = 0; i < 5000; i++) {
            result.push(`${category} - 项目 ${i + 1}`);
        }
        return result;
    }, [category]);

    return (
        <ul>
            {items.map(item => (
                <li key={item}>{item}</li>
            ))}
        </ul>
    );
});

function TabPanel() {
    const [tab, setTab] = useState("电子产品");

    // 延迟版本的 tab：切换时旧列表保持显示
    const deferredTab = useDeferredValue(tab);

    // 判断是否正在切换（旧内容正在显示）
    const isStale = tab !== deferredTab;

    return (
        <div>
            <div>
                {["电子产品", "图书", "服装", "食品"].map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        style={{ fontWeight: tab === t ? "bold" : "normal" }}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* 切换中显示半透明，表示内容即将更新 */}
            <div style={{
                opacity: isStale ? 0.6 : 1,
                transition: "opacity 0.15s",
            }}>
                {/* 用延迟值渲染列表，切换时先显示旧列表 */}
                <HeavyList category={deferredTab} />
            </div>
        </div>
    );
}

export default TabPanel;
```

**运行效果：** 点击 Tab 按钮时，按钮立即切换高亮状态（高优先级），列表区域先变半透明（旧内容），新列表渲染完成后替换旧内容并恢复不透明。

### 内部原理

#### 两次渲染机制

```
点击切换 Tab "电子产品" → "图书"：

第一次渲染（高优先级，同步）：
  tab = "图书"          ← 新值
  deferredTab = "电子产品"  ← 仍然是旧值
  → 按钮高亮切换到"图书"
  → 列表仍显示"电子产品"的内容（半透明）
  → 页面立即响应

第二次渲染（低优先级，可中断）：
  tab = "图书"
  deferredTab = "图书"    ← 更新为新值
  → 列表显示"图书"的内容
  → 恢复不透明
```

### 适用场景

- **Tab 切换：** 旧 Tab 内容保持显示直到新内容就绪
- **搜索结果：** 输入时旧结果保持可见
- **图表切换：** 切换数据源时旧图表保持显示
- **分页：** 切换页码时旧页面保持显示

### 常见问题

#### 延迟渲染导致短暂显示旧数据是否有问题

**问题描述：** 用户看到的是过时的数据，会不会造成困惑。

**解决方案：**

```tsx
// 通过视觉提示告诉用户"内容正在更新"
const isStale = currentValue !== deferredValue;

return (
    <div style={{
        // 半透明 + 过渡动画
        opacity: isStale ? 0.5 : 1,
        transition: "opacity 0.2s",
        // 或者添加 loading 指示器
    }}>
        {isStale && <div className="updating-indicator">更新中...</div>}
        <ExpensiveContent data={deferredValue} />
    </div>
);
```

### 注意事项

- 延迟渲染保持旧内容可见，比空白 loading 体验更好
- 用 `value !== deferredValue` 判断是否正在延迟中
- 配合 opacity 过渡动画提供视觉反馈
- 延迟渲染是可中断的，快速连续操作只会执行最后一次
- 需要 React 18+ 和 createRoot 才能生效

### 总结

useDeferredValue 的延迟渲染效果让旧内容保持可见直到新内容准备好，避免了空白 loading 状态。通过两次渲染机制实现：第一次用旧值快速响应交互，第二次用新值在后台渲染新内容。配合 opacity 视觉反馈让用户知道内容正在更新。适用于 Tab 切换、搜索结果、分页等场景。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useDeferredValue与防抖的区别

### 概念说明

useDeferredValue 和防抖（debounce）都能延迟处理频繁变化的值，但实现机制和适用场景完全不同。防抖是一种通用的 JavaScript 技术，通过设置固定的延迟时间来合并频繁触发的操作；useDeferredValue 是 React 的并发特性，由 React 调度器根据设备性能和当前任务负载动态决定延迟时机。

防抖适合延迟网络请求等副作用操作，useDeferredValue 适合延迟 React 组件的渲染更新。两者解决的是不同层面的问题，在某些场景中可以组合使用。

### 基本示例

```tsx
// 示例说明：同一个搜索场景分别用 debounce 和 useDeferredValue 实现

import React, { useState, useDeferredValue, useMemo, useEffect, useRef } from "react";

// 方案1：useDeferredValue（延迟渲染）
function SearchWithDeferred() {
    const [query, setQuery] = useState("");
    const deferredQuery = useDeferredValue(query);

    // 延迟渲染：输入时保持流畅，列表延迟更新
    const results = useMemo(() => {
        return heavyFilter(deferredQuery);
    }, [deferredQuery]);

    return (
        <div>
            <input value={query} onChange={e => setQuery(e.target.value)} />
            <p>结果: {results.length} 条</p>
        </div>
    );
}

// 方案2：debounce（延迟请求）
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

function SearchWithDebounce() {
    const [query, setQuery] = useState("");
    const debouncedQuery = useDebounce(query, 300);

    // 延迟请求：输入停止 300ms 后才发起搜索
    useEffect(() => {
        if (debouncedQuery) {
            fetchSearchResults(debouncedQuery);
        }
    }, [debouncedQuery]);

    return (
        <div>
            <input value={query} onChange={e => setQuery(e.target.value)} />
        </div>
    );
}

function heavyFilter(query: string): string[] {
    // 模拟昂贵的本地过滤
    return Array.from({ length: 10000 }, (_, i) => `项目${i}`)
        .filter(item => item.includes(query));
}

function fetchSearchResults(query: string) {
    console.log(`发起搜索请求: ${query}`);
}

export default SearchWithDeferred;
```

### 与相关API的对比

| 对比维度 | useDeferredValue | debounce |
|----------|-----------------|---------|
| 延迟机制 | React 调度器动态决定 | 固定延迟时间（如 300ms） |
| 适应设备性能 | 是（快设备几乎无延迟） | 否（固定时间） |
| 可中断 | 是（高优先级更新可中断） | 否 |
| 适用场景 | 延迟 React 渲染更新 | 延迟副作用（API 请求等） |
| 旧值保持 | 是（旧内容保持可见） | 否（延迟期间无更新） |
| 需要 React 18 | 是 | 否 |
| 丢弃中间值 | 是（渲染层面） | 是（只处理最后一次） |

### 适用场景

**用 useDeferredValue：**
- 本地数据的昂贵过滤/排序
- 大列表的渲染优化
- Tab 切换时的内容过渡
- 任何需要延迟 React 渲染的场景

**用 debounce：**
- 搜索接口请求
- 表单自动保存
- 窗口 resize 处理
- 任何需要延迟副作用执行的场景

**组合使用：**
- debounce 延迟 API 请求 + useDeferredValue 延迟本地过滤渲染

### 常见问题

#### 两者能否组合使用

**解决方案：**

```tsx
function SearchCombined() {
    const [query, setQuery] = useState("");

    // debounce：延迟 API 请求
    const debouncedQuery = useDebounce(query, 300);
    useEffect(() => {
        if (debouncedQuery) fetchSearchResults(debouncedQuery);
    }, [debouncedQuery]);

    // useDeferredValue：延迟本地过滤渲染
    const deferredQuery = useDeferredValue(query);
    const localResults = useMemo(() => heavyFilter(deferredQuery), [deferredQuery]);

    return (
        <div>
            <input value={query} onChange={e => setQuery(e.target.value)} />
            <p>本地匹配: {localResults.length}</p>
        </div>
    );
}
```

### 注意事项

- useDeferredValue 解决渲染性能问题，debounce 解决请求频率问题
- useDeferredValue 不需要指定延迟时间，由 React 自动决定
- debounce 需要手动指定延迟时间，不感知设备性能
- useDeferredValue 在快设备上延迟极短，用户几乎感知不到
- 两者可以组合使用，各自处理不同层面的问题

### 总结

useDeferredValue 和 debounce 解决不同层面的问题：useDeferredValue 延迟 React 渲染，自适应设备性能，保持旧内容可见；debounce 延迟副作用执行，使用固定延迟时间。前者适合本地渲染优化，后者适合减少网络请求。两者可以组合使用。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useTransition的过渡状态标记

### 概念说明

`useTransition` 是 React 18 引入的并发特性 Hook，用于将某些状态更新标记为"过渡"（Transition），即非紧急更新。被标记为过渡的更新可以被用户输入等紧急更新中断，React 会优先处理紧急更新，保持界面响应。

useTransition 返回两个值：`isPending`（布尔值，表示过渡是否正在进行）和 `startTransition`（函数，用于将状态更新包裹为过渡）。isPending 可以用来显示加载指示器，让用户知道后台正在处理。

### API 签名与参数

```typescript
function useTransition(): [boolean, (callback: () => void) => void];

// 返回值解构
const [isPending, startTransition] = useTransition();
```

| 返回值 | 类型 | 说明 |
|--------|------|------|
| isPending | boolean | 过渡是否正在进行 |
| startTransition | (callback) => void | 将回调中的状态更新标记为过渡 |

### 基本示例

```tsx
// 示例说明：Tab 切换使用 useTransition 保持界面响应

import React, { useState, useTransition, memo, useMemo } from "react";

// 模拟昂贵的内容组件
const TabContent = memo(function TabContent({ tab }: { tab: string }) {
    const items = useMemo(() => {
        // 模拟大量渲染
        return Array.from({ length: 5000 }, (_, i) => `${tab} - 内容 ${i + 1}`);
    }, [tab]);

    return (
        <ul>
            {items.map(item => <li key={item}>{item}</li>)}
        </ul>
    );
});

function TabApp() {
    const [tab, setTab] = useState("首页");
    const [isPending, startTransition] = useTransition();

    function handleTabChange(nextTab: string) {
        // 将 Tab 切换标记为过渡（非紧急更新）
        startTransition(() => {
            setTab(nextTab);
        });
    }

    return (
        <div>
            <nav>
                {["首页", "产品", "关于"].map(t => (
                    <button
                        key={t}
                        onClick={() => handleTabChange(t)}
                        style={{
                            fontWeight: tab === t ? "bold" : "normal",
                        }}
                    >
                        {t}
                    </button>
                ))}
            </nav>

            {/* isPending 为 true 时显示加载提示 */}
            {isPending && <p style={{ color: "#888" }}>切换中...</p>}

            <TabContent tab={tab} />
        </div>
    );
}

export default TabApp;
```

**运行效果：** 点击 Tab 按钮时界面立即响应（按钮可点击），如果渲染耗时则显示"切换中..."提示，内容在后台渲染完成后替换。

### 内部原理

#### 过渡更新的调度

```
用户点击"产品" Tab：

1. startTransition 内的 setTab("产品") 被标记为 Transition 优先级
2. React 开始低优先级渲染
3. 如果此时用户又点击了"关于"：
   - 中断"产品"的渲染
   - 开始"关于"的渲染
4. 渲染完成后，isPending 变为 false
5. 新内容显示在页面上
```

#### 优先级对比

```
紧急更新（默认）：
  - 用户输入（onChange）
  - 点击（onClick）
  - 直接调用 setState

过渡更新（startTransition 包裹）：
  - Tab 内容切换
  - 搜索结果更新
  - 列表筛选
  - 路由导航
```

### 适用场景

- **Tab 切换：** 切换时旧内容保持可用，新内容在后台渲染
- **路由导航：** 页面切换时保持当前页面响应
- **搜索结果：** 输入时搜索结果延迟更新
- **数据刷新：** 点击刷新时不阻塞其他交互

### 常见问题

#### startTransition 中只能放同步的 setState

**问题描述：** 在 startTransition 中发起异步请求，isPending 不按预期工作。

**解决方案：**

```tsx
// 错误：异步操作不在 startTransition 的范围内
// startTransition(() => {
//     fetch("/api/data").then(data => {
//         setData(data);  // 这个 setState 不在 transition 中
//     });
// });

// 正确：startTransition 中只放同步的 setState
startTransition(() => {
    setTab("产品");  // 同步调用 setState
});

// 如果需要异步+过渡，先获取数据再过渡
async function handleClick() {
    const data = await fetch("/api/data").then(r => r.json());
    startTransition(() => {
        setData(data);  // 数据已获取，同步设置
    });
}
```

### 注意事项

- startTransition 回调中的 setState 是同步调用的
- isPending 在过渡进行时为 true，完成后为 false
- 过渡更新可以被紧急更新中断
- 需要 React 18+ 和 createRoot
- startTransition 不能包裹异步操作（async/await）
- React 19 支持在 startTransition 中使用异步函数（Actions）

### 总结

useTransition 将状态更新标记为过渡（非紧急），可被紧急更新中断。返回 isPending 用于显示加载状态，startTransition 用于包裹非紧急的 setState。适用于 Tab 切换、路由导航等场景。startTransition 中只能放同步的 setState 调用。React 19 扩展了对异步 Actions 的支持。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useTransition的isPending状态

### 概念说明

`isPending` 是 useTransition 返回的第一个值，是一个布尔值，表示当前是否有过渡更新正在进行。当 startTransition 中的状态更新触发了重新渲染但尚未完成时，isPending 为 `true`；渲染完成后变为 `false`。

isPending 的核心作用是为用户提供视觉反馈——让用户知道操作已经触发、后台正在处理。可以用它来显示加载指示器、禁用按钮、降低内容透明度等，避免用户以为操作没有响应而重复点击。

### 基本示例

```tsx
// 示例说明：利用 isPending 提供多种视觉反馈

import React, { useState, useTransition } from "react";

function DataDashboard() {
    const [timeRange, setTimeRange] = useState("7d");
    const [isPending, startTransition] = useTransition();

    function handleTimeRangeChange(range: string) {
        startTransition(() => {
            setTimeRange(range);
        });
    }

    return (
        <div>
            <div style={{ display: "flex", gap: 8 }}>
                {["1d", "7d", "30d", "90d"].map(range => (
                    <button
                        key={range}
                        onClick={() => handleTimeRangeChange(range)}
                        disabled={isPending}  // 过渡期间禁用按钮
                        style={{
                            fontWeight: timeRange === range ? "bold" : "normal",
                            opacity: isPending ? 0.6 : 1,
                        }}
                    >
                        {range}
                    </button>
                ))}

                {/* isPending 时显示加载指示器 */}
                {isPending && <span style={{ color: "#999" }}>加载中...</span>}
            </div>

            {/* 内容区域在过渡期间降低透明度 */}
            <div style={{
                opacity: isPending ? 0.5 : 1,
                transition: "opacity 0.2s",
                pointerEvents: isPending ? "none" : "auto",
            }}>
                <HeavyChart timeRange={timeRange} />
            </div>
        </div>
    );
}

// 模拟昂贵的图表组件
function HeavyChart({ timeRange }: { timeRange: string }) {
    // 模拟大量渲染工作
    const data = React.useMemo(() => {
        const points = [];
        const count = timeRange === "1d" ? 24 : timeRange === "7d" ? 168 : timeRange === "30d" ? 720 : 2160;
        for (let i = 0; i < count * 10; i++) {
            points.push({ x: i, y: Math.random() * 100 });
        }
        return points;
    }, [timeRange]);

    return (
        <div>
            <p>时间范围: {timeRange}，数据点: {data.length}</p>
            <ul>
                {data.slice(0, 50).map((p, i) => (
                    <li key={i}>x={p.x}, y={p.y.toFixed(2)}</li>
                ))}
            </ul>
        </div>
    );
}

export default DataDashboard;
```

**运行效果：** 切换时间范围时，按钮立即变为禁用状态并显示"加载中..."，内容区域变半透明。图表渲染完成后恢复正常。

### 内部原理

#### isPending 的状态变化时机

```
用户点击 "30d" 按钮：

t1: startTransition(() => setTimeRange("30d"))
    → isPending 立即变为 true（同步）
    → 界面更新：按钮禁用 + 显示加载提示 + 内容半透明

t2: React 开始低优先级渲染 HeavyChart（可中断）

t3: 如果用户此时点击 "90d"：
    → 中断 "30d" 的渲染
    → 开始 "90d" 的渲染
    → isPending 保持 true

t4: 渲染完成
    → isPending 变为 false
    → 界面恢复：按钮可用 + 隐藏加载 + 内容正常显示
```

### 与相关API的对比

| 加载状态方案 | 触发方式 | 自动管理 | 适用场景 |
|------------|---------|---------|---------|
| isPending | startTransition | 是（React 自动） | 过渡期间的加载反馈 |
| useState loading | 手动 setState | 否（手动管理） | 异步请求的加载状态 |
| Suspense fallback | 组件挂起 | 是（React 自动） | 数据加载的 loading UI |

### 适用场景

- **按钮禁用：** 过渡期间防止重复点击
- **加载指示器：** 显示 spinner 或文字提示
- **内容降级显示：** 降低透明度或显示骨架屏
- **导航反馈：** 路由切换时的页面过渡效果

### 常见问题

#### isPending 始终为 false

**问题描述：** 使用了 startTransition 但 isPending 一直是 false。

**原因分析：** 渲染速度很快，isPending 为 true 的时间极短，肉眼无法感知。

**解决方案：**

```tsx
// 这是正常现象：如果渲染很快，isPending 几乎不可见
// 只有渲染耗时较长（超过几十毫秒）时 isPending 才有意义

// 确认是否正确使用了 createRoot
// ReactDOM.createRoot(root).render(<App />);  // 并发模式
// ReactDOM.render(<App />, root);  // 传统模式，useTransition 不生效
```

### 注意事项

- isPending 在 startTransition 调用后立即变为 true
- isPending 在过渡渲染完成后变为 false
- 渲染速度快时 isPending 可能肉眼不可见
- 需要 createRoot 才能正常工作
- isPending 可以用于 UI 反馈但不应用于业务逻辑判断
- 多个 startTransition 调用会合并，isPending 在所有过渡完成后才变 false

### 总结

isPending 是 useTransition 的加载状态指示器，在过渡更新进行期间为 true，完成后为 false。用于禁用按钮、显示加载提示、降低内容透明度等视觉反馈。isPending 由 React 自动管理，无需手动 setState。渲染快时 isPending 可能不可见，这是正常现象。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useTransition的startTransition

### 概念说明

`startTransition` 是 useTransition 返回的第二个值，是一个函数，用于将其回调中的状态更新标记为"过渡"优先级。被标记的更新不会阻塞用户交互，React 调度器会在空闲时处理这些更新，并且可以在更高优先级的更新到来时中断它们。

React 还提供了一个独立的 `React.startTransition` 函数（不需要 Hook），适用于无法使用 Hook 的场景（如组件外部的代码）。两者的区别是：useTransition 版本提供 isPending 状态，独立版本没有。

### API 签名与参数

```typescript
// useTransition 返回的 startTransition
const [isPending, startTransition] = useTransition();
startTransition(() => {
    setState(newValue);  // 回调中的 setState 被标记为过渡
});

// 独立的 startTransition（无 isPending）
import { startTransition } from "react";
startTransition(() => {
    setState(newValue);
});
```

### 基本示例

```tsx
// 示例说明：搜索输入 + 列表过滤使用 startTransition

import React, { useState, useTransition, startTransition as reactStartTransition } from "react";

// 大量数据
const allCities = Array.from({ length: 10000 }, (_, i) => `城市${i + 1}`);

function CitySearch() {
    const [input, setInput] = useState("");
    const [filter, setFilter] = useState("");
    const [isPending, startTransition] = useTransition();

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        const value = e.target.value;

        // 紧急更新：输入框立即响应
        setInput(value);

        // 过渡更新：列表过滤延迟处理
        startTransition(() => {
            setFilter(value);
        });
    }

    const filteredCities = allCities.filter(city => city.includes(filter));

    return (
        <div>
            <input value={input} onChange={handleInputChange} placeholder="搜索城市" />
            {isPending && <p>过滤中...</p>}
            <p>找到 {filteredCities.length} 个城市</p>
            <ul>
                {filteredCities.slice(0, 100).map(city => (
                    <li key={city}>{city}</li>
                ))}
            </ul>
        </div>
    );
}

// 在组件外部使用独立的 startTransition
function updateGlobalFilter(value: string, setFilter: (v: string) => void) {
    reactStartTransition(() => {
        setFilter(value);
    });
}

export default CitySearch;
```

**运行效果：** 输入框实时响应输入，列表过滤在后台进行，输入期间显示"过滤中..."提示。

### 内部原理

#### startTransition 的工作机制

```javascript
// React 内部简化逻辑
function startTransition(callback) {
    // 1. 设置 isPending 为 true（紧急更新）
    setPending(true);

    // 2. 切换到 Transition 优先级
    const prevTransition = ReactCurrentBatchConfig.transition;
    ReactCurrentBatchConfig.transition = {};

    try {
        // 3. 执行回调：其中的 setState 被标记为 Transition 优先级
        callback();
    } finally {
        // 4. 恢复优先级
        ReactCurrentBatchConfig.transition = prevTransition;
    }

    // 5. 调度低优先级渲染
    // isPending 在过渡渲染完成后自动变为 false
}
```

### 与相关API的对比

| 对比维度 | useTransition 的 startTransition | React.startTransition |
|----------|--------------------------------|---------------------|
| 是否需要 Hook | 是 | 否 |
| 提供 isPending | 是 | 否 |
| 使用场景 | 组件内部 | 组件外部、事件处理器、工具函数 |

### 适用场景

- **搜索过滤：** 输入紧急更新 + 过滤过渡更新
- **Tab 切换：** 按钮高亮紧急更新 + 内容渲染过渡更新
- **路由导航：** URL 更新紧急 + 页面渲染过渡
- **全局状态更新：** 在状态管理库中标记低优先级更新

### 常见问题

#### startTransition 中的 setState 是同步还是异步

**问题描述：** startTransition 回调中的 setState 何时执行。

**解决方案：**

```tsx
// startTransition 的回调是同步执行的
// 但其中的 setState 被标记为低优先级，由 React 调度器决定何时渲染

startTransition(() => {
    console.log("1. 回调同步执行");
    setFilter("abc");  // setState 同步调用，但渲染被延迟
    console.log("2. setState 已调用");
});
console.log("3. startTransition 之后");
// 输出顺序：1 → 2 → 3
// 但 filter 对应的渲染是低优先级的，会在空闲时处理
```

### 注意事项

- startTransition 回调同步执行，但渲染是低优先级的
- 回调中只能放同步的 setState 调用
- 不要在回调中放 setTimeout、fetch 等异步操作（React 18）
- React 19 支持异步 startTransition（Actions）
- 多个 startTransition 中的更新会合并
- 过渡更新可以被紧急更新中断

### 总结

startTransition 将回调中的 setState 标记为过渡优先级，不阻塞用户交互。回调同步执行但渲染被延迟。useTransition 版本提供 isPending 状态，React.startTransition 可在组件外使用。适用于将昂贵的渲染更新与紧急的用户输入分离。React 19 扩展支持异步 Actions。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useTransition的非紧急更新优先级

### 概念说明

React 18 引入了更新优先级的概念。在并发模式下，不同的状态更新被分配不同的优先级，React 调度器根据优先级决定处理顺序。通过 `startTransition` 包裹的更新被标记为"过渡"优先级（Transition Lane），属于非紧急更新，在调度队列中排在用户交互等紧急更新之后。

紧急更新（如输入、点击）需要立即反映到 UI 上，否则用户会感觉界面卡顿；非紧急更新（如搜索结果渲染、Tab 内容切换）可以稍后处理，不影响用户操作的流畅感。这种优先级区分是 React 并发渲染的核心机制。

### 基本示例

```tsx
// 示例说明：同一个事件中同时触发紧急更新和非紧急更新

import React, { useState, useTransition } from "react";

function PriorityDemo() {
    const [inputValue, setInputValue] = useState("");  // 紧急
    const [searchResults, setSearchResults] = useState<string[]>([]);  // 非紧急
    const [isPending, startTransition] = useTransition();

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const value = e.target.value;

        // 紧急更新：输入框立即响应用户输入
        // React 以最高优先级处理，确保输入流畅
        setInputValue(value);

        // 非紧急更新：搜索结果可以延迟
        // React 以 Transition 优先级处理，可被中断
        startTransition(() => {
            const results = performHeavySearch(value);
            setSearchResults(results);
        });
    }

    return (
        <div>
            <input value={inputValue} onChange={handleChange} placeholder="输入搜索词" />
            {isPending ? (
                <p style={{ color: "#999" }}>搜索中...</p>
            ) : (
                <ul>
                    {searchResults.slice(0, 50).map((r, i) => (
                        <li key={i}>{r}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}

// 模拟昂贵的搜索
function performHeavySearch(query: string): string[] {
    if (!query) return [];
    const results: string[] = [];
    for (let i = 0; i < 20000; i++) {
        if (`项目${i}`.includes(query)) {
            results.push(`项目${i}`);
        }
    }
    return results;
}

export default PriorityDemo;
```

**运行效果：** 快速输入时输入框始终流畅响应（紧急更新），搜索结果在输入空闲后才更新（非紧急更新）。

### 内部原理

#### React 的更新优先级体系（Lanes）

```
优先级从高到低：

SyncLane（同步）          → flushSync 中的更新
InputContinuousLane（连续输入）→ 鼠标拖拽、滚动
DefaultLane（默认）        → 普通 setState
TransitionLane（过渡）     → startTransition 中的更新
IdleLane（空闲）          → 最低优先级的更新

高优先级更新可以中断低优先级更新：
1. 用户输入 → 中断正在进行的过渡渲染
2. 过渡渲染重新开始（从中断点或从头）
3. 没有新的高优先级更新时，过渡渲染完成
```

#### 中断与恢复机制

```
时间线示例：

t1: startTransition(() => setFilter("abc"))
    → React 开始 Transition 优先级的渲染

t2: 渲染到一半，用户输入了新字符
    → setInputValue("x") 触发 Sync 优先级更新
    → 中断 Transition 渲染

t3: 处理 Sync 更新，输入框立即响应
    → 输入框显示新字符

t4: Sync 更新完成，恢复 Transition 渲染
    → 继续或重新开始过滤渲染

t5: Transition 渲染完成
    → isPending = false
    → 搜索结果显示
```

### 与相关API的对比

| 更新类型 | 优先级 | 可被中断 | 触发方式 |
|---------|--------|---------|---------|
| flushSync | 最高（同步） | 不可中断 | flushSync(() => setState()) |
| 用户交互 | 高 | 不可中断 | onClick、onChange 中的 setState |
| 默认更新 | 中 | 可被高优先级中断 | 普通 setState |
| 过渡更新 | 低 | 可被中断 | startTransition(() => setState()) |

### 适用场景

- **搜索输入 + 结果过滤：** 输入紧急，过滤非紧急
- **表单输入 + 表单验证：** 输入紧急，校验非紧急
- **滑块 + 图表更新：** 滑块拖拽紧急，图表重绘非紧急
- **导航 + 页面渲染：** URL 更新紧急，页面内容渲染非紧急

### 常见问题

#### 所有更新都用 startTransition 会怎样

**问题描述：** 是否应该将所有 setState 都放入 startTransition。

**解决方案：**

```tsx
// 不应该：用户交互的直接反馈必须是紧急更新
// 错误：输入框用 startTransition 会导致输入卡顿
// startTransition(() => setInputValue(e.target.value));

// 正确：只有不需要立即反映到 UI 的更新才用 startTransition
setInputValue(e.target.value);       // 紧急：输入框立即响应
startTransition(() => {
    setFilter(e.target.value);        // 非紧急：过滤延迟处理
});
```

### 注意事项

- 只有不需要立即反映到 UI 的更新才标记为过渡
- 用户交互的直接反馈（输入框、按钮状态）必须是紧急更新
- 过渡更新可以被任何紧急更新中断
- 需要 React 18+ 和 createRoot 才能使用并发特性
- 在传统模式（ReactDOM.render）下 startTransition 不会降低优先级

### 总结

React 18 通过 Lanes 机制区分更新优先级，startTransition 将更新标记为 Transition 优先级（非紧急），可被用户交互等紧急更新中断。这保证了用户操作的流畅性，同时让昂贵的渲染在空闲时完成。只有不需要立即反映到 UI 的更新才应标记为过渡，用户交互的直接反馈必须保持紧急优先级。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## React 19 Compiler的自动记忆化

### 概念说明

React Compiler（原名 React Forget）是 React 19 引入的编译时优化工具。它能在构建阶段自动分析组件代码，为组件的返回值、props 中的对象和函数自动添加记忆化（memoization），等同于自动帮开发者插入 `useMemo`、`useCallback` 和 `React.memo`。

这意味着开发者不再需要手动编写 useMemo、useCallback 来优化性能，Compiler 会在编译时自动完成这些工作。代码更简洁，同时性能不低于甚至优于手动优化的版本。

### 基本示例

```tsx
// 示例说明：Compiler 自动优化前后的对比

// ===== 手动优化（React 18 及之前）=====
import React, { useState, useMemo, useCallback, memo } from "react";

const MemoList = memo(function List({ items, onSelect }: {
    items: string[];
    onSelect: (item: string) => void;
}) {
    return (
        <ul>
            {items.map(item => (
                <li key={item} onClick={() => onSelect(item)}>{item}</li>
            ))}
        </ul>
    );
});

function AppManual() {
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState("");

    // 手动 useMemo
    const filtered = useMemo(
        () => allItems.filter(i => i.includes(query)),
        [query]
    );

    // 手动 useCallback
    const handleSelect = useCallback((item: string) => {
        setSelected(item);
    }, []);

    return (
        <div>
            <input value={query} onChange={e => setQuery(e.target.value)} />
            <p>选中: {selected}</p>
            <MemoList items={filtered} onSelect={handleSelect} />
        </div>
    );
}

// ===== React Compiler 自动优化（React 19）=====
// 开发者只需要写简单直白的代码
function AppWithCompiler() {
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState("");

    // 不需要 useMemo：Compiler 自动识别并缓存
    const filtered = allItems.filter(i => i.includes(query));

    // 不需要 useCallback：Compiler 自动稳定化函数引用
    const handleSelect = (item: string) => {
        setSelected(item);
    };

    // 不需要 React.memo：Compiler 自动处理子组件渲染跳过
    return (
        <div>
            <input value={query} onChange={e => setQuery(e.target.value)} />
            <p>选中: {selected}</p>
            <List items={filtered} onSelect={handleSelect} />
        </div>
    );
}

// 无需 memo 包裹
function List({ items, onSelect }: {
    items: string[];
    onSelect: (item: string) => void;
}) {
    return (
        <ul>
            {items.map(item => (
                <li key={item} onClick={() => onSelect(item)}>{item}</li>
            ))}
        </ul>
    );
}

const allItems = Array.from({ length: 1000 }, (_, i) => `项目${i}`);

export default AppWithCompiler;
```

**运行效果：** 两种写法的运行时性能相同。Compiler 版本代码更简洁，不需要手动管理记忆化。

### 内部原理

#### Compiler 的编译时分析

```
编译前（开发者写的代码）：
function App() {
    const [count, setCount] = useState(0);
    const items = data.filter(d => d.active);
    const onClick = () => setCount(c => c + 1);
    return <List items={items} onClick={onClick} />;
}

编译后（Compiler 生成的代码，概念性表示）：
function App() {
    const [count, setCount] = useState(0);
    const items = useMemo(() => data.filter(d => d.active), [data]);
    const onClick = useCallback(() => setCount(c => c + 1), []);
    return useMemo(() => <List items={items} onClick={onClick} />, [items, onClick]);
}

Compiler 自动分析依赖关系，插入最优的缓存策略
```

#### Compiler 的前提条件

Compiler 要求代码遵循 React 的规则（Rules of React）：

- 组件和 Hook 必须是纯函数（给定相同输入，产生相同输出）
- 不能直接修改 props、state、context
- Hook 调用必须在顶层
- 副作用必须在 useEffect 中

### 与相关API的对比

| 对比维度 | 手动记忆化 | React Compiler |
|----------|----------|---------------|
| 开发体验 | 需要手动管理 useMemo/useCallback/memo | 自动处理，代码更简洁 |
| 正确性 | 依赖开发者判断和 ESLint | 编译器自动分析，不会遗漏 |
| 粒度 | 开发者决定哪些值需要缓存 | 编译器分析所有可缓存的值 |
| 过度优化 | 开发者可能不必要地缓存 | 编译器只在需要时缓存 |
| 兼容性 | 所有 React 版本 | React 19+ |

### 适用场景

- **新项目：** 直接使用 React 19 + Compiler，不需要手动记忆化
- **迁移项目：** 逐步移除手动的 useMemo/useCallback/memo
- **团队开发：** 降低性能优化的心智负担

### 常见问题

#### 现有的 useMemo/useCallback 需要移除吗

**问题描述：** 项目升级到 React 19 后，手动写的记忆化代码怎么处理。

**解决方案：**

```tsx
// 不需要立即移除，Compiler 会识别已有的记忆化代码
// 手动的 useMemo/useCallback 和 Compiler 的自动优化可以共存
// 但新代码不再需要手动添加

// 逐步清理：
// 1. 升级到 React 19 并启用 Compiler
// 2. 新代码不再使用手动记忆化
// 3. 旧代码在重构时逐步移除 useMemo/useCallback/memo
```

### 注意事项

- React Compiler 需要 React 19 及以上版本
- 代码必须遵循 React 的规则（纯函数、不可变更新等）
- Compiler 是构建时工具，需要配置 Babel/SWC 插件
- 与现有的 useMemo/useCallback/memo 兼容，不需要立即移除
- 不规范的代码（副作用在渲染中、直接修改 state）可能导致 Compiler 无法优化
- eslint-plugin-react-compiler 可以检查代码是否符合 Compiler 要求

### 总结

React 19 Compiler 在编译时自动为组件添加记忆化，等同于自动插入 useMemo、useCallback 和 React.memo。开发者不再需要手动管理这些优化，代码更简洁且不会遗漏优化点。前提是代码必须遵循 React 的纯函数规则。与现有的手动记忆化代码兼容，可以逐步迁移。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Compiler的React Forget编译时优化

### 概念说明

React Forget 是 React Compiler 的内部代号，指的是 React 团队从 2021 年开始研发的编译时优化项目。"Forget"的含义是"忘记记忆化"——让开发者不再需要记住何时使用 useMemo、useCallback 和 React.memo，这些优化由编译器在构建时自动完成。

React Forget 的核心思路是：在编译阶段对组件代码进行静态分析，追踪每个变量的依赖关系，自动为计算结果和函数引用插入缓存逻辑。编译器生成的代码比手动优化更精确，因为它能分析每一行代码的数据流，不会遗漏也不会过度优化。

### 基本示例

```tsx
// 示例说明：展示 React Forget 编译前后的代码变化

// ===== 编译前：开发者写的普通代码 =====
function ProductPage({ productId, discount }: { productId: string; discount: number }) {
    const [quantity, setQuantity] = useState(1);

    // 普通计算：没有 useMemo
    const finalPrice = calculatePrice(productId, quantity, discount);

    // 普通函数：没有 useCallback
    const handleAdd = () => {
        setQuantity(q => q + 1);
    };

    // 普通 JSX：没有 memo
    return (
        <div>
            <p>价格: ¥{finalPrice}</p>
            <button onClick={handleAdd}>增加数量</button>
            <ProductDetail id={productId} />
        </div>
    );
}

function ProductDetail({ id }: { id: string }) {
    return <p>商品详情: {id}</p>;
}

// ===== 编译后：Compiler 生成的优化代码（概念性表示）=====
// 注意：实际编译输出会更复杂，这里简化展示核心思路
function ProductPage_compiled({ productId, discount }: { productId: string; discount: number }) {
    const [quantity, setQuantity] = useState(1);

    // Compiler 自动分析：finalPrice 依赖 productId, quantity, discount
    // 任一变化时重新计算，否则使用缓存
    const $ = useMemoCache(5);  // Compiler 使用内部缓存机制
    let finalPrice;
    if ($[0] !== productId || $[1] !== quantity || $[2] !== discount) {
        finalPrice = calculatePrice(productId, quantity, discount);
        $[0] = productId;
        $[1] = quantity;
        $[2] = discount;
        $[3] = finalPrice;
    } else {
        finalPrice = $[3];
    }

    // Compiler 自动分析：handleAdd 不依赖任何变化的值
    // 引用保持稳定
    let handleAdd;
    if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
        handleAdd = () => setQuantity(q => q + 1);
        $[4] = handleAdd;
    } else {
        handleAdd = $[4];
    }

    // JSX 也被自动缓存
    return (
        <div>
            <p>价格: ¥{finalPrice}</p>
            <button onClick={handleAdd}>增加数量</button>
            <ProductDetail id={productId} />
        </div>
    );
}

function calculatePrice(id: string, qty: number, discount: number) {
    return qty * 100 * (1 - discount);
}

import { useState } from "react";

export default ProductPage;
```

### 内部原理

#### Compiler 的编译流程

```
1. 解析阶段（Parse）
   → 将 JSX/TSX 代码解析为 AST

2. 分析阶段（Analyze）
   → 构建数据流图：追踪每个变量的来源和使用
   → 识别响应式值：props、state、context
   → 检测副作用：确保代码符合 React 规则

3. 优化阶段（Optimize）
   → 为每个表达式计算最小依赖集
   → 确定哪些值需要缓存
   → 生成缓存槽位分配方案

4. 代码生成（Codegen）
   → 插入 useMemoCache 调用
   → 生成条件缓存逻辑
   → 输出优化后的代码
```

#### useMemoCache 内部机制

```javascript
// Compiler 使用的内部 API（非公开）
function useMemoCache(size) {
    // 在 Fiber 节点上分配固定大小的缓存数组
    const fiber = getCurrentFiber();
    if (fiber.memoCache === null) {
        fiber.memoCache = new Array(size).fill(SENTINEL);
    }
    return fiber.memoCache;
}

// 每个缓存槽位存储一个值
// 通过比较依赖值决定是否使用缓存
// 比 useMemo 更细粒度：每个表达式独立缓存
```

### 与相关API的对比

| 对比维度 | 手动 useMemo/useCallback | React Compiler |
|----------|------------------------|---------------|
| 优化粒度 | 开发者决定 | 每个表达式级别 |
| 遗漏风险 | 高（人工判断） | 无（自动分析） |
| 过度优化 | 可能（不必要的缓存） | 不会（精确分析依赖） |
| 代码可读性 | 被缓存逻辑污染 | 保持简洁 |
| 配置复杂度 | 无需配置 | 需要配置构建插件 |
| 调试难度 | 直接看源码 | 需要查看编译输出 |

### 适用场景

- **所有 React 19 项目：** 启用 Compiler 获得自动优化
- **大型应用：** 组件多、数据流复杂，手动优化容易遗漏
- **团队开发：** 统一优化标准，降低代码审查中的性能讨论

### 常见问题

#### 如何启用 React Compiler

**解决方案：**

```javascript
// babel.config.js
module.exports = {
    plugins: [
        ["babel-plugin-react-compiler", {
            // 可选配置
            // runtimeModule: "react-compiler-runtime",
        }],
    ],
};

// 或在 Next.js 中
// next.config.js
const nextConfig = {
    experimental: {
        reactCompiler: true,
    },
};
module.exports = nextConfig;
```

#### Compiler 无法优化的代码

**问题描述：** 某些代码模式 Compiler 无法自动优化。

**解决方案：**

```tsx
// Compiler 无法优化的代码：违反 React 规则
// 1. 渲染期间的副作用
function Bad() {
    document.title = "标题";  // 副作用不在 useEffect 中
    return <div />;
}

// 2. 直接修改 state/props
function Bad2({ items }: { items: number[] }) {
    items.sort();  // 直接修改 props
    return <ul>{items.map(i => <li key={i}>{i}</li>)}</ul>;
}

// 正确：遵循 React 规则
function Good({ items }: { items: number[] }) {
    const sorted = [...items].sort();  // 创建新数组
    return <ul>{sorted.map(i => <li key={i}>{i}</li>)}</ul>;
}
```

### 注意事项

- React Compiler 需要 React 19+ 和构建工具插件
- 代码必须遵循 React 的纯函数规则才能被优化
- 使用 eslint-plugin-react-compiler 检查代码兼容性
- Compiler 与手动的 useMemo/useCallback 兼容共存
- 编译输出的代码可以通过 React DevTools 查看优化效果
- 不规范的代码不会报错，但不会被优化

### 总结

React Forget（React Compiler）是编译时优化工具，通过静态分析自动为组件代码添加记忆化。它追踪每个变量的依赖关系，在表达式级别精确缓存，比手动 useMemo/useCallback 更细粒度且不会遗漏。代码必须遵循 React 的纯函数规则。通过 Babel 或构建工具插件启用，与现有代码兼容。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。



## 6.5 Refs与DOM操作

## useRef的可变引用容器

### 概念说明

`useRef` 是 React 提供的一个 Hook，用于创建一个可变的引用容器。它返回一个普通的 JavaScript 对象 `{ current: initialValue }`，这个对象在组件的整个生命周期内保持同一引用。与 useState 不同，修改 useRef 的 current 属性不会触发组件重新渲染。

useRef 的两个主要用途：一是保存对 DOM 元素的引用，二是在渲染之间保存任意可变数据（如定时器 ID、上一次的值、计数器等），类似于类组件中的实例属性。

### API 签名与参数

```typescript
function useRef<T>(initialValue: T): MutableRefObject<T>;
function useRef<T>(initialValue: T | null): RefObject<T>;

interface MutableRefObject<T> {
    current: T;
}
```

| 参数 | 类型 | 是否必填 | 说明 |
|------|------|----------|------|
| initialValue | T | 是 | current 的初始值 |

**返回值：** `{ current: initialValue }` 对象，引用在组件生命周期内不变。

### 基本示例

```tsx
// 示例说明：useRef 作为可变数据容器的各种用途

import React, { useState, useRef, useEffect } from "react";

function RefContainerDemo() {
    const [count, setCount] = useState(0);

    // 用途1：保存定时器 ID
    const timerRef = useRef<number | null>(null);

    // 用途2：保存上一次的值
    const prevCountRef = useRef<number>(0);

    // 用途3：保存渲染次数（不触发重渲染）
    const renderCountRef = useRef(0);
    renderCountRef.current++;  // 每次渲染递增，不会触发重渲染

    // 记录上一次的 count 值
    useEffect(() => {
        prevCountRef.current = count;
    }, [count]);

    // 启动定时器
    const startTimer = () => {
        if (timerRef.current !== null) return;  // 防止重复启动
        timerRef.current = window.setInterval(() => {
            setCount(c => c + 1);
        }, 1000);
    };

    // 停止定时器
    const stopTimer = () => {
        if (timerRef.current !== null) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    // 组件卸载时清理
    useEffect(() => {
        return () => stopTimer();
    }, []);

    return (
        <div>
            <p>当前值: {count}，上一次值: {prevCountRef.current}</p>
            <p>渲染次数: {renderCountRef.current}</p>
            <button onClick={startTimer}>开始</button>
            <button onClick={stopTimer}>停止</button>
        </div>
    );
}

export default RefContainerDemo;
```

**运行效果：** 点击"开始"后每秒计数加1，"停止"清除定时器。渲染次数记录在 ref 中，不会触发额外渲染。

### 内部原理

#### useRef 的实现

```javascript
// React 内部简化逻辑
function mountRef(initialValue) {
    const hook = mountWorkInProgressHook();
    const ref = { current: initialValue };  // 创建普通对象
    hook.memoizedState = ref;  // 存储在 Fiber 节点上
    return ref;
}

function updateRef() {
    const hook = updateWorkInProgressHook();
    return hook.memoizedState;  // 直接返回同一个对象，不做任何比较
}
// 关键：updateRef 不会触发重渲染，因为它不调用 setState
```

### 与相关API的对比

| 对比维度 | useRef | useState |
|----------|--------|---------|
| 修改是否触发重渲染 | 否 | 是 |
| 值的持久性 | 跨渲染保持 | 跨渲染保持 |
| 读取时机 | 任何时候 | 渲染期间 |
| 适用数据 | 不影响 UI 的可变数据 | 驱动 UI 渲染的数据 |

### 适用场景

- **定时器管理：** 保存 setInterval/setTimeout 的 ID
- **上一次值记录：** 保存 props 或 state 的前一个值
- **渲染计数：** 统计组件渲染次数
- **外部库实例：** 保存第三方库的实例（图表、地图等）
- **闭包中读取最新值：** 在异步回调中通过 ref 读取最新的 state

### 常见问题

#### 渲染期间读取 ref.current 显示旧值

**问题描述：** 在 JSX 中直接显示 ref.current，发现显示的是旧值。

**原因分析：** 修改 ref.current 不触发重渲染，JSX 中的值不会更新。

**解决方案：**

```tsx
// ref.current 的修改不会更新 UI
// 如果需要显示在 UI 中，应该用 useState
const [count, setCount] = useState(0);  // UI 需要的值用 state
const countRef = useRef(0);  // 不需要显示的值用 ref
```

### 注意事项

- 修改 ref.current 不会触发重渲染
- ref 对象引用在组件生命周期内保持不变
- 不要在渲染期间读写 ref.current（可能导致不可预测的行为）
- 需要驱动 UI 更新的数据应该用 useState 而不是 useRef
- useRef 的初始值只在首次渲染时使用

### 总结

useRef 创建一个 `{ current: value }` 可变容器，引用在组件生命周期内不变，修改 current 不触发重渲染。适用于保存定时器 ID、上一次的值、渲染计数等不影响 UI 的可变数据。需要驱动 UI 更新的数据应使用 useState。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useRef的current属性访问

### 概念说明

useRef 返回的对象只有一个属性 `current`，所有的读写操作都通过 current 进行。current 可以存储任意类型的值，包括基本值、对象、DOM 元素、函数等。与 useState 不同，对 current 的读写是同步的、即时的，不需要等待下一次渲染。

current 属性的特点是：读取时总是获得最新赋值的值（不存在闭包陷阱），写入时不触发重渲染。这使得 ref 成为在异步回调、定时器、事件处理器中读取最新值的理想选择。

### 基本示例

```tsx
// 示例说明：current 的读写操作和同步特性

import React, { useState, useRef, useEffect } from "react";

function CurrentAccessDemo() {
    const [count, setCount] = useState(0);
    const countRef = useRef(count);

    // 每次渲染同步最新值到 ref
    countRef.current = count;

    // 异步回调中通过 ref 读取最新值
    const handleDelayedLog = () => {
        setTimeout(() => {
            // ref.current 始终是最新值
            console.log("ref.current:", countRef.current);
            // 闭包中的 count 是点击时的旧值
            console.log("闭包 count:", count);
        }, 3000);
    };

    return (
        <div>
            <p>count: {count}</p>
            <button onClick={() => setCount(c => c + 1)}>+1</button>
            <button onClick={handleDelayedLog}>3秒后打印</button>
        </div>
    );
}

export default CurrentAccessDemo;
```

**运行效果：** 点击"3秒后打印"后快速点击+1，3秒后 ref.current 显示最新值，闭包中的 count 显示旧值。

### 内部原理

#### current 的同步读写

```javascript
// ref 就是一个普通的 JavaScript 对象
const ref = { current: initialValue };

// 写入是同步的
ref.current = newValue;  // 立即生效

// 读取也是同步的
const value = ref.current;  // 立即得到最新值

// 不像 setState 需要等到下一次渲染
// 不像 useState 的值在当前渲染周期内是固定的
```

### 与相关API的对比

| 对比维度 | ref.current | state |
|----------|------------|-------|
| 写入后立即可读 | 是 | 否（需要下一次渲染） |
| 闭包中的值 | 最新值（通过 ref 间接访问） | 创建闭包时的值 |
| 修改触发渲染 | 否 | 是 |
| TypeScript 类型 | 可变（MutableRefObject） | 只读（通过 setState 修改） |

### 适用场景

- **避免闭包陷阱：** 在 setTimeout/setInterval 中读取最新 state
- **跨渲染共享数据：** 在不同渲染周期间传递数据
- **DOM 访问：** 通过 ref.current 访问 DOM 元素的属性和方法

### 常见问题

#### 在渲染期间读写 ref.current 的风险

**问题描述：** 在组件函数体中（渲染期间）读取 ref.current 可能得到不一致的值。

**解决方案：**

```tsx
// 写入：在渲染期间写入 ref 是安全的（同步值）
function Component() {
    const ref = useRef(0);
    ref.current = someValue;  // 安全：同步写入

    // 读取：渲染期间读取要注意
    // ref.current 可能在并发渲染中被其他渲染打断修改
    // 最好在 useEffect 或事件处理器中读取
    useEffect(() => {
        console.log(ref.current);  // 安全：在 effect 中读取
    });

    return <div />;
}
```

### 注意事项

- ref.current 的读写是同步的、即时的
- 通过 ref 可以在异步回调中读取最新值，避免闭包陷阱
- 渲染期间写入 ref.current 是安全的
- 渲染期间读取 ref.current 在并发模式下要谨慎
- ref.current 的类型可以是 T 或 T | null（取决于初始值）

### 总结

useRef 的 current 属性支持同步读写，写入立即生效，读取获得最新值。这使得 ref 成为避免闭包陷阱的有效手段——在异步回调中通过 ref.current 读取最新的 state。渲染期间写入安全，但读取在并发模式下需要注意。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useRef的DOM元素引用绑定

### 概念说明

useRef 最常见的用途是获取 DOM 元素的引用。将 useRef 创建的 ref 对象通过 JSX 的 `ref` 属性绑定到 DOM 元素上，React 会在元素挂载后将真实 DOM 节点赋值给 `ref.current`，在元素卸载后将其设为 `null`。通过 ref.current 可以直接调用 DOM API，如 focus()、scrollIntoView()、getBoundingClientRect() 等。

### API 签名与参数

```typescript
// 创建 ref
const inputRef = useRef<HTMLInputElement>(null);

// 绑定到 DOM 元素
<input ref={inputRef} />

// 访问 DOM 元素
inputRef.current?.focus();
```

### 基本示例

```tsx
// 示例说明：通过 ref 操作 DOM 元素

import React, { useRef, useEffect } from "react";

function DOMRefDemo() {
    const inputRef = useRef<HTMLInputElement>(null);
    const divRef = useRef<HTMLDivElement>(null);

    // 挂载后自动聚焦输入框
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // 滚动到指定元素
    const scrollToDiv = () => {
        divRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // 获取元素尺寸
    const logSize = () => {
        if (divRef.current) {
            const rect = divRef.current.getBoundingClientRect();
            console.log(`宽: ${rect.width}, 高: ${rect.height}`);
        }
    };

    return (
        <div>
            <input ref={inputRef} placeholder="自动聚焦" />
            <button onClick={scrollToDiv}>滚动到底部</button>
            <button onClick={logSize}>打印尺寸</button>

            <div style={{ height: 1000 }} />
            <div ref={divRef} style={{ padding: 20, background: "#eee" }}>
                目标元素
            </div>
        </div>
    );
}

export default DOMRefDemo;
```

**运行效果：** 页面加载后输入框自动获得焦点。点击"滚动到底部"平滑滚动到目标元素。点击"打印尺寸"在控制台输出元素的宽高。

### 内部原理

#### React 如何赋值 ref.current

```
组件挂载阶段：
1. React 创建真实 DOM 节点
2. 将 DOM 节点插入页面
3. 将 DOM 节点赋值给 ref.current
   → ref.current = domNode

组件卸载阶段：
1. 将 DOM 节点从页面移除
2. 将 ref.current 设为 null
   → ref.current = null
```

### 适用场景

- **焦点管理：** 自动聚焦、条件聚焦
- **滚动控制：** scrollIntoView、scrollTo
- **尺寸测量：** getBoundingClientRect
- **Canvas 操作：** 获取 canvas 上下文
- **视频/音频控制：** play()、pause()
- **第三方库集成：** 将 DOM 节点传给非 React 库

### 常见问题

#### ref.current 在渲染期间为 null

**问题描述：** 在组件函数体中直接访问 ref.current 得到 null。

**原因分析：** 渲染期间 DOM 还没有创建或更新，ref.current 尚未被赋值。

**解决方案：**

```tsx
// 错误：渲染期间 ref 还没绑定
// const width = inputRef.current.offsetWidth;  // null

// 正确：在 useEffect 或事件处理器中访问
useEffect(() => {
    const width = inputRef.current?.offsetWidth;
    console.log(width);
}, []);

const handleClick = () => {
    inputRef.current?.focus();  // 事件处理器中 ref 已绑定
};
```

### 注意事项

- ref.current 在 DOM 挂载后才有值，渲染期间可能为 null
- 在 useEffect 或事件处理器中访问 ref.current
- TypeScript 中初始值用 null，类型为 `useRef<HTMLElement>(null)`
- 条件渲染的元素在隐藏时 ref.current 为 null
- 不要在渲染期间读取 ref.current 来决定渲染输出

### 总结

useRef 通过 JSX 的 ref 属性绑定 DOM 元素，挂载后 ref.current 指向真实 DOM 节点，卸载后为 null。通过 ref.current 可以调用 focus()、scrollIntoView()、getBoundingClientRect() 等 DOM API。必须在 useEffect 或事件处理器中访问，渲染期间 ref 可能未绑定。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useRef的跨渲染周期持久化

### 概念说明

useRef 创建的 ref 对象在组件的整个生命周期内保持同一引用，不会因为组件重新渲染而被重新创建。这意味着存储在 ref.current 中的数据可以跨越多次渲染周期持久存在，且修改它不会触发渲染。

这个特性使得 useRef 成为存储"不参与渲染但需要跨渲染保持"的数据的最佳选择。典型例子包括：记录前一次的 props/state 值、追踪组件是否已挂载、保存异步操作的标识等。

### 基本示例

```tsx
// 示例说明：利用 ref 的跨渲染持久化特性实现多种功能

import React, { useState, useRef, useEffect } from "react";

// 自定义 Hook：获取前一次的值
function usePrevious<T>(value: T): T | undefined {
    const ref = useRef<T | undefined>(undefined);

    useEffect(() => {
        ref.current = value;  // 渲染后更新为当前值
    }, [value]);

    return ref.current;  // 返回上一次渲染时保存的值
}

// 自定义 Hook：追踪是否首次渲染
function useIsFirstRender(): boolean {
    const isFirst = useRef(true);

    if (isFirst.current) {
        isFirst.current = false;
        return true;
    }
    return false;
}

function PersistenceDemo() {
    const [count, setCount] = useState(0);
    const [name, setName] = useState("张三");

    const prevCount = usePrevious(count);
    const isFirstRender = useIsFirstRender();

    // 追踪组件是否已挂载（用于异步回调中检查）
    const isMounted = useRef(true);
    useEffect(() => {
        return () => { isMounted.current = false; };
    }, []);

    const handleAsyncAction = () => {
        setTimeout(() => {
            if (isMounted.current) {
                setCount(c => c + 10);
            }
        }, 2000);
    };

    return (
        <div>
            <p>当前: {count}，上一次: {prevCount ?? "无"}</p>
            <p>首次渲染: {isFirstRender ? "是" : "否"}</p>
            <button onClick={() => setCount(c => c + 1)}>+1</button>
            <button onClick={handleAsyncAction}>2秒后+10</button>
        </div>
    );
}

export default PersistenceDemo;
```

**运行效果：** prevCount 始终显示上一次的 count 值。首次渲染时 isFirstRender 为 true，之后为 false。异步操作会检查组件是否仍挂载。

### 内部原理

#### ref 在 Fiber 节点上的存储

```javascript
// useRef 的值存储在 Fiber 节点的 hook 链表中
// 与 useState 存储在相同位置，但不参与更新调度

FiberNode {
    memoizedState: {
        // Hook 1: useState
        memoizedState: 0,  // count 的值
        queue: updateQueue,  // 更新队列
        next: {
            // Hook 2: useRef
            memoizedState: { current: value },  // ref 对象
            // 没有 queue：修改 current 不触发更新
            next: null
        }
    }
}
```

### 与相关API的对比

| 对比维度 | useRef | useState | 局部变量 |
|----------|--------|---------|---------|
| 跨渲染持久 | 是 | 是 | 否（每次重新创建） |
| 修改触发渲染 | 否 | 是 | 不适用 |
| 适合存储 | 不影响UI的数据 | 驱动UI的数据 | 临时计算值 |

### 适用场景

- **记录前一次值：** usePrevious 自定义 Hook
- **首次渲染判断：** 区分首次渲染和后续更新
- **挂载状态追踪：** 异步回调中检查组件是否卸载
- **累积值：** 不需要显示的累计计数器
- **外部库实例：** 保存图表、地图等实例跨渲染存在

### 注意事项

- ref.current 的值在组件整个生命周期内持久存在
- 组件卸载后 ref 对象被垃圾回收
- 不要用 ref 替代 state 来驱动 UI 更新
- ref 的持久化特性使其成为避免闭包陷阱的有效工具
- useRef 的初始值只在首次渲染时使用

### 总结

useRef 的 ref 对象在组件生命周期内引用不变，current 值跨渲染周期持久化且修改不触发渲染。适用于记录前一次值、判断首次渲染、追踪挂载状态等场景。与 useState 的区别在于：ref 存储不影响 UI 的可变数据，state 存储驱动 UI 渲染的数据。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useRef与createRef的类组件差异

### 概念说明

`useRef` 和 `React.createRef` 都用于创建 ref 对象，但它们的使用场景和行为有本质区别。`createRef` 是为类组件设计的，每次调用都创建一个全新的 ref 对象；`useRef` 是为函数组件设计的 Hook，在组件的整个生命周期内只创建一次 ref 对象，后续渲染返回同一引用。

如果在函数组件中使用 createRef，每次渲染都会创建新的 ref 对象，之前保存在 ref.current 中的值会丢失。这就是函数组件中必须使用 useRef 而不是 createRef 的原因。

### 基本示例

```tsx
// 示例说明：对比 useRef 和 createRef 在函数组件中的行为

import React, { useState, useRef, createRef } from "react";

function CompareDemo() {
    const [count, setCount] = useState(0);

    // useRef：只在首次渲染时创建，后续返回同一引用
    const stableRef = useRef(0);

    // createRef：每次渲染都创建新的 ref 对象
    const unstableRef = createRef<number>();

    // 每次渲染 stableRef 保持之前的值
    // 每次渲染 unstableRef.current 是 null（新创建的）
    console.log("useRef.current:", stableRef.current);      // 保持上次赋值
    console.log("createRef.current:", unstableRef.current);  // 始终是 null

    const handleClick = () => {
        stableRef.current = count;
        // unstableRef 赋值后在下次渲染会丢失
        setCount(c => c + 1);
    };

    return (
        <div>
            <p>count: {count}</p>
            <p>useRef 保存的值: {stableRef.current}</p>
            <button onClick={handleClick}>+1 并保存</button>
        </div>
    );
}

// 类组件中使用 createRef
class ClassComponent extends React.Component<{}, { count: number }> {
    // 在类组件中，createRef 在构造函数中调用一次
    // 实例属性在组件生命周期内持久存在
    inputRef = createRef<HTMLInputElement>();

    state = { count: 0 };

    componentDidMount() {
        this.inputRef.current?.focus();
    }

    render() {
        return (
            <div>
                <input ref={this.inputRef} />
                <p>{this.state.count}</p>
            </div>
        );
    }
}

export default CompareDemo;
```

### 与相关API的对比

| 对比维度 | useRef | createRef |
|----------|--------|-----------|
| 适用场景 | 函数组件 | 类组件 |
| 创建时机 | 首次渲染时创建一次 | 每次调用都创建新对象 |
| 跨渲染持久 | 是 | 类组件中是（实例属性），函数组件中否 |
| 初始值参数 | 支持 | 不支持（始终为 null） |
| 返回类型 | MutableRefObject | RefObject |

### 常见问题

#### 在函数组件中误用 createRef

**问题描述：** 在函数组件中用 createRef 保存数据，每次渲染数据丢失。

**解决方案：**

```tsx
// 错误：函数组件中用 createRef
function Bad() {
    const ref = createRef();  // 每次渲染新对象，current 为 null
    // ref.current 永远拿不到之前保存的值
}

// 正确：函数组件中用 useRef
function Good() {
    const ref = useRef(null);  // 只创建一次，跨渲染持久
}
```

### 注意事项

- 函数组件中必须使用 useRef，不要使用 createRef
- 类组件中使用 createRef（在构造函数或类属性中）
- useRef 支持初始值参数，createRef 不支持
- 类组件迁移到函数组件时，将 createRef 替换为 useRef

### 总结

useRef 为函数组件设计，首次渲染创建一次，跨渲染持久化；createRef 为类组件设计，每次调用创建新对象。函数组件中必须用 useRef，否则每次渲染数据丢失。类组件迁移到函数组件时需要将 createRef 替换为 useRef。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## ref回调函数的赋值时机(DOM挂载时)

### 概念说明

除了传递 ref 对象，React 还支持将一个回调函数作为 `ref` 属性的值。当 DOM 元素挂载到页面时，React 会调用这个回调函数，并将真实的 DOM 节点作为参数传入。这种方式被称为"回调 ref"（Callback Ref），比 ref 对象提供了更精细的控制能力。

回调 ref 的赋值时机是在 Commit 阶段的 Layout 子阶段，即 DOM 节点已经插入页面之后、useLayoutEffect 执行的同一时机。此时可以安全地读取 DOM 节点的尺寸和位置。

### 基本示例

```tsx
// 示例说明：回调 ref 的基本用法和赋值时机

import React, { useState, useCallback } from "react";

function CallbackRefDemo() {
    const [height, setHeight] = useState(0);

    // 回调 ref：DOM 挂载时被调用，参数是 DOM 节点
    const measureRef = useCallback((node: HTMLDivElement | null) => {
        if (node !== null) {
            // DOM 挂载时执行：node 是真实的 DOM 元素
            console.log("DOM 挂载，元素:", node);
            const rect = node.getBoundingClientRect();
            setHeight(rect.height);
        }
    }, []);

    return (
        <div>
            <div ref={measureRef} style={{ padding: 20, background: "#f0f0f0" }}>
                <p>这是一段内容</p>
                <p>用于测量高度</p>
            </div>
            <p>元素高度: {height}px</p>
        </div>
    );
}

// 动态列表中使用回调 ref
function DynamicListRef() {
    const [items, setItems] = useState(["苹果", "香蕉"]);
    const [lastItemHeight, setLastItemHeight] = useState(0);

    // 最后一个列表项的回调 ref
    const lastItemRef = useCallback((node: HTMLLIElement | null) => {
        if (node) {
            setLastItemHeight(node.offsetHeight);
            // 自动滚动到最新项
            node.scrollIntoView({ behavior: "smooth" });
        }
    }, []);

    const addItem = () => {
        setItems(prev => [...prev, `项目${prev.length + 1}`]);
    };

    return (
        <div>
            <button onClick={addItem}>添加项目</button>
            <p>最后一项高度: {lastItemHeight}px</p>
            <ul>
                {items.map((item, i) => (
                    <li
                        key={item}
                        ref={i === items.length - 1 ? lastItemRef : undefined}
                    >
                        {item}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default CallbackRefDemo;
```

**运行效果：** 组件挂载后自动测量元素高度并显示。添加项目时自动滚动到最新项。

### 内部原理

#### 回调 ref 的执行时机

```
React 渲染流程中回调 ref 的位置：

1. Render 阶段：组件函数执行，生成虚拟 DOM
2. Commit - Mutation 子阶段：DOM 节点插入/更新/删除
3. Commit - Layout 子阶段：
   → 回调 ref 被调用（node 参数是真实 DOM）
   → useLayoutEffect 执行
4. 浏览器绘制
5. useEffect 执行
```

### 与相关API的对比

| 对比维度 | ref 对象 (useRef) | 回调 ref |
|----------|------------------|---------|
| 赋值方式 | React 自动赋值 ref.current | React 调用回调函数 |
| 控制粒度 | 只能获取 DOM 引用 | 可以在获取时执行自定义逻辑 |
| 条件渲染 | 需要手动检查 null | 回调参数为 null 时表示卸载 |
| 动态绑定 | 固定绑定一个元素 | 可以动态绑定不同元素 |

### 适用场景

- **DOM 测量：** 挂载后立即测量元素尺寸
- **动态列表：** 对列表中特定元素绑定 ref
- **条件渲染：** 元素出现时执行操作
- **第三方库集成：** DOM 挂载后初始化第三方库

### 常见问题

#### 回调 ref 在每次渲染时都被调用

**问题描述：** 内联回调 ref 在每次渲染时都执行两次（先 null 再 node）。

**原因分析：** 内联函数每次渲染都是新引用，React 先用 null 清理旧回调，再用 node 调用新回调。

**解决方案：**

```tsx
// 问题：内联回调每次渲染都执行
// <div ref={(node) => { ... }} />

// 方案：用 useCallback 稳定化回调
const callbackRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
        // 只在 DOM 挂载时执行
    }
}, []);
// <div ref={callbackRef} />
```

### 注意事项

- 回调 ref 在 DOM 挂载后的 Layout 阶段被调用
- 内联回调 ref 每次渲染会先收到 null 再收到 node
- 用 useCallback 包裹回调 ref 避免不必要的重复调用
- 回调 ref 比 ref 对象更灵活，适合需要在赋值时执行逻辑的场景
- React 19 支持回调 ref 返回清理函数

### 总结

回调 ref 在 DOM 挂载后被调用，参数是真实 DOM 节点。比 ref 对象更灵活，可以在赋值时执行自定义逻辑（如测量尺寸、初始化库）。内联回调每次渲染会重复调用，用 useCallback 稳定化可避免。适用于动态列表、条件渲染等需要精细控制的场景。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## ref回调函数的清理时机(DOM卸载时)

### 概念说明

当使用回调 ref 绑定的 DOM 元素被卸载（从页面中移除）时，React 会再次调用该回调函数，但这次传入的参数是 `null`。这个 null 调用就是回调 ref 的"清理时机"，可以用来执行清理操作，比如取消事件监听、销毁第三方库实例等。

在 React 19 中，回调 ref 获得了一个新特性：可以返回一个清理函数，类似于 useEffect 的清理函数。DOM 卸载时 React 会调用这个返回的清理函数，而不再用 null 参数调用回调本身。这让清理逻辑更加直观。

### 基本示例

```tsx
// 示例说明：回调 ref 在 DOM 卸载时的清理行为

import React, { useState, useCallback } from "react";

function CleanupRefDemo() {
    const [showBox, setShowBox] = useState(true);

    // 回调 ref：挂载时收到 node，卸载时收到 null
    const boxRef = useCallback((node: HTMLDivElement | null) => {
        if (node !== null) {
            // DOM 挂载：执行初始化
            console.log("挂载：初始化 ResizeObserver");
            const observer = new ResizeObserver(entries => {
                for (const entry of entries) {
                    console.log("尺寸变化:", entry.contentRect.width);
                }
            });
            observer.observe(node);

            // 将 observer 存储在 DOM 节点上，卸载时使用
            (node as any).__observer = observer;
        } else {
            // DOM 卸载：执行清理
            // 注意：此时无法直接访问之前的 node
            // 需要通过其他方式（如闭包或存储）获取需要清理的资源
            console.log("卸载：回调收到 null");
        }
    }, []);

    return (
        <div>
            <button onClick={() => setShowBox(s => !s)}>
                {showBox ? "隐藏" : "显示"}
            </button>
            {showBox && (
                <div ref={boxRef} style={{ width: 200, height: 100, background: "#eee" }}>
                    可调整大小的盒子
                </div>
            )}
        </div>
    );
}

// React 19 的新方式：回调 ref 返回清理函数
function CleanupRefReact19() {
    const [showBox, setShowBox] = useState(true);

    // React 19：回调 ref 可以返回清理函数
    const boxRef = useCallback((node: HTMLDivElement) => {
        console.log("挂载：初始化");
        const observer = new ResizeObserver(entries => {
            console.log("尺寸变化");
        });
        observer.observe(node);

        // 返回清理函数：DOM 卸载时自动调用
        return () => {
            console.log("卸载：清理 ResizeObserver");
            observer.disconnect();
        };
    }, []);

    return (
        <div>
            <button onClick={() => setShowBox(s => !s)}>切换</button>
            {showBox && <div ref={boxRef} style={{ width: 200, height: 100 }}>盒子</div>}
        </div>
    );
}

export default CleanupRefDemo;
```

**运行效果：** 点击隐藏按钮时，回调 ref 收到 null（React 18）或执行返回的清理函数（React 19），ResizeObserver 被正确断开。

### 内部原理

#### 回调 ref 的完整生命周期

```
React 18 的回调 ref 生命周期：

挂载时：callbackRef(domNode)    → 参数是 DOM 节点
更新时（回调引用变了）：
  1. callbackRef_old(null)      → 先用 null 清理旧回调
  2. callbackRef_new(domNode)   → 再用 node 调用新回调
卸载时：callbackRef(null)       → 参数是 null

React 19 的回调 ref 生命周期：

挂载时：cleanup = callbackRef(domNode)  → 保存返回的清理函数
卸载时：cleanup()                        → 调用清理函数
```

### 与相关API的对比

| 清理方式 | React 18 回调 ref | React 19 回调 ref |
|----------|------------------|------------------|
| 清理触发 | 回调被 null 参数调用 | 返回的清理函数被调用 |
| 访问 DOM 节点 | 无法直接访问（参数是 null） | 通过闭包访问（清理函数中） |
| 代码直观性 | 需要 if/else 判断 | 类似 useEffect 的模式 |

### 适用场景

- **ResizeObserver 清理：** 观察元素尺寸后在卸载时断开
- **IntersectionObserver 清理：** 观察元素可见性后断开
- **第三方库销毁：** 初始化后在卸载时销毁实例
- **事件监听清理：** 在 DOM 节点上添加的原生事件监听

### 常见问题

#### 卸载时无法访问之前的 DOM 节点

**问题描述：** React 18 中回调 ref 收到 null 时，如何清理之前对 DOM 节点的操作。

**解决方案：**

```tsx
// 方案1：通过闭包保存引用（React 18）
const boxRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
        const observer = new ResizeObserver(() => {});
        observer.observe(node);

        // 保存到外部变量，卸载时使用
        currentObserver = observer;
    } else {
        // 卸载时通过外部变量清理
        currentObserver?.disconnect();
        currentObserver = null;
    }
}, []);

// 方案2：升级到 React 19，使用返回清理函数
const boxRef = useCallback((node: HTMLDivElement) => {
    const observer = new ResizeObserver(() => {});
    observer.observe(node);
    return () => observer.disconnect();  // 闭包中可以访问 node 和 observer
}, []);
```

### 注意事项

- React 18 中卸载时回调收到 null，无法直接访问 DOM 节点
- React 19 支持返回清理函数，通过闭包可以访问 DOM 节点和资源
- 内联回调每次渲染都会触发 null + node 调用（用 useCallback 避免）
- 清理时机与 useLayoutEffect 的清理时机相同
- 忘记清理会导致内存泄漏

### 总结

回调 ref 在 DOM 卸载时被 null 参数调用（React 18）或执行返回的清理函数（React 19）。React 19 的返回清理函数模式更直观，通过闭包可以访问 DOM 节点和初始化的资源。忘记清理会导致内存泄漏。用 useCallback 稳定化回调 ref 避免不必要的清理和重新初始化。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## forwardRef的ref转发机制

### 概念说明

默认情况下，函数组件不接受 `ref` 属性。如果父组件想要获取子组件内部某个 DOM 元素的引用，需要使用 `React.forwardRef` 将 ref 从父组件"转发"到子组件内部的 DOM 元素上。

forwardRef 接收一个渲染函数，该函数除了常规的 props 参数外，还接收第二个参数 ref，开发者可以将这个 ref 绑定到子组件内部的任意 DOM 元素上。这样父组件就能通过 ref 直接访问子组件内部的 DOM 节点。

在 React 19 中，ref 可以直接作为 props 传递，不再需要 forwardRef 包裹。

### API 签名与参数

```typescript
// React 18 及之前
const ForwardedComponent = React.forwardRef<RefType, PropsType>(
    (props, ref) => {
        return <element ref={ref} />;
    }
);

// React 19：ref 直接作为 props
function Component({ ref, ...props }: { ref: React.Ref<RefType> } & PropsType) {
    return <element ref={ref} />;
}
```

### 基本示例

```tsx
// 示例说明：使用 forwardRef 让父组件访问子组件的 DOM

import React, { useRef, forwardRef } from "react";

// 自定义输入框组件：通过 forwardRef 转发 ref
const CustomInput = forwardRef<HTMLInputElement, { label: string }>(
    function CustomInput({ label }, ref) {
        return (
            <div>
                <label>{label}</label>
                {/* 将父组件传来的 ref 绑定到内部的 input 元素 */}
                <input ref={ref} style={{ border: "2px solid #333", padding: 8 }} />
            </div>
        );
    }
);

// 父组件：通过 ref 操作子组件内部的 input
function Form() {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFocus = () => {
        // 直接操作子组件内部的 input DOM 元素
        inputRef.current?.focus();
    };

    const handleClear = () => {
        if (inputRef.current) {
            inputRef.current.value = "";
            inputRef.current.focus();
        }
    };

    return (
        <div>
            <CustomInput ref={inputRef} label="用户名" />
            <button onClick={handleFocus}>聚焦</button>
            <button onClick={handleClear}>清空</button>
        </div>
    );
}

export default Form;
```

**运行效果：** 点击"聚焦"按钮，子组件内部的 input 获得焦点。点击"清空"按钮，input 内容被清空并获得焦点。

### 内部原理

#### forwardRef 的工作流程

```
父组件传递 ref：
<CustomInput ref={inputRef} label="用户名" />

React 内部处理：
1. 识别 CustomInput 是 forwardRef 组件
2. 将 ref 从 props 中取出（ref 不在 props 中传递）
3. 调用渲染函数：renderFunction(props, ref)
4. 渲染函数将 ref 绑定到内部 DOM：<input ref={ref} />
5. DOM 挂载后：inputRef.current = <input> DOM 节点
```

### 与相关API的对比

| 对比维度 | 普通函数组件 | forwardRef 组件 | React 19 ref props |
|----------|------------|----------------|-------------------|
| ref 属性 | 不接受（被忽略） | 通过第二参数接收 | 直接在 props 中 |
| 包裹方式 | 无 | forwardRef() 包裹 | 无需包裹 |
| TypeScript 类型 | 普通 FC | ForwardRefExoticComponent | 普通函数 |

### 适用场景

- **UI 组件库：** 按钮、输入框、模态框等需要暴露 DOM 引用的组件
- **焦点管理：** 父组件控制子组件的输入框焦点
- **动画库集成：** 父组件需要获取子组件 DOM 来应用动画
- **HOC 包裹：** 高阶组件需要将 ref 透传给被包裹组件

### 常见问题

#### 不用 forwardRef 时 ref 丢失

**问题描述：** 直接给函数组件传 ref，控制台警告且 ref.current 为 null。

**解决方案：**

```tsx
// 错误：函数组件默认不接受 ref
// function MyInput(props) { return <input />; }
// <MyInput ref={inputRef} />  // 警告：ref 被忽略

// 正确：用 forwardRef 包裹
const MyInput = forwardRef<HTMLInputElement>((props, ref) => {
    return <input ref={ref} />;
});
// <MyInput ref={inputRef} />  // 正常工作
```

### 注意事项

- React 18 及之前，函数组件必须用 forwardRef 才能接收 ref
- React 19 中 ref 可以直接作为 props 传递，forwardRef 不再必需
- forwardRef 的显示名可以通过 displayName 设置，方便 DevTools 调试
- ref 转发可以和 useImperativeHandle 配合限制暴露的接口
- 不要过度使用 ref 转发，优先考虑 props 和状态提升

### 总结

forwardRef 让函数组件能接收 ref 并转发到内部 DOM 元素，使父组件可以直接操作子组件的 DOM 节点。适用于 UI 组件库、焦点管理等场景。React 19 中 ref 可以直接作为 props 传递，forwardRef 将逐渐不再需要。配合 useImperativeHandle 可以限制暴露的接口。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## forwardRef的组件封装应用

### 概念说明

forwardRef 在实际开发中最常见的应用场景是封装可复用的 UI 组件。当我们构建设计系统或组件库时，底层的 HTML 元素经常被包装在自定义组件中。为了让使用者仍然能访问到底层的 DOM 节点（用于焦点管理、测量、动画等），需要通过 forwardRef 将 ref 透传到内部的原生元素上。

这种模式在 Button、Input、Modal、Select 等基础组件中非常普遍。高阶组件（HOC）也需要用 forwardRef 确保 ref 不被"吞掉"。

### 基本示例

```tsx
// 示例说明：封装一套基础 UI 组件，全部支持 ref 转发

import React, { forwardRef, useRef } from "react";

// 封装 Button 组件
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "danger";
    size?: "small" | "medium" | "large";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    function Button({ variant = "primary", size = "medium", children, className, ...rest }, ref) {
        // 组合样式类名
        const baseStyle: React.CSSProperties = {
            padding: size === "small" ? "4px 8px" : size === "large" ? "12px 24px" : "8px 16px",
            fontSize: size === "small" ? 12 : size === "large" ? 18 : 14,
            backgroundColor: variant === "primary" ? "#1677ff" : variant === "danger" ? "#ff4d4f" : "#fff",
            color: variant === "secondary" ? "#333" : "#fff",
            border: variant === "secondary" ? "1px solid #d9d9d9" : "none",
            borderRadius: 6,
            cursor: "pointer",
        };

        return (
            <button ref={ref} style={baseStyle} {...rest}>
                {children}
            </button>
        );
    }
);

// 封装 Input 组件
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    function Input({ label, error, style, ...rest }, ref) {
        return (
            <div style={{ marginBottom: 16 }}>
                {label && <label style={{ display: "block", marginBottom: 4 }}>{label}</label>}
                <input
                    ref={ref}
                    style={{
                        padding: "8px 12px",
                        border: `1px solid ${error ? "#ff4d4f" : "#d9d9d9"}`,
                        borderRadius: 6,
                        width: "100%",
                        ...style,
                    }}
                    {...rest}
                />
                {error && <span style={{ color: "#ff4d4f", fontSize: 12 }}>{error}</span>}
            </div>
        );
    }
);

// 使用封装的组件
function LoginForm() {
    const usernameRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const submitRef = useRef<HTMLButtonElement>(null);

    // 用户名回车后跳转到密码框
    const handleUsernameKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            passwordRef.current?.focus();
        }
    };

    // 密码回车后触发提交按钮
    const handlePasswordKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            submitRef.current?.click();
        }
    };

    return (
        <form onSubmit={e => e.preventDefault()}>
            <Input
                ref={usernameRef}
                label="用户名"
                placeholder="请输入用户名"
                onKeyDown={handleUsernameKeyDown}
            />
            <Input
                ref={passwordRef}
                label="密码"
                type="password"
                placeholder="请输入密码"
                onKeyDown={handlePasswordKeyDown}
            />
            <Button ref={submitRef} variant="primary" size="large">
                登录
            </Button>
        </form>
    );
}

export default LoginForm;
```

**运行效果：** 在用户名输入框按回车跳到密码框，密码框按回车触发登录按钮点击。ref 被正确转发到底层 DOM 元素。

### 内部原理

#### HOC 中的 ref 转发

```tsx
// 高阶组件需要用 forwardRef 透传 ref
function withLogging<P extends object>(WrappedComponent: React.ComponentType<P>) {
    // 用 forwardRef 确保 ref 不被 HOC 吞掉
    const WithLogging = forwardRef<any, P>((props, ref) => {
        console.log("组件渲染:", WrappedComponent.displayName);
        return <WrappedComponent {...props} ref={ref} />;
    });

    WithLogging.displayName = `withLogging(${WrappedComponent.displayName || "Component"})`;
    return WithLogging;
}

// 使用
const LoggedInput = withLogging(Input);
// <LoggedInput ref={inputRef} label="姓名" />  // ref 正确透传
```

### 与相关API的对比

| 组件类型 | 是否需要 forwardRef | 原因 |
|---------|-------------------|------|
| 原生 HTML 元素 | 不需要 | 天然支持 ref |
| 简单包装组件 | 需要 | 函数组件默认不接受 ref |
| HOC 包裹的组件 | 需要 | 防止 ref 被 HOC 层吞掉 |
| React 19 组件 | 不需要 | ref 可以直接作为 props |

### 适用场景

- **组件库开发：** Button、Input、Select、Modal 等基础组件
- **HOC 包裹：** withAuth、withLogging 等高阶组件
- **复合组件：** Form.Item、Menu.Item 等嵌套组件
- **第三方库集成：** 包裹的组件需要向外暴露 DOM 节点

### 常见问题

#### forwardRef 组件在 DevTools 中显示为 Anonymous

**问题描述：** 使用 forwardRef 后组件在 React DevTools 中没有名字。

**解决方案：**

```tsx
// 方案1：给渲染函数命名
const MyInput = forwardRef<HTMLInputElement, InputProps>(
    function MyInput(props, ref) {  // 命名函数
        return <input ref={ref} {...props} />;
    }
);

// 方案2：设置 displayName
const MyInput = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
    return <input ref={ref} {...props} />;
});
MyInput.displayName = "MyInput";
```

### 注意事项

- 组件库中的基础组件都应该支持 ref 转发
- 给 forwardRef 组件的渲染函数命名，方便调试
- HOC 中必须用 forwardRef 透传 ref
- 展开剩余 props（`...rest`）传递给底层元素，保持完整的 HTML 属性支持
- React 19 中 ref 可以作为普通 props，forwardRef 将逐渐退出历史舞台

### 总结

forwardRef 在组件封装中的核心应用是让自定义组件暴露底层 DOM 引用。组件库中的 Button、Input 等基础组件和 HOC 都需要使用 forwardRef。给渲染函数命名方便 DevTools 调试。React 19 中 ref 直接作为 props 传递，简化了这一模式。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useImperativeHandle的暴露控制

### 概念说明

`useImperativeHandle` 用于自定义通过 ref 暴露给父组件的实例值。默认情况下，forwardRef 将整个 DOM 节点暴露给父组件，父组件可以调用该 DOM 节点上的任何方法。但在很多场景中，我们不希望暴露完整的 DOM API，而只想让父组件调用特定的方法。useImperativeHandle 可以精确控制暴露哪些方法和属性。

这种受控暴露的设计遵循最小权限原则——只暴露父组件需要的接口，隐藏内部实现细节，让组件的内部 DOM 结构可以自由变更而不影响外部使用者。

### API 签名与参数

```typescript
function useImperativeHandle<T>(
    ref: React.Ref<T>,
    createHandle: () => T,
    deps?: ReadonlyArray<unknown>
): void;
```

| 参数 | 类型 | 是否必填 | 说明 |
|------|------|----------|------|
| ref | Ref | 是 | 从 forwardRef 接收的 ref |
| createHandle | () => T | 是 | 返回暴露给父组件的对象 |
| deps | unknown[] | 否 | 依赖项数组 |

### 基本示例

```tsx
// 示例说明：只暴露特定方法，隐藏完整的 DOM API

import React, { useRef, forwardRef, useImperativeHandle } from "react";

// 定义暴露给父组件的接口
interface VideoPlayerHandle {
    play: () => void;
    pause: () => void;
    seekTo: (time: number) => void;
}

// 视频播放器组件：只暴露 play、pause、seekTo
const VideoPlayer = forwardRef<VideoPlayerHandle, { src: string }>(
    function VideoPlayer({ src }, ref) {
        // 内部持有真实的 video DOM 引用
        const videoRef = useRef<HTMLVideoElement>(null);

        // 自定义暴露的接口
        useImperativeHandle(ref, () => ({
            play() {
                videoRef.current?.play();
            },
            pause() {
                videoRef.current?.pause();
            },
            seekTo(time: number) {
                if (videoRef.current) {
                    videoRef.current.currentTime = time;
                }
            },
            // 不暴露 video 元素的其他方法（如 requestFullscreen、volume 等）
        }), []);

        return (
            <video ref={videoRef} src={src} style={{ width: "100%" }}>
                浏览器不支持视频标签
            </video>
        );
    }
);

// 父组件：只能调用暴露的方法
function App() {
    const playerRef = useRef<VideoPlayerHandle>(null);

    return (
        <div>
            <VideoPlayer ref={playerRef} src="/demo.mp4" />
            <button onClick={() => playerRef.current?.play()}>播放</button>
            <button onClick={() => playerRef.current?.pause()}>暂停</button>
            <button onClick={() => playerRef.current?.seekTo(30)}>跳到30秒</button>
            {/* playerRef.current 上没有 video 元素的其他方法 */}
        </div>
    );
}

export default App;
```

**运行效果：** 父组件只能调用 play、pause、seekTo 三个方法，无法直接访问 video DOM 节点的其他属性和方法。

### 内部原理

#### useImperativeHandle 的工作机制

```javascript
// React 内部简化逻辑
function useImperativeHandle(ref, createHandle, deps) {
    // 在 Layout 阶段执行（与 useLayoutEffect 同时机）
    useLayoutEffect(() => {
        const handle = createHandle();  // 创建暴露的对象

        if (typeof ref === "function") {
            ref(handle);  // 回调 ref
        } else if (ref !== null) {
            ref.current = handle;  // ref 对象
        }

        // 清理：卸载时重置
        return () => {
            if (typeof ref === "function") {
                ref(null);
            } else if (ref !== null) {
                ref.current = null;
            }
        };
    }, deps);
}
// 关键：ref.current 不再指向 DOM 节点，而是指向 createHandle 返回的自定义对象
```

### 适用场景

- **组件库：** 输入框只暴露 focus/blur，不暴露底层 DOM
- **富文本编辑器：** 只暴露 insertText/getContent 等业务方法
- **视频/音频播放器：** 只暴露 play/pause/seekTo
- **表单组件：** 只暴露 validate/reset/submit

### 常见问题

#### 暴露的方法中需要访问最新的 state

**问题描述：** createHandle 中的方法闭包了旧的 state。

**解决方案：**

```tsx
// 将依赖的 state 加入 deps
useImperativeHandle(ref, () => ({
    getValue() {
        return currentValue;  // 需要最新的 currentValue
    },
}), [currentValue]);  // currentValue 变化时重新创建 handle
```

### 注意事项

- useImperativeHandle 必须配合 forwardRef（React 18）或 ref props（React 19）使用
- 只暴露父组件需要的最小接口
- deps 数组为空时 handle 只创建一次，需要最新值时加入依赖
- 暴露的对象在 Layout 阶段赋值（与 useLayoutEffect 同时机）
- 优先考虑 props 和回调传递数据，ref 命令式调用是备选方案

### 总结

useImperativeHandle 自定义 ref 暴露给父组件的接口，遵循最小权限原则。父组件只能调用显式暴露的方法，无法访问内部 DOM 或其他实现细节。适用于组件库、播放器、编辑器等需要命令式 API 的组件。配合 forwardRef 使用，在 Layout 阶段赋值。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useImperativeHandle与forwardRef配合

### 概念说明

useImperativeHandle 和 forwardRef 是一对搭配使用的 API。forwardRef 负责让函数组件接收 ref 参数，useImperativeHandle 负责自定义这个 ref 暴露的内容。两者结合实现了一种"受控的命令式接口"模式——父组件通过 ref 调用子组件暴露的方法，而子组件完全控制暴露哪些能力。

这种模式在构建复杂的可复用组件时非常有用，比如表单组件暴露 validate/reset、模态框暴露 open/close、编辑器暴露 insertText/getContent 等。

### 基本示例

```tsx
// 示例说明：表单组件配合 forwardRef + useImperativeHandle 暴露表单操作

import React, { useState, useRef, forwardRef, useImperativeHandle } from "react";

// 定义表单暴露的接口
interface FormHandle {
    validate: () => boolean;
    reset: () => void;
    getValues: () => Record<string, string>;
    focusField: (name: string) => void;
}

interface FormField {
    name: string;
    label: string;
    required?: boolean;
    type?: string;
}

const CustomForm = forwardRef<FormHandle, { fields: FormField[] }>(
    function CustomForm({ fields }, ref) {
        // 内部状态管理
        const [values, setValues] = useState<Record<string, string>>({});
        const [errors, setErrors] = useState<Record<string, string>>({});
        // 保存每个字段的 DOM 引用
        const fieldRefs = useRef<Record<string, HTMLInputElement | null>>({});

        // 通过 useImperativeHandle 暴露表单操作方法
        useImperativeHandle(ref, () => ({
            // 验证所有字段
            validate() {
                const newErrors: Record<string, string> = {};
                let isValid = true;
                fields.forEach(field => {
                    if (field.required && !values[field.name]?.trim()) {
                        newErrors[field.name] = `${field.label}不能为空`;
                        isValid = false;
                    }
                });
                setErrors(newErrors);
                return isValid;
            },

            // 重置所有字段
            reset() {
                setValues({});
                setErrors({});
            },

            // 获取所有字段值
            getValues() {
                return { ...values };
            },

            // 聚焦到指定字段
            focusField(name: string) {
                fieldRefs.current[name]?.focus();
            },
        }), [fields, values]);  // values 变化时重新创建 handle

        const handleChange = (name: string, value: string) => {
            setValues(prev => ({ ...prev, [name]: value }));
            // 输入时清除该字段的错误
            if (errors[name]) {
                setErrors(prev => {
                    const next = { ...prev };
                    delete next[name];
                    return next;
                });
            }
        };

        return (
            <div>
                {fields.map(field => (
                    <div key={field.name} style={{ marginBottom: 12 }}>
                        <label style={{ display: "block", marginBottom: 4 }}>
                            {field.label}
                            {field.required && <span style={{ color: "red" }}> *</span>}
                        </label>
                        <input
                            ref={el => { fieldRefs.current[field.name] = el; }}
                            type={field.type || "text"}
                            value={values[field.name] || ""}
                            onChange={e => handleChange(field.name, e.target.value)}
                            style={{
                                padding: "6px 10px",
                                border: `1px solid ${errors[field.name] ? "red" : "#ccc"}`,
                                borderRadius: 4,
                                width: "100%",
                            }}
                        />
                        {errors[field.name] && (
                            <span style={{ color: "red", fontSize: 12 }}>{errors[field.name]}</span>
                        )}
                    </div>
                ))}
            </div>
        );
    }
);

// 父组件使用
function App() {
    const formRef = useRef<FormHandle>(null);

    const fields: FormField[] = [
        { name: "username", label: "用户名", required: true },
        { name: "email", label: "邮箱", required: true },
        { name: "phone", label: "手机号" },
    ];

    const handleSubmit = () => {
        if (formRef.current?.validate()) {
            const values = formRef.current.getValues();
            console.log("提交:", values);
        } else {
            // 验证失败，聚焦到第一个必填字段
            formRef.current?.focusField("username");
        }
    };

    const handleReset = () => {
        formRef.current?.reset();
    };

    return (
        <div style={{ maxWidth: 400, margin: "0 auto" }}>
            <h2>注册表单</h2>
            <CustomForm ref={formRef} fields={fields} />
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button onClick={handleSubmit}>提交</button>
                <button onClick={handleReset}>重置</button>
            </div>
        </div>
    );
}

export default App;
```

**运行效果：** 父组件通过 ref 调用 validate 验证表单、reset 重置、getValues 获取数据、focusField 聚焦字段。表单内部的 DOM 结构和状态管理对父组件透明。

### 内部原理

#### 配合模式的数据流

```
父组件                     子组件（forwardRef + useImperativeHandle）
   │                              │
   │ ref={formRef}                │
   │─────────────────────────────→│
   │                              │ useImperativeHandle(ref, () => ({
   │                              │   validate, reset, getValues
   │                              │ }))
   │                              │
   │ formRef.current.validate()   │
   │─────────────────────────────→│ 执行内部的 validate 逻辑
   │                              │ 操作内部的 state 和 DOM
   │             true/false       │
   │←─────────────────────────────│
```

### 与相关API的对比

| 父子通信方式 | 数据流向 | 适用场景 |
|-------------|---------|---------|
| props | 父→子 | 传递数据和配置 |
| 回调 props | 子→父 | 子组件通知父组件事件 |
| ref + useImperativeHandle | 父→子（命令式） | 父组件主动调用子组件方法 |
| Context | 祖先→后代 | 跨层级数据传递 |

### 适用场景

- **表单组件：** validate、reset、getValues、setValues
- **模态框/抽屉：** open、close、toggle
- **轮播图：** next、prev、goTo
- **编辑器：** insertText、getContent、setContent、undo、redo

### 常见问题

#### deps 数组中需要包含哪些依赖

**问题描述：** useImperativeHandle 的 deps 应该包含什么。

**解决方案：**

```tsx
// 如果暴露的方法依赖 state，需要将 state 加入 deps
useImperativeHandle(ref, () => ({
    getValues() {
        return values;  // 依赖 values
    },
    validate() {
        return checkFields(values, rules);  // 依赖 values 和 rules
    },
}), [values, rules]);  // 这些变化时重新创建 handle

// 如果方法只依赖 ref（稳定引用），deps 可以为空
useImperativeHandle(ref, () => ({
    focus() {
        inputRef.current?.focus();  // inputRef 引用稳定
    },
}), []);
```

### 注意事项

- useImperativeHandle 必须在 forwardRef 组件内使用（React 18）
- React 19 中可以直接在接收 ref props 的组件中使用
- deps 数组要包含 createHandle 中引用的所有响应式值
- 命令式 API 是声明式的补充，不应滥用
- 优先使用 props 和状态提升，ref 命令式调用是最后手段

### 总结

forwardRef 让函数组件接收 ref，useImperativeHandle 自定义 ref 暴露的接口。两者配合实现受控的命令式通信，父组件只能调用显式暴露的方法。适用于表单、模态框、编辑器等需要命令式 API 的复杂组件。deps 数组要包含所有被方法引用的响应式值。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useImperativeHandle的命令式接口限制

### 概念说明

useImperativeHandle 提供的是命令式（Imperative）接口，与 React 倡导的声明式（Declarative）编程范式存在天然冲突。React 的核心理念是通过状态驱动 UI 渲染，而命令式接口让父组件直接"命令"子组件执行操作，绕过了 React 的数据流。

因此，useImperativeHandle 应该作为最后手段使用，仅在 props 和状态提升无法满足需求时才考虑。常见的合理使用场景包括：聚焦输入框、滚动到特定位置、触发动画等确实需要命令式操作的情况。而像改变子组件显示的数据、切换子组件的状态这类操作，应该通过 props 实现。

### 基本示例

```tsx
// 示例说明：对比命令式和声明式的实现方式

import React, { useState, useRef, forwardRef, useImperativeHandle } from "react";

// ===== 反面示例：滥用命令式接口 =====
interface BadModalHandle {
    open: () => void;
    close: () => void;
    setTitle: (title: string) => void;  // 不应该通过命令式设置
    setContent: (content: string) => void;  // 不应该通过命令式设置
}

// 错误：把应该用 props 传递的数据放在命令式接口中
// const BadModal = forwardRef<BadModalHandle>((props, ref) => {
//     const [visible, setVisible] = useState(false);
//     const [title, setTitle] = useState("");
//     const [content, setContent] = useState("");
//
//     useImperativeHandle(ref, () => ({
//         open: () => setVisible(true),
//         close: () => setVisible(false),
//         setTitle,     // 反模式：数据应该通过 props 传递
//         setContent,   // 反模式：数据应该通过 props 传递
//     }));
//     ...
// });

// ===== 正面示例：合理使用命令式接口 =====
interface GoodModalHandle {
    // 只暴露真正需要命令式的操作
    open: () => void;
    close: () => void;
}

interface GoodModalProps {
    // 数据通过 props 声明式传递
    title: string;
    children: React.ReactNode;
    onClose?: () => void;
}

const GoodModal = forwardRef<GoodModalHandle, GoodModalProps>(
    function GoodModal({ title, children, onClose }, ref) {
        const [visible, setVisible] = useState(false);

        useImperativeHandle(ref, () => ({
            open() {
                setVisible(true);
            },
            close() {
                setVisible(false);
                onClose?.();
            },
        }), [onClose]);

        if (!visible) return null;

        return (
            <div style={{
                position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                background: "rgba(0,0,0,0.5)", display: "flex",
                alignItems: "center", justifyContent: "center",
            }}>
                <div style={{ background: "#fff", padding: 24, borderRadius: 8, minWidth: 300 }}>
                    <h3>{title}</h3>
                    {children}
                    <button onClick={() => { setVisible(false); onClose?.(); }}>关闭</button>
                </div>
            </div>
        );
    }
);

// 更好的方式：完全声明式，不需要 ref
function DeclarativeModal({ visible, title, children, onClose }: {
    visible: boolean;
    title: string;
    children: React.ReactNode;
    onClose: () => void;
}) {
    if (!visible) return null;

    return (
        <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.5)", display: "flex",
            alignItems: "center", justifyContent: "center",
        }}>
            <div style={{ background: "#fff", padding: 24, borderRadius: 8, minWidth: 300 }}>
                <h3>{title}</h3>
                {children}
                <button onClick={onClose}>关闭</button>
            </div>
        </div>
    );
}

function App() {
    const [showModal, setShowModal] = useState(false);

    return (
        <div>
            <button onClick={() => setShowModal(true)}>打开</button>
            {/* 声明式：通过 props 控制，更符合 React 范式 */}
            <DeclarativeModal
                visible={showModal}
                title="提示"
                onClose={() => setShowModal(false)}
            >
                <p>模态框内容</p>
            </DeclarativeModal>
        </div>
    );
}

export default App;
```

### 与相关API的对比

| 对比维度 | 命令式（ref + useImperativeHandle） | 声明式（props） |
|----------|----------------------------------|---------------|
| 数据流 | 父组件直接调用子组件方法 | 父组件通过 props 传递数据 |
| 可预测性 | 较低（操作时机不确定） | 高（UI = f(state)） |
| 可测试性 | 较难（需要模拟 ref） | 容易（传入 props 验证输出） |
| React 理念 | 偏离声明式范式 | 完全符合 |
| 适用操作 | 聚焦、滚动、动画等 DOM 操作 | 数据展示、状态切换 |

### 适用场景

**适合命令式的操作：**
- focus / blur 输入框
- scrollIntoView / scrollTo 滚动
- play / pause 媒体播放
- 触发 CSS 动画
- 测量 DOM 尺寸

**不适合命令式的操作：**
- 设置显示的数据内容
- 切换组件的显示/隐藏
- 改变组件的样式主题
- 更新列表数据

### 常见问题

#### 何时该用 ref 命令式，何时该用 props 声明式

**解决方案：**

```
判断标准：
1. 这个操作是否涉及 DOM API？
   → 是：适合命令式（focus、scroll、animate）
   → 否：优先用声明式

2. 这个操作是否可以用 state 表达？
   → 是：用 props/state（visible、selectedId、theme）
   → 否：用命令式

3. 操作是"一次性触发"还是"持续状态"？
   → 一次性触发：适合命令式（播放一次动画）
   → 持续状态：适合声明式（isPlaying={true}）
```

### 注意事项

- useImperativeHandle 是最后手段，优先考虑 props 和状态提升
- 只暴露与 DOM 操作相关的命令式方法
- 不要通过命令式接口传递应该用 props 传递的数据
- 命令式接口让组件更难测试和调试
- React 的声明式范式保证 UI 的可预测性，尽量遵循

### 总结

useImperativeHandle 提供的命令式接口应该限制在真正需要的场景——聚焦、滚动、播放等 DOM 操作。数据展示和状态切换应通过 props 声明式实现。命令式接口降低了可预测性和可测试性，偏离 React 的声明式范式。判断标准是：涉及 DOM API 的一次性操作用命令式，可以用状态表达的持续行为用声明式。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## React 19的ref作为props直接传递

### 概念说明

React 19 带来了一个重要的简化：函数组件可以直接通过 props 接收 `ref`，不再需要 `forwardRef` 包裹。在之前的版本中，ref 是一个"特殊属性"，不会出现在 props 中，必须通过 forwardRef 的第二个参数来接收。React 19 将 ref 视为普通的 prop，和 className、onClick 等属性一样传递和接收。

这个变化大幅简化了组件的编写方式，减少了样板代码，也让 TypeScript 类型定义更加直观。forwardRef 在 React 19 中被标记为废弃（deprecated），虽然仍然可用，但新代码不再需要它。

### 基本示例

```tsx
// 示例说明：React 19 中 ref 作为 props 直接传递

import React, { useRef } from "react";

// ===== React 18 及之前：需要 forwardRef =====
// const OldInput = React.forwardRef<HTMLInputElement, { label: string }>(
//     function OldInput({ label }, ref) {
//         return (
//             <div>
//                 <label>{label}</label>
//                 <input ref={ref} />
//             </div>
//         );
//     }
// );

// ===== React 19：ref 直接在 props 中 =====
// ref 和其他 props 一样，是普通的属性
function NewInput({ label, ref }: {
    label: string;
    ref?: React.Ref<HTMLInputElement>;
}) {
    return (
        <div>
            <label>{label}</label>
            <input ref={ref} />
        </div>
    );
}

// 使用方式不变
function App() {
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div>
            <NewInput ref={inputRef} label="用户名" />
            <button onClick={() => inputRef.current?.focus()}>聚焦</button>
        </div>
    );
}

// 配合 useImperativeHandle 也不需要 forwardRef 了
interface EditorHandle {
    insertText: (text: string) => void;
    clear: () => void;
}

function Editor({ ref }: { ref?: React.Ref<EditorHandle> }) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    React.useImperativeHandle(ref, () => ({
        insertText(text: string) {
            if (textareaRef.current) {
                textareaRef.current.value += text;
            }
        },
        clear() {
            if (textareaRef.current) {
                textareaRef.current.value = "";
            }
        },
    }), []);

    return <textarea ref={textareaRef} rows={5} style={{ width: "100%" }} />;
}

export default App;
```

**运行效果：** 与使用 forwardRef 的版本完全一致，但代码更简洁，不需要 forwardRef 包裹。

### 内部原理

#### React 19 的 ref 处理变化

```
React 18：
  <MyComp ref={myRef} name="test" />
  ↓
  React 内部将 ref 从 JSX props 中提取出来
  ↓
  如果 MyComp 是 forwardRef 组件：调用 render(props, ref)
  如果 MyComp 是普通函数组件：ref 被丢弃，控制台警告

React 19：
  <MyComp ref={myRef} name="test" />
  ↓
  React 将 ref 作为普通 prop 传递
  ↓
  MyComp 在 props 中接收 ref：function MyComp({ ref, name }) { ... }
  ↓
  开发者自行将 ref 绑定到 DOM 元素或 useImperativeHandle
```

### 与相关API的对比

| 对比维度 | React 18（forwardRef） | React 19（ref as prop） |
|----------|----------------------|----------------------|
| 语法 | `forwardRef((props, ref) => ...)` | `function Comp({ ref, ...props })` |
| 样板代码 | 需要 forwardRef 包裹 | 无额外包裹 |
| TypeScript | ForwardRefExoticComponent 类型 | 普通函数类型 |
| DevTools 名称 | 需要 displayName 或命名函数 | 自动识别函数名 |
| 与 useImperativeHandle | 配合 forwardRef 使用 | 直接在组件中使用 |
| 向后兼容 | — | forwardRef 仍可用（废弃但不删除） |

### 适用场景

- **所有 React 19 新组件：** 不再需要 forwardRef
- **组件库升级：** 逐步移除 forwardRef 包裹
- **HOC 简化：** 高阶组件中 ref 透传更简单

### 常见问题

#### 从 React 18 迁移到 React 19 时如何处理

**问题描述：** 项目中大量使用了 forwardRef，需要全部改写吗。

**解决方案：**

```tsx
// forwardRef 在 React 19 中仍然可用，不需要立即改写
// 可以逐步迁移：

// 旧代码（保持不动，仍然正常工作）
const OldButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (props, ref) => <button ref={ref} {...props} />
);

// 新代码（使用新语法）
function NewButton({ ref, ...props }: ButtonProps & { ref?: React.Ref<HTMLButtonElement> }) {
    return <button ref={ref} {...props} />;
}

// 两种写法可以共存于同一项目中
```

### 注意事项

- React 19 中 ref 是普通 prop，不再是特殊属性
- forwardRef 在 React 19 中标记为废弃但仍可用
- 新代码直接在 props 中接收 ref 即可
- TypeScript 类型更简单：`{ ref?: React.Ref<T> }`
- 旧代码不需要立即改写，可以逐步迁移
- useImperativeHandle 不再需要配合 forwardRef

### 总结

React 19 将 ref 视为普通 prop，函数组件可以直接在 props 中接收 ref，不再需要 forwardRef 包裹。这大幅减少了样板代码，简化了 TypeScript 类型。forwardRef 被标记为废弃但仍可用，现有代码可以逐步迁移。useImperativeHandle 也可以直接在普通组件中使用。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## React 19的ref清理函数支持

### 概念说明

React 19 为回调 ref 引入了清理函数支持：回调 ref 可以返回一个函数，该函数会在 DOM 元素被卸载时自动调用。这个设计与 useEffect 的清理函数模式一致——在回调中设置资源，在返回的清理函数中释放资源。

在 React 18 及之前，回调 ref 的清理方式是检查参数是否为 null：DOM 挂载时参数是 DOM 节点，卸载时参数是 null。这种方式不够直观，且卸载时无法通过闭包访问之前的 DOM 节点。React 19 的清理函数通过闭包自然地保留了对 DOM 节点和其他资源的引用，清理逻辑更清晰。

### 基本示例

```tsx
// 示例说明：React 19 回调 ref 的清理函数

import React, { useState, useCallback } from "react";

// React 19：回调 ref 返回清理函数
function ResizeObserverDemo() {
    const [show, setShow] = useState(true);
    const [size, setSize] = useState({ width: 0, height: 0 });

    // 回调 ref：返回清理函数
    const measureRef = useCallback((node: HTMLDivElement) => {
        // 挂载时：创建 ResizeObserver
        const observer = new ResizeObserver(entries => {
            const entry = entries[0];
            if (entry) {
                setSize({
                    width: Math.round(entry.contentRect.width),
                    height: Math.round(entry.contentRect.height),
                });
            }
        });
        observer.observe(node);

        // 返回清理函数：卸载时自动调用
        // 通过闭包可以访问 node 和 observer
        return () => {
            console.log("清理：断开 ResizeObserver");
            observer.disconnect();
        };
    }, []);

    return (
        <div>
            <button onClick={() => setShow(s => !s)}>
                {show ? "隐藏" : "显示"}
            </button>
            <p>尺寸: {size.width} x {size.height}</p>
            {show && (
                <div
                    ref={measureRef}
                    style={{
                        width: "50%",
                        minHeight: 100,
                        background: "#f0f0f0",
                        padding: 16,
                        resize: "both",
                        overflow: "auto",
                    }}
                >
                    拖拽右下角调整大小
                </div>
            )}
        </div>
    );
}

// 对比 React 18 的方式
function ResizeObserverDemoOld() {
    const [show, setShow] = useState(true);
    let observerRef: ResizeObserver | null = null;

    // React 18：通过 null 检查清理
    const measureRef = useCallback((node: HTMLDivElement | null) => {
        if (node !== null) {
            // 挂载
            const observer = new ResizeObserver(() => {});
            observer.observe(node);
            observerRef = observer;
        } else {
            // 卸载：参数为 null，无法直接访问之前的 node
            observerRef?.disconnect();
            observerRef = null;
        }
    }, []);

    return (
        <div>
            <button onClick={() => setShow(s => !s)}>切换</button>
            {show && <div ref={measureRef}>内容</div>}
        </div>
    );
}

export default ResizeObserverDemo;
```

**运行效果：** 元素显示时 ResizeObserver 开始监听尺寸变化，隐藏时清理函数自动断开 observer。调整元素大小时实时显示尺寸。

### 内部原理

#### React 19 回调 ref 的处理流程

```
React 19 内部处理：

挂载时：
  const cleanup = callbackRef(domNode);
  // 保存 cleanup 函数

卸载时：
  cleanup();  // 调用返回的清理函数
  // 不再用 null 参数调用 callbackRef

更新时（回调引用变了）：
  1. 调用旧回调的 cleanup()
  2. 调用新回调：newCleanup = newCallbackRef(domNode)
  3. 保存 newCleanup
```

### 与相关API的对比

| 对比维度 | React 18 回调 ref | React 19 回调 ref | useEffect |
|----------|------------------|------------------|----------|
| 清理方式 | 参数为 null | 返回清理函数 | 返回清理函数 |
| 闭包访问 | 卸载时无法访问 DOM | 清理函数中可访问 DOM | 清理函数中可访问 |
| 代码模式 | if (node) / else | 设置 → return 清理 | 设置 → return 清理 |

### 适用场景

- **ResizeObserver：** 观察元素尺寸变化，卸载时断开
- **IntersectionObserver：** 观察元素可见性，卸载时断开
- **MutationObserver：** 观察 DOM 变化，卸载时断开
- **原生事件监听：** addEventListener + removeEventListener
- **第三方库实例：** 挂载时初始化，卸载时销毁

### 常见问题

#### 清理函数和 useEffect 清理的区别

**问题描述：** 什么时候用 ref 清理函数，什么时候用 useEffect 清理。

**解决方案：**

```tsx
// ref 清理函数：与 DOM 元素的生命周期绑定
// 适合：需要在 DOM 挂载/卸载时设置/清理的资源
const ref = useCallback((node: HTMLDivElement) => {
    const observer = new ResizeObserver(() => {});
    observer.observe(node);
    return () => observer.disconnect();
}, []);

// useEffect 清理函数：与组件渲染周期绑定
// 适合：不直接操作 DOM 的副作用
useEffect(() => {
    const subscription = dataSource.subscribe(handler);
    return () => subscription.unsubscribe();
}, [dataSource]);
```

### 注意事项

- React 19 新特性，之前版本不支持
- 清理函数通过闭包访问 DOM 节点和资源
- 与 useEffect 的清理函数模式一致，学习成本低
- 回调 ref 用 useCallback 稳定化，避免不必要的清理和重新设置
- 适合与 DOM 元素生命周期绑定的资源管理

### 总结

React 19 支持回调 ref 返回清理函数，在 DOM 卸载时自动调用。清理函数通过闭包访问 DOM 节点和资源，比 React 18 的 null 参数方式更直观。模式与 useEffect 一致：设置资源 → 返回清理函数。适合 Observer、事件监听、第三方库实例等与 DOM 生命周期绑定的资源管理。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。



## 6.6 React 18与19并发特性

## Concurrent Mode的并发渲染

### 概念说明

并发渲染（Concurrent Rendering）是 React 18 引入的核心能力，允许 React 同时准备多个版本的 UI。在传统的同步渲染中，一旦渲染开始就必须执行完毕，期间无法响应用户交互。并发渲染打破了这个限制：React 可以在渲染过程中暂停、中断或放弃正在进行的工作，优先处理更紧急的更新（如用户输入）。

并发渲染不是一个"模式开关"，而是一种底层能力。开发者通过 `createRoot`、`startTransition`、`useDeferredValue` 等 API 来触发并发行为。没有使用这些 API 的更新仍然同步执行，保证了向后兼容。

### 基本示例

```tsx
// 示例说明：并发渲染让用户输入保持流畅

import React, { useState, useTransition } from "react";
import { createRoot } from "react-dom/client";

// 必须使用 createRoot 才能启用并发特性
// createRoot(document.getElementById("root")!).render(<App />);

// 模拟大量数据
const generateItems = (filter: string) => {
    const items: string[] = [];
    for (let i = 0; i < 20000; i++) {
        if (`Item ${i}`.toLowerCase().includes(filter.toLowerCase()) || !filter) {
            items.push(`Item ${i}`);
        }
    }
    return items;
};

function App() {
    const [input, setInput] = useState("");
    const [filter, setFilter] = useState("");
    const [isPending, startTransition] = useTransition();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // 紧急更新：输入框立即响应
        setInput(e.target.value);

        // 并发更新：列表渲染可被中断
        startTransition(() => {
            setFilter(e.target.value);
        });
    };

    const items = generateItems(filter);

    return (
        <div>
            <input value={input} onChange={handleChange} placeholder="搜索..." />
            {isPending && <p style={{ color: "#999" }}>更新中...</p>}
            <p>共 {items.length} 条</p>
            <ul>
                {items.slice(0, 100).map(item => (
                    <li key={item}>{item}</li>
                ))}
            </ul>
        </div>
    );
}

export default App;
```

**运行效果：** 快速输入时，输入框始终流畅响应。列表在后台并发渲染，输入停止后才更新。如果在渲染过程中用户继续输入，React 会中断旧的渲染，开始新的渲染。

### 内部原理

#### 并发渲染与同步渲染的对比

```
同步渲染（React 17 及之前）：
用户输入 → [====== 渲染 ======] → 浏览器绘制
                ↑ 不可中断，输入框卡顿

并发渲染（React 18+）：
用户输入 → [== 渲染 ==] 中断 → 处理输入 → [== 渲染 ==] → 浏览器绘制
              ↑ 可中断              ↑ 立即响应         ↑ 继续或重新开始
```

#### 并发渲染的关键机制

```
1. 可中断渲染：基于 Fiber 架构，渲染工作被拆分为小单元
2. 优先级调度：不同更新有不同优先级（Lane 模型）
3. 时间切片：每个渲染单元执行后检查是否需要让出主线程
4. 双缓冲：current 树和 workInProgress 树交替使用
```

### 与相关API的对比

| 对比维度 | 同步渲染 | 并发渲染 |
|----------|---------|---------|
| 入口 API | ReactDOM.render | createRoot |
| 渲染过程 | 不可中断 | 可中断、可暂停 |
| 更新优先级 | 所有更新同优先级 | 支持多种优先级 |
| 用户体验 | 大渲染会阻塞交互 | 交互始终流畅 |
| 自动批处理 | 仅在事件处理器中 | 所有场景自动批处理 |

### 适用场景

- **搜索过滤：** 输入保持流畅，过滤结果延迟渲染
- **Tab 切换：** 切换时旧内容保持显示
- **大列表渲染：** 大量 DOM 更新不阻塞交互
- **路由切换：** 页面过渡不影响用户操作

### 常见问题

#### 如何启用并发渲染

**问题描述：** 升级到 React 18 后并发特性没有生效。

**解决方案：**

```tsx
// 必须使用 createRoot（React 18+）
import { createRoot } from "react-dom/client";

// 正确：启用并发特性
const root = createRoot(document.getElementById("root")!);
root.render(<App />);

// 错误：传统入口不支持并发
// import ReactDOM from "react-dom";
// ReactDOM.render(<App />, document.getElementById("root"));
```

### 注意事项

- 并发渲染需要通过 createRoot 启用
- 并发不意味着所有更新都并发——只有 startTransition 等标记的更新才并发
- 并发渲染可能导致组件函数执行多次（渲染被中断后重新开始）
- 组件代码必须是纯函数（没有渲染期间的副作用）
- 副作用必须放在 useEffect 或事件处理器中

### 总结

并发渲染是 React 18 的核心能力，允许渲染过程被中断和恢复，保证用户交互始终流畅。通过 createRoot 启用，配合 startTransition、useDeferredValue 等 API 触发并发行为。要求组件是纯函数，副作用放在 useEffect 中。未使用并发 API 的更新仍然同步执行，保证向后兼容。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 同步模式(Sync Legacy Mode)的差异

### 概念说明

同步模式（Sync Legacy Mode）是 React 17 及之前版本使用的渲染模式，通过 `ReactDOM.render()` 启动。在同步模式下，一旦状态更新触发渲染，React 会同步地从头到尾完成整个渲染过程，期间无法中断。所有更新都以相同的优先级处理，不支持时间切片和可中断渲染。

React 18 引入了 `createRoot` API 启用并发模式（Concurrent Mode），同时保留了 `ReactDOM.render` 作为兼容入口。两种模式在自动批处理、更新优先级、渲染行为等方面有显著差异。React 19 中 `ReactDOM.render` 已被移除，只支持 `createRoot`。

### 基本示例

```tsx
// 示例说明：两种模式的启动方式和行为差异

// ===== 同步模式（React 17 风格）=====
// import ReactDOM from "react-dom";
// ReactDOM.render(<App />, document.getElementById("root"));
// 特点：
// - 所有更新同步执行，不可中断
// - 自动批处理仅在 React 事件处理器中生效
// - setTimeout/fetch 回调中的多次 setState 不会批处理

// ===== 并发模式（React 18+）=====
import { createRoot } from "react-dom/client";
// const root = createRoot(document.getElementById("root")!);
// root.render(<App />);
// 特点：
// - 支持可中断渲染
// - 所有场景自动批处理
// - 支持 startTransition、useDeferredValue 等并发 API

import React, { useState } from "react";

function BatchingDemo() {
    const [count, setCount] = useState(0);
    const [flag, setFlag] = useState(false);

    console.log("渲染次数");

    const handleClick = () => {
        // React 事件中：两种模式都只渲染一次（批处理）
        setCount(c => c + 1);
        setFlag(f => !f);
    };

    const handleTimeout = () => {
        setTimeout(() => {
            // 同步模式：渲染两次（不批处理）
            // 并发模式：渲染一次（自动批处理）
            setCount(c => c + 1);
            setFlag(f => !f);
        }, 0);
    };

    const handleFetch = () => {
        fetch("/api/data").then(() => {
            // 同步模式：渲染两次（不批处理）
            // 并发模式：渲染一次（自动批处理）
            setCount(c => c + 1);
            setFlag(f => !f);
        });
    };

    return (
        <div>
            <p>count: {count}, flag: {String(flag)}</p>
            <button onClick={handleClick}>React 事件</button>
            <button onClick={handleTimeout}>setTimeout</button>
            <button onClick={handleFetch}>fetch 回调</button>
        </div>
    );
}

export default BatchingDemo;
```

### 与相关API的对比

| 对比维度 | 同步模式 (ReactDOM.render) | 并发模式 (createRoot) |
|----------|--------------------------|---------------------|
| 入口 API | ReactDOM.render | createRoot |
| 渲染过程 | 同步，不可中断 | 可中断，可暂停 |
| 自动批处理范围 | 仅 React 事件处理器 | 所有场景 |
| startTransition | 不降低优先级 | 正常工作 |
| useDeferredValue | 不延迟 | 正常工作 |
| Suspense | 基础支持 | 完整支持（流式 SSR） |
| 严格模式行为 | 单次调用 | 开发模式双重调用 |
| React 19 支持 | 已移除 | 唯一入口 |

### 适用场景

**使用 createRoot（推荐）：**
- 所有新项目
- 需要并发特性的项目
- React 18+ 项目

**仍使用 ReactDOM.render（过渡）：**
- React 18 的渐进式迁移阶段
- 依赖同步渲染行为的老代码（React 19 前需完成迁移）

### 常见问题

#### 从 ReactDOM.render 迁移到 createRoot

**问题描述：** 升级到 React 18 后如何切换到并发模式。

**解决方案：**

```tsx
// 迁移前
// import ReactDOM from "react-dom";
// ReactDOM.render(<App />, document.getElementById("root"));

// 迁移后
import { createRoot } from "react-dom/client";
const root = createRoot(document.getElementById("root")!);
root.render(<App />);

// 卸载方式也变了
// 迁移前：ReactDOM.unmountComponentAtNode(container)
// 迁移后：root.unmount()
```

### 注意事项

- React 19 已移除 ReactDOM.render，必须使用 createRoot
- createRoot 启用自动批处理，可能改变某些依赖多次渲染的代码行为
- 如果需要退出自动批处理，使用 flushSync
- 开发模式下严格模式会双重调用组件函数（检测副作用）
- 并发模式不影响不使用并发 API 的代码——普通 setState 仍然同步处理

### 总结

同步模式通过 ReactDOM.render 启动，渲染不可中断，自动批处理仅在 React 事件中生效。并发模式通过 createRoot 启动，支持可中断渲染、全场景自动批处理和并发 API。React 19 已移除 ReactDOM.render，createRoot 是唯一入口。迁移时注意自动批处理可能改变的行为，必要时用 flushSync 退出批处理。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Fiber架构的可中断渲染(Interruptible Rendering)

### 概念说明

Fiber 架构是 React 16 引入的全新内部架构，它将渲染工作拆分为一个个小的工作单元（Fiber 节点），每个单元处理完后可以检查是否需要让出主线程。如果有更高优先级的任务（如用户输入），React 可以暂停当前的渲染工作，优先处理紧急任务，之后再恢复或重新开始之前被中断的渲染。

在 React 16 之前的 Stack Reconciler 中，虚拟 DOM 的比对（Reconciliation）是一个递归过程，一旦开始就无法停止。Fiber 将递归改为了基于链表的迭代循环，每处理一个 Fiber 节点就是一个工作单元，天然支持暂停和恢复。

### 基本示例

```tsx
// 示例说明：可中断渲染在用户交互场景中的体现

import React, { useState, useTransition } from "react";

// 模拟大量子组件的渲染
function HeavyComponent({ count }: { count: number }) {
    const items = [];
    for (let i = 0; i < 5000; i++) {
        items.push(
            <div key={i} style={{ fontSize: 12 }}>
                {count} - 行 {i}
            </div>
        );
    }
    return <div>{items}</div>;
}

function App() {
    const [text, setText] = useState("");
    const [count, setCount] = useState(0);
    const [isPending, startTransition] = useTransition();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // 紧急更新：输入框同步响应
        setText(e.target.value);

        // 过渡更新：HeavyComponent 渲染可被中断
        startTransition(() => {
            setCount(c => c + 1);
        });
    };

    return (
        <div>
            <input value={text} onChange={handleChange} placeholder="输入时不卡顿" />
            {isPending && <p>渲染中...</p>}
            {/* 5000个子元素的渲染可以被用户输入中断 */}
            <HeavyComponent count={count} />
        </div>
    );
}

export default App;
```

**运行效果：** 快速输入时，输入框流畅响应。HeavyComponent 的渲染在后台进行，每处理若干个 Fiber 节点后检查是否有紧急任务，有则让出主线程。

### 内部原理

#### 工作循环（Work Loop）

```javascript
// React 内部的工作循环（简化）
function workLoopConcurrent() {
    // 循环处理 Fiber 节点
    while (workInProgress !== null && !shouldYield()) {
        // 处理当前 Fiber 节点
        performUnitOfWork(workInProgress);
    }
    // shouldYield() 返回 true 时：
    // → 暂停渲染，让出主线程
    // → 浏览器处理用户输入、绘制等
    // → 空闲时恢复渲染
}

// shouldYield 基于 Scheduler 的时间片判断
function shouldYield() {
    // 当前时间片（约5ms）是否用完
    return getCurrentTime() >= deadline;
}

// 同步模式的工作循环（不可中断）
function workLoopSync() {
    while (workInProgress !== null) {
        performUnitOfWork(workInProgress);
        // 没有 shouldYield 检查，一直执行到完成
    }
}
```

#### Fiber 遍历顺序

```
组件树：         Fiber 遍历顺序：
   App           1. App（beginWork）
  / \            2. Header（beginWork）
Header  Main     3. Header（completeWork）→ 回到 App
        /  \     4. Main（beginWork）
     List  Side  5. List（beginWork）
                 6. List（completeWork）→ 回到 Main
                 7. Side（beginWork）
                 8. Side（completeWork）→ 回到 Main
                 9. Main（completeWork）→ 回到 App
                 10. App（completeWork）

每一步之间都可以暂停（并发模式下）
```

### 与相关API的对比

| 对比维度 | Stack Reconciler（React 15） | Fiber Reconciler（React 16+） |
|----------|----------------------------|------------------------------|
| 遍历方式 | 递归 | 基于链表的迭代 |
| 可中断 | 不可中断 | 可中断（并发模式） |
| 数据结构 | 虚拟 DOM 树 | Fiber 链表（child/sibling/return） |
| 优先级 | 无 | Lane 模型多优先级 |
| 时间切片 | 不支持 | 支持（约5ms一个切片） |

### 适用场景

- **大列表渲染：** 数千个 DOM 节点的渲染可以分片执行
- **复杂计算组件：** 图表、编辑器等渲染耗时的组件
- **动画场景：** 渲染不阻塞动画帧
- **实时交互：** 拖拽、输入等需要即时响应的场景

### 常见问题

#### 可中断渲染是否意味着组件函数会执行多次

**问题描述：** 渲染被中断后恢复时，组件函数是否从头执行。

**解决方案：**

```
是的。如果一个组件的渲染被中断，React 可能会丢弃已完成的部分工作，
在恢复时从头重新执行该组件函数。

这就是为什么：
1. 组件函数必须是纯函数（相同输入相同输出）
2. 渲染期间不能有副作用（不能修改全局变量、发请求等）
3. 副作用必须放在 useEffect 中（Commit 阶段执行，不会被中断）
```

### 注意事项

- Fiber 的可中断渲染只在并发模式（createRoot）下生效
- 每个时间切片约5ms，之后检查是否让出主线程
- 组件函数可能在一次更新中执行多次（中断后重新执行）
- Render 阶段可以中断，Commit 阶段不可中断
- 严格模式的双重调用就是为了检测渲染期间的副作用

### 总结

Fiber 架构将渲染工作拆分为小的工作单元，通过基于链表的迭代遍历替代递归，实现可中断渲染。并发模式下，每个时间切片（约5ms）后检查是否让出主线程，保证用户交互的即时响应。组件函数可能因中断而多次执行，因此必须是纯函数。Render 阶段可中断，Commit 阶段不可中断。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Fiber节点的结构与双缓冲

### 概念说明

每个 React 元素（组件或 DOM 节点）在内部都对应一个 Fiber 节点。Fiber 节点是一个普通的 JavaScript 对象，存储了组件的类型、状态、props、副作用标记以及指向其他 Fiber 节点的指针。整个应用的 Fiber 节点通过 child、sibling、return 三个指针组成一棵 Fiber 树。

React 使用双缓冲（Double Buffering）技术维护两棵 Fiber 树：`current` 树代表当前屏幕上显示的 UI，`workInProgress` 树是正在构建中的新 UI。当 workInProgress 树构建完成并提交到 DOM 后，它就成为新的 current 树。这种交替机制确保了屏幕上始终有一棵完整的 Fiber 树对应当前 UI，不会出现半渲染状态。

### 基本示例

```tsx
// 示例说明：展示 Fiber 节点对应的组件结构

import React, { useState } from "react";

// 每个组件和 DOM 元素都会生成对应的 Fiber 节点
function App() {
    const [count, setCount] = useState(0);

    return (
        // Fiber 节点：HostRoot
        //   └─ Fiber 节点：App（FunctionComponent）
        //       └─ Fiber 节点：div（HostComponent）
        //           ├─ Fiber 节点：h1（HostComponent）
        //           │   └─ Fiber 节点：text "计数器"
        //           ├─ Fiber 节点：p（HostComponent）
        //           │   └─ Fiber 节点：text "0"
        //           └─ Fiber 节点：button（HostComponent）
        //               └─ Fiber 节点：text "+1"
        <div>
            <h1>计数器</h1>
            <p>{count}</p>
            <button onClick={() => setCount(c => c + 1)}>+1</button>
        </div>
    );
}

export default App;
```

### 内部原理

#### Fiber 节点的核心结构

```javascript
// Fiber 节点的关键属性（简化）
interface FiberNode {
    // === 静态结构 ===
    tag: number;           // Fiber 类型标记（FunctionComponent=0, HostComponent=5 等）
    type: any;             // 组件类型（函数组件是函数本身，DOM 是标签名字符串）
    key: string | null;    // 用于 Reconciliation 的 key

    // === 树结构指针 ===
    child: FiberNode | null;    // 第一个子节点
    sibling: FiberNode | null;  // 下一个兄弟节点
    return: FiberNode | null;   // 父节点

    // === 状态与属性 ===
    pendingProps: any;     // 新的 props（即将应用）
    memoizedProps: any;    // 上一次渲染的 props
    memoizedState: any;    // 上一次渲染的 state（Hook 链表的头节点）

    // === 双缓冲 ===
    alternate: FiberNode | null;  // 指向另一棵树中对应的 Fiber 节点

    // === 副作用 ===
    flags: number;         // 副作用标记（Placement, Update, Deletion 等）
    stateNode: any;        // 对应的真实 DOM 节点或类组件实例

    // === 调度 ===
    lanes: number;         // 优先级（Lane 模型）
    childLanes: number;    // 子树中的优先级
}
```

#### 双缓冲工作流程

```
初始渲染：
  current 树 = null
  workInProgress 树正在构建
  构建完成 → commit → workInProgress 变为 current

更新渲染：
  current 树 = 旧 UI
  workInProgress 树 = 基于 current 构建的新 UI（复用未变化的节点）
  构建完成 → commit → workInProgress 变为新 current
  旧 current 变为下次更新的 workInProgress 基础

  current ←── alternate ──→ workInProgress
  （屏幕上的）                （正在构建的）
       ↕ commit 后交换
  workInProgress ←── alternate ──→ current
  （下次更新基础）                （屏幕上的）
```

### 与相关API的对比

| 对比维度 | 虚拟 DOM（ReactElement） | Fiber 节点 |
|----------|------------------------|-----------|
| 本质 | 描述 UI 的不可变对象 | 工作单元，可变对象 |
| 创建时机 | 每次渲染都创建新的 | 首次创建，后续复用和更新 |
| 状态存储 | 不存储状态 | 存储组件状态和 Hook 链表 |
| 树结构 | 通过 children 嵌套 | 通过 child/sibling/return 指针 |
| 副作用 | 无 | 标记 Placement/Update/Deletion |

### 适用场景

- **理解 React 内部工作原理：** 面试高频考点
- **性能调优：** 理解为什么 key 很重要（影响 Fiber 节点复用）
- **调试：** React DevTools 中的 Fiber 树就是这个结构
- **源码阅读：** 理解 Fiber 是阅读 React 源码的基础

### 常见问题

#### 双缓冲为什么能避免半渲染状态

**问题描述：** 为什么需要两棵树而不是直接在 current 树上修改。

**解决方案：**

```
如果直接修改 current 树：
1. 修改到一半时用户看到的是半完成的 UI
2. 如果渲染被中断，current 树处于不一致状态
3. 无法回滚到之前的状态

使用双缓冲：
1. workInProgress 树在后台构建，不影响屏幕显示
2. 渲染被中断时 current 树完好无损
3. 只有完全构建完成后才用 workInProgress 替换 current
4. 替换是原子操作（切换指针），不会出现中间状态
```

### 注意事项

- Fiber 节点通过 alternate 指针连接 current 和 workInProgress
- 更新时 React 尽量复用已有的 Fiber 节点（通过 key 和 type 匹配）
- child 指向第一个子节点，sibling 指向下一个兄弟，return 指向父节点
- 双缓冲保证屏幕上始终是完整一致的 UI
- Commit 阶段是同步的，不可中断——交换两棵树是原子操作

### 总结

Fiber 节点是 React 的工作单元，存储组件类型、状态、props 和副作用标记，通过 child/sibling/return 指针组成树结构。React 维护 current 和 workInProgress 两棵 Fiber 树（双缓冲），workInProgress 在后台构建完成后替换 current，保证屏幕上不会出现半渲染状态。更新时尽量复用已有 Fiber 节点以提高性能。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Fiber的type/key/child/sibling/return指针

### 概念说明

Fiber 节点通过几个关键属性来描述组件信息和树结构关系。`type` 标识组件的类型（函数、类或 DOM 标签名），`key` 用于 Reconciliation 时识别同级节点的身份。树结构方面，`child` 指向第一个子节点，`sibling` 指向右边的兄弟节点，`return` 指向父节点。这三个指针将所有 Fiber 节点组织成一棵可以通过迭代（而非递归）遍历的树。

这种链表式结构是 Fiber 可中断渲染的基础——遍历过程中任意时刻暂停后，通过当前 Fiber 节点的指针就能恢复遍历位置，不需要维护调用栈。

### 基本示例

```tsx
// 示例说明：组件树与 Fiber 指针的对应关系

import React from "react";

function Header() {
    return <h1>标题</h1>;
}

function Item({ text }: { text: string }) {
    return <li>{text}</li>;
}

function List() {
    return (
        <ul>
            <Item text="苹果" />
            <Item text="香蕉" />
            <Item text="橙子" />
        </ul>
    );
}

function App() {
    return (
        <div>
            <Header />
            <List />
        </div>
    );
}

// 对应的 Fiber 树指针关系：
//
// FiberRoot
//   │ child
//   ▼
// App ──child──→ div ──child──→ Header ──sibling──→ List
//                                 │ return            │ return
//                                 ▼                   ▼
//                                div                 div
//                                 │
//                               Header ──child──→ h1 ──child──→ "标题"
//
//                               List ──child──→ ul ──child──→ Item("苹果")
//                                                              │ sibling
//                                                              ▼
//                                                            Item("香蕉")
//                                                              │ sibling
//                                                              ▼
//                                                            Item("橙子")

export default App;
```

### 内部原理

#### 各属性详解

```javascript
// type 属性
fiber.type = App;           // 函数组件：函数本身
fiber.type = "div";         // DOM 元素：标签名字符串
fiber.type = ClassComp;     // 类组件：类本身
fiber.type = React.Fragment; // Fragment

// key 属性
fiber.key = null;           // 默认没有 key
fiber.key = "item-1";       // 列表中指定的 key
// key 在 Reconciliation 中用于匹配同级节点
// 相同 key + 相同 type = 复用 Fiber 节点
// 不同 key 或不同 type = 删除旧节点，创建新节点

// child 指针：指向第一个子节点
// div 有三个子节点 Header、Main、Footer
// div.child = Header（只指向第一个）

// sibling 指针：指向右边的兄弟节点
// Header.sibling = Main
// Main.sibling = Footer
// Footer.sibling = null（没有右兄弟）

// return 指针：指向父节点
// Header.return = div
// Main.return = div
// Footer.return = div
```

#### 遍历算法

```javascript
// Fiber 树的深度优先遍历（简化）
function performUnitOfWork(fiber) {
    // 1. beginWork：处理当前节点
    beginWork(fiber);

    // 2. 如果有子节点，进入子节点
    if (fiber.child) {
        return fiber.child;  // 下一个工作单元是子节点
    }

    // 3. 没有子节点，找兄弟节点
    let current = fiber;
    while (current) {
        // completeWork：当前节点处理完毕
        completeWork(current);

        if (current.sibling) {
            return current.sibling;  // 下一个工作单元是兄弟节点
        }

        // 没有兄弟，回到父节点继续找父节点的兄弟
        current = current.return;
    }

    return null;  // 遍历完成
}
```

### 与相关API的对比

| 属性 | 类型 | 作用 | 何时使用 |
|------|------|------|---------|
| type | Function/string/Class | 标识组件类型 | Reconciliation 时判断是否可复用 |
| key | string/null | 标识同级节点身份 | 列表 Diff 时匹配节点 |
| child | FiberNode/null | 第一个子节点 | 深度优先遍历时进入子树 |
| sibling | FiberNode/null | 右兄弟节点 | 遍历同级节点 |
| return | FiberNode/null | 父节点 | 子树完成后回溯到父节点 |

### 适用场景

- **理解 key 的作用：** key + type 决定 Fiber 节点能否复用
- **理解列表渲染性能：** key 不稳定导致 Fiber 节点频繁创建销毁
- **理解 React DevTools：** DevTools 展示的就是 Fiber 树结构
- **源码学习：** beginWork/completeWork 是 Fiber 核心流程

### 常见问题

#### 为什么用 child/sibling/return 而不是 children 数组

**问题描述：** 为什么不用数组存储子节点。

**解决方案：**

```
链表结构的优势：

1. 可中断遍历：只需保存当前 Fiber 节点的引用
   暂停后通过 child/sibling/return 可以恢复到任意位置

2. 高效插入删除：链表的插入删除是 O(1)
   数组的插入删除可能需要移动元素

3. 内存友好：不需要维护数组的连续空间
   Fiber 节点分散在堆内存中

4. 迭代替代递归：链表天然支持迭代遍历
   不会有递归栈溢出的风险
```

### 注意事项

- child 只指向第一个子节点，兄弟节点通过 sibling 链接
- return 指向父节点，用于回溯
- key 和 type 共同决定 Fiber 节点是否可复用
- 列表中 key 必须稳定且唯一，不要用 index 作为 key（除非列表不变）
- Fiber 遍历顺序是深度优先：先子节点，后兄弟节点，再回父节点

### 总结

Fiber 节点通过 type 标识组件类型，key 标识同级身份，child/sibling/return 三个指针组成链表式树结构。这种结构支持通过迭代进行深度优先遍历，可以在任意节点暂停和恢复，是可中断渲染的基础。key + type 决定 Fiber 节点是否可复用，直接影响更新性能。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Lane模型的优先级调度

### 概念说明

Lane 模型是 React 18 引入的优先级调度系统，替代了之前的 ExpirationTime 模型。Lane 使用二进制位（bit）来表示更新的优先级，每个 bit 位代表一个 Lane（车道）。不同的更新被分配到不同的 Lane 上，React 调度器根据 Lane 的优先级决定处理顺序。

Lane 模型的优势在于：可以用位运算高效地合并、拆分和比较优先级，支持批量处理同一优先级的多个更新，也支持同时处理多个不同优先级的更新。这为并发渲染的优先级调度提供了灵活的底层机制。

### 基本示例

```tsx
// 示例说明：不同操作触发不同 Lane 优先级

import React, { useState, useTransition, flushSync } from "react";

function LanePriorityDemo() {
    const [urgentText, setUrgentText] = useState("");
    const [normalCount, setNormalCount] = useState(0);
    const [transitionData, setTransitionData] = useState("");
    const [isPending, startTransition] = useTransition();

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        // InputContinuousLane（连续输入优先级）
        // 用户输入事件自动分配高优先级
        setUrgentText(e.target.value);
    };

    const handleClick = () => {
        // DefaultLane（默认优先级）
        // 普通点击事件中的 setState
        setNormalCount(c => c + 1);
    };

    const handleTransition = () => {
        // TransitionLane（过渡优先级）
        // startTransition 中的 setState
        startTransition(() => {
            setTransitionData("更新于 " + Date.now());
        });
    };

    const handleSync = () => {
        // SyncLane（同步优先级，最高）
        // flushSync 中的 setState
        flushSync(() => {
            setNormalCount(c => c + 100);
        });
    };

    return (
        <div>
            <input value={urgentText} onChange={handleInput} placeholder="高优先级输入" />
            <p>计数: {normalCount}</p>
            <p>过渡数据: {transitionData} {isPending && "(更新中...)"}</p>
            <button onClick={handleClick}>默认优先级 +1</button>
            <button onClick={handleTransition}>过渡优先级更新</button>
            <button onClick={handleSync}>同步优先级 +100</button>
        </div>
    );
}

export default LanePriorityDemo;
```

### 内部原理

#### Lane 的二进制表示

```javascript
// React 内部的 Lane 定义（简化）
// 每个 Lane 是一个二进制位，数值越小优先级越高

const NoLane        = 0b0000000000000000000000000000000;  // 无
const SyncLane      = 0b0000000000000000000000000000010;  // 同步（最高）
const InputContinuousLane = 0b0000000000000000000000001000;  // 连续输入
const DefaultLane   = 0b0000000000000000000000100000;  // 默认
const TransitionLanes = 0b0000000001111111111000000000;  // 过渡（多个 Lane）
const IdleLane      = 0b0100000000000000000000000000000;  // 空闲（最低）

// 位运算操作示例：
// 合并两个更新的优先级
const merged = LaneA | LaneB;

// 检查是否包含某个 Lane
const hasLane = (lanes & lane) !== 0;

// 移除已处理的 Lane
const remaining = lanes & ~processedLane;
```

#### 优先级调度流程

```
用户操作 → 确定 Lane → 标记到 Fiber 节点 → 调度器选择最高优先级 → 渲染

具体流程：
1. setState 触发 → React 根据调用上下文确定 Lane
   - 事件处理器中 → DefaultLane
   - startTransition 中 → TransitionLane
   - flushSync 中 → SyncLane

2. Lane 标记到 Fiber.lanes 和 FiberRoot.pendingLanes

3. 调度器从 pendingLanes 中选出最高优先级的 Lane 集合

4. 只渲染属于该 Lane 集合的更新，跳过低优先级更新

5. 渲染完成后从 pendingLanes 中移除已处理的 Lane

6. 如果还有剩余的低优先级 Lane，继续调度
```

### 与相关API的对比

| Lane 类型 | 优先级 | 触发方式 | 典型场景 |
|-----------|--------|---------|---------|
| SyncLane | 最高 | flushSync | 需要同步更新的场景 |
| InputContinuousLane | 高 | 连续输入事件 | 输入框、拖拽 |
| DefaultLane | 中 | 普通 setState | 点击按钮、数据请求回调 |
| TransitionLane | 低 | startTransition | 非紧急的 UI 更新 |
| IdleLane | 最低 | requestIdleCallback | 不紧急的后台任务 |

### 适用场景

- **理解更新优先级：** 为什么 startTransition 中的更新可以被中断
- **性能调优：** 理解不同操作的优先级有助于合理使用并发 API
- **调试：** React DevTools Profiler 中显示的 Lane 信息

### 常见问题

#### 为什么 Lane 模型替代了 ExpirationTime

**问题描述：** 之前的优先级模型有什么问题。

**解决方案：**

```
ExpirationTime 的局限：
1. 用过期时间（数字）表示优先级，无法表示"批量处理"
2. 多个不同优先级的更新无法灵活组合
3. 不支持"挂起"某个优先级的更新

Lane 的优势：
1. 二进制位可以用位运算高效合并：laneA | laneB
2. TransitionLanes 有多个 Lane，多个过渡更新可以分配到不同 Lane
3. 支持部分处理：只处理高优先级 Lane，暂缓低优先级 Lane
4. Suspense 可以精确控制哪些 Lane 被挂起
```

### 注意事项

- Lane 模型是 React 内部实现，开发者不直接操作 Lane
- 通过 startTransition、flushSync 等 API 间接影响 Lane 分配
- TransitionLanes 有多个 Lane 位，支持多个并行的过渡更新
- 高优先级 Lane 的更新会中断低优先级 Lane 的渲染
- Lane 信息可以在 React DevTools Profiler 中查看

### 总结

Lane 模型用二进制位表示更新优先级，通过位运算高效管理多个更新的调度。不同操作（用户输入、普通 setState、startTransition）被分配到不同 Lane，调度器总是优先处理高优先级 Lane。Lane 替代了 ExpirationTime，支持更灵活的批量处理和优先级组合。开发者通过 startTransition、flushSync 等 API 间接影响 Lane 分配。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 时间切片(Time Slicing)的增量渲染

### 概念说明

时间切片（Time Slicing）是 React 并发渲染的核心机制之一。它将一次完整的渲染工作拆分为多个小的时间片段（约5ms一个），每个片段执行完后主动让出主线程，让浏览器有机会处理用户输入、绘制动画、执行布局等高优先级任务。等浏览器空闲后，React 再继续下一个时间片的渲染工作。

这种"做一点、让一下、再做一点"的模式就是增量渲染。即使渲染工作量很大（比如渲染数千个组件），用户交互也不会被阻塞，因为每5ms就有机会响应用户操作。

### 基本示例

```tsx
// 示例说明：时间切片让大量渲染不阻塞用户交互

import React, { useState, useTransition } from "react";

// 模拟大量子组件
function SlowItem({ index }: { index: number }) {
    // 每个组件模拟一些计算
    let sum = 0;
    for (let i = 0; i < 1000; i++) {
        sum += Math.random();
    }
    return <div style={{ fontSize: 12 }}>项目 {index}: {sum.toFixed(2)}</div>;
}

function TimeSlicingDemo() {
    const [count, setCount] = useState(200);
    const [text, setText] = useState("");
    const [isPending, startTransition] = useTransition();

    const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
        // 紧急更新：滑块值立即显示
        const value = Number(e.target.value);

        // 过渡更新：大量组件渲染使用时间切片
        startTransition(() => {
            setCount(value);
        });
    };

    // 渲染大量组件
    const items = [];
    for (let i = 0; i < count; i++) {
        items.push(<SlowItem key={i} index={i} />);
    }

    return (
        <div>
            {/* 输入框：测试渲染期间是否能正常输入 */}
            <input
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="渲染期间输入不卡顿"
            />

            {/* 滑块：控制渲染数量 */}
            <div>
                <input
                    type="range"
                    min={0}
                    max={2000}
                    value={count}
                    onChange={handleSlider}
                />
                <span>组件数量: {count}</span>
            </div>

            {isPending && <p style={{ color: "#999" }}>渲染中...</p>}

            <div style={{ maxHeight: 400, overflow: "auto" }}>
                {items}
            </div>
        </div>
    );
}

export default TimeSlicingDemo;
```

**运行效果：** 拖动滑块增加组件数量时，输入框仍然流畅响应。大量组件通过时间切片分批渲染，不会卡死页面。

### 内部原理

#### 时间切片的执行流程

```
一次完整的渲染（处理 1000 个 Fiber 节点）：

无时间切片（同步渲染）：
[========= 处理 1000 个节点 =========] → 浏览器绘制
                 50ms                    → 用户输入被延迟 50ms

有时间切片（并发渲染）：
[= 5ms =] → 让出 → [= 5ms =] → 让出 → [= 5ms =] → ... → 完成 → 浏览器绘制
  100个     浏览器    100个     浏览器    100个
  节点     处理输入   节点     绘制动画   节点

每个 5ms 的间隙中，浏览器可以：
- 响应用户输入
- 执行 requestAnimationFrame
- 布局和绘制
```

#### Scheduler 的实现

```javascript
// React Scheduler（简化）
// 使用 MessageChannel 实现宏任务调度

const channel = new MessageChannel();
const port = channel.port2;

// 每次调度一个宏任务
function scheduleCallback(callback) {
    taskQueue.push(callback);
    port.postMessage(null);  // 触发宏任务
}

// 宏任务处理器
channel.port1.onmessage = () => {
    const startTime = performance.now();
    let currentTask = taskQueue[0];

    while (currentTask) {
        // 时间片用完了吗？（约5ms）
        if (performance.now() - startTime > 5) {
            break;  // 让出主线程
        }
        // 执行一个工作单元
        const hasMore = currentTask.callback();
        if (!hasMore) {
            taskQueue.shift();  // 任务完成，移除
        }
        currentTask = taskQueue[0];
    }

    // 如果还有任务，继续调度下一个宏任务
    if (taskQueue.length > 0) {
        port.postMessage(null);
    }
};
```

### 与相关API的对比

| 对比维度 | 同步渲染 | 时间切片渲染 |
|----------|---------|------------|
| 执行方式 | 一次性完成 | 分片执行 |
| 主线程占用 | 持续占用直到完成 | 每5ms让出一次 |
| 用户交互 | 被阻塞 | 可以响应 |
| 动画表现 | 可能掉帧 | 保持流畅 |
| 总耗时 | 较短（无调度开销） | 稍长（有调度开销） |

### 适用场景

- **大列表渲染：** 数千个 DOM 节点的渲染分片执行
- **复杂表单：** 大量表单控件的渲染不阻塞输入
- **数据可视化：** 图表渲染期间保持交互响应
- **页面切换：** 新页面渲染不阻塞当前页面的操作

### 常见问题

#### 时间切片的5ms是固定的吗

**问题描述：** React 如何确定每个时间片的长度。

**解决方案：**

```
默认时间片约为 5ms，但并不是严格固定的：

1. React Scheduler 使用 performance.now() 检测时间
2. 每处理一个工作单元后检查是否超时
3. 5ms 是一个经验值，保证浏览器在 16.6ms 的帧时间内
   有足够时间处理布局、绘制和用户交互
4. 不同优先级的任务可能有不同的超时时间
5. 开发者不能直接控制时间片长度
```

### 注意事项

- 时间切片仅在并发模式（createRoot）下生效
- 只有通过 startTransition 等标记的更新才使用时间切片
- 普通 setState 仍然同步渲染，不使用时间切片
- 时间切片增加了少量调度开销，但换来了更好的交互体验
- Scheduler 使用 MessageChannel 而非 requestIdleCallback（兼容性更好）

### 总结

时间切片将渲染工作拆分为约5ms的小片段，每个片段执行后让出主线程给浏览器。这保证了即使在大量渲染工作期间，用户交互和动画也不被阻塞。React 通过内部的 Scheduler 使用 MessageChannel 实现宏任务调度。时间切片仅在并发模式下对 startTransition 等标记的更新生效。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Suspense的异步边界(Boundary)

### 概念说明

`Suspense` 是 React 提供的异步边界组件，用于声明式地处理组件树中的异步加载状态。当 Suspense 边界内的子组件发生"挂起"（suspend）——比如数据还没加载完、代码还没下载完——React 会显示 Suspense 的 `fallback` UI（通常是 loading 指示器），等子组件准备好后自动切换为实际内容。

Suspense 的工作方式类似于 try/catch：它"捕获"子组件抛出的 Promise。当子组件在渲染过程中抛出一个 Promise 时，React 暂停该子树的渲染，显示 fallback，等 Promise resolve 后重新尝试渲染。

### API 签名与参数

```typescript
<Suspense fallback={<Loading />}>
    <AsyncComponent />
</Suspense>
```

| 属性 | 类型 | 说明 |
|------|------|------|
| fallback | ReactNode | 子组件挂起时显示的备用 UI |
| children | ReactNode | 可能会挂起的子组件 |

### 基本示例

```tsx
// 示例说明：Suspense 配合 React.lazy 实现代码分割的异步加载

import React, { Suspense, useState } from "react";

// React.lazy 实现代码分割
// 组件代码在需要时才下载，下载期间 Suspense 显示 fallback
const HeavyChart = React.lazy(() => import("./HeavyChart"));
const DataTable = React.lazy(() => import("./DataTable"));

function LoadingSpinner() {
    return (
        <div style={{ padding: 20, textAlign: "center", color: "#999" }}>
            加载中...
        </div>
    );
}

function Dashboard() {
    const [activeTab, setActiveTab] = useState<"chart" | "table">("chart");

    return (
        <div>
            <nav>
                <button onClick={() => setActiveTab("chart")}>图表</button>
                <button onClick={() => setActiveTab("table")}>表格</button>
            </nav>

            {/* Suspense 边界：子组件加载期间显示 fallback */}
            <Suspense fallback={<LoadingSpinner />}>
                {activeTab === "chart" ? <HeavyChart /> : <DataTable />}
            </Suspense>
        </div>
    );
}

// 嵌套 Suspense：不同层级的加载状态
function NestedSuspenseDemo() {
    return (
        // 外层 Suspense：整个页面的加载状态
        <Suspense fallback={<div>页面加载中...</div>}>
            <header>页面标题</header>

            {/* 内层 Suspense：只控制内容区域的加载状态 */}
            <Suspense fallback={<div>内容加载中...</div>}>
                <HeavyChart />
            </Suspense>

            {/* 另一个内层 Suspense：独立的加载状态 */}
            <Suspense fallback={<div>表格加载中...</div>}>
                <DataTable />
            </Suspense>
        </Suspense>
    );
}

export default Dashboard;
```

**运行效果：** 切换 Tab 时，如果组件代码还没下载完，显示"加载中..."。下载完成后自动显示组件内容。嵌套 Suspense 让不同区域有独立的加载状态。

### 内部原理

#### Suspense 的挂起机制

```
子组件渲染 → 抛出 Promise → React 捕获

1. React.lazy(() => import("./Chart"))
   → 首次渲染时发起 import()
   → import 返回 Promise，组件抛出该 Promise

2. Suspense 捕获 Promise
   → 暂停子树渲染
   → 显示 fallback UI

3. Promise resolve（代码下载完成）
   → React 重新尝试渲染子组件
   → 这次模块已加载，正常渲染
   → fallback 被替换为实际内容
```

### 适用场景

- **代码分割：** React.lazy + Suspense 实现按需加载
- **数据获取：** 配合支持 Suspense 的数据库（如 Relay、SWR）
- **嵌套加载：** 不同区域独立的加载状态
- **SSR 流式渲染：** 服务端渲染时的流式 HTML 传输

### 常见问题

#### Suspense 能直接包裹 fetch 请求吗

**问题描述：** 想用 Suspense 处理数据加载的 loading 状态。

**解决方案：**

```tsx
// 不能直接在组件中 fetch 然后让 Suspense 捕获
// Suspense 需要组件"抛出 Promise"，普通的 useState + useEffect 不会抛出

// 需要使用支持 Suspense 的数据获取方案：
// 1. React.lazy（代码分割）
// 2. Relay（Facebook 的 GraphQL 客户端）
// 3. Next.js 的数据获取
// 4. React 19 的 use() Hook
// 5. 第三方库如 SWR（实验性 Suspense 支持）

// React 19 的 use() Hook 示例：
// function UserProfile({ userPromise }) {
//     const user = use(userPromise);  // 如果 Promise 未 resolve，组件挂起
//     return <div>{user.name}</div>;
// }
```

### 注意事项

- Suspense 只能捕获子组件渲染过程中抛出的 Promise
- 不能用 Suspense 替代 useEffect + loading state 的传统模式（除非使用支持 Suspense 的库）
- 嵌套 Suspense 可以控制不同区域的加载粒度
- fallback 在挂起时立即显示，不会延迟
- React 18+ 的 Suspense 支持并发特性（配合 startTransition 避免立即显示 fallback）

### 总结

Suspense 是 React 的异步边界组件，捕获子组件抛出的 Promise，在异步操作完成前显示 fallback UI。主要配合 React.lazy 实现代码分割，也可配合支持 Suspense 的数据获取方案。嵌套 Suspense 实现不同区域独立的加载状态。React 19 的 use() Hook 扩展了 Suspense 的数据获取能力。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Suspense的fallbackUI显示

### 概念说明

Suspense 的 `fallback` 属性指定了子组件挂起时显示的备用 UI。当子组件在渲染过程中挂起（抛出 Promise）时，React 会立即将 Suspense 边界内的所有内容替换为 fallback UI，直到挂起的 Promise resolve 后恢复显示实际内容。

fallback UI 通常是加载指示器（Spinner、骨架屏、进度条等）。React 18+ 的并发特性可以配合 `startTransition` 延迟 fallback 的显示——在过渡更新中，React 会先保持当前内容，只有在超过一定时间后才切换到 fallback，避免快速加载场景中的闪烁。

### 基本示例

```tsx
// 示例说明：不同类型的 fallback UI

import React, { Suspense, useState, useTransition } from "react";

// 骨架屏 fallback
function SkeletonCard() {
    return (
        <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 8 }}>
            <div style={{ width: "60%", height: 20, background: "#f0f0f0", marginBottom: 8 }} />
            <div style={{ width: "100%", height: 14, background: "#f0f0f0", marginBottom: 6 }} />
            <div style={{ width: "80%", height: 14, background: "#f0f0f0" }} />
        </div>
    );
}

// Spinner fallback
function Spinner() {
    return (
        <div style={{ textAlign: "center", padding: 40, color: "#999" }}>
            <div style={{ fontSize: 24 }}>加载中...</div>
        </div>
    );
}

const UserProfile = React.lazy(() => import("./UserProfile"));
const UserPosts = React.lazy(() => import("./UserPosts"));

function UserPage() {
    return (
        <div>
            {/* 不同区域使用不同的 fallback */}
            <Suspense fallback={<SkeletonCard />}>
                <UserProfile />
            </Suspense>

            <Suspense fallback={<Spinner />}>
                <UserPosts />
            </Suspense>
        </div>
    );
}

// 配合 startTransition 延迟 fallback 显示
function TabSwitchDemo() {
    const [tab, setTab] = useState("home");
    const [isPending, startTransition] = useTransition();

    const handleTabChange = (newTab: string) => {
        // 过渡更新：先保持当前内容，不立即显示 fallback
        startTransition(() => {
            setTab(newTab);
        });
    };

    const TabContent = React.lazy(() => {
        // 模拟根据 tab 动态导入
        return import(`./tabs/${tab}`);
    });

    return (
        <div>
            <nav>
                <button onClick={() => handleTabChange("home")}>首页</button>
                <button onClick={() => handleTabChange("about")}>关于</button>
            </nav>

            {/* isPending 为 true 时显示半透明，而不是立即切换到 fallback */}
            <div style={{ opacity: isPending ? 0.6 : 1 }}>
                <Suspense fallback={<Spinner />}>
                    <TabContent />
                </Suspense>
            </div>
        </div>
    );
}

export default UserPage;
```

**运行效果：** UserProfile 加载时显示骨架屏，UserPosts 加载时显示 Spinner。Tab 切换使用 startTransition 时，旧内容先半透明显示，避免立即闪烁 fallback。

### 内部原理

#### fallback 显示的时机

```
紧急更新中的 Suspense：
  子组件挂起 → 立即显示 fallback → Promise resolve → 显示内容

过渡更新中的 Suspense（startTransition）：
  子组件挂起 → 保持当前内容（isPending=true）→ 超时后显示 fallback → 显示内容
  子组件挂起 → 保持当前内容 → Promise 快速 resolve → 直接显示内容（fallback 没出现）
```

### 与相关API的对比

| fallback 类型 | 适用场景 | 用户体验 |
|-------------|---------|---------|
| Spinner | 通用加载 | 简单明了，适合短时间加载 |
| 骨架屏 | 已知内容布局 | 减少布局跳动，体验更好 |
| 空白/透明 | 极快的加载 | 几乎无感知的过渡 |
| 旧内容半透明 | startTransition | 保持上下文，体验最好 |

### 适用场景

- **代码分割加载：** 懒加载组件的 loading 状态
- **Tab 切换：** 不同 Tab 内容的加载过渡
- **骨架屏：** 页面首次加载的占位内容
- **流式 SSR：** 服务端渲染时的渐进式加载

### 常见问题

#### fallback 闪烁问题

**问题描述：** 加载很快的组件也会闪一下 fallback。

**解决方案：**

```tsx
// 方案1：用 startTransition 延迟 fallback
startTransition(() => {
    setShowComponent(true);
});
// 如果组件很快加载完，fallback 不会出现

// 方案2：给 fallback 加最小显示时间（CSS）
function DelayedSpinner() {
    return (
        <div style={{
            animation: "fadeIn 0.3s ease-in 0.2s both",  // 延迟 200ms 后才显示
        }}>
            加载中...
        </div>
    );
}
```

### 注意事项

- fallback 在子组件挂起时立即显示（紧急更新中）
- startTransition 中的 Suspense 会延迟 fallback 显示
- 嵌套 Suspense 时，最近的 Suspense 边界捕获挂起
- fallback 为 null 时不显示任何内容（但仍然捕获挂起）
- 骨架屏比 Spinner 提供更好的用户体验（减少布局跳动）

### 总结

Suspense 的 fallback 在子组件挂起时显示备用 UI。紧急更新中 fallback 立即显示，过渡更新中 React 会延迟 fallback 优先保持旧内容。骨架屏比 Spinner 体验更好，减少布局跳动。配合 startTransition 可以避免快速加载时的 fallback 闪烁。嵌套 Suspense 允许不同区域使用不同的 fallback。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Suspense的异常传播处理

### 概念说明

Suspense 组件在处理异步加载时，可能遇到两种情况：Promise resolve（加载成功）和 Promise reject（加载失败）。当 Suspense 边界内的子组件抛出的 Promise 被 reject 时，这个错误不会被 Suspense 自身处理，而是向上传播到最近的 Error Boundary。

这意味着 Suspense 只负责处理"等待中"的状态（显示 fallback），不负责处理错误状态。错误处理需要配合 Error Boundary 组件来完成。在实际应用中，通常将 Suspense 和 Error Boundary 嵌套使用，分别处理加载状态和错误状态。

### 基本示例

```tsx
// 示例说明：Suspense 配合 Error Boundary 处理加载失败

import React, { Suspense, Component } from "react";

// Error Boundary 组件（必须用类组件实现）
class ErrorBoundary extends Component<
    { fallback: React.ReactNode; children: React.ReactNode },
    { hasError: boolean; error: Error | null }
> {
    state = { hasError: false, error: null };

    // 捕获子组件的渲染错误
    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        // 上报错误到监控系统
        console.error("组件错误:", error, info);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback;
        }
        return this.props.children;
    }
}

// 可能加载失败的懒加载组件
const RiskyComponent = React.lazy(() =>
    import("./RiskyComponent").catch(() => {
        // 模块加载失败时返回一个默认模块
        // 如果不处理，错误会传播到 Error Boundary
        throw new Error("组件加载失败，请检查网络连接");
    })
);

function App() {
    return (
        <div>
            {/* Error Boundary 在外层捕获错误 */}
            <ErrorBoundary
                fallback={
                    <div style={{ padding: 20, color: "red", border: "1px solid red" }}>
                        <p>加载出错了</p>
                        <button onClick={() => window.location.reload()}>重新加载</button>
                    </div>
                }
            >
                {/* Suspense 在内层处理加载状态 */}
                <Suspense fallback={<div>加载中...</div>}>
                    <RiskyComponent />
                </Suspense>
            </ErrorBoundary>
        </div>
    );
}

export default App;
```

**运行效果：** 加载中显示"加载中..."（Suspense 处理）。加载失败显示错误提示和重新加载按钮（Error Boundary 处理）。

### 内部原理

#### 异常传播路径

```
场景1：加载成功
  子组件挂起（抛出 Promise）
  → Suspense 捕获 → 显示 fallback
  → Promise resolve
  → 重新渲染 → 显示实际内容

场景2：加载失败
  子组件挂起（抛出 Promise）
  → Suspense 捕获 → 显示 fallback
  → Promise reject
  → 重新渲染 → 子组件抛出 Error
  → Suspense 不处理 Error（只处理 Promise）
  → Error 向上传播
  → Error Boundary 捕获 → 显示错误 UI

场景3：没有 Error Boundary
  → Error 继续向上传播
  → 到达根节点 → 整个应用崩溃（白屏）
```

### 与相关API的对比

| 对比维度 | Suspense | Error Boundary |
|----------|---------|---------------|
| 捕获内容 | Promise（异步等待） | Error（渲染错误） |
| 显示内容 | fallback（加载中） | 错误 UI |
| 实现方式 | 内置组件 | 类组件（getDerivedStateFromError） |
| 恢复机制 | Promise resolve 后自动恢复 | 需要手动重置状态或刷新 |

### 适用场景

- **网络请求失败：** 组件代码或数据加载失败
- **CDN 异常：** 懒加载的 JS 文件下载失败
- **接口错误：** 数据获取 Promise reject
- **降级处理：** 加载失败时显示默认内容或重试按钮

### 常见问题

#### 如何实现加载失败后的重试

**问题描述：** 组件加载失败后想让用户手动重试。

**解决方案：**

```tsx
class RetryErrorBoundary extends Component<
    { children: React.ReactNode },
    { hasError: boolean }
> {
    state = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    handleRetry = () => {
        // 重置错误状态，触发重新渲染
        // 子组件会重新尝试加载
        this.setState({ hasError: false });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div>
                    <p>加载失败</p>
                    <button onClick={this.handleRetry}>重试</button>
                </div>
            );
        }
        return this.props.children;
    }
}
```

### 注意事项

- Suspense 只处理 Promise（等待状态），不处理 Error（错误状态）
- Error Boundary 必须用类组件实现（函数组件不支持 getDerivedStateFromError）
- 建议 Suspense 和 Error Boundary 配合使用
- Error Boundary 在外层，Suspense 在内层（错误可以被捕获）
- 没有 Error Boundary 时，加载失败会导致整个应用崩溃

### 总结

Suspense 只处理异步等待（Promise），不处理错误（Error）。加载失败时错误向上传播到最近的 Error Boundary。实际应用中 Error Boundary 在外层捕获错误，Suspense 在内层处理加载状态。可以通过重置 Error Boundary 的状态实现重试功能。没有 Error Boundary 时加载失败会导致白屏。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Error Boundaries的错误捕获

### 概念说明

Error Boundary（错误边界）是一种特殊的 React 组件，用于捕获子组件树在渲染过程中、生命周期方法中以及构造函数中抛出的 JavaScript 错误。当错误被捕获后，Error Boundary 会渲染备用 UI 而不是让整个应用崩溃白屏。

Error Boundary 必须使用类组件实现，因为它依赖 `static getDerivedStateFromError()` 和 `componentDidCatch()` 两个生命周期方法，函数组件目前没有对应的 Hook。Error Boundary 的作用类似于 JavaScript 的 try/catch，但作用于组件树的渲染层面。

Error Boundary 不能捕获以下场景的错误：事件处理器中的错误、异步代码（setTimeout/fetch）中的错误、服务端渲染中的错误、Error Boundary 自身抛出的错误。

### 基本示例

```tsx
// 示例说明：实现一个通用的 Error Boundary 组件

import React, { Component, useState } from "react";

// 通用 Error Boundary
class ErrorBoundary extends Component<
    {
        children: React.ReactNode;
        fallback?: React.ReactNode;
        onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
    },
    { hasError: boolean; error: Error | null }
> {
    state = { hasError: false, error: null as Error | null };

    // 渲染阶段捕获错误，更新 state 以显示备用 UI
    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    // Commit 阶段调用，用于错误上报
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("Error Boundary 捕获到错误:", error);
        console.error("组件栈:", errorInfo.componentStack);
        // 上报到错误监控系统
        this.props.onError?.(error, errorInfo);
    }

    // 重置方法：允许用户重试
    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            // 使用自定义 fallback 或默认错误 UI
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (
                <div style={{ padding: 20, border: "1px solid #ff4d4f", borderRadius: 8 }}>
                    <h3 style={{ color: "#ff4d4f" }}>出错了</h3>
                    <p>{this.state.error?.message}</p>
                    <button onClick={this.handleReset}>重试</button>
                </div>
            );
        }
        return this.props.children;
    }
}

// 会崩溃的组件
function BuggyCounter() {
    const [count, setCount] = useState(0);

    if (count === 3) {
        throw new Error("计数到3时崩溃！");
    }

    return (
        <div>
            <p>计数: {count}</p>
            <button onClick={() => setCount(c => c + 1)}>+1（到3会崩溃）</button>
        </div>
    );
}

// 使用 Error Boundary
function App() {
    return (
        <div>
            <h1>Error Boundary 示例</h1>

            {/* 每个 Error Boundary 独立捕获各自子树的错误 */}
            <ErrorBoundary onError={(err) => console.log("上报:", err.message)}>
                <BuggyCounter />
            </ErrorBoundary>

            {/* 这个组件不受上面错误的影响 */}
            <ErrorBoundary>
                <p>这个区域正常工作</p>
            </ErrorBoundary>
        </div>
    );
}

export default App;
```

**运行效果：** 点击+1到3时，BuggyCounter 崩溃，Error Boundary 捕获错误显示"出错了"。点击重试可以恢复。另一个区域不受影响。

### 内部原理

#### Error Boundary 的捕获范围

```
Error Boundary 能捕获：
  ✅ 子组件的渲染错误（render 方法 / 函数组件函数体）
  ✅ 生命周期方法中的错误（componentDidMount 等）
  ✅ 构造函数中的错误
  ✅ static getDerivedStateFromProps 中的错误

Error Boundary 不能捕获：
  ❌ 事件处理器中的错误（用 try/catch 处理）
  ❌ 异步代码（setTimeout、Promise）中的错误
  ❌ 服务端渲染（SSR）中的错误
  ❌ Error Boundary 自身抛出的错误
```

### 与相关API的对比

| 错误处理方式 | 适用范围 | 实现方式 |
|------------|---------|---------|
| Error Boundary | 渲染错误、生命周期错误 | 类组件 getDerivedStateFromError |
| try/catch | 事件处理器、同步代码 | JavaScript 原生语法 |
| window.onerror | 全局未捕获的错误 | 全局事件监听 |
| Promise.catch | 异步操作错误 | Promise API |

### 适用场景

- **页面级别：** 整个页面的错误降级
- **模块级别：** 独立功能模块的错误隔离
- **组件级别：** 单个组件的错误处理
- **第三方组件：** 隔离不可控的第三方组件错误

### 常见问题

#### 事件处理器中的错误如何处理

**问题描述：** Error Boundary 无法捕获 onClick 等事件中的错误。

**解决方案：**

```tsx
function SafeButton() {
    const handleClick = () => {
        try {
            // 可能出错的逻辑
            riskyOperation();
        } catch (error) {
            // 用 try/catch 处理事件中的错误
            console.error("操作失败:", error);
            // 显示错误提示等
        }
    };

    return <button onClick={handleClick}>操作</button>;
}
```

### 注意事项

- Error Boundary 必须用类组件实现（暂无 Hook 替代）
- 建议在应用的多个层级放置 Error Boundary（页面级 + 模块级）
- Error Boundary 的粒度越细，错误影响的范围越小
- componentDidCatch 中适合做错误上报
- getDerivedStateFromError 中适合更新 state 显示备用 UI
- 开发模式下错误仍然会在控制台显示（这是正常行为）

### 总结

Error Boundary 捕获子组件树的渲染错误，显示备用 UI 防止整个应用崩溃。必须用类组件实现，通过 getDerivedStateFromError 更新状态、componentDidCatch 上报错误。不能捕获事件处理器和异步代码中的错误（用 try/catch 处理）。建议在多个层级放置 Error Boundary 实现错误隔离。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## componentDidCatch的错误处理

### 概念说明

`componentDidCatch` 是类组件的生命周期方法，在子组件树抛出错误后的 Commit 阶段被调用。它接收两个参数：`error`（抛出的错误对象）和 `errorInfo`（包含组件栈信息的对象）。这个方法主要用于错误日志记录和上报，而不是用于更新 UI——UI 的切换应该通过 `getDerivedStateFromError` 实现。

componentDidCatch 和 getDerivedStateFromError 的分工是：getDerivedStateFromError 在 Render 阶段调用，返回新的 state 以切换到备用 UI；componentDidCatch 在 Commit 阶段调用，适合执行副作用（如错误上报）。

### API 签名与参数

```typescript
componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void;

interface ErrorInfo {
    componentStack: string;  // 出错组件的调用栈
}
```

| 参数 | 类型 | 说明 |
|------|------|------|
| error | Error | 子组件抛出的错误对象 |
| errorInfo | ErrorInfo | 包含 componentStack（组件调用栈字符串） |

### 基本示例

```tsx
// 示例说明：componentDidCatch 用于错误日志上报

import React, { Component, useState } from "react";

class ErrorReporter extends Component<
    { children: React.ReactNode },
    { hasError: boolean }
> {
    state = { hasError: false };

    // Render 阶段：更新 state 切换 UI
    static getDerivedStateFromError(error: Error) {
        return { hasError: true };
    }

    // Commit 阶段：执行副作用（错误上报）
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // 记录错误详情
        console.error("错误信息:", error.message);
        console.error("组件栈:", errorInfo.componentStack);

        // 上报到错误监控服务
        this.reportError({
            message: error.message,
            stack: error.stack || "",
            componentStack: errorInfo.componentStack,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent,
        });
    }

    // 模拟错误上报
    reportError(errorData: Record<string, unknown>) {
        // 实际项目中发送到 Sentry、Bugsnag 等服务
        console.log("上报错误:", errorData);
        // fetch("/api/error-report", {
        //     method: "POST",
        //     headers: { "Content-Type": "application/json" },
        //     body: JSON.stringify(errorData),
        // });
    }

    handleRetry = () => {
        this.setState({ hasError: false });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: 20, background: "#fff2f0", border: "1px solid #ffccc7", borderRadius: 8 }}>
                    <h3>页面出现了问题</h3>
                    <p>错误已自动上报，我们会尽快修复</p>
                    <button onClick={this.handleRetry}>重试</button>
                </div>
            );
        }
        return this.props.children;
    }
}

// 测试组件
function UnstableWidget() {
    const [clicks, setClicks] = useState(0);

    if (clicks >= 2) {
        throw new Error("Widget 崩溃了");
    }

    return (
        <div>
            <p>点击次数: {clicks}</p>
            <button onClick={() => setClicks(c => c + 1)}>点击（第2次会崩溃）</button>
        </div>
    );
}

function App() {
    return (
        <ErrorReporter>
            <UnstableWidget />
        </ErrorReporter>
    );
}

export default App;
```

### 内部原理

#### 两个错误处理方法的执行时机

```
子组件抛出错误 →

Render 阶段：
  getDerivedStateFromError(error)
  → 返回新的 state: { hasError: true }
  → 组件重新渲染，显示备用 UI
  → 这是一个纯函数，不能有副作用

Commit 阶段：
  componentDidCatch(error, errorInfo)
  → 可以执行副作用：错误上报、日志记录
  → 可以访问 this（类组件实例）
  → errorInfo.componentStack 包含出错的组件层级信息
```

### 与相关API的对比

| 对比维度 | getDerivedStateFromError | componentDidCatch |
|----------|------------------------|-------------------|
| 调用阶段 | Render 阶段 | Commit 阶段 |
| 是否静态方法 | 是（static） | 否（实例方法） |
| 参数 | error | error + errorInfo |
| 主要用途 | 更新 state 切换备用 UI | 错误日志记录和上报 |
| 能否有副作用 | 不能 | 能 |
| 能否访问 this | 不能 | 能 |

### 适用场景

- **错误上报：** 将错误信息发送到 Sentry、Bugsnag 等监控平台
- **日志记录：** 记录错误详情用于后续分析
- **错误统计：** 统计错误发生的频率和类型
- **用户提示：** 配合 getDerivedStateFromError 显示友好的错误页面

### 常见问题

#### componentStack 的内容是什么

**问题描述：** errorInfo.componentStack 包含什么信息。

**解决方案：**

```
componentStack 是一个字符串，包含出错组件的层级关系：

"
    in UnstableWidget (at App.tsx:42)
    in ErrorReporter (at App.tsx:38)
    in div (at App.tsx:37)
    in App (at index.tsx:6)
"

它类似于 JavaScript 的错误调用栈，但显示的是 React 组件的层级
而不是函数调用层级。在生产环境中组件名可能被压缩，
可以通过 displayName 或 Source Map 还原。
```

### 注意事项

- componentDidCatch 用于错误上报，getDerivedStateFromError 用于 UI 切换
- componentDidCatch 在 Commit 阶段调用，可以执行副作用
- errorInfo.componentStack 在生产环境中可能被压缩
- 不要在 componentDidCatch 中调用 setState 来切换 UI（用 getDerivedStateFromError）
- 开发模式下错误仍然会在控制台显示红色错误覆盖层

### 总结

componentDidCatch 在 Commit 阶段调用，接收 error 和 errorInfo（含组件栈），主要用于错误日志记录和上报到监控服务。与 getDerivedStateFromError 分工明确：后者在 Render 阶段更新 state 切换备用 UI，前者在 Commit 阶段执行副作用。两者配合构成完整的 Error Boundary。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## static getDerivedStateFromError

### 概念说明

`static getDerivedStateFromError` 是类组件的静态生命周期方法，当子组件树在渲染过程中抛出错误时被调用。它在 Render 阶段执行，接收抛出的错误对象作为参数，必须返回一个新的 state 对象来更新组件状态。通常用于将 `hasError` 设置为 `true`，从而在 render 方法中切换到备用 UI。

作为静态方法，getDerivedStateFromError 不能访问 `this`，不能执行副作用（如错误上报），只能纯粹地根据错误返回新的 state。这保证了它在 Render 阶段的纯函数特性，与并发渲染兼容。

### API 签名与参数

```typescript
static getDerivedStateFromError(error: Error): Partial<State>;
```

| 参数 | 类型 | 说明 |
|------|------|------|
| error | Error | 子组件抛出的错误对象 |

**返回值：** 新的 state 对象（部分更新），React 用它合并到当前 state。

### 基本示例

```tsx
// 示例说明：getDerivedStateFromError 的标准用法

import React, { Component, useState } from "react";

interface ErrorBoundaryState {
    hasError: boolean;
    errorMessage: string;
}

class ErrorBoundary extends Component<
    { children: React.ReactNode },
    ErrorBoundaryState
> {
    state: ErrorBoundaryState = {
        hasError: false,
        errorMessage: "",
    };

    // 静态方法：Render 阶段调用
    // 根据错误返回新的 state
    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        // 不能在这里执行副作用（如 console.log、fetch）
        // 只能返回 state 更新
        return {
            hasError: true,
            errorMessage: error.message,
        };
    }

    // Commit 阶段：执行副作用
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // 错误上报等副作用放在这里
        console.error("错误详情:", error, errorInfo.componentStack);
    }

    handleReset = () => {
        this.setState({ hasError: false, errorMessage: "" });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: 16, background: "#fff1f0", borderRadius: 8 }}>
                    <h3>渲染出错</h3>
                    <p>错误信息: {this.state.errorMessage}</p>
                    <button onClick={this.handleReset}>重试</button>
                </div>
            );
        }
        return this.props.children;
    }
}

// 根据错误类型显示不同 UI
class SmartErrorBoundary extends Component<
    { children: React.ReactNode },
    { errorType: "none" | "network" | "render" | "unknown" }
> {
    state = { errorType: "none" as const };

    static getDerivedStateFromError(error: Error) {
        // 根据错误类型返回不同的 state
        if (error.message.includes("network") || error.message.includes("fetch")) {
            return { errorType: "network" };
        }
        if (error.message.includes("render") || error.message.includes("undefined")) {
            return { errorType: "render" };
        }
        return { errorType: "unknown" };
    }

    render() {
        switch (this.state.errorType) {
            case "network":
                return <div>网络连接异常，请检查网络后重试</div>;
            case "render":
                return <div>页面渲染出错，请刷新页面</div>;
            case "unknown":
                return <div>发生未知错误</div>;
            default:
                return this.props.children;
        }
    }
}

export default ErrorBoundary;
```

### 内部原理

#### 在 React 渲染流程中的位置

```
子组件渲染 → 抛出 Error →

React 在 Render 阶段查找最近的 Error Boundary →

调用 getDerivedStateFromError(error)：
  → 返回 { hasError: true }
  → React 将返回值合并到组件 state
  → 使用新 state 重新执行 render()
  → render() 中 this.state.hasError 为 true
  → 返回备用 UI

Commit 阶段：
  → 将备用 UI 渲染到 DOM
  → 调用 componentDidCatch（错误上报）
```

### 与相关API的对比

| 对比维度 | getDerivedStateFromError | componentDidCatch |
|----------|------------------------|-------------------|
| 方法类型 | static（静态） | 实例方法 |
| 调用阶段 | Render | Commit |
| 能否访问 this | 不能 | 能 |
| 返回值 | 必须返回 state 更新 | void |
| 主要用途 | 切换备用 UI | 错误上报 |
| 副作用 | 不允许 | 允许 |

### 适用场景

- **UI 降级：** 错误发生时切换到备用界面
- **错误分类：** 根据不同错误类型显示不同的备用 UI
- **状态重置：** 保存错误信息用于后续的重试逻辑

### 常见问题

#### 为什么是静态方法

**问题描述：** 为什么 getDerivedStateFromError 要设计为 static。

**解决方案：**

```
设计为静态方法的原因：

1. Render 阶段的纯函数要求
   - Render 阶段可能被中断和重复执行（并发渲染）
   - 静态方法不能访问 this，天然无法执行副作用
   - 保证了与并发渲染的兼容性

2. 明确的职责划分
   - getDerivedStateFromError：纯粹的 state 计算
   - componentDidCatch：副作用执行
   - 两者互不干扰
```

### 注意事项

- 必须返回一个 state 更新对象（不能返回 undefined）
- 不能在其中执行副作用（副作用放在 componentDidCatch）
- 只需定义 getDerivedStateFromError 即可让类组件成为 Error Boundary
- 返回的 state 与现有 state 合并（类似 setState 的浅合并）
- 目前只有类组件支持此方法，函数组件暂无等价 Hook

### 总结

getDerivedStateFromError 是 Error Boundary 的核心方法，在 Render 阶段根据错误返回新 state 以切换备用 UI。作为静态方法不能访问 this、不能有副作用，保证与并发渲染兼容。与 componentDidCatch 配合：前者负责 UI 切换，后者负责错误上报。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Error Boundaries的粒度控制

### 概念说明

Error Boundary 的粒度决定了错误影响的范围。粒度太粗（比如只在根组件放一个 Error Boundary），一个小组件的错误就会导致整个页面显示错误 UI；粒度太细（每个组件都包一层 Error Boundary），代码冗余且维护成本高。合理的策略是在多个层级放置 Error Boundary，形成错误隔离区域。

常见的分层策略是：根级别（兜底，防止白屏）、页面级别（路由页面之间错误隔离）、模块级别（独立功能模块单独处理）、组件级别（高风险的第三方组件或实验性功能）。

### 基本示例

```tsx
// 示例说明：多层级 Error Boundary 的粒度控制

import React, { Component, Suspense } from "react";

// 通用 Error Boundary 工厂
class ErrorBoundary extends Component<
    { children: React.ReactNode; level: string; fallback?: React.ReactNode },
    { hasError: boolean }
> {
    state = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error(`[${this.props.level}] 错误:`, error.message);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div style={{ padding: 16, background: "#fff1f0", borderRadius: 8 }}>
                    <p>{this.props.level} 出现错误</p>
                    <button onClick={() => this.setState({ hasError: false })}>重试</button>
                </div>
            );
        }
        return this.props.children;
    }
}

// 根级别：防止整个应用白屏
function AppRoot() {
    return (
        <ErrorBoundary level="应用" fallback={<FullPageError />}>
            <App />
        </ErrorBoundary>
    );
}

function FullPageError() {
    return (
        <div style={{ textAlign: "center", padding: 100 }}>
            <h1>应用出现了问题</h1>
            <button onClick={() => window.location.reload()}>刷新页面</button>
        </div>
    );
}

// 页面级别：不同路由页面互不影响
function App() {
    return (
        <div>
            <nav>导航栏（不会受子页面错误影响）</nav>

            {/* 页面级 Error Boundary */}
            <ErrorBoundary level="仪表盘页面">
                <DashboardPage />
            </ErrorBoundary>
        </div>
    );
}

// 模块级别：独立功能模块隔离
function DashboardPage() {
    return (
        <div>
            <h1>仪表盘</h1>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* 图表模块出错不影响数据表格 */}
                <ErrorBoundary level="图表模块">
                    <ChartModule />
                </ErrorBoundary>

                {/* 数据表格出错不影响图表 */}
                <ErrorBoundary level="数据表格">
                    <DataTableModule />
                </ErrorBoundary>

                {/* 第三方组件单独隔离 */}
                <ErrorBoundary level="第三方地图">
                    <ThirdPartyMap />
                </ErrorBoundary>

                <ErrorBoundary level="通知模块">
                    <NotificationModule />
                </ErrorBoundary>
            </div>
        </div>
    );
}

// 模拟各模块组件
function ChartModule() { return <div>图表内容</div>; }
function DataTableModule() { return <div>数据表格</div>; }
function ThirdPartyMap() { return <div>第三方地图</div>; }
function NotificationModule() { return <div>通知列表</div>; }

export default AppRoot;
```

**运行效果：** 图表模块崩溃时只显示图表区域的错误 UI，数据表格、地图、通知模块正常工作。页面级崩溃只影响当前页面，导航栏正常。

### 与相关API的对比

| 粒度级别 | 错误影响范围 | 适用场景 | 数量 |
|---------|------------|---------|------|
| 根级别 | 整个应用 | 兜底防白屏 | 1个 |
| 页面级别 | 单个路由页面 | 路由页面隔离 | 每个路由1个 |
| 模块级别 | 独立功能区域 | 功能模块隔离 | 按功能划分 |
| 组件级别 | 单个组件 | 高风险组件隔离 | 按需添加 |

### 适用场景

- **根级别：** 所有应用必须有，防止白屏
- **页面级别：** 多页面应用，路由切换时隔离
- **模块级别：** Dashboard、工作台等多模块页面
- **组件级别：** 第三方组件、用户生成内容渲染、实验性功能

### 常见问题

#### 如何确定 Error Boundary 的粒度

**解决方案：**

```
判断标准：

1. 这个区域的错误是否应该影响其他区域？
   → 不应该 → 加 Error Boundary 隔离

2. 这个区域是否来自不可控的代码？
   → 是（第三方库、用户输入渲染）→ 加 Error Boundary

3. 这个区域是否是实验性功能？
   → 是 → 加 Error Boundary

4. 加了 Error Boundary 后维护成本高吗？
   → 高 → 合并到更粗的粒度

实践建议：
- 根级别：必须有
- 路由级别：推荐有
- 模块级别：按需添加
- 组件级别：谨慎添加（避免过度）
```

### 注意事项

- 每个应用至少需要一个根级别的 Error Boundary
- 不要给每个组件都加 Error Boundary（过度隔离）
- Error Boundary 的 fallback UI 应该与其粒度匹配
- 根级别显示全屏错误页，模块级别显示区域错误提示
- 嵌套 Error Boundary 时，错误被最近的 Boundary 捕获

### 总结

Error Boundary 的粒度控制是一种分层防御策略：根级别兜底防白屏、页面级别隔离路由、模块级别隔离功能区域、组件级别隔离高风险组件。粒度太粗影响范围大，太细维护成本高，需要根据实际场景平衡。每个应用至少要有根级别的 Error Boundary。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Server Components(RSC)的服务端执行

### 概念说明

React Server Components（RSC）是 React 18 引入的全新组件类型，在服务端执行渲染，其 JavaScript 代码不会被发送到客户端浏览器。Server Components 可以直接访问服务端资源（数据库、文件系统、内部API），渲染结果以一种特殊的序列化格式（RSC Payload）发送到客户端，由客户端 React 运行时将其整合到组件树中。

与传统的服务端渲染（SSR）不同，SSR 将组件渲染为 HTML 字符串发送到客户端后还需要"水合"（Hydration），客户端仍然需要下载全部组件的 JavaScript。而 Server Components 的代码完全不发送到客户端，真正实现了零客户端 JS 开销。

### 基本示例

```tsx
// 示例说明：Server Component 直接访问数据库

// app/page.tsx — 这是一个 Server Component（Next.js 中默认）
// 注意：没有 "use client" 指令，所以是 Server Component

// 可以直接导入服务端专用的库
import { db } from "@/lib/database";

// Server Component：在服务端执行
async function ProductList() {
    // 直接查询数据库，不需要 API 层
    const products = await db.query("SELECT * FROM products ORDER BY created_at DESC LIMIT 20");

    // 可以访问服务端环境变量
    const apiKey = process.env.INTERNAL_API_KEY;

    // 可以读取文件系统
    // const config = await fs.readFile("./config.json", "utf-8");

    return (
        <div>
            <h1>商品列表</h1>
            <ul>
                {products.map((product: any) => (
                    <li key={product.id}>
                        <h3>{product.name}</h3>
                        <p>价格: ¥{product.price}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// Server Component 可以是 async 函数
async function UserProfile({ userId }: { userId: string }) {
    // 直接调用内部服务，不经过公开 API
    const user = await fetch(`http://internal-service/users/${userId}`, {
        headers: { Authorization: `Bearer ${process.env.SERVICE_TOKEN}` },
    }).then(r => r.json());

    return (
        <div>
            <h2>{user.name}</h2>
            <p>{user.email}</p>
        </div>
    );
}

export default ProductList;
```

### 内部原理

#### RSC 的执行流程

```
客户端请求页面 →

服务端：
1. 执行 Server Component 函数（包括 async/await）
2. 直接访问数据库/文件系统/内部 API
3. 将渲染结果序列化为 RSC Payload（特殊的 JSON 格式）
4. RSC Payload 发送到客户端

客户端：
1. 接收 RSC Payload
2. React 运行时将 RSC Payload 解析为虚拟 DOM
3. 与 Client Components 的虚拟 DOM 合并
4. 渲染到页面

关键区别：
- Server Component 的 JS 代码不在 bundle 中
- Server Component 不能使用 useState、useEffect 等 Hook
- Server Component 不能添加事件处理器（onClick 等）
```

### 与相关API的对比

| 对比维度 | Server Components | SSR | Client Components |
|----------|-----------------|-----|-------------------|
| 执行环境 | 仅服务端 | 服务端 + 客户端 | 仅客户端 |
| JS 发送到客户端 | 否 | 是（水合需要） | 是 |
| 访问数据库 | 直接访问 | 通过 API | 通过 API |
| 使用 Hook | 不能 | 能 | 能 |
| 事件处理 | 不能 | 能 | 能 |
| async 组件 | 支持 | 不支持 | 不支持 |

### 适用场景

- **数据获取：** 直接查询数据库，无需 API 层
- **静态内容：** 不需要交互的展示内容
- **大型依赖：** 使用大型库（如 markdown 解析器）而不增加客户端 bundle
- **敏感数据：** 在服务端处理 API 密钥、数据库凭据等

### 常见问题

#### Server Component 中不能使用 useState 和 useEffect

**问题描述：** 在 Server Component 中使用 Hook 会报错。

**解决方案：**

```tsx
// Server Component：不能用 Hook 和事件
// async function Page() {
//     const [count, setCount] = useState(0);  // 错误！
//     return <button onClick={() => {}}>点击</button>;  // 错误！
// }

// 需要交互的部分用 Client Component
// components/Counter.tsx
"use client";  // 标记为 Client Component

import { useState } from "react";

export function Counter() {
    const [count, setCount] = useState(0);
    return <button onClick={() => setCount(c => c + 1)}>计数: {count}</button>;
}

// Server Component 中导入 Client Component
// app/page.tsx
import { Counter } from "@/components/Counter";

async function Page() {
    const data = await db.query("SELECT * FROM items");
    return (
        <div>
            <h1>页面标题</h1>
            <Counter />  {/* Client Component 嵌入 Server Component */}
            <ul>{data.map((item: any) => <li key={item.id}>{item.name}</li>)}</ul>
        </div>
    );
}
```

### 注意事项

- Server Components 不能使用 useState、useEffect 等客户端 Hook
- Server Components 不能添加事件处理器
- Server Components 可以是 async 函数
- Server Components 的代码不会出现在客户端 bundle 中
- 需要框架支持（如 Next.js 13+）
- Server Components 可以导入 Client Components，反之不行
- 敏感数据（API 密钥等）可以安全地在 Server Components 中使用

### 总结

React Server Components 在服务端执行，可以直接访问数据库和文件系统，其 JavaScript 代码不发送到客户端。不能使用 Hook 和事件处理器，需要交互的部分通过 Client Components 实现。与 SSR 不同，RSC 实现了真正的零客户端 JS 开销。需要框架（如 Next.js）支持。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Server Components的零客户端JS

### 概念说明

React Server Components 的一个核心优势是"零客户端 JavaScript"——Server Component 的代码、它导入的库、以及它的依赖都不会出现在发送到浏览器的 JavaScript bundle 中。只有渲染结果（RSC Payload）被传输到客户端。

这对性能有巨大影响。比如一个 Server Component 使用了 `marked`（Markdown 解析库，约 50KB gzip）来渲染文章内容，这 50KB 完全不需要下载到用户浏览器。用户只收到渲染好的 HTML 结构。对于使用大量服务端工具库的应用，这可以显著减小客户端 bundle 大小，加快页面加载速度。

### 基本示例

```tsx
// 示例说明：Server Component 使用大型库而不增加客户端 bundle

// app/blog/[slug]/page.tsx — Server Component

// 这些库只在服务端执行，不会出现在客户端 bundle 中
import { marked } from "marked";           // ~50KB（不发送到客户端）
import hljs from "highlight.js";           // ~300KB（不发送到客户端）
import { sanitize } from "dompurify";      // ~30KB（不发送到客户端）
import { db } from "@/lib/database";

// Server Component：所有代码在服务端执行
async function BlogPost({ params }: { params: { slug: string } }) {
    // 直接查询数据库
    const post = await db.query(
        "SELECT * FROM posts WHERE slug = $1",
        [params.slug]
    );

    if (!post) {
        return <div>文章不存在</div>;
    }

    // 在服务端解析 Markdown（使用代码高亮）
    marked.setOptions({
        highlight: (code, lang) => {
            return hljs.highlightAuto(code, lang ? [lang] : undefined).value;
        },
    });
    const htmlContent = marked(post.content);

    // 在服务端净化 HTML（防止 XSS）
    const safeHtml = sanitize(htmlContent);

    // 渲染结果发送到客户端，marked/hljs/dompurify 的代码不发送
    return (
        <article>
            <h1>{post.title}</h1>
            <time>{new Date(post.created_at).toLocaleDateString("zh-CN")}</time>
            <div dangerouslySetInnerHTML={{ __html: safeHtml }} />
        </article>
    );
}

export default BlogPost;
```

**运行效果：** 用户浏览博客文章时，浏览器不需要下载 marked、highlight.js、dompurify 等库。页面加载更快，JavaScript bundle 更小。

### 内部原理

#### 客户端 Bundle 大小对比

```
传统 Client Component 方案：
  客户端需要下载：
  - React runtime          ~40KB
  - marked                 ~50KB
  - highlight.js           ~300KB
  - dompurify              ~30KB
  - 组件代码               ~5KB
  总计: ~425KB

Server Component 方案：
  客户端需要下载：
  - React runtime          ~40KB
  - RSC Payload            ~2KB（渲染结果）
  总计: ~42KB

减少了 ~90% 的 JavaScript 传输量
```

#### RSC Payload 的传输格式

```
Server Component 的渲染结果被序列化为 RSC Payload：

// 概念性的 RSC Payload 格式
{
    type: "article",
    props: {},
    children: [
        { type: "h1", children: "文章标题" },
        { type: "time", children: "2026-01-15" },
        { type: "div", props: { dangerouslySetInnerHTML: { __html: "<p>...</p>" } } }
    ]
}

// 这是一种特殊的流式 JSON 格式
// 只包含渲染结果，不包含组件逻辑代码
```

### 与相关API的对比

| 对比维度 | Server Component | Client Component |
|----------|-----------------|-----------------|
| JS Bundle 包含 | 不包含 | 包含 |
| 依赖库传输 | 不传输 | 全部传输 |
| 适合大型库 | 非常适合 | Bundle 会很大 |
| 首次加载性能 | 极好 | 取决于 Bundle 大小 |
| 交互能力 | 无（纯展示） | 完整交互 |

### 适用场景

- **Markdown/富文本渲染：** marked、remark 等解析库不传输
- **代码高亮：** highlight.js、Prism 等库不传输
- **日期格式化：** date-fns、dayjs 等库不传输
- **数据处理：** lodash 等工具库的服务端使用
- **模板渲染：** 邮件模板、PDF 生成等

### 常见问题

#### Server Component 的 CSS 如何处理

**问题描述：** 如果 Server Component 需要样式，CSS 是否也不发送。

**解决方案：**

```
CSS 仍然需要发送到客户端（浏览器需要它来渲染样式）。

零客户端 JS 指的是 JavaScript 代码不发送，不是所有资源：
- JS 代码：不发送（Server Component 的核心优势）
- CSS 样式：发送（浏览器渲染需要）
- 图片等静态资源：正常加载

CSS 处理方式：
- CSS Modules：在服务端解析类名，CSS 文件正常发送
- Tailwind CSS：只发送使用到的类的样式
- CSS-in-JS：部分库与 Server Components 不兼容
```

### 注意事项

- Server Component 的 JS 代码和依赖库不出现在客户端 bundle
- CSS 和静态资源仍然需要发送到客户端
- 使用大型库（Markdown 解析、代码高亮等）时优势明显
- 小型纯展示组件也适合作为 Server Component
- Client Components 的代码仍然需要发送到客户端
- 合理划分 Server/Client 边界是优化的关键

### 总结

Server Components 的零客户端 JS 特性意味着组件代码和依赖库不出现在浏览器的 JavaScript bundle 中。对于使用大型库（Markdown 解析、代码高亮等）的场景，可以减少 90% 以上的 JS 传输量。只有渲染结果（RSC Payload）被发送到客户端。CSS 和静态资源仍然正常传输。合理划分 Server/Client 边界是性能优化的关键。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Server Components与Client Components边界

### 概念说明

在 React Server Components 架构中，组件树由 Server Components 和 Client Components 混合组成。两者之间存在一个"边界"：从 Server Component 到 Client Component 的切换点。这个边界通过 `"use client"` 指令标记——文件顶部添加该指令的组件及其导入的所有模块都会被视为 Client Components。

理解这个边界至关重要：Server Components 可以导入和渲染 Client Components，但 Client Components 不能导入 Server Components（因为 Server Component 的代码不在客户端 bundle 中）。不过 Client Components 可以通过 `children` 或其他 props 接收 Server Components 的渲染结果。

### 基本示例

```tsx
// 示例说明：Server/Client 边界的划分

// ===== Server Component（默认）=====
// app/page.tsx — 没有 "use client"，是 Server Component

import { db } from "@/lib/database";
import { ProductCard } from "@/components/ProductCard";   // Client Component
import { AddToCartButton } from "@/components/AddToCartButton";  // Client Component

async function ProductPage({ params }: { params: { id: string } }) {
    // 服务端：直接查询数据库
    const product = await db.query("SELECT * FROM products WHERE id = $1", [params.id]);

    return (
        <div>
            {/* Server Component 渲染静态内容 */}
            <h1>{product.name}</h1>
            <p>{product.description}</p>

            {/* Server Component 可以导入和渲染 Client Component */}
            <ProductCard product={product} />

            {/* 将数据作为 props 传递给 Client Component */}
            <AddToCartButton productId={product.id} price={product.price} />
        </div>
    );
}

export default ProductPage;

// ===== Client Component =====
// components/AddToCartButton.tsx
// "use client";  // 标记为 Client Component

// import { useState } from "react";

// export function AddToCartButton({ productId, price }: { productId: string; price: number }) {
//     const [added, setAdded] = useState(false);
//
//     const handleClick = () => {
//         // 客户端交互逻辑
//         addToCart(productId);
//         setAdded(true);
//     };
//
//     return (
//         <button onClick={handleClick} disabled={added}>
//             {added ? "已加入购物车" : `加入购物车 ¥${price}`}
//         </button>
//     );
// }

// ===== Client Component 通过 children 接收 Server Component =====
// components/Sidebar.tsx
// "use client";

// export function Sidebar({ children }: { children: React.ReactNode }) {
//     const [isOpen, setIsOpen] = useState(true);
//     return (
//         <aside style={{ display: isOpen ? "block" : "none" }}>
//             <button onClick={() => setIsOpen(o => !o)}>切换</button>
//             {children}  {/* 这里可以渲染 Server Component 的结果 */}
//         </aside>
//     );
// }

// app/layout.tsx — Server Component
// import { Sidebar } from "@/components/Sidebar";
// import { NavigationMenu } from "@/components/NavigationMenu"; // Server Component
//
// export default function Layout({ children }) {
//     return (
//         <div>
//             <Sidebar>
//                 <NavigationMenu />  {/* Server Component 作为 children 传入 */}
//             </Sidebar>
//             <main>{children}</main>
//         </div>
//     );
// }
```

### 内部原理

#### 边界规则

```
规则1：Server Component 可以导入 Client Component
  Server → Client ✅
  // Server Component 中
  import { Button } from "./Button";  // "use client" 组件
  return <Button />;

规则2：Client Component 不能导入 Server Component
  Client → Server ❌
  // "use client" 组件中
  // import { ServerList } from "./ServerList";  // 错误！

规则3：Client Component 可以通过 props 接收 Server Component
  Server → Client(children=Server) ✅
  // Server Component 中
  <ClientLayout>
      <ServerContent />  {/* 作为 children 传递 */}
  </ClientLayout>

规则4："use client" 是一个边界标记
  标记了 "use client" 的文件及其导入的所有模块都是客户端代码
```

### 与相关API的对比

| 对比维度 | Server Component | Client Component |
|----------|-----------------|-----------------|
| 标记方式 | 默认（无指令） | "use client" |
| 执行环境 | 服务端 | 客户端（也可 SSR） |
| useState/useEffect | 不可用 | 可用 |
| 事件处理 | 不可用 | 可用 |
| async 组件 | 支持 | 不支持 |
| 数据库访问 | 直接访问 | 通过 API |
| JS Bundle | 不包含 | 包含 |

### 适用场景

**适合 Server Component：**
- 数据获取和展示
- 访问服务端资源
- 使用大型库（不影响 bundle）
- 静态内容渲染

**适合 Client Component：**
- 用户交互（点击、输入、拖拽）
- 使用 useState、useEffect 等 Hook
- 浏览器 API（localStorage、geolocation）
- 第三方客户端库（图表、地图）

### 常见问题

#### 如何决定组件应该是 Server 还是 Client

**解决方案：**

```
判断标准：

1. 需要用户交互（onClick、onChange）？ → Client
2. 需要 useState/useEffect？          → Client
3. 需要浏览器 API？                   → Client
4. 需要直接访问数据库？               → Server
5. 纯展示不需要交互？                 → Server
6. 使用大型库但只需要结果？           → Server

原则：尽量让边界下推
  → Server Component 在上层，Client Component 在下层
  → 只将需要交互的最小部分标记为 "use client"
```

### 注意事项

- "use client" 必须在文件最顶部（在 import 之前）
- 标记 "use client" 后，该文件导入的所有模块都成为客户端代码
- Server → Client 可以传递 props，但 props 必须可序列化
- 不能传递函数、类实例等不可序列化的值作为 props
- 尽量将 "use client" 边界下推到需要交互的最小组件

### 总结

Server Components 和 Client Components 通过 "use client" 指令划分边界。Server Component 可以导入 Client Component，反之不行（但可以通过 children 传递）。边界应尽量下推——只将需要交互的最小部分标记为 Client Component。跨边界传递的 props 必须可序列化。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## React Server Actions的服务器函数

### 概念说明

Server Actions 是 React 19 引入的特性，允许在客户端组件中直接调用服务端函数。通过 `"use server"` 指令标记的函数会在服务端执行，客户端调用时 React 会自动发起一个 HTTP 请求到服务端，执行该函数并返回结果。这消除了手动创建 API 路由的需要。

Server Actions 的典型使用场景是表单提交和数据变更（增删改操作）。它们可以直接在 `<form>` 的 `action` 属性中使用，也可以在事件处理器中通过 `startTransition` 调用。Server Actions 与 React 的并发特性集成，支持乐观更新、错误处理和自动重新验证。

### API 签名与参数

```typescript
// 方式1：在单独文件中定义
// actions.ts
"use server";

export async function createPost(formData: FormData) {
    // 在服务端执行
}

// 方式2：在 Server Component 中内联定义
async function Page() {
    async function submitForm(formData: FormData) {
        "use server";
        // 在服务端执行
    }
    return <form action={submitForm}>...</form>;
}
```

### 基本示例

```tsx
// 示例说明：Server Actions 实现表单提交

// app/actions.ts — 服务端函数文件
// "use server";
//
// import { db } from "@/lib/database";
// import { revalidatePath } from "next/cache";
//
// // Server Action：创建评论
// export async function createComment(formData: FormData) {
//     // 在服务端执行：直接操作数据库
//     const content = formData.get("content") as string;
//     const postId = formData.get("postId") as string;
//
//     // 参数校验
//     if (!content?.trim()) {
//         return { error: "评论内容不能为空" };
//     }
//
//     // 写入数据库
//     await db.query(
//         "INSERT INTO comments (post_id, content, created_at) VALUES ($1, $2, NOW())",
//         [postId, content]
//     );
//
//     // 重新验证页面数据
//     revalidatePath(`/posts/${postId}`);
//
//     return { success: true };
// }
//
// // Server Action：删除评论
// export async function deleteComment(commentId: string) {
//     await db.query("DELETE FROM comments WHERE id = $1", [commentId]);
//     revalidatePath("/posts");
//     return { success: true };
// }

// app/posts/[id]/page.tsx — Server Component
// import { createComment } from "@/app/actions";
// import { CommentForm } from "@/components/CommentForm";
//
// async function PostPage({ params }: { params: { id: string } }) {
//     const comments = await db.query(
//         "SELECT * FROM comments WHERE post_id = $1",
//         [params.id]
//     );
//
//     return (
//         <div>
//             <h1>文章评论</h1>
//             {/* 将 Server Action 传递给 Client Component */}
//             <CommentForm postId={params.id} action={createComment} />
//             <ul>
//                 {comments.map(c => <li key={c.id}>{c.content}</li>)}
//             </ul>
//         </div>
//     );
// }

// components/CommentForm.tsx — Client Component
"use client";

import { useActionState } from "react";

// 表单提交使用 Server Action
export function CommentForm({ postId, action }: {
    postId: string;
    action: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
}) {
    // useActionState 管理表单状态
    const [state, formAction, isPending] = useActionState(
        async (prevState: any, formData: FormData) => {
            return await action(formData);
        },
        { error: "", success: false }
    );

    return (
        <form action={formAction}>
            <input type="hidden" name="postId" value={postId} />
            <textarea name="content" placeholder="写下你的评论..." required />
            {state.error && <p style={{ color: "red" }}>{state.error}</p>}
            <button type="submit" disabled={isPending}>
                {isPending ? "提交中..." : "提交评论"}
            </button>
        </form>
    );
}

export default CommentForm;
```

### 内部原理

#### Server Actions 的执行流程

```
客户端提交表单 →

1. React 序列化 FormData
2. 发送 POST 请求到服务端（自动处理）
3. 服务端执行 Server Action 函数
4. 函数直接操作数据库/调用内部服务
5. 返回结果（序列化后发送到客户端）
6. 客户端更新 UI（自动重新渲染）

整个过程不需要手动创建 API 路由
```

### 与相关API的对比

| 对比维度 | Server Actions | 传统 API 路由 | 客户端 fetch |
|----------|--------------|-------------|-------------|
| 定义方式 | "use server" 函数 | 单独的 API 文件 | 无（直接调用） |
| 类型安全 | 端到端类型推断 | 手动定义类型 | 手动定义类型 |
| 表单集成 | form action 直接使用 | 手动 onSubmit + fetch | 手动管理 |
| 渐进增强 | 支持（JS 禁用也能工作） | 不支持 | 不支持 |
| 代码量 | 少（无需 API 层） | 多（需要路由+处理器） | 中 |

### 适用场景

- **表单提交：** 创建、更新、删除操作
- **数据变更：** 数据库写入操作
- **文件上传：** 处理 FormData 中的文件
- **服务端校验：** 在服务端验证数据

### 常见问题

#### Server Actions 的安全性

**问题描述：** Server Actions 暴露了服务端函数，是否安全。

**解决方案：**

```tsx
// Server Actions 本质上是 HTTP 端点
// 必须进行身份验证和授权检查

// "use server";
// import { auth } from "@/lib/auth";
//
// export async function deletePost(postId: string) {
//     // 必须验证用户身份
//     const session = await auth();
//     if (!session) {
//         throw new Error("未登录");
//     }
//
//     // 必须验证权限
//     const post = await db.query("SELECT * FROM posts WHERE id = $1", [postId]);
//     if (post.author_id !== session.userId) {
//         throw new Error("无权删除");
//     }
//
//     // 必须校验输入
//     if (!postId || typeof postId !== "string") {
//         throw new Error("参数无效");
//     }
//
//     await db.query("DELETE FROM posts WHERE id = $1", [postId]);
// }
```

### 注意事项

- "use server" 标记的函数在服务端执行，但作为 HTTP 端点暴露
- 必须在 Server Actions 中进行身份验证和授权检查
- 参数和返回值必须可序列化
- Server Actions 可以在 form action 中使用（支持渐进增强）
- 需要框架支持（如 Next.js 14+）
- 不要在 Server Actions 中暴露敏感的内部实现细节

### 总结

Server Actions 通过 "use server" 指令定义服务端函数，客户端可以直接调用而无需手动创建 API 路由。与 form action 集成支持渐进增强，配合 useActionState 管理表单状态。本质上是 HTTP 端点，必须进行身份验证和输入校验。适用于表单提交、数据变更等场景。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useActionState的表单状态管理

### 概念说明

`useActionState` 是 React 19 引入的 Hook，专门用于管理表单提交的状态。它将一个异步 action 函数（通常是 Server Action）包装起来，自动跟踪提交状态（pending/error/success）并提供上一次 action 的返回值。这让表单状态管理变得声明式，不需要手动维护 loading、error 等状态变量。

useActionState 返回三个值：当前 state（action 的最新返回值）、一个包装后的 formAction（可以直接传给 form 的 action 属性）、以及 isPending（表示 action 是否正在执行）。它的前身是 React DOM 中实验性的 `useFormState`，在 React 19 中被提升为 React 核心 API 并更名。

### API 签名与参数

```typescript
const [state, formAction, isPending] = useActionState<State, Payload>(
    action: (previousState: State, payload: Payload) => State | Promise<State>,
    initialState: State,
    permalink?: string
);
```

| 参数 | 类型 | 说明 |
|------|------|------|
| action | (prevState, payload) => State | 表单提交时调用的函数 |
| initialState | State | state 的初始值 |
| permalink | string (可选) | 渐进增强时的表单提交 URL |

| 返回值 | 类型 | 说明 |
|--------|------|------|
| state | State | action 的最新返回值 |
| formAction | (payload) => void | 传给 form action 的包装函数 |
| isPending | boolean | action 是否正在执行 |

### 基本示例

```tsx
// 示例说明：useActionState 管理注册表单的提交状态

"use client";

import { useActionState } from "react";

// 定义表单状态类型
interface FormState {
    message: string;
    errors: Record<string, string>;
    success: boolean;
}

// 模拟 Server Action（实际项目中用 "use server" 标记）
async function registerUser(prevState: FormState, formData: FormData): Promise<FormState> {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 1500));

    const username = formData.get("username") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    // 服务端校验
    const errors: Record<string, string> = {};

    if (!username || username.length < 3) {
        errors.username = "用户名至少3个字符";
    }
    if (!email || !email.includes("@")) {
        errors.email = "请输入有效的邮箱地址";
    }
    if (!password || password.length < 6) {
        errors.password = "密码至少6个字符";
    }

    if (Object.keys(errors).length > 0) {
        return { message: "请修正以下错误", errors, success: false };
    }

    // 模拟注册成功
    return { message: `用户 ${username} 注册成功！`, errors: {}, success: true };
}

function RegisterForm() {
    // useActionState 管理表单状态
    const [state, formAction, isPending] = useActionState(registerUser, {
        message: "",
        errors: {},
        success: false,
    });

    return (
        <form action={formAction} style={{ maxWidth: 400 }}>
            <h2>用户注册</h2>

            {/* 全局消息 */}
            {state.message && (
                <p style={{ color: state.success ? "green" : "red" }}>
                    {state.message}
                </p>
            )}

            {/* 用户名 */}
            <div style={{ marginBottom: 12 }}>
                <label>用户名</label>
                <input name="username" type="text" disabled={isPending} />
                {state.errors.username && (
                    <span style={{ color: "red", fontSize: 12 }}>{state.errors.username}</span>
                )}
            </div>

            {/* 邮箱 */}
            <div style={{ marginBottom: 12 }}>
                <label>邮箱</label>
                <input name="email" type="email" disabled={isPending} />
                {state.errors.email && (
                    <span style={{ color: "red", fontSize: 12 }}>{state.errors.email}</span>
                )}
            </div>

            {/* 密码 */}
            <div style={{ marginBottom: 12 }}>
                <label>密码</label>
                <input name="password" type="password" disabled={isPending} />
                {state.errors.password && (
                    <span style={{ color: "red", fontSize: 12 }}>{state.errors.password}</span>
                )}
            </div>

            <button type="submit" disabled={isPending}>
                {isPending ? "注册中..." : "注册"}
            </button>
        </form>
    );
}

export default RegisterForm;
```

**运行效果：** 提交表单时按钮显示"注册中..."，输入框禁用。校验失败时显示对应字段的错误提示。注册成功时显示成功消息。

### 内部原理

#### useActionState 的工作流程

```
初始状态：
  state = initialState
  isPending = false

用户提交表单 →
  isPending = true（UI 可以显示 loading）
  调用 action(prevState, formData)

action 执行完毕 →
  state = action 的返回值
  isPending = false
  组件重新渲染，显示最新 state
```

### 与相关API的对比

| 对比维度 | useActionState | 手动 useState + fetch | useTransition |
|----------|---------------|---------------------|--------------|
| 状态管理 | 自动（state/isPending） | 手动（loading/error/data） | 只有 isPending |
| 表单集成 | form action 直接使用 | onSubmit 手动处理 | 不适用表单 |
| 渐进增强 | 支持（JS 禁用也能提交） | 不支持 | 不支持 |
| 返回值访问 | 通过 state 获取 | 手动保存 | 无 |

### 适用场景

- **表单提交：** 注册、登录、评论等表单
- **数据变更：** 创建、更新、删除操作
- **多步骤表单：** 每步的校验结果反馈
- **Server Actions 集成：** 配合 "use server" 函数使用

### 常见问题

#### useActionState 与 useFormStatus 的区别

**问题描述：** 两者都和表单状态有关，什么时候用哪个。

**解决方案：**

```tsx
// useActionState：管理 action 的返回值和 pending 状态
// 用在定义 form 的组件中
const [state, formAction, isPending] = useActionState(action, initialState);
// state = action 的返回值（如错误信息、成功标记）
// isPending = 是否正在提交

// useFormStatus：获取最近父级 form 的提交状态
// 用在 form 内部的子组件中
// function SubmitButton() {
//     const { pending } = useFormStatus();
//     return <button disabled={pending}>提交</button>;
// }
// 注意：useFormStatus 必须在 <form> 内部的子组件中使用
```

### 注意事项

- useActionState 是 React 19 的新 API（从 useFormState 更名而来）
- action 函数接收 prevState 作为第一个参数，payload（FormData）作为第二个
- isPending 在 action 执行期间为 true
- 支持渐进增强：JS 禁用时表单仍可提交（需要 permalink 参数）
- state 的初始值通过第二个参数传入
- 配合 Server Actions 使用效果最好

### 总结

useActionState 是 React 19 的表单状态管理 Hook，自动跟踪 action 的返回值和提交状态。返回 state（最新结果）、formAction（包装后的提交函数）和 isPending（加载状态）。配合 Server Actions 和 form action 使用，支持渐进增强。比手动管理 loading/error/data 状态更简洁和声明式。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useOptimistic的乐观更新

### 概念说明

`useOptimistic` 是 React 19 引入的 Hook，用于实现乐观更新（Optimistic Update）。乐观更新是一种 UI 策略：在异步操作（如网络请求）完成之前，先假设操作会成功，立即在 UI 上显示预期结果。如果操作最终失败，再回滚到之前的状态。

这种策略让应用感觉更快、更流畅——用户不需要等待服务器响应就能看到操作结果。常见的例子包括：点赞后立即显示已点赞状态、发送消息后立即显示在聊天列表中、删除项目后立即从列表中移除等。

useOptimistic 接收当前的真实状态和一个更新函数，返回乐观状态和触发乐观更新的函数。当异步操作完成后（无论成功还是失败），React 会自动将乐观状态回退到真实状态。

### API 签名与参数

```typescript
const [optimisticState, addOptimistic] = useOptimistic<State, UpdateValue>(
    state: State,
    updateFn: (currentState: State, optimisticValue: UpdateValue) => State
);
```

| 参数 | 类型 | 说明 |
|------|------|------|
| state | State | 当前的真实状态 |
| updateFn | (state, value) => State | 计算乐观状态的纯函数 |

| 返回值 | 类型 | 说明 |
|--------|------|------|
| optimisticState | State | 乐观状态（操作中是预期值，完成后恢复真实值） |
| addOptimistic | (value) => void | 触发乐观更新的函数 |

### 基本示例

```tsx
// 示例说明：点赞功能的乐观更新

"use client";

import { useOptimistic, useState, useTransition } from "react";

interface Message {
    id: string;
    text: string;
    likes: number;
    liked: boolean;
}

// 模拟 API 请求
async function toggleLikeAPI(messageId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    // 模拟偶尔失败
    if (Math.random() < 0.1) {
        throw new Error("网络错误");
    }
    return true;
}

function MessageList({ initialMessages }: { initialMessages: Message[] }) {
    const [messages, setMessages] = useState(initialMessages);
    const [isPending, startTransition] = useTransition();

    // useOptimistic：基于真实的 messages 计算乐观状态
    const [optimisticMessages, addOptimisticMessage] = useOptimistic(
        messages,
        // 更新函数：计算乐观状态
        (currentMessages: Message[], updatedId: string) => {
            return currentMessages.map(msg =>
                msg.id === updatedId
                    ? { ...msg, liked: !msg.liked, likes: msg.liked ? msg.likes - 1 : msg.likes + 1 }
                    : msg
            );
        }
    );

    const handleLike = (messageId: string) => {
        startTransition(async () => {
            // 立即显示乐观更新（不等待服务器）
            addOptimisticMessage(messageId);

            try {
                // 发送请求到服务器
                await toggleLikeAPI(messageId);

                // 请求成功：更新真实状态
                setMessages(prev =>
                    prev.map(msg =>
                        msg.id === messageId
                            ? { ...msg, liked: !msg.liked, likes: msg.liked ? msg.likes - 1 : msg.likes + 1 }
                            : msg
                    )
                );
            } catch (error) {
                // 请求失败：真实状态没变，乐观状态自动回滚
                console.error("点赞失败:", error);
            }
        });
    };

    return (
        <ul>
            {/* 渲染乐观状态而非真实状态 */}
            {optimisticMessages.map(msg => (
                <li key={msg.id} style={{ marginBottom: 12, padding: 12, border: "1px solid #eee" }}>
                    <p>{msg.text}</p>
                    <button
                        onClick={() => handleLike(msg.id)}
                        style={{ color: msg.liked ? "red" : "#999" }}
                    >
                        {msg.liked ? "已赞" : "点赞"} ({msg.likes})
                    </button>
                </li>
            ))}
        </ul>
    );
}

export default MessageList;
```

**运行效果：** 点击点赞按钮后立即切换状态和数字（不等待网络请求）。请求成功后保持状态。请求失败时自动回滚到之前的状态。

### 内部原理

#### 乐观更新的状态流转

```
初始状态：
  真实状态 messages = [{liked: false, likes: 0}]
  乐观状态 = 真实状态（相同）

用户点赞：
  addOptimisticMessage("msg-1")
  → 乐观状态 = [{liked: true, likes: 1}]（立即显示）
  → 真实状态 = [{liked: false, likes: 0}]（未变）
  → 发起网络请求...

请求成功：
  setMessages([{liked: true, likes: 1}])
  → 真实状态 = [{liked: true, likes: 1}]
  → 乐观状态 = 真实状态（自动同步）

请求失败：
  真实状态未改变 = [{liked: false, likes: 0}]
  → transition 结束后乐观状态回退到真实状态
  → UI 自动回滚
```

### 与相关API的对比

| 对比维度 | useOptimistic | 手动乐观更新 | 无乐观更新 |
|----------|-------------|-------------|-----------|
| UI 响应速度 | 即时 | 即时 | 等待请求完成 |
| 代码复杂度 | 低（声明式） | 高（手动管理回滚） | 低 |
| 回滚处理 | 自动 | 手动 | 不需要 |
| 与 React 集成 | 原生支持 | 需要额外逻辑 | 原生支持 |

### 适用场景

- **点赞/收藏：** 立即显示操作结果
- **消息发送：** 立即显示在聊天列表
- **列表删除：** 立即从列表中移除
- **表单提交：** 立即显示提交结果
- **评论发布：** 立即显示新评论

### 常见问题

#### 乐观更新失败后如何通知用户

**问题描述：** 状态回滚了，但用户可能没注意到。

**解决方案：**

```tsx
const handleLike = (messageId: string) => {
    startTransition(async () => {
        addOptimisticMessage(messageId);
        try {
            await toggleLikeAPI(messageId);
            setMessages(prev => /* 更新真实状态 */);
        } catch (error) {
            // 状态会自动回滚
            // 额外通知用户
            showToast("操作失败，请重试");
        }
    });
};
```

### 注意事项

- useOptimistic 是 React 19 的新 API
- 需要在 startTransition 或 Server Action 中使用 addOptimistic
- 更新函数（第二个参数）必须是纯函数
- 异步操作完成后乐观状态自动回退到真实状态
- 请求失败时需要额外通知用户（Toast 等），因为回滚可能不明显
- 不要在乐观状态上做需要服务端确认的操作

### 总结

useOptimistic 是 React 19 的乐观更新 Hook，在异步操作完成前立即显示预期结果。接收真实状态和更新函数，返回乐观状态和触发函数。请求成功后真实状态同步，失败后乐观状态自动回滚。适用于点赞、消息发送、删除等需要即时反馈的场景。需要在 startTransition 中使用。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## useFormStatus的表单提交状态

### 概念说明

`useFormStatus` 是 React 19 从 `react-dom` 包中提供的 Hook，用于获取最近父级 `<form>` 的提交状态。它返回一个对象，包含 `pending`（是否正在提交）、`data`（提交的 FormData）、`method`（提交方法）和 `action`（表单的 action 函数）。

useFormStatus 的核心价值在于：它让表单内部的子组件（如提交按钮、输入框）能够感知表单的提交状态，而不需要通过 props 逐层传递。这在构建可复用的表单组件时特别有用——一个通用的 SubmitButton 组件可以自动感知它所在表单的状态。

**关键限制：** useFormStatus 必须在 `<form>` 内部的子组件中调用，不能在定义 `<form>` 的同一组件中调用。

### API 签名与参数

```typescript
import { useFormStatus } from "react-dom";

const { pending, data, method, action } = useFormStatus();
```

| 返回属性 | 类型 | 说明 |
|---------|------|------|
| pending | boolean | 表单是否正在提交 |
| data | FormData / null | 提交中的 FormData 数据 |
| method | string | 提交方法（"get" 或 "post"） |
| action | Function / null | 表单的 action 函数引用 |

### 基本示例

```tsx
// 示例说明：useFormStatus 让子组件感知表单提交状态

"use client";

import { useFormStatus } from "react-dom";
import { useActionState } from "react";

// 通用提交按钮：自动感知所在表单的状态
function SubmitButton({ children }: { children: React.ReactNode }) {
    // 获取最近父级 form 的提交状态
    const { pending } = useFormStatus();

    return (
        <button
            type="submit"
            disabled={pending}
            style={{
                padding: "8px 24px",
                backgroundColor: pending ? "#ccc" : "#1677ff",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: pending ? "not-allowed" : "pointer",
            }}
        >
            {pending ? "提交中..." : children}
        </button>
    );
}

// 表单输入框：提交期间自动禁用
function FormInput({ label, name, type = "text" }: {
    label: string;
    name: string;
    type?: string;
}) {
    const { pending } = useFormStatus();

    return (
        <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 4 }}>{label}</label>
            <input
                name={name}
                type={type}
                disabled={pending}
                style={{
                    padding: "6px 12px",
                    border: "1px solid #d9d9d9",
                    borderRadius: 4,
                    width: "100%",
                    opacity: pending ? 0.6 : 1,
                }}
            />
        </div>
    );
}

// 提交状态指示器
function FormStatusIndicator() {
    const { pending, data } = useFormStatus();

    if (!pending) return null;

    // 可以读取正在提交的数据
    const username = data?.get("username");

    return (
        <div style={{ padding: 8, background: "#e6f7ff", borderRadius: 4, marginBottom: 12 }}>
            正在提交{username ? ` ${username} 的` : ""}数据...
        </div>
    );
}

// 模拟 Server Action
async function loginAction(prevState: any, formData: FormData) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const username = formData.get("username") as string;
    if (!username) return { error: "请输入用户名" };
    return { success: true, message: `欢迎, ${username}！` };
}

// 表单组件
function LoginForm() {
    const [state, formAction] = useActionState(loginAction, {});

    return (
        // useFormStatus 的子组件必须在 form 内部
        <form action={formAction} style={{ maxWidth: 360, padding: 24 }}>
            <h2>登录</h2>

            <FormStatusIndicator />

            {state.error && <p style={{ color: "red" }}>{state.error}</p>}
            {state.success && <p style={{ color: "green" }}>{state.message}</p>}

            {/* 这些子组件内部用 useFormStatus 自动感知状态 */}
            <FormInput label="用户名" name="username" />
            <FormInput label="密码" name="password" type="password" />
            <SubmitButton>登录</SubmitButton>
        </form>
    );
}

export default LoginForm;
```

**运行效果：** 提交表单时，SubmitButton 自动变为"提交中..."并禁用，所有 FormInput 变半透明并禁用，FormStatusIndicator 显示提交状态。无需通过 props 传递 pending 状态。

### 内部原理

#### useFormStatus 的作用域

```
组件树：
  LoginForm
    └── <form action={formAction}>
            ├── FormStatusIndicator   ← useFormStatus() ✅ 能获取状态
            ├── FormInput             ← useFormStatus() ✅ 能获取状态
            └── SubmitButton          ← useFormStatus() ✅ 能获取状态

注意：
  LoginForm 组件自身 ← useFormStatus() ❌ 获取不到（不在 form 内部）

useFormStatus 查找最近的父级 <form> 元素
如果没有父级 form，返回 { pending: false, data: null, method: null, action: null }
```

### 与相关API的对比

| 对比维度 | useFormStatus | useActionState 的 isPending | 手动 props 传递 |
|----------|-------------|---------------------------|----------------|
| 使用位置 | form 内部的子组件 | 定义 form 的组件 | 任意位置 |
| 获取方式 | 自动感知父级 form | Hook 返回值 | 显式传递 |
| 可复用性 | 高（通用组件） | 低（绑定特定 form） | 中 |
| 数据访问 | 可以读取 FormData | 可以读取 state | 取决于传递内容 |

### 适用场景

- **通用提交按钮：** 自动禁用和显示 loading
- **表单输入框：** 提交期间自动禁用
- **状态指示器：** 显示提交进度
- **组件库：** 构建感知表单状态的通用组件

### 常见问题

#### useFormStatus 在 form 外部调用

**问题描述：** 在定义 form 的同一组件中调用 useFormStatus 获取不到状态。

**解决方案：**

```tsx
// 错误：在定义 form 的组件中调用
// function MyForm() {
//     const { pending } = useFormStatus();  // 永远是 false！
//     return <form>...</form>;
// }

// 正确：在 form 内部的子组件中调用
function SubmitButton() {
    const { pending } = useFormStatus();  // 正常工作
    return <button disabled={pending}>提交</button>;
}

function MyForm() {
    return (
        <form action={someAction}>
            <SubmitButton />  {/* 在 form 内部 */}
        </form>
    );
}
```

### 注意事项

- useFormStatus 从 `react-dom` 导入，不是 `react`
- 必须在 `<form>` 内部的子组件中调用
- 感知的是最近父级 form 的状态
- pending 在 form action 执行期间为 true
- data 属性可以读取正在提交的 FormData
- 非常适合构建可复用的表单 UI 组件

### 总结

useFormStatus 让表单内部的子组件自动感知提交状态，无需 props 传递。返回 pending、data、method、action 四个属性。必须在 form 内部的子组件中调用，不能在定义 form 的组件中调用。适合构建通用的 SubmitButton、FormInput 等可复用组件。从 react-dom 导入。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Document Metadata的原生支持(title/meta)

### 概念说明

React 19 引入了对文档元数据（Document Metadata）的原生支持。在此之前，如果想在组件中动态修改页面的 `<title>`、`<meta>` 或 `<link>` 标签，需要使用第三方库（如 react-helmet）或框架的内置方案（如 Next.js 的 Head 组件）。React 19 允许直接在任意组件中渲染 `<title>`、`<meta>`、`<link>` 标签，React 会自动将它们提升（hoist）到文档的 `<head>` 中。

这个特性让组件可以自包含地管理自己需要的元数据，不需要依赖外部库或上层组件的配合。特别适合路由级别的页面标题设置、SEO 元标签管理等场景。

### 基本示例

```tsx
// 示例说明：React 19 中直接在组件内渲染元数据标签

import React from "react";

// 页面组件：直接渲染 title 和 meta 标签
function ProductPage({ product }: { product: { name: string; description: string; image: string } }) {
    return (
        <div>
            {/* 这些标签会被 React 自动提升到 <head> 中 */}
            <title>{product.name} - 商城</title>
            <meta name="description" content={product.description} />
            <meta property="og:title" content={product.name} />
            <meta property="og:description" content={product.description} />
            <meta property="og:image" content={product.image} />
            <link rel="canonical" href={`https://example.com/products/${product.name}`} />

            {/* 页面内容 */}
            <h1>{product.name}</h1>
            <p>{product.description}</p>
            <img src={product.image} alt={product.name} />
        </div>
    );
}

// 博客文章页面
function BlogPost({ post }: { post: { title: string; excerpt: string; author: string } }) {
    return (
        <article>
            {/* 文章特有的元数据 */}
            <title>{post.title} - 技术博客</title>
            <meta name="description" content={post.excerpt} />
            <meta name="author" content={post.author} />

            <h1>{post.title}</h1>
            <p>作者: {post.author}</p>
            <p>{post.excerpt}</p>
        </article>
    );
}

// 嵌套组件中也可以渲染元数据
function SEOTags({ title, description }: { title: string; description: string }) {
    return (
        <>
            <title>{title}</title>
            <meta name="description" content={description} />
        </>
    );
}

function AboutPage() {
    return (
        <div>
            {/* 通过子组件设置元数据 */}
            <SEOTags title="关于我们" description="了解我们的团队和使命" />
            <h1>关于我们</h1>
            <p>我们是一个技术团队...</p>
        </div>
    );
}

export default ProductPage;
```

**运行效果：** 渲染 ProductPage 时，浏览器标签页标题变为"商品名 - 商城"，页面的 meta 标签自动出现在 `<head>` 中。切换到 BlogPost 时，标题和 meta 自动更新。

### 内部原理

#### React 的元数据提升机制

```
组件渲染时：
  <div>
      <title>页面标题</title>       ← React 识别为元数据标签
      <meta name="description" />  ← React 识别为元数据标签
      <h1>内容</h1>                ← 普通 DOM 元素
  </div>

React 内部处理：
1. 识别 <title>、<meta>、<link> 等元数据标签
2. 不在原位置渲染，而是提升到 document.head
3. 更新时自动替换旧的同名标签
4. 组件卸载时自动清理

最终的 DOM 结构：
  <head>
      <title>页面标题</title>
      <meta name="description" content="..." />
  </head>
  <body>
      <div id="root">
          <div>
              <h1>内容</h1>   ← title 和 meta 不在这里
          </div>
      </div>
  </body>
```

### 与相关API的对比

| 对比维度 | React 19 原生 | react-helmet | Next.js Head |
|----------|-------------|-------------|-------------|
| 依赖 | 无（内置） | 第三方库 | 框架内置 |
| 使用方式 | 直接渲染标签 | Helmet 组件包裹 | Head 组件包裹 |
| SSR 支持 | 原生支持 | 需要额外配置 | 原生支持 |
| 去重处理 | 自动 | 自动 | 自动 |
| Bundle 大小 | 0KB | ~5KB | 0KB |

### 适用场景

- **页面标题：** 根据路由动态设置 document.title
- **SEO 标签：** description、keywords、Open Graph 等
- **社交媒体分享：** og:title、og:image、twitter:card 等
- **样式表加载：** 动态加载特定页面的 CSS

### 常见问题

#### 多个组件设置了不同的 title 怎么办

**问题描述：** 父组件和子组件都渲染了 `<title>` 标签。

**解决方案：**

```tsx
// React 会使用最后渲染的 <title>
// 通常是组件树中最深层的那个

function Layout() {
    return (
        <div>
            <title>默认标题 - 网站</title>  {/* 父级设置的 */}
            <main>
                <ProductPage />  {/* 子组件会覆盖 title */}
            </main>
        </div>
    );
}

function ProductPage() {
    // 这个 title 会覆盖 Layout 中的 title
    return (
        <div>
            <title>商品详情 - 网站</title>
            <h1>商品详情</h1>
        </div>
    );
}

// 最终页面标题是 "商品详情 - 网站"
```

### 注意事项

- React 19 新特性，之前版本不支持
- 支持的标签：`<title>`、`<meta>`、`<link>`
- 标签会被自动提升到 `<head>` 中
- 多个同名标签会去重（后渲染的覆盖先渲染的）
- 组件卸载时相关的元数据标签会被清理
- SSR 场景中元数据会包含在初始 HTML 中
- 在使用 Next.js 等框架时，可能仍然推荐使用框架自带的元数据方案

### 总结

React 19 原生支持在组件中渲染 `<title>`、`<meta>`、`<link>` 标签，React 自动将它们提升到 `<head>` 中。不需要第三方库（react-helmet），组件可以自包含地管理元数据。支持去重和自动清理。适用于动态页面标题、SEO 标签、社交分享标签等场景。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。



## 6.7 渲染与Diff算法

## 虚拟DOM的ReactElement对象结构

### 概念说明

虚拟 DOM（Virtual DOM）是 React 的核心概念之一。在 React 中，组件的渲染结果并不是直接生成真实的 DOM 节点，而是先生成一个轻量级的 JavaScript 对象来描述 UI 的结构，这个对象就是 ReactElement。ReactElement 是虚拟 DOM 的基本单元，每次调用 `React.createElement()` 或使用 JSX 语法时都会创建一个 ReactElement 对象。

ReactElement 是一个普通的不可变（immutable）JavaScript 对象，描述了"屏幕上应该显示什么"。它比真实 DOM 节点轻量得多——创建一个 ReactElement 只需要分配一个小对象，而创建一个真实 DOM 节点涉及浏览器内部的大量初始化工作。React 通过比较新旧 ReactElement 树的差异，计算出最少的 DOM 操作来更新页面。

### 基本示例

```tsx
// 示例说明：JSX 编译后生成 ReactElement 对象

import React from "react";

// JSX 写法
const element = <h1 className="title">Hello, React</h1>;

// 编译后等价于（React 17 之前）
const element2 = React.createElement(
    "h1",                       // type：元素类型
    { className: "title" },     // props：属性对象
    "Hello, React"              // children：子元素
);

// element 的实际结构（ReactElement 对象）
// {
//     $$typeof: Symbol(react.element),  // React 内部标记
//     type: "h1",                       // 元素类型
//     key: null,                        // 唯一标识
//     ref: null,                        // ref 引用
//     props: {
//         className: "title",
//         children: "Hello, React"
//     },
//     _owner: null                      // 创建该元素的组件
// }

// 组件元素
function Welcome({ name }: { name: string }) {
    return <h1>Hello, {name}</h1>;
}

const componentElement = <Welcome name="张三" />;
// {
//     $$typeof: Symbol(react.element),
//     type: Welcome,                    // type 是函数引用
//     key: null,
//     ref: null,
//     props: { name: "张三" }
// }

// 嵌套结构
const tree = (
    <div>
        <h1>标题</h1>
        <p>段落</p>
    </div>
);
// {
//     type: "div",
//     props: {
//         children: [
//             { type: "h1", props: { children: "标题" } },
//             { type: "p", props: { children: "段落" } }
//         ]
//     }
// }

export default function App() {
    // 可以用 console.log 查看 ReactElement 结构
    const el = <div id="test">内容</div>;
    console.log(el);
    return el;
}
```

### 内部原理

#### ReactElement 的创建过程

```javascript
// React.createElement 的简化实现
function createElement(type, config, ...children) {
    const props = {};
    let key = null;
    let ref = null;

    // 从 config 中提取 key 和 ref
    if (config != null) {
        if (config.key !== undefined) {
            key = "" + config.key;
        }
        if (config.ref !== undefined) {
            ref = config.ref;
        }
        // 其余属性放入 props
        for (const prop in config) {
            if (prop !== "key" && prop !== "ref") {
                props[prop] = config[prop];
            }
        }
    }

    // 处理 children
    if (children.length === 1) {
        props.children = children[0];
    } else if (children.length > 1) {
        props.children = children;
    }

    return {
        $$typeof: Symbol.for("react.element"),  // 安全标记（防止 XSS）
        type,
        key,
        ref,
        props,
        _owner: currentOwner,  // 内部使用
    };
}
```

#### $$typeof 的安全作用

```
$$typeof: Symbol.for("react.element")

这个 Symbol 标记有安全作用：
- JSON.parse 无法生成 Symbol 值
- 如果攻击者通过 JSON 注入恶意对象，缺少 $$typeof Symbol
- React 渲染时检查 $$typeof，非法对象会被拒绝
- 防止了通过 JSON 注入的 XSS 攻击
```

### 与相关API的对比

| 对比维度 | ReactElement | 真实 DOM 节点 | Fiber 节点 |
|----------|------------|-------------|-----------|
| 本质 | 普通 JS 对象 | 浏览器 DOM 对象 | React 内部工作对象 |
| 创建成本 | 极低 | 高（浏览器初始化） | 中 |
| 可变性 | 不可变 | 可变 | 可变 |
| 生命周期 | 每次渲染创建新的 | 持久存在于页面 | 跨渲染复用 |
| 属性数量 | 少（type/key/ref/props） | 多（数百个属性和方法） | 多（状态/指针/副作用） |

### 适用场景

- **理解 JSX 本质：** JSX 只是 createElement 的语法糖
- **性能分析：** 理解为什么虚拟 DOM 比直接操作 DOM 可以更高效
- **源码阅读：** ReactElement 是 React 渲染流程的起点
- **面试回答：** 虚拟 DOM 的本质是什么

### 常见问题

#### ReactElement 和 Fiber 节点的关系

**问题描述：** ReactElement 和 Fiber 有什么区别。

**解决方案：**

```
ReactElement：描述"应该渲染什么"
  → 每次渲染都创建新的（不可变）
  → 轻量级，只包含 type/key/ref/props

Fiber 节点：描述"如何渲染"
  → 首次创建后跨渲染复用（可变）
  → 包含状态、副作用、调度信息
  → 通过 child/sibling/return 组成树

流程：
  JSX → ReactElement → Fiber 节点 → 真实 DOM
```

### 注意事项

- ReactElement 是不可变的，创建后不能修改其属性
- 每次渲染都会创建新的 ReactElement 树
- key 和 ref 不会出现在 props 中（被单独提取）
- $$typeof 是 Symbol 类型，用于防止 XSS 注入
- React 17+ 使用新的 JSX Transform，不需要显式导入 React

### 总结

ReactElement 是虚拟 DOM 的基本单元，是一个描述 UI 结构的轻量级不可变 JavaScript 对象。由 JSX 编译或 React.createElement 创建，包含 type、key、ref、props 等属性。$$typeof Symbol 标记防止 XSS 注入。每次渲染创建新的 ReactElement 树，React 通过比较新旧树的差异最小化 DOM 操作。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 虚拟DOM的type/key/props/children

### 概念说明

ReactElement 对象的四个核心属性——`type`、`key`、`props`、`children`——完整地描述了一个 UI 元素的身份和内容。`type` 决定了元素是什么（DOM 标签还是组件），`key` 标识同级元素的唯一身份，`props` 携带元素的属性配置，`children` 描述元素的子内容。这四个属性是 React Reconciliation（协调）算法的核心输入，决定了元素是否可以复用、是否需要更新。

理解这四个属性的含义和作用，是掌握 React Diff 算法的前提。

### 基本示例

```tsx
// 示例说明：四个核心属性的具体值

import React from "react";

// === type 属性 ===
// DOM 元素：type 是标签名字符串
<div />           // type: "div"
<input />         // type: "input"
<span />          // type: "span"

// 函数组件：type 是函数引用
function MyButton() { return <button>点击</button>; }
<MyButton />      // type: MyButton（函数本身）

// 类组件：type 是类引用
// class MyClass extends React.Component { render() { return <div />; } }
// <MyClass />    // type: MyClass（类本身）

// Fragment：type 是 Symbol
<></>             // type: Symbol(react.fragment)

// === key 属性 ===
// 默认为 null
<div />           // key: null
// 列表中指定 key
<li key="item-1">苹果</li>  // key: "item-1"
// key 总是被转为字符串
<li key={42}>橙子</li>      // key: "42"

// === props 属性 ===
<div className="box" id="main" onClick={handleClick}>
    内容
</div>
// props: {
//     className: "box",
//     id: "main",
//     onClick: handleClick,
//     children: "内容"
// }

// === children 属性（在 props 内部）===
// 单个子元素：children 是该元素
<div><span>文本</span></div>
// props.children: { type: "span", props: { children: "文本" } }

// 多个子元素：children 是数组
<div>
    <h1>标题</h1>
    <p>段落</p>
</div>
// props.children: [
//     { type: "h1", props: { children: "标题" } },
//     { type: "p", props: { children: "段落" } }
// ]

// 纯文本：children 是字符串
<p>Hello</p>
// props.children: "Hello"

// 无子元素：children 不存在
<input />
// props: {}（没有 children 属性）

function App() {
    // 实际查看 ReactElement 结构
    const el = (
        <div className="container" key="main">
            <h1>标题</h1>
            <p>内容</p>
        </div>
    );
    console.log("type:", el.type);         // "div"
    console.log("key:", el.key);           // "main"
    console.log("props:", el.props);       // { className: "container", children: [...] }
    console.log("children:", el.props.children); // [ReactElement, ReactElement]

    return el;
}

export default App;
```

### 内部原理

#### 四个属性在 Reconciliation 中的作用

```
React 比较新旧元素时的判断逻辑：

1. 先比较 type
   - type 相同 → 可能复用，继续比较 props
   - type 不同 → 销毁旧元素，创建新元素

2. 同级比较时使用 key
   - key 相同 + type 相同 → 复用节点
   - key 不同 → 视为不同元素
   - key 为 null → 按位置顺序匹配

3. type 和 key 都匹配后比较 props
   - props 变化 → 更新属性（不重建 DOM）
   - props 不变 → 跳过更新

4. children 递归处理
   - 对每个子元素重复上述流程
```

### 与相关API的对比

| 属性 | 值类型 | 作用 | Diff 中的角色 |
|------|--------|------|-------------|
| type | string / Function / Class / Symbol | 标识元素类型 | 判断是否可复用（首要条件） |
| key | string / null | 标识同级元素身份 | 列表 Diff 时匹配节点 |
| props | object | 携带属性和配置 | 判断是否需要更新属性 |
| children | ReactElement / string / array / null | 描述子内容 | 递归 Diff 子树 |

### 适用场景

- **性能优化：** 理解 type 变化导致组件重建（状态丢失）
- **列表渲染：** 正确使用 key 避免不必要的 DOM 操作
- **条件渲染：** 同位置 type 变化时组件状态会重置
- **组件设计：** 理解 props 传递和 children 组合模式

### 常见问题

#### type 变化导致组件状态丢失

**问题描述：** 条件渲染时组件的 state 意外重置。

**解决方案：**

```tsx
// 问题：type 从 input 变成 textarea，状态丢失
// {isMultiline ? <textarea /> : <input />}
// 每次切换 isMultiline，type 变了，DOM 节点重建

// 方案1：保持相同的 type
// <input type={isMultiline ? "textarea" : "text"} />

// 方案2：给不同分支指定相同的 key
// {isMultiline
//     ? <textarea key="editor" />
//     : <input key="editor" />
// }
// key 相同但 type 不同，仍然会重建（但可以控制行为）
```

### 注意事项

- type 是 Diff 的首要判断条件，type 变了就一定重建
- key 不在 props 中，被 React 单独提取
- ref 也不在 props 中，被 React 单独提取
- children 是 props 的一个属性，不是独立的顶层字段
- ReactElement 是不可变的，不能修改已创建的元素

### 总结

ReactElement 的四个核心属性：type 标识元素类型（字符串或组件引用），key 标识同级身份（默认 null），props 携带属性配置，children 在 props 内部描述子内容。type 和 key 决定元素是否可复用，props 决定是否需要更新属性，children 触发递归 Diff。type 变化必然导致重建，key 变化被视为不同元素。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Reconciliation协调过程的两阶段

### 概念说明

React 的更新过程分为两个明确的阶段：Render 阶段和 Commit 阶段。Render 阶段负责计算新旧虚拟 DOM 的差异（Diff），确定哪些节点需要新增、更新或删除；Commit 阶段负责将这些变更实际应用到真实 DOM 上。

两个阶段的核心区别在于：Render 阶段是纯计算过程，不产生可见的副作用，在并发模式下可以被中断和重新开始；Commit 阶段是同步执行的，一旦开始就必须完成，因为它直接操作真实 DOM，中断会导致 UI 不一致。

### 基本示例

```tsx
// 示例说明：两个阶段在组件更新时的体现

import React, { useState, useEffect, useLayoutEffect } from "react";

function TwoPhaseDemo() {
    const [count, setCount] = useState(0);

    // ===== Render 阶段 =====
    // 组件函数体中的代码在 Render 阶段执行
    // 这里必须是纯计算，不能有副作用
    console.log("Render 阶段: 组件函数执行, count =", count);
    const doubled = count * 2;  // 纯计算

    // ===== Commit 阶段 =====
    // useLayoutEffect 在 Commit 阶段的 Layout 子阶段同步执行
    useLayoutEffect(() => {
        console.log("Commit - Layout 阶段: DOM 已更新，浏览器未绘制");
        // 可以读取 DOM 布局信息
    }, [count]);

    // useEffect 在 Commit 阶段之后异步执行
    useEffect(() => {
        console.log("Commit 后: 浏览器已绘制，执行副作用");
        // 可以发起网络请求、订阅等
    }, [count]);

    return (
        <div>
            <p>计数: {count}（翻倍: {doubled}）</p>
            <button onClick={() => setCount(c => c + 1)}>+1</button>
        </div>
    );
}

// 执行顺序：
// 1. 用户点击 → setState 触发更新
// 2. Render 阶段：组件函数执行，生成新的 ReactElement 树
// 3. Render 阶段：Diff 算法比较新旧树，标记变更
// 4. Commit - Before Mutation：读取 DOM 快照
// 5. Commit - Mutation：将变更应用到真实 DOM
// 6. Commit - Layout：执行 useLayoutEffect
// 7. 浏览器绘制
// 8. 执行 useEffect

export default TwoPhaseDemo;
```

### 内部原理

#### 两阶段的详细流程

```
状态更新触发 →

═══ Render 阶段（可中断）═══
  1. 从触发更新的 Fiber 节点开始
  2. 向上遍历到根节点
  3. 从根节点向下执行 beginWork（处理每个 Fiber）
     - 调用组件函数 / render 方法
     - 比较新旧 ReactElement（Diff）
     - 标记副作用标记（Placement/Update/Deletion）
  4. 向上执行 completeWork（创建/更新 DOM 节点但不挂载）

═══ Commit 阶段（不可中断，同步执行）═══
  Before Mutation 子阶段：
     - getSnapshotBeforeUpdate（类组件）
     - 读取 DOM 变更前的状态

  Mutation 子阶段：
     - 执行 DOM 操作（插入、更新、删除）
     - 真实 DOM 发生变化

  Layout 子阶段：
     - 切换 current 树指针（双缓冲交换）
     - 执行 useLayoutEffect
     - componentDidMount / componentDidUpdate

═══ 后续 ═══
  浏览器绘制（Paint）
  执行 useEffect（异步）
```

### 与相关API的对比

| 对比维度 | Render 阶段 | Commit 阶段 |
|----------|-----------|------------|
| 执行内容 | Diff 计算、标记变更 | DOM 操作、执行副作用 |
| 可中断 | 是（并发模式） | 否（必须同步完成） |
| 副作用 | 不允许 | 允许 |
| 可重复执行 | 是（中断后重新开始） | 否（只执行一次） |
| 相关 Hook | 组件函数体、useMemo | useLayoutEffect、useEffect |
| DOM 状态 | 未修改 | 正在修改/已修改 |

### 适用场景

- **性能优化：** 理解哪些操作在 Render 阶段（不能有副作用）
- **Bug 定位：** 理解 useEffect 和 useLayoutEffect 的执行时机
- **并发特性理解：** 为什么 Render 阶段的代码必须是纯函数
- **面试回答：** React 的渲染机制和更新流程

### 常见问题

#### 为什么 Render 阶段不能有副作用

**问题描述：** 在组件函数体中发起请求或修改全局变量会怎样。

**解决方案：**

```
Render 阶段可能被中断和重新执行（并发模式），
如果有副作用会导致：

1. 重复执行：同一次更新的 Render 阶段执行多次
   → 网络请求重复发送
   → 全局变量被多次修改

2. 执行后回滚：Render 阶段完成后可能被丢弃（优先级抢占）
   → 副作用已执行但结果不被使用

正确做法：
  - 组件函数体：只做纯计算
  - 副作用放在 useEffect 中（Commit 阶段后执行，只执行一次）
  - DOM 操作放在 useLayoutEffect 中
```

### 注意事项

- Render 阶段的代码必须是纯函数（无副作用）
- Commit 阶段是同步的，不可中断
- useLayoutEffect 在 DOM 更新后、浏览器绘制前执行
- useEffect 在浏览器绘制后异步执行
- 严格模式的双重调用是为了检测 Render 阶段的副作用
- Commit 阶段的三个子阶段按顺序执行

### 总结

React 的协调过程分为 Render 阶段（Diff 计算，可中断，不允许副作用）和 Commit 阶段（DOM 操作，不可中断，执行副作用）。Render 阶段计算变更，Commit 阶段应用变更。组件函数体在 Render 阶段执行必须是纯函数，副作用放在 useEffect/useLayoutEffect 中。Commit 阶段包含 Before Mutation、Mutation、Layout 三个子阶段。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Render阶段的虚拟DOM对比

### 概念说明

Render 阶段是 React 更新流程的第一个阶段，核心任务是将新的 ReactElement 树与当前的 Fiber 树（current tree）进行对比（Diff），找出需要变更的节点并标记副作用（Effect Flags）。这个过程从根节点开始，通过深度优先遍历处理每个 Fiber 节点。

每个 Fiber 节点的处理分为两步：`beginWork`（向下递）和 `completeWork`（向上归）。beginWork 负责创建或更新子 Fiber 节点，执行 Diff 算法；completeWork 负责收集副作用、创建 DOM 节点（但不挂载到页面）。整个 Render 阶段不会修改真实 DOM，只产生一棵标记了变更的 workInProgress Fiber 树。

### 基本示例

```tsx
// 示例说明：Render 阶段对比新旧虚拟 DOM 的过程

import React, { useState } from "react";

function App() {
    const [color, setColor] = useState("blue");

    // 每次 setColor 触发更新时，Render 阶段的工作：
    // 1. 执行 App 函数，生成新的 ReactElement 树
    // 2. 比较新旧 ReactElement：
    //    - div 的 type 没变 → 复用 Fiber，更新 props
    //    - h1 的 type 没变 → 复用 Fiber，检查 children
    //    - p 的 style.color 变了 → 标记 Update flag
    //    - button 没变 → 跳过

    return (
        <div>
            <h1>颜色切换</h1>
            <p style={{ color }}>当前颜色: {color}</p>
            <button onClick={() => setColor(c => c === "blue" ? "red" : "blue")}>
                切换颜色
            </button>
        </div>
    );
}

export default App;
```

### 内部原理

#### beginWork 和 completeWork 的工作

```javascript
// beginWork（向下递）：处理单个 Fiber 节点
function beginWork(current, workInProgress) {
    // current: 当前屏幕上对应的 Fiber 节点（可能为 null）
    // workInProgress: 正在构建的新 Fiber 节点

    if (current !== null) {
        // 更新：比较新旧 props
        const oldProps = current.memoizedProps;
        const newProps = workInProgress.pendingProps;

        if (oldProps === newProps && !hasContextChanged()) {
            // props 没变，可以跳过（bailout）
            return bailoutOnAlreadyFinishedWork(workInProgress);
        }
    }

    // 根据组件类型执行不同的逻辑
    switch (workInProgress.tag) {
        case FunctionComponent:
            // 执行函数组件，获取新的 children
            return updateFunctionComponent(current, workInProgress);
        case HostComponent:
            // DOM 元素，比较 children
            return updateHostComponent(current, workInProgress);
        // ...其他类型
    }
}

// completeWork（向上归）：收集副作用
function completeWork(current, workInProgress) {
    switch (workInProgress.tag) {
        case HostComponent:
            if (current !== null) {
                // 更新：比较属性差异，标记需要更新的属性
                updateHostComponent(current, workInProgress);
            } else {
                // 新增：创建 DOM 节点（不挂载）
                const instance = createInstance(workInProgress.type, workInProgress.props);
                workInProgress.stateNode = instance;
            }
    }
    // 将副作用向上冒泡到父节点
    bubbleProperties(workInProgress);
}
```

#### 副作用标记（Effect Flags）

```
Render 阶段标记的副作用类型：

Placement  = 0b0000000000010;   // 新增节点，需要插入 DOM
Update     = 0b0000000000100;   // 属性变化，需要更新 DOM
Deletion   = 0b0000000001000;   // 节点删除，需要从 DOM 移除
ChildDeletion = 0b0000000010000; // 子节点删除

这些标记在 Commit 阶段被读取并执行对应的 DOM 操作
```

### 与相关API的对比

| Render 阶段步骤 | 执行内容 | 产出 |
|----------------|---------|------|
| beginWork | 执行组件函数、Diff 子节点 | 子 Fiber 节点（新建或复用） |
| completeWork | 创建 DOM 节点、比较属性 | 副作用标记、DOM 实例 |
| bailout | props 未变，跳过子树 | 减少不必要的计算 |

### 适用场景

- **性能分析：** 理解 React 为什么会重新渲染某个组件
- **bailout 优化：** 理解 React.memo 和 useMemo 如何跳过 Render
- **源码学习：** beginWork 和 completeWork 是 React 核心流程

### 常见问题

#### 什么情况下 Render 阶段可以跳过子树

**问题描述：** bailout 的条件是什么。

**解决方案：**

```
bailout 条件（同时满足）：
1. oldProps === newProps（引用相等）
2. 组件没有 context 变化
3. 组件没有待处理的更新（lanes 检查）

满足时 React 直接复用整个子树，不执行子组件函数

这就是为什么 React.memo 能优化性能：
  React.memo 让 props 在浅比较相等时保持引用不变
  → oldProps === newProps 成立
  → bailout 跳过整个子树
```

### 注意事项

- Render 阶段不修改真实 DOM（只创建 DOM 节点但不挂载）
- 组件函数可能在 Render 阶段执行多次（并发模式中断后重新执行）
- bailout 是 React 的核心优化，理解它有助于性能调优
- 副作用标记使用位运算，可以高效合并和检查
- Render 阶段的产出是标记了副作用的 workInProgress 树

### 总结

Render 阶段通过 beginWork（向下递）和 completeWork（向上归）遍历 Fiber 树，执行 Diff 算法比较新旧虚拟 DOM，标记需要变更的节点（Placement/Update/Deletion）。不修改真实 DOM，产出标记了副作用的 workInProgress 树。props 未变时可以 bailout 跳过子树，这是 React.memo 优化的基础。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Commit阶段的DOM更新提交

### 概念说明

Commit 阶段是 React 更新流程的第二个阶段，负责将 Render 阶段计算出的变更实际应用到真实 DOM 上。这个阶段是同步执行的，一旦开始就不会被中断，因为真实 DOM 的操作必须保持一致性——半完成的 DOM 更新会导致用户看到不一致的 UI。

Commit 阶段分为三个子阶段：Before Mutation（DOM 变更前）、Mutation（执行 DOM 操作）和 Layout（DOM 变更后）。每个子阶段处理不同类型的工作，从读取 DOM 快照到执行实际的 DOM 插入/更新/删除，再到执行需要读取新 DOM 布局的副作用。

### 基本示例

```tsx
// 示例说明：Commit 阶段三个子阶段对应的 Hook 和生命周期

import React, { useState, useEffect, useLayoutEffect, useRef } from "react";

function CommitPhaseDemo() {
    const [count, setCount] = useState(0);
    const divRef = useRef<HTMLDivElement>(null);

    // Commit - Layout 子阶段（同步，DOM 已更新，浏览器未绘制）
    useLayoutEffect(() => {
        // 此时 DOM 已经更新，可以安全读取新的布局信息
        if (divRef.current) {
            const height = divRef.current.offsetHeight;
            console.log("Layout 阶段: 元素高度 =", height);
            // 如果需要根据 DOM 尺寸调整样式，在这里做
            // 不会出现视觉闪烁
        }

        return () => {
            console.log("Layout 清理: 在下次 Layout 之前执行");
        };
    }, [count]);

    // Commit 之后（异步，浏览器已绘制）
    useEffect(() => {
        console.log("Effect: 浏览器已绘制，执行异步副作用");
        // 适合发起网络请求、订阅事件等

        return () => {
            console.log("Effect 清理: 在下次 Effect 之前执行");
        };
    }, [count]);

    console.log("Render 阶段: 组件函数执行");

    return (
        <div ref={divRef}>
            <p>计数: {count}</p>
            <button onClick={() => setCount(c => c + 1)}>+1</button>
        </div>
    );
}

// 执行顺序日志：
// 1. "Render 阶段: 组件函数执行"
// 2. (DOM 更新)
// 3. "Layout 阶段: 元素高度 = ..."
// 4. (浏览器绘制)
// 5. "Effect: 浏览器已绘制，执行异步副作用"

export default CommitPhaseDemo;
```

### 内部原理

#### 三个子阶段的详细工作

```
═══ Before Mutation 子阶段 ═══
  遍历 Fiber 树，对标记了副作用的节点：
  - 类组件：调用 getSnapshotBeforeUpdate()
    → 读取 DOM 变更前的信息（如滚动位置）
  - 函数组件：无对应 Hook

═══ Mutation 子阶段 ═══
  遍历 Fiber 树，执行实际的 DOM 操作：
  - Placement（新增）：
    → appendChild / insertBefore
  - Update（更新）：
    → 更新 DOM 属性（className, style 等）
    → 更新文本内容
  - Deletion（删除）：
    → removeChild
    → 执行被删除组件的清理（useEffect cleanup、componentWillUnmount）

  ★ ref 的处理：
  - 旧 ref 被清理（设为 null 或调用清理函数）

═══ Layout 子阶段 ═══
  遍历 Fiber 树，DOM 已更新但浏览器未绘制：
  - 切换 current 树指针（workInProgress 变为 current）
  - 函数组件：执行 useLayoutEffect
  - 类组件：执行 componentDidMount / componentDidUpdate
  - 新 ref 被赋值（ref.current = DOM 节点）

═══ 后续 ═══
  浏览器执行布局和绘制
  异步调度 useEffect
```

### 与相关API的对比

| 子阶段 | 执行时机 | 对应的 Hook/生命周期 | DOM 状态 |
|--------|---------|-------------------|---------|
| Before Mutation | DOM 操作前 | getSnapshotBeforeUpdate | 旧 DOM |
| Mutation | 执行 DOM 操作 | (无直接对应) | 正在变更 |
| Layout | DOM 操作后 | useLayoutEffect, componentDidMount | 新 DOM，未绘制 |
| 绘制后 | 浏览器绘制后 | useEffect | 新 DOM，已绘制 |

### 适用场景

- **DOM 测量：** useLayoutEffect 中读取新 DOM 的尺寸
- **滚动恢复：** getSnapshotBeforeUpdate 保存滚动位置
- **动画启动：** Layout 阶段设置 DOM 初始状态
- **数据请求：** useEffect 中发起异步操作

### 常见问题

#### useLayoutEffect 和 useEffect 该选哪个

**解决方案：**

```
默认用 useEffect（99% 的场景）
只在需要同步读取/修改 DOM 布局时用 useLayoutEffect

useLayoutEffect 适合的场景：
- 读取 DOM 尺寸后立即调整样式（避免闪烁）
- 在浏览器绘制前同步修改 DOM
- 需要在绘制前获取元素位置

useEffect 适合的场景：
- 数据请求
- 事件订阅
- 日志记录
- 不需要同步 DOM 操作的副作用
```

### 注意事项

- Commit 阶段是同步执行的，不可中断
- Mutation 子阶段执行实际的 DOM 增删改
- Layout 子阶段可以安全读取新 DOM（但浏览器尚未绘制）
- useLayoutEffect 中的耗时操作会阻塞浏览器绘制
- ref 在 Mutation 子阶段清理旧值，在 Layout 子阶段赋新值

### 总结

Commit 阶段同步执行 DOM 变更，分为三个子阶段：Before Mutation（读取旧 DOM 快照）、Mutation（执行 DOM 插入/更新/删除）、Layout（执行 useLayoutEffect、赋值 ref）。浏览器绘制后再异步执行 useEffect。整个 Commit 阶段不可中断，保证 DOM 操作的一致性。默认使用 useEffect，只在需要同步 DOM 操作时使用 useLayoutEffect。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Diff算法的单节点对比策略

### 概念说明

单节点 Diff 是指新的子节点只有一个元素时，React 对比新旧节点的策略。React 会遍历旧 Fiber 树的同级子节点，寻找能够复用的节点。判断能否复用的条件是：**key 相同且 type 相同**。只有两个条件同时满足，React 才会复用旧的 Fiber 节点并更新 props；否则会标记旧节点为删除，创建新的 Fiber 节点。

单节点 Diff 的核心逻辑在 `reconcileSingleElement` 函数中实现。它的处理流程是：先检查 key 是否匹配，key 匹配后再检查 type 是否匹配。如果 key 匹配但 type 不匹配，说明这个位置的元素类型变了，旧节点及其所有兄弟节点都会被删除。如果 key 不匹配，只删除当前旧节点，继续查找兄弟节点。

### 基本示例

```tsx
// 示例说明：单节点 Diff 的不同场景

import React, { useState } from "react";

function SingleNodeDiffDemo() {
    const [type, setType] = useState<"div" | "span" | "p">("div");

    // 场景1：type 相同，props 变化 → 复用节点，更新 props
    // 旧：<div className="old">内容</div>
    // 新：<div className="new">内容</div>
    // 结果：复用 div DOM 节点，只更新 className

    // 场景2：type 不同 → 销毁旧节点，创建新节点
    // 旧：<div>内容</div>
    // 新：<span>内容</span>
    // 结果：删除 div，创建 span（组件状态丢失）

    // 场景3：key 相同 type 不同 → 销毁旧节点及所有兄弟
    // 旧：<div key="a">1</div> <p key="b">2</p>
    // 新：<span key="a">1</span>
    // 结果：div 和 p 都被删除（key="a" 匹配但 type 不同）

    return (
        <div>
            <button onClick={() => setType("div")}>div</button>
            <button onClick={() => setType("span")}>span</button>
            <button onClick={() => setType("p")}>p</button>

            {/* type 变化时，整个子树被替换 */}
            {type === "div" && <div style={{ padding: 10, border: "1px solid blue" }}>我是 div</div>}
            {type === "span" && <span style={{ padding: 10, border: "1px solid red" }}>我是 span</span>}
            {type === "p" && <p style={{ padding: 10, border: "1px solid green" }}>我是 p</p>}
        </div>
    );
}

export default SingleNodeDiffDemo;
```

### 内部原理

#### reconcileSingleElement 流程

```javascript
// React 内部单节点 Diff 简化逻辑
function reconcileSingleElement(returnFiber, currentFirstChild, element) {
    const key = element.key;
    let child = currentFirstChild;  // 旧 Fiber 的第一个子节点

    // 遍历旧的同级 Fiber 节点
    while (child !== null) {
        if (child.key === key) {
            // key 匹配，继续检查 type
            if (child.elementType === element.type) {
                // key 和 type 都匹配 → 复用！
                // 删除剩余的兄弟节点（新的只有一个元素）
                deleteRemainingChildren(returnFiber, child.sibling);
                // 复用旧 Fiber，更新 props
                const existing = useFiber(child, element.props);
                existing.return = returnFiber;
                return existing;
            }
            // key 匹配但 type 不匹配
            // → 这个 key 对应的元素类型变了
            // → 删除所有旧节点（包括当前和兄弟）
            deleteRemainingChildren(returnFiber, child);
            break;
        } else {
            // key 不匹配 → 标记当前旧节点为删除
            deleteChild(returnFiber, child);
        }
        // 继续查找下一个兄弟节点
        child = child.sibling;
    }

    // 没有找到可复用的节点 → 创建新 Fiber
    const created = createFiberFromElement(element);
    created.return = returnFiber;
    return created;
}
```

#### 四种情况汇总

```
情况1：key 相同 + type 相同
  → 复用 Fiber 节点，更新 props
  → 最优情况，无需创建新 DOM

情况2：key 相同 + type 不同
  → 删除所有旧节点（当前节点 + 所有兄弟）
  → 创建新 Fiber 节点
  → 因为 key 匹配说明是同一个"身份"，type 变了说明彻底变了

情况3：key 不同
  → 只删除当前旧节点
  → 继续遍历兄弟节点寻找 key 匹配的

情况4：遍历完没找到匹配的
  → 创建新 Fiber 节点
```

### 与相关API的对比

| 场景 | key | type | 操作 | DOM 影响 |
|------|-----|------|------|---------|
| 属性更新 | 相同 | 相同 | 复用 Fiber | 更新属性，保留 DOM |
| 类型替换 | 相同 | 不同 | 删除所有旧节点 | 销毁旧 DOM，创建新 DOM |
| 身份不匹配 | 不同 | - | 删除当前，继续查找 | 逐个检查 |
| 无匹配 | - | - | 新建 Fiber | 创建全新 DOM |

### 适用场景

- **条件渲染：** 同一位置切换不同组件
- **动态组件：** 根据状态渲染不同 type 的元素
- **单子节点：** 父元素只有一个子元素的场景

### 常见问题

#### 为什么 key 匹配但 type 不匹配时要删除所有兄弟

**问题描述：** 为什么不只删除当前节点。

**解决方案：**

```
因为 key 匹配意味着找到了"对应"的那个旧节点。
如果 type 变了，说明这个位置的元素类型彻底改变了。

新的子节点只有一个，旧节点中 key 匹配的那个已经确认无法复用，
其他兄弟节点的 key 也不可能与新节点匹配（key 在同级中唯一）。
所以直接删除所有旧节点，避免不必要的遍历。

而 key 不匹配时只删除当前节点，是因为还可能
在后续兄弟中找到 key 匹配的节点。
```

### 注意事项

- key 和 type 同时匹配才能复用 Fiber 节点
- key 匹配但 type 不匹配时，所有旧同级节点都被删除
- key 不匹配时只删除当前节点，继续寻找
- 没有指定 key 时默认为 null，null === null 成立
- 组件 type 变化会导致整个子树重建（状态丢失）

### 总结

单节点 Diff 通过 key + type 判断能否复用旧 Fiber 节点。两者都匹配则复用并更新 props；key 匹配但 type 不同则删除所有旧节点；key 不匹配则只删除当前节点继续查找兄弟。这套策略确保了在 O(n) 复杂度内完成单节点对比。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Diff算法的多节点对比策略

### 概念说明

多节点 Diff 是指新的子节点为数组（多个同级元素）时的对比策略。这是 React Diff 中最复杂的部分，在 `reconcileChildrenArray` 函数中实现。多节点 Diff 需要处理三种情况：节点更新（属性或类型变化）、节点新增或删除、节点位置移动。

React 对多节点 Diff 做了一个重要的优化假设：在实际 UI 场景中，节点更新（属性变化）是最常见的操作，而新增、删除和移动相对较少。因此 React 将 Diff 过程分为两轮遍历：第一轮处理更新的节点（按顺序逐个比较新旧节点），第二轮处理剩余的新增、删除和移动操作。

### 基本示例

```tsx
// 示例说明：多节点 Diff 的三种典型场景

import React, { useState } from "react";

function MultiNodeDiffDemo() {
    const [items, setItems] = useState([
        { id: "a", text: "苹果" },
        { id: "b", text: "香蕉" },
        { id: "c", text: "橙子" },
    ]);

    // 场景1：节点更新（最常见）
    const handleUpdate = () => {
        setItems([
            { id: "a", text: "红苹果" },   // key="a" 不变，text 更新
            { id: "b", text: "黄香蕉" },   // key="b" 不变，text 更新
            { id: "c", text: "甜橙子" },   // key="c" 不变，text 更新
        ]);
    };

    // 场景2：新增和删除
    const handleAddRemove = () => {
        setItems([
            { id: "a", text: "苹果" },     // 保留
            { id: "d", text: "葡萄" },     // 新增
            { id: "c", text: "橙子" },     // 保留（b 被删除）
        ]);
    };

    // 场景3：节点移动
    const handleMove = () => {
        setItems([
            { id: "c", text: "橙子" },     // c 从末尾移到开头
            { id: "a", text: "苹果" },     // a 从开头移到中间
            { id: "b", text: "香蕉" },     // b 保持
        ]);
    };

    return (
        <div>
            <button onClick={handleUpdate}>更新文本</button>
            <button onClick={handleAddRemove}>增删节点</button>
            <button onClick={handleMove}>移动节点</button>
            <ul>
                {items.map(item => (
                    <li key={item.id}>{item.text}</li>
                ))}
            </ul>
        </div>
    );
}

export default MultiNodeDiffDemo;
```

### 内部原理

#### 两轮遍历算法

```javascript
// 多节点 Diff 简化流程（reconcileChildrenArray）

// ═══ 第一轮遍历：处理更新 ═══
// 从左到右逐个比较新旧节点
let newIdx = 0;
let oldFiber = currentFirstChild;
let lastPlacedIndex = 0;

for (; newIdx < newChildren.length && oldFiber !== null; newIdx++) {
    // 比较新旧节点的 key
    if (oldFiber.key !== newChildren[newIdx].key) {
        break;  // key 不同，跳出第一轮
    }
    // key 相同，尝试复用（检查 type）
    const newFiber = updateSlot(oldFiber, newChildren[newIdx]);
    if (newFiber === null) {
        break;  // type 不同，无法复用，跳出
    }
    oldFiber = oldFiber.sibling;
}

// ═══ 第一轮结束后的四种情况 ═══

// 情况1：新节点遍历完，旧节点还有剩余 → 删除剩余旧节点
if (newIdx === newChildren.length) {
    deleteRemainingChildren(returnFiber, oldFiber);
    return;
}

// 情况2：旧节点遍历完，新节点还有剩余 → 新增剩余新节点
if (oldFiber === null) {
    for (; newIdx < newChildren.length; newIdx++) {
        const newFiber = createChild(newChildren[newIdx]);
        // 标记为 Placement（插入）
    }
    return;
}

// ═══ 第二轮遍历：处理移动 ═══
// 情况3/4：新旧都有剩余 → 需要处理移动

// 将剩余旧节点存入 Map（key → Fiber）
const existingChildren = mapRemainingChildren(oldFiber);

for (; newIdx < newChildren.length; newIdx++) {
    // 从 Map 中查找 key 匹配的旧 Fiber
    const newFiber = updateFromMap(existingChildren, newChildren[newIdx]);
    if (newFiber !== null) {
        // 找到了，从 Map 中移除
        existingChildren.delete(newFiber.key);
        // 判断是否需要移动（通过 lastPlacedIndex）
        lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
    }
}

// Map 中剩余的旧节点 → 标记为删除
existingChildren.forEach(child => deleteChild(child));
```

### 与相关API的对比

| 遍历阶段 | 处理内容 | 时间复杂度 | 触发条件 |
|---------|---------|-----------|---------|
| 第一轮 | 逐个比较，处理更新 | O(n) | 总是执行 |
| 删除剩余 | 新节点遍历完，删旧 | O(m) | 新列表更短 |
| 新增剩余 | 旧节点遍历完，增新 | O(k) | 新列表更长 |
| 第二轮(Map) | 处理移动和乱序 | O(n) | 新旧都有剩余 |

### 适用场景

- **列表渲染：** map 生成的多个同级元素
- **动态列表：** 增删改排序操作的列表
- **Tab 切换：** 多个同级组件的切换

### 常见问题

#### 为什么第一轮从左到右遍历

**问题描述：** 为什么不直接用 Map 查找。

**解决方案：**

```
React 基于"大部分更新是属性变化，位置不变"的假设做了优化：

第一轮从左到右遍历：
  → 节点顺序不变时，直接逐个匹配
  → 不需要创建 Map，省去 Map 的创建和查找开销
  → 覆盖了最常见的场景（纯属性更新）

只有第一轮无法处理时才创建 Map：
  → 处理节点移动、乱序等复杂情况
  → Map 的创建是 O(n)，查找是 O(1)

这个两轮策略在大多数实际场景下性能优于直接使用 Map。
```

### 注意事项

- 多节点 Diff 分两轮遍历：先处理更新，再处理移动
- 第一轮遍历在 key 不匹配时立即停止
- 剩余旧节点存入 Map（key → Fiber）以 O(1) 查找
- Map 中未被匹配的旧节点最终被删除
- 移动判断通过 lastPlacedIndex 实现（后续文档详述）

### 总结

多节点 Diff 采用两轮遍历策略：第一轮从左到右逐个比较处理更新（最常见场景），遇到 key 不匹配时停止。第一轮结束后根据剩余情况处理删除或新增。如果新旧都有剩余，进入第二轮：将旧节点存入 Map，遍历新节点从 Map 中查找可复用的旧节点，处理移动和乱序。这种策略在常见场景下避免了 Map 的额外开销。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## key属性的元素身份识别

### 概念说明

`key` 是 React 元素的一个特殊属性，用于在同级元素中唯一标识每个元素的"身份"。当列表发生变化（增删改排序）时，React 通过 key 来判断哪些元素是新增的、哪些被删除了、哪些只是换了位置。没有 key 时，React 只能按位置顺序匹配新旧节点，无法识别节点移动。

key 不会作为 props 传递给组件，它被 React 内部提取出来专门用于 Diff 算法。key 在同级兄弟元素中必须唯一，不同层级的 key 可以重复。key 的值会被转为字符串，所以 `key={1}` 和 `key="1"` 是等价的。

### 基本示例

```tsx
// 示例说明：key 如何帮助 React 识别元素身份

import React, { useState } from "react";

interface Todo {
    id: string;
    text: string;
}

function TodoList() {
    const [todos, setTodos] = useState<Todo[]>([
        { id: "t1", text: "学习 React" },
        { id: "t2", text: "学习 TypeScript" },
        { id: "t3", text: "练习算法" },
    ]);

    // 在列表头部插入新项
    const addToTop = () => {
        setTodos([
            { id: `t${Date.now()}`, text: "新任务" },
            ...todos,
        ]);
    };

    // 删除中间项
    const removeSecond = () => {
        setTodos(todos.filter((_, i) => i !== 1));
    };

    // 反转列表
    const reverse = () => {
        setTodos([...todos].reverse());
    };

    return (
        <div>
            <button onClick={addToTop}>头部添加</button>
            <button onClick={removeSecond}>删除第二项</button>
            <button onClick={reverse}>反转列表</button>
            <ul>
                {todos.map(todo => (
                    // 使用稳定的 id 作为 key
                    // React 通过 key 追踪每个元素的身份
                    <li key={todo.id}>
                        <input defaultValue={todo.text} />
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default TodoList;
```

**运行效果：** 头部添加时，已有项的输入框内容保持不变（React 通过 key 知道它们只是移动了位置）。如果用 index 作为 key，输入框内容会错位。

### 内部原理

#### key 在 Diff 中的匹配规则

```
有 key 时的匹配：
  旧列表：[A(key=1), B(key=2), C(key=3)]
  新列表：[C(key=3), A(key=1), B(key=2)]

  React 通过 key 识别：
  → C 从位置2移到位置0
  → A 从位置0移到位置1
  → B 保持（相对位置不需要移动）
  → 结果：移动 DOM 节点，不重建

无 key 时的匹配（按位置）：
  旧列表：[A, B, C]
  新列表：[C, A, B]

  React 按位置匹配：
  → 位置0：A → C（type 不同就重建，type 相同就更新 props）
  → 位置1：B → A
  → 位置2：C → B
  → 结果：可能更新所有节点的内容，效率低
```

### 与相关API的对比

| key 类型 | 稳定性 | 推荐程度 | 说明 |
|---------|--------|---------|------|
| 数据 ID | 稳定 | 推荐 | 来自后端数据的唯一 ID |
| uuid/nanoid | 稳定 | 推荐 | 创建时生成一次 |
| 组合字段 | 稳定 | 可用 | 如 `${type}-${name}` |
| 数组 index | 不稳定 | 不推荐 | 增删排序时导致错误 |
| Math.random() | 每次变化 | 禁止 | 每次渲染都重建所有节点 |

### 适用场景

- **列表渲染：** 任何使用 map 渲染的数组必须加 key
- **动态列表：** 有增删排序操作的列表必须用稳定 key
- **条件渲染：** 相同位置切换不同组件时用 key 控制是否重建
- **强制重建：** 通过改变 key 强制组件重新挂载

### 常见问题

#### 用 key 强制组件重建

**问题描述：** 想让组件在某个条件变化时完全重新挂载。

**解决方案：**

```tsx
function App() {
    const [userId, setUserId] = useState(1);

    // 改变 key 会导致 Profile 组件完全卸载并重新挂载
    // 内部状态被重置，useEffect 重新执行
    return <Profile key={userId} userId={userId} />;
}

// 常见用途：
// - 切换用户时重置表单状态
// - 切换详情页时清空旧数据
// - 需要"全新"组件实例的场景
```

### 注意事项

- key 在同级兄弟元素中必须唯一
- key 不会作为 props 传递给组件
- key 的值会被转为字符串
- 稳定的 key 来自数据本身（ID），不要每次渲染时生成
- Math.random() 作为 key 会导致每次都重建，性能极差
- 改变 key 可以强制组件重新挂载（有时是有意为之）

### 总结

key 是 React 用于识别同级元素身份的特殊属性，Diff 算法通过 key 判断元素是新增、删除还是移动。key 必须在同级中唯一且稳定，推荐使用数据 ID。不稳定的 key（如 index、Math.random()）会导致错误的状态保留或性能问题。改变 key 可以强制组件重建，这在切换用户等场景中很有用。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## key的数组索引作为key的反模式

### 概念说明

使用数组索引（index）作为 key 是 React 开发中一个常见的反模式。当列表只是纯展示且不会有增删排序操作时，index 作为 key 不会产生问题。但一旦列表涉及插入、删除、重排序操作，index 作为 key 会导致严重的 Bug：组件状态错位、输入框内容串行、复选框状态混乱等。

根本原因在于：index 不代表数据的身份，它代表的是位置。当列表变化后，同一个 index 可能对应了不同的数据项。React 通过 key 匹配新旧节点，如果 key 没变（index 没变），React 认为是同一个元素只需更新 props，于是复用了旧的 DOM 节点和组件状态——但实际上数据已经换了。

### 基本示例

```tsx
// 示例说明：index 作为 key 导致的 Bug

import React, { useState } from "react";

interface Item {
    id: string;
    name: string;
}

// 列表项组件：包含不受控的 input
function ListItem({ name }: { name: string }) {
    return (
        <li>
            <span>{name}: </span>
            {/* defaultValue 只在首次渲染时设置 */}
            {/* 组件复用时 defaultValue 不会更新 */}
            <input defaultValue={name} />
        </li>
    );
}

function IndexKeyBugDemo() {
    const [items, setItems] = useState<Item[]>([
        { id: "a", name: "苹果" },
        { id: "b", name: "香蕉" },
        { id: "c", name: "橙子" },
    ]);

    const addToTop = () => {
        setItems([
            { id: `${Date.now()}`, name: "葡萄" },
            ...items,
        ]);
    };

    return (
        <div>
            <h3>index 作为 key（有 Bug）</h3>
            <button onClick={addToTop}>在头部添加"葡萄"</button>
            <ul>
                {items.map((item, index) => (
                    // 反模式：用 index 作为 key
                    <ListItem key={index} name={item.name} />
                ))}
            </ul>

            <h3>id 作为 key（正确）</h3>
            <button onClick={addToTop}>在头部添加"葡萄"</button>
            <ul>
                {items.map(item => (
                    // 正确：用稳定的 id 作为 key
                    <ListItem key={item.id} name={item.name} />
                ))}
            </ul>
        </div>
    );
}

export default IndexKeyBugDemo;
```

**Bug 复现步骤：**
1. 在输入框中修改"苹果"的值为"红苹果"
2. 点击"在头部添加葡萄"
3. index 版本：输入框中"红苹果"出现在了"葡萄"那一行（状态错位）
4. id 版本：输入框内容正确对应

### 内部原理

#### index 作为 key 时的错误匹配

```
添加前：
  index=0 → 苹果（input 值: "红苹果"）
  index=1 → 香蕉（input 值: "香蕉"）
  index=2 → 橙子（input 值: "橙子"）

头部插入"葡萄"后：
  index=0 → 葡萄（React 用 key=0 匹配旧的 key=0）
  index=1 → 苹果（React 用 key=1 匹配旧的 key=1）
  index=2 → 香蕉（React 用 key=2 匹配旧的 key=2）
  index=3 → 橙子（新节点，key=3 无匹配）

React 的处理：
  key=0：旧"苹果" → 新"葡萄"，复用 DOM，更新 name prop
         但 input 的 defaultValue 不更新 → 显示"红苹果"（Bug！）
  key=1：旧"香蕉" → 新"苹果"，复用 DOM → 显示"香蕉"（Bug！）
  key=2：旧"橙子" → 新"香蕉"，复用 DOM → 显示"橙子"（Bug！）
  key=3：新建 → 显示"橙子"（实际应该是新内容）
```

### 与相关API的对比

| 场景 | index 作为 key | 稳定 id 作为 key |
|------|--------------|----------------|
| 纯展示列表 | 无问题 | 无问题 |
| 头部插入 | 所有节点状态错位 | 只插入新节点 |
| 中间删除 | 删除位后的状态错位 | 只删除目标节点 |
| 排序/反转 | 所有节点状态错位 | 只移动 DOM 节点 |
| 性能 | 不必要的 DOM 更新 | 最小化 DOM 操作 |

### 适用场景

**index 作为 key 可以接受的场景（全部满足）：**
- 列表永远不会重新排序
- 列表永远不会在中间或头部插入/删除
- 列表项没有组件状态或不受控输入

**必须用稳定 key 的场景：**
- 有增删排序操作的列表
- 列表项含有输入框、复选框等有状态的元素
- 列表项是复杂组件（有内部 state）

### 常见问题

#### 没有唯一 ID 时怎么办

**问题描述：** 后端数据没有提供唯一 ID。

**解决方案：**

```tsx
// 方案1：在数据到达时生成 ID
const processedData = rawData.map(item => ({
    ...item,
    id: crypto.randomUUID(),  // 只在数据加载时生成一次
}));

// 方案2：用多个字段组合成唯一标识
<li key={`${item.type}-${item.name}-${item.date}`}>

// 方案3：如果数据本身有唯一的组合
<li key={item.email}>  {/* 邮箱天然唯一 */}

// 注意：不要在 render 中生成随机 ID
// 错误：<li key={Math.random()}>  ← 每次渲染 key 都变
```

### 注意事项

- index 作为 key 在有增删排序的列表中会导致状态错位
- defaultValue、不受控组件的状态不会因 props 更新而改变
- 即使没有显式状态，DOM 本身也有隐式状态（焦点、滚动位置、选中状态）
- 使用稳定的唯一 ID 作为 key，如数据库 ID、UUID 等
- 在数据加载时而不是渲染时生成 ID

### 总结

数组索引作为 key 是 React 的典型反模式。index 代表位置而非身份，列表发生增删排序时会导致 React 错误匹配新旧节点，造成组件状态错位、DOM 状态混乱等 Bug。只有在纯展示且不变化的列表中可以用 index。其他场景必须使用来自数据的稳定唯一 ID 作为 key。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## key的兄弟元素唯一性要求

### 概念说明

React 要求同级兄弟元素的 key 必须唯一。这个"同级"是指拥有同一个父节点的元素集合。不同父节点下的元素可以使用相同的 key，因为 React 的 Diff 只在同级之间进行比较，不会跨层级匹配。

如果同级元素出现重复的 key，React 在开发模式下会发出警告。重复 key 会导致 Diff 算法行为不可预测：React 可能复用错误的节点，导致状态混乱或渲染异常。这是因为在多节点 Diff 的第二轮中，React 将旧节点存入以 key 为键的 Map，重复 key 会导致 Map 中后面的节点覆盖前面的，部分节点丢失。

### 基本示例

```tsx
// 示例说明：key 的唯一性范围和重复 key 的问题

import React from "react";

function KeyUniquenessDemo() {
    const fruits = [
        { id: "apple", name: "苹果" },
        { id: "banana", name: "香蕉" },
    ];

    const drinks = [
        { id: "apple", name: "苹果汁" },  // 与上面的 "apple" key 相同，但不同父级
        { id: "tea", name: "茶" },
    ];

    return (
        <div>
            {/* 这两个列表在不同父节点下，key 可以重复 */}
            <ul>
                {fruits.map(item => (
                    <li key={item.id}>{item.name}</li>
                    // key="apple" 和 key="banana" — 在 ul 内唯一
                ))}
            </ul>

            <ol>
                {drinks.map(item => (
                    <li key={item.id}>{item.name}</li>
                    // key="apple" 和 key="tea" — 在 ol 内唯一
                    // 虽然和上面的 ul 中有相同的 key="apple"
                    // 但因为父节点不同，不会冲突
                ))}
            </ol>

            {/* 错误示例：同级元素 key 重复 */}
            {/* 
            <ul>
                <li key="same">项目A</li>
                <li key="same">项目B</li>  // 警告：同级 key 重复
                <li key="same">项目C</li>  // 警告：同级 key 重复
            </ul>
            */}
        </div>
    );
}

export default KeyUniquenessDemo;
```

### 内部原理

#### 重复 key 在 Map 中的覆盖问题

```
同级有重复 key 时：
  旧列表：[A(key=x), B(key=x), C(key=y)]

多节点 Diff 第二轮创建 Map：
  Map = { "x": B, "y": C }
  注意：A 的 key 也是 "x"，被 B 覆盖了！

新列表匹配时：
  → key="x" 只能匹配到 B
  → A 节点丢失，无法被匹配
  → A 被标记为删除（即使它本该被保留）

结果：渲染行为不可预测，可能出现节点消失或状态错位
```

#### key 的作用域规则

```
<div>               ← 父级1
    <A key="1" />   ← 在父级1内唯一即可
    <B key="2" />
    <div>           ← 父级2
        <C key="1" />   ← 在父级2内唯一即可
        <D key="2" />   ← 与父级1中的 key="2" 不冲突
    </div>
</div>

Diff 只在同一父级的子节点之间进行：
  → 父级1 的子节点：A, B, div — 各自 key 唯一
  → 父级2 的子节点：C, D — 各自 key 唯一
  → 不存在跨层级的 key 比较
```

### 与相关API的对比

| 场景 | key 唯一性 | React 行为 |
|------|----------|-----------|
| 同级 key 唯一 | 满足 | 正常 Diff，正确匹配 |
| 同级 key 重复 | 违反 | 开发警告，节点可能丢失或状态混乱 |
| 不同父级 key 相同 | 允许 | 不影响，Diff 不跨层级 |
| 所有 key 为 null | 允许 | 按位置顺序匹配（无移动检测） |

### 适用场景

- **嵌套列表：** 外层和内层列表可以使用相同的 key 格式
- **多组数据：** 不同数据源的列表放在不同父级下
- **复合组件：** 组件内部的列表 key 不与外部冲突

### 常见问题

#### 合并多个数据源时如何保证 key 唯一

**问题描述：** 两个不同 API 返回的数据 ID 可能重复。

**解决方案：**

```tsx
// 方案：添加前缀区分数据来源
function MergedList({ users, products }: {
    users: Array<{ id: number; name: string }>;
    products: Array<{ id: number; name: string }>;
}) {
    return (
        <ul>
            {/* 用前缀保证同级唯一 */}
            {users.map(user => (
                <li key={`user-${user.id}`}>{user.name}</li>
            ))}
            {products.map(product => (
                <li key={`product-${product.id}`}>{product.name}</li>
            ))}
        </ul>
    );
}
```

### 注意事项

- key 只需要在同级兄弟元素中唯一，不需要全局唯一
- 重复 key 会导致 React 开发模式警告和不可预测的渲染行为
- 不同父节点下的元素可以使用相同的 key
- 合并多个数据源到同一列表时，用前缀区分防止 key 冲突
- 所有 key 为 null 时 React 按位置匹配，等同于无 key

### 总结

React 要求同级兄弟元素的 key 唯一，不同层级的 key 可以重复（Diff 不跨层级）。重复 key 会导致 Map 中节点被覆盖，引发渲染异常和状态混乱。合并多个数据源时使用前缀保证唯一性。key 的唯一性约束是 Diff 算法正确工作的前提。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 列表Diff的预处理(先遍历keymap)

### 概念说明

在多节点 Diff 的第二轮遍历中，React 需要在剩余的旧节点中高效查找与新节点 key 匹配的节点。为此，React 先将所有剩余的旧 Fiber 节点存入一个 Map 数据结构（keyMap），以 key 作为键、Fiber 节点作为值。对于没有 key 的节点，使用其 index 作为键。

这个预处理步骤将后续的节点查找从 O(n) 线性查找降低为 O(1) 的 Map 查找。虽然创建 Map 本身是 O(n) 的，但由于后续每个新节点都需要查找，总体复杂度从 O(n^2) 降低为 O(n)。这是多节点 Diff 性能的关键优化。

### 基本示例

```tsx
// 示例说明：keyMap 预处理在列表变化中的作用

import React, { useState } from "react";

function KeyMapDemo() {
    const [items, setItems] = useState([
        { id: "a", name: "苹果" },
        { id: "b", name: "香蕉" },
        { id: "c", name: "橙子" },
        { id: "d", name: "葡萄" },
        { id: "e", name: "西瓜" },
    ]);

    // 复杂变化：删除、新增、移动同时发生
    const handleComplexChange = () => {
        setItems([
            { id: "e", name: "西瓜" },     // 从末尾移到开头
            { id: "f", name: "草莓" },     // 新增
            { id: "a", name: "红苹果" },   // 更新+移动
            { id: "c", name: "橙子" },     // 移动
            // b 和 d 被删除
        ]);
    };

    // 此变化的 Diff 过程中 keyMap 的作用：
    // 第一轮：旧[a] vs 新[e] → key 不匹配，跳出
    // 创建 keyMap：{ "a": FiberA, "b": FiberB, "c": FiberC, "d": FiberD, "e": FiberE }
    // 遍历新列表：
    //   新[e] → Map.get("e") → 找到 FiberE → 复用，移动
    //   新[f] → Map.get("f") → 未找到 → 新建
    //   新[a] → Map.get("a") → 找到 FiberA → 复用，更新 props，移动
    //   新[c] → Map.get("c") → 找到 FiberC → 复用，移动
    // Map 中剩余：FiberB, FiberD → 标记删除

    return (
        <div>
            <button onClick={handleComplexChange}>复杂变化</button>
            <ul>
                {items.map(item => (
                    <li key={item.id}>{item.name}</li>
                ))}
            </ul>
        </div>
    );
}

export default KeyMapDemo;
```

### 内部原理

#### mapRemainingChildren 实现

```javascript
// React 内部创建 keyMap 的逻辑（简化）
function mapRemainingChildren(currentFirstChild) {
    const existingChildren = new Map();
    let existingChild = currentFirstChild;

    while (existingChild !== null) {
        if (existingChild.key !== null) {
            // 有 key 的节点：用 key 作为 Map 的键
            existingChildren.set(existingChild.key, existingChild);
        } else {
            // 没有 key 的节点：用 index 作为 Map 的键
            existingChildren.set(existingChild.index, existingChild);
        }
        existingChild = existingChild.sibling;
    }

    return existingChildren;
}

// 使用 keyMap 查找可复用的旧节点
function updateFromMap(existingChildren, newChild) {
    // O(1) 查找
    const matchedFiber = existingChildren.get(
        newChild.key !== null ? newChild.key : newIdx
    );

    if (matchedFiber) {
        // 检查 type 是否匹配
        if (matchedFiber.elementType === newChild.type) {
            return useFiber(matchedFiber, newChild.props);  // 复用
        }
    }
    return createFiberFromElement(newChild);  // 新建
}
```

#### 完整的查找流程

```
旧列表 Fiber 链表：A → B → C → D → E
第一轮遍历在某处中断（如 key 不匹配）

剩余旧节点建 Map：
  Map = {
      "a": FiberA,
      "b": FiberB,
      "c": FiberC,
      "d": FiberD,
      "e": FiberE
  }

遍历新列表的剩余节点：
  新节点 key="e" → Map.get("e") → FiberE（O(1) 找到）
  新节点 key="f" → Map.get("f") → undefined（新增）
  新节点 key="a" → Map.get("a") → FiberA（O(1) 找到）

每找到一个，从 Map 中删除：
  Map.delete("e")
  Map.delete("a")

最终 Map 剩余：{ "b": FiberB, "d": FiberD }
  → 这些节点标记为删除
```

### 与相关API的对比

| 查找方式 | 时间复杂度 | 适用场景 |
|---------|-----------|---------|
| 线性查找（遍历链表） | O(n) 每次 | 简单但低效 |
| Map 查找 | O(1) 每次 | React 实际使用的方案 |
| 总复杂度（n个新节点） | O(n^2) | O(n) |

### 适用场景

- **大列表排序：** 排序后大量节点位置变化，Map 查找大幅提升性能
- **复杂列表操作：** 同时有增删移动的场景
- **数据刷新：** 服务端返回的列表顺序与前一次不同

### 常见问题

#### 没有 key 的节点如何处理

**问题描述：** 如果列表项没有指定 key 会怎样。

**解决方案：**

```
没有 key 的节点在 Map 中以 index 为键：

旧列表：[A(无key,idx=0), B(无key,idx=1), C(无key,idx=2)]
Map = { 0: FiberA, 1: FiberB, 2: FiberC }

新列表：[C, A, B]（假设也无 key）
  新 idx=0 → Map.get(0) → FiberA → 位置0的旧节点
  新 idx=1 → Map.get(1) → FiberB → 位置1的旧节点
  新 idx=2 → Map.get(2) → FiberC → 位置2的旧节点

结果：按位置匹配，不能识别移动
→ A 的 props 被更新为 C 的 props
→ 实际上是"就地更新"，不是"移动"
→ 如果有内部状态会出现错位
```

### 注意事项

- keyMap 在第一轮遍历无法完全匹配时才创建
- 有 key 的节点用 key 作为 Map 键，无 key 的用 index
- Map 查找将时间复杂度从 O(n^2) 降到 O(n)
- 匹配后的旧节点从 Map 中删除，避免重复匹配
- Map 中最终剩余的节点被标记为删除

### 总结

列表 Diff 的预处理阶段将剩余旧 Fiber 节点存入 Map（key→Fiber），将后续查找从 O(n) 降为 O(1)。有 key 的节点用 key 作为 Map 键，无 key 的用 index。每匹配一个从 Map 中移除，最终剩余的旧节点全部删除。这个 Map 预处理是多节点 Diff 达到 O(n) 总复杂度的关键。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 列表Diff的节点复用与移动判断

### 概念说明

在多节点 Diff 中，通过 keyMap 找到可复用的旧 Fiber 节点后，React 还需要判断该节点是否需要移动。React 使用一个叫做 `lastPlacedIndex` 的变量来跟踪"最后一个不需要移动的旧节点的位置索引"。对于每个在 Map 中找到的可复用节点，React 比较它在旧列表中的位置（oldIndex）和 lastPlacedIndex：如果 oldIndex >= lastPlacedIndex，说明该节点在旧列表中的相对位置是递增的，不需要移动；如果 oldIndex < lastPlacedIndex，说明该节点需要向右移动。

这个算法的核心思路是：保持一个递增序列不动，只移动破坏递增顺序的节点。这并不总是产生最少的移动操作，但实现简单、时间复杂度低。

### 基本示例

```tsx
// 示例说明：lastPlacedIndex 判断节点移动

import React, { useState } from "react";

function MoveDetectionDemo() {
    const [items, setItems] = useState(["A", "B", "C", "D"]);

    // 示例变化：A B C D → D A B C
    // 将 D 移到开头
    const moveDToFront = () => {
        setItems(["D", "A", "B", "C"]);
    };

    // 示例变化：A B C D → A C D B
    // 将 B 移到末尾
    const moveBToEnd = () => {
        setItems(["A", "C", "D", "B"]);
    };

    return (
        <div>
            <button onClick={moveDToFront}>D移到开头</button>
            <button onClick={moveBToEnd}>B移到末尾</button>
            <ul>
                {items.map(item => (
                    <li key={item}>{item}</li>
                ))}
            </ul>
        </div>
    );
}

export default MoveDetectionDemo;
```

### 内部原理

#### placeChild 函数的移动判断

```javascript
// React 内部移动判断逻辑（简化）
function placeChild(newFiber, lastPlacedIndex, newIndex) {
    newFiber.index = newIndex;
    const current = newFiber.alternate;  // 对应的旧 Fiber

    if (current !== null) {
        const oldIndex = current.index;  // 旧位置

        if (oldIndex < lastPlacedIndex) {
            // 旧位置在 lastPlacedIndex 左边
            // → 需要向右移动
            newFiber.flags |= Placement;
            return lastPlacedIndex;  // 不更新 lastPlacedIndex
        } else {
            // 旧位置 >= lastPlacedIndex
            // → 不需要移动
            return oldIndex;  // 更新 lastPlacedIndex 为 oldIndex
        }
    } else {
        // 新增节点
        newFiber.flags |= Placement;
        return lastPlacedIndex;
    }
}
```

#### 移动判断示例分析

```
场景1：A B C D → D A B C

旧位置：A=0, B=1, C=2, D=3
lastPlacedIndex 初始值 = 0

处理新列表：
  D(oldIndex=3)：3 >= 0 → 不移动，lastPlacedIndex = 3
  A(oldIndex=0)：0 < 3  → 移动！  lastPlacedIndex = 3
  B(oldIndex=1)：1 < 3  → 移动！  lastPlacedIndex = 3
  C(oldIndex=2)：2 < 3  → 移动！  lastPlacedIndex = 3

结果：A、B、C 被标记移动（3次移动）
实际上只移动 D 到开头就行（1次），但算法不支持"向左移动"

场景2：A B C D → A C D B

旧位置：A=0, B=1, C=2, D=3
lastPlacedIndex 初始值 = 0

处理新列表：
  A(oldIndex=0)：0 >= 0 → 不移动，lastPlacedIndex = 0
  C(oldIndex=2)：2 >= 0 → 不移动，lastPlacedIndex = 2
  D(oldIndex=3)：3 >= 2 → 不移动，lastPlacedIndex = 3
  B(oldIndex=1)：1 < 3  → 移动！  lastPlacedIndex = 3

结果：只有 B 被标记移动（1次移动）
这种情况下算法效率很高
```

### 与相关API的对比

| 变化模式 | 实际最少移动 | React 算法移动 | 效率 |
|---------|------------|--------------|------|
| 末尾元素移到开头 | 1次 | n-1次 | 低 |
| 开头元素移到末尾 | 1次 | 1次 | 高 |
| 相邻元素交换 | 1次 | 1次 | 高 |
| 完全反转 | n/2次 | n-1次 | 低 |
| 纯属性更新 | 0次 | 0次 | 高 |

### 适用场景

- **理解列表性能：** 将元素移到末尾比移到开头更高效
- **优化排序操作：** 理解哪些操作会导致大量 DOM 移动
- **面试回答：** lastPlacedIndex 是 React Diff 的高频面试题

### 常见问题

#### 为什么末尾移到开头效率低

**问题描述：** 只移动了一个元素但 React 标记了多次移动。

**解决方案：**

```
React 的移动判断是单向的（从左到右），只标记"向右移动"：

D 移到开头后：
  D 在旧列表中 index=3，是最大的
  → lastPlacedIndex 被设为 3
  → 后续所有节点的 oldIndex 都小于 3
  → 都被标记为"移动"

这是 React Diff 算法的已知局限：
  → 它追求实现简单和 O(n) 复杂度
  → 代价是某些场景下移动次数不是最优

实际影响有限：
  → DOM 移动操作（insertBefore/appendChild）本身很快
  → 真正耗时的是创建和销毁 DOM 节点
  → React 的策略保证了不会多创建/销毁节点
```

### 注意事项

- lastPlacedIndex 从0开始，记录最后一个不需移动的旧节点位置
- oldIndex < lastPlacedIndex → 标记 Placement（移动）
- oldIndex >= lastPlacedIndex → 不移动，更新 lastPlacedIndex
- 将元素移到列表末尾比移到开头的 DOM 操作更少
- 算法不总是产生最少移动次数，但保证 O(n) 复杂度

### 总结

React 通过 lastPlacedIndex 判断节点是否需要移动：旧位置小于 lastPlacedIndex 的节点需要向右移动，否则保持不动。这个算法简单高效（O(n)），但某些场景（如末尾移到开头）不是最优的移动方案。实际影响有限，因为 DOM 移动操作本身比创建销毁快得多。将元素移到末尾比移到开头更高效。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 双缓冲机制的Current Tree与WorkInProgress Tree

### 概念说明

React 内部维护两棵 Fiber 树：`current` 树和 `workInProgress` 树。current 树对应当前屏幕上显示的 UI，workInProgress 树是正在后台构建的新 UI。这种机制借鉴了图形学中的双缓冲（Double Buffering）技术——在后台缓冲区完成绘制后一次性切换到前台，避免用户看到半完成的画面。

两棵树中对应位置的 Fiber 节点通过 `alternate` 指针互相连接。更新时 React 基于 current 树构建 workInProgress 树，尽量复用 current 树中未变化的节点。当 workInProgress 树构建完成并在 Commit 阶段提交到 DOM 后，React 将 `fiberRoot.current` 指针切换到 workInProgress 树，它就成了新的 current 树。旧的 current 树变成下次更新的 workInProgress 基础。

### 基本示例

```tsx
// 示例说明：双缓冲机制在更新中的体现

import React, { useState } from "react";

function DoubleBufferDemo() {
    const [count, setCount] = useState(0);

    // 点击 +1 时的双缓冲工作流程：
    // 1. 当前屏幕显示 count=0（current 树）
    // 2. setState 触发更新
    // 3. 基于 current 树构建 workInProgress 树
    //    - App Fiber：复用（alternate 指针连接）
    //    - div Fiber：复用
    //    - p Fiber：更新 children（0 → 1）
    //    - button Fiber：复用
    // 4. workInProgress 树构建完成
    // 5. Commit 阶段：更新 DOM，切换 current 指针
    // 6. 现在屏幕显示 count=1（新的 current 树）

    return (
        <div>
            <p>计数: {count}</p>
            <button onClick={() => setCount(c => c + 1)}>+1</button>
        </div>
    );
}

export default DoubleBufferDemo;
```

### 内部原理

#### 双缓冲切换流程

```
初始渲染：
  fiberRoot.current → rootFiber (current)
  构建 workInProgress 树（全新创建）
  Commit 后：fiberRoot.current 切换到 workInProgress

  rootFiber(WIP) ←── alternate ──→ rootFiber(current)
       ↓ commit 后
  rootFiber(current)                rootFiber(旧)

更新渲染：
  fiberRoot.current → rootFiber (current, 上次的 WIP)
  构建新的 workInProgress 树（基于旧的 current，即上上次的 WIP）
  尽量复用 alternate 中未变化的属性
  Commit 后：再次切换

  每次更新交替使用两棵树：
  第1次更新：TreeA(current) → TreeB(WIP) → TreeB 变 current
  第2次更新：TreeB(current) → TreeA(WIP) → TreeA 变 current
  第3次更新：TreeA(current) → TreeB(WIP) → TreeB 变 current
  ...交替进行
```

#### createWorkInProgress 的复用逻辑

```javascript
// 创建 workInProgress 节点（简化）
function createWorkInProgress(current) {
    let workInProgress = current.alternate;

    if (workInProgress === null) {
        // 首次：创建新的 Fiber 节点
        workInProgress = createFiber(current.tag, current.pendingProps);
        workInProgress.stateNode = current.stateNode;

        // 建立 alternate 连接
        workInProgress.alternate = current;
        current.alternate = workInProgress;
    } else {
        // 复用已有的 alternate 节点
        // 更新 props 和副作用标记
        workInProgress.pendingProps = current.pendingProps;
        workInProgress.flags = NoFlags;
        workInProgress.subtreeFlags = NoFlags;
    }

    // 复制需要的属性
    workInProgress.child = current.child;
    workInProgress.memoizedState = current.memoizedState;
    workInProgress.lanes = current.lanes;

    return workInProgress;
}
```

### 与相关API的对比

| 对比维度 | current 树 | workInProgress 树 |
|----------|-----------|------------------|
| 对应 UI | 当前屏幕显示的 | 正在后台构建的 |
| 可见性 | 用户可见 | 用户不可见 |
| 修改 | 不直接修改 | 在 Render 阶段修改 |
| 切换时机 | Commit 阶段完成后 | Commit 阶段完成后变为 current |
| 中断影响 | 不受影响 | 可以被丢弃重建 |

### 适用场景

- **理解 React 更新不闪烁：** 双缓冲保证 UI 一致性
- **理解并发渲染：** WIP 树可以被中断和丢弃而不影响当前 UI
- **源码阅读：** alternate 指针是理解 React 源码的关键
- **面试回答：** 双缓冲是 Fiber 架构的高频面试题

### 常见问题

#### 双缓冲会不会占用双倍内存

**问题描述：** 维护两棵树是否内存消耗很大。

**解决方案：**

```
不会占用严格的双倍内存：

1. Fiber 节点通过 alternate 复用
   → 不是每次都新建所有节点
   → 大部分属性直接从 current 复制

2. stateNode（真实 DOM 节点）是共享的
   → 两棵树中对应的 Fiber 指向同一个 DOM 节点
   → DOM 节点不会重复创建

3. 未变化的子树直接复用
   → 如果子树没有更新，child 指针直接指向 current 的子节点
   → 不需要为未变化的部分创建 WIP 节点

实际额外内存开销：
   → 大约是变化路径上的 Fiber 节点数量
   → 远小于整棵树的大小
```

### 注意事项

- current 和 workInProgress 通过 alternate 指针互相连接
- Commit 阶段的 current 切换是一个指针赋值操作（原子性）
- workInProgress 树在 Render 阶段被构建，可以被中断
- stateNode（DOM 节点）在两棵树之间共享
- 未变化的子树通过复用 current 节点避免内存浪费

### 总结

React 通过 current 和 workInProgress 两棵 Fiber 树实现双缓冲。current 对应屏幕 UI，workInProgress 在后台构建。两棵树通过 alternate 指针连接，Commit 阶段切换 current 指针。双缓冲保证了 UI 一致性（不会出现半渲染状态），支持并发渲染中的中断和恢复。未变化的节点通过复用避免内存浪费。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 批量更新(Batching)的自动批处理

### 概念说明

批量更新（Batching）是指 React 将多次 `setState` 调用合并为一次重新渲染。如果在一个事件处理函数中连续调用三次 setState，React 不会渲染三次，而是将三次更新合并后只渲染一次。这避免了不必要的中间渲染，提升了性能。

在 React 17 及之前版本中，自动批处理只在 React 事件处理函数中生效。在 setTimeout、Promise 回调、原生 DOM 事件等场景中，每次 setState 都会触发独立的渲染。React 18 通过 `createRoot` 引入了全面的自动批处理——无论 setState 在什么上下文中调用，都会被自动合并。

### 基本示例

```tsx
// 示例说明：自动批处理将多次 setState 合并为一次渲染

import React, { useState } from "react";

function BatchingDemo() {
    const [count, setCount] = useState(0);
    const [flag, setFlag] = useState(false);
    const [text, setText] = useState("初始");

    console.log("组件渲染"); // 观察渲染次数

    // React 事件中：自动批处理（React 17 和 18 都支持）
    const handleClick = () => {
        setCount(c => c + 1);    // 不会立即渲染
        setFlag(f => !f);        // 不会立即渲染
        setText("已更新");       // 不会立即渲染
        // 三次 setState 合并为一次渲染
        // console.log("组件渲染") 只打印一次
    };

    // React 18：setTimeout 中也自动批处理
    const handleTimeout = () => {
        setTimeout(() => {
            setCount(c => c + 1);    // React 18：不会立即渲染
            setFlag(f => !f);        // React 18：不会立即渲染
            setText("延时更新");     // React 18：不会立即渲染
            // React 18：合并为一次渲染
            // React 17：渲染三次（每次 setState 都触发）
        }, 100);
    };

    return (
        <div>
            <p>count: {count}, flag: {String(flag)}, text: {text}</p>
            <button onClick={handleClick}>同步批处理</button>
            <button onClick={handleTimeout}>setTimeout 批处理</button>
        </div>
    );
}

export default BatchingDemo;
```

### 内部原理

#### 批处理的工作机制

```
React 17 事件处理中的批处理：
  React 在执行事件处理函数前设置一个标记 isBatchingUpdates = true
  → 事件处理函数中的 setState 不立即触发渲染
  → 而是将更新加入队列
  → 事件处理函数执行完毕后，React 读取队列一次性渲染

React 18 的全面自动批处理：
  所有更新默认进入"并发模式"的更新队列
  → 每个 setState 将更新加入 Fiber 节点的 updateQueue
  → React 在微任务（microtask）结束后统一调度渲染
  → 无论 setState 在什么上下文中调用
```

#### 批处理 vs 非批处理

```
批处理（React 18 默认）：
  setState(A)  → 加入队列
  setState(B)  → 加入队列
  setState(C)  → 加入队列
  → 一次渲染（合并 A+B+C 的结果）

非批处理（React 17 在 setTimeout 中）：
  setState(A) → 渲染1（只有 A 的变化）
  setState(B) → 渲染2（A+B 的变化）
  setState(C) → 渲染3（A+B+C 的变化）
  → 三次渲染，三次 DOM 更新
```

### 与相关API的对比

| 场景 | React 17 | React 18 (createRoot) |
|------|---------|---------------------|
| React 事件处理 | 自动批处理 | 自动批处理 |
| setTimeout | 不批处理 | 自动批处理 |
| Promise.then | 不批处理 | 自动批处理 |
| 原生 addEventListener | 不批处理 | 自动批处理 |
| fetch 回调 | 不批处理 | 自动批处理 |

### 适用场景

- **表单提交：** 同时更新多个状态（loading、data、error）
- **数据请求回调：** 请求完成后更新多个状态
- **复杂交互：** 一个操作需要更新多个 state

### 常见问题

#### 如何退出自动批处理

**问题描述：** 某些场景需要每次 setState 后立即更新 DOM。

**解决方案：**

```tsx
import { flushSync } from "react-dom";

function handleClick() {
    // flushSync 强制同步更新
    flushSync(() => {
        setCount(c => c + 1);
    });
    // 此时 DOM 已更新

    flushSync(() => {
        setFlag(f => !f);
    });
    // 此时 DOM 再次更新

    // 总共渲染两次（每个 flushSync 一次）
}

// 使用场景：
// - 需要在 setState 后立即读取 DOM
// - 依赖前一次更新的 DOM 结果
// - 一般不需要使用，大多数场景自动批处理更好
```

### 注意事项

- React 18 的自动批处理需要使用 createRoot（不是 ReactDOM.render）
- 自动批处理在所有上下文中生效（事件、setTimeout、Promise 等）
- flushSync 可以退出批处理，强制同步渲染
- 批处理不改变 state 更新的顺序，只合并渲染次数
- 同一 state 的多次 setState 只保留最后一次（或函数式更新依次执行）

### 总结

批量更新将多次 setState 合并为一次渲染，避免不必要的中间渲染。React 17 只在事件处理中自动批处理，React 18 通过 createRoot 实现全面自动批处理——setTimeout、Promise、原生事件中的 setState 都会被合并。可以用 flushSync 退出批处理。批处理不改变更新顺序，只减少渲染次数。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 自动批处理的setTimeout/Promise突破

### 概念说明

在 React 17 及之前版本中，自动批处理只在 React 合成事件和生命周期方法中生效。一旦代码执行上下文离开了 React 的控制范围——比如进入 setTimeout 回调、Promise.then 回调、原生 DOM 事件监听器中——每次 setState 都会立即触发一次独立的渲染。

这种行为的根本原因是 React 17 的批处理机制依赖同步的执行上下文标记（`isBatchingUpdates`）。当代码进入异步回调时，这个标记已经被重置，React 无法感知后续的 setState 属于同一批操作。React 18 通过重新设计更新队列机制，使用微任务调度来统一处理所有更新，从而突破了这个限制。

### 基本示例

```tsx
// 示例说明：React 17 vs React 18 在异步场景中的批处理差异

import React, { useState } from "react";

function AsyncBatchingDemo() {
    const [count, setCount] = useState(0);
    const [name, setName] = useState("初始");

    // 每次渲染都会打印
    console.log("渲染:", { count, name });

    // setTimeout 中的多次 setState
    const handleTimeout = () => {
        setTimeout(() => {
            setCount(c => c + 1);
            setName("timeout更新");
            // React 17：渲染两次
            //   渲染1: { count: 1, name: "初始" }
            //   渲染2: { count: 1, name: "timeout更新" }
            // React 18：渲染一次
            //   渲染: { count: 1, name: "timeout更新" }
        }, 0);
    };

    // Promise 中的多次 setState
    const handlePromise = () => {
        fetch("/api/data").then(() => {
            setCount(c => c + 1);
            setName("promise更新");
            // React 17：渲染两次
            // React 18：渲染一次
        });
    };

    // 原生事件中的多次 setState
    // const ref = useRef<HTMLButtonElement>(null);
    // useEffect(() => {
    //     ref.current?.addEventListener("click", () => {
    //         setCount(c => c + 1);
    //         setName("native更新");
    //         // React 17：渲染两次
    //         // React 18：渲染一次
    //     });
    // }, []);

    return (
        <div>
            <p>count: {count}, name: {name}</p>
            <button onClick={handleTimeout}>setTimeout 测试</button>
            <button onClick={handlePromise}>Promise 测试</button>
        </div>
    );
}

export default AsyncBatchingDemo;
```

### 内部原理

#### React 17 的批处理机制

```javascript
// React 17 的批处理（简化）
let isBatchingUpdates = false;

function batchedUpdates(fn) {
    isBatchingUpdates = true;   // 进入批处理模式
    fn();                       // 执行事件处理函数
    isBatchingUpdates = false;  // 退出批处理模式
    flushPendingUpdates();      // 统一处理队列中的更新
}

function setState(update) {
    enqueueUpdate(update);      // 加入更新队列
    if (!isBatchingUpdates) {
        // 不在批处理模式 → 立即渲染
        flushPendingUpdates();
    }
    // 在批处理模式 → 等 batchedUpdates 结束后统一渲染
}

// 问题：setTimeout 中的 setState
onClick = () => {
    // batchedUpdates 包裹了 onClick
    // isBatchingUpdates = true
    setTimeout(() => {
        // 执行到这里时 batchedUpdates 已经结束
        // isBatchingUpdates = false
        setState(A);  // → 立即渲染（不在批处理中）
        setState(B);  // → 立即渲染（不在批处理中）
    }, 0);
};
```

#### React 18 的改进

```javascript
// React 18 的批处理（简化）
// 不再依赖同步标记，而是使用调度机制

function setState(update) {
    enqueueUpdate(update);      // 加入 Fiber 的更新队列
    scheduleUpdateOnFiber();    // 调度更新
}

function scheduleUpdateOnFiber() {
    // 将渲染调度为一个微任务
    // 同一个事件循环中的多次 setState 会合并
    ensureRootIsScheduled(root);
}

function ensureRootIsScheduled(root) {
    // 如果已经调度了渲染，不重复调度
    if (root.callbackNode !== null) {
        return;  // 已经有一个待执行的渲染任务
    }
    // 调度一个新的渲染任务
    // 使用 MessageChannel 或微任务
    scheduleMicrotask(() => {
        performConcurrentWorkOnRoot(root);
    });
}

// 结果：无论 setState 在什么上下文中
// 同一个微任务周期内的多次 setState 都会合并
```

### 与相关API的对比

| 异步场景 | React 17 渲染次数 | React 18 渲染次数 | 差异原因 |
|---------|-----------------|-----------------|---------|
| 事件处理中 2次 setState | 1次 | 1次 | 两者都批处理 |
| setTimeout 中 2次 | 2次 | 1次 | React 18 自动批处理 |
| Promise.then 中 2次 | 2次 | 1次 | React 18 自动批处理 |
| addEventListener 中 2次 | 2次 | 1次 | React 18 自动批处理 |
| await 之后 2次 | 2次 | 1次 | React 18 自动批处理 |

### 适用场景

- **数据请求回调：** fetch/axios 回调中更新多个状态
- **定时器操作：** setTimeout/setInterval 中的状态更新
- **WebSocket 消息：** 收到消息后更新多个状态
- **第三方库回调：** 不受 React 控制的回调函数

### 常见问题

#### 升级 React 18 后行为变化

**问题描述：** React 17 代码升级到 18 后，依赖"每次 setState 都渲染"的逻辑可能出问题。

**解决方案：**

```tsx
import { flushSync } from "react-dom";

// React 17 的行为：每次 setState 立即渲染
// 某些代码可能依赖这个行为

// 如果升级 React 18 后需要保持旧行为：
function handleTimeout() {
    setTimeout(() => {
        // 用 flushSync 强制同步渲染
        flushSync(() => {
            setCount(c => c + 1);
        });
        // DOM 已更新，可以读取新的 DOM 状态

        flushSync(() => {
            setName("更新");
        });
        // DOM 再次更新
    }, 0);
}

// 但大多数情况下不需要 flushSync
// 自动批处理带来的是性能提升，不影响最终结果
```

### 注意事项

- React 18 的全面批处理需要使用 createRoot API
- 使用 ReactDOM.render（Legacy 模式）仍然是 React 17 的行为
- flushSync 可以退出批处理，但应该尽量少用
- 批处理不影响最终渲染结果，只减少中间渲染次数
- 升级 React 18 时注意检查依赖"立即渲染"行为的代码

### 总结

React 17 的自动批处理仅在 React 事件处理函数中生效，setTimeout、Promise、原生事件中的 setState 不会批处理。React 18 通过重新设计调度机制，使用微任务统一处理所有更新，实现了全面自动批处理。升级到 React 18 时需注意行为变化，flushSync 可以在需要时退出批处理。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## React 18的自动批处理全面化

### 概念说明

React 18 将自动批处理从"仅 React 事件中生效"升级为"所有上下文中生效"。这是 React 18 最重要的默认行为变更之一。只要应用使用了 `createRoot` API（而非旧的 `ReactDOM.render`），无论 setState 在哪里调用——事件处理器、setTimeout、Promise、原生事件、甚至 queueMicrotask——都会自动合并为一次渲染。

这个变化的前提是使用新的 Root API。如果仍然使用 `ReactDOM.render`（Legacy 模式），行为与 React 17 完全一致。这也是 React 18 升级指南中强调迁移到 `createRoot` 的原因之一。

### 基本示例

```tsx
// 示例说明：React 18 全面自动批处理的各种场景

import React, { useState, useEffect, useRef } from "react";

function FullAutoBatchingDemo() {
    const [a, setA] = useState(0);
    const [b, setB] = useState(0);
    const [c, setC] = useState(0);
    const renderCount = useRef(0);

    renderCount.current++;
    console.log(`渲染第 ${renderCount.current} 次: a=${a}, b=${b}, c=${c}`);

    // 场景1：React 事件处理（React 17 和 18 都批处理）
    const handleEvent = () => {
        setA(v => v + 1);
        setB(v => v + 1);
        setC(v => v + 1);
        // 一次渲染
    };

    // 场景2：setTimeout（React 18 自动批处理）
    const handleTimeout = () => {
        setTimeout(() => {
            setA(v => v + 1);
            setB(v => v + 1);
            setC(v => v + 1);
            // React 18：一次渲染
        }, 0);
    };

    // 场景3：Promise（React 18 自动批处理）
    const handlePromise = () => {
        Promise.resolve().then(() => {
            setA(v => v + 1);
            setB(v => v + 1);
            setC(v => v + 1);
            // React 18：一次渲染
        });
    };

    // 场景4：原生事件（React 18 自动批处理）
    const btnRef = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        const handler = () => {
            setA(v => v + 1);
            setB(v => v + 1);
            setC(v => v + 1);
            // React 18：一次渲染
        };
        btnRef.current?.addEventListener("click", handler);
        return () => btnRef.current?.removeEventListener("click", handler);
    }, []);

    // 场景5：混合异步（React 18 自动批处理）
    const handleMixed = async () => {
        const data = await fetch("/api/data").then(r => r.json());
        setA(data.a);
        setB(data.b);
        setC(data.c);
        // React 18：一次渲染（await 之后也批处理）
    };

    return (
        <div>
            <p>a={a}, b={b}, c={c} | 总渲染次数: {renderCount.current}</p>
            <button onClick={handleEvent}>React 事件</button>
            <button onClick={handleTimeout}>setTimeout</button>
            <button onClick={handlePromise}>Promise</button>
            <button ref={btnRef}>原生事件</button>
        </div>
    );
}

export default FullAutoBatchingDemo;
```

### 内部原理

#### createRoot vs ReactDOM.render

```tsx
// React 18 新的 Root API（启用全面自动批处理）
import { createRoot } from "react-dom/client";

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
// → 全面自动批处理
// → 支持并发特性（useTransition, Suspense 等）

// React 17 旧的 API（Legacy 模式，不支持全面批处理）
// import ReactDOM from "react-dom";
// ReactDOM.render(<App />, document.getElementById("root"));
// → 只在 React 事件中批处理
// → 不支持并发特性
```

#### 批处理的调度机制对比

```
React 17（Legacy 模式）：
  同步执行上下文标记 → 只能在同步代码块内批处理

React 18（Concurrent 模式）：
  基于调度器的队列机制 →
  1. setState 将更新加入 Fiber 的 updateQueue
  2. 调用 ensureRootIsScheduled 注册渲染回调
  3. 如果已有渲染回调在队列中，跳过注册
  4. 当前同步代码执行完毕后
  5. 调度器在下一个微任务中统一执行渲染
  → 同一轮事件循环中的所有 setState 自然被合并
```

### 与相关API的对比

| Root API | 模式 | 自动批处理范围 | 并发特性 |
|----------|------|-------------|---------|
| createRoot | Concurrent | 全部上下文 | 支持 |
| ReactDOM.render | Legacy | 仅 React 事件 | 不支持 |
| hydrateRoot | Concurrent (SSR) | 全部上下文 | 支持 |

### 适用场景

- **新项目：** 直接使用 createRoot，享受全面批处理
- **项目迁移：** 从 ReactDOM.render 迁移到 createRoot
- **性能优化：** 减少异步回调中的不必要渲染
- **复杂状态更新：** 多个 setState 在任意上下文中自动合并

### 常见问题

#### 迁移到 createRoot 需要注意什么

**问题描述：** 从 ReactDOM.render 升级到 createRoot 可能影响现有行为。

**解决方案：**

```tsx
// 升级步骤：

// 1. 修改入口文件
// 旧代码：
// ReactDOM.render(<App />, document.getElementById("root"));

// 新代码：
// const root = createRoot(document.getElementById("root")!);
// root.render(<App />);

// 2. 检查依赖"每次 setState 立即渲染"的代码
// 如果有类似逻辑：
// setTimeout(() => {
//     setCount(1);
//     console.log(domRef.current.textContent); // React 17: 已更新
//     // React 18: 还未更新（批处理中）
// });

// 修复：用 flushSync 或将 DOM 读取放在 useEffect 中

// 3. 如果不确定影响范围，可以先保持 ReactDOM.render
//    逐步迁移到 createRoot
```

### 注意事项

- 全面自动批处理仅在 createRoot 模式下生效
- ReactDOM.render 是 Legacy 模式，行为与 React 17 一致
- React 19 中 ReactDOM.render 已被移除，必须使用 createRoot
- flushSync 可以在需要时退出批处理
- 批处理只减少渲染次数，不改变最终状态结果
- 自动批处理对性能的提升在大型应用中更明显

### 总结

React 18 通过 createRoot API 实现了全面自动批处理，所有上下文（事件、setTimeout、Promise、原生事件、async/await）中的多次 setState 都会合并为一次渲染。这是从 Legacy 模式升级到 Concurrent 模式的核心收益之一。React 19 已移除 ReactDOM.render，createRoot 成为唯一的入口方式。flushSync 用于在需要时退出批处理。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。



## 6.8 类组件生命周期

## 挂载阶段constructor

### 概念说明

`constructor` 是类组件的构造函数，在组件实例创建时最先被调用，是挂载阶段的第一个步骤。它有两个核心用途：初始化组件的 `this.state` 和绑定事件处理方法的 `this`。constructor 接收 `props` 参数，必须在函数体内第一行调用 `super(props)`，否则 `this.props` 在构造函数中为 undefined。

在函数组件和 Hooks 普及之后，constructor 的使用已经大幅减少。`useState` 替代了 state 初始化，箭头函数替代了手动绑定 this。但在维护旧代码或理解 React 底层机制时，仍需要掌握 constructor 的作用和注意事项。

### 基本示例

```tsx
// 示例说明：constructor 的两个核心用途

import React, { Component } from "react";

interface CounterProps {
    initialCount: number;
}

interface CounterState {
    count: number;
    name: string;
}

class Counter extends Component<CounterProps, CounterState> {
    // 构造函数：组件创建时第一个执行
    constructor(props: CounterProps) {
        // 必须首先调用 super(props)
        // 否则 this.props 在构造函数中为 undefined
        super(props);

        // 用途1：初始化 state（唯一可以直接赋值 this.state 的地方）
        this.state = {
            count: props.initialCount,  // 可以用 props 初始化 state
            name: "计数器",
        };

        // 用途2：绑定事件处理方法的 this
        this.handleIncrement = this.handleIncrement.bind(this);
        this.handleDecrement = this.handleDecrement.bind(this);
    }

    handleIncrement() {
        this.setState({ count: this.state.count + 1 });
    }

    handleDecrement() {
        this.setState({ count: this.state.count - 1 });
    }

    render() {
        return (
            <div>
                <h2>{this.state.name}: {this.state.count}</h2>
                <button onClick={this.handleIncrement}>+1</button>
                <button onClick={this.handleDecrement}>-1</button>
            </div>
        );
    }
}

// 更简洁的写法（不需要 constructor）
class ModernCounter extends Component<CounterProps, CounterState> {
    // 类属性语法直接初始化 state（等价于 constructor 中赋值）
    state: CounterState = {
        count: this.props.initialCount,
        name: "计数器",
    };

    // 箭头函数自动绑定 this（不需要手动 bind）
    handleIncrement = () => {
        this.setState({ count: this.state.count + 1 });
    };

    handleDecrement = () => {
        this.setState({ count: this.state.count - 1 });
    };

    render() {
        return (
            <div>
                <h2>{this.state.name}: {this.state.count}</h2>
                <button onClick={this.handleIncrement}>+1</button>
                <button onClick={this.handleDecrement}>-1</button>
            </div>
        );
    }
}

export default Counter;
```

### 与相关API的对比

| 对比维度 | constructor | 类属性初始化 | Hooks (useState) |
|----------|-----------|------------|-----------------|
| state 初始化 | this.state = {...} | state = {...} | useState(初始值) |
| this 绑定 | bind(this) | 箭头函数 | 不需要 |
| 代码量 | 多 | 少 | 最少 |
| 是否需要 super | 需要 | 不需要 | 不需要 |
| 推荐程度（2026） | 不推荐 | 可用 | 推荐 |

### 适用场景

- **遗留代码维护：** 旧的类组件项目
- **理解 React 机制：** 面试中常问的生命周期知识
- **Error Boundary：** 目前仍需要类组件实现

### 常见问题

#### constructor 中能否调用 setState

**问题描述：** 在 constructor 中调用 setState 会怎样。

**解决方案：**

```tsx
class Wrong extends Component {
    constructor(props: any) {
        super(props);
        // 错误：constructor 中不能调用 setState
        // this.setState({ count: 0 });
        // → 会报警告，因为组件还没挂载

        // 正确：直接赋值 this.state
        this.state = { count: 0 };
    }
}
```

### 注意事项

- 必须在第一行调用 super(props)
- constructor 是唯一可以直接给 this.state 赋值的地方
- 不要在 constructor 中调用 setState
- 不要在 constructor 中产生副作用（如 fetch 请求）
- 不要将 props 复制到 state 中（除非明确需要作为初始值且后续不同步）
- 现代写法中类属性语法和箭头函数可以完全替代 constructor

### 总结

constructor 是类组件挂载阶段的第一个方法，用于初始化 state 和绑定 this。必须先调用 super(props)，不能调用 setState 或产生副作用。现代写法中类属性语法和箭头函数已经替代了 constructor 的两个核心用途。在 2026 年的开发中，函数组件 + Hooks 是主流方案，constructor 主要用于理解原理和维护旧代码。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 挂载阶段static getDerivedStateFromProps

### 概念说明

`static getDerivedStateFromProps` 是一个静态生命周期方法，在每次渲染前（包括挂载和更新）都会被调用。它接收即将应用的 props 和当前的 state，返回一个对象来更新 state，或者返回 null 表示不需要更新。因为是静态方法，它无法访问组件实例（this），不能调用 this.setState 或读取 this.props。

这个方法是 React 16.3 引入的，用于替代已废弃的 `componentWillReceiveProps`。它的设计目的是让 state 能够"派生"自 props——当 props 变化时，state 跟着调整。但 React 官方文档明确指出，大部分场景不需要这个方法，它很容易被滥用。

### API 签名与参数

```typescript
static getDerivedStateFromProps(
    props: Readonly<Props>,
    state: Readonly<State>
): Partial<State> | null
```

| 参数 | 类型 | 说明 |
|------|------|------|
| props | Props | 组件即将使用的 props |
| state | State | 组件当前的 state |
| 返回值 | Partial\&lt;State\> \| null | 要合并到 state 的对象，或 null |

### 基本示例

```tsx
// 示例说明：getDerivedStateFromProps 根据 props 派生 state

import React, { Component } from "react";

interface EmailInputProps {
    userEmail: string;  // 外部传入的邮箱（props 控制）
}

interface EmailInputState {
    email: string;          // 当前输入框的值
    prevPropsEmail: string; // 保存上一次的 props 值用于对比
}

class EmailInput extends Component<EmailInputProps, EmailInputState> {
    state: EmailInputState = {
        email: this.props.userEmail,
        prevPropsEmail: this.props.userEmail,
    };

    // 静态方法：每次渲染前调用
    static getDerivedStateFromProps(
        props: EmailInputProps,
        state: EmailInputState
    ): Partial<EmailInputState> | null {
        // 只有当 props.userEmail 变化时才更新 state
        if (props.userEmail !== state.prevPropsEmail) {
            return {
                email: props.userEmail,            // 重置为新的 props 值
                prevPropsEmail: props.userEmail,    // 记录新的 props
            };
        }
        // props 没变，不更新 state
        return null;
    }

    handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // 用户输入时只更新 state，不影响 props 对比
        this.setState({ email: e.target.value });
    };

    render() {
        return (
            <input
                value={this.state.email}
                onChange={this.handleChange}
            />
        );
    }
}

export default EmailInput;
```

### 内部原理

#### 执行时机

```
挂载阶段执行顺序：
  constructor → getDerivedStateFromProps → render → componentDidMount

更新阶段执行顺序：
  getDerivedStateFromProps → shouldComponentUpdate → render →
  getSnapshotBeforeUpdate → componentDidUpdate

注意：
  - 每次渲染前都调用（不只是 props 变化时）
  - setState 触发的更新也会调用
  - forceUpdate 触发的更新也会调用
  - 返回值会与当前 state 浅合并（类似 setState）
```

### 与相关API的对比

| 对比维度 | getDerivedStateFromProps | componentWillReceiveProps（已废弃） |
|----------|------------------------|----------------------------------|
| 触发时机 | 每次渲染前 | 仅 props 变化时 |
| 访问 this | 不可以（静态方法） | 可以 |
| 副作用 | 不允许 | 可以（但不应该） |
| 返回值 | 状态更新对象或 null | 无返回值 |

### 适用场景

- **表单重置：** 外部 props 变化时重置表单内容
- **动画初始化：** 基于 props 计算动画的初始状态
- **受控/非受控切换：** 某些字段在 props 变化时需要同步

### 常见问题

#### 为什么大多数场景不需要这个方法

**解决方案：**

```
React 官方建议的替代方案：

1. 需要执行副作用 → 用 componentDidUpdate
2. props 变化时需要重新计算 → 用 memoize 或在 render 中计算
3. props 变化时需要重置整个组件 → 用 key 属性重建组件
4. 只需要初始值 → 在 constructor 中设置
```

### 注意事项

- 静态方法，无法访问 this
- 每次渲染都会调用（不只是 props 变化时）
- 返回值与 state 浅合并，返回 null 不更新
- 大部分场景有更好的替代方案
- 如果需要对比前后 props，需要在 state 中保存上一次的 props 值
- 不能在这个方法中产生副作用

### 总结

static getDerivedStateFromProps 在每次渲染前调用，用于根据 props 更新 state。是静态方法，不能访问 this。返回对象合并到 state，返回 null 不更新。大部分场景有更好的替代方案（key 重建组件、componentDidUpdate、render 中计算）。在 2026 年的开发中，函数组件配合 useEffect 和 useState 是更好的选择。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 挂载阶段render

### 概念说明

`render()` 是类组件中唯一必须实现的方法，也是生命周期中最核心的方法。它负责描述组件应该渲染什么内容，返回 React 元素（JSX）、字符串、数字、数组、Fragment、Portal、布尔值或 null。render 方法在挂载和更新阶段都会被调用。

render 必须是一个纯函数：给定相同的 props 和 state，每次调用应该返回相同的结果。不能在 render 中调用 setState、操作 DOM 或发起网络请求。render 方法返回的 JSX 会被转换为 ReactElement 对象，React 用它来更新虚拟 DOM 并最终同步到真实 DOM。

### 基本示例

```tsx
// 示例说明：render 方法的各种返回值类型

import React, { Component } from "react";

// 返回 JSX 元素（最常见）
class UserCard extends Component<{ name: string; age: number }> {
    render() {
        // render 中可以进行纯计算
        const isAdult = this.props.age >= 18;
        const greeting = isAdult ? "先生/女士" : "同学";

        // 返回 JSX（ReactElement）
        return (
            <div className="user-card">
                <h2>{this.props.name} {greeting}</h2>
                <p>年龄: {this.props.age}</p>
            </div>
        );
    }
}

// 条件渲染：返回 null 表示不渲染任何内容
class ConditionalRender extends Component<{ visible: boolean }> {
    render() {
        if (!this.props.visible) {
            return null;  // 不渲染任何 DOM 节点
        }
        return <div>我是可见的内容</div>;
    }
}

// 返回数组（多个同级元素）
class MultipleElements extends Component {
    render() {
        // 返回数组时每个元素需要 key
        return [
            <li key="1">第一项</li>,
            <li key="2">第二项</li>,
            <li key="3">第三项</li>,
        ];
    }
}

// 返回 Fragment
class FragmentExample extends Component {
    render() {
        return (
            <>
                <td>姓名</td>
                <td>年龄</td>
            </>
        );
    }
}

// 返回字符串或数字
class SimpleReturn extends Component {
    render() {
        return "纯文本内容";  // 渲染为文本节点
    }
}

export default UserCard;
```

### 内部原理

#### render 在生命周期中的位置

```
挂载阶段：
  constructor → getDerivedStateFromProps → render → DOM 更新 → componentDidMount

更新阶段：
  getDerivedStateFromProps → shouldComponentUpdate →
  render → getSnapshotBeforeUpdate → DOM 更新 → componentDidUpdate

render 属于 Render 阶段（纯计算）：
  - 不能有副作用
  - 可以被并发模式中断和重新调用
  - 严格模式下会被调用两次（开发环境）
```

### 与相关API的对比

| render 返回值 | 渲染结果 | 使用场景 |
|-------------|---------|---------|
| JSX 元素 | DOM 节点 | 最常见的场景 |
| null | 不渲染任何内容 | 条件隐藏组件 |
| false/true | 不渲染任何内容 | 条件逻辑 |
| 字符串/数字 | 文本节点 | 纯文本展示 |
| 数组 | 多个同级节点 | 列表渲染 |
| Fragment | 无额外 DOM 包裹 | 避免多余 div |
| Portal | 渲染到其他 DOM 节点 | 弹窗、Tooltip |

### 适用场景

- **UI 描述：** 所有类组件都必须实现 render
- **条件渲染：** 根据 state/props 返回不同的 UI
- **列表渲染：** map 生成多个元素
- **组合模式：** 通过 this.props.children 组合子组件

### 常见问题

#### render 中能否调用 setState

**问题描述：** 直接在 render 中调用 setState 会怎样。

**解决方案：**

```tsx
class Wrong extends Component {
    render() {
        // 错误：render 中调用 setState 导致无限循环
        // this.setState({ count: 1 });
        // setState → 触发更新 → 调用 render → 又 setState → 无限循环

        // 正确：在 componentDidMount 或事件处理器中调用 setState
        return <div>{this.state.count}</div>;
    }
}
```

### 注意事项

- render 是类组件唯一必须实现的方法
- render 必须是纯函数，不能有副作用
- 不能在 render 中调用 setState（导致无限循环）
- 不能在 render 中操作 DOM（DOM 此时可能还没更新）
- 返回 null 或 false 时组件不渲染但仍然存在于组件树中
- shouldComponentUpdate 返回 false 时 render 不会被调用

### 总结

render 是类组件唯一必须实现的方法，在挂载和更新阶段都会调用。必须是纯函数，不能有副作用或调用 setState。可以返回 JSX、null、字符串、数组、Fragment 等类型。返回值描述了组件应该渲染的 UI 结构，React 根据它来更新虚拟 DOM 和真实 DOM。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 挂载阶段componentDidMount

### 概念说明

`componentDidMount` 在组件首次渲染并挂载到 DOM 之后立即调用，是挂载阶段的最后一个生命周期方法。此时组件对应的真实 DOM 节点已经存在于页面中，可以安全地操作 DOM、发起网络请求、设置订阅（如定时器、事件监听、WebSocket 连接等）。

componentDidMount 只在组件整个生命周期中调用一次（挂载时）。如果组件被卸载后重新挂载，会再次调用。它与 componentWillUnmount 是一对，通常在 componentDidMount 中建立的连接或订阅需要在 componentWillUnmount 中清理。在函数组件中，useEffect 的空依赖数组写法等价于 componentDidMount。

### 基本示例

```tsx
// 示例说明：componentDidMount 的常见用途

import React, { Component } from "react";

interface User {
    id: number;
    name: string;
    email: string;
}

interface UserListState {
    users: User[];
    loading: boolean;
    error: string | null;
}

class UserList extends Component<{}, UserListState> {
    // 定时器 ID，用于清理
    private timerID: number | null = null;

    state: UserListState = {
        users: [],
        loading: true,
        error: null,
    };

    // 组件挂载后：发起数据请求
    componentDidMount() {
        // 用途1：发起网络请求
        this.fetchUsers();

        // 用途2：设置定时器
        this.timerID = window.setInterval(() => {
            this.fetchUsers();  // 每30秒刷新数据
        }, 30000);

        // 用途3：操作 DOM
        console.log("DOM 已就绪，可以测量元素尺寸");

        // 用途4：添加事件监听
        window.addEventListener("resize", this.handleResize);
    }

    // 组件卸载时：清理副作用
    componentWillUnmount() {
        // 清理定时器
        if (this.timerID !== null) {
            clearInterval(this.timerID);
        }
        // 移除事件监听
        window.removeEventListener("resize", this.handleResize);
    }

    handleResize = () => {
        console.log("窗口大小变化");
    };

    async fetchUsers() {
        try {
            const response = await fetch("https://jsonplaceholder.typicode.com/users");
            const users: User[] = await response.json();
            this.setState({ users, loading: false });
        } catch (err) {
            this.setState({ error: "数据加载失败", loading: false });
        }
    }

    render() {
        const { users, loading, error } = this.state;

        if (loading) return <p>加载中...</p>;
        if (error) return <p style={{ color: "red" }}>{error}</p>;

        return (
            <ul>
                {users.map(user => (
                    <li key={user.id}>{user.name} - {user.email}</li>
                ))}
            </ul>
        );
    }
}

export default UserList;
```

### 与相关API的对比

| 对比维度 | componentDidMount | useEffect(() => {}, []) |
|----------|------------------|------------------------|
| 调用时机 | DOM 挂载后 | DOM 挂载后（微任务） |
| 调用次数 | 一次 | 一次（严格模式下开发环境两次） |
| 清理方式 | componentWillUnmount | return 清理函数 |
| 组件类型 | 类组件 | 函数组件 |

### 适用场景

- **数据请求：** 组件加载后获取初始数据
- **DOM 操作：** 测量元素尺寸、设置焦点
- **事件订阅：** 添加全局事件监听、WebSocket 连接
- **第三方库初始化：** 初始化图表、地图等需要 DOM 的库

### 常见问题

#### componentDidMount 中 setState 会渲染两次吗

**解决方案：**

```
技术上会触发两次渲染：
  第一次：render 返回初始 UI
  componentDidMount 中 setState
  第二次：render 返回更新后的 UI

但用户不会看到中间状态：
  两次渲染在同一帧内完成
  浏览器只绘制最终结果

适用场景：
  需要先测量 DOM 尺寸再决定渲染内容时
  （如 Tooltip 需要知道目标元素的位置）

大部分情况下应在 constructor 中初始化 state
  而不是在 componentDidMount 中 setState
```

### 注意事项

- componentDidMount 只调用一次（挂载时）
- 在此方法中建立的副作用必须在 componentWillUnmount 中清理
- 可以在此方法中调用 setState（会触发额外渲染但用户不感知）
- 严格模式下开发环境会调用两次（帮助检测清理遗漏）
- 异步请求返回时组件可能已卸载，setState 前需检查

### 总结

componentDidMount 在组件挂载到 DOM 后调用一次，是执行副作用的正确位置：数据请求、DOM 操作、事件订阅、第三方库初始化等。与 componentWillUnmount 成对使用负责清理。在函数组件中，useEffect 的空依赖数组写法是其等价替代。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 更新阶段static getDerivedStateFromProps

### 概念说明

`static getDerivedStateFromProps` 不仅在挂载阶段调用，在更新阶段的每次渲染前同样会被调用。无论是 props 变化、setState 还是 forceUpdate 触发的更新，这个方法都会执行。在更新阶段，它的主要作用是根据新的 props 来调整 state，确保 state 与 props 保持同步。

更新阶段的调用顺序是：getDerivedStateFromProps → shouldComponentUpdate → render → getSnapshotBeforeUpdate → componentDidUpdate。需要注意的是，即使是 setState 触发的更新（props 没有变化），getDerivedStateFromProps 也会被调用，这意味着它可能"覆盖"掉 setState 设置的值。

### 基本示例

```tsx
// 示例说明：更新阶段 getDerivedStateFromProps 的行为

import React, { Component } from "react";

interface FilterProps {
    items: string[];       // 外部传入的完整列表
}

interface FilterState {
    filterText: string;    // 用户输入的筛选文本
    filteredItems: string[]; // 筛选后的列表
    prevItems: string[];    // 保存上一次的 props.items 用于对比
}

class FilterableList extends Component<FilterProps, FilterState> {
    state: FilterState = {
        filterText: "",
        filteredItems: this.props.items,
        prevItems: this.props.items,
    };

    static getDerivedStateFromProps(
        props: FilterProps,
        state: FilterState
    ): Partial<FilterState> | null {
        // 只有当 props.items 引用变化时才重新计算
        if (props.items !== state.prevItems) {
            return {
                prevItems: props.items,
                // 用新的 items 和当前的 filterText 重新筛选
                filteredItems: props.items.filter(item =>
                    item.includes(state.filterText)
                ),
            };
        }
        // props.items 没变，不覆盖 state
        return null;
    }

    handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const filterText = e.target.value;
        this.setState({
            filterText,
            // 手动重新筛选
            filteredItems: this.props.items.filter(item =>
                item.includes(filterText)
            ),
        });
    };

    render() {
        return (
            <div>
                <input
                    value={this.state.filterText}
                    onChange={this.handleFilterChange}
                    placeholder="输入筛选文本"
                />
                <ul>
                    {this.state.filteredItems.map((item, i) => (
                        <li key={i}>{item}</li>
                    ))}
                </ul>
            </div>
        );
    }
}

export default FilterableList;
```

### 内部原理

#### 更新阶段的触发场景

```
触发 getDerivedStateFromProps 的三种情况：

1. 父组件重新渲染（props 可能变了）
   父组件 render → 子组件 getDerivedStateFromProps

2. 组件自身 setState
   setState → getDerivedStateFromProps（props 没变）
   注意：如果 getDerivedStateFromProps 返回了覆盖 state 的值
         → setState 设置的值可能被覆盖

3. forceUpdate
   forceUpdate → getDerivedStateFromProps
   注意：跳过 shouldComponentUpdate，但不跳过 getDerivedStateFromProps
```

### 与相关API的对比

| 触发方式 | getDerivedStateFromProps | shouldComponentUpdate | render |
|----------|------------------------|---------------------|--------|
| 父组件渲染 | 调用 | 调用 | 调用（除非 SCU 返回 false） |
| setState | 调用 | 调用 | 调用（除非 SCU 返回 false） |
| forceUpdate | 调用 | 跳过 | 调用 |

### 适用场景

- **数据源变化同步：** 外部 props 数据更新时重新计算派生状态
- **受控组件重置：** props 指定的"源数据"变化时重置内部状态

### 常见问题

#### setState 的值被 getDerivedStateFromProps 覆盖

**问题描述：** 调用 setState 后值没有生效。

**解决方案：**

```tsx
// 问题代码：
static getDerivedStateFromProps(props, state) {
    // 每次都返回 props 的值，覆盖了 setState 的值
    return { value: props.defaultValue };  // 错误！
}

// 正确做法：只在 props 真正变化时才覆盖
static getDerivedStateFromProps(props, state) {
    if (props.defaultValue !== state.prevDefaultValue) {
        return {
            value: props.defaultValue,
            prevDefaultValue: props.defaultValue,
        };
    }
    return null;  // props 没变，不覆盖 setState 设置的值
}
```

### 注意事项

- 更新阶段每次渲染前都调用，不只是 props 变化时
- setState 触发的更新也会调用，注意不要无意覆盖 setState 的值
- 必须在 state 中保存前一次 props 值用于对比
- 返回 null 表示不更新 state
- forceUpdate 也会触发此方法

### 总结

在更新阶段，getDerivedStateFromProps 在每次渲染前调用，包括 props 变化、setState 和 forceUpdate 触发的更新。必须小心处理：只在 props 真正变化时才更新 state，否则可能覆盖 setState 设置的值。通过在 state 中保存上一次的 props 值来判断 props 是否真正变化。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 更新阶段shouldComponentUpdate

### 概念说明

`shouldComponentUpdate(nextProps, nextState)` 是一个性能优化的生命周期方法，在更新阶段的 render 之前调用。它返回一个布尔值：true 表示继续渲染流程（默认行为），false 表示跳过本次渲染（render 和后续的 componentDidUpdate 都不会执行）。

这个方法让开发者有机会比较新旧 props 和 state，决定组件是否需要重新渲染。当父组件重新渲染时，即使传给子组件的 props 没有变化，子组件默认也会重新渲染。通过 shouldComponentUpdate 可以避免这种不必要的渲染。React 提供了 `PureComponent` 作为内置的浅比较实现，函数组件中则使用 `React.memo` 达到类似效果。

### 基本示例

```tsx
// 示例说明：shouldComponentUpdate 手动控制渲染

import React, { Component } from "react";

interface ItemProps {
    id: number;
    name: string;
    count: number;
}

class ExpensiveItem extends Component<ItemProps> {
    // 手动实现渲染控制
    shouldComponentUpdate(nextProps: ItemProps): boolean {
        // 只有当 name 或 count 变化时才重新渲染
        // id 变化不触发重新渲染（因为 id 不影响 UI）
        if (
            this.props.name !== nextProps.name ||
            this.props.count !== nextProps.count
        ) {
            return true;   // props 变了，需要渲染
        }
        return false;       // props 没变，跳过渲染
    }

    render() {
        console.log(`ExpensiveItem ${this.props.name} 渲染了`);
        // 假设这里有复杂的计算或大量 DOM
        return (
            <div style={{ padding: 12, border: "1px solid #ddd", margin: 4 }}>
                <h3>{this.props.name}</h3>
                <p>数量: {this.props.count}</p>
            </div>
        );
    }
}

// 使用 PureComponent 替代手动 shouldComponentUpdate
class PureItem extends React.PureComponent<ItemProps> {
    // PureComponent 自动对所有 props 和 state 做浅比较
    // 等价于 shouldComponentUpdate 中对每个字段做 === 比较

    render() {
        console.log(`PureItem ${this.props.name} 渲染了`);
        return (
            <div style={{ padding: 12, border: "1px solid #ddd", margin: 4 }}>
                <h3>{this.props.name}</h3>
                <p>数量: {this.props.count}</p>
            </div>
        );
    }
}

export default ExpensiveItem;
```

### 与相关API的对比

| 优化方式 | 组件类型 | 比较方式 | 灵活性 |
|---------|---------|---------|--------|
| shouldComponentUpdate | 类组件 | 手动比较 | 高（自定义逻辑） |
| PureComponent | 类组件 | 自动浅比较 | 低（只能浅比较） |
| React.memo | 函数组件 | 默认浅比较 | 中（可自定义比较函数） |

### 适用场景

- **列表优化：** 大列表中避免未变化的项重新渲染
- **复杂组件：** render 中有大量计算的组件
- **频繁更新的父组件：** 子组件 props 不常变化的场景

### 常见问题

#### shouldComponentUpdate 和 forceUpdate 的关系

**解决方案：**

```
forceUpdate() 会跳过 shouldComponentUpdate：
  调用 forceUpdate → 直接进入 render
  → 不经过 shouldComponentUpdate
  → 用于确保某些场景下组件一定更新

注意：forceUpdate 不跳过子组件的 shouldComponentUpdate
  → 子组件仍然会正常经过自己的 shouldComponentUpdate
```

### 注意事项

- 返回 false 只阻止当前组件的渲染，不阻止子组件的 state 更新
- 不要在 shouldComponentUpdate 中做深比较（性能开销可能比重新渲染更大）
- PureComponent 只做浅比较，传入新对象/数组引用会导致每次都渲染
- forceUpdate 会跳过 shouldComponentUpdate
- 不建议在 shouldComponentUpdate 中产生副作用
- 函数组件中用 React.memo 替代

### 总结

shouldComponentUpdate 在更新阶段 render 之前调用，返回 false 可以跳过渲染。用于性能优化，避免 props/state 未变化时的不必要渲染。PureComponent 提供内置的浅比较实现，函数组件中用 React.memo。不要做深比较，forceUpdate 会跳过此方法。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 更新阶段render

### 概念说明

`render()` 方法在更新阶段的角色与挂载阶段相同——根据最新的 props 和 state 返回新的 React 元素树。不同的是，更新阶段的 render 返回的新元素树会与上一次 render 返回的元素树进行 Diff 比较，React 只更新变化的部分到真实 DOM。

更新阶段 render 的调用位于 getDerivedStateFromProps 和 shouldComponentUpdate 之后。如果 shouldComponentUpdate 返回 false，render 不会被调用。render 仍然必须是纯函数——相同的 props 和 state 必须返回相同的结果，不能产生副作用。

### 基本示例

```tsx
// 示例说明：更新阶段 render 的 Diff 过程

import React, { Component } from "react";

interface DashboardState {
    activeTab: "overview" | "details" | "settings";
    count: number;
}

class Dashboard extends Component<{}, DashboardState> {
    state: DashboardState = {
        activeTab: "overview",
        count: 0,
    };

    // 更新阶段：state 变化触发 render
    // render 返回新的元素树，React 对比差异后只更新变化的部分
    render() {
        const { activeTab, count } = this.state;

        return (
            <div>
                {/* 导航栏：每次 render 都返回，但如果 activeTab 没变，DOM 不更新 */}
                <nav>
                    <button
                        onClick={() => this.setState({ activeTab: "overview" })}
                        style={{ fontWeight: activeTab === "overview" ? "bold" : "normal" }}
                    >
                        概览
                    </button>
                    <button
                        onClick={() => this.setState({ activeTab: "details" })}
                        style={{ fontWeight: activeTab === "details" ? "bold" : "normal" }}
                    >
                        详情
                    </button>
                    <button
                        onClick={() => this.setState({ activeTab: "settings" })}
                        style={{ fontWeight: activeTab === "settings" ? "bold" : "normal" }}
                    >
                        设置
                    </button>
                </nav>

                {/* 内容区：根据 activeTab 条件渲染 */}
                {activeTab === "overview" && <p>概览内容</p>}
                {activeTab === "details" && <p>详情内容</p>}
                {activeTab === "settings" && <p>设置内容</p>}

                {/* 计数器：只有 count 变化时 span 的文本节点更新 */}
                <div>
                    <span>访问次数: {count}</span>
                    <button onClick={() => this.setState({ count: count + 1 })}>+1</button>
                </div>
            </div>
        );
    }
}

export default Dashboard;
```

### 内部原理

#### 更新阶段 render 的执行流程

```
状态更新触发：
  setState({ activeTab: "details" })

更新阶段生命周期：
  getDerivedStateFromProps(props, newState) → 返回 null
  shouldComponentUpdate(props, newState)   → 返回 true
  render()                                 → 返回新的 ReactElement 树

Diff 对比：
  旧树：<p>概览内容</p> 在 DOM 中
  新树：<p>详情内容</p> 需要渲染

  React Diff：
  → nav 元素 type 不变 → 复用，检查 style props 变化 → 更新
  → 条件渲染位置 type 变化（不同 key） → 删除旧节点，创建新节点
  → span 文本不变 → 跳过

Commit 阶段：
  → 只更新有变化的 DOM 节点
```

### 与相关API的对比

| 阶段 | render 的作用 | Diff 行为 |
|------|-------------|----------|
| 挂载 | 首次生成元素树 | 无旧树，全部创建 |
| 更新 | 生成新元素树 | 与旧树对比，最小化更新 |
| 卸载 | 不调用 | 删除所有节点 |

### 适用场景

- **所有类组件：** render 是必须实现的方法
- **条件渲染：** 根据 state 返回不同的 UI 结构
- **列表更新：** state 中的数组变化后重新渲染列表

### 常见问题

#### render 被调用了但 DOM 没有变化

**解决方案：**

```
render 被调用不等于 DOM 更新：

1. render 返回新的 ReactElement 树
2. React Diff 对比新旧树
3. 如果没有差异 → 不执行任何 DOM 操作
4. 虽然 render 函数执行了，但 DOM 没有变化

这就是为什么 shouldComponentUpdate 是"优化"：
  → 跳过 render 的执行本身（省去 JS 计算）
  → 而不是跳过 DOM 更新（React 已经会最小化 DOM 操作）

render 的开销主要在 JS 层面（生成 ReactElement、Diff 计算）
对于简单组件这个开销很小，不需要过度优化
```

### 注意事项

- 更新阶段的 render 必须是纯函数
- render 返回新元素树后 React 执行 Diff 计算差异
- shouldComponentUpdate 返回 false 时 render 不调用
- render 被调用不代表 DOM 一定更新（Diff 可能无差异）
- 不要在 render 中调用 setState

### 总结

更新阶段的 render 返回新的 React 元素树，React 通过 Diff 算法比较新旧树的差异，只将变化的部分更新到真实 DOM。render 的调用受 shouldComponentUpdate 控制。render 被调用不等于 DOM 更新——如果 Diff 发现无差异，不会执行 DOM 操作。render 必须保持纯函数特性。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 更新阶段getSnapshotBeforeUpdate

### 概念说明

`getSnapshotBeforeUpdate(prevProps, prevState)` 在 render 之后、DOM 更新之前调用。它的作用是在 DOM 发生变化前捕获一些信息（如滚动位置、元素尺寸），这些信息会作为第三个参数传递给 `componentDidUpdate`。

这个方法是 React 16.3 引入的，用于替代已废弃的 `componentWillUpdate`。最典型的使用场景是聊天窗口：在新消息插入前记录滚动位置，插入后恢复滚动位置，避免列表内容"跳动"。getSnapshotBeforeUpdate 返回值可以是任何类型（或 null），这个返回值就是 componentDidUpdate 的第三个参数 snapshot。

### API 签名与参数

```typescript
getSnapshotBeforeUpdate(
    prevProps: Readonly<Props>,
    prevState: Readonly<State>
): SnapshotType | null

componentDidUpdate(
    prevProps: Readonly<Props>,
    prevState: Readonly<State>,
    snapshot?: SnapshotType  // getSnapshotBeforeUpdate 的返回值
): void
```

### 基本示例

```tsx
// 示例说明：聊天窗口保持滚动位置

import React, { Component, createRef } from "react";

interface ChatProps {
    messages: string[];
}

class ChatWindow extends Component<ChatProps> {
    // 聊天容器的 ref
    private listRef = createRef<HTMLDivElement>();

    getSnapshotBeforeUpdate(prevProps: ChatProps): number | null {
        // DOM 更新前：检查是否有新消息添加
        if (prevProps.messages.length < this.props.messages.length) {
            const list = this.listRef.current;
            if (list) {
                // 返回当前滚动距离底部的距离
                // scrollHeight - scrollTop - clientHeight = 距底部距离
                return list.scrollHeight - list.scrollTop;
            }
        }
        return null;
    }

    componentDidUpdate(prevProps: ChatProps, prevState: {}, snapshot: number | null) {
        // DOM 更新后：根据 snapshot 恢复滚动位置
        if (snapshot !== null) {
            const list = this.listRef.current;
            if (list) {
                // 新的 scrollHeight 减去之前的距离 = 新的 scrollTop
                // 这样用户看到的内容位置不变
                list.scrollTop = list.scrollHeight - snapshot;
            }
        }
    }

    render() {
        return (
            <div
                ref={this.listRef}
                style={{ height: 300, overflow: "auto", border: "1px solid #ccc" }}
            >
                {this.props.messages.map((msg, i) => (
                    <div key={i} style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                        {msg}
                    </div>
                ))}
            </div>
        );
    }
}

export default ChatWindow;
```

### 内部原理

#### 执行时机

```
更新阶段执行顺序：

  getDerivedStateFromProps
  shouldComponentUpdate（返回 true）
  render                        ← 生成新的虚拟 DOM
  getSnapshotBeforeUpdate       ← DOM 更新前，可以读取旧 DOM
  ─── DOM 更新 ───              ← 真实 DOM 发生变化
  componentDidUpdate(snapshot)  ← DOM 更新后，用 snapshot 调整

对应 Commit 阶段的三个子阶段：
  Before Mutation → getSnapshotBeforeUpdate（读取旧 DOM）
  Mutation        → 执行 DOM 操作
  Layout          → componentDidUpdate（读取新 DOM）
```

### 与相关API的对比

| 对比维度 | getSnapshotBeforeUpdate | componentWillUpdate（已废弃） |
|----------|----------------------|----------------------------|
| 执行时机 | render 后，DOM 更新前 | render 前 |
| 安全性 | 安全（Commit 阶段） | 不安全（并发模式下可能多次调用） |
| 返回值 | 传递给 componentDidUpdate | 无返回值 |
| 读取 DOM | 可以（读取旧 DOM） | 可以但不推荐 |

### 适用场景

- **滚动位置保持：** 聊天窗口、日志列表新增内容时保持滚动
- **DOM 尺寸记录：** 动画前记录元素尺寸
- **焦点管理：** DOM 更新前记录焦点元素

### 常见问题

#### 函数组件中如何实现类似功能

**解决方案：**

```tsx
// 函数组件没有直接等价的 Hook
// 可以用 useRef + useLayoutEffect 组合实现

// import { useRef, useLayoutEffect } from "react";

// function ChatWindow({ messages }) {
//     const listRef = useRef(null);
//     const prevScrollHeight = useRef(0);
//
//     // useLayoutEffect 在 DOM 更新后、浏览器绘制前执行
//     useLayoutEffect(() => {
//         if (listRef.current) {
//             const list = listRef.current;
//             // 恢复滚动位置
//             list.scrollTop = list.scrollHeight - prevScrollHeight.current;
//         }
//     }, [messages]);
//
//     // 在 render 阶段记录（不完美，但可用）
//     if (listRef.current) {
//         prevScrollHeight.current = listRef.current.scrollHeight - listRef.current.scrollTop;
//     }
//
//     return <div ref={listRef}>...</div>;
// }
```

### 注意事项

- 必须与 componentDidUpdate 配合使用
- 返回值作为 componentDidUpdate 的第三个参数
- 在 Commit 阶段的 Before Mutation 子阶段执行
- 此时可以安全读取 DOM（旧的 DOM 状态）
- 返回 null 表示不需要传递快照信息
- 函数组件中没有直接等价的 Hook

### 总结

getSnapshotBeforeUpdate 在 DOM 更新前调用，用于捕获更新前的 DOM 信息（滚动位置、尺寸等）。返回值传递给 componentDidUpdate 的第三个参数 snapshot。最典型的场景是聊天列表新增消息时保持滚动位置。在 Commit 阶段的 Before Mutation 子阶段执行，安全可靠。函数组件中用 useRef + useLayoutEffect 组合替代。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 更新阶段componentDidUpdate

### 概念说明

`componentDidUpdate(prevProps, prevState, snapshot)` 在组件更新后（render 和 DOM 更新完成后）立即调用。它不会在首次挂载时调用。这个方法是更新阶段执行副作用的正确位置：可以操作更新后的 DOM、根据 props 变化发起网络请求、或者基于 getSnapshotBeforeUpdate 传递的快照信息进行处理。

componentDidUpdate 有三个参数：`prevProps`（更新前的 props）、`prevState`（更新前的 state）、`snapshot`（getSnapshotBeforeUpdate 的返回值）。在调用 setState 前必须用条件判断包裹，否则会导致无限循环。

### 基本示例

```tsx
// 示例说明：componentDidUpdate 的常见用法

import React, { Component } from "react";

interface ProfileProps {
    userId: number;
}

interface ProfileState {
    user: { name: string; email: string } | null;
    loading: boolean;
}

class UserProfile extends Component<ProfileProps, ProfileState> {
    state: ProfileState = {
        user: null,
        loading: true,
    };

    componentDidMount() {
        this.fetchUser(this.props.userId);
    }

    componentDidUpdate(prevProps: ProfileProps) {
        // 必须有条件判断！否则每次更新都会请求 → 无限循环
        if (this.props.userId !== prevProps.userId) {
            // userId 变了，重新获取用户数据
            this.setState({ loading: true });
            this.fetchUser(this.props.userId);
        }
    }

    async fetchUser(userId: number) {
        try {
            const response = await fetch(`/api/users/${userId}`);
            const user = await response.json();
            this.setState({ user, loading: false });
        } catch (error) {
            this.setState({ user: null, loading: false });
        }
    }

    render() {
        const { user, loading } = this.state;
        if (loading) return <p>加载中...</p>;
        if (!user) return <p>用户不存在</p>;

        return (
            <div>
                <h2>{user.name}</h2>
                <p>{user.email}</p>
            </div>
        );
    }
}

export default UserProfile;
```

### 内部原理

#### 执行时机和参数

```
更新阶段完整顺序：
  getDerivedStateFromProps
  shouldComponentUpdate → true
  render
  getSnapshotBeforeUpdate → snapshot
  ─── DOM 更新 ───
  componentDidUpdate(prevProps, prevState, snapshot)

参数含义：
  prevProps：更新之前的 props（可以和 this.props 对比）
  prevState：更新之前的 state（可以和 this.state 对比）
  snapshot：getSnapshotBeforeUpdate 的返回值（如果未定义则为 undefined）

注意：
  componentDidUpdate 在 Commit 阶段的 Layout 子阶段执行
  此时 DOM 已经更新，可以安全读取新的 DOM 状态
```

### 与相关API的对比

| 对比维度 | componentDidUpdate | useEffect(fn, [deps]) |
|----------|-------------------|----------------------|
| 调用时机 | DOM 更新后（同步） | 浏览器绘制后（异步） |
| 首次挂载 | 不调用 | 调用 |
| 前值访问 | prevProps/prevState 参数 | useRef 手动保存 |
| snapshot | 第三个参数 | 无直接等价 |

### 适用场景

- **数据请求：** props 变化时重新获取数据
- **DOM 操作：** 更新后读取或修改 DOM
- **第三方库同步：** 更新图表、地图等第三方库
- **滚动恢复：** 配合 getSnapshotBeforeUpdate 使用

### 常见问题

#### 在 componentDidUpdate 中无条件 setState 导致无限循环

**解决方案：**

```tsx
componentDidUpdate(prevProps: Props) {
    // 错误：无条件 setState
    // this.setState({ data: this.props.data });
    // → setState 触发更新 → componentDidUpdate → 又 setState → 无限循环

    // 正确：用条件判断包裹
    if (this.props.data !== prevProps.data) {
        this.setState({ data: this.props.data });
    }
}
```

### 注意事项

- 不在首次挂载时调用（首次用 componentDidMount）
- 在 componentDidUpdate 中 setState 必须有条件判断
- 通过对比 prevProps/prevState 和 this.props/this.state 判断变化
- snapshot 参数来自 getSnapshotBeforeUpdate
- 在 Commit 阶段执行，DOM 已更新

### 总结

componentDidUpdate 在组件更新后调用（不包括首次挂载），用于响应 props/state 变化执行副作用。通过对比 prevProps/prevState 判断哪些值变化了。在其中调用 setState 必须有条件判断，否则无限循环。第三个参数 snapshot 来自 getSnapshotBeforeUpdate。函数组件中用 useEffect 替代。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 卸载阶段componentWillUnmount

### 概念说明

`componentWillUnmount` 在组件从 DOM 中移除之前调用，是组件生命周期的最后一个方法。它的核心职责是清理组件在整个生命周期中建立的副作用：取消网络请求、清除定时器、移除事件监听器、断开 WebSocket 连接、取消订阅等。

如果在 componentDidMount 中建立了某种连接或订阅，就必须在 componentWillUnmount 中清理。不清理会导致内存泄漏：组件虽然已经不在页面上了，但定时器还在执行、事件监听还在触发、回调函数还持有对已卸载组件的引用。在函数组件中，useEffect 的清理函数（return 的函数）承担了 componentWillUnmount 的职责。

### 基本示例

```tsx
// 示例说明：componentWillUnmount 清理各种副作用

import React, { Component } from "react";

interface LiveDataState {
    data: string[];
    isConnected: boolean;
}

class LiveDataFeed extends Component<{}, LiveDataState> {
    // 保存需要清理的引用
    private timerID: number | null = null;
    private abortController: AbortController | null = null;
    private ws: WebSocket | null = null;

    state: LiveDataState = {
        data: [],
        isConnected: false,
    };

    componentDidMount() {
        // 建立各种副作用
        this.startPolling();
        this.connectWebSocket();
        window.addEventListener("online", this.handleOnline);
        window.addEventListener("offline", this.handleOffline);
    }

    componentWillUnmount() {
        // 清理1：清除定时器
        if (this.timerID !== null) {
            clearInterval(this.timerID);
            this.timerID = null;
        }

        // 清理2：取消进行中的网络请求
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }

        // 清理3：断开 WebSocket 连接
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        // 清理4：移除事件监听器
        window.removeEventListener("online", this.handleOnline);
        window.removeEventListener("offline", this.handleOffline);

        // 注意：不要在 componentWillUnmount 中调用 setState
        // 组件即将卸载，setState 没有意义且会产生警告
    }

    startPolling() {
        this.timerID = window.setInterval(async () => {
            this.abortController = new AbortController();
            try {
                const response = await fetch("/api/data", {
                    signal: this.abortController.signal,
                });
                const newData = await response.json();
                this.setState(prev => ({
                    data: [...prev.data, ...newData],
                }));
            } catch (err) {
                if ((err as Error).name !== "AbortError") {
                    console.error("请求失败:", err);
                }
            }
        }, 5000);
    }

    connectWebSocket() {
        this.ws = new WebSocket("wss://example.com/feed");
        this.ws.onopen = () => this.setState({ isConnected: true });
        this.ws.onclose = () => this.setState({ isConnected: false });
        this.ws.onmessage = (event) => {
            this.setState(prev => ({
                data: [...prev.data, event.data],
            }));
        };
    }

    handleOnline = () => console.log("网络恢复");
    handleOffline = () => console.log("网络断开");

    render() {
        return (
            <div>
                <p>状态: {this.state.isConnected ? "已连接" : "未连接"}</p>
                <ul>
                    {this.state.data.map((item, i) => (
                        <li key={i}>{item}</li>
                    ))}
                </ul>
            </div>
        );
    }
}

export default LiveDataFeed;
```

### 与相关API的对比

| 需要清理的副作用 | componentDidMount 中建立 | componentWillUnmount 中清理 |
|----------------|------------------------|---------------------------|
| 定时器 | setInterval / setTimeout | clearInterval / clearTimeout |
| 事件监听 | addEventListener | removeEventListener |
| 网络请求 | fetch / axios | AbortController.abort() |
| WebSocket | new WebSocket() | ws.close() |
| 订阅 | subscribe() | unsubscribe() |
| 第三方库 | chart.binit() | chart.destroy() |

### 适用场景

- **定时器清理：** clearInterval、clearTimeout
- **事件监听移除：** removeEventListener
- **网络请求取消：** AbortController
- **连接断开：** WebSocket、SSE、数据库连接
- **第三方库销毁：** 图表、地图、编辑器的 destroy 方法

### 常见问题

#### 忘记清理导致内存泄漏

**问题描述：** 组件卸载后控制台出现 "setState on unmounted component" 警告。

**解决方案：**

```tsx
// 这个警告说明：组件已卸载，但异步回调仍在尝试 setState

// 方案1：在 componentWillUnmount 中取消异步操作
componentWillUnmount() {
    this.abortController?.abort();  // 取消请求
    clearTimeout(this.timerID);      // 清除定时器
}

// 方案2：使用标志位（不推荐，治标不治本）
// private _isMounted = false;
// componentDidMount() { this._isMounted = true; }
// componentWillUnmount() { this._isMounted = false; }
// 在回调中：if (this._isMounted) this.setState(...);
```

### 注意事项

- componentWillUnmount 中不要调用 setState（无意义且产生警告）
- 每个 componentDidMount 中建立的副作用都必须有对应的清理
- 清理不彻底会导致内存泄漏
- 异步操作需要用 AbortController 或类似机制取消
- 严格模式下开发环境会模拟挂载-卸载-再挂载来检测清理遗漏

### 总结

componentWillUnmount 在组件卸载前调用，负责清理所有副作用：定时器、事件监听、网络请求、WebSocket 连接等。与 componentDidMount 成对使用。不清理会导致内存泄漏和"setState on unmounted component"警告。不要在此方法中调用 setState。函数组件中 useEffect 的返回函数承担相同职责。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## getDerivedStateFromProps的派生状态反模式

### 概念说明

`getDerivedStateFromProps` 虽然是 React 提供的官方 API，但 React 团队在文档中明确指出：这个方法应该谨慎使用，大部分需要"从 props 派生 state"的场景都有更好的替代方案。滥用这个方法会导致代码复杂、难以维护、产生难以追踪的 Bug。

最常见的反模式是"无条件地将 props 复制到 state"——每次 props 变化都覆盖 state，导致组件内部通过 setState 设置的值被丢弃。另一个常见问题是"忘记对比前后 props"，导致 setState 的值被意外覆盖。React 官方推荐了几种替代方案：完全受控组件、带 key 的非受控组件、在 componentDidUpdate 中处理、使用 memoization。

### 基本示例

```tsx
// 示例说明：常见的反模式和正确的替代方案

import React, { Component } from "react";

// ===== 反模式1：无条件复制 props 到 state =====
class AntiPattern1 extends Component<{ email: string }, { email: string }> {
    state = { email: this.props.email };

    // 错误：每次渲染都把 props 复制到 state
    // 用户在输入框中编辑的内容会被 props 的值覆盖
    static getDerivedStateFromProps(props: { email: string }) {
        return { email: props.email };  // 反模式！
    }

    render() {
        return (
            <input
                value={this.state.email}
                onChange={e => this.setState({ email: e.target.value })}
                // 用户输入后 setState 更新 email
                // 但下次渲染时 getDerivedStateFromProps 又把它覆盖回 props.email
            />
        );
    }
}

// ===== 替代方案1：完全受控组件 =====
// 状态完全由父组件控制，子组件不维护自己的 state
function ControlledEmailInput({ email, onChange }: {
    email: string;
    onChange: (email: string) => void;
}) {
    return (
        <input
            value={email}
            onChange={e => onChange(e.target.value)}
        />
    );
}

// ===== 替代方案2：带 key 的非受控组件 =====
// 需要重置时通过改变 key 重新创建组件
class UncontrolledEmailInput extends Component<
    { defaultEmail: string },
    { email: string }
> {
    state = { email: this.props.defaultEmail };

    handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ email: e.target.value });
    };

    render() {
        return <input value={this.state.email} onChange={this.handleChange} />;
    }
}

// 父组件通过 key 控制重置
function ParentComponent() {
    const [userId, setUserId] = React.useState(1);
    const [users] = React.useState({
        1: "alice@example.com",
        2: "bob@example.com",
    });

    return (
        <div>
            <button onClick={() => setUserId(1)}>用户1</button>
            <button onClick={() => setUserId(2)}>用户2</button>
            {/* key 变化时组件完全重建，state 自然重置 */}
            <UncontrolledEmailInput
                key={userId}
                defaultEmail={users[userId as keyof typeof users]}
            />
        </div>
    );
}

export default ParentComponent;
```

### 与相关API的对比

| 方案 | 代码复杂度 | 适用场景 | 风险 |
|------|-----------|---------|------|
| getDerivedStateFromProps | 高 | 极少数需要精确控制的场景 | 容易出 Bug |
| 完全受控组件 | 低 | 父组件需要管理状态 | 无 |
| key 重建组件 | 低 | 需要在某条件下重置状态 | 性能（重建整个组件） |
| componentDidUpdate | 中 | 需要在 props 变化时执行副作用 | 需要条件判断 |
| memoization | 低 | 派生数据是纯计算 | 无 |

### 适用场景

**getDerivedStateFromProps 真正需要的场景非常少：**
- 需要根据 props 变化来精确调整内部 state
- 不能用受控组件或 key 方案替代
- 有明确的 props 变化条件判断

**应该用替代方案的场景：**
- props 直接决定渲染内容 → 受控组件
- props 变化需要重置状态 → key 方案
- props 变化需要执行副作用 → componentDidUpdate
- 需要根据 props 计算展示值 → render 中计算或 useMemo

### 常见问题

#### 如何判断是否需要 getDerivedStateFromProps

**解决方案：**

```
问自己这几个问题：

1. 这个 state 能直接用 props 替代吗？
   → 能 → 用受控组件

2. 这个 state 需要在某个条件下重置吗？
   → 是 → 用 key 方案

3. 这个 state 是 props 的纯计算结果吗？
   → 是 → 直接在 render 中计算

4. 需要在 props 变化后执行副作用吗？
   → 是 → 用 componentDidUpdate

如果以上都不适用，才考虑 getDerivedStateFromProps
```

### 注意事项

- React 官方明确表示大部分场景不需要 getDerivedStateFromProps
- 无条件复制 props 到 state 是最常见的反模式
- 受控组件和 key 方案是更简洁可靠的替代方案
- 如果必须使用，一定要在 state 中保存上一次的 props 值做对比
- 函数组件中完全没有这个 API，用 useState + useEffect 替代

### 总结

getDerivedStateFromProps 的派生状态反模式包括：无条件复制 props 到 state、忘记对比前后 props 导致 setState 被覆盖等。React 官方推荐的替代方案：受控组件（状态提升到父级）、key 方案（通过 key 重建重置状态）、componentDidUpdate（副作用处理）、render 中计算（纯派生数据）。只在极少数无法替代的场景中使用 getDerivedStateFromProps。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## 生命周期与Hooks的对应关系

### 概念说明

React 16.8 引入 Hooks 后，函数组件具备了类组件的所有能力。类组件的每个生命周期方法在函数组件中都有对应的 Hooks 实现方式，虽然并非一一对应，但在功能上可以完全替代。理解两者的对应关系，有助于将旧的类组件迁移到函数组件，也有助于在面试中清晰地阐述两种范式的联系。

核心的对应关系是：constructor 对应 useState 的初始值、componentDidMount 对应 useEffect 空依赖、componentDidUpdate 对应 useEffect 带依赖、componentWillUnmount 对应 useEffect 的清理函数。但 Hooks 的模型与生命周期有本质区别：生命周期关注的是"组件的阶段"，而 Hooks 关注的是"数据的同步"。

### 基本示例

```tsx
// 示例说明：类组件生命周期与函数组件 Hooks 的对照

import React, { Component, useState, useEffect, useRef, useLayoutEffect } from "react";

// ===== 类组件写法 =====
interface ClassProps {
    userId: number;
}

interface ClassState {
    user: { name: string } | null;
    count: number;
}

class ClassVersion extends Component<ClassProps, ClassState> {
    // constructor → 初始化 state
    constructor(props: ClassProps) {
        super(props);
        this.state = { user: null, count: 0 };
    }

    // componentDidMount → 首次挂载后执行
    componentDidMount() {
        this.fetchUser(this.props.userId);
        document.title = `计数: ${this.state.count}`;
    }

    // componentDidUpdate → 更新后执行
    componentDidUpdate(prevProps: ClassProps, prevState: ClassState) {
        if (this.props.userId !== prevProps.userId) {
            this.fetchUser(this.props.userId);
        }
        if (this.state.count !== prevState.count) {
            document.title = `计数: ${this.state.count}`;
        }
    }

    // componentWillUnmount → 卸载前清理
    componentWillUnmount() {
        document.title = "React App";
    }

    async fetchUser(userId: number) {
        const res = await fetch(`/api/users/${userId}`);
        const user = await res.json();
        this.setState({ user });
    }

    render() {
        return (
            <div>
                <p>{this.state.user?.name}</p>
                <p>计数: {this.state.count}</p>
                <button onClick={() => this.setState({ count: this.state.count + 1 })}>
                    +1
                </button>
            </div>
        );
    }
}

// ===== 函数组件 Hooks 写法 =====
function HooksVersion({ userId }: { userId: number }) {
    // constructor → useState 初始化
    const [user, setUser] = useState<{ name: string } | null>(null);
    const [count, setCount] = useState(0);

    // componentDidMount + componentDidUpdate(userId 变化时)
    // + componentWillUnmount(清理)
    useEffect(() => {
        // 相当于 componentDidMount 和 componentDidUpdate 中的数据请求
        const controller = new AbortController();

        async function fetchUser() {
            const res = await fetch(`/api/users/${userId}`, {
                signal: controller.signal,
            });
            const data = await res.json();
            setUser(data);
        }
        fetchUser();

        // 返回清理函数：相当于 componentWillUnmount
        return () => {
            controller.abort();
        };
    }, [userId]);  // 依赖 userId，userId 变化时重新执行

    // componentDidMount + componentDidUpdate(count 变化时)
    // + componentWillUnmount(清理)
    useEffect(() => {
        document.title = `计数: ${count}`;

        return () => {
            document.title = "React App";  // 清理
        };
    }, [count]);

    return (
        <div>
            <p>{user?.name}</p>
            <p>计数: {count}</p>
            <button onClick={() => setCount(c => c + 1)}>+1</button>
        </div>
    );
}

export { ClassVersion, HooksVersion };
```

### 与相关API的对比

| 类组件生命周期 | 函数组件 Hooks | 说明 |
|-------------|-------------|------|
| constructor | useState(initialValue) | state 初始化 |
| getDerivedStateFromProps | useState + useEffect 或 render 中计算 | 根据 props 派生 state |
| shouldComponentUpdate | React.memo | 跳过不必要的渲染 |
| render | 函数体本身 | 返回 JSX |
| componentDidMount | useEffect(() => {}, []) | 挂载后执行一次 |
| componentDidUpdate | useEffect(() => {}, [deps]) | 依赖变化时执行 |
| componentWillUnmount | useEffect 的 return 函数 | 清理副作用 |
| getSnapshotBeforeUpdate | useRef + useLayoutEffect | DOM 更新前后对比 |
| componentDidCatch | 无直接等价（仍需类组件） | 错误捕获 |
| getDerivedStateFromError | 无直接等价（仍需类组件） | 错误状态更新 |

### 适用场景

- **新项目：** 直接使用函数组件 + Hooks
- **旧代码迁移：** 按对应关系逐步改写
- **Error Boundary：** 目前仍然需要类组件
- **面试回答：** 对照表是高频考点

### 常见问题

#### useEffect 和生命周期的思维模型差异

**问题描述：** useEffect 不是 componentDidMount + componentDidUpdate 的简单替代。

**解决方案：**

```
生命周期思维模型（基于时间）：
  "挂载时做A，更新时做B，卸载时做C"
  → 关注组件所处的阶段

Hooks 思维模型（基于同步）：
  "当 X 变化时，保持 Y 与 X 同步"
  → 关注数据之间的依赖关系

例如：
  类组件：componentDidMount + componentDidUpdate 中检查 userId
  Hooks：useEffect(() => { fetchUser(userId) }, [userId])
  → Hooks 不区分"挂载"和"更新"，只关注"userId 变了就重新获取"

这种思维转变是从类组件迁移到 Hooks 的关键
```

### 注意事项

- useEffect 不区分挂载和更新（统一为"依赖变化时执行"）
- useEffect 的清理函数在每次重新执行前和卸载时都调用
- Error Boundary 仍然需要类组件（componentDidCatch、getDerivedStateFromError）
- React.memo 不等同于 shouldComponentUpdate（只比较 props，不比较 state）
- useLayoutEffect 对应 Commit 阶段的 Layout 子阶段

### 总结

类组件的每个生命周期方法都有对应的 Hooks 实现：constructor→useState、componentDidMount→useEffect([])、componentDidUpdate→useEffect([deps])、componentWillUnmount→useEffect 返回函数、shouldComponentUpdate→React.memo。Hooks 的思维模型从"组件阶段"转向"数据同步"。Error Boundary 是目前唯一仍需要类组件的场景。新项目应优先使用函数组件 + Hooks。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。



## 6.9 状态管理方案

## Redux的单一状态树Store

### 概念说明

Redux 的核心设计理念是**单一状态树（Single Source of Truth）**：整个应用的所有状态存储在一个 JavaScript 对象中，由唯一的 Store 管理。这个对象树描述了应用在任意时刻的完整状态。任何组件需要读取状态都从 Store 中获取，任何状态变更都通过 Store 统一处理。

单一状态树带来了几个明确的好处：状态可预测（所有变更有迹可循）、方便调试（Redux DevTools 可以查看整棵状态树和每次变更的历史）、支持服务端渲染（将整棵状态树序列化传给客户端）、支持时间旅行调试（回到任意历史状态）。代价是需要额外的模板代码和学习成本，小型应用可能过于笨重。

### 基本示例

```typescript
// 示例说明：创建 Redux Store 并查看状态树

import { createStore } from "redux";

// 定义状态的类型
interface AppState {
    user: {
        name: string;
        isLoggedIn: boolean;
    };
    todos: Array<{
        id: number;
        text: string;
        completed: boolean;
    }>;
    ui: {
        theme: "light" | "dark";
        sidebarOpen: boolean;
    };
}

// 初始状态：描述应用启动时的完整状态
const initialState: AppState = {
    user: {
        name: "",
        isLoggedIn: false,
    },
    todos: [],
    ui: {
        theme: "light",
        sidebarOpen: true,
    },
};

// Reducer：根据 action 返回新状态（后续文档详述）
function rootReducer(state: AppState = initialState, action: any): AppState {
    switch (action.type) {
        case "LOGIN":
            return {
                ...state,
                user: { name: action.payload, isLoggedIn: true },
            };
        case "ADD_TODO":
            return {
                ...state,
                todos: [
                    ...state.todos,
                    { id: Date.now(), text: action.payload, completed: false },
                ],
            };
        case "TOGGLE_THEME":
            return {
                ...state,
                ui: {
                    ...state.ui,
                    theme: state.ui.theme === "light" ? "dark" : "light",
                },
            };
        default:
            return state;
    }
}

// 创建唯一的 Store
const store = createStore(rootReducer);

// 获取当前状态树
console.log(store.getState());
// 输出完整的状态对象：{ user: {...}, todos: [...], ui: {...} }

// 订阅状态变化
const unsubscribe = store.subscribe(() => {
    console.log("状态更新:", store.getState());
});

// 分发 action 修改状态
store.dispatch({ type: "LOGIN", payload: "张三" });
store.dispatch({ type: "ADD_TODO", payload: "学习 Redux" });
store.dispatch({ type: "TOGGLE_THEME" });

// 取消订阅
unsubscribe();
```

### 内部原理

#### Store 的核心方法

```
Store 提供三个核心方法：

getState()
  → 返回当前的状态树对象
  → 返回的是引用，不是深拷贝

dispatch(action)
  → 唯一修改状态的方式
  → 调用 reducer(currentState, action) 得到新状态
  → 通知所有订阅者

subscribe(listener)
  → 注册状态变化的监听函数
  → 返回取消订阅的函数
  → 每次 dispatch 后调用所有监听函数
```

### 与相关API的对比

| 对比维度 | Redux Store | React Context | Zustand Store |
|----------|-----------|--------------|--------------|
| 状态结构 | 单一状态树 | 多个 Context | 多个独立 Store |
| 状态修改 | dispatch + reducer | setState | set 函数 |
| 中间件 | 支持 | 不支持 | 支持 |
| DevTools | 完善 | 无 | 支持 |
| 包大小 | ~2KB | 内置 | ~1KB |
| 学习曲线 | 高 | 低 | 低 |

### 适用场景

- **大型应用：** 状态复杂、多个模块需要共享状态
- **需要状态追踪：** 要求每次状态变更可追溯
- **团队协作：** 统一的状态管理规范降低沟通成本
- **时间旅行调试：** 需要回溯历史状态排查问题

### 常见问题

#### Store 状态树过于庞大怎么办

**问题描述：** 随着应用增长，单一状态树变得巨大。

**解决方案：**

```typescript
// 使用 combineReducers 拆分 reducer
import { combineReducers, createStore } from "redux";

// 每个模块维护自己的 reducer
const userReducer = (state = { name: "", isLoggedIn: false }, action: any) => {
    switch (action.type) {
        case "LOGIN":
            return { name: action.payload, isLoggedIn: true };
        default:
            return state;
    }
};

const todosReducer = (state: any[] = [], action: any) => {
    switch (action.type) {
        case "ADD_TODO":
            return [...state, { id: Date.now(), text: action.payload, completed: false }];
        default:
            return state;
    }
};

// 合并为根 reducer
const rootReducer = combineReducers({
    user: userReducer,
    todos: todosReducer,
});

// 状态树结构由 combineReducers 的 key 决定
// { user: {...}, todos: [...] }
const store = createStore(rootReducer);
```

### 注意事项

- 整个应用只有一个 Store（单例）
- getState() 返回的是状态的引用，不要直接修改
- 状态只能通过 dispatch(action) 修改
- 使用 combineReducers 拆分大型状态树
- 2026 年推荐使用 Redux Toolkit 而非原始 Redux API

### 总结

Redux 的单一状态树将应用所有状态集中在一个 Store 中管理，通过 getState 读取、dispatch 修改、subscribe 监听。单一状态树保证了状态可预测、可追溯、支持时间旅行调试。大型应用通过 combineReducers 拆分状态树。在 2026 年的实际开发中，推荐使用 Redux Toolkit 简化 Redux 的使用。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Redux的Action对象与type属性

### 概念说明

Action 是 Redux 中描述"发生了什么"的普通 JavaScript 对象。每个 Action 必须包含一个 `type` 属性，它是一个字符串，用来标识这个操作的类型。除了 type 以外，Action 可以携带任意额外数据（通常放在 `payload` 字段中），这些数据是 Reducer 计算新状态所需要的信息。

Action 是 Store 与组件之间的沟通桥梁：组件通过 `dispatch(action)` 告诉 Store "发生了什么事"，Reducer 根据 action.type 决定如何更新状态。Action 本身不执行任何逻辑，它只是一个纯粹的数据描述。为了减少硬编码字符串带来的拼写错误，实际项目中通常会定义 Action Creator 函数来生成 Action 对象。

### 基本示例

```typescript
// 示例说明：Action 对象的结构和 Action Creator

// ===== Action Type 常量 =====
// 用常量避免拼写错误
const ADD_TODO = "todos/addTodo" as const;
const TOGGLE_TODO = "todos/toggleTodo" as const;
const DELETE_TODO = "todos/deleteTodo" as const;
const SET_FILTER = "filter/setFilter" as const;

// ===== Action 的类型定义 =====
interface AddTodoAction {
    type: typeof ADD_TODO;
    payload: {
        text: string;
    };
}

interface ToggleTodoAction {
    type: typeof TOGGLE_TODO;
    payload: {
        id: number;
    };
}

interface DeleteTodoAction {
    type: typeof DELETE_TODO;
    payload: {
        id: number;
    };
}

interface SetFilterAction {
    type: typeof SET_FILTER;
    payload: {
        filter: "all" | "active" | "completed";
    };
}

// 联合类型：所有可能的 Action
type TodoAction = AddTodoAction | ToggleTodoAction | DeleteTodoAction | SetFilterAction;

// ===== Action Creator 函数 =====
// 返回 Action 对象的工厂函数

function addTodo(text: string): AddTodoAction {
    return {
        type: ADD_TODO,
        payload: { text },
    };
}

function toggleTodo(id: number): ToggleTodoAction {
    return {
        type: TOGGLE_TODO,
        payload: { id },
    };
}

function deleteTodo(id: number): DeleteTodoAction {
    return {
        type: DELETE_TODO,
        payload: { id },
    };
}

function setFilter(filter: "all" | "active" | "completed"): SetFilterAction {
    return {
        type: SET_FILTER,
        payload: { filter },
    };
}

// ===== 使用方式 =====
// store.dispatch(addTodo("学习 Redux"));
// store.dispatch(toggleTodo(1));
// store.dispatch(setFilter("active"));
```

### 内部原理

#### Action 在数据流中的位置

```
Redux 单向数据流：

  用户操作 → dispatch(action) → reducer(state, action) → 新 state → UI 更新

  1. 用户点击按钮
  2. 事件处理函数调用 dispatch(addTodo("学习"))
  3. dispatch 将 action 传给 reducer
  4. reducer 根据 action.type 计算新 state
  5. Store 更新，通知订阅者
  6. 组件重新渲染

Action 的结构约定（Flux Standard Action）：
  {
      type: string,      // 必须：描述操作类型
      payload: any,      // 可选：携带的数据
      error: boolean,    // 可选：是否为错误 action
      meta: any,         // 可选：额外元信息
  }
```

### 与相关API的对比

| 对比维度 | 手写 Action | Redux Toolkit createSlice |
|----------|-----------|-------------------------|
| type 定义 | 手动定义常量 | 自动生成（slice名/reducer名） |
| Action Creator | 手动编写函数 | 自动生成 |
| 类型安全 | 需要手动定义类型 | 自动推导 |
| 代码量 | 多 | 少 |

### 适用场景

- **所有 Redux 应用：** Action 是 Redux 数据流的必要组成
- **复杂业务逻辑：** 多个不同操作需要明确区分
- **日志追踪：** type 字符串便于在 DevTools 中查看

### 常见问题

#### type 字符串的命名规范

**解决方案：**

```
推荐格式："领域/操作"
  "todos/addTodo"
  "user/login"
  "cart/removeItem"

好处：
  → DevTools 中按领域分组
  → 避免不同模块的 type 冲突
  → Redux Toolkit 的 createSlice 自动使用这个格式
```

### 注意事项

- Action 必须是纯对象（不能是 class 实例、Promise 等）
- type 属性是必须的，建议使用"领域/操作"格式
- payload 是约定俗成的字段名（非强制），用于携带数据
- Action Creator 函数可以避免硬编码和拼写错误
- 2026 年推荐使用 Redux Toolkit 自动生成 Action

### 总结

Action 是描述"发生了什么"的纯对象，必须包含 type 属性。payload 携带操作数据。Action Creator 是返回 Action 对象的工厂函数，避免硬编码。type 的命名推荐"领域/操作"格式。在 2026 年的实际开发中，Redux Toolkit 的 createSlice 会自动生成 Action Type 和 Action Creator，无需手动编写。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Redux的Reducer纯函数与不可变性

### 概念说明

Reducer 是 Redux 中负责计算新状态的纯函数。它接收当前状态（state）和一个 Action 对象，返回一个全新的状态对象。Reducer 必须满足两个条件：**纯函数**（相同输入永远返回相同输出，无副作用）和**不可变性**（不能直接修改传入的 state，必须返回新对象）。

纯函数意味着 Reducer 中不能发起网络请求、不能修改外部变量、不能调用 Math.random() 或 Date.now() 等不确定的方法。不可变性要求每次状态变更都创建新的对象引用——用展开运算符（...）、Object.assign 或 Array 的不可变方法（map、filter、concat）替代直接修改。这保证了 Redux 能通过引用比较快速判断状态是否变化，也是时间旅行调试的基础。

### 基本示例

```typescript
// 示例说明：Reducer 的纯函数和不可变性写法

interface Todo {
    id: number;
    text: string;
    completed: boolean;
}

interface TodoState {
    items: Todo[];
    filter: "all" | "active" | "completed";
}

const initialState: TodoState = {
    items: [],
    filter: "all",
};

// Reducer：纯函数，不可变更新
function todoReducer(state: TodoState = initialState, action: any): TodoState {
    switch (action.type) {
        case "ADD_TODO":
            // 不可变：用展开运算符创建新数组
            return {
                ...state,  // 复制其他属性
                items: [
                    ...state.items,  // 保留旧数据
                    {
                        id: action.payload.id,
                        text: action.payload.text,
                        completed: false,
                    },
                ],
            };

        case "TOGGLE_TODO":
            return {
                ...state,
                // 用 map 创建新数组，修改目标项
                items: state.items.map(todo =>
                    todo.id === action.payload.id
                        ? { ...todo, completed: !todo.completed }  // 创建新对象
                        : todo  // 未修改的直接返回原引用
                ),
            };

        case "DELETE_TODO":
            return {
                ...state,
                // 用 filter 创建不包含目标项的新数组
                items: state.items.filter(todo => todo.id !== action.payload.id),
            };

        case "SET_FILTER":
            return {
                ...state,
                filter: action.payload.filter,
            };

        default:
            // 无匹配 action 时返回原 state（保持引用不变）
            return state;
    }
}

// ===== 错误示范：违反不可变性 =====
function wrongReducer(state: TodoState = initialState, action: any): TodoState {
    switch (action.type) {
        case "ADD_TODO":
            // 错误：直接 push 修改了原数组
            // state.items.push({ id: 1, text: "test", completed: false });
            // return state;  // 引用没变，Redux 检测不到更新

        case "TOGGLE_TODO":
            // 错误：直接修改了对象属性
            // const todo = state.items.find(t => t.id === action.payload.id);
            // todo.completed = !todo.completed;
            // return state;

        default:
            return state;
    }
}
```

### 内部原理

#### 为什么必须不可变

```
Redux 通过引用比较检测状态变化：

  const oldState = store.getState();
  store.dispatch(action);
  const newState = store.getState();

  if (oldState !== newState) {
      // 状态变了，通知订阅者
  }

如果直接修改 state 对象：
  state.items.push(newItem);
  return state;
  → oldState === newState（同一个引用）
  → Redux 认为状态没变
  → 不触发 UI 更新

正确的不可变更新：
  return { ...state, items: [...state.items, newItem] };
  → oldState !== newState（新的引用）
  → Redux 检测到变化
  → 触发 UI 更新
```

### 与相关API的对比

| 操作 | 可变写法（错误） | 不可变写法（正确） |
|------|---------------|-----------------|
| 添加数组元素 | arr.push(item) | [...arr, item] |
| 删除数组元素 | arr.splice(i, 1) | arr.filter(x => x.id !== id) |
| 修改数组元素 | arr[i].done = true | arr.map(x => x.id === id ? {...x, done: true} : x) |
| 修改对象属性 | obj.name = "新值" | {...obj, name: "新值"} |
| 嵌套对象修改 | obj.a.b = 1 | {...obj, a: {...obj.a, b: 1&rbrace;&rbrace; |

### 适用场景

- **所有 Redux Reducer：** 必须遵守纯函数和不可变性
- **深层嵌套状态：** 需要逐层展开（或用 Immer 简化）
- **性能敏感场景：** 不可变性使 shouldComponentUpdate 通过引用比较优化

### 常见问题

#### 深层嵌套的不可变更新太繁琐

**问题描述：** 多层嵌套的对象每层都要展开。

**解决方案：**

```typescript
// 手动展开（繁琐但明确）：
return {
    ...state,
    user: {
        ...state.user,
        address: {
            ...state.user.address,
            city: "北京",  // 只改最深层的一个字段
        },
    },
};

// 使用 Redux Toolkit（内置 Immer，可以写"可变"风格）：
// createSlice 中的 reducer 可以直接"修改" state
// Immer 会在背后生成不可变的新对象
// reducers: {
//     updateCity(state, action) {
//         state.user.address.city = action.payload;  // 看起来是可变的
//         // Immer 自动转换为不可变更新
//     }
// }
```

### 注意事项

- Reducer 必须是纯函数：不能有副作用、不能调用随机/时间函数
- 必须返回新对象引用，不能直接修改 state
- default 分支必须返回原 state（保持引用不变）
- 深层嵌套的不可变更新可以用 Redux Toolkit 的 Immer 简化
- 未修改的子对象可以保持原引用（减少不必要的重渲染）

### 总结

Reducer 是 Redux 中计算新状态的纯函数，必须遵守不可变性原则——不直接修改 state，而是返回新对象。纯函数保证了状态的可预测性，不可变性使 Redux 能通过引用比较高效检测变化。手动不可变更新在深层嵌套时较繁琐，Redux Toolkit 内置 Immer 可以用"可变"风格编写而自动保持不可变性。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Redux的dispatch动作分发

### 概念说明

`dispatch` 是 Redux Store 提供的方法，也是**修改状态的唯一途径**。组件不能直接修改 Store 中的状态，必须通过 dispatch 发送一个 Action 对象，由 Reducer 计算出新的状态。这种单向数据流保证了状态变更的可追踪性——每次变更都对应一个明确的 Action，可以在 Redux DevTools 中查看完整的操作历史。

dispatch 的工作流程：接收一个 Action 对象 → 传递给 Reducer 函数 → Reducer 返回新状态 → Store 更新 → 通知所有 subscribe 的监听函数。在 React-Redux 中，组件通过 `useDispatch` Hook 获取 dispatch 函数，通过 `useSelector` 读取状态。

### 基本示例

```tsx
// 示例说明：在 React 组件中使用 dispatch

import React from "react";
import { useDispatch, useSelector } from "react-redux";

// 假设已定义 Action Creator
const increment = () => ({ type: "counter/increment" });
const decrement = () => ({ type: "counter/decrement" });
const incrementByAmount = (amount: number) => ({
    type: "counter/incrementByAmount",
    payload: amount,
});

interface RootState {
    counter: { value: number };
}

function Counter() {
    // useDispatch 获取 dispatch 函数
    const dispatch = useDispatch();
    // useSelector 从 Store 读取状态
    const count = useSelector((state: RootState) => state.counter.value);

    return (
        <div>
            <p>计数: {count}</p>
            {/* 点击按钮时 dispatch 一个 Action */}
            <button onClick={() => dispatch(increment())}>+1</button>
            <button onClick={() => dispatch(decrement())}>-1</button>
            <button onClick={() => dispatch(incrementByAmount(5))}>+5</button>
        </div>
    );
}

export default Counter;
```

### 内部原理

#### dispatch 的执行流程

```javascript
// Redux Store 内部 dispatch 的简化实现
function createStore(reducer, initialState) {
    let currentState = initialState;
    let listeners = [];

    function getState() {
        return currentState;
    }

    function dispatch(action) {
        // 1. 检查 action 是否为纯对象
        if (typeof action.type === "undefined") {
            throw new Error("Action 必须有 type 属性");
        }

        // 2. 调用 reducer 计算新状态
        currentState = reducer(currentState, action);

        // 3. 通知所有订阅者
        listeners.forEach(listener => listener());

        // 4. 返回 action（方便链式调用）
        return action;
    }

    function subscribe(listener) {
        listeners.push(listener);
        return () => {
            listeners = listeners.filter(l => l !== listener);
        };
    }

    // 初始化：dispatch 一个内部 action 让 reducer 返回初始状态
    dispatch({ type: "@@INIT" });

    return { getState, dispatch, subscribe };
}
```

### 与相关API的对比

| 对比维度 | dispatch(action) | setState | Zustand set() |
|----------|-----------------|----------|--------------|
| 参数 | Action 对象 | 新状态或更新函数 | 部分状态或更新函数 |
| 中间件 | 支持（拦截和增强） | 不支持 | 支持 |
| 可追踪 | DevTools 记录每个 action | 不可追踪 | DevTools 支持 |
| 异步 | 需要中间件（thunk/saga） | 直接支持 | 直接支持 |

### 适用场景

- **用户交互：** 按钮点击、表单提交等触发状态变更
- **数据请求回调：** 请求成功/失败后更新状态
- **定时器/订阅：** 外部事件触发状态变更

### 常见问题

#### dispatch 异步操作

**问题描述：** dispatch 默认只接受纯对象，不能直接处理异步。

**解决方案：**

```typescript
// 方案1：在组件中处理异步，dispatch 同步 action
async function handleFetch() {
    dispatch({ type: "FETCH_START" });
    try {
        const data = await fetch("/api/data").then(r => r.json());
        dispatch({ type: "FETCH_SUCCESS", payload: data });
    } catch (error) {
        dispatch({ type: "FETCH_ERROR", payload: (error as Error).message });
    }
}

// 方案2：使用 redux-thunk 中间件（dispatch 可以接受函数）
// dispatch(fetchData());  // fetchData 返回一个异步函数

// 方案3：使用 RTK 的 createAsyncThunk（推荐）
// dispatch(fetchDataThunk());
```

### 注意事项

- dispatch 是修改 Redux 状态的唯一方式
- dispatch 是同步的：调用后立即执行 reducer 和通知监听者
- 默认只接受纯对象，异步操作需要中间件支持
- 在 React-Redux 中通过 useDispatch Hook 获取
- dispatch 返回传入的 action 对象

### 总结

dispatch 是 Redux 中修改状态的唯一方法，接收 Action 对象传递给 Reducer 计算新状态。执行过程是同步的：调用 reducer → 更新状态 → 通知订阅者。默认只支持纯对象 Action，异步操作需要 thunk 或 saga 等中间件。React 组件通过 useDispatch 获取 dispatch 函数。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Redux的中间件机制(applyMiddleware)

### 概念说明

Redux 中间件是一种在 dispatch 和 Reducer 之间插入自定义逻辑的机制。默认的 dispatch 只能接收纯对象 Action，中间件可以拦截、修改、延迟、甚至替换 Action，从而实现日志记录、异步操作、错误上报等功能。

中间件通过 `applyMiddleware` 函数注入到 Store 中。它的原理是对 Store 的 dispatch 方法进行增强（包装）：原始的 dispatch 被一层层中间件包裹，每个中间件可以在 Action 到达 Reducer 之前或之后执行自定义逻辑。中间件的函数签名是三层嵌套的柯里化函数：`store => next => action => { ... }`。

### 基本示例

```typescript
// 示例说明：自定义中间件和 applyMiddleware 的使用

import { createStore, applyMiddleware, Middleware } from "redux";

// 自定义日志中间件
// 三层柯里化：store => next => action => result
const loggerMiddleware: Middleware = (store) => (next) => (action) => {
    // dispatch 前：记录 action 和当前状态
    console.log("dispatching:", action.type);
    console.log("当前状态:", store.getState());

    // 调用下一个中间件（或最终的 dispatch）
    const result = next(action);

    // dispatch 后：记录更新后的状态
    console.log("更新后状态:", store.getState());
    console.log("---");

    // 返回 next(action) 的结果
    return result;
};

// 自定义错误上报中间件
const crashReporter: Middleware = (store) => (next) => (action) => {
    try {
        return next(action);
    } catch (err) {
        console.error("Reducer 执行出错:", err);
        // 可以上报到错误监控平台
        // reportError(err, { action, state: store.getState() });
        throw err;
    }
};

// 简单的 reducer
function counterReducer(state = { value: 0 }, action: any) {
    switch (action.type) {
        case "INCREMENT":
            return { value: state.value + 1 };
        default:
            return state;
    }
}

// 使用 applyMiddleware 注入中间件
const store = createStore(
    counterReducer,
    applyMiddleware(loggerMiddleware, crashReporter)
    // 中间件按顺序执行：loggerMiddleware → crashReporter → dispatch
);

store.dispatch({ type: "INCREMENT" });
// 控制台输出：
// dispatching: INCREMENT
// 当前状态: { value: 0 }
// 更新后状态: { value: 1 }
// ---
```

### 内部原理

#### applyMiddleware 的实现原理

```javascript
// applyMiddleware 简化实现
function applyMiddleware(...middlewares) {
    return (createStore) => (reducer, initialState) => {
        // 创建原始 Store
        const store = createStore(reducer, initialState);
        let dispatch = store.dispatch;

        // 传给中间件的 API（只暴露 getState 和 dispatch）
        const middlewareAPI = {
            getState: store.getState,
            dispatch: (action) => dispatch(action),
        };

        // 第一层调用：传入 store API
        // 得到 [next => action => {...}, next => action => {...}, ...]
        const chain = middlewares.map(middleware => middleware(middlewareAPI));

        // compose：从右到左组合中间件
        // dispatch = m1(m2(m3(store.dispatch)))
        dispatch = compose(...chain)(store.dispatch);

        return {
            ...store,
            dispatch,  // 增强后的 dispatch
        };
    };
}

// compose 函数：从右到左组合函数
function compose(...funcs) {
    if (funcs.length === 0) return (arg) => arg;
    if (funcs.length === 1) return funcs[0];
    return funcs.reduce((a, b) => (...args) => a(b(...args)));
}
```

#### 中间件的三层柯里化

```
middleware = store => next => action => { ... }

store：{ getState, dispatch }
  → 中间件可以读取状态和分发新的 action

next：下一个中间件的 dispatch（或最终的 store.dispatch）
  → 调用 next(action) 将 action 传递给下一个中间件

action：当前被 dispatch 的 action 对象
  → 中间件可以检查、修改、拦截或替换 action
```

### 与相关API的对比

| 中间件 | 用途 | 拦截位置 |
|--------|------|---------|
| redux-logger | 日志记录 | action 前后 |
| redux-thunk | 异步操作 | 替换 action（函数变对象） |
| redux-saga | 复杂异步流 | 监听 action 触发 saga |
| 自定义中间件 | 任意逻辑 | 任意位置 |

### 适用场景

- **日志记录：** 记录每个 action 和状态变化
- **异步处理：** thunk、saga 等异步中间件
- **错误处理：** 捕获 Reducer 中的异常并上报
- **数据转换：** 在 action 到达 Reducer 前修改数据

### 常见问题

#### 中间件的顺序有影响吗

**解决方案：**

```
applyMiddleware(A, B, C) 的执行顺序：

dispatch 方向：A → B → C → Reducer
返回方向：Reducer → C → B → A

具体来说：
  增强后的 dispatch = A(B(C(store.dispatch)))
  调用 dispatch(action) 时：
    1. A 的逻辑（next 之前）
    2. B 的逻辑（next 之前）
    3. C 的逻辑（next 之前）
    4. Reducer 执行
    5. C 的逻辑（next 之后）
    6. B 的逻辑（next 之后）
    7. A 的逻辑（next 之后）

所以日志中间件通常放在第一个：
  applyMiddleware(logger, thunk, saga)
  → logger 能记录所有 action（包括被 thunk 转换后的）
```

### 注意事项

- 中间件是三层柯里化函数：store => next => action => result
- 必须调用 next(action) 将 action 传递下去（除非故意拦截）
- 中间件顺序影响执行顺序
- applyMiddleware 作为 createStore 的第三个参数（或第二个）
- Redux Toolkit 的 configureStore 默认包含 thunk 中间件

### 总结

Redux 中间件通过 applyMiddleware 注入，在 dispatch 和 Reducer 之间插入自定义逻辑。中间件是三层柯里化函数，通过 next 将 action 传递给下一个中间件。中间件顺序影响执行顺序（从左到右进入，从右到左返回）。常见中间件包括 logger、thunk、saga。Redux Toolkit 的 configureStore 默认集成了 thunk 中间件。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Redux的中间件洋葱模型执行顺序

### 概念说明

Redux 中间件的执行顺序遵循"洋葱模型"（Onion Model）：Action 从外层中间件进入，逐层传递到最内层（Reducer），然后从内层向外层依次返回。每个中间件在调用 `next(action)` 之前的代码是"进入阶段"，调用之后的代码是"返回阶段"。这和 Koa 的中间件模型类似。

假设注册了三个中间件 A、B、C，执行顺序是：A进入 → B进入 → C进入 → Reducer执行 → C返回 → B返回 → A返回。这种结构让每个中间件都能在 Action 处理前后执行逻辑，比如日志中间件可以在进入时记录 Action、在返回时记录更新后的状态。

### 基本示例

```typescript
// 示例说明：洋葱模型的执行顺序验证

import { createStore, applyMiddleware, Middleware } from "redux";

// 中间件A
const middlewareA: Middleware = () => (next) => (action) => {
    console.log("A 进入");   // 1. 第一个执行
    const result = next(action);  // 传递给下一个中间件
    console.log("A 返回");   // 6. 最后执行
    return result;
};

// 中间件B
const middlewareB: Middleware = () => (next) => (action) => {
    console.log("B 进入");   // 2. 第二个执行
    const result = next(action);  // 传递给下一个中间件
    console.log("B 返回");   // 5. 倒数第二执行
    return result;
};

// 中间件C
const middlewareC: Middleware = () => (next) => (action) => {
    console.log("C 进入");   // 3. 第三个执行
    const result = next(action);  // 传递给 Reducer
    console.log("C 返回");   // 4. Reducer 执行后第一个返回
    return result;
};

function reducer(state = { count: 0 }, action: any) {
    if (action.type === "INCREMENT") {
        console.log("Reducer 执行");  // 在 C 进入和 C 返回之间
        return { count: state.count + 1 };
    }
    return state;
}

// 中间件注册顺序：A, B, C
const store = createStore(reducer, applyMiddleware(middlewareA, middlewareB, middlewareC));

store.dispatch({ type: "INCREMENT" });
// 输出顺序：
// A 进入
// B 进入
// C 进入
// Reducer 执行
// C 返回
// B 返回
// A 返回
```

### 内部原理

#### 洋葱模型图解

```
dispatch(action)
  │
  ▼
┌─────────────────────────────────┐
│  中间件 A                        │
│    console.log("A 进入")         │
│    ┌───────────────────────────┐ │
│    │  中间件 B                  │ │
│    │    console.log("B 进入")   │ │
│    │    ┌─────────────────────┐ │ │
│    │    │  中间件 C            │ │ │
│    │    │    console.log("C") │ │ │
│    │    │    ┌───────────────┐ │ │ │
│    │    │    │   Reducer     │ │ │ │
│    │    │    │   计算新状态   │ │ │ │
│    │    │    └───────────────┘ │ │ │
│    │    │    console.log("C") │ │ │
│    │    └─────────────────────┘ │ │
│    │    console.log("B 返回")   │ │
│    └───────────────────────────┘ │
│    console.log("A 返回")         │
└─────────────────────────────────┘
  │
  ▼
返回 result
```

#### compose 函数实现洋葱结构

```javascript
// compose(A, B, C)(dispatch) 等价于 A(B(C(dispatch)))

// 调用增强后的 dispatch(action) 时：
//   A 的 action handler 被调用
//     A 中 next = B 的 action handler
//     调用 next(action) → 进入 B
//       B 中 next = C 的 action handler
//       调用 next(action) → 进入 C
//         C 中 next = 原始 store.dispatch
//         调用 next(action) → Reducer 执行
//         C 中 next 之后的代码执行
//       B 中 next 之后的代码执行
//     A 中 next 之后的代码执行
```

### 与相关API的对比

| 模型 | Redux 中间件 | Express 中间件 | Koa 中间件 |
|------|------------|--------------|-----------|
| 执行模型 | 洋葱模型 | 线性模型 | 洋葱模型 |
| 传递方式 | next(action) | next() | await next() |
| 返回阶段 | next 之后的代码 | 无 | next 之后的代码 |
| 异步支持 | 需要中间件 | 原生 | 原生 async/await |

### 适用场景

- **理解执行顺序：** 调试多个中间件的交互
- **日志中间件：** 进入时记录 action，返回时记录新状态
- **性能监控：** 进入时记录时间戳，返回时计算耗时
- **错误处理：** 包裹 next 调用的 try/catch

### 常见问题

#### 中间件中不调用 next 会怎样

**解决方案：**

```typescript
const blockMiddleware: Middleware = () => (next) => (action) => {
    if (action.type === "BLOCKED_ACTION") {
        console.log("Action 被拦截，不传递给 Reducer");
        return;  // 不调用 next → action 不会到达 Reducer
        // 后续中间件和 Reducer 都不会执行
    }
    return next(action);  // 其他 action 正常传递
};

// 用途：权限检查、Action 过滤、防抖/节流
```

### 注意事项

- 洋葱模型：进入顺序和返回顺序相反
- next(action) 之前的代码在 Reducer 之前执行
- next(action) 之后的代码在 Reducer 之后执行
- 不调用 next 会阻断整个链路（Action 不会到达 Reducer）
- 中间件可以修改 action 或 dispatch 新的 action

### 总结

Redux 中间件按洋葱模型执行：Action 从外层进入内层到达 Reducer，然后从内层返回外层。每个中间件在 next(action) 前后都能执行逻辑。compose 函数通过嵌套调用实现洋葱结构。不调用 next 会阻断链路。这种模型让日志、错误处理、性能监控等横切关注点能优雅地插入到数据流中。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Redux-thunk的异步逻辑处理

### 概念说明

Redux-thunk 是最常用的 Redux 异步中间件，它允许 dispatch 接收函数（thunk）而不仅仅是纯对象。当 dispatch 收到一个函数时，thunk 中间件会调用这个函数并传入 `dispatch` 和 `getState` 作为参数，让函数内部可以执行异步操作，并在异步完成后 dispatch 真正的 Action 对象。

thunk 这个词来源于编程术语，指"延迟执行的函数"。Redux-thunk 的实现极其简洁，核心代码只有十几行。它解决的问题是：Reducer 必须是纯函数不能处理异步，组件中直接写异步逻辑又不利于复用和测试，thunk 提供了一个中间层来封装异步逻辑。Redux Toolkit 默认集成了 thunk 中间件。

### 基本示例

```typescript
// 示例说明：使用 redux-thunk 处理异步数据请求

import { createStore, applyMiddleware } from "redux";
import thunk, { ThunkAction } from "redux-thunk";

// 状态类型
interface AppState {
    users: any[];
    loading: boolean;
    error: string | null;
}

// Action 类型
type AppAction =
    | { type: "FETCH_USERS_START" }
    | { type: "FETCH_USERS_SUCCESS"; payload: any[] }
    | { type: "FETCH_USERS_ERROR"; payload: string };

// Reducer
function usersReducer(
    state: AppState = { users: [], loading: false, error: null },
    action: AppAction
): AppState {
    switch (action.type) {
        case "FETCH_USERS_START":
            return { ...state, loading: true, error: null };
        case "FETCH_USERS_SUCCESS":
            return { ...state, loading: false, users: action.payload };
        case "FETCH_USERS_ERROR":
            return { ...state, loading: false, error: action.payload };
        default:
            return state;
    }
}

// 创建 Store（应用 thunk 中间件）
const store = createStore(usersReducer, applyMiddleware(thunk));

// ===== Thunk Action Creator =====
// 返回一个函数而不是对象
// 函数接收 dispatch 和 getState 作为参数
function fetchUsers(): ThunkAction<Promise<void>, AppState, unknown, AppAction> {
    return async (dispatch, getState) => {
        // 可以读取当前状态
        const currentState = getState();
        if (currentState.users.length > 0) {
            return;  // 已有数据，不重复请求
        }

        // 开始请求：dispatch 同步 action
        dispatch({ type: "FETCH_USERS_START" });

        try {
            // 执行异步操作
            const response = await fetch("https://jsonplaceholder.typicode.com/users");
            const users = await response.json();

            // 请求成功：dispatch 成功 action
            dispatch({ type: "FETCH_USERS_SUCCESS", payload: users });
        } catch (error) {
            // 请求失败：dispatch 错误 action
            dispatch({
                type: "FETCH_USERS_ERROR",
                payload: (error as Error).message,
            });
        }
    };
}

// 使用：dispatch 一个函数
store.dispatch(fetchUsers() as any);
```

### 内部原理

#### redux-thunk 源码

```javascript
// redux-thunk 的核心实现（完整源码就这么短）
function createThunkMiddleware(extraArgument) {
    return ({ dispatch, getState }) => (next) => (action) => {
        // 如果 action 是函数 → 调用它，传入 dispatch 和 getState
        if (typeof action === "function") {
            return action(dispatch, getState, extraArgument);
        }
        // 如果 action 是普通对象 → 正常传递给下一个中间件
        return next(action);
    };
}

const thunk = createThunkMiddleware();
thunk.withExtraArgument = createThunkMiddleware;

// 就这么简单：
// 函数 → 调用它
// 对象 → 传递下去
```

### 与相关API的对比

| 对比维度 | redux-thunk | redux-saga | RTK createAsyncThunk |
|----------|-----------|-----------|---------------------|
| 学习成本 | 低 | 高（Generator） | 中 |
| 代码量 | 少 | 多 | 中 |
| 异步模型 | Promise/async | Generator | Promise/async |
| 取消请求 | 手动实现 | 内置支持 | AbortController |
| 测试难度 | 中 | 低（纯函数） | 低 |

### 适用场景

- **简单异步：** API 请求、定时操作
- **条件 dispatch：** 根据当前状态决定是否 dispatch
- **连续 dispatch：** 一个操作需要 dispatch 多个 action
- **小中型项目：** 异步逻辑不太复杂的场景

### 常见问题

#### thunk 中如何处理请求取消

**解决方案：**

```typescript
function fetchWithCancel(): ThunkAction<() => void, AppState, unknown, AppAction> {
    return (dispatch) => {
        const controller = new AbortController();

        dispatch({ type: "FETCH_USERS_START" });

        fetch("/api/users", { signal: controller.signal })
            .then(res => res.json())
            .then(data => dispatch({ type: "FETCH_USERS_SUCCESS", payload: data }))
            .catch(err => {
                if (err.name !== "AbortError") {
                    dispatch({ type: "FETCH_USERS_ERROR", payload: err.message });
                }
            });

        // 返回取消函数
        return () => controller.abort();
    };
}

// 使用：
// const cancel = store.dispatch(fetchWithCancel());
// cancel();  // 取消请求
```

### 注意事项

- thunk 让 dispatch 可以接收函数，函数内部处理异步逻辑
- thunk 函数接收 dispatch 和 getState 两个参数
- thunk 的源码极简（约10行），但功能够用
- Redux Toolkit 默认包含 thunk 中间件
- 复杂异步流程（竞态、取消、重试）建议用 saga 或 RTK Query

### 总结

Redux-thunk 通过允许 dispatch 接收函数来处理异步逻辑。thunk 函数内部可以执行异步操作，并在完成后 dispatch 同步 Action。源码极简但覆盖了大部分异步场景。Redux Toolkit 默认集成 thunk。对于复杂异步流程，可以考虑 redux-saga 或 RTK Query。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Redux-saga的Generator副作用管理

### 概念说明

Redux-saga 是一个 Redux 中间件，使用 ES6 的 Generator 函数来管理复杂的异步副作用。与 thunk 不同，saga 不是在 Action Creator 中编写异步逻辑，而是创建独立的"saga"函数来监听特定的 Action，并在监听到后执行对应的异步流程。

saga 的核心优势在于：它将副作用逻辑从组件和 Action Creator 中分离出来，集中在 saga 文件中管理。Generator 函数的 yield 语法让异步代码看起来像同步代码，而且 saga 提供的 Effect（如 call、put、take、fork、cancel）让异步流程的组合、取消、竞态处理变得简洁。saga 函数 yield 的是描述副作用的普通对象（Effect），而非执行副作用本身，这使得 saga 非常容易测试。

### 基本示例

```typescript
// 示例说明：使用 redux-saga 处理异步请求

import { call, put, takeLatest, all } from "redux-saga/effects";

// API 请求函数（普通函数，非 Generator）
async function fetchUsersAPI() {
    const response = await fetch("https://jsonplaceholder.typicode.com/users");
    if (!response.ok) {
        throw new Error("请求失败");
    }
    return response.json();
}

// Worker Saga：实际执行异步逻辑的 Generator 函数
function* fetchUsersSaga(): Generator {
    try {
        // put：dispatch 一个 action（等价于 store.dispatch）
        yield put({ type: "FETCH_USERS_START" });

        // call：调用异步函数并等待结果
        // call 返回一个 Effect 描述对象，saga 中间件负责执行
        const users = yield call(fetchUsersAPI);

        // 请求成功：dispatch 成功 action
        yield put({ type: "FETCH_USERS_SUCCESS", payload: users });
    } catch (error) {
        // 请求失败：dispatch 错误 action
        yield put({
            type: "FETCH_USERS_ERROR",
            payload: (error as Error).message,
        });
    }
}

// Watcher Saga：监听特定 action 并触发 worker saga
function* watchFetchUsers(): Generator {
    // takeLatest：如果连续触发，取消前一次未完成的请求
    // 只保留最后一次请求的结果
    yield takeLatest("FETCH_USERS_REQUEST", fetchUsersSaga);
}

// Root Saga：组合所有 watcher saga
function* rootSaga(): Generator {
    yield all([
        watchFetchUsers(),
        // 可以添加更多 watcher saga
    ]);
}

export default rootSaga;

// Store 配置：
// import createSagaMiddleware from "redux-saga";
// const sagaMiddleware = createSagaMiddleware();
// const store = createStore(rootReducer, applyMiddleware(sagaMiddleware));
// sagaMiddleware.run(rootSaga);
```

### 内部原理

#### 常用 Effect 说明

```
call(fn, ...args)
  → 调用函数 fn 并传入参数
  → 如果返回 Promise，等待 resolve
  → 阻塞：暂停 saga 直到 fn 完成

put(action)
  → 相当于 dispatch(action)
  → 非阻塞：dispatch 后继续执行

take(actionType)
  → 等待指定类型的 action 被 dispatch
  → 阻塞：暂停 saga 直到匹配的 action 到来

takeEvery(actionType, saga)
  → 每次 dispatch 匹配的 action 都执行 saga
  → 非阻塞：不取消前一次

takeLatest(actionType, saga)
  → 只保留最后一次 saga 执行
  → 自动取消前一次未完成的 saga

fork(saga)
  → 启动一个非阻塞的子 saga
  → 父 saga 不等待子 saga 完成

cancel(task)
  → 取消一个 fork 出的任务

race({ key1: effect1, key2: effect2 })
  → 竞态：谁先完成就用谁的结果，取消其他的
```

### 与相关API的对比

| 对比维度 | redux-saga | redux-thunk | RTK createAsyncThunk |
|----------|-----------|-------------|---------------------|
| 异步模型 | Generator yield | async/await | async/await |
| 学习曲线 | 高 | 低 | 中 |
| 可测试性 | 高（纯 Effect 对象） | 中（需要 mock） | 中 |
| 取消支持 | 内置（cancel、takeLatest） | 手动实现 | AbortController |
| 竞态处理 | 内置（race） | 手动实现 | 手动实现 |
| 复杂流程 | 擅长 | 简单场景 | 中等场景 |

### 适用场景

- **复杂异步流程：** 多步骤、有依赖关系的异步操作
- **竞态处理：** 搜索建议、自动补全（取消旧请求）
- **轮询和长连接：** 定时轮询、WebSocket 消息处理
- **事务操作：** 需要回滚的多步操作

### 常见问题

#### saga 和 thunk 怎么选

**解决方案：**

```
选 thunk 的场景：
  → 简单的 API 请求（请求-成功-失败三步）
  → 小型项目，异步逻辑不复杂
  → 团队对 Generator 不熟悉

选 saga 的场景：
  → 复杂的异步流程（多步骤、依赖、取消）
  → 需要竞态处理（takeLatest、race）
  → 需要高可测试性（Effect 是纯描述对象）
  → 大型项目，副作用逻辑复杂

2026 年的趋势：
  → RTK Query 替代了大部分数据请求场景
  → saga 主要用于非数据请求的复杂副作用
  → 新项目优先考虑 RTK Query + thunk
```

### 注意事项

- saga 使用 Generator 函数（function*）和 yield
- Effect 是描述副作用的纯对象，saga 中间件负责执行
- takeLatest 自动取消前一次，适合搜索等场景
- takeEvery 每次都执行，适合不需要取消的场景
- saga 需要单独配置 sagaMiddleware 并调用 run()
- 2026 年新项目中 saga 的使用率已经下降，RTK Query 是更轻量的选择

### 总结

Redux-saga 使用 Generator 函数管理复杂异步副作用，通过 yield Effect（call、put、take 等）描述副作用而非直接执行。核心优势在于：代码可读性强、易于测试、内置取消和竞态处理。适合复杂异步流程的大型项目。2026 年的趋势是 RTK Query 覆盖数据请求场景，saga 主要用于非请求类的复杂副作用管理。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Redux Toolkit(RTK)的createSlice

### 概念说明

`createSlice` 是 Redux Toolkit 的核心 API，它将 Action Type 定义、Action Creator 生成、Reducer 编写三个步骤合并为一个函数调用。传统 Redux 中需要分别定义 action type 常量、编写 action creator 函数、在 reducer 的 switch/case 中处理——createSlice 把这些全部自动化了。

createSlice 接收一个配置对象，包含 `name`（slice 名称，用于生成 action type 的前缀）、`initialState`（初始状态）和 `reducers`（一个对象，键是 reducer 名称，值是 reducer 函数）。它自动生成格式为 `name/reducerName` 的 action type 和对应的 action creator。另外 createSlice 内部集成了 Immer，reducer 函数中可以直接"修改"state，Immer 会自动转换为不可变更新。

### 基本示例

```typescript
// 示例说明：使用 createSlice 创建一个完整的 todo 模块

import { createSlice, PayloadAction, configureStore } from "@reduxjs/toolkit";

// 类型定义
interface Todo {
    id: string;
    text: string;
    completed: boolean;
}

interface TodoState {
    items: Todo[];
    filter: "all" | "active" | "completed";
}

// 初始状态
const initialState: TodoState = {
    items: [],
    filter: "all",
};

// createSlice：一站式创建 reducer + action
const todoSlice = createSlice({
    name: "todos",  // 生成 action type 的前缀
    initialState,
    reducers: {
        // 每个方法自动生成对应的 action creator
        // action type 自动为 "todos/addTodo"
        addTodo(state, action: PayloadAction<string>) {
            // 可以直接"修改" state（Immer 处理不可变性）
            state.items.push({
                id: Date.now().toString(),
                text: action.payload,
                completed: false,
            });
        },

        // action type: "todos/toggleTodo"
        toggleTodo(state, action: PayloadAction<string>) {
            const todo = state.items.find(t => t.id === action.payload);
            if (todo) {
                todo.completed = !todo.completed;  // 直接修改，Immer 处理
            }
        },

        // action type: "todos/deleteTodo"
        deleteTodo(state, action: PayloadAction<string>) {
            // 也可以返回新状态（替换整个 state）
            state.items = state.items.filter(t => t.id !== action.payload);
        },

        // action type: "todos/setFilter"
        setFilter(state, action: PayloadAction<"all" | "active" | "completed">) {
            state.filter = action.payload;
        },
    },
});

// 自动生成的 action creator
export const { addTodo, toggleTodo, deleteTodo, setFilter } = todoSlice.actions;

// 自动生成的 reducer
export default todoSlice.reducer;

// 使用示例：
// dispatch(addTodo("学习 RTK"));
// → { type: "todos/addTodo", payload: "学习 RTK" }

// 配置 Store
const store = configureStore({
    reducer: {
        todos: todoSlice.reducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### 内部原理

#### createSlice 做了什么

```
输入：
  createSlice({
      name: "todos",
      initialState: { items: [], filter: "all" },
      reducers: {
          addTodo(state, action) { ... },
          toggleTodo(state, action) { ... },
      }
  })

输出：
  {
      name: "todos",
      reducer: function(state, action) { ... },  // 合并后的 reducer
      actions: {
          addTodo: function(payload) {             // action creator
              return { type: "todos/addTodo", payload };
          },
          toggleTodo: function(payload) {
              return { type: "todos/toggleTodo", payload };
          },
      },
      caseReducers: { addTodo: fn, toggleTodo: fn },
  }

内部处理：
  1. 遍历 reducers 对象的每个键
  2. 生成 action type = name + "/" + 键名
  3. 生成对应的 action creator 函数
  4. 用 Immer 的 produce 包裹每个 reducer 函数
  5. 合并为一个完整的 reducer 函数
```

### 与相关API的对比

| 对比维度 | 传统 Redux | createSlice |
|----------|----------|------------|
| Action Type | 手动定义常量 | 自动生成 |
| Action Creator | 手动编写 | 自动生成 |
| Reducer | switch/case + 展开运算符 | 对象方法 + Immer |
| 不可变性 | 手动保证 | Immer 自动处理 |
| 类型安全 | 手动定义 | PayloadAction 自动推导 |
| 代码量 | 多（3个文件） | 少（1个文件） |

### 适用场景

- **所有 Redux 项目：** 2026 年 Redux 官方推荐的标准写法
- **新项目：** 直接使用 RTK 而非原始 Redux
- **旧项目迁移：** 逐步将旧 reducer 改为 createSlice

### 常见问题

#### createSlice 中的 Immer 可以直接修改 state 还是返回新值

**解决方案：**

```typescript
const slice = createSlice({
    name: "example",
    initialState: { value: 0, items: [] as string[] },
    reducers: {
        // 方式1：直接修改 state（Immer 处理）
        increment(state) {
            state.value += 1;  // 直接修改
        },

        // 方式2：返回全新的 state（替换整个状态）
        reset() {
            return { value: 0, items: [] };  // 返回新对象
        },

        // 注意：不能同时修改 state 又返回新值
        // wrong(state) {
        //     state.value += 1;
        //     return { ...state };  // 错误！不能同时使用两种方式
        // }
    },
});
```

### 注意事项

- createSlice 内置 Immer，可以直接"修改"state
- 不能同时修改 state 并返回新值（二选一）
- PayloadAction&lt;T> 提供 payload 的类型推导
- action type 自动生成为 "sliceName/reducerName" 格式
- configureStore 默认包含 thunk 中间件和 DevTools
- 2026 年 Redux 官方强烈推荐使用 RTK 而非原始 Redux

### 总结

createSlice 是 Redux Toolkit 的核心 API，一站式生成 action type、action creator 和 reducer。内置 Immer 允许直接"修改"state 而自动保持不可变性。配合 configureStore 使用，大幅减少了 Redux 的模板代码。2026 年使用 Redux 就应该使用 RTK。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## RTK的createAsyncThunk异步逻辑

### 概念说明

`createAsyncThunk` 是 Redux Toolkit 提供的异步操作工具，用于简化异步请求的状态管理。它接收一个 action type 字符串和一个异步回调函数（payload creator），自动生成三个 action type：`pending`（请求开始）、`fulfilled`（请求成功）、`rejected`（请求失败），并自动 dispatch 对应的 action。

使用 createAsyncThunk 后，不再需要手动定义三个 action type 和对应的 action creator，也不需要在异步函数中手动 dispatch 开始/成功/失败的 action。只需在 createSlice 的 `extraReducers` 中处理这三个生命周期 action 即可。createAsyncThunk 还内置了请求取消（通过 AbortController）和条件执行（condition 参数）的支持。

### 基本示例

```typescript
// 示例说明：使用 createAsyncThunk 处理异步数据请求

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

// 类型定义
interface User {
    id: number;
    name: string;
    email: string;
}

interface UsersState {
    items: User[];
    loading: boolean;
    error: string | null;
}

// 创建异步 thunk
// 第一个参数：action type 前缀（自动生成 pending/fulfilled/rejected）
// 第二个参数：异步回调函数（payload creator）
const fetchUsers = createAsyncThunk<User[], void, { rejectValue: string }>(
    "users/fetchUsers",
    async (_, { rejectWithValue, signal }) => {
        try {
            // signal 用于请求取消（自动传入 AbortController 的 signal）
            const response = await fetch("https://jsonplaceholder.typicode.com/users", {
                signal,
            });

            if (!response.ok) {
                // rejectWithValue 让 rejected action 携带自定义错误信息
                return rejectWithValue("服务器返回错误");
            }

            const data: User[] = await response.json();
            return data;  // 返回值作为 fulfilled action 的 payload
        } catch (error) {
            return rejectWithValue((error as Error).message);
        }
    }
);

// createSlice 中通过 extraReducers 处理异步 action
const usersSlice = createSlice({
    name: "users",
    initialState: {
        items: [],
        loading: false,
        error: null,
    } as UsersState,
    reducers: {
        // 同步 reducer（如果需要）
        clearUsers(state) {
            state.items = [];
        },
    },
    extraReducers: (builder) => {
        builder
            // 请求开始
            .addCase(fetchUsers.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            // 请求成功
            .addCase(fetchUsers.fulfilled, (state, action: PayloadAction<User[]>) => {
                state.loading = false;
                state.items = action.payload;
            })
            // 请求失败
            .addCase(fetchUsers.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload ?? "未知错误";
            });
    },
});

export { fetchUsers };
export const { clearUsers } = usersSlice.actions;
export default usersSlice.reducer;

// 组件中使用：
// const dispatch = useDispatch<AppDispatch>();
// dispatch(fetchUsers());
// 取消请求：const promise = dispatch(fetchUsers()); promise.abort();
```

### 内部原理

#### createAsyncThunk 自动生成的三个 action

```
createAsyncThunk("users/fetchUsers", asyncFn)

自动生成：
  fetchUsers.pending   → { type: "users/fetchUsers/pending" }
  fetchUsers.fulfilled → { type: "users/fetchUsers/fulfilled", payload: data }
  fetchUsers.rejected  → { type: "users/fetchUsers/rejected", error: ... }

执行流程：
  dispatch(fetchUsers())
    1. dispatch({ type: "users/fetchUsers/pending" })
    2. 执行异步回调 asyncFn()
    3a. 成功 → dispatch({ type: "users/fetchUsers/fulfilled", payload: result })
    3b. 失败 → dispatch({ type: "users/fetchUsers/rejected", error: ... })
```

### 与相关API的对比

| 对比维度 | createAsyncThunk | 手写 thunk | redux-saga |
|----------|-----------------|-----------|-----------|
| 模板代码 | 少 | 多 | 多 |
| 自动 pending/fulfilled/rejected | 是 | 否（手动 dispatch） | 否 |
| 请求取消 | 内置 AbortController | 手动实现 | 内置 cancel |
| 条件执行 | condition 参数 | 手动 getState 判断 | 手动逻辑 |
| 类型安全 | 泛型支持 | 手动定义 | 手动定义 |

### 适用场景

- **API 数据请求：** 标准的请求-加载-成功-失败流程
- **需要取消的请求：** 页面切换时取消未完成的请求
- **条件请求：** 根据当前状态决定是否发起请求

### 常见问题

#### 如何取消 createAsyncThunk 的请求

**解决方案：**

```typescript
// dispatch 返回一个 Promise，带有 abort 方法
const promise = dispatch(fetchUsers());

// 取消请求（比如组件卸载时）
promise.abort();

// 在异步回调中通过 signal 监听取消
const fetchUsers = createAsyncThunk("users/fetch", async (_, { signal }) => {
    const response = await fetch("/api/users", { signal });
    return response.json();
});

// 在 React 组件中：
// useEffect(() => {
//     const promise = dispatch(fetchUsers());
//     return () => promise.abort();  // 卸载时取消
// }, [dispatch]);
```

### 注意事项

- createAsyncThunk 自动管理 pending/fulfilled/rejected 三个状态
- 在 extraReducers 中用 builder.addCase 处理异步 action
- rejectWithValue 可以自定义错误信息的格式
- dispatch 返回的 Promise 有 abort() 方法用于取消
- signal 参数自动传入 AbortController 的信号
- condition 参数可以根据当前状态决定是否执行

### 总结

createAsyncThunk 简化了 Redux 异步操作：自动生成 pending/fulfilled/rejected 三个 action，在 extraReducers 中处理对应的状态变化。内置请求取消（AbortController）和条件执行。配合 createSlice 使用，大幅减少异步状态管理的模板代码。是 2026 年 Redux 异步操作的标准方案。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## RTK的immer不可变性简化

### 概念说明

Immer 是一个不可变数据的工具库，Redux Toolkit 内置了它。Immer 的核心思想是：你可以用"可变"的写法修改一个 draft（草稿）对象，Immer 在背后通过 Proxy 拦截所有的修改操作，最终生成一个全新的不可变对象。开发者写的代码看起来是直接修改 state，但实际上 state 本身没有被修改。

在传统 Redux 中，不可变更新需要大量的展开运算符（...），尤其是深层嵌套对象时代码非常繁琐且容易出错。Immer 让开发者用直观的赋值语法完成不可变更新，大幅降低了心智负担。Redux Toolkit 的 createSlice 和 createReducer 中的 reducer 函数默认用 Immer 包裹，无需手动引入。

### 基本示例

```typescript
// 示例说明：Immer 简化深层嵌套的不可变更新

import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface Address {
    city: string;
    street: string;
    zip: string;
}

interface UserProfile {
    name: string;
    age: number;
    address: Address;
    hobbies: string[];
    settings: {
        notifications: {
            email: boolean;
            push: boolean;
            sms: boolean;
        };
        theme: "light" | "dark";
    };
}

const initialState: UserProfile = {
    name: "张三",
    age: 25,
    address: { city: "北京", street: "长安街", zip: "100000" },
    hobbies: ["编程", "阅读"],
    settings: {
        notifications: { email: true, push: true, sms: false },
        theme: "light",
    },
};

const profileSlice = createSlice({
    name: "profile",
    initialState,
    reducers: {
        // Immer 写法：直接修改（看起来可变，实际不可变）
        updateCity(state, action: PayloadAction<string>) {
            // 直接赋值！Immer 处理不可变性
            state.address.city = action.payload;
        },

        // 传统写法（对比）需要逐层展开：
        // return {
        //     ...state,
        //     address: {
        //         ...state.address,
        //         city: action.payload,
        //     },
        // };

        toggleEmailNotification(state) {
            // 深层嵌套：直接修改
            state.settings.notifications.email = !state.settings.notifications.email;
        },

        addHobby(state, action: PayloadAction<string>) {
            // 数组 push：直接用
            state.hobbies.push(action.payload);
        },

        removeHobby(state, action: PayloadAction<number>) {
            // 数组 splice：直接用
            state.hobbies.splice(action.payload, 1);
        },

        // 整体替换：返回新对象（不能同时修改 state 又返回新值）
        resetProfile() {
            return initialState;
        },
    },
});

export const {
    updateCity,
    toggleEmailNotification,
    addHobby,
    removeHobby,
    resetProfile,
} = profileSlice.actions;

export default profileSlice.reducer;
```

### 内部原理

#### Immer 的 Proxy 机制

```javascript
// Immer 简化原理
import { produce } from "immer";

const baseState = {
    user: { name: "张三", address: { city: "北京" } },
    items: [1, 2, 3],
};

// produce 接收原始状态和一个修改函数
const nextState = produce(baseState, (draft) => {
    // draft 是 baseState 的 Proxy 代理
    // 所有对 draft 的修改被 Proxy 拦截记录
    draft.user.address.city = "上海";
    draft.items.push(4);
});

// 结果：
// nextState !== baseState              → 新对象
// nextState.user !== baseState.user    → 路径上的对象都是新的
// nextState.items !== baseState.items  → 数组也是新的
// baseState 完全未被修改              → 原始数据不变

// Proxy 拦截流程：
// 1. 读取 draft.user → 创建 user 的 Proxy
// 2. 读取 draft.user.address → 创建 address 的 Proxy
// 3. 设置 draft.user.address.city = "上海" → 记录修改
// 4. produce 结束 → 根据记录的修改生成新对象树
// 5. 只有修改路径上的对象被复制，其他保持原引用
```

### 与相关API的对比

| 操作 | 传统不可变写法 | Immer 写法 |
|------|-------------|-----------|
| 修改嵌套属性 | `{...state, a: {...state.a, b: 1&rbrace;&rbrace;` | `state.a.b = 1` |
| 数组添加 | `[...arr, item]` | `arr.push(item)` |
| 数组删除 | `arr.filter(x => x.id !== id)` | `arr.splice(idx, 1)` |
| 数组修改 | `arr.map(x => ...)` | `arr[idx].done = true` |
| 整体替换 | `return newState` | `return newState` |

### 适用场景

- **深层嵌套状态：** 嵌套3层以上的对象更新
- **复杂数组操作：** 需要 splice、sort 等原地修改方法
- **Redux Toolkit：** createSlice 中默认使用

### 常见问题

#### Immer 有性能开销吗

**解决方案：**

```
Immer 的性能开销：
  → Proxy 创建和拦截有一定开销
  → 对于小型状态更新，开销可以忽略
  → 对于超大状态树（数万个节点），可能有可感知的开销

优化措施：
  → Immer 只复制修改路径上的对象，未修改的保持原引用
  → 这意味着 React 组件可以通过引用比较跳过不必要的重渲染
  → 实际项目中 Immer 的开销远小于手写不可变更新出错的风险

结论：绝大部分项目不需要担心 Immer 的性能
```

### 注意事项

- createSlice 的 reducer 默认用 Immer 包裹
- 可以直接修改 state 或返回新值，但不能两者同时
- 未修改的部分保持原引用（有利于 React 的引用比较优化）
- Immer 基于 Proxy，不支持 IE11（但 2026 年已无需考虑）
- 在 createSlice 之外使用需手动引入 produce

### 总结

RTK 内置 Immer，让 reducer 中可以用"可变"语法完成不可变更新。Immer 通过 Proxy 拦截修改操作，自动生成新的不可变对象。相比传统的展开运算符写法，代码更简洁、更不容易出错，尤其在深层嵌套状态的场景。性能开销在实际项目中可以忽略。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Zustand的原子化状态管理

### 概念说明

Zustand 是一个轻量级的 React 状态管理库，由 Poimandres 团队（pmndrs）开发。它的核心理念是"简单"：用一个 `create` 函数创建 Store，不需要 Provider 包裹、不需要 Action/Reducer 分离、不需要 Context。Store 就是一个包含状态和操作方法的普通 JavaScript 对象。

Zustand 的"原子化"体现在：每个 Store 管理一小块独立的状态（而非 Redux 的单一状态树），组件通过选择器（selector）只订阅需要的部分状态。状态变化时只有订阅了变化部分的组件才会重新渲染。Zustand 的包体积约 1KB（gzip），API 极简，是 2026 年 React 社区最流行的客户端状态管理方案之一。

### 基本示例

```typescript
// 示例说明：Zustand 创建和使用 Store

import { create } from "zustand";

// 类型定义
interface CounterStore {
    count: number;
    name: string;
    // 操作方法直接定义在 Store 中
    increment: () => void;
    decrement: () => void;
    incrementBy: (amount: number) => void;
    setName: (name: string) => void;
    reset: () => void;
}

// 用 create 创建 Store（不需要 Provider）
const useCounterStore = create<CounterStore>((set, get) => ({
    // 状态
    count: 0,
    name: "计数器",

    // 操作方法
    increment: () => set((state) => ({ count: state.count + 1 })),
    decrement: () => set((state) => ({ count: state.count - 1 })),
    incrementBy: (amount) => set((state) => ({ count: state.count + amount })),
    setName: (name) => set({ name }),

    // get() 可以读取当前状态
    reset: () => {
        const currentName = get().name;
        console.log(`重置 ${currentName}`);
        set({ count: 0 });
    },
}));

// ===== 在 React 组件中使用 =====
import React from "react";

function Counter() {
    // 直接使用 Hook，不需要 Provider
    const count = useCounterStore((state) => state.count);
    const increment = useCounterStore((state) => state.increment);
    const decrement = useCounterStore((state) => state.decrement);

    return (
        <div>
            <p>计数: {count}</p>
            <button onClick={increment}>+1</button>
            <button onClick={decrement}>-1</button>
        </div>
    );
}

// 也可以在 React 外部使用（非组件代码）
// useCounterStore.getState().increment();
// useCounterStore.setState({ count: 100 });

export { useCounterStore };
export default Counter;
```

### 内部原理

#### Zustand 的订阅机制

```
Zustand 内部基于发布-订阅模式：

create(stateCreator) 做了什么：
  1. 调用 stateCreator 得到初始状态对象
  2. 创建一个内部的 listeners Set
  3. 返回一个 React Hook（useStore）

useStore(selector) 做了什么：
  1. 调用 selector(state) 得到选中的值
  2. 用 useSyncExternalStore 订阅状态变化
  3. 状态变化时，重新调用 selector
  4. 如果 selector 返回值变了 → 组件重新渲染
  5. 如果 selector 返回值没变 → 跳过渲染

set(partial) 做了什么：
  1. 合并 partial 到当前状态
  2. 通知所有 listeners
  3. 每个 listener（组件）判断自己订阅的值是否变化
```

### 与相关API的对比

| 对比维度 | Zustand | Redux Toolkit | Context API |
|----------|---------|--------------|-------------|
| 包大小 | ~1KB | ~11KB | 内置 |
| Provider | 不需要 | 需要 | 需要 |
| 模板代码 | 极少 | 中等 | 少 |
| DevTools | 支持（中间件） | 内置 | 无 |
| 学习曲线 | 低 | 中 | 低 |
| React 外使用 | 支持 | 支持 | 不支持 |
| 选择器优化 | 内置 | useSelector | 不支持（需拆分） |

### 适用场景

- **中小型应用：** 全局状态不太复杂的项目
- **需要简洁 API：** 团队偏好少模板代码
- **跨组件状态共享：** 替代 Context 避免性能问题
- **React 外访问：** 需要在非 React 代码中读写状态

### 常见问题

#### Zustand 需要 Provider 吗

**解决方案：**

```
默认不需要 Provider：
  Zustand Store 是模块级别的单例
  任何组件直接 import 使用即可

如果需要 Provider（如测试或多实例）：
  import { createStore, useStore } from "zustand";
  const store = createStore(...)
  // 通过 Context 传递 store 实例
```

### 注意事项

- Zustand Store 是模块级单例，不需要 Provider
- set 函数默认做浅合并（不是深合并）
- 选择器（selector）决定组件订阅哪部分状态
- 选择器返回新引用会导致重新渲染（注意对象/数组）
- 支持中间件：devtools、persist、immer 等
- 可以在 React 组件外通过 getState/setState 使用

### 总结

Zustand 是一个极简的 React 状态管理库（~1KB），用 create 函数创建 Store，不需要 Provider、不需要 Action/Reducer 分离。通过选择器订阅部分状态，只有订阅值变化的组件才重新渲染。支持 React 外使用、中间件扩展。是 2026 年 React 社区最流行的轻量级状态管理方案。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Zustand的选择器优化

### 概念说明

Zustand 的选择器（selector）是性能优化的关键。当组件通过 `useStore(selector)` 订阅状态时，selector 函数决定了组件"关心"哪部分状态。每次状态变化后，Zustand 会重新调用 selector，将新结果与上一次的结果进行比较（默认使用 `Object.is` 严格相等），只有结果变化时才触发组件重新渲染。

如果不使用选择器（直接 `useStore()` 获取整个 Store），任何状态变化都会导致组件重新渲染。如果选择器返回新的对象或数组引用（即使内容没变），也会触发不必要的重新渲染。合理使用选择器是 Zustand 性能优化的核心手段。

### 基本示例

```typescript
// 示例说明：Zustand 选择器的正确用法和优化技巧

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

interface AppStore {
    count: number;
    name: string;
    items: string[];
    increment: () => void;
    addItem: (item: string) => void;
    setName: (name: string) => void;
}

const useAppStore = create<AppStore>((set) => ({
    count: 0,
    name: "应用",
    items: [],
    increment: () => set((s) => ({ count: s.count + 1 })),
    addItem: (item) => set((s) => ({ items: [...s.items, item] })),
    setName: (name) => set({ name }),
}));

// ===== 选择器用法对比 =====

// 不推荐：获取整个 Store（任何状态变化都重新渲染）
function BadComponent() {
    const store = useAppStore();  // 订阅了所有状态
    return <p>{store.count}</p>;
    // count 变了 → 渲染（需要）
    // name 变了 → 也渲染（不需要）
    // items 变了 → 也渲染（不需要）
}

// 推荐：精确选择需要的状态
function GoodComponent() {
    const count = useAppStore((state) => state.count);  // 只订阅 count
    return <p>{count}</p>;
    // count 变了 → 渲染（需要）
    // name 变了 → 不渲染
    // items 变了 → 不渲染
}

// 需要多个值：使用 useShallow 做浅比较
function MultiValueComponent() {
    // useShallow 对返回的对象做浅比较
    // 只有 count 或 name 的值变化时才重新渲染
    const { count, name } = useAppStore(
        useShallow((state) => ({ count: state.count, name: state.name }))
    );

    return (
        <p>{name}: {count}</p>
    );
}

// 操作方法单独获取（方法引用不变，不触发重新渲染）
function ActionComponent() {
    const increment = useAppStore((state) => state.increment);
    // increment 函数的引用不会变，所以这个组件不会因状态变化而重新渲染
    return <button onClick={increment}>+1</button>;
}

export { GoodComponent, MultiValueComponent, ActionComponent };
```

### 内部原理

#### 选择器的比较机制

```
默认比较：Object.is（严格相等）

状态更新后的流程：
  1. set() 更新状态
  2. 通知所有订阅者
  3. 每个订阅者重新调用 selector(newState)
  4. 比较 selector 新结果与旧结果
     → Object.is(newResult, oldResult)
  5. 结果相同 → 跳过渲染
  6. 结果不同 → 触发重新渲染

问题场景：
  selector = (state) => ({ a: state.a, b: state.b })
  每次调用都返回新对象 → Object.is 总是 false
  → 每次状态变化都重新渲染（即使 a 和 b 没变）

解决方案：
  使用 useShallow 进行浅比较
  或者分开写多个 selector
```

### 与相关API的对比

| 选择器写法 | 比较方式 | 渲染行为 | 推荐程度 |
|-----------|---------|---------|---------|
| `useStore()` | 无（总是渲染） | 任何变化都渲染 | 不推荐 |
| `useStore(s => s.count)` | Object.is | 只在 count 变化时渲染 | 推荐 |
| `useStore(s => ({a: s.a, b: s.b}))` | Object.is（新对象） | 总是渲染 | 不推荐 |
| `useStore(useShallow(s => ({a, b})))` | 浅比较 | a 或 b 变化时渲染 | 推荐 |

### 适用场景

- **单值订阅：** 组件只需要一个状态值
- **多值订阅：** 组件需要多个状态值（用 useShallow）
- **操作方法：** 只获取操作函数不订阅状态
- **派生数据：** 在 selector 中计算派生值

### 常见问题

#### 在 selector 中计算派生数据

**解决方案：**

```typescript
// 在 selector 中计算派生数据
function TodoStats() {
    // 派生计算：只在 items 变化时重新计算
    const completedCount = useAppStore(
        (state) => state.items.filter(t => t.completed).length
    );

    // 注意：如果 selector 返回新数组/对象，需要 useShallow 或 memoize
    // 错误示例（每次返回新数组）：
    // const completed = useAppStore(s => s.items.filter(t => t.completed));

    // 正确：返回原始值（number/string/boolean）不需要额外处理
    return <p>已完成: {completedCount}</p>;
}
```

### 注意事项

- 尽量用精确的 selector 只订阅需要的状态
- 避免在 selector 中返回新对象/数组（会导致每次都渲染）
- 需要多个值时使用 useShallow 做浅比较
- 操作方法（函数）的引用不变，可以单独获取
- selector 中的派生计算应返回原始值类型

### 总结

Zustand 的选择器决定组件订阅哪部分状态，是性能优化的核心。默认用 Object.is 比较 selector 结果，原始值类型（number/string）直接有效。返回对象/数组时需要 useShallow 做浅比较。操作方法引用不变可以安全单独获取。合理使用选择器可以避免不必要的重新渲染。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Jotai的原子(Atom)状态

### 概念说明

Jotai 是一个基于原子（Atom）概念的 React 状态管理库，灵感来自 Recoil。它的核心思想是将状态拆分为最小的独立单元——原子（atom），每个 atom 持有一个值。组件通过 `useAtom` 订阅所需的 atom，只有订阅的 atom 值变化时组件才会重新渲染。这种自底向上的方式与 Redux 的自顶向下（单一状态树）相反。

Jotai 的 atom 分为两类：原始 atom（primitive atom，持有一个值）和派生 atom（derived atom，从其他 atom 计算得出）。派生 atom 类似于 Recoil 的 Selector，可以组合多个 atom 的值进行计算。Jotai 不需要定义 Store，atom 的状态存储在 React 的 Context 中（Provider），也可以使用默认的全局 Provider。Jotai 的包体积约 3KB（gzip），API 极简。

### 基本示例

```typescript
// 示例说明：Jotai atom 的创建和使用

import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";

// ===== 原始 Atom =====
// 创建一个持有数值的 atom
const countAtom = atom(0);

// 创建一个持有字符串的 atom
const nameAtom = atom("张三");

// ===== 派生 Atom（只读） =====
// 从其他 atom 计算得出的值
const doubleCountAtom = atom((get) => {
    // get 读取其他 atom 的值
    const count = get(countAtom);
    return count * 2;
    // 当 countAtom 变化时，doubleCountAtom 自动重新计算
});

// 组合多个 atom
const greetingAtom = atom((get) => {
    const name = get(nameAtom);
    const count = get(countAtom);
    return `${name} 的计数是 ${count}`;
});

// ===== 可写派生 Atom =====
// 既能读取又能写入的派生 atom
const countWithLogAtom = atom(
    // 读取函数
    (get) => get(countAtom),
    // 写入函数
    (get, set, newValue: number) => {
        console.log(`计数从 ${get(countAtom)} 变为 ${newValue}`);
        set(countAtom, newValue);  // 更新底层 atom
    }
);

// ===== 在组件中使用 =====
import React from "react";

function Counter() {
    // useAtom 返回 [value, setValue]，类似 useState
    const [count, setCount] = useAtom(countAtom);

    // useAtomValue 只读取值（不需要 setter 时用）
    const doubleCount = useAtomValue(doubleCountAtom);

    // useSetAtom 只获取 setter（不订阅值变化，不触发渲染）
    const setName = useSetAtom(nameAtom);

    return (
        <div>
            <p>计数: {count}</p>
            <p>双倍: {doubleCount}</p>
            <button onClick={() => setCount((c) => c + 1)}>+1</button>
            <button onClick={() => setName("李四")}>改名</button>
        </div>
    );
}

// 显示问候语的组件：只在 greetingAtom 变化时渲染
function Greeting() {
    const greeting = useAtomValue(greetingAtom);
    return <p>{greeting}</p>;
}

export default Counter;
```

### 内部原理

#### Atom 的依赖追踪

```
原始 atom：
  countAtom = atom(0)
  → 持有值 0
  → 被订阅时通知订阅者

派生 atom：
  doubleCountAtom = atom((get) => get(countAtom) * 2)
  → 调用 get(countAtom) 时建立依赖关系
  → countAtom 变化 → doubleCountAtom 重新计算
  → 只有结果变化时才通知订阅 doubleCountAtom 的组件

依赖图：
  countAtom ←── doubleCountAtom
  countAtom ←── greetingAtom
  nameAtom  ←── greetingAtom

  countAtom 变化 → doubleCountAtom 和 greetingAtom 都重新计算
  nameAtom 变化  → 只有 greetingAtom 重新计算
```

### 与相关API的对比

| 对比维度 | Jotai | Zustand | Redux Toolkit |
|----------|-------|---------|--------------|
| 状态模型 | 原子（自底向上） | Store（独立模块） | 单一状态树（自顶向下） |
| 派生状态 | 派生 atom | 选择器中计算 | createSelector |
| Provider | 可选 | 不需要 | 需要 |
| 包大小 | ~3KB | ~1KB | ~11KB |
| 适合场景 | 细粒度订阅 | 全局状态 | 复杂业务逻辑 |

### 适用场景

- **细粒度状态：** 状态之间有复杂的依赖和派生关系
- **表单状态：** 每个字段一个 atom，互不影响
- **组件级全局状态：** 多个组件共享少量状态
- **配合 Suspense：** 异步 atom 原生支持 Suspense

### 常见问题

#### Jotai 和 Zustand 怎么选

**解决方案：**

```
选 Jotai 的场景：
  → 状态之间有大量派生关系（atom 组合）
  → 需要细粒度的渲染控制（每个 atom 独立订阅）
  → 偏好类 useState 的 API 风格
  → 需要 Suspense 集成

选 Zustand 的场景：
  → 状态以 Store 为单位组织（用户、购物车等）
  → 需要在 React 外访问状态
  → 偏好极简 API 和最小包体积
  → 需要中间件（persist、devtools）

两者可以共存：
  → Jotai 管理细粒度的 UI 状态
  → Zustand 管理全局业务状态
```

### 注意事项

- atom() 创建的是状态的"配置"，不是值本身
- 派生 atom 通过 get() 自动追踪依赖
- useAtomValue 只读不写，useSetAtom 只写不读
- 默认使用全局 Provider，也可以用自定义 Provider 隔离
- 异步 atom 支持 Suspense（返回 Promise 的 atom）

### 总结

Jotai 基于原子模型管理状态：原始 atom 持有值，派生 atom 从其他 atom 计算得出。组件通过 useAtom/useAtomValue/useSetAtom 订阅所需的 atom，实现细粒度的渲染控制。派生 atom 自动追踪依赖，源 atom 变化时自动重新计算。Jotai 适合状态之间有复杂派生关系、需要细粒度订阅的场景。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Recoil的Atom与Selector

### 概念说明

Recoil 是 Meta（Facebook）推出的 React 状态管理库，它引入了两个核心概念：Atom 和 Selector。Atom 是状态的最小单元，持有一个可读写的值；Selector 是从 Atom 或其他 Selector 派生出的计算值，类似于 Vue 的 computed。Recoil 的设计与 React 的渲染模型紧密结合，支持并发模式和 Suspense。

Atom 和 Selector 共同构成一个有向无环图（DAG）：Atom 是图的叶节点（数据源），Selector 是中间节点（派生计算）。当 Atom 的值变化时，依赖它的 Selector 自动重新计算，订阅了变化的组件自动重新渲染。每个 Atom 需要一个全局唯一的 `key`，用于标识和序列化。

需要注意的是，Recoil 自 2023 年起维护频率明显降低，Meta 内部也在转向其他方案。2026 年新项目中更推荐使用 Jotai（API 类似但更活跃）或 Zustand。但 Recoil 的 Atom/Selector 模型仍然是面试中常考的知识点。

### 基本示例

```typescript
// 示例说明：Recoil Atom 和 Selector 的基本用法

import { atom, selector, useRecoilState, useRecoilValue, RecoilRoot } from "recoil";
import React from "react";

// ===== Atom：状态的最小单元 =====
// 每个 atom 需要全局唯一的 key
const todoListState = atom<Array<{ id: number; text: string; completed: boolean }>>({
    key: "todoListState",  // 全局唯一标识
    default: [             // 默认值
        { id: 1, text: "学习 Recoil", completed: false },
        { id: 2, text: "写文档", completed: true },
    ],
});

const filterState = atom<"all" | "active" | "completed">({
    key: "filterState",
    default: "all",
});

// ===== Selector：派生计算 =====
// 从 Atom 或其他 Selector 派生出值
const filteredTodoListState = selector({
    key: "filteredTodoListState",
    get: ({ get }) => {
        // get 读取其他 atom/selector 的值
        const filter = get(filterState);
        const list = get(todoListState);

        switch (filter) {
            case "active":
                return list.filter((item) => !item.completed);
            case "completed":
                return list.filter((item) => item.completed);
            default:
                return list;
        }
    },
});

// 统计信息 Selector
const todoStatsState = selector({
    key: "todoStatsState",
    get: ({ get }) => {
        const list = get(todoListState);
        const total = list.length;
        const completed = list.filter((t) => t.completed).length;
        const active = total - completed;
        const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

        return { total, completed, active, percent };
    },
});

// ===== 在组件中使用 =====
function TodoList() {
    // useRecoilState：读写 atom（类似 useState）
    const [todoList, setTodoList] = useRecoilState(todoListState);
    // useRecoilValue：只读 selector
    const filteredList = useRecoilValue(filteredTodoListState);
    const stats = useRecoilValue(todoStatsState);

    const addTodo = (text: string) => {
        setTodoList((prev) => [
            ...prev,
            { id: Date.now(), text, completed: false },
        ]);
    };

    return (
        <div>
            <p>总计: {stats.total} | 完成: {stats.completed} | 进度: {stats.percent}%</p>
            <ul>
                {filteredList.map((todo) => (
                    <li key={todo.id}>
                        {todo.text} {todo.completed ? "(已完成)" : ""}
                    </li>
                ))}
            </ul>
            <button onClick={() => addTodo("新任务")}>添加</button>
        </div>
    );
}

// 根组件需要 RecoilRoot 包裹
function App() {
    return (
        <RecoilRoot>
            <TodoList />
        </RecoilRoot>
    );
}

export default App;
```

### 内部原理

#### 依赖图与自动追踪

```
依赖关系图：

  todoListState (Atom)  ←── filteredTodoListState (Selector)
  filterState (Atom)    ←── filteredTodoListState (Selector)
  todoListState (Atom)  ←── todoStatsState (Selector)

当 todoListState 变化时：
  → filteredTodoListState 重新计算
  → todoStatsState 重新计算
  → 订阅了这些节点的组件重新渲染

当 filterState 变化时：
  → 只有 filteredTodoListState 重新计算
  → todoStatsState 不受影响
  → 只有订阅 filteredTodoListState 的组件重新渲染
```

### 与相关API的对比

| 对比维度 | Recoil Atom | Recoil Selector | Jotai atom | Jotai 派生 atom |
|----------|-----------|----------------|-----------|---------------|
| 唯一标识 | key（必须） | key（必须） | 不需要 | 不需要 |
| Provider | RecoilRoot | - | 可选 | - |
| 异步支持 | 不支持 | 支持（Suspense） | 支持 | 支持 |
| 维护状态 | 不活跃 | - | 活跃 | - |

### 适用场景

- **遗留项目：** 已经使用 Recoil 的项目维护
- **面试准备：** Atom/Selector 模型是常考知识点
- **复杂派生状态：** 多个状态之间有复杂的计算关系

### 常见问题

#### Recoil 还值得在新项目中使用吗

**解决方案：**

```
2026 年的现状：
  → Recoil 的 GitHub 活跃度明显下降
  → Meta 内部团队也在探索其他方案
  → npm 下载量被 Zustand 和 Jotai 大幅超越

建议：
  → 新项目：使用 Jotai（API 类似，更轻量，维护活跃）
  → 已有 Recoil 项目：继续使用或逐步迁移到 Jotai
  → 面试：仍需掌握 Atom/Selector 概念（高频考点）

迁移路径（Recoil → Jotai）：
  Recoil atom({ key, default }) → Jotai atom(default)
  Recoil selector({ key, get }) → Jotai atom((get) => ...)
  useRecoilState → useAtom
  useRecoilValue → useAtomValue
```

### 注意事项

- 每个 Atom 和 Selector 都需要全局唯一的 key
- 根组件必须用 RecoilRoot 包裹
- Selector 默认是只读的，也可以定义 set 使其可写
- 异步 Selector 返回 Promise 时自动配合 Suspense
- 2026 年新项目推荐 Jotai 而非 Recoil

### 总结

Recoil 的 Atom 是状态最小单元，Selector 是从 Atom 派生的计算值，共同构成依赖图。Atom 变化时依赖它的 Selector 自动重新计算。每个节点需要唯一 key，根组件需要 RecoilRoot 包裹。虽然 Recoil 在 2026 年维护不再活跃，但 Atom/Selector 模型仍是面试常考知识点。新项目建议使用 Jotai 作为替代。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## React Query的服务器状态缓存

### 概念说明

React Query（现已更名为 TanStack Query）是一个专门管理"服务器状态"（Server State）的库。它的核心理念是：服务器数据和客户端 UI 状态是两种本质不同的东西，应该用不同的工具管理。服务器状态有三个特点：存储在远端（数据库/API）、需要异步获取、可能被其他用户修改（数据可能过期）。

React Query 围绕"缓存"构建了完整的数据获取方案：每次请求的结果以 `queryKey` 为标识存入缓存。后续相同 queryKey 的请求会先返回缓存数据（瞬间展示 UI），同时在后台重新获取最新数据（background refetch）。缓存有两个关键时间参数：`staleTime`（数据从"新鲜"变为"陈旧"的时间）和 `gcTime`（原名 cacheTime，缓存被垃圾回收的时间）。

### 基本示例

```typescript
// 示例说明：React Query 基本的数据获取与缓存

import {
    QueryClient,
    QueryClientProvider,
    useQuery,
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";
import React from "react";

// 创建 QueryClient 实例（管理所有查询的缓存）
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,  // 数据5分钟内视为"新鲜"
            gcTime: 30 * 60 * 1000,    // 缓存30分钟后被回收
        },
    },
});

// API 请求函数
async function fetchUsers(): Promise<Array<{ id: number; name: string }>> {
    const response = await fetch("https://jsonplaceholder.typicode.com/users");
    if (!response.ok) throw new Error("请求失败");
    return response.json();
}

async function createUser(name: string) {
    const response = await fetch("https://jsonplaceholder.typicode.com/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
    });
    return response.json();
}

// 用户列表组件
function UserList() {
    // useQuery：声明式数据获取
    const {
        data: users,     // 缓存的数据（或最新数据）
        isLoading,       // 首次加载中（无缓存）
        isFetching,      // 正在获取数据（包括后台刷新）
        isError,         // 是否出错
        error,           // 错误对象
        refetch,         // 手动触发重新获取
    } = useQuery({
        queryKey: ["users"],  // 缓存的标识（数组格式）
        queryFn: fetchUsers,  // 获取数据的函数
    });

    // useQueryClient：获取 queryClient 实例
    const queryClient = useQueryClient();

    // useMutation：处理数据变更（POST/PUT/DELETE）
    const mutation = useMutation({
        mutationFn: createUser,
        onSuccess: () => {
            // 变更成功后，使 users 缓存失效 → 自动重新获取
            queryClient.invalidateQueries({ queryKey: ["users"] });
        },
    });

    if (isLoading) return <p>首次加载中...</p>;
    if (isError) return <p>错误: {(error as Error).message}</p>;

    return (
        <div>
            {isFetching && <p>后台刷新中...</p>}
            <ul>
                {users?.map((user) => (
                    <li key={user.id}>{user.name}</li>
                ))}
            </ul>
            <button onClick={() => mutation.mutate("新用户")}>添加用户</button>
            <button onClick={() => refetch()}>手动刷新</button>
        </div>
    );
}

// 根组件
function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <UserList />
        </QueryClientProvider>
    );
}

export default App;
```

### 内部原理

#### 缓存机制流程

```
首次请求 queryKey=["users"]：
  1. 缓存中无数据 → isLoading = true
  2. 调用 queryFn 获取数据
  3. 数据返回 → 存入缓存 → isLoading = false
  4. 数据状态标记为 "fresh"（新鲜）

再次访问（staleTime 内）：
  1. 缓存中有数据且状态为 "fresh"
  2. 直接返回缓存数据
  3. 不发起网络请求

再次访问（staleTime 后）：
  1. 缓存中有数据但状态为 "stale"（陈旧）
  2. 立即返回缓存数据（UI 瞬间展示）
  3. 同时在后台发起新请求（background refetch）
  4. 新数据返回 → 更新缓存 → UI 无缝更新

组件卸载后（gcTime 内）：
  缓存保留，再次挂载时可直接使用

组件卸载后（gcTime 后）：
  缓存被垃圾回收
```

### 与相关API的对比

| 对比维度 | React Query | Redux + thunk | SWR |
|----------|-----------|--------------|-----|
| 定位 | 服务器状态 | 所有状态 | 服务器状态 |
| 缓存 | 自动管理 | 手动管理 | 自动管理 |
| 后台刷新 | 内置 | 手动实现 | 内置 |
| 乐观更新 | 内置支持 | 手动实现 | 部分支持 |
| DevTools | 内置 | Redux DevTools | 无官方 |
| 分页/无限滚动 | 内置 | 手动实现 | 部分支持 |

### 适用场景

- **数据驱动应用：** 页面数据主要来自 API
- **列表/详情页：** 列表缓存、详情缓存、翻页
- **实时数据：** 需要定期后台刷新的数据
- **表单提交：** 提交后自动刷新相关数据

### 常见问题

#### queryKey 的设计原则

**解决方案：**

```typescript
// queryKey 是缓存的标识，决定了数据是否复用

// 列表
useQuery({ queryKey: ["users"], queryFn: fetchUsers });

// 带筛选的列表（不同筛选条件缓存独立）
useQuery({ queryKey: ["users", { role: "admin" }], queryFn: () => fetchUsers({ role: "admin" }) });

// 单个详情（不同 id 缓存独立）
useQuery({ queryKey: ["users", userId], queryFn: () => fetchUser(userId) });

// 规则：
// → queryKey 中包含所有影响请求结果的参数
// → 参数变化 → queryKey 变化 → 自动发起新请求
// → 相同 queryKey → 复用缓存
```

### 注意事项

- queryKey 是数组格式，决定缓存的唯一标识
- staleTime 默认为 0（数据立即变为陈旧，每次都后台刷新）
- gcTime 默认为 5 分钟（组件卸载后缓存保留 5 分钟）
- invalidateQueries 使缓存失效并触发重新获取
- React Query 管理服务器状态，客户端 UI 状态仍用 useState/Zustand 等
- 根组件需要 QueryClientProvider 包裹

### 总结

React Query（TanStack Query）专门管理服务器状态，围绕缓存构建了完整的数据获取方案。通过 queryKey 标识缓存，staleTime 和 gcTime 控制缓存策略。"先展示缓存、后台刷新"的模式让用户体验流畅。配合 invalidateQueries 和 useMutation 处理数据变更。2026 年是 React 生态中管理服务器状态的标准方案。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## React Query的staleTime与cacheTime

### 概念说明

React Query 的缓存策略由两个核心时间参数控制：`staleTime` 和 `gcTime`（v5 之前叫 `cacheTime`，v5 重命名为 `gcTime`）。理解这两个参数是掌握 React Query 缓存行为的关键。

**staleTime**（陈旧时间）：数据从"新鲜"（fresh）变为"陈旧"（stale）的时间。在 staleTime 内，React Query 认为缓存数据是最新的，不会触发后台重新获取。staleTime 过后，数据标记为 stale，下次组件挂载或窗口聚焦时会触发后台刷新。默认值是 0，意味着数据获取后立即变为 stale。

**gcTime**（垃圾回收时间）：当没有任何组件订阅某个查询时（所有使用该 queryKey 的组件都卸载了），缓存数据还能保留多久。gcTime 到期后缓存被清除，下次使用需要重新请求。默认值是 5 分钟。

### 基本示例

```typescript
// 示例说明：staleTime 和 gcTime 的配置与效果

import { useQuery, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// 全局配置
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5,   // 全局默认：5分钟内数据视为新鲜
            gcTime: 1000 * 60 * 30,     // 全局默认：缓存保留30分钟
        },
    },
});

// 请求函数
async function fetchUserProfile(userId: number) {
    console.log(`发起请求: /api/users/${userId}`);
    const res = await fetch(`https://jsonplaceholder.typicode.com/users/${userId}`);
    return res.json();
}

// 场景1：频繁变化的数据（短 staleTime）
function StockPrice() {
    const { data } = useQuery({
        queryKey: ["stock", "AAPL"],
        queryFn: () => fetch("/api/stock/AAPL").then(r => r.json()),
        staleTime: 1000 * 10,     // 10秒后变陈旧（频繁刷新）
        gcTime: 1000 * 60,        // 组件卸载后缓存保留1分钟
        refetchInterval: 1000 * 30, // 每30秒自动刷新
    });

    return <p>股价: {data?.price}</p>;
}

// 场景2：很少变化的数据（长 staleTime）
function UserProfile({ userId }: { userId: number }) {
    const { data, isLoading, isFetching } = useQuery({
        queryKey: ["user", userId],
        queryFn: () => fetchUserProfile(userId),
        staleTime: 1000 * 60 * 30,  // 30分钟内视为新鲜（用户信息很少变化）
        gcTime: 1000 * 60 * 60,     // 缓存保留1小时
    });

    return (
        <div>
            {isLoading && <p>加载中...</p>}
            {isFetching && !isLoading && <p>后台刷新中...</p>}
            {data && <p>用户: {data.name}</p>}
        </div>
    );
}

// 场景3：不变的数据（Infinity staleTime）
function AppConfig() {
    const { data } = useQuery({
        queryKey: ["config"],
        queryFn: () => fetch("/api/config").then(r => r.json()),
        staleTime: Infinity,  // 永不过期（只请求一次）
        gcTime: Infinity,     // 永不清除缓存
    });

    return <p>版本: {data?.version}</p>;
}

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <UserProfile userId={1} />
            <StockPrice />
            <AppConfig />
        </QueryClientProvider>
    );
}

export default App;
```

### 内部原理

#### 两个时间参数的生命周期

```
时间线：

  ─────────────────────────────────────────────────→ 时间
  │                │                    │
  数据获取成功      staleTime 到期       gcTime 到期
  │                │                    │（需所有组件卸载）
  │                │                    │
  ├── fresh ──────→├── stale ──────────→├── 缓存清除
  │                │                    │
  │ 不触发后台刷新  │ 触发后台刷新        │ 重新请求
  │ 直接用缓存     │ 先用缓存再更新       │ 显示 loading

  具体行为：

  fresh 阶段（0 ~ staleTime）：
    → 组件挂载：直接返回缓存，不请求
    → 窗口聚焦：不请求
    → 网络恢复：不请求

  stale 阶段（staleTime ~ 无限）：
    → 组件挂载：返回缓存 + 后台请求
    → 窗口聚焦：后台请求（refetchOnWindowFocus 默认开启）
    → 网络恢复：后台请求（refetchOnReconnect 默认开启）

  inactive 阶段（所有组件卸载后）：
    → 0 ~ gcTime：缓存保留
    → gcTime 后：缓存清除
```

### 与相关API的对比

| 参数 | 含义 | 默认值 | 影响 |
|------|------|--------|------|
| staleTime | 数据新鲜→陈旧的时间 | 0 | 控制何时触发后台刷新 |
| gcTime | 缓存保留时间（无订阅后） | 5分钟 | 控制缓存何时被清除 |
| refetchInterval | 自动轮询间隔 | 无 | 定时后台刷新 |
| refetchOnWindowFocus | 窗口聚焦时刷新 | true | stale 时触发 |
| refetchOnReconnect | 网络恢复时刷新 | true | stale 时触发 |

### 适用场景

- **staleTime: 0（默认）：** 数据变化频繁，每次都需要验证
- **staleTime: 几分钟：** 数据变化不频繁（用户信息、配置）
- **staleTime: Infinity：** 数据不会变化（静态配置、枚举值）
- **gcTime 长：** 用户可能频繁切换页面（保留缓存避免重复请求）
- **gcTime 短：** 内存敏感或数据量大

### 常见问题

#### staleTime 和 gcTime 的关系

**解决方案：**

```
常见误区：gcTime 设为 0 会立即清除缓存

正确理解：
  gcTime 的计时从"最后一个订阅者卸载"开始
  如果有组件在使用（订阅中），gcTime 不生效

  staleTime 和 gcTime 的关系：
  → staleTime 控制"是否需要后台刷新"
  → gcTime 控制"缓存是否保留"
  → 两者独立，没有先后依赖

  推荐：gcTime >= staleTime
  → 否则数据还没变 stale 就被清除了
  → 组件重新挂载时需要重新请求（失去了缓存的意义）
```

### 注意事项

- v5 中 cacheTime 已重命名为 gcTime
- staleTime 默认 0：数据获取后立即变为 stale
- gcTime 默认 5 分钟：组件卸载后缓存保留 5 分钟
- staleTime: Infinity 表示数据永不过期（只请求一次）
- gcTime 的计时从最后一个订阅者卸载开始
- 建议 gcTime >= staleTime

### 总结

staleTime 控制数据从"新鲜"变为"陈旧"的时间，决定是否触发后台刷新；gcTime 控制无订阅者后缓存保留的时间。staleTime 默认 0（立即陈旧），gcTime 默认 5 分钟。根据数据的变化频率设置合适的 staleTime：频繁变化用短值，很少变化用长值，不变的用 Infinity。v5 中 cacheTime 已更名为 gcTime。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## React Query的背景更新与重新获取

### 概念说明

React Query 的"背景更新"（Background Refetch）是其核心用户体验优势：当缓存数据标记为 stale（陈旧）后，React Query 在特定时机会自动在后台发起新请求，同时让 UI 继续展示旧的缓存数据。新数据返回后无缝替换旧数据，用户看到的是"即时展示 + 自动更新"的流畅体验，而不是"加载中..."的空白状态。

背景更新的触发时机有多种：组件挂载（mount）、窗口获得焦点（window focus）、网络恢复（reconnect）、定时轮询（refetchInterval）。这些行为都可以通过配置项控制开关。此外，开发者也可以通过 `invalidateQueries` 手动使缓存失效触发重新获取，或者通过 `refetch` 函数主动触发。

### 基本示例

```typescript
// 示例说明：背景更新的各种触发方式和配置

import { useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";

async function fetchNotifications() {
    const res = await fetch("/api/notifications");
    return res.json();
}

function NotificationPanel() {
    const queryClient = useQueryClient();

    const {
        data: notifications,
        isLoading,     // 首次加载（无缓存时为 true）
        isFetching,    // 任何请求进行中为 true（包括后台刷新）
        isRefetching,  // 后台刷新时为 true（有缓存 + 正在请求）
        dataUpdatedAt, // 数据最后更新的时间戳
        refetch,       // 手动触发重新获取
    } = useQuery({
        queryKey: ["notifications"],
        queryFn: fetchNotifications,

        // 背景更新的配置项
        staleTime: 1000 * 30,           // 30秒内视为新鲜（不触发后台刷新）
        refetchOnMount: true,           // 组件挂载时：如果 stale 就后台刷新（默认 true）
        refetchOnWindowFocus: true,     // 窗口聚焦时：如果 stale 就后台刷新（默认 true）
        refetchOnReconnect: true,       // 网络恢复时：如果 stale 就后台刷新（默认 true）
        refetchInterval: 1000 * 60,     // 每60秒自动后台刷新（轮询）
        refetchIntervalInBackground: false, // 页面不可见时不轮询（默认 false）
    });

    // 手动使缓存失效（触发重新获取）
    const handleMarkAllRead = async () => {
        await fetch("/api/notifications/read-all", { method: "POST" });
        // 使 notifications 缓存失效 → 自动触发重新获取
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };

    return (
        <div>
            {/* 区分首次加载和后台刷新 */}
            {isLoading && <p>加载通知...</p>}
            {isRefetching && <span style={{ fontSize: 12, color: "#999" }}>刷新中...</span>}

            {/* 展示最后更新时间 */}
            <p style={{ fontSize: 12 }}>
                最后更新: {new Date(dataUpdatedAt).toLocaleTimeString()}
            </p>

            <ul>
                {notifications?.map((n: any) => (
                    <li key={n.id}>{n.message}</li>
                ))}
            </ul>

            <button onClick={() => refetch()}>手动刷新</button>
            <button onClick={handleMarkAllRead}>全部已读</button>
        </div>
    );
}

export default NotificationPanel;
```

### 内部原理

#### 背景更新的触发机制

```
触发后台刷新的条件：
  1. 数据必须是 stale 状态（staleTime 已过期）
  2. 触发事件发生（mount/focus/reconnect/interval）

各触发方式的行为：

refetchOnMount：
  组件挂载时检查缓存
  → fresh：直接用缓存，不请求
  → stale：返回缓存 + 后台请求
  → 设为 "always"：无论 fresh/stale 都请求

refetchOnWindowFocus：
  用户切换回浏览器标签页时
  → stale：后台刷新
  → 用途：用户离开页面后数据可能已变化

refetchOnReconnect：
  网络从离线恢复在线时
  → stale：后台刷新
  → 用途：离线期间数据可能已变化

refetchInterval：
  定时器触发
  → 不检查 stale 状态，按固定间隔请求
  → 用途：实时数据（股价、消息通知）
```

### 与相关API的对比

| 触发方式 | 默认值 | 检查 stale | 使用场景 |
|---------|--------|-----------|---------|
| refetchOnMount | true | 是 | 组件重新挂载时更新 |
| refetchOnWindowFocus | true | 是 | 用户切回标签页 |
| refetchOnReconnect | true | 是 | 网络恢复 |
| refetchInterval | false | 否 | 轮询实时数据 |
| invalidateQueries | 手动 | 否（强制） | 数据变更后 |
| refetch() | 手动 | 否（强制） | 用户手动刷新 |

### 适用场景

- **通知面板：** 定时轮询 + 窗口聚焦刷新
- **数据列表：** 提交表单后 invalidateQueries 刷新列表
- **仪表盘：** refetchInterval 实时更新数据
- **离线恢复：** 网络恢复后自动同步最新数据

### 常见问题

#### isLoading 和 isFetching 的区别

**解决方案：**

```
isLoading：
  → 缓存中没有数据 且 正在请求
  → 只在首次加载时为 true
  → 用于展示"加载中..."骨架屏

isFetching：
  → 正在发起任何请求（包括后台刷新）
  → 首次加载和后台刷新都为 true
  → 用于展示"刷新中..."的小图标

isRefetching：
  → 有缓存数据 且 正在后台请求
  → 等于 isFetching && !isLoading
  → 用于展示"后台更新中"

UI 策略：
  isLoading → 骨架屏或 Spinner
  isRefetching → 角落小图标或文字提示
  都为 false → 展示数据
```

### 注意事项

- 背景更新只在数据 stale 时触发（refetchInterval 除外）
- refetchOnWindowFocus 默认开启，频繁切换标签页可能产生大量请求
- refetchInterval 不受 staleTime 影响，按固定间隔执行
- invalidateQueries 立即标记为 stale 并触发重新获取
- isLoading 只在首次加载时为 true，后台刷新时为 false
- 页面不可见时默认不轮询（refetchIntervalInBackground 为 false）

### 总结

React Query 的背景更新在数据 stale 后的多种时机自动触发：组件挂载、窗口聚焦、网络恢复、定时轮询。UI 先展示缓存数据，新数据返回后无缝替换。通过 isLoading 区分首次加载和 isFetching/isRefetching 区分后台刷新，提供细腻的加载状态控制。invalidateQueries 和 refetch 用于手动触发更新。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Context API的状态共享与性能问题

### 概念说明

React Context API 是 React 内置的跨组件状态共享机制，通过 `createContext` 创建上下文、`Provider` 提供值、`useContext` 消费值，实现跨层级的数据传递而不需要逐层传递 props（即解决"prop drilling"问题）。

Context 的最大优势是零依赖——不需要安装任何第三方库。但 Context 有一个根本性的性能问题：**当 Provider 的 value 变化时，所有消费该 Context 的组件都会重新渲染，无论组件是否使用了变化的那部分数据。** Context 没有选择器（selector）机制，不能让组件只订阅 value 中的某个字段。这导致在大型应用中使用单个 Context 存储大量状态时，会引发严重的性能问题。

### 基本示例

```tsx
// 示例说明：Context 的基本用法和性能问题演示

import React, { createContext, useContext, useState, useRef } from "react";

// ===== 创建 Context =====
interface AppContextValue {
    user: { name: string; age: number };
    theme: "light" | "dark";
    setUser: (user: { name: string; age: number }) => void;
    toggleTheme: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

// ===== Provider 组件 =====
function AppProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState({ name: "张三", age: 25 });
    const [theme, setTheme] = useState<"light" | "dark">("light");

    const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

    // 注意：每次 AppProvider 渲染时，value 都是新对象
    // → 导致所有消费者都重新渲染
    const value: AppContextValue = {
        user,
        theme,
        setUser,
        toggleTheme,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ===== 消费 Context 的组件 =====

// 只用了 theme，但 user 变化时也会重新渲染
function ThemeDisplay() {
    const ctx = useContext(AppContext)!;
    const renderCount = useRef(0);
    renderCount.current++;
    console.log(`ThemeDisplay 渲染次数: ${renderCount.current}`);

    return <p>当前主题: {ctx.theme}</p>;
    // 问题：setUser 更新 user 时，ThemeDisplay 也重新渲染
    // 因为 Context value 整体变化了
}

// 只用了 user，但 theme 变化时也会重新渲染
function UserDisplay() {
    const ctx = useContext(AppContext)!;
    const renderCount = useRef(0);
    renderCount.current++;
    console.log(`UserDisplay 渲染次数: ${renderCount.current}`);

    return <p>用户: {ctx.user.name}, {ctx.user.age}岁</p>;
    // 问题：toggleTheme 时，UserDisplay 也重新渲染
}

function App() {
    return (
        <AppProvider>
            <ThemeDisplay />
            <UserDisplay />
            <button onClick={() => {
                // 触发 user 更新 → ThemeDisplay 也重新渲染（不必要）
            }}>
                修改用户
            </button>
        </AppProvider>
    );
}

export default App;
```

### 内部原理

#### Context 触发渲染的机制

```
Context 的更新流程：

  1. Provider 的 value 属性变化（Object.is 比较）
  2. React 遍历所有消费该 Context 的组件
  3. 所有消费者组件标记为需要更新
  4. 消费者组件重新渲染

关键问题：
  → Context 没有选择器机制
  → 无法让组件只订阅 value 的一部分
  → value 中任何字段变化 → 所有消费者都渲染

  举例：
    value = { user, theme }
    user 变了 → value 是新对象 → 所有消费者渲染
    theme 变了 → value 是新对象 → 所有消费者渲染

  React.memo 也无法阻止：
    → useContext 绕过了 React.memo 的 props 比较
    → Context 变化时 React.memo 包裹的组件仍然会渲染
```

### 与相关API的对比

| 对比维度 | Context API | Zustand | Redux |
|----------|-----------|---------|-------|
| 选择器 | 无 | 有（精确订阅） | useSelector |
| 渲染控制 | 所有消费者渲染 | 只渲染变化部分 | 只渲染变化部分 |
| 使用成本 | 零（内置） | npm 安装 | npm 安装 |
| 适合场景 | 低频变化数据 | 频繁变化数据 | 复杂业务逻辑 |
| Provider 嵌套 | 多 Context → 嵌套地狱 | 不需要 Provider | 一个 Provider |

### 适用场景

- **低频变化数据：** 主题、语言、认证状态等很少变化的全局配置
- **小型应用：** 状态不复杂、组件树不深的简单应用
- **依赖注入：** 传递服务实例、配置对象等不变的引用
- **组件库内部：** 组件库内部的配置传递（如 Ant Design 的 ConfigProvider）

### 常见问题

#### 为什么 React.memo 无法阻止 Context 触发的渲染

**解决方案：**

```tsx
// React.memo 只比较 props，不比较 Context

// 即使用 React.memo 包裹，Context 变化时仍然渲染
const MemoizedThemeDisplay = React.memo(function ThemeDisplay() {
    const ctx = useContext(AppContext)!;
    return <p>{ctx.theme}</p>;
    // Context 变化 → 绕过 React.memo → 仍然渲染
});

// 解决方案：拆分 Context 或使用状态管理库
// 详见下一篇文档 6.9.20
```

### 注意事项

- Context value 变化会触发所有消费者重新渲染
- React.memo 无法阻止 Context 引起的渲染
- 不要在一个 Context 中存放大量频繁变化的数据
- Provider 的 value 尽量用 useMemo 缓存（减少不必要的引用变化）
- 适合低频变化的全局配置，不适合高频更新的业务状态
- 多个 Context 会导致 Provider 嵌套层级过深

### 总结

Context API 是 React 内置的跨组件状态共享机制，解决了 prop drilling 问题。但它有根本性的性能问题：value 变化时所有消费者都重新渲染，没有选择器机制，React.memo 也无法阻止。因此 Context 适合低频变化的全局数据（主题、语言、认证），不适合频繁更新的业务状态。高频更新场景应使用 Zustand、Redux 等有选择器机制的方案。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Context API的拆分与React.memo优化

### 概念说明

上一节提到 Context 的性能问题：value 变化时所有消费者都重新渲染。解决这个问题的核心策略是**拆分 Context**——将不同频率变化的数据放到不同的 Context 中，让消费者只订阅自己需要的 Context。配合 `useMemo` 缓存 Provider 的 value 和组件结构优化，可以将 Context 的性能问题控制在可接受的范围内。

拆分策略有几种常见模式：按数据和操作拆分（状态 Context + dispatch Context）、按领域拆分（主题 Context + 用户 Context + 语言 Context）、按变化频率拆分（高频变化和低频变化分开）。此外，将 Context 消费者组件的子组件用 React.memo 包裹，也能减少不必要的级联渲染。

### 基本示例

```tsx
// 示例说明：Context 拆分优化策略

import React, { createContext, useContext, useState, useMemo, useCallback } from "react";

// ===== 策略1：按领域拆分 Context =====

// 主题 Context（变化频率低）
interface ThemeContextValue {
    theme: "light" | "dark";
    toggleTheme: () => void;
}
const ThemeContext = createContext<ThemeContextValue | null>(null);

// 用户 Context（变化频率低）
interface UserContextValue {
    user: { name: string; age: number };
    setUser: (user: { name: string; age: number }) => void;
}
const UserContext = createContext<UserContextValue | null>(null);

// 各自独立的 Provider
function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<"light" | "dark">("light");
    const toggleTheme = useCallback(() => {
        setTheme((t) => (t === "light" ? "dark" : "light"));
    }, []);

    // useMemo 缓存 value，避免 Provider 重新渲染时创建新对象
    const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function UserProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState({ name: "张三", age: 25 });

    const value = useMemo(() => ({ user, setUser }), [user]);

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

// 消费组件：只订阅需要的 Context
function ThemeDisplay() {
    const { theme } = useContext(ThemeContext)!;
    console.log("ThemeDisplay 渲染");
    return <p>主题: {theme}</p>;
    // user 变化 → ThemeContext 没变 → 不渲染
}

function UserDisplay() {
    const { user } = useContext(UserContext)!;
    console.log("UserDisplay 渲染");
    return <p>用户: {user.name}</p>;
    // theme 变化 → UserContext 没变 → 不渲染
}

// ===== 策略2：状态与操作拆分 =====

// 状态 Context（频繁变化）
const CountStateContext = createContext(0);

// 操作 Context（引用不变）
const CountDispatchContext = createContext<{
    increment: () => void;
    decrement: () => void;
} | null>(null);

function CountProvider({ children }: { children: React.ReactNode }) {
    const [count, setCount] = useState(0);

    // 操作函数用 useMemo 缓存，引用不变
    const dispatch = useMemo(() => ({
        increment: () => setCount((c) => c + 1),
        decrement: () => setCount((c) => c - 1),
    }), []);

    return (
        <CountStateContext.Provider value={count}>
            <CountDispatchContext.Provider value={dispatch}>
                {children}
            </CountDispatchContext.Provider>
        </CountStateContext.Provider>
    );
}

// 只需要操作的组件：不订阅状态 Context → count 变化时不渲染
function CountButtons() {
    const dispatch = useContext(CountDispatchContext)!;
    console.log("CountButtons 渲染");  // 只渲染一次
    return (
        <div>
            <button onClick={dispatch.increment}>+1</button>
            <button onClick={dispatch.decrement}>-1</button>
        </div>
    );
}

// 需要展示值的组件：订阅状态 Context
function CountDisplay() {
    const count = useContext(CountStateContext);
    console.log("CountDisplay 渲染");  // count 变化时渲染
    return <p>计数: {count}</p>;
}

// ===== 组合使用 =====
function App() {
    return (
        <ThemeProvider>
            <UserProvider>
                <CountProvider>
                    <ThemeDisplay />
                    <UserDisplay />
                    <CountDisplay />
                    <CountButtons />
                </CountProvider>
            </UserProvider>
        </ThemeProvider>
    );
}

export default App;
```

### 内部原理

#### React.memo 与 Context 的配合

```tsx
// React.memo 不能阻止 useContext 引起的渲染
// 但可以阻止"非 Context 引起的"从父组件传递下来的渲染

// 示例：children 模式减少渲染

function CountProvider({ children }: { children: React.ReactNode }) {
    const [count, setCount] = useState(0);
    // children 是外部传入的，不随 count 变化重新创建
    return (
        <CountStateContext.Provider value={count}>
            {children}
            {/* children 中的组件不会因 count 变化而渲染 */}
            {/* 除非它们自己 useContext 了 CountStateContext */}
        </CountStateContext.Provider>
    );
}

// 使用方式：
// <CountProvider>
//     <SomeChild />   ← 不消费 Context，不受 count 影响
// </CountProvider>
```

### 与相关API的对比

| 优化策略 | 效果 | 复杂度 | 适用场景 |
|---------|------|--------|---------|
| 按领域拆分 Context | 消除跨领域的无关渲染 | 中 | 多个独立的全局状态 |
| 状态/操作拆分 | 操作组件不订阅状态 | 中 | 有大量操作按钮的场景 |
| useMemo 缓存 value | 减少引用变化 | 低 | 所有 Context Provider |
| children 模式 | 子组件不受 Provider 状态影响 | 低 | Provider 自身有状态时 |
| 换用 Zustand/Jotai | 根本解决选择器问题 | 低 | 高频更新场景 |

### 适用场景

- **全局配置：** 主题、语言、认证拆分为独立 Context
- **表单 Context：** 状态和 dispatch 分离
- **组件库：** 内部 Context 拆分避免消费者性能问题
- **中型应用：** 不想引入第三方库的简单全局状态

### 常见问题

#### Provider 嵌套太多怎么办

**解决方案：**

```tsx
// 问题：多个 Provider 嵌套层级很深
// <ThemeProvider>
//   <UserProvider>
//     <LanguageProvider>
//       <AuthProvider>
//         <App />
//       </AuthProvider>
//     </LanguageProvider>
//   </UserProvider>
// </ThemeProvider>

// 解决方案：compose 函数合并 Provider
function ComposeProviders({
    providers,
    children,
}: {
    providers: Array<React.FC<{ children: React.ReactNode }>>;
    children: React.ReactNode;
}) {
    return providers.reduceRight(
        (child, Provider) => <Provider>{child}</Provider>,
        children
    );
}

// 使用：
// <ComposeProviders providers={[ThemeProvider, UserProvider, LanguageProvider, AuthProvider]}>
//     <App />
// </ComposeProviders>
```

### 注意事项

- 拆分 Context 是解决性能问题的核心策略
- Provider 的 value 必须用 useMemo 缓存
- 操作函数（dispatch）和状态分离，操作函数引用不变
- children 模式可以避免 Provider 状态变化导致子组件渲染
- React.memo 不能阻止 useContext 引起的渲染，但能阻止 props 不变的传递渲染
- 如果拆分后仍有性能问题，建议使用 Zustand 或 Jotai 替代

### 总结

Context 的性能优化核心是拆分：按领域拆分让消费者只订阅需要的数据，按状态/操作拆分让操作组件不订阅状态变化。配合 useMemo 缓存 value、children 模式减少级联渲染。当拆分优化仍不能满足需求时，建议使用有选择器机制的状态管理库（Zustand、Jotai）替代 Context。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。



## 6.10 Next.js与SSR架构

## SSR的服务端渲染与hydration

### 概念说明

SSR（Server-Side Rendering，服务端渲染）是指在服务器端将 React 组件渲染为 HTML 字符串，发送给浏览器后直接展示。用户看到的是完整的页面内容，而不是一个空白的 HTML 加上"加载中..."。之后浏览器下载 JavaScript 代码，执行 **hydration**（注水/水合）过程——将事件监听器绑定到已有的 HTML 上，让页面变得可交互。

hydration 是 SSR 的关键步骤：服务器返回的 HTML 只有结构和内容，没有 JavaScript 事件处理。React 在客户端运行时，会将服务端生成的 DOM 与客户端的虚拟 DOM 进行对比（而非重新创建 DOM），将事件处理器和状态管理"注入"到已有的 DOM 节点上。这比 CSR（客户端渲染）的"从零创建 DOM"快得多，因为 DOM 节点已经存在了。

在 Next.js 中，SSR 的实现方式取决于路由模式：App Router 中默认使用 Server Components（在服务端渲染且不发送 JS 到客户端），需要交互的组件用 `"use client"` 标记为 Client Components 才会经历 hydration。Pages Router 中通过 `getServerSideProps` 实现每次请求的 SSR。

### 基本示例

```tsx
// 示例说明：Next.js App Router 中的 SSR 与 hydration

// ===== Server Component（默认，服务端渲染，无 hydration） =====
// app/page.tsx
// 不需要 "use client"，默认是 Server Component
// 在服务器端运行，HTML 发送给客户端后不需要 hydration

async function HomePage() {
    // 可以直接在组件中请求数据（服务端执行）
    const res = await fetch("https://api.example.com/posts", {
        cache: "no-store",  // 每次请求都获取最新数据（SSR 行为）
    });
    const posts = await res.json();

    return (
        <main>
            <h1>文章列表</h1>
            <ul>
                {posts.map((post: any) => (
                    <li key={post.id}>{post.title}</li>
                ))}
            </ul>
            {/* Client Component 需要 hydration */}
            <LikeButton />
        </main>
    );
}

export default HomePage;

// ===== Client Component（需要 hydration） =====
// components/LikeButton.tsx
"use client";  // 标记为客户端组件

import { useState } from "react";

function LikeButton() {
    // useState 等 Hooks 只能在 Client Component 中使用
    const [liked, setLiked] = useState(false);

    return (
        <button onClick={() => setLiked(!liked)}>
            {liked ? "已点赞" : "点赞"}
        </button>
    );
    // 这个按钮会经历 hydration：
    // 1. 服务端渲染为 <button>点赞</button> HTML
    // 2. 客户端加载 JS 后绑定 onClick 事件
    // 3. 页面变得可交互
}

export { LikeButton };
```

### 内部原理

#### SSR + hydration 的完整流程

```
用户请求页面：

1. 服务器端：
   → 执行 Server Component 的 render 函数
   → 获取数据（fetch、数据库查询等）
   → 将 React 组件树渲染为 HTML 字符串
   → 将 HTML + 序列化的数据发送给浏览器

2. 浏览器端（首次展示）：
   → 接收 HTML → 立即渲染到屏幕
   → 用户看到完整内容（但不可交互）
   → 这是 FCP（First Contentful Paint）

3. 浏览器端（hydration）：
   → 下载并解析 JavaScript bundle
   → React 调用 hydrateRoot() 而非 createRoot()
   → 遍历已有的 DOM 节点
   → 将事件监听器绑定到 DOM 节点上
   → 初始化组件的 state
   → 页面变得可交互（TTI - Time to Interactive）

4. 后续交互：
   → 与普通 CSR 应用完全一致
   → React 接管页面，处理状态更新和 DOM 操作
```

### 与相关API的对比

| 对比维度 | SSR | CSR | SSG |
|----------|-----|-----|-----|
| HTML 生成时机 | 每次请求时 | 客户端运行时 | 构建时 |
| 首屏速度 | 快（HTML 直出） | 慢（等 JS 下载执行） | 最快（CDN 缓存） |
| SEO | 好（HTML 有内容） | 差（空 HTML） | 好 |
| 服务器压力 | 高（每次请求都渲染） | 无 | 低（构建一次） |
| 数据实时性 | 实时 | 实时 | 构建时快照 |
| hydration | 需要 | 不需要 | 需要 |

### 适用场景

- **SEO 要求高：** 需要搜索引擎收录的页面（文章、商品）
- **首屏性能要求高：** 用户需要快速看到内容
- **动态数据：** 每次请求需要最新数据（用户个人页面）
- **社交分享：** 分享链接需要显示预览卡片（Open Graph）

### 常见问题

#### hydration 不匹配是什么

**问题描述：** 服务端渲染的 HTML 与客户端渲染的结果不一致。

**解决方案：**

```
hydration 不匹配的常见原因：
  → 服务端和客户端使用了不同的数据（如 Date.now()）
  → 条件渲染依赖了浏览器 API（如 window.innerWidth）
  → HTML 标签嵌套不正确（如 <p> 内嵌套 <div>）

React 的处理：
  → 开发环境会报警告
  → 生产环境 React 会尝试修复（用客户端结果替换）
  → 修复过程可能导致闪烁或性能下降

详细内容见 6.10.14 和 6.10.15
```

### 注意事项

- Server Component 不经历 hydration（不发送 JS 到客户端）
- Client Component（"use client"）才需要 hydration
- hydration 期间页面可见但不可交互（用户可能误以为页面"卡住了"）
- 服务端和客户端的渲染结果必须一致，否则产生 hydration 不匹配
- SSR 增加了服务器的计算负担，需要考虑缓存策略
- Next.js App Router 默认使用 Server Components，减少了需要 hydration 的代码量

### 总结

SSR 在服务器端将 React 组件渲染为 HTML，用户快速看到内容。随后 hydration 过程将事件监听器绑定到已有 DOM 上，使页面变得可交互。Next.js App Router 中 Server Components 默认在服务端渲染且不需要 hydration，只有 Client Components 需要 hydration。SSR 提升了首屏速度和 SEO，但增加了服务器负担，且必须保证服务端和客户端渲染结果一致。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## CSR的客户端渲染

### 概念说明

CSR（Client-Side Rendering，客户端渲染）是指页面的 HTML 内容完全由浏览器中的 JavaScript 生成。服务器只返回一个几乎为空的 HTML 骨架（通常只有一个 `<div id="root"></div>`），浏览器下载并执行 JavaScript 后，React 在客户端构建整个 DOM 树并渲染到页面上。

CSR 是传统 React 单页应用（SPA）的默认渲染模式，Create React App、Vite 创建的 React 项目都是 CSR。CSR 的优势是交互体验好（页面切换不需要完整刷新）、服务器压力小（只需要返回静态文件）、部署简单（可以放在 CDN 上）。缺点是首屏加载慢（需要等 JS 下载和执行）、SEO 不友好（搜索引擎看到的是空 HTML）。在 Next.js 中，Client Components 在首次请求时仍然会在服务端预渲染一次 HTML（用于快速展示），但后续的导航和交互完全在客户端进行。

### 基本示例

```tsx
// 示例说明：CSR 的典型模式

// ===== 纯 CSR 应用（如 Vite + React） =====
// index.html - 几乎为空的 HTML
// <html>
//   <body>
//     <div id="root"></div>
//     <script src="/main.js"></script>
//   </body>
// </html>

// main.tsx - JavaScript 负责生成所有内容
import { createRoot } from "react-dom/client";
import App from "./App";

// React 在客户端创建整个 DOM 树
const root = createRoot(document.getElementById("root")!);
root.render(<App />);

// ===== Next.js 中的 CSR 场景 =====
// 某些数据只在客户端获取（不需要 SSR）
"use client";

import { useState, useEffect } from "react";

function ClientOnlyDashboard() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // useEffect 只在客户端执行
    useEffect(() => {
        // 这个请求不在服务端执行
        // 适合需要用户认证 token 的接口
        fetch("/api/dashboard", {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        })
            .then((res) => res.json())
            .then((data) => {
                setData(data);
                setLoading(false);
            });
    }, []);

    if (loading) return <p>加载中...</p>;

    return (
        <div>
            <h2>仪表盘</h2>
            <p>欢迎, {data.userName}</p>
        </div>
    );
}

export default ClientOnlyDashboard;
```

### 内部原理

#### CSR 的加载流程

```
用户访问页面：

1. 浏览器请求 HTML
   → 服务器返回空的 HTML 骨架
   → <div id="root"></div>
   → 用户看到白屏

2. 浏览器下载 JavaScript
   → 下载 main.js（可能几百 KB 甚至几 MB）
   → 网速慢时白屏时间更长

3. 浏览器执行 JavaScript
   → React 创建虚拟 DOM
   → 调用 createRoot().render()
   → 生成真实 DOM 节点并插入页面
   → 用户终于看到内容（FCP）

4. 数据请求
   → 组件 mount 后发起 API 请求
   → 等待响应
   → 更新状态，重新渲染
   → 用户看到完整内容

总耗时 = HTML 下载 + JS 下载 + JS 执行 + 数据请求
```

### 与相关API的对比

| 对比维度 | CSR | SSR | SSG |
|----------|-----|-----|-----|
| 首屏速度 | 慢 | 快 | 最快 |
| SEO | 差 | 好 | 好 |
| 服务器压力 | 低（静态文件） | 高（每次渲染） | 低（构建一次） |
| 交互体验 | 好（SPA） | 好（hydration 后） | 好（hydration 后） |
| 部署复杂度 | 低（CDN） | 高（需要 Node 服务） | 低（CDN） |
| 数据实时性 | 实时 | 实时 | 构建时快照 |

### 适用场景

- **后台管理系统：** 不需要 SEO，登录后才能访问
- **内部工具：** 不面向公众，不需要搜索引擎收录
- **交互密集型应用：** 编辑器、绘图工具、游戏
- **需要浏览器 API 的数据：** localStorage、geolocation 等

### 常见问题

#### Next.js 中如何实现纯 CSR

**解决方案：**

```tsx
// 方法1：使用 dynamic import + ssr: false
import dynamic from "next/dynamic";

const ClientOnlyComponent = dynamic(
    () => import("../components/ClientOnly"),
    { ssr: false }  // 禁用服务端渲染
);

// 方法2：useEffect + 状态控制
"use client";
import { useState, useEffect } from "react";

function ClientOnly({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;  // 服务端渲染时返回 null

    return <>{children}</>;
}
```

### 注意事项

- CSR 首屏展示慢，用户会看到白屏或加载状态
- 搜索引擎无法抓取 CSR 页面的内容（SEO 差）
- JS bundle 体积直接影响首屏时间，需要代码分割
- Next.js 中即使是 Client Component，首次请求也会在服务端预渲染 HTML
- 需要浏览器 API 的逻辑必须放在 useEffect 或事件处理器中

### 总结

CSR 将所有渲染工作交给浏览器的 JavaScript 完成，服务器只返回空 HTML。优势是交互体验好、服务器压力小、部署简单。劣势是首屏慢（白屏等待 JS 加载）和 SEO 差。适合后台管理、内部工具等不需要 SEO 的场景。在 Next.js 中，Client Components 在首次请求时仍会在服务端预渲染 HTML，后续交互在客户端进行。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## SSG的静态站点生成

### 概念说明

SSG（Static Site Generation，静态站点生成）是指在构建时（build time）将页面预渲染为静态 HTML 文件。这些 HTML 文件在部署后可以直接通过 CDN 分发，用户请求时不需要服务器实时渲染，响应速度极快。SSG 生成的页面包含完整的 HTML 内容，SEO 友好，且服务器压力最小。

在 Next.js 中，SSG 的实现方式取决于路由模式。Pages Router 通过 `getStaticProps`（获取数据）和 `getStaticPaths`（动态路由）在构建时生成页面。App Router 中默认行为就是 SSG：没有动态数据获取的 Server Component 自动在构建时生成静态 HTML；使用 `fetch` 且设置 `cache: "force-cache"`（默认行为）的请求也会在构建时执行并缓存结果。

SSG 的局限性在于数据是构建时的快照，页面部署后数据不会自动更新。如果数据变化频繁，需要配合 ISR（增量静态再生成）或客户端数据获取来解决。

### 基本示例

```tsx
// 示例说明：Next.js App Router 中的 SSG

// ===== 静态页面（自动 SSG） =====
// app/about/page.tsx
// 没有动态数据，构建时自动生成静态 HTML
function AboutPage() {
    return (
        <main>
            <h1>关于我们</h1>
            <p>这是一个在构建时生成的静态页面</p>
        </main>
    );
}

export default AboutPage;

// ===== 带数据的静态页面 =====
// app/blog/page.tsx
// fetch 默认使用 cache: "force-cache"，构建时执行
async function BlogListPage() {
    // 构建时执行此请求，结果被缓存
    const res = await fetch("https://api.example.com/posts", {
        cache: "force-cache",  // 默认行为，可省略
    });
    const posts = await res.json();

    return (
        <main>
            <h1>博客文章</h1>
            <ul>
                {posts.map((post: any) => (
                    <li key={post.id}>
                        <a href={`/blog/${post.slug}`}>{post.title}</a>
                    </li>
                ))}
            </ul>
        </main>
    );
}

export default BlogListPage;

// ===== 动态路由的 SSG =====
// app/blog/[slug]/page.tsx
// 使用 generateStaticParams 在构建时生成所有页面

// 构建时调用：返回所有需要预生成的路径参数
export async function generateStaticParams() {
    const res = await fetch("https://api.example.com/posts");
    const posts = await res.json();

    // 返回参数数组，每个对象对应一个页面
    return posts.map((post: any) => ({
        slug: post.slug,  // 对应 [slug] 动态段
    }));
}

// 每个参数对应的页面在构建时渲染
async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const res = await fetch(`https://api.example.com/posts/${slug}`);
    const post = await res.json();

    return (
        <article>
            <h1>{post.title}</h1>
            <p>{post.content}</p>
        </article>
    );
}

export default BlogPostPage;
```

### 内部原理

#### SSG 的构建流程

```
执行 next build 时：

1. 分析所有页面路由
2. 对于静态页面（无动态数据）：
   → 直接渲染为 HTML
3. 对于有 generateStaticParams 的动态路由：
   → 调用 generateStaticParams 获取所有参数
   → 对每组参数渲染对应的页面
   → 生成 .html 文件
4. 对于有 fetch + force-cache 的页面：
   → 执行 fetch 请求
   → 用返回数据渲染页面
   → 缓存 fetch 结果和 HTML

部署后：
  → 静态 HTML 文件放在 CDN
  → 用户请求 → CDN 直接返回 HTML
  → 不经过 Node.js 服务器
  → 响应时间 < 50ms（CDN 边缘节点）
```

### 与相关API的对比

| 对比维度 | SSG | SSR | ISR |
|----------|-----|-----|-----|
| HTML 生成时机 | 构建时 | 每次请求时 | 构建时 + 后台更新 |
| 数据新鲜度 | 构建时快照 | 实时 | 按 revalidate 间隔 |
| 响应速度 | 最快（CDN） | 中等（服务器渲染） | 快（CDN + 后台更新） |
| 适合内容 | 不常变化的内容 | 实时数据 | 有规律更新的内容 |
| 构建时间 | 页面多时构建慢 | 无 | 首次构建 + 增量 |

### 适用场景

- **博客/文档站：** 内容不常变化，构建时生成
- **营销页面：** 落地页、产品介绍页
- **帮助中心：** FAQ、使用指南
- **电商商品页：** 商品数量有限且更新不频繁

### 常见问题

#### 页面太多导致构建时间过长

**解决方案：**

```typescript
// 只预生成部分页面，其余按需生成
export async function generateStaticParams() {
    // 只预生成最热门的100篇文章
    const res = await fetch("https://api.example.com/posts?top=100");
    const posts = await res.json();

    return posts.map((post: any) => ({
        slug: post.slug,
    }));
}

// 未预生成的页面在首次访问时生成（动态渲染）
// 配合 dynamicParams = true（默认值）
// 首次访问较慢，之后被缓存
```

### 注意事项

- App Router 中无动态数据的页面自动 SSG
- generateStaticParams 替代了 Pages Router 的 getStaticPaths
- fetch 默认缓存（force-cache），实现构建时数据获取
- 数据在构建后不会自动更新（需要 ISR 或重新构建）
- 动态路由的 SSG 需要 generateStaticParams 提供所有参数
- 页面数量过多时构建时间可能很长

### 总结

SSG 在构建时将页面预渲染为静态 HTML，通过 CDN 分发，响应速度最快。Next.js App Router 中无动态数据的页面自动 SSG，动态路由通过 generateStaticParams 预生成。SSG 适合不常变化的内容（博客、文档、营销页）。数据是构建时快照，需要更新时配合 ISR 或重新构建。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## ISR的增量静态再生成

### 概念说明

ISR（Incremental Static Regeneration，增量静态再生成）结合了 SSG 和 SSR 的优势：页面在构建时预渲染为静态 HTML（像 SSG 一样快），但在部署后可以按照指定的时间间隔在后台重新生成页面（数据不会永远过期）。用户始终能快速看到缓存的页面，同时数据会在后台自动更新。

ISR 的工作模式是"stale-while-revalidate"：当用户请求页面时，如果页面还在有效期内（revalidate 时间未到），直接返回缓存的静态页面；如果已过有效期，仍然返回旧的缓存页面（用户不需要等待），同时在后台触发一次重新生成。下一个用户请求时就能看到更新后的页面。

在 Next.js App Router 中，ISR 通过 fetch 的 `next.revalidate` 选项或页面级别的 `revalidate` 导出实现。Pages Router 中通过 `getStaticProps` 返回的 `revalidate` 字段实现。

### 基本示例

```tsx
// 示例说明：Next.js App Router 中的 ISR

// ===== 方式1：fetch 级别的 revalidate =====
// app/products/page.tsx
async function ProductsPage() {
    // 每60秒最多重新验证一次
    const res = await fetch("https://api.example.com/products", {
        next: { revalidate: 60 },  // 60秒后数据视为过期
    });
    const products = await res.json();

    return (
        <main>
            <h1>商品列表</h1>
            <p>数据更新时间: {new Date().toLocaleString()}</p>
            <ul>
                {products.map((p: any) => (
                    <li key={p.id}>{p.name} - ¥{p.price}</li>
                ))}
            </ul>
        </main>
    );
}

export default ProductsPage;

// ===== 方式2：页面级别的 revalidate =====
// app/news/page.tsx

// 导出 revalidate 配置，整个页面60秒后可以重新生成
export const revalidate = 60;

async function NewsPage() {
    const res = await fetch("https://api.example.com/news");
    const news = await res.json();

    return (
        <main>
            <h1>新闻</h1>
            {news.map((item: any) => (
                <article key={item.id}>
                    <h2>{item.title}</h2>
                    <p>{item.summary}</p>
                </article>
            ))}
        </main>
    );
}

export default NewsPage;

// ===== 方式3：按需重新验证（On-Demand Revalidation） =====
// app/api/revalidate/route.ts
import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    const { secret, path } = await request.json();

    // 验证密钥
    if (secret !== process.env.REVALIDATION_SECRET) {
        return NextResponse.json({ error: "无效密钥" }, { status: 401 });
    }

    // 按路径重新验证
    revalidatePath(path);
    // 或者按标签重新验证
    // revalidateTag("products");

    return NextResponse.json({ revalidated: true });
}

// 使用：CMS 内容更新后调用此 API
// POST /api/revalidate { secret: "xxx", path: "/products" }
```

### 内部原理

#### ISR 的 stale-while-revalidate 流程

```
构建时：
  → 页面预渲染为静态 HTML
  → 设置 revalidate = 60（60秒）

请求1（0秒，构建刚完成）：
  → 返回静态 HTML（fresh）
  → 不触发后台重新生成

请求2（30秒后）：
  → 仍在 revalidate 期内
  → 返回缓存的静态 HTML
  → 不触发后台重新生成

请求3（65秒后，已过 revalidate 期）：
  → 返回旧的缓存 HTML（用户立即看到内容）
  → 同时在后台触发页面重新生成
  → 新的 HTML 生成完成后替换缓存

请求4（66秒后）：
  → 返回新生成的 HTML
  → 数据是最新的
```

### 与相关API的对比

| 对比维度 | SSG | ISR | SSR |
|----------|-----|-----|-----|
| 数据更新 | 重新构建 | 后台自动更新 | 每次请求 |
| 用户等待 | 无 | 无（返回缓存） | 等待渲染 |
| 服务器压力 | 无 | 低（按需渲染） | 高（每次渲染） |
| 数据延迟 | 构建周期 | revalidate 间隔 | 无延迟 |
| CDN 缓存 | 永久 | revalidate 后更新 | 不缓存 |

### 适用场景

- **电商商品页：** 价格和库存定期更新（revalidate: 60）
- **新闻资讯：** 内容每隔几分钟更新一次
- **排行榜：** 数据每小时更新
- **CMS 内容：** 编辑发布后按需重新验证

### 常见问题

#### 时间触发和按需触发怎么选

**解决方案：**

```
时间触发（revalidate: N）：
  → 适合有规律更新的数据
  → 简单，不需要额外的 API
  → 数据延迟最大为 N 秒

按需触发（revalidatePath / revalidateTag）：
  → 适合事件驱动的更新（CMS 发布、用户操作）
  → 数据更新后立即触发重新生成
  → 需要额外的 API 端点或 Webhook
  → 数据延迟最小

两者可以结合：
  → revalidate: 3600（兜底，每小时更新）
  → 加上按需触发（内容发布时立即更新）
```

### 注意事项

- revalidate 的值是秒数，表示数据的最大过期时间
- 过期后的第一次请求仍返回旧数据（用户不等待）
- 后台重新生成失败时保留旧页面（不会导致页面消失）
- revalidatePath 按路径触发，revalidateTag 按标签触发
- fetch 的 next.revalidate 和页面级 revalidate 取最小值
- ISR 需要 Node.js 服务器支持（纯静态托管不行）

### 总结

ISR 在 SSG 的基础上增加了后台更新能力：页面在构建时预渲染，部署后按 revalidate 间隔在后台重新生成。用户始终看到缓存页面（无等待），数据在后台更新。支持时间触发和按需触发两种模式。适合数据有规律更新但不需要实时的场景。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Streaming SSR的流式传输

### 概念说明

传统 SSR 有一个瓶颈：服务器必须等待所有数据获取完成、整个页面渲染完毕后，才能将完整的 HTML 发送给浏览器。如果某个数据源很慢（比如需要 3 秒才能返回），用户就得等 3 秒才能看到任何内容。

Streaming SSR（流式服务端渲染）解决了这个问题：服务器不再等待全部内容准备好，而是把已经准备好的部分先发送给浏览器，慢的部分后续以"流"的方式逐步发送。用户可以先看到页面的框架和快速加载的部分，慢的部分在准备好后自动填充到页面中。

在 Next.js App Router 中，Streaming 通过 React 的 `<Suspense>` 组件实现。将慢加载的部分用 `<Suspense>` 包裹并提供 `fallback`（占位 UI），React 会先发送 fallback 的 HTML，等数据准备好后再发送实际内容替换 fallback。整个过程用户不需要刷新页面。

### 基本示例

```tsx
// 示例说明：Next.js App Router 中的 Streaming SSR

// app/dashboard/page.tsx
import { Suspense } from "react";

// 页面组件：快速返回框架 + 慢加载部分用 Suspense 包裹
export default function DashboardPage() {
    return (
        <main>
            {/* 这部分立即发送给浏览器 */}
            <h1>仪表盘</h1>
            <nav>导航栏内容（立即展示）</nav>

            {/* 慢加载部分：先展示 fallback，数据到达后替换 */}
            <Suspense fallback={<p>加载统计数据中...</p>}>
                <StatsPanel />
            </Suspense>

            <Suspense fallback={<p>加载图表中...</p>}>
                <ChartSection />
            </Suspense>

            <Suspense fallback={<p>加载最近活动中...</p>}>
                <RecentActivity />
            </Suspense>
        </main>
    );
}

// 慢速数据组件：各自独立获取数据
async function StatsPanel() {
    // 模拟1秒的数据获取
    const stats = await fetch("https://api.example.com/stats", {
        cache: "no-store",
    }).then((r) => r.json());

    return (
        <div>
            <h2>统计概览</h2>
            <p>用户数: {stats.userCount}</p>
            <p>订单数: {stats.orderCount}</p>
        </div>
    );
}

async function ChartSection() {
    // 模拟3秒的数据获取（很慢）
    const chartData = await fetch("https://api.example.com/charts", {
        cache: "no-store",
    }).then((r) => r.json());

    return (
        <div>
            <h2>数据图表</h2>
            <p>数据点数: {chartData.points.length}</p>
        </div>
    );
}

async function RecentActivity() {
    // 模拟2秒的数据获取
    const activities = await fetch("https://api.example.com/activities", {
        cache: "no-store",
    }).then((r) => r.json());

    return (
        <ul>
            {activities.map((a: any) => (
                <li key={a.id}>{a.description}</li>
            ))}
        </ul>
    );
}
```

### 内部原理

#### Streaming 的传输流程

```
传统 SSR（瀑布式）：
  服务器等待所有数据 ──────────────→ 发送完整 HTML
  [等待 stats 1s] [等待 chart 3s] [等待 activity 2s]
  总等待时间：3秒（最慢的决定）
  用户 3 秒后才看到任何内容

Streaming SSR（流式）：
  0s   → 发送页面框架 HTML（h1、nav）
         用户立即看到页面结构
  1s   → stats 数据到达 → 发送 StatsPanel HTML 替换 fallback
  2s   → activity 数据到达 → 发送 RecentActivity HTML 替换 fallback
  3s   → chart 数据到达 → 发送 ChartSection HTML 替换 fallback
  用户 0 秒就能看到页面框架
  每个部分在准备好后立即展示

技术实现：
  → 使用 HTTP chunked transfer encoding
  → 服务器保持连接不关闭
  → 每个 Suspense boundary 的内容准备好后作为一个 chunk 发送
  → 浏览器中的 React 脚本将新 chunk 插入正确位置
```

### 与相关API的对比

| 对比维度 | 传统 SSR | Streaming SSR |
|----------|---------|--------------|
| 首字节时间（TTFB） | 慢（等所有数据） | 快（立即发送框架） |
| 首次内容展示 | 全部完成后 | 逐步展示 |
| 最慢请求的影响 | 阻塞整个页面 | 只阻塞对应的 Suspense 区域 |
| 用户体验 | 长时间白屏 | 渐进式加载 |
| 实现方式 | renderToString | renderToPipeableStream |

### 适用场景

- **仪表盘页面：** 多个独立的数据面板各自加载
- **电商商品页：** 商品信息快速加载，评论和推荐异步加载
- **社交动态页：** 页面框架先展示，动态内容逐步加载
- **搜索结果页：** 搜索框和筛选器先展示，结果异步加载

### 常见问题

#### Streaming 和客户端 loading 状态有什么区别

**解决方案：**

```
客户端 loading（CSR 方式）：
  → 先发送空 HTML → 下载 JS → 执行 JS → 发起请求 → 展示数据
  → 用户看到多次状态切换：白屏 → 骨架屏 → 数据
  → JS bundle 不加载完就什么都看不到

Streaming SSR：
  → 服务器端发起请求 → 准备好的部分先发送 HTML
  → 用户看到：框架 → fallback → 实际内容
  → 不需要等 JS 下载就能看到 fallback
  → 数据在服务器端获取，无需客户端请求

关键区别：
  → Streaming 的 fallback 是服务器发送的 HTML（不需要 JS）
  → CSR 的 loading 状态需要 JS 执行后才能展示
  → Streaming 的 SEO 更好（搜索引擎能抓到最终内容）
```

### 注意事项

- Streaming 通过 Suspense 组件实现
- 每个 Suspense boundary 独立流式传输
- fallback 是服务器发送的 HTML，不需要客户端 JS
- 嵌套 Suspense 可以创建多层渐进式加载
- loading.js 文件是 Next.js 对整个路由段的 Suspense 封装
- Streaming 需要服务器支持 chunked transfer encoding

### 总结

Streaming SSR 通过流式传输解决了传统 SSR "等最慢数据"的瓶颈。结合 React Suspense，页面框架立即发送，慢数据部分先展示 fallback 再逐步替换为实际内容。用户立即看到页面结构，各部分独立加载，大幅改善了首屏体验。Next.js App Router 原生支持 Streaming。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## App Router的文件系统路由

### 概念说明

Next.js App Router 采用基于文件系统的路由机制：`app` 目录下的文件夹结构直接映射为 URL 路径。每个文件夹代表一个路由段（route segment），文件夹中的 `page.tsx` 文件定义了该路由的页面内容。这种约定优于配置的方式让路由结构一目了然，不需要手动编写路由配置。

App Router 支持多种路由模式：静态路由（固定路径）、动态路由（`[param]` 参数段）、捕获所有路由（`[...slug]`）、可选捕获所有路由（`[[...slug]]`）、路由组（`(group)` 不影响 URL）、平行路由（`@slot`）。除了 `page.tsx`，文件夹中还可以包含 `layout.tsx`、`loading.tsx`、`error.tsx`、`not-found.tsx` 等特殊文件，各自承担不同的职责。

### 基本示例

```
// 示例说明：App Router 文件系统路由的目录结构

app/
├── page.tsx                    → /                    （首页）
├── layout.tsx                  → 根布局（所有页面共享）
├── about/
│   └── page.tsx                → /about               （关于页）
├── blog/
│   ├── page.tsx                → /blog                （博客列表）
│   └── [slug]/
│       └── page.tsx            → /blog/hello-world    （动态路由）
├── shop/
│   └── [...categories]/
│       └── page.tsx            → /shop/a/b/c          （捕获所有）
├── (marketing)/                → 路由组（不影响 URL）
│   ├── pricing/
│   │   └── page.tsx            → /pricing
│   └── features/
│       └── page.tsx            → /features
└── dashboard/
    ├── layout.tsx              → 仪表盘布局
    ├── page.tsx                → /dashboard
    ├── settings/
    │   └── page.tsx            → /dashboard/settings
    └── @analytics/             → 平行路由
        └── page.tsx            → 与 /dashboard 同时渲染
```

```tsx
// ===== 静态路由 =====
// app/about/page.tsx
export default function AboutPage() {
    return <h1>关于我们</h1>;
}

// ===== 动态路由 =====
// app/blog/[slug]/page.tsx
// [slug] 是动态参数，匹配 /blog/任意值
export default async function BlogPost({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    // slug 的值来自 URL，如 /blog/hello → slug = "hello"
    return <h1>文章: {slug}</h1>;
}

// ===== 捕获所有路由 =====
// app/shop/[...categories]/page.tsx
// [...categories] 匹配任意深度的路径
export default async function ShopPage({
    params,
}: {
    params: Promise<{ categories: string[] }>;
}) {
    const { categories } = await params;
    // /shop/clothes/men/shirts → categories = ["clothes", "men", "shirts"]
    return <h1>分类: {categories.join(" > ")}</h1>;
}

// ===== 路由组 =====
// app/(marketing)/pricing/page.tsx
// (marketing) 文件夹不会出现在 URL 中
// URL 是 /pricing 而不是 /marketing/pricing
export default function PricingPage() {
    return <h1>定价</h1>;
}
```

### 内部原理

#### 特殊文件的优先级和嵌套

```
每个路由段（文件夹）可以包含以下特殊文件：

layout.tsx    → 该段及所有子段共享的布局
template.tsx  → 类似 layout 但每次导航都重新挂载
page.tsx      → 该路由的页面内容（使路由可访问）
loading.tsx   → 该段的加载 UI（自动包裹 Suspense）
error.tsx     → 该段的错误处理 UI（自动包裹 Error Boundary）
not-found.tsx → 404 UI
default.tsx   → 平行路由的默认回退

渲染嵌套顺序（从外到内）：
  layout.tsx
    └── template.tsx
        └── error.tsx（Error Boundary）
            └── loading.tsx（Suspense）
                └── page.tsx
```

### 与相关API的对比

| 路由类型 | 语法 | URL 示例 | params |
|----------|------|---------|--------|
| 静态路由 | `about/page.tsx` | /about | 无 |
| 动态路由 | `[id]/page.tsx` | /123 | `{ id: "123" }` |
| 捕获所有 | `[...slug]/page.tsx` | /a/b/c | `{ slug: ["a","b","c"] }` |
| 可选捕获 | `[[...slug]]/page.tsx` | / 或 /a/b | `{ slug: [] }` 或 `{ slug: ["a","b"] }` |
| 路由组 | `(group)/page.tsx` | 不影响 URL | 无 |

### 适用场景

- **博客/文档：** 动态路由 `[slug]` 匹配文章标题
- **电商分类：** 捕获所有路由 `[...categories]` 匹配多级分类
- **多布局应用：** 路由组 `(marketing)` 和 `(dashboard)` 使用不同布局
- **仪表盘：** 平行路由 `@analytics` 同时渲染多个面板

### 常见问题

#### page.tsx 和 route.tsx 的区别

**解决方案：**

```
page.tsx：
  → 定义页面 UI（返回 React 组件）
  → 用户在浏览器中访问的页面

route.tsx：
  → 定义 API 端点（返回 Response）
  → 处理 GET、POST 等 HTTP 请求
  → 类似 Pages Router 的 api/ 目录

同一个文件夹中不能同时有 page.tsx 和 route.tsx
```

### 注意事项

- 文件夹中必须有 page.tsx 才能使路由可访问
- 路由组 `(name)` 不影响 URL，用于组织代码和共享布局
- 动态路由参数在 Next.js 15+ 中通过 `await params` 获取
- `[...slug]` 至少匹配一个段，`[[...slug]]` 可以匹配零个段
- layout.tsx 在导航时不会重新挂载，template.tsx 每次都重新挂载
- 同一文件夹不能同时有 page.tsx 和 route.tsx

### 总结

Next.js App Router 的文件系统路由通过目录结构定义 URL 路径。支持静态路由、动态路由（`[param]`）、捕获所有路由（`[...slug]`）、路由组（`(group)`）等模式。每个路由段可以包含 page、layout、loading、error 等特殊文件，各自承担不同职责。这种约定优于配置的方式让路由管理清晰直观。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## App Router的嵌套布局

### 概念说明

Next.js App Router 的嵌套布局（Nested Layouts）是其最重要的特性之一。每个路由段（文件夹）可以定义自己的 `layout.tsx`，子路由会自动嵌套在父路由的 layout 中。布局组件接收一个 `children` prop，代表当前路由段的子内容（可能是子 layout 或 page）。

嵌套布局的核心优势是：**导航时只有变化的部分重新渲染，共享的布局不会重新挂载。** 比如从 `/dashboard/settings` 导航到 `/dashboard/analytics`，Dashboard 的布局（侧边栏、顶栏）保持不变，只有内容区域更新。这不仅提升了性能（减少 DOM 操作），也保留了布局中的状态（比如侧边栏的展开/折叠状态、滚动位置）。

根布局（`app/layout.tsx`）是必须的，它定义了整个应用的 `<html>` 和 `<body>` 标签。所有页面都嵌套在根布局中。

### 基本示例

```tsx
// 示例说明：多层嵌套布局

// ===== 根布局（必须） =====
// app/layout.tsx
import "./globals.css";

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="zh-CN">
            <body>
                {/* 所有页面共享的全局导航 */}
                <header>
                    <nav>
                        <a href="/">首页</a>
                        <a href="/dashboard">仪表盘</a>
                    </nav>
                </header>
                {/* children 是子布局或页面 */}
                <main>{children}</main>
                <footer>版权所有 2026</footer>
            </body>
        </html>
    );
}

// ===== Dashboard 子布局 =====
// app/dashboard/layout.tsx
export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div style={{ display: "flex" }}>
            {/* 仪表盘侧边栏：导航时不会重新挂载 */}
            <aside style={{ width: 200 }}>
                <nav>
                    <a href="/dashboard">概览</a>
                    <a href="/dashboard/settings">设置</a>
                    <a href="/dashboard/analytics">分析</a>
                </nav>
            </aside>
            {/* 内容区域：导航时只有这部分变化 */}
            <section style={{ flex: 1 }}>{children}</section>
        </div>
    );
}

// ===== Dashboard 页面 =====
// app/dashboard/page.tsx
export default function DashboardPage() {
    return <h2>仪表盘概览</h2>;
}

// ===== Dashboard/Settings 页面 =====
// app/dashboard/settings/page.tsx
export default function SettingsPage() {
    return <h2>设置页面</h2>;
}

// 渲染结果（访问 /dashboard/settings）：
// RootLayout
//   └── <header>全局导航</header>
//   └── <main>
//         DashboardLayout
//           └── <aside>侧边栏</aside>
//           └── <section>
//                 SettingsPage
//                   └── <h2>设置页面</h2>
//               </section>
//       </main>
//   └── <footer>版权</footer>
```

### 内部原理

#### 布局的嵌套和保持机制

```
导航时的行为：

从 /dashboard/settings 导航到 /dashboard/analytics

变化前的组件树：
  RootLayout → DashboardLayout → SettingsPage

变化后的组件树：
  RootLayout → DashboardLayout → AnalyticsPage

React 对比：
  → RootLayout 没变 → 不重新挂载（保持状态）
  → DashboardLayout 没变 → 不重新挂载（保持状态）
  → SettingsPage → AnalyticsPage → 卸载旧的，挂载新的

结果：
  → 全局导航、侧边栏保持不变
  → 侧边栏中的状态（展开/折叠）保留
  → 只有内容区域更新
  → 用户体验流畅

layout vs template：
  layout.tsx  → 导航时保持挂载，状态保留
  template.tsx → 每次导航都重新挂载，状态重置
```

### 与相关API的对比

| 对比维度 | layout.tsx | template.tsx | page.tsx |
|----------|-----------|-------------|---------|
| 导航时是否重新挂载 | 否（保持） | 是（重新挂载） | 是 |
| 状态保留 | 是 | 否 | 否 |
| 用途 | 持久化布局 | 需要重置的布局 | 页面内容 |
| children prop | 有 | 有 | 无 |

### 适用场景

- **全局布局：** 导航栏、页脚（根 layout）
- **后台管理：** 侧边栏 + 内容区域（dashboard layout）
- **设置页面：** 设置导航 + 设置内容（settings layout）
- **多主题布局：** 路由组配合不同的 layout

### 常见问题

#### 如何让不同页面使用不同的根布局

**解决方案：**

```
使用路由组实现多根布局：

app/
├── (marketing)/
│   ├── layout.tsx      ← 营销页布局（大图背景、无侧边栏）
│   ├── page.tsx        → /
│   └── about/
│       └── page.tsx    → /about
├── (dashboard)/
│   ├── layout.tsx      ← 后台布局（侧边栏、顶栏）
│   └── dashboard/
│       └── page.tsx    → /dashboard
└── layout.tsx          ← 根布局（html + body）

(marketing) 和 (dashboard) 是路由组
它们可以有各自独立的 layout
URL 中不会包含路由组名称
```

### 注意事项

- 根布局（app/layout.tsx）是必须的，定义 html 和 body
- layout 在导航时不会重新挂载，状态保留
- 需要重置状态时使用 template.tsx
- layout 不能访问当前路由的 pathname（需要 Client Component）
- 父 layout 无法向子 layout 传递数据（使用 Context 或数据获取）
- 路由组可以实现同一层级的多个不同布局

### 总结

App Router 的嵌套布局通过文件夹中的 layout.tsx 实现，子路由自动嵌套在父布局中。导航时共享布局不重新挂载（保持状态），只有变化的部分更新。根布局是必须的，定义 html 和 body。路由组可以实现不同页面使用不同布局。嵌套布局是 App Router 相比 Pages Router 最大的体验提升之一。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## App Router的loading.js与Suspense

### 概念说明

Next.js App Router 中的 `loading.tsx` 是一个特殊文件，用于定义路由段的加载状态 UI。当页面或布局正在获取数据时，`loading.tsx` 中的内容会自动展示给用户，数据准备好后自动切换为实际内容。在底层，`loading.tsx` 实际上就是 Next.js 对 React `<Suspense>` 的封装——它会自动将同级的 `page.tsx` 包裹在 `<Suspense fallback={<Loading />}>` 中。

这意味着你有两种方式定义加载状态：使用 `loading.tsx` 文件（简单、自动、整个路由段级别）或直接使用 `<Suspense>` 组件（灵活、手动、任意粒度）。两者可以配合使用：`loading.tsx` 处理整个页面的加载状态，`<Suspense>` 处理页面内部各区域的加载状态。

`loading.tsx` 的加载 UI 在导航时立即展示（instant loading state），用户不会看到空白页面。配合 Streaming SSR，加载状态是服务端发送的 HTML，不需要等待客户端 JS 加载。

### 基本示例

```tsx
// 示例说明：loading.tsx 和 Suspense 的使用

// ===== loading.tsx：整个路由段的加载状态 =====
// app/dashboard/loading.tsx
export default function DashboardLoading() {
    // 当 dashboard/page.tsx 正在加载数据时展示
    return (
        <div>
            <div style={{ height: 32, width: 200, background: "#eee", marginBottom: 16 }} />
            <div style={{ height: 200, background: "#f5f5f5" }} />
            <p>加载仪表盘数据...</p>
        </div>
    );
}

// ===== page.tsx：异步数据获取 =====
// app/dashboard/page.tsx
async function DashboardPage() {
    // 数据获取期间，loading.tsx 的内容会展示
    const res = await fetch("https://api.example.com/dashboard", {
        cache: "no-store",
    });
    const data = await res.json();

    return (
        <div>
            <h1>仪表盘</h1>
            <p>用户数: {data.userCount}</p>
            <p>收入: {data.revenue}</p>
        </div>
    );
}

export default DashboardPage;

// ===== Suspense：更细粒度的加载控制 =====
// app/products/page.tsx
import { Suspense } from "react";

export default function ProductsPage() {
    return (
        <div>
            <h1>商品页面</h1>

            {/* 商品列表：独立的加载状态 */}
            <Suspense fallback={<p>加载商品列表...</p>}>
                <ProductList />
            </Suspense>

            {/* 推荐商品：独立的加载状态 */}
            <Suspense fallback={<p>加载推荐...</p>}>
                <Recommendations />
            </Suspense>
        </div>
    );
}

// 异步组件：各自独立获取数据
async function ProductList() {
    const res = await fetch("https://api.example.com/products", {
        cache: "no-store",
    });
    const products = await res.json();

    return (
        <ul>
            {products.map((p: any) => (
                <li key={p.id}>{p.name} - ¥{p.price}</li>
            ))}
        </ul>
    );
}

async function Recommendations() {
    const res = await fetch("https://api.example.com/recommendations", {
        cache: "no-store",
    });
    const items = await res.json();

    return (
        <div>
            <h2>为你推荐</h2>
            {items.map((item: any) => (
                <span key={item.id}>{item.name} </span>
            ))}
        </div>
    );
}
```

### 内部原理

#### loading.tsx 的自动 Suspense 包裹

```
Next.js 内部对 loading.tsx 的处理：

文件结构：
  app/dashboard/
    ├── layout.tsx
    ├── loading.tsx
    └── page.tsx

等价于手写：
  <Layout>
    <Suspense fallback={<Loading />}>
      <Page />
    </Suspense>
  </Layout>

嵌套时的组件树：
  RootLayout
    └── DashboardLayout
        └── <Suspense fallback={<DashboardLoading />}>
            └── DashboardPage
                └── <Suspense fallback={<ProductListSkeleton />}>
                    └── ProductList
                └── <Suspense fallback={<RecommendationsSkeleton />}>
                    └── Recommendations

导航时的行为：
  1. 用户点击导航到 /dashboard
  2. 立即展示 DashboardLoading（Streaming HTML）
  3. DashboardPage 数据获取完成
  4. 替换 Loading 为实际内容
  5. 页面内的 Suspense 各自独立加载
```

### 与相关API的对比

| 对比维度 | loading.tsx | Suspense |
|----------|-----------|---------|
| 粒度 | 整个路由段 | 任意组件区域 |
| 配置方式 | 文件约定（自动） | 手动包裹 |
| 灵活度 | 低（一个路由段一个） | 高（可嵌套、可多个） |
| 适用场景 | 页面级加载状态 | 区域级加载状态 |
| 底层实现 | 自动包裹 Suspense | React 原生 |

### 适用场景

- **loading.tsx：** 页面整体的骨架屏或加载动画
- **Suspense：** 页面内不同区域的独立加载状态
- **两者结合：** loading.tsx 处理页面框架，Suspense 处理各区域

### 常见问题

#### loading.tsx 什么时候展示

**解决方案：**

```
loading.tsx 展示的时机：

1. 客户端导航时（Link 点击）：
   → 立即展示 loading.tsx
   → page.tsx 的数据获取完成后替换

2. 首次服务端渲染时（直接访问 URL）：
   → Streaming：先发送 loading.tsx 的 HTML
   → 数据准备好后发送 page.tsx 的 HTML 替换

3. 浏览器前进/后退时：
   → 如果页面已缓存 → 直接展示
   → 如果未缓存 → 展示 loading.tsx

loading.tsx 不展示的情况：
  → 页面已在缓存中（导航瞬间完成）
  → 页面无异步数据获取（立即渲染）
```

### 注意事项

- loading.tsx 是 Next.js 对 Suspense 的文件约定封装
- loading.tsx 作用于整个路由段，Suspense 可以更细粒度
- loading.tsx 的 UI 通过 Streaming 发送，不需要客户端 JS
- 骨架屏（Skeleton）是 loading.tsx 中常用的 UI 模式
- 嵌套路由中每个层级可以有各自的 loading.tsx
- loading.tsx 中的组件默认是 Server Component

### 总结

loading.tsx 是 Next.js 对 React Suspense 的文件约定封装，自动为路由段的 page.tsx 提供加载状态。导航时立即展示，数据准备好后自动替换。配合手动 Suspense 可以实现更细粒度的加载控制。loading.tsx 处理页面级加载，Suspense 处理区域级加载，两者可以结合使用。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## App Router的error.js与Error Boundary

### 概念说明

Next.js App Router 中的 `error.tsx` 是一个特殊文件，用于处理路由段中的运行时错误。它的底层实现是 React 的 Error Boundary——当同级的 `page.tsx` 或子路由中抛出错误时，`error.tsx` 会自动捕获错误并展示回退 UI，而不是让整个应用崩溃。

`error.tsx` 必须是 Client Component（`"use client"`），因为错误捕获需要在客户端运行。它接收两个 props：`error`（错误对象）和 `reset`（重试函数，调用后尝试重新渲染出错的路由段）。嵌套路由中，错误会向上冒泡到最近的 error.tsx——子路由的错误会被父路由的 error.tsx 捕获（如果子路由没有自己的 error.tsx）。

需要注意的是，error.tsx 只能捕获同级 page.tsx 及其子组件的错误，**不能捕获同级 layout.tsx 中的错误**。layout 的错误需要父级的 error.tsx 来捕获。根布局的错误需要 `global-error.tsx` 来处理。

### 基本示例

```tsx
// 示例说明：error.tsx 的使用和错误恢复

// ===== error.tsx =====
// app/dashboard/error.tsx
"use client";  // 必须是 Client Component

import { useEffect } from "react";

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };  // digest 是服务端错误的哈希标识
    reset: () => void;                    // 重试函数
}) {
    // 记录错误日志
    useEffect(() => {
        console.error("Dashboard 错误:", error);
        // 可以上报到错误监控平台
        // reportError(error);
    }, [error]);

    return (
        <div style={{ padding: 20, border: "1px solid red", borderRadius: 8 }}>
            <h2>仪表盘加载出错</h2>
            <p>{error.message}</p>
            {/* reset 会尝试重新渲染出错的路由段 */}
            <button onClick={() => reset()}>重试</button>
        </div>
    );
}

// ===== 可能出错的页面 =====
// app/dashboard/page.tsx
async function DashboardPage() {
    const res = await fetch("https://api.example.com/dashboard");

    if (!res.ok) {
        // 抛出错误会被 error.tsx 捕获
        throw new Error("获取仪表盘数据失败");
    }

    const data = await res.json();
    return <h1>仪表盘: {data.title}</h1>;
}

export default DashboardPage;

// ===== 全局错误处理 =====
// app/global-error.tsx
// 处理根布局中的错误（必须包含 html 和 body）
"use client";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body>
                <h2>应用出现严重错误</h2>
                <p>{error.message}</p>
                <button onClick={() => reset()}>重试</button>
            </body>
        </html>
    );
}
```

### 内部原理

#### error.tsx 的组件树位置

```
Next.js 内部对 error.tsx 的处理：

文件结构：
  app/dashboard/
    ├── layout.tsx
    ├── error.tsx
    ├── loading.tsx
    └── page.tsx

等价于：
  <Layout>
    <ErrorBoundary fallback={<Error />}>
      <Suspense fallback={<Loading />}>
        <Page />
      </Suspense>
    </ErrorBoundary>
  </Layout>

错误捕获范围：
  error.tsx 捕获 → Page 和 Loading 中的错误
  error.tsx 不捕获 → 同级 Layout 中的错误

Layout 错误的处理：
  → Layout 的错误需要父级的 error.tsx 捕获
  → 根 Layout 的错误需要 global-error.tsx 捕获

错误冒泡：
  app/dashboard/settings/page.tsx 出错
    → 先找 app/dashboard/settings/error.tsx
    → 没有 → 冒泡到 app/dashboard/error.tsx
    → 没有 → 冒泡到 app/error.tsx
    → 没有 → global-error.tsx
```

### 与相关API的对比

| 文件 | 捕获范围 | 是否必须 Client Component | 使用场景 |
|------|---------|------------------------|---------|
| error.tsx | 同级 page 及子路由 | 是 | 路由段级别的错误处理 |
| global-error.tsx | 根布局 | 是 | 全局严重错误 |
| not-found.tsx | 404 错误 | 否 | 找不到页面 |

### 适用场景

- **API 请求失败：** 数据获取失败时展示重试按钮
- **权限不足：** 访问未授权页面时展示提示
- **数据格式错误：** 后端返回异常数据导致渲染失败
- **第三方库异常：** 某个库的运行时错误不影响整个应用

### 常见问题

#### reset 函数不生效怎么办

**解决方案：**

```tsx
// reset() 只是重新渲染出错的路由段
// 如果错误的根本原因没有解决，reset 后还是会报错

// 方案1：配合 router.refresh() 刷新服务端数据
"use client";
import { useRouter } from "next/navigation";

export default function DashboardError({
    error,
    reset,
}: {
    error: Error;
    reset: () => void;
}) {
    const router = useRouter();

    const handleRetry = () => {
        // 先刷新服务端缓存
        router.refresh();
        // 再重新渲染组件
        reset();
    };

    return (
        <div>
            <p>出错了: {error.message}</p>
            <button onClick={handleRetry}>重试</button>
        </div>
    );
}
```

### 注意事项

- error.tsx 必须是 Client Component（"use client"）
- error.tsx 不捕获同级 layout.tsx 的错误
- 根布局错误用 global-error.tsx 处理（需包含 html 和 body）
- reset() 重新渲染出错的路由段，但不保证成功
- 服务端错误的详细信息在生产环境中会被隐藏（只有 digest）
- 错误会向上冒泡到最近的 error.tsx

### 总结

error.tsx 是 Next.js 对 React Error Boundary 的文件约定封装，自动捕获路由段中的运行时错误并展示回退 UI。必须是 Client Component，接收 error 和 reset 两个 props。不能捕获同级 layout 的错误（需要父级 error.tsx），根布局错误用 global-error.tsx 处理。错误会沿路由树向上冒泡。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## App Router的Server Components默认

### 概念说明

在 Next.js App Router 中，所有组件**默认是 Server Components**（服务端组件）。Server Components 在服务器端渲染，生成的 HTML 发送给浏览器，但组件本身的 JavaScript 代码不会被发送到客户端。这意味着 Server Components 的代码不会增加客户端的 JS bundle 体积，可以直接访问服务器端资源（数据库、文件系统、环境变量），也可以使用 async/await 进行数据获取。

只有需要交互（事件处理、useState、useEffect 等）的组件才需要在文件顶部添加 `"use client"` 指令，将其标记为 Client Component。Client Component 会被发送到客户端并经历 hydration。这种设计的核心思想是：尽可能多地在服务器端完成工作，只把必须在客户端执行的代码发送给浏览器。

Server Components 和 Client Components 可以在同一个页面中混合使用。Server Component 可以导入和渲染 Client Component，但 Client Component 不能导入 Server Component（只能通过 children 或 props 传递）。

### 基本示例

```tsx
// 示例说明：Server Components 和 Client Components 的混合使用

// ===== Server Component（默认） =====
// app/posts/page.tsx
// 没有 "use client" → 默认 Server Component
// 可以直接 async/await，可以访问数据库

import { LikeButton } from "./LikeButton";

// 可以是 async 函数（Server Component 特有能力）
async function PostsPage() {
    // 直接在组件中获取数据（服务端执行）
    const posts = await fetch("https://api.example.com/posts", {
        cache: "no-store",
    }).then((r) => r.json());

    // 可以访问服务端环境变量
    const apiKey = process.env.API_SECRET_KEY;
    console.log("服务端日志，不会出现在浏览器控制台");

    return (
        <main>
            <h1>文章列表</h1>
            {posts.map((post: any) => (
                <article key={post.id}>
                    <h2>{post.title}</h2>
                    <p>{post.excerpt}</p>
                    {/* Server Component 可以渲染 Client Component */}
                    <LikeButton postId={post.id} />
                </article>
            ))}
        </main>
    );
}

export default PostsPage;

// ===== Client Component =====
// app/posts/LikeButton.tsx
"use client";  // 必须添加这个指令

import { useState } from "react";

// Client Component：需要交互的组件
export function LikeButton({ postId }: { postId: number }) {
    // useState、useEffect 等 Hooks 只能在 Client Component 中使用
    const [liked, setLiked] = useState(false);
    const [count, setCount] = useState(0);

    const handleLike = async () => {
        setLiked(!liked);
        setCount((c) => (liked ? c - 1 : c + 1));
        // 客户端发起请求
        await fetch(`/api/posts/${postId}/like`, { method: "POST" });
    };

    return (
        <button onClick={handleLike}>
            {liked ? "取消点赞" : "点赞"} ({count})
        </button>
    );
}

// ===== 通过 children 传递 Server Component =====
// app/layout-example/page.tsx
import { ClientWrapper } from "./ClientWrapper";

// Server Component 通过 children 传递给 Client Component
async function Page() {
    const data = await fetch("https://api.example.com/data").then((r) => r.json());

    return (
        <ClientWrapper>
            {/* 这个部分在服务端渲染，作为 children 传给 ClientWrapper */}
            <p>服务端数据: {data.value}</p>
        </ClientWrapper>
    );
}

export default Page;

// app/layout-example/ClientWrapper.tsx
"use client";
export function ClientWrapper({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(true);
    return (
        <div>
            <button onClick={() => setOpen(!open)}>切换</button>
            {open && children}
        </div>
    );
}
```

### 内部原理

#### Server Component 的渲染流程

```
Server Component 的生命周期：

1. 服务器接收请求
2. 执行 Server Component 的函数体
   → 可以 async/await
   → 可以访问数据库、文件系统
   → 可以读取 process.env
3. 生成 React Server Component Payload（RSC Payload）
   → 包含渲染后的组件树（序列化格式）
   → Client Component 的位置标记为"占位符"
4. 将 RSC Payload + Client Component JS 发送给浏览器
5. 浏览器接收后：
   → RSC Payload 中的 HTML 直接展示
   → Client Component 的 JS 执行并 hydrate

关键限制：
  Server Component 不能使用：
    → useState、useEffect 等 Hooks
    → onClick 等事件处理器
    → 浏览器 API（window、document）
  
  Client Component 不能使用：
    → async/await 组件函数
    → 直接访问数据库或文件系统
    → process.env 中的服务端环境变量
```

### 与相关API的对比

| 能力 | Server Component | Client Component |
|------|-----------------|-----------------|
| async/await | 支持 | 不支持 |
| useState/useEffect | 不支持 | 支持 |
| 事件处理（onClick） | 不支持 | 支持 |
| 访问数据库/文件系统 | 支持 | 不支持 |
| 访问 process.env | 支持 | 仅 NEXT_PUBLIC_ 前缀 |
| 增加客户端 JS 体积 | 不增加 | 增加 |
| 渲染位置 | 仅服务端 | 服务端预渲染 + 客户端 hydrate |

### 适用场景

- **Server Component：** 数据展示、静态内容、不需要交互的 UI
- **Client Component：** 表单、按钮交互、动画、使用浏览器 API
- **混合使用：** 页面整体用 Server Component，交互部分用 Client Component

### 常见问题

#### Client Component 中如何使用服务端数据

**解决方案：**

```tsx
// 方案1：Server Component 获取数据，通过 props 传递给 Client Component
// app/page.tsx (Server Component)
import { Chart } from "./Chart";

export default async function Page() {
    const data = await fetch("/api/stats").then(r => r.json());
    // 将数据作为 props 传递（数据必须可序列化）
    return <Chart data={data} />;
}

// Chart.tsx (Client Component)
"use client";
export function Chart({ data }: { data: any }) {
    // 使用客户端图表库渲染
    return <div>{/* 用 data 渲染图表 */}</div>;
}

// 方案2：通过 children 模式
// 见上方基本示例中的 ClientWrapper
```

### 注意事项

- App Router 中组件默认是 Server Component
- 需要交互时才添加 "use client"
- "use client" 标记的组件及其所有导入都变成客户端代码
- Server Component 可以渲染 Client Component
- Client Component 不能直接导入 Server Component（用 children 传递）
- 传递给 Client Component 的 props 必须可序列化（不能传函数、类实例等）
- 将 "use client" 边界尽量下推到组件树的叶节点

### 总结

Next.js App Router 中组件默认是 Server Components，在服务端渲染且不增加客户端 JS 体积。只有需要交互的组件才标记为 Client Component（"use client"）。两者可以混合使用：Server Component 获取数据和渲染静态内容，Client Component 处理交互。将 "use client" 边界下推到叶节点可以最大化 Server Component 的优势。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Pages Router的getStaticProps

### 概念说明

`getStaticProps` 是 Next.js Pages Router 中用于**构建时数据获取**的函数。它在 `next build` 时执行，将获取到的数据作为 props 传递给页面组件，页面据此预渲染为静态 HTML。生成的 HTML 可以通过 CDN 缓存和分发，用户访问时不需要服务器实时渲染。

`getStaticProps` 只在服务端执行，不会被打包到客户端 JS 中，因此可以安全地在其中访问数据库、读取文件系统、使用 API 密钥等。它必须从页面文件（`pages/` 目录下的组件）中导出，不能从非页面组件中导出。返回值是一个包含 `props` 字段的对象，还可以包含 `revalidate`（ISR 间隔）、`notFound`（返回 404）、`redirect`（重定向）等字段。

在 App Router 中，`getStaticProps` 被替换为在 Server Component 中直接使用 `fetch`（配合 `cache: "force-cache"`）进行数据获取。但 Pages Router 在存量项目中仍然广泛使用，面试中也是常考知识点。

### 基本示例

```tsx
// 示例说明：Pages Router 中 getStaticProps 的完整用法

// pages/blog.tsx
import type { GetStaticProps, InferGetStaticPropsType } from "next";

// 数据类型
interface Post {
    id: number;
    title: string;
    excerpt: string;
}

interface BlogPageProps {
    posts: Post[];
    generatedAt: string;  // 构建时间
}

// getStaticProps：构建时在服务端执行
export const getStaticProps: GetStaticProps<BlogPageProps> = async () => {
    // 可以访问数据库（服务端执行，不打包到客户端）
    const res = await fetch("https://api.example.com/posts");
    const posts: Post[] = await res.json();

    // 如果数据不存在，返回 404
    if (!posts || posts.length === 0) {
        return { notFound: true };
    }

    return {
        props: {
            posts,
            generatedAt: new Date().toLocaleString("zh-CN"),
        },
        // ISR：每60秒最多重新生成一次
        revalidate: 60,
    };
};

// 页面组件：接收 getStaticProps 返回的 props
export default function BlogPage({
    posts,
    generatedAt,
}: InferGetStaticPropsType<typeof getStaticProps>) {
    return (
        <main>
            <h1>博客文章</h1>
            <p>页面生成时间: {generatedAt}</p>
            <ul>
                {posts.map((post) => (
                    <li key={post.id}>
                        <h2>{post.title}</h2>
                        <p>{post.excerpt}</p>
                    </li>
                ))}
            </ul>
        </main>
    );
}
```

### 内部原理

#### getStaticProps 的执行时机

```
开发模式（next dev）：
  → 每次请求都执行 getStaticProps
  → 方便调试，但不代表生产环境的行为

生产构建（next build）：
  → 构建时执行一次 getStaticProps
  → 将数据和 HTML 写入 .next 目录
  → 构建后不再执行（除非设置了 revalidate）

生产运行（next start）+ revalidate：
  → 用户请求页面 → 返回缓存的 HTML
  → 超过 revalidate 时间后：
    → 仍返回旧 HTML（用户不等待）
    → 后台重新执行 getStaticProps
    → 生成新 HTML 替换旧的
```

### 与相关API的对比

| 返回字段 | 作用 | 示例 |
|----------|------|------|
| props | 传递给页面组件的数据 | `{ props: { posts } }` |
| revalidate | ISR 间隔（秒） | `{ revalidate: 60 }` |
| notFound | 返回 404 页面 | `{ notFound: true }` |
| redirect | 重定向 | `{ redirect: { destination: "/login" } }` |

### 适用场景

- **博客文章列表：** 构建时获取所有文章
- **商品页面：** 构建时获取商品数据 + ISR 更新
- **文档站点：** 构建时从 CMS 获取内容
- **营销落地页：** 数据在构建时确定

### 常见问题

#### getStaticProps 和 getServerSideProps 怎么选

**解决方案：**

```
选 getStaticProps 的场景：
  → 数据在构建时可以确定
  → 数据变化不频繁（配合 ISR）
  → 需要 CDN 缓存加速
  → 页面性能是首要考虑

选 getServerSideProps 的场景：
  → 数据必须是最新的（每次请求都要最新数据）
  → 数据依赖请求信息（cookie、header、查询参数）
  → 页面需要认证才能访问

在 App Router 中的替代：
  getStaticProps → fetch + cache: "force-cache"
  getServerSideProps → fetch + cache: "no-store"
```

### 注意事项

- getStaticProps 只在服务端执行，代码不会打包到客户端
- 只能从 pages 目录下的页面文件导出
- 返回的 props 必须可序列化（JSON 格式）
- 开发模式下每次请求都执行，生产模式下只在构建时执行
- 配合 revalidate 实现 ISR
- App Router 中已被 Server Component 的直接数据获取替代

### 总结

getStaticProps 是 Pages Router 中构建时数据获取的标准方式，在服务端执行并将数据作为 props 传递给页面组件。支持 revalidate（ISR）、notFound（404）、redirect（重定向）。适合数据可在构建时确定的页面。在 App Router 中被 Server Component 中的 fetch 替代。Pages Router 项目和面试中仍需掌握。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Pages Router的getServerSideProps

### 概念说明

`getServerSideProps` 是 Next.js Pages Router 中用于**每次请求时数据获取**的函数。与 `getStaticProps`（构建时执行）不同，`getServerSideProps` 在每次用户请求页面时都会在服务器端执行，获取最新数据后将页面渲染为 HTML 返回给浏览器。这保证了页面内容始终是最新的。

`getServerSideProps` 接收一个 `context` 参数，其中包含了请求的完整信息：`req`（HTTP 请求对象）、`res`（HTTP 响应对象）、`query`（URL 查询参数）、`params`（动态路由参数）、`resolvedUrl`（实际请求的 URL）等。这意味着可以根据用户的 cookie、认证状态、请求头等信息来决定返回什么数据。

代价是每次请求都需要服务器执行渲染，无法使用 CDN 缓存（因为每次内容可能不同），TTFB（首字节时间）比 SSG/ISR 慢。在 App Router 中，`getServerSideProps` 被替换为 Server Component 中使用 `fetch` 配合 `cache: "no-store"` 选项。

### 基本示例

```tsx
// 示例说明：Pages Router 中 getServerSideProps 的完整用法

// pages/profile.tsx
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";

interface UserProfile {
    id: number;
    name: string;
    email: string;
    role: string;
}

interface ProfilePageProps {
    user: UserProfile;
    serverTime: string;
}

// getServerSideProps：每次请求时在服务端执行
export const getServerSideProps: GetServerSideProps<ProfilePageProps> = async (context) => {
    // context 包含请求的完整信息
    const { req, res, query, params, resolvedUrl } = context;

    // 读取 cookie 中的认证 token
    const token = req.cookies["auth_token"];

    // 未登录则重定向到登录页
    if (!token) {
        return {
            redirect: {
                destination: "/login",
                permanent: false,  // 302 临时重定向
            },
        };
    }

    try {
        // 用 token 获取用户数据（每次请求都获取最新的）
        const res = await fetch("https://api.example.com/profile", {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!res.ok) {
            // 用户不存在返回 404
            return { notFound: true };
        }

        const user: UserProfile = await res.json();

        return {
            props: {
                user,
                serverTime: new Date().toLocaleString("zh-CN"),
            },
        };
    } catch (error) {
        // 服务端错误重定向到错误页
        return {
            redirect: {
                destination: "/error",
                permanent: false,
            },
        };
    }
};

// 页面组件
export default function ProfilePage({
    user,
    serverTime,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    return (
        <main>
            <h1>个人资料</h1>
            <p>姓名: {user.name}</p>
            <p>邮箱: {user.email}</p>
            <p>角色: {user.role}</p>
            <p>服务器时间: {serverTime}</p>
        </main>
    );
}
```

### 内部原理

#### getServerSideProps 的执行流程

```
用户请求页面（每次都执行）：

1. 浏览器请求 /profile
2. Next.js 服务器接收请求
3. 执行 getServerSideProps(context)
   → 读取 cookie、header 等请求信息
   → 发起 API 请求获取数据
   → 返回 { props: {...} }
4. 将 props 传给页面组件
5. 在服务端渲染为 HTML
6. 将 HTML + 序列化的 props 发送给浏览器
7. 浏览器展示 HTML
8. hydration：绑定事件处理器

客户端导航（Link 组件）：
  → 不会返回完整 HTML
  → 返回 JSON 格式的 props 数据
  → 客户端用这些数据渲染页面
```

### 与相关API的对比

| 对比维度 | getServerSideProps | getStaticProps |
|----------|-------------------|---------------|
| 执行时机 | 每次请求 | 构建时（+ ISR） |
| context 参数 | req、res、cookie、header | 无请求信息 |
| CDN 缓存 | 不能 | 可以 |
| TTFB | 慢（等服务器渲染） | 快（CDN 缓存） |
| 数据新鲜度 | 实时 | 构建时快照 |
| 适合场景 | 用户相关、实时数据 | 公共内容、SEO 页面 |

### 适用场景

- **用户个人页面：** 根据 cookie/session 返回不同数据
- **实时数据：** 库存、价格等每次请求需要最新值
- **权限控制：** 根据用户角色决定是否允许访问
- **搜索结果页：** 根据查询参数返回不同结果

### 常见问题

#### getServerSideProps 可以设置缓存头吗

**解决方案：**

```typescript
export const getServerSideProps: GetServerSideProps = async (context) => {
    // 可以通过 res 设置缓存头
    // 让 CDN 缓存10秒，过期后后台刷新
    context.res.setHeader(
        "Cache-Control",
        "public, s-maxage=10, stale-while-revalidate=59"
    );

    const data = await fetch("https://api.example.com/data").then(r => r.json());

    return { props: { data } };
};

// s-maxage=10：CDN 缓存10秒
// stale-while-revalidate=59：过期后59秒内仍返回旧数据，同时后台更新
// 这种方式让 getServerSideProps 也能利用 CDN 缓存
```

### 注意事项

- getServerSideProps 每次请求都执行，增加服务器负担
- 返回的 props 必须可序列化（JSON 格式）
- 可以通过 context.req 访问请求信息（cookie、header）
- 支持 redirect 和 notFound 返回
- 不能与 getStaticProps 在同一个页面中同时使用
- App Router 中被 Server Component + fetch(cache: "no-store") 替代

### 总结

getServerSideProps 在每次请求时于服务端执行，获取最新数据渲染页面。可以访问 cookie、header 等请求信息，适合用户相关和实时数据场景。代价是 TTFB 比 SSG 慢且不能使用 CDN 缓存（可通过 Cache-Control 头部分缓解）。在 App Router 中被 Server Component 的直接数据获取替代。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Pages Router的getStaticPaths

### 概念说明

`getStaticPaths` 是 Next.js Pages Router 中与 `getStaticProps` 配合使用的函数，专门用于**动态路由页面的静态生成**。当页面使用动态路由（如 `pages/blog/[slug].tsx`）并且需要在构建时预渲染时，Next.js 需要知道有哪些具体的路径参数需要预生成——`getStaticPaths` 就是告诉 Next.js 这些路径的。

`getStaticPaths` 返回两个关键字段：`paths`（需要预生成的路径参数数组）和 `fallback`（未预生成路径的处理策略）。fallback 有三个可选值：`false`（未预生成的路径返回 404）、`true`（首次访问时在客户端展示 loading 状态，后台生成页面）、`"blocking"`（首次访问时在服务端生成页面，用户等待直到生成完成）。

在 App Router 中，`getStaticPaths` 被 `generateStaticParams` 替代，API 更简洁。

### 基本示例

```tsx
// 示例说明：getStaticPaths 的完整用法

// pages/blog/[slug].tsx
import type { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from "next";

interface Post {
    slug: string;
    title: string;
    content: string;
}

// getStaticPaths：告诉 Next.js 需要预生成哪些路径
export const getStaticPaths: GetStaticPaths = async () => {
    // 从 API 获取所有文章
    const res = await fetch("https://api.example.com/posts");
    const posts: Post[] = await res.json();

    // 生成路径参数数组
    // 每个对象的 params 对应动态路由的参数
    const paths = posts.map((post) => ({
        params: { slug: post.slug },  // [slug] 对应的参数
    }));

    return {
        paths,
        // fallback 决定未预生成路径的行为
        fallback: "blocking",
    };
};

// getStaticProps：每个路径对应的数据获取
export const getStaticProps: GetStaticProps<{ post: Post }> = async ({ params }) => {
    const slug = params?.slug as string;

    const res = await fetch(`https://api.example.com/posts/${slug}`);

    if (!res.ok) {
        return { notFound: true };  // 文章不存在返回 404
    }

    const post: Post = await res.json();

    return {
        props: { post },
        revalidate: 60,  // ISR：60秒后可重新生成
    };
};

// 页面组件
export default function BlogPostPage({
    post,
}: InferGetStaticPropsType<typeof getStaticProps>) {
    return (
        <article>
            <h1>{post.title}</h1>
            <div>{post.content}</div>
        </article>
    );
}
```

### 内部原理

#### fallback 的三种行为

```
fallback: false
  → 只有 paths 中列出的路径会被预生成
  → 未列出的路径 → 返回 404 页面
  → 适合：路径数量固定且已知

fallback: true
  → paths 中的路径在构建时预生成
  → 未列出的路径：
    1. 首次访问 → 返回 fallback 页面（需在组件中处理 router.isFallback）
    2. 后台执行 getStaticProps 生成页面
    3. 生成完成后替换 fallback 页面
    4. 后续访问 → 直接返回已生成的页面
  → 适合：路径数量很多，只预生成热门的

fallback: "blocking"
  → paths 中的路径在构建时预生成
  → 未列出的路径：
    1. 首次访问 → 服务端执行 getStaticProps（用户等待）
    2. 页面生成后返回给用户（像 SSR 一样）
    3. 生成的页面被缓存
    4. 后续访问 → 直接返回缓存的页面
  → 适合：不想展示 loading 状态的场景
```

### 与相关API的对比

| fallback 值 | 未预生成路径的行为 | 用户等待 | SEO |
|------------|-----------------|---------|-----|
| false | 返回 404 | 否 | 好（只有已生成的页面） |
| true | 展示 fallback UI → 后台生成 | 部分（看到 loading） | 一般（首次访问无内容） |
| "blocking" | 服务端生成（用户等待） | 是 | 好（返回完整 HTML） |

| 对比维度 | getStaticPaths | generateStaticParams |
|----------|---------------|---------------------|
| 路由模式 | Pages Router | App Router |
| 返回格式 | `{ paths, fallback }` | `[{ slug: "..." }, ...]` |
| fallback 控制 | 有（false/true/blocking） | dynamicParams 配置 |
| 复杂度 | 较高 | 简洁 |

### 适用场景

- **博客文章：** 预生成所有或热门文章
- **商品详情页：** 预生成热门商品，其余按需生成
- **用户主页：** 预生成活跃用户，其余用 blocking 方式
- **文档页面：** 所有文档页面在构建时生成

### 常见问题

#### fallback: true 时组件中如何处理

**解决方案：**

```tsx
import { useRouter } from "next/router";

export default function PostPage({ post }: { post: Post }) {
    const router = useRouter();

    // fallback: true 时，首次访问未预生成的路径
    // 页面组件会在 getStaticProps 完成前就渲染
    // 此时 props 还不可用，router.isFallback 为 true
    if (router.isFallback) {
        return <p>加载中...</p>;
    }

    return (
        <article>
            <h1>{post.title}</h1>
            <p>{post.content}</p>
        </article>
    );
}

// fallback: "blocking" 不需要这个处理
// 因为页面在服务端完全生成后才返回给客户端
```

### 注意事项

- getStaticPaths 只能在动态路由页面中使用
- 必须与 getStaticProps 一起使用
- paths 中的 params 必须与动态路由段匹配
- fallback: false 最严格，未预生成的路径直接 404
- fallback: "blocking" 最常用，兼顾 SEO 和按需生成
- App Router 中使用 generateStaticParams 替代

### 总结

getStaticPaths 告诉 Next.js 动态路由需要预生成哪些路径，配合 getStaticProps 在构建时生成静态页面。fallback 参数控制未预生成路径的处理策略：false（404）、true（客户端 loading + 后台生成）、"blocking"（服务端生成后返回）。在 App Router 中被 generateStaticParams 替代。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## Hydration不匹配的原因与解决

### 概念说明

Hydration 不匹配（Hydration Mismatch）是指服务端渲染的 HTML 内容与客户端 React 渲染的结果不一致。React 在 hydration 时会将服务端生成的 DOM 与客户端的虚拟 DOM 进行对比，如果两者不同，React 会在开发环境中报出警告，并在生产环境中尝试用客户端的结果替换服务端的 DOM。

这种不匹配会导致几个问题：开发环境中出现大量警告日志、生产环境中可能出现页面闪烁（服务端内容先展示，然后被客户端内容替换）、性能下降（React 需要重新创建 DOM 而非复用）。严重时甚至可能导致页面布局错乱或交互异常。

Hydration 不匹配的根本原因是：服务端和客户端运行在不同的环境中，某些代码在两个环境中产生了不同的结果。

### 基本示例

```tsx
// 示例说明：常见的 hydration 不匹配场景和修复方法

// ===== 场景1：使用时间/日期 =====
"use client";
import { useState, useEffect } from "react";

// 错误写法：服务端和客户端的时间不同
function BadTimestamp() {
    // 服务端渲染时是服务器时间
    // 客户端 hydration 时是浏览器时间
    // 两者可能相差几毫秒到几秒
    return <p>当前时间: {new Date().toLocaleString()}</p>;
    // 警告：Text content did not match
}

// 正确写法：延迟到客户端渲染
function GoodTimestamp() {
    const [time, setTime] = useState<string>("");

    useEffect(() => {
        // useEffect 只在客户端执行
        setTime(new Date().toLocaleString());
        const timer = setInterval(() => {
            setTime(new Date().toLocaleString());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // 服务端渲染空字符串，客户端 hydration 后展示时间
    return <p>当前时间: {time || "加载中..."}</p>;
}

// ===== 场景2：使用浏览器 API =====
// 错误写法：typeof window 条件渲染
function BadWindowCheck() {
    // 服务端：typeof window === "undefined" → 渲染 "移动端"
    // 客户端：window.innerWidth 可能是 1024 → 渲染 "桌面端"
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    return <p>{isMobile ? "移动端" : "桌面端"}</p>;
    // 不匹配！
}

// 正确写法：用 useEffect 在客户端检测
function GoodWindowCheck() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        setIsMobile(window.innerWidth < 768);
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return <p>{isMobile ? "移动端" : "桌面端"}</p>;
}

// ===== 场景3：HTML 嵌套错误 =====
// 错误写法：p 标签内嵌套 div（HTML 规范不允许）
function BadNesting() {
    return (
        <p>
            段落文本
            {/* div 不能嵌套在 p 内，浏览器会自动修正 DOM 结构 */}
            {/* 导致服务端和客户端的 DOM 结构不同 */}
            {/* <div>嵌套内容</div> */}
        </p>
    );
}

// 正确写法：使用正确的 HTML 嵌套
function GoodNesting() {
    return (
        <div>
            <p>段落文本</p>
            <div>独立内容</div>
        </div>
    );
}

export { GoodTimestamp, GoodWindowCheck, GoodNesting };
```

### 内部原理

#### hydration 对比流程

```
React hydration 的对比过程：

1. 服务端生成 HTML：
   <p>时间: 2026-01-01 10:00:00</p>

2. 客户端 React 运行组件：
   <p>时间: 2026-01-01 10:00:03</p>

3. React 对比发现不一致：
   → 开发环境：console.error 警告
   → 生产环境：
      React 18+：尝试客户端重新渲染该子树
      可能导致页面闪烁

常见不匹配原因：
  → Date.now() / new Date()：服务端和客户端时间不同
  → Math.random()：每次执行结果不同
  → window / document：服务端不存在这些对象
  → localStorage / sessionStorage：服务端不存在
  → 用户代理（User Agent）：服务端无法获取
  → HTML 嵌套错误：浏览器自动修正导致 DOM 结构变化
  → 第三方脚本：浏览器扩展修改了 DOM
```

### 与相关API的对比

| 不匹配原因 | 解决方案 |
|-----------|---------|
| 时间/日期 | useEffect + useState 延迟到客户端 |
| 浏览器 API（window、document） | useEffect 中访问 |
| Math.random() | 使用固定种子或 useEffect |
| localStorage | useEffect 中读取 |
| HTML 嵌套错误 | 检查并修正嵌套结构 |
| 条件渲染依赖客户端信息 | 统一初始值 + useEffect 更新 |
| 第三方浏览器扩展 | suppressHydrationWarning |

### 适用场景

- **时间展示：** 需要展示实时时间的组件
- **响应式布局：** 根据屏幕宽度条件渲染
- **用户偏好：** 读取 localStorage 中的主题设置
- **A/B 测试：** 随机展示不同的内容

### 常见问题

#### 使用 mounted 状态模式统一处理

**解决方案：**

```tsx
"use client";
import { useState, useEffect } from "react";

// 通用的 mounted 模式：确保只在客户端渲染
function useHasMounted() {
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    return hasMounted;
}

// 使用方式
function ClientOnlyContent() {
    const hasMounted = useHasMounted();

    if (!hasMounted) {
        // 服务端渲染和客户端首次渲染返回相同内容
        return <p>加载中...</p>;
    }

    // 只在客户端挂载后渲染（不会出现不匹配）
    return (
        <div>
            <p>屏幕宽度: {window.innerWidth}px</p>
            <p>主题: {localStorage.getItem("theme") || "light"}</p>
            <p>时间: {new Date().toLocaleString()}</p>
        </div>
    );
}

export default ClientOnlyContent;
```

### 注意事项

- 服务端和客户端的渲染结果必须一致（首次渲染时）
- 使用 useEffect 将客户端特有的逻辑延迟到 hydration 之后
- 避免在渲染阶段（函数体顶层）使用 window、document 等浏览器 API
- 检查 HTML 嵌套是否符合规范（p 内不能有 div、a 内不能有 a）
- mounted 状态模式可以统一处理大部分不匹配问题
- suppressHydrationWarning 只用于无法避免的场景（如第三方插入的内容）

### 总结

Hydration 不匹配是服务端和客户端渲染结果不一致导致的问题。常见原因包括时间/日期差异、浏览器 API 访问、HTML 嵌套错误。核心解决思路是：保证首次渲染输出一致，将客户端特有逻辑放到 useEffect 中。mounted 状态模式是通用的解决方案。对于无法避免的不匹配，可以使用 suppressHydrationWarning 抑制警告。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


## suppressHydrationWarning的使用

### 概念说明

`suppressHydrationWarning` 是 React 提供的一个 JSX 属性，用于抑制 hydration 不匹配时的控制台警告。当你明确知道某个元素的服务端和客户端内容会不同，且这种不同是预期行为时，可以在该元素上添加 `suppressHydrationWarning={true}` 来告诉 React "这个不匹配是正常的，不需要警告"。

这个属性只作用于当前元素本身的文本内容，不会递归抑制子元素的警告。它也不会阻止 React 用客户端的内容替换服务端的内容——React 仍然会执行修复，只是不再输出警告日志。这是一个"逃生舱"，应该在确实无法避免不匹配的情况下才使用，而不是用来掩盖真正的 bug。

常见的合理使用场景包括：时间戳展示、第三方脚本注入的内容、服务端无法获取的浏览器特定信息（如用户时区格式化的日期）。

### 基本示例

```tsx
// 示例说明：suppressHydrationWarning 的正确和错误用法

// ===== 合理使用：时间戳展示 =====
function Timestamp() {
    return (
        <time
            dateTime={new Date().toISOString()}
            // 服务端和客户端的时间一定不同
            // 这种不匹配是预期行为
            suppressHydrationWarning={true}
        >
            {new Date().toLocaleString("zh-CN")}
        </time>
    );
    // 服务端渲染: "2026/1/1 10:00:00"
    // 客户端 hydration: "2026/1/1 10:00:03"
    // React 会用客户端的值替换，但不输出警告
}

// ===== 合理使用：配合 useEffect 的过渡方案 =====
"use client";
import { useState, useEffect } from "react";

function ThemeIndicator() {
    const [theme, setTheme] = useState("light");

    useEffect(() => {
        // 客户端读取 localStorage
        const savedTheme = localStorage.getItem("theme") || "light";
        setTheme(savedTheme);
    }, []);

    return (
        <span
            // 服务端始终渲染 "light"
            // 客户端可能立即变为 "dark"（useEffect 后）
            // 首次 hydration 不会不匹配（都是 "light"）
            // 但如果需要在服务端也展示正确的主题
            // 可以用 suppressHydrationWarning 处理过渡
            suppressHydrationWarning={true}
        >
            当前主题: {theme}
        </span>
    );
}

// ===== 合理使用：第三方内容注入 =====
function ThirdPartyWidget() {
    return (
        <div
            id="third-party-container"
            // 第三方脚本可能在 hydration 前修改了 DOM
            // 导致 React 检测到不匹配
            suppressHydrationWarning={true}
        />
    );
}

// ===== 错误用法：掩盖真正的 bug =====
function BadUsage() {
    // 不要用 suppressHydrationWarning 掩盖逻辑错误
    // const data = typeof window !== "undefined" ? window.__DATA__ : null;
    // return (
    //     <div suppressHydrationWarning>
    //         {data ? data.name : "loading"}
    //     </div>
    // );
    // 正确做法：用 useEffect 在客户端获取数据
    return null;
}

export { Timestamp, ThemeIndicator, ThirdPartyWidget };
```

### 内部原理

#### suppressHydrationWarning 的作用范围

```
suppressHydrationWarning 的行为：

1. 只抑制当前元素的文本内容警告
   <p suppressHydrationWarning>
       服务端文本 vs 客户端文本  → 不警告
       <span>子元素不匹配</span> → 仍然警告
   </p>

2. 不会阻止 React 的修复行为
   → 服务端: <p>10:00:00</p>
   → 客户端: <p>10:00:03</p>
   → React 仍会用客户端内容替换
   → 只是不输出 console.error

3. 只影响开发环境的警告
   → 生产环境本来就不输出 hydration 警告
   → suppressHydrationWarning 主要是让开发环境控制台干净

4. 不会递归传播
   → 需要在每个可能不匹配的元素上单独添加
```

### 与相关API的对比

| 解决方案 | 适用场景 | 是否消除不匹配 |
|---------|---------|-------------|
| useEffect + useState | 通用方案 | 是（首次渲染一致） |
| suppressHydrationWarning | 无法避免的不匹配 | 否（只抑制警告） |
| dynamic(ssr: false) | 整个组件不需要 SSR | 是（跳过 SSR） |
| mounted 状态模式 | 客户端特有内容 | 是（首次渲染一致） |

### 适用场景

- **时间戳/日期：** 服务端和客户端的时间差异不可避免
- **第三方脚本：** 浏览器扩展或第三方 SDK 修改了 DOM
- **用户时区：** 服务端无法获取用户的时区信息
- **随机内容：** 广告位、A/B 测试等不确定内容

### 常见问题

#### suppressHydrationWarning 和 useEffect 方案怎么选

**解决方案：**

```
优先用 useEffect 方案：
  → 服务端和客户端首次渲染一致
  → 客户端 hydration 后再更新
  → 不会有内容闪烁
  → 是正确的解决方案

使用 suppressHydrationWarning 的情况：
  → 时间戳场景：差几毫秒不影响用户体验
  → 不想要 useEffect 带来的一帧延迟
  → 第三方修改 DOM 无法控制
  → 明确知道不匹配不会造成问题

两者结合：
  → 大部分内容用 useEffect 保证一致
  → 个别无法避免的地方用 suppressHydrationWarning
```

### 注意事项

- suppressHydrationWarning 是"逃生舱"，不是常规手段
- 只抑制当前元素的文本内容警告，不递归到子元素
- 不会阻止 React 用客户端内容替换服务端内容
- 优先考虑 useEffect 方案消除不匹配，而非抑制警告
- 不要用它掩盖真正的 hydration bug
- 生产环境中 React 本身不输出 hydration 警告

### 总结

suppressHydrationWarning 是 React 提供的一个 JSX 属性，用于抑制无法避免的 hydration 不匹配警告。它只作用于当前元素的文本内容，不递归传播，也不阻止 React 的修复行为。适合时间戳、第三方脚本等确实无法保证服务端和客户端一致的场景。优先使用 useEffect 方案从根本上消除不匹配，只在确实无法避免时才使用 suppressHydrationWarning。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


