---
title: 第7章 Vue技术栈深度原理（框架篇-Vue）
---

# Vue技术栈深度原理（框架篇-Vue）


## 7.1 响应式系统核心

### Vue3 Proxy代理的拦截机制

### 概念说明

Vue 3 的响应式系统基于 ES6 的 Proxy 对象实现。Proxy 可以拦截并自定义对象的基本操作（读取属性、写入属性、删除属性、遍历等），Vue 3 利用这个能力在属性被读取时收集依赖（track），在属性被修改时触发更新（trigger）。

与 Vue 2 使用的 `Object.defineProperty` 不同，Proxy 是对整个对象进行代理，而不是逐个属性定义 getter/setter。这带来了几个根本性的改进：可以检测到新属性的添加和删除（Vue 2 需要 `$set`）、可以拦截数组的索引赋值和 length 修改、可以拦截 `in` 操作符和 `for...in` 遍历。

当你调用 `reactive(obj)` 时，Vue 会创建一个 Proxy 实例包裹原始对象。这个 Proxy 定义了多个陷阱函数（trap），分别拦截不同类型的操作。所有对响应式对象的操作都通过 Proxy 代理层，Vue 在这一层完成依赖追踪和更新通知。

### 基本示例

```javascript
// 示例说明：Proxy 基本拦截机制

// ===== 原生 Proxy 的工作原理 =====
const target = { name: "张三", age: 25 };

// 创建 Proxy 实例，定义 handler（陷阱函数集合）
const handler = {
    // get 陷阱：拦截属性读取
    get(target, key, receiver) {
        console.log(`读取属性: ${String(key)}`);
        // Reflect.get 保证正确的 this 指向
        return Reflect.get(target, key, receiver);
    },

    // set 陷阱：拦截属性写入
    set(target, key, value, receiver) {
        console.log(`设置属性: ${String(key)} = ${value}`);
        const result = Reflect.set(target, key, value, receiver);
        return result;
    },

    // deleteProperty 陷阱：拦截属性删除
    deleteProperty(target, key) {
        console.log(`删除属性: ${String(key)}`);
        return Reflect.deleteProperty(target, key);
    },

    // has 陷阱：拦截 in 操作符
    has(target, key) {
        console.log(`检查属性: ${String(key)}`);
        return Reflect.has(target, key);
    },
};

const proxy = new Proxy(target, handler);

proxy.name;           // 输出: 读取属性: name
proxy.age = 26;       // 输出: 设置属性: age = 26
delete proxy.age;     // 输出: 删除属性: age
"name" in proxy;      // 输出: 检查属性: name

// ===== Vue 3 reactive 的简化实现 =====
// Vue 内部的 reactive 函数核心逻辑（简化版）
function reactive(obj) {
    return new Proxy(obj, {
        get(target, key, receiver) {
            // 依赖收集：记录当前正在执行的副作用函数
            track(target, key);
            const result = Reflect.get(target, key, receiver);
            // 如果值是对象，递归代理（懒代理，用到时才代理）
            if (typeof result === "object" && result !== null) {
                return reactive(result);
            }
            return result;
        },
        set(target, key, value, receiver) {
            const oldValue = target[key];
            const result = Reflect.set(target, key, value, receiver);
            // 值发生变化时触发更新
            if (oldValue !== value) {
                trigger(target, key);
            }
            return result;
        },
    });
}
```

### 内部原理

#### Proxy 陷阱与 Reflect 的配合

```
Proxy 的核心设计：

1. Proxy 是包裹对象的代理层
   → 所有操作先经过 Proxy → 再转发到原始对象
   → handler 中定义的陷阱函数决定了如何拦截操作

2. 为什么用 Reflect：
   → Reflect 的方法与 Proxy 陷阱一一对应
   → Reflect.get(target, key, receiver) 保证正确的 this 指向
   → 特别是存在继承关系时，receiver 确保 getter 中的 this 指向代理对象

3. Vue 3 使用的主要陷阱：
   → get：读取属性 → 触发 track（依赖收集）
   → set：写入属性 → 触发 trigger（更新通知）
   → has：in 操作符 → 触发 track
   → deleteProperty：delete 操作 → 触发 trigger
   → ownKeys：Object.keys() / for...in → 触发 track

4. 懒代理策略：
   → 不像 Vue 2 在初始化时递归遍历所有属性
   → 只有在 get 时发现值是对象才递归代理
   → 减少初始化开销
```

### 与相关API的对比

| 对比维度 | Proxy（Vue 3） | Object.defineProperty（Vue 2） |
|----------|---------------|-------------------------------|
| 拦截粒度 | 整个对象 | 单个属性 |
| 新增属性 | 自动拦截 | 需要 `$set` |
| 删除属性 | 自动拦截 | 需要 `$delete` |
| 数组索引 | 自动拦截 | 无法拦截 |
| 数组 length | 自动拦截 | 无法拦截 |
| 性能 | 懒代理，按需创建 | 初始化递归遍历 |
| 浏览器支持 | 不支持 IE | 支持 IE9+ |

### 适用场景

- **所有 Vue 3 响应式数据：** reactive、ref 底层都依赖 Proxy
- **深层嵌套对象：** 懒代理按需创建，性能好
- **动态属性：** 新增/删除属性自动响应
- **数组操作：** 索引赋值和 length 修改自动响应

### 常见问题

#### 为什么 Proxy 不能代理原始值

**问题描述：** Proxy 只能代理对象，无法代理 string、number、boolean 等原始值。

**解决方案：**

```javascript
// Proxy 要求 target 必须是对象
// new Proxy(123, handler); // TypeError: Cannot create proxy with a non-object

// 所以 Vue 3 用 ref 来包装原始值
// ref 内部将原始值包装成 { value: 原始值 } 的对象
// 然后对这个包装对象使用 getter/setter 进行拦截
const count = ref(0);
// 内部结构类似：{ value: 0 }
// 访问 count.value 时触发 getter → track
// 修改 count.value 时触发 setter → trigger
```

### 注意事项

- Proxy 不支持 IE 浏览器，且无法 polyfill
- Proxy 是对整个对象的代理，原始对象和代理对象是两个不同的引用
- 不要直接操作原始对象，应该始终操作代理对象
- Vue 3 采用懒代理策略，嵌套对象在被访问时才创建代理
- Proxy 的 get 陷阱使用 Reflect.get 配合 receiver 确保正确的 this

### 总结

Vue 3 使用 ES6 Proxy 作为响应式系统的基础，通过 get/set/has/deleteProperty/ownKeys 等陷阱函数拦截对象操作。相比 Vue 2 的 Object.defineProperty，Proxy 可以拦截整个对象，支持新增属性、删除属性、数组索引等操作，采用懒代理策略按需创建子对象代理。Proxy 配合 Reflect 确保操作的正确性。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### Vue2 Object.defineProperty的拦截限制

### 概念说明

Vue 2 的响应式系统基于 `Object.defineProperty` 实现。这个 API 可以在对象的属性上定义 getter 和 setter，当属性被读取时执行 getter（收集依赖），当属性被修改时执行 setter（触发更新）。Vue 2 在初始化时会递归遍历 data 对象的所有属性，用 `Object.defineProperty` 将每个属性转换为响应式的 getter/setter。

但 `Object.defineProperty` 有几个根本性的限制：它只能拦截已存在的属性，无法检测到对象属性的新增和删除；它无法拦截数组的索引赋值和 length 修改；它需要在初始化时递归遍历所有属性，对于深层嵌套的大对象有性能开销。这些限制是 Vue 2 中许多"坑"的根源，也是 Vue 3 转向 Proxy 的主要原因。

### 基本示例

```javascript
// 示例说明：Object.defineProperty 的基本用法和限制

// ===== 基本的响应式属性定义 =====
function defineReactive(obj, key, val) {
    // 递归处理嵌套对象
    if (typeof val === "object" && val !== null) {
        Object.keys(val).forEach((k) => defineReactive(val, k, val[k]));
    }

    Object.defineProperty(obj, key, {
        enumerable: true,
        configurable: true,
        // getter：属性被读取时执行
        get() {
            console.log(`读取 ${key}: ${val}`);
            // 这里进行依赖收集（track）
            return val;
        },
        // setter：属性被修改时执行
        set(newVal) {
            if (newVal === val) return; // 值没变化则跳过
            console.log(`设置 ${key}: ${val} → ${newVal}`);
            val = newVal;
            // 这里触发更新（trigger）
        },
    });
}

const data = { name: "张三", age: 25 };
defineReactive(data, "name", data.name);
defineReactive(data, "age", data.age);

data.name;       // 输出: 读取 name: 张三
data.age = 26;   // 输出: 设置 age: 25 → 26

// ===== 限制1：无法检测新增属性 =====
data.email = "test@example.com"; // 没有任何输出！不是响应式的
// Vue 2 中需要使用 this.$set(this.data, 'email', 'test@example.com')

// ===== 限制2：无法检测删除属性 =====
delete data.name; // 没有触发 setter！
// Vue 2 中需要使用 this.$delete(this.data, 'name')

// ===== 限制3：无法拦截数组索引赋值 =====
const arr = [1, 2, 3];
// Object.defineProperty 无法拦截 arr[0] = 10 的操作
// Vue 2 中需要使用 this.$set(this.arr, 0, 10) 或 arr.splice(0, 1, 10)
```

### 内部原理

#### Vue 2 的响应式处理流程

```
Vue 2 初始化响应式：

1. 遍历 data 中的所有属性
2. 对每个属性调用 defineReactive
3. defineReactive 内部：
   → 创建一个 Dep 实例（依赖管理器）
   → 用 Object.defineProperty 定义 getter/setter
   → getter 中调用 dep.depend()（收集依赖）
   → setter 中调用 dep.notify()（通知更新）
4. 如果属性值是对象，递归执行步骤 1-3

限制的根本原因：
  → Object.defineProperty 是针对单个属性的操作
  → 只能拦截已定义的属性的 get/set
  → 无法感知对象结构的变化（新增、删除）
  → 无法拦截数组的索引操作和 length 变化

Vue 2 对数组的特殊处理：
  → 重写了 7 个数组变异方法：push、pop、shift、unshift、splice、sort、reverse
  → 调用这些方法时手动触发更新
  → arr[index] = value 和 arr.length = 0 仍然无法检测
```

### 与相关API的对比

| 限制场景 | Vue 2 表现 | Vue 2 解决方案 | Vue 3 表现 |
|----------|-----------|--------------|-----------|
| 新增属性 | 不响应 | `$set` / `Vue.set` | 自动响应 |
| 删除属性 | 不响应 | `$delete` / `Vue.delete` | 自动响应 |
| 数组索引赋值 | 不响应 | `$set` / `splice` | 自动响应 |
| 修改数组 length | 不响应 | 无直接方案 | 自动响应 |
| 深层嵌套对象 | 初始化递归遍历 | 无需额外处理 | 懒代理按需 |

### 适用场景

- **Vue 2 项目维护：** 需要了解这些限制来排查 bug
- **面试高频考点：** Vue 2 和 Vue 3 响应式差异
- **迁移评估：** 从 Vue 2 迁移到 Vue 3 时理解改进

### 常见问题

#### Vue 2 中数据变化了但视图不更新

**问题描述：** 直接给对象添加新属性或通过索引修改数组元素后，视图不更新。

**解决方案：**

```javascript
// Vue 2 中的典型问题和解决方案

// 问题1：给对象新增属性
// this.user.phone = '123456'; // 视图不更新
// 解决：
// this.$set(this.user, 'phone', '123456');

// 问题2：通过索引修改数组
// this.list[0] = '新值'; // 视图不更新
// 解决：
// this.$set(this.list, 0, '新值');
// 或者
// this.list.splice(0, 1, '新值');

// 问题3：修改数组长度
// this.list.length = 0; // 视图不更新
// 解决：
// this.list.splice(0);

// Vue 3 中以上问题全部不存在
// 因为 Proxy 可以拦截所有这些操作
```

### 注意事项

- Object.defineProperty 只能拦截已存在的属性
- Vue 2 中新增属性必须用 `$set`，删除用 `$delete`
- Vue 2 重写了 7 个数组方法来实现数组响应式
- 数组索引赋值和 length 修改在 Vue 2 中不触发更新
- 初始化时递归遍历所有属性会有性能开销
- Vue 3 使用 Proxy 解决了以上所有限制

### 总结

Vue 2 基于 Object.defineProperty 实现响应式，核心限制包括：无法检测属性新增和删除、无法拦截数组索引赋值和 length 修改、初始化需递归遍历所有属性。这些限制导致了 `$set`、`$delete` 等补丁 API 的存在。Vue 3 转向 Proxy 从根本上解决了这些问题。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### Proxy的get陷阱与依赖收集

### 概念说明

在 Vue 3 的响应式系统中，Proxy 的 `get` 陷阱负责依赖收集（track）。当组件渲染函数或 watchEffect 等副作用函数执行时，它们会读取响应式对象的属性，这个读取操作会被 Proxy 的 get 陷阱拦截。get 陷阱中调用 `track()` 函数，将当前正在执行的副作用函数（effect）与被读取的属性建立关联——记录下"谁依赖了哪个属性"。

依赖收集的数据结构是一个三层映射：`targetMap`（WeakMap）→ `depsMap`（Map）→ `dep`（Set）。targetMap 以响应式对象为 key，值是该对象所有属性的依赖映射；depsMap 以属性名为 key，值是依赖该属性的所有 effect 集合。这种结构可以精确到"对象的某个属性被哪些 effect 依赖"。

### 基本示例

```javascript
// 示例说明：get 陷阱与 track 的工作原理

// ===== 依赖收集的数据结构 =====
// 全局的依赖映射表
const targetMap = new WeakMap(); // WeakMap<target, Map<key, Set<effect>>>

// 当前正在执行的副作用函数
let activeEffect = null;

// track：依赖收集函数
function track(target, key) {
    // 没有正在执行的 effect，不需要收集
    if (!activeEffect) return;

    // 获取或创建目标对象的依赖映射
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }

    // 获取或创建属性的依赖集合
    let dep = depsMap.get(key);
    if (!dep) {
        dep = new Set();
        depsMap.set(key, dep);
    }

    // 将当前 effect 添加到依赖集合中
    dep.add(activeEffect);
}

// ===== reactive 中的 get 陷阱 =====
function reactive(obj) {
    return new Proxy(obj, {
        get(target, key, receiver) {
            // 特殊 key 处理：__v_isReactive 用于标识响应式对象
            if (key === "__v_isReactive") return true;

            // 核心：依赖收集
            track(target, key);

            const result = Reflect.get(target, key, receiver);

            // 懒代理：如果值是对象，递归创建响应式代理
            if (typeof result === "object" && result !== null) {
                return reactive(result);
            }

            return result;
        },
        // ... 其他陷阱
    });
}

// ===== 使用示例 =====
const state = reactive({ count: 0, message: "hello" });

// 模拟副作用函数执行
function effect(fn) {
    activeEffect = fn;
    fn(); // 执行函数时会读取响应式属性，触发 get → track
    activeEffect = null;
}

// 执行 effect 时，fn 内部读取 state.count
// get 陷阱拦截 → track(state, 'count') → 记录依赖关系
effect(() => {
    console.log("count 的值:", state.count);
    // 此时 targetMap 中记录了：state 对象的 count 属性被这个函数依赖
});
```

### 内部原理

#### 依赖收集的完整流程

```
组件渲染时的依赖收集：

1. 组件开始渲染
   → Vue 创建一个渲染 effect（ReactiveEffect 实例）
   → 将该 effect 设为 activeEffect

2. 渲染函数执行
   → 模板中使用了 {{ state.count }}
   → 触发 state 的 Proxy get 陷阱
   → key = "count"

3. get 陷阱内部
   → 调用 track(state, "count")
   → targetMap.get(state) → 获取 depsMap
   → depsMap.get("count") → 获取 dep（Set）
   → dep.add(activeEffect) → 记录依赖

4. 渲染结束
   → activeEffect 恢复为 null
   → 依赖关系建立完成

数据结构示意：
  targetMap = WeakMap {
    state对象 → Map {
      "count" → Set { renderEffect },
      "message" → Set { renderEffect }
    }
  }
```

### 与相关API的对比

| 对比维度 | get 陷阱（track） | set 陷阱（trigger） |
|----------|------------------|-------------------|
| 触发时机 | 读取属性时 | 修改属性时 |
| 作用 | 收集依赖 | 通知更新 |
| 操作的数据结构 | 向 dep 中添加 effect | 从 dep 中取出 effect 执行 |
| 前提条件 | 存在 activeEffect | dep 中有 effect |

### 适用场景

- **模板渲染：** 模板中引用的响应式数据自动收集依赖
- **computed：** 计算属性读取依赖时自动收集
- **watchEffect：** 回调函数中读取的响应式数据自动收集
- **watch：** 显式指定侦听源时收集依赖

### 常见问题

#### 为什么解构响应式对象会丢失响应性

**解决方案：**

```javascript
import { reactive, toRefs } from "vue";

const state = reactive({ count: 0, name: "张三" });

// 错误：解构后 count 只是普通数字，不再经过 Proxy 的 get 陷阱
// const { count } = state;
// count 的值是 0（原始值），修改 state.count 不会影响 count

// 正确：使用 toRefs 保持响应性
const { count, name } = toRefs(state);
// count 是一个 ref，访问 count.value 时仍然触发 track
```

### 注意事项

- 依赖收集只在 activeEffect 存在时进行
- get 陷阱中使用 Reflect.get 配合 receiver 保证正确的 this
- 嵌套对象采用懒代理策略，在 get 时才递归创建代理
- 解构响应式对象会丢失 Proxy 拦截，需要用 toRefs
- Vue 3.4+ 对依赖收集进行了优化，使用双向链表替代 Set

### 总结

Proxy 的 get 陷阱是 Vue 3 依赖收集的入口。当副作用函数执行时读取响应式属性，get 陷阱调用 track() 将 effect 与属性建立关联。依赖关系存储在 targetMap → depsMap → dep 三层结构中。理解 get 陷阱的工作原理是掌握 Vue 响应式系统的基础。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### Proxy的set陷阱与触发更新

### 概念说明

Proxy 的 `set` 陷阱负责拦截对响应式对象属性的写入操作。当属性值被修改时，set 陷阱先通过 `Reflect.set` 完成实际的赋值，然后调用 `trigger()` 函数通知所有依赖该属性的副作用函数重新执行。这就是 Vue 响应式系统中"数据变化 → 视图更新"的核心机制。

trigger 函数从 targetMap 中查找被修改属性对应的 dep（effect 集合），然后逐个执行这些 effect。如果 effect 有调度器（scheduler），就调用调度器而非直接执行 effect，这样 Vue 可以将多次数据修改合并为一次更新（批量更新）。

set 陷阱还要区分"新增属性"和"修改属性"两种情况：新增属性需要触发与该对象关联的迭代相关的 effect（比如 `for...in` 或 `Object.keys()`），修改属性则只需触发直接依赖该属性的 effect。

### 基本示例

```javascript
// 示例说明：set 陷阱与 trigger 的工作原理

// ===== trigger：触发更新函数 =====
const targetMap = new WeakMap();

function trigger(target, key, type) {
    // 从全局依赖映射中获取目标对象的 depsMap
    const depsMap = targetMap.get(target);
    if (!depsMap) return; // 没有任何依赖，直接返回

    // 获取该属性的依赖集合
    const dep = depsMap.get(key);

    // 收集需要执行的 effect
    const effectsToRun = new Set();

    if (dep) {
        dep.forEach((effect) => {
            // 避免无限递归：如果 effect 正在执行，跳过
            if (effect !== activeEffect) {
                effectsToRun.add(effect);
            }
        });
    }

    // 如果是新增属性（ADD），还需要触发迭代相关的 effect
    if (type === "ADD") {
        const iterateEffects = depsMap.get(ITERATE_KEY);
        if (iterateEffects) {
            iterateEffects.forEach((effect) => effectsToRun.add(effect));
        }
    }

    // 执行所有需要更新的 effect
    effectsToRun.forEach((effect) => {
        if (effect.scheduler) {
            // 如果有调度器，交给调度器处理（批量更新）
            effect.scheduler(effect);
        } else {
            // 否则直接执行
            effect.run();
        }
    });
}

// ===== reactive 中的 set 陷阱 =====
function reactive(obj) {
    return new Proxy(obj, {
        set(target, key, value, receiver) {
            // 判断是新增属性还是修改属性
            const hadKey = Object.prototype.hasOwnProperty.call(target, key);
            const oldValue = target[key];

            // 先执行实际赋值
            const result = Reflect.set(target, key, value, receiver);

            // 只有当 receiver 是 target 的代理时才触发更新
            // 避免原型链继承导致的重复触发
            if (target === toRaw(receiver)) {
                if (!hadKey) {
                    // 新增属性
                    trigger(target, key, "ADD");
                } else if (oldValue !== value && (oldValue === oldValue || value === value)) {
                    // 修改属性（值确实变化了，排除 NaN 的情况）
                    trigger(target, key, "SET");
                }
            }

            return result;
        },
    });
}
```

### 内部原理

#### 触发更新的完整流程

```
属性修改时的更新流程：

1. 用户修改属性
   → state.count = 10
   → 触发 Proxy 的 set 陷阱

2. set 陷阱内部
   → 判断 hadKey（是否已有该属性）
   → 获取 oldValue
   → Reflect.set 完成赋值
   → 比较 oldValue 和 newValue
   → 值没变化则跳过（性能优化）

3. 调用 trigger
   → trigger(target, "count", "SET")
   → 从 targetMap 中查找依赖
   → 收集所有需要执行的 effect
   → 执行 effect（或交给调度器）

4. effect 执行
   → 如果是渲染 effect → 组件重新渲染
   → 如果是 watchEffect → 回调函数重新执行
   → 如果是 computed → 标记为 dirty，下次读取时重新计算

NaN 的特殊处理：
  → NaN !== NaN 为 true
  → 但 NaN 变成 NaN 不应该触发更新
  → 判断条件：oldValue === oldValue || value === value
  → 如果两者都是 NaN，条件为 false，跳过更新
```

### 与相关API的对比

| 触发类型 | 场景 | trigger 的 type | 额外触发 |
|----------|------|----------------|---------|
| ADD | 新增属性 | "ADD" | 迭代相关 effect |
| SET | 修改属性 | "SET" | 仅该属性的 effect |
| DELETE | 删除属性 | "DELETE" | 迭代相关 effect |

### 适用场景

- **直接赋值：** `state.count = 10` → set 陷阱 → trigger
- **新增属性：** `state.newProp = 'value'` → set(ADD) → trigger
- **嵌套属性：** `state.user.name = '新名字'` → 先 get(user) → 再 set(name)

### 常见问题

#### 修改属性后视图没有立即更新

**解决方案：**

```javascript
import { reactive, nextTick } from "vue";

const state = reactive({ count: 0 });

// 多次修改只触发一次更新
state.count = 1;
state.count = 2;
state.count = 3;
// Vue 会在微任务中批量处理
// 最终只渲染一次，count = 3

// 如果需要在 DOM 更新后执行操作
async function handleClick() {
    state.count++;
    // 此时 DOM 还没有更新
    await nextTick();
    // 此时 DOM 已经更新
    console.log("DOM 已更新");
}
```

### 注意事项

- set 陷阱必须返回 true/false 表示操作是否成功
- 值没有变化时不会触发 trigger（性能优化）
- NaN 到 NaN 的变化不会触发更新
- 新增属性和修改属性的 trigger 行为不同
- Vue 使用调度器将多次更新合并为一次（批量更新）
- 避免在 effect 内部修改同一个属性（可能导致无限循环）

### 总结

Proxy 的 set 陷阱在属性被修改时触发，先通过 Reflect.set 完成赋值，然后调用 trigger 通知依赖更新。trigger 从 targetMap 中查找受影响的 effect 并执行。set 陷阱区分新增和修改两种类型，跳过值未变化的情况。配合调度器实现批量更新，避免频繁的 DOM 操作。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### Proxy的has/deleteProperty等陷阱

### 概念说明

除了 get 和 set 之外，Vue 3 的响应式系统还利用了 Proxy 的其他陷阱函数来实现完整的响应式拦截。主要包括：`has` 陷阱拦截 `in` 操作符（用于依赖收集）、`deleteProperty` 陷阱拦截 `delete` 操作符（用于触发更新）、`ownKeys` 陷阱拦截 `Object.keys()`、`for...in` 等遍历操作（用于依赖收集）。

这些陷阱让 Vue 3 的响应式系统覆盖了对象操作的方方面面。比如在模板中使用 `v-if="'name' in state"` 时，has 陷阱会收集依赖；当 `delete state.name` 时，deleteProperty 陷阱会触发更新；当用 `v-for` 遍历对象时，ownKeys 陷阱会收集依赖。

### 基本示例

```javascript
// 示例说明：has、deleteProperty、ownKeys 陷阱的工作原理

// ===== 完整的 reactive handler =====
const ITERATE_KEY = Symbol("iterate"); // 遍历操作的特殊 key

const handler = {
    // get 陷阱：拦截属性读取
    get(target, key, receiver) {
        track(target, key);
        const result = Reflect.get(target, key, receiver);
        if (typeof result === "object" && result !== null) {
            return reactive(result);
        }
        return result;
    },

    // set 陷阱：拦截属性写入
    set(target, key, value, receiver) {
        const hadKey = Object.prototype.hasOwnProperty.call(target, key);
        const oldValue = target[key];
        const result = Reflect.set(target, key, value, receiver);
        if (!hadKey) {
            trigger(target, key, "ADD");
        } else if (oldValue !== value) {
            trigger(target, key, "SET");
        }
        return result;
    },

    // has 陷阱：拦截 in 操作符
    // 例如：'name' in state
    has(target, key) {
        // in 操作也需要收集依赖
        // 当属性被添加或删除时，in 的结果可能改变
        track(target, key);
        return Reflect.has(target, key);
    },

    // deleteProperty 陷阱：拦截 delete 操作符
    // 例如：delete state.name
    deleteProperty(target, key) {
        // 检查属性是否存在
        const hadKey = Object.prototype.hasOwnProperty.call(target, key);
        const result = Reflect.deleteProperty(target, key);
        // 属性存在且删除成功时触发更新
        if (hadKey && result) {
            trigger(target, key, "DELETE");
        }
        return result;
    },

    // ownKeys 陷阱：拦截 Object.keys()、for...in 等
    ownKeys(target) {
        // 遍历操作的依赖收集使用特殊的 ITERATE_KEY
        // 因为遍历不针对某个具体属性，而是关心对象有哪些属性
        track(target, Array.isArray(target) ? "length" : ITERATE_KEY);
        return Reflect.ownKeys(target);
    },
};

// ===== 使用示例 =====
const state = reactive({ name: "张三", age: 25 });

// has 陷阱触发
// 在 effect 中使用 in 操作符会收集依赖
effect(() => {
    if ("name" in state) {
        // has 陷阱拦截 → track(state, "name")
        console.log("name 属性存在");
    }
});

// deleteProperty 陷阱触发
// 删除 name 属性会触发上面 effect 的重新执行
delete state.name; // deleteProperty 陷阱 → trigger(state, "name", "DELETE")

// ownKeys 陷阱触发
effect(() => {
    // Object.keys 触发 ownKeys 陷阱 → track(state, ITERATE_KEY)
    const keys = Object.keys(state);
    console.log("属性列表:", keys);
});

// 新增属性会触发 ITERATE_KEY 相关的 effect
state.email = "test@test.com"; // 因为属性数量变了，上面的 effect 重新执行
```

### 内部原理

#### 各陷阱的拦截对应关系

```
JavaScript 操作与 Proxy 陷阱的映射：

obj.key / obj[key]           → get 陷阱 → track
obj.key = value              → set 陷阱 → trigger
"key" in obj                 → has 陷阱 → track
delete obj.key               → deleteProperty 陷阱 → trigger
Object.keys(obj)             → ownKeys 陷阱 → track
for (let key in obj)         → ownKeys + has + get 陷阱
Object.getOwnPropertyNames() → ownKeys 陷阱 → track
Reflect.ownKeys()            → ownKeys 陷阱 → track

ownKeys 使用 ITERATE_KEY 的原因：
  → 遍历不是针对某个具体属性
  → 而是关心"对象有哪些属性"
  → 新增属性（ADD）和删除属性（DELETE）会触发 ITERATE_KEY 的 effect
  → 修改已有属性（SET）不会触发，因为属性列表没有变化
```

### 与相关API的对比

| 陷阱 | 拦截的操作 | 响应式行为 | 触发条件 |
|------|----------|----------|---------|
| get | 属性读取 | track | 有 activeEffect |
| set | 属性写入 | trigger | 值发生变化 |
| has | in 操作符 | track | 有 activeEffect |
| deleteProperty | delete 操作 | trigger | 属性存在且删除成功 |
| ownKeys | Object.keys/for...in | track(ITERATE_KEY) | 有 activeEffect |

### 适用场景

- **has：** 模板中的 `v-if="key in obj"` 条件判断
- **deleteProperty：** 动态删除对象属性后自动更新视图
- **ownKeys：** `v-for` 遍历对象属性、`Object.keys()` 等

### 常见问题

#### 为什么 ownKeys 要用特殊的 ITERATE_KEY

**解决方案：**

```javascript
// ownKeys 拦截的是遍历操作，不针对具体属性
// 所以不能用某个具体的 key 来收集依赖
// 而是用一个特殊的 Symbol（ITERATE_KEY）作为 key

// 什么时候触发 ITERATE_KEY 的 effect：
// 1. 新增属性（ADD）→ 属性数量变了 → 遍历结果变了 → 触发
// 2. 删除属性（DELETE）→ 属性数量变了 → 遍历结果变了 → 触发
// 3. 修改属性（SET）→ 属性数量没变 → 遍历结果没变 → 不触发

// 对于数组，ownKeys 使用 "length" 而非 ITERATE_KEY
// 因为数组的遍历结果取决于 length 属性
```

### 注意事项

- has 陷阱拦截 `in` 操作符，会进行依赖收集
- deleteProperty 陷阱只在属性确实存在且删除成功时触发更新
- ownKeys 使用 ITERATE_KEY 作为依赖收集的 key
- 数组的 ownKeys 使用 "length" 而非 ITERATE_KEY
- 只有新增和删除属性会触发 ITERATE_KEY 相关的 effect
- Vue 2 无法拦截 delete 和 in 操作，这是 Proxy 的优势

### 总结

Vue 3 利用 Proxy 的 has、deleteProperty、ownKeys 等陷阱实现了对 `in` 操作符、`delete` 操作、对象遍历的完整拦截。has 和 ownKeys 用于依赖收集，deleteProperty 用于触发更新。ownKeys 使用特殊的 ITERATE_KEY 作为依赖标识，只在属性数量变化时触发更新。这些陷阱让 Vue 3 的响应式系统覆盖了所有常见的对象操作。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### reactive API的深层响应式

### 概念说明

`reactive()` 是 Vue 3 提供的核心响应式 API，用于将一个普通对象转换为深层响应式代理对象。所谓"深层"是指不仅对象本身是响应式的，其内部的所有嵌套对象也会被递归地代理为响应式对象。当你修改任意层级的属性时，Vue 都能检测到变化并触发视图更新。

reactive 采用**懒代理**策略：不是在调用 reactive 时就递归遍历所有嵌套对象创建代理，而是在通过 get 陷阱访问某个嵌套属性时，发现其值是对象才创建代理。这种策略避免了初始化时不必要的性能开销，只有真正被使用到的嵌套对象才会被代理。

reactive 内部维护了一个 `reactiveMap`（WeakMap），用于缓存已创建的代理对象。同一个原始对象多次调用 reactive 会返回同一个代理实例，对同一个代理对象再次调用 reactive 也会直接返回自身。

### 基本示例

```vue
<script setup>
// 示例说明：reactive 的深层响应式特性

import { reactive, watchEffect } from "vue";

// 创建深层响应式对象
const state = reactive({
    user: {
        name: "张三",
        address: {
            city: "北京",
            district: "海淀区",
        },
    },
    tags: ["前端", "Vue"],
});

// 访问深层嵌套的属性，都是响应式的
watchEffect(() => {
    // 修改任意层级的属性都会触发这个 watchEffect 重新执行
    console.log("城市:", state.user.address.city);
});

// 修改深层属性 → 触发更新
state.user.address.city = "上海"; // watchEffect 重新执行

// 修改数组元素 → 触发更新
state.tags.push("React"); // 数组方法也是响应式的
state.tags[0] = "全栈";   // 索引赋值也是响应式的

// reactive 返回的是 Proxy 对象，不是原始对象
const raw = { count: 0 };
const proxy = reactive(raw);
console.log(proxy === raw);          // false
console.log(reactive(raw) === proxy); // true（同一个原始对象返回同一个代理）
console.log(reactive(proxy) === proxy); // true（代理对象直接返回自身）
</script>

<template>
    <div>
        <p>{{ state.user.name }} - {{ state.user.address.city }}</p>
        <p>标签: {{ state.tags.join(", ") }}</p>
    </div>
</template>
```

### 内部原理

#### reactive 的创建流程

```
reactive(target) 的执行过程：

1. 类型检查
   → 如果 target 不是对象 → 开发环境警告，返回原始值
   → 如果 target 已经是响应式代理 → 直接返回（除非要将 readonly 转为 reactive）

2. 缓存检查
   → 从 reactiveMap（WeakMap）中查找 target
   → 如果已有缓存的代理 → 直接返回

3. 白名单检查
   → 检查对象是否可以被代理
   → 被 markRaw 标记的对象 → 不代理
   → 不可扩展的对象 → 不代理

4. 创建 Proxy
   → new Proxy(target, mutableHandlers)
   → mutableHandlers 包含 get/set/has/deleteProperty/ownKeys

5. 缓存代理
   → reactiveMap.set(target, proxy)
   → 返回 proxy

深层代理（懒代理）：
   → 调用 reactive 时不递归
   → 当 get 陷阱被触发时：
      → 检查返回值是否是对象
      → 如果是对象 → 调用 reactive(value) 递归代理
      → 由于有缓存，重复访问不会重复创建
```

### 与相关API的对比

| 对比维度 | reactive | shallowReactive | readonly | ref |
|----------|---------|----------------|---------|-----|
| 代理深度 | 深层（递归） | 浅层（仅第一层） | 深层只读 | 单值包装 |
| 接受类型 | 对象/数组/Map/Set | 对象/数组/Map/Set | 对象/数组/Map/Set | 任意值 |
| 访问方式 | 直接属性访问 | 直接属性访问 | 直接属性访问 | `.value` |
| 可修改 | 是 | 第一层可修改 | 否 | 是 |

### 适用场景

- **表单数据：** 包含多个字段的表单对象
- **嵌套配置：** 多层嵌套的配置对象
- **列表数据：** 数组类型的列表数据
- **组件状态：** 复杂的组件内部状态对象

### 常见问题

#### reactive 对象解构后丢失响应性

**解决方案：**

```javascript
import { reactive, toRefs } from "vue";

const state = reactive({ count: 0, name: "张三" });

// 错误：解构后 count 是普通数字，不再响应式
// const { count, name } = state;

// 正确：使用 toRefs 将每个属性转为 ref
const { count, name } = toRefs(state);
// 现在 count.value 和 name.value 是响应式的
// 修改 count.value 会同步到 state.count
```

### 注意事项

- reactive 只接受对象类型（Object、Array、Map、Set），不接受原始值
- 不要替换整个 reactive 对象的引用（会丢失响应式连接）
- 解构 reactive 对象会丢失响应性，需要用 toRefs
- 同一个原始对象多次调用 reactive 返回相同的代理实例
- 深层代理采用懒代理策略，按需创建
- reactive 内部使用 WeakMap 缓存代理，不会造成内存泄漏

### 总结

reactive 将对象转换为深层响应式代理，所有嵌套属性的读写都会被 Proxy 拦截。采用懒代理策略，嵌套对象在被访问时才创建代理。使用 WeakMap 缓存保证同一对象返回同一代理。reactive 只接受对象类型，不能用于原始值（原始值用 ref）。解构 reactive 对象会丢失响应性，需要配合 toRefs 使用。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### reactive的对象代理限制(非原始值)

### 概念说明

`reactive()` 有一个根本性的限制：它只能作用于**对象类型**（Object、Array、Map、Set），不能用于原始值（string、number、boolean、null、undefined、symbol、bigint）。这个限制来自 JavaScript 本身——Proxy 只能代理对象，无法代理原始值。

这意味着如果你需要让一个数字、字符串或布尔值变成响应式的，不能用 reactive，必须用 `ref()`。ref 的解决方式是将原始值包装在一个对象中（`{ value: 原始值 }`），这样就可以对这个包装对象进行响应式拦截了。

除了原始值的限制，reactive 还有另一个重要限制：**不能替换整个对象的引用**。一旦你用 reactive 创建了一个响应式对象并将其赋给变量，后续如果用一个新对象替换该变量，原来的响应式连接就断了。组件模板中绑定的还是旧的代理对象，不会感知到变量指向了新对象。

### 基本示例

```vue
<script setup>
// 示例说明：reactive 的类型限制和引用替换问题

import { reactive, ref } from "vue";

// ===== 限制1：不能代理原始值 =====
// 以下写法全部无效，开发环境会报警告
// const count = reactive(0);       // 警告：value cannot be made reactive: 0
// const name = reactive("张三");   // 警告：value cannot be made reactive: 张三
// const flag = reactive(true);     // 警告：value cannot be made reactive: true

// 原始值必须用 ref
const count = ref(0);        // ref 内部包装为 { value: 0 }
const name = ref("张三");    // ref 内部包装为 { value: "张三" }

// ===== 限制2：不能替换整个对象引用 =====
let state = reactive({ count: 0, name: "张三" });

// 错误：替换了变量的引用，原来的响应式连接断了
// state = reactive({ count: 10, name: "李四" });
// 模板中绑定的还是旧的代理对象，不会更新

// 正确做法1：逐个修改属性
state.count = 10;
state.name = "李四";

// 正确做法2：使用 Object.assign 合并
Object.assign(state, { count: 10, name: "李四" });

// ===== 限制3：解构丢失响应性 =====
const { count: c } = state;
// c 只是一个普通数字 0，不再是响应式的
// 修改 state.count 不会影响 c 的值
</script>

<template>
    <div>
        <p>{{ state.count }} - {{ state.name }}</p>
    </div>
</template>
```

### 内部原理

#### 为什么原始值不能用 Proxy 代理

```
JavaScript 的变量赋值机制：

原始值是按值传递的：
  let a = 10;
  let b = a;    // b 得到 10 的副本
  b = 20;       // 修改 b 不影响 a
  // a 还是 10

对象是按引用传递的：
  let obj = { count: 0 };
  let proxy = new Proxy(obj, handler);
  // proxy 和 obj 指向同一个对象
  // 通过 proxy 访问属性 → handler 拦截

Proxy 需要一个对象作为 target：
  new Proxy(10, handler);  // TypeError: Cannot create proxy with a non-object

所以 ref 的解决方案是：
  function ref(value) {
      // 把原始值包装在对象里
      return reactive({ value: value });
      // 实际实现使用 getter/setter，但原理一样
  }

  const count = ref(0);
  // 内部结构：{ value: 0 }
  // 通过 count.value 访问和修改
```

### 与相关API的对比

| 场景 | reactive | ref |
|------|---------|-----|
| 对象 | 直接代理 | 包装为 `{ value: obj }` |
| 数组 | 直接代理 | 包装为 `{ value: arr }` |
| 数字/字符串/布尔 | 不支持 | 包装为 `{ value: 原始值 }` |
| Map/Set | 直接代理 | 包装为 `{ value: map }` |
| 访问方式 | `state.key` | `ref.value` |
| 模板中访问 | `state.key` | 自动解包，不需要 `.value` |
| 替换整体 | 不能替换引用 | `ref.value = 新值` |

### 适用场景

- **用 reactive：** 复杂对象、表单数据、嵌套结构
- **用 ref：** 原始值、需要替换整个值的场景、组件 props 的单个值

### 常见问题

#### 如何安全地替换 reactive 对象的全部数据

**解决方案：**

```javascript
import { reactive } from "vue";

const state = reactive({ name: "张三", age: 25, email: "" });

// 方案1：使用 Object.assign
function resetState(newData) {
    Object.assign(state, newData);
}
resetState({ name: "李四", age: 30, email: "lisi@test.com" });

// 方案2：逐个清除再赋值
function replaceState(newData) {
    // 先删除所有现有属性
    Object.keys(state).forEach((key) => delete state[key]);
    // 再赋新值
    Object.assign(state, newData);
}

// 方案3：用 ref 包装对象（推荐替换整体的场景）
import { ref } from "vue";
const stateRef = ref({ name: "张三", age: 25 });
// 可以直接替换整个对象
stateRef.value = { name: "李四", age: 30 };
```

### 注意事项

- reactive 不接受原始值，原始值必须用 ref
- 不要替换 reactive 对象的变量引用
- 用 Object.assign 合并新数据到 reactive 对象
- 解构 reactive 对象会丢失响应性
- 如果需要频繁替换整个数据，优先使用 ref
- 函数参数传递 reactive 对象时注意引用问题

### 总结

reactive 只能代理对象类型，不能用于原始值（Proxy 的 JavaScript 限制）。原始值需要用 ref 包装。reactive 对象不能替换变量引用（会断开响应式连接），应使用 Object.assign 合并数据或逐个修改属性。如果场景需要频繁替换整体数据，建议用 ref 代替 reactive。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### ref API的原始值包装对象

### 概念说明

`ref()` 是 Vue 3 中用于创建响应式数据的核心 API，它可以接受任意类型的值（包括原始值和对象）。ref 的核心思路是将传入的值包装在一个带有 `.value` 属性的对象中，通过 getter/setter 拦截对 `.value` 的读写来实现依赖收集和更新通知。

ref 之所以需要 `.value`，是因为 JavaScript 中原始值（number、string、boolean 等）是按值传递的，无法被 Proxy 代理，也无法被追踪。ref 通过创建一个包装对象（RefImpl 实例），将原始值存储在 `._value` 内部属性中，对外暴露 `.value` 的 getter 和 setter。getter 中调用 track 收集依赖，setter 中调用 trigger 触发更新。

当 ref 接收到对象类型的值时，内部会调用 `reactive()` 对该对象进行深层代理。所以 `ref({ count: 0 })` 的 `.value` 实际上是一个 reactive 代理对象。

### 基本示例

```vue
<script setup>
// 示例说明：ref 的各种使用场景

import { ref, watchEffect } from "vue";

// ===== 原始值 =====
const count = ref(0);          // 包装为 { value: 0 }
const message = ref("hello");  // 包装为 { value: "hello" }
const visible = ref(true);     // 包装为 { value: true }

// 在 JS/TS 中必须通过 .value 访问
console.log(count.value);      // 0
count.value++;                 // 触发更新
console.log(count.value);      // 1

// ===== 对象类型 =====
const user = ref({ name: "张三", age: 25 });
// user.value 是一个 reactive 代理对象
user.value.name = "李四";  // 触发更新
// 可以直接替换整个对象
user.value = { name: "王五", age: 30 };  // 触发更新

// ===== 数组类型 =====
const list = ref([1, 2, 3]);
list.value.push(4);    // 触发更新
list.value[0] = 10;    // 触发更新
list.value = [5, 6];   // 替换整个数组，触发更新

// ===== watchEffect 中自动追踪 =====
watchEffect(() => {
    // 读取 count.value → 触发 getter → 收集依赖
    console.log("count:", count.value);
});

// 修改 count.value → 触发 setter → watchEffect 重新执行
count.value = 100;
</script>

<template>
    <!-- 模板中自动解包，不需要 .value -->
    <p>{{ count }}</p>
    <p>{{ message }}</p>
    <p>{{ user.name }} - {{ user.age }}</p>
</template>
```

### 内部原理

#### RefImpl 类的简化实现

```javascript
// Vue 3 内部 ref 的简化实现
class RefImpl {
    constructor(value) {
        // _rawValue 保存原始值（用于对比新旧值）
        this._rawValue = value;
        // _value 保存实际使用的值
        // 如果是对象类型，用 reactive 包装
        this._value = isObject(value) ? reactive(value) : value;
    }

    // getter：读取 .value 时触发
    get value() {
        // 依赖收集
        track(this, "value");
        return this._value;
    }

    // setter：修改 .value 时触发
    set value(newValue) {
        // 只有值确实变化了才触发更新
        if (hasChanged(newValue, this._rawValue)) {
            this._rawValue = newValue;
            // 如果新值是对象，用 reactive 包装
            this._value = isObject(newValue) ? reactive(newValue) : newValue;
            // 触发更新
            trigger(this, "value");
        }
    }
}

function ref(value) {
    return new RefImpl(value);
}

// ref 对象有一个 __v_isRef 标记
// Vue 通过这个标记识别 ref 对象（用于模板自动解包等）
```

### 与相关API的对比

| 对比维度 | ref | reactive |
|----------|-----|---------|
| 接受类型 | 任意值 | 仅对象类型 |
| 访问方式 | `.value` | 直接属性访问 |
| 模板中使用 | 自动解包 | 直接使用 |
| 替换整体 | `ref.value = 新值` | 不能替换引用 |
| 对象值处理 | 内部调用 reactive | 直接代理 |
| 解构 | 不丢失响应性（ref 本身是对象） | 丢失响应性 |

### 适用场景

- **原始值状态：** 计数器、开关、文本输入
- **需要替换整体的数据：** API 返回的数据、列表数据
- **组合函数返回值：** composable 函数返回的响应式数据
- **模板引用：** `const el = ref(null)` 获取 DOM 元素

### 常见问题

#### ref 和 reactive 怎么选

**解决方案：**

```javascript
// 推荐：统一使用 ref（Vue 官方推荐）
const count = ref(0);
const user = ref({ name: "张三" });
const list = ref([1, 2, 3]);

// 优势：
// 1. 任意类型都能用，不需要区分
// 2. 可以替换整个值：user.value = newUser
// 3. 传递给函数时不丢失响应性
// 4. 模板中自动解包

// 使用 reactive 的场景：
// 1. 不想写 .value 的简单对象状态
// 2. 组件内部的复杂状态对象
const form = reactive({
    username: "",
    password: "",
    remember: false,
});
```

### 注意事项

- 在 JS/TS 代码中访问 ref 必须使用 `.value`
- 在模板中 ref 会自动解包，不需要 `.value`
- ref 接收对象类型时，内部使用 reactive 包装
- 可以通过 `isRef()` 判断一个值是否是 ref
- ref 可以安全地替换整个值（`ref.value = 新值`）
- 从 composable 函数返回时优先使用 ref

### 总结

ref 通过将值包装在 RefImpl 对象中，利用 getter/setter 拦截 `.value` 的读写来实现响应式。原始值直接存储，对象类型内部调用 reactive 深层代理。ref 可以接受任意类型、支持替换整个值、传递时不丢失响应性。在 JS 中通过 `.value` 访问，在模板中自动解包。Vue 官方推荐优先使用 ref。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### ref的.value解包访问

### 概念说明

ref 对象通过 `.value` 属性访问和修改其内部值。这个设计是由 JavaScript 语言的限制决定的：原始值是不可变的，无法被追踪，所以必须通过一个对象的属性来间接访问。`.value` 就是这个"间接层"，它的 getter 负责依赖收集，setter 负责触发更新。

在不同的上下文中，ref 的 `.value` 有不同的解包（unwrap）行为。在 `<template>` 模板中，顶层 ref 会自动解包，不需要写 `.value`。在 `<script>` 或普通 JS 代码中，必须显式地使用 `.value`。在 reactive 对象内部嵌套 ref 时，ref 也会自动解包。这些解包规则是 Vue 开发中需要牢记的要点。

### 基本示例

```vue
<script setup>
// 示例说明：ref 的 .value 访问规则

import { ref, reactive } from "vue";

const count = ref(0);
const message = ref("hello");
const user = ref({ name: "张三" });

// ===== 在 script 中：必须使用 .value =====
console.log(count.value);       // 0（读取）
count.value++;                  // 1（修改）
message.value = "world";        // 修改字符串
user.value.name = "李四";       // 修改对象的属性
user.value = { name: "王五" };  // 替换整个对象

// ===== 在 reactive 中：自动解包 =====
const state = reactive({
    count: ref(10),  // ref 嵌套在 reactive 中
});
// 自动解包，不需要 .value
console.log(state.count);  // 10（不是 ref 对象，是 10）
state.count++;              // 11（直接操作数值）

// ===== ref 作为数组元素：不会自动解包 =====
const list = reactive([ref(1), ref(2), ref(3)]);
// 数组中的 ref 不会自动解包
console.log(list[0].value); // 1（需要 .value）

// ===== 条件判断中的注意事项 =====
const flag = ref(false);
// 错误理解：以为 flag 是 false
if (flag) {
    // 这里总是执行！因为 flag 是 ref 对象（truthy）
}
// 正确：使用 .value
if (flag.value) {
    // 只有 flag.value 为 true 时才执行
}
</script>

<template>
    <!-- 在模板中：顶层 ref 自动解包 -->
    <p>{{ count }}</p>       <!-- 不需要 count.value -->
    <p>{{ message }}</p>     <!-- 不需要 message.value -->
    <p>{{ user.name }}</p>   <!-- user 自动解包后访问 .name -->

    <!-- 事件处理中也自动解包 -->
    <button @click="count++">加1</button>
    <!-- 等价于 count.value++ -->
</template>
```

### 内部原理

#### 模板自动解包的实现

```
模板中 ref 自动解包的原理：

1. Vue 编译器处理模板时
   → {{ count }} 编译为 _ctx.count
   → _ctx 是组件的渲染上下文代理

2. 渲染上下文代理的 get 陷阱
   → 当访问 _ctx.count 时
   → 检查 count 是否是 ref（通过 __v_isRef 标记）
   → 如果是 ref → 返回 count.value（自动解包）
   → 如果不是 → 直接返回

3. 渲染上下文代理的 set 陷阱
   → count++ 实际是 _ctx.count = _ctx.count + 1
   → set 陷阱检查 count 是否是 ref
   → 如果是 → 执行 count.value = newValue
   → 自动完成 .value 的赋值

reactive 中解包的原理：
   → reactive 的 get 陷阱中
   → 检查返回值是否是 ref
   → 如果是且父对象不是数组 → 返回 ref.value
   → 如果父对象是数组 → 不解包（返回 ref 本身）
```

### 与相关API的对比

| 上下文 | 是否自动解包 | 访问方式 |
|--------|------------|---------|
| `<script setup>` 中 | 不解包 | `ref.value` |
| `<template>` 顶层 | 自动解包 | `&lbrace;&lbrace; ref &rbrace;&rbrace;` |
| reactive 对象中 | 自动解包 | `state.refProp` |
| reactive 数组中 | 不解包 | `arr[i].value` |
| Map/Set 中 | 不解包 | `map.get(key).value` |
| 函数参数传递 | 不解包 | `param.value` |

### 适用场景

- **组件状态管理：** script 中用 `.value`，模板中自动解包
- **composable 返回值：** 返回 ref，使用时需要 `.value`
- **reactive 嵌套：** ref 嵌套在 reactive 中自动解包

### 常见问题

#### 忘记写 .value 导致的 bug

**解决方案：**

```typescript
import { ref } from "vue";

const count = ref(0);

// 常见错误1：比较时忘记 .value
// if (count === 0) { ... }  // 永远为 false，count 是对象
if (count.value === 0) { /* 正确 */ }

// 常见错误2：赋值时忘记 .value
// count = 10;  // 覆盖了 ref 变量本身，丢失响应性
count.value = 10;  // 正确

// 常见错误3：解构时
// const { value } = count;  // value 是普通数字，不响应
// 保持使用 count.value

// TypeScript 会在大多数情况下提示这些错误
// 建议开启严格模式
```

### 注意事项

- script 中必须使用 `.value`，模板中顶层 ref 自动解包
- reactive 对象中的 ref 自动解包，但数组中的 ref 不会
- ref 对象本身是 truthy 的，条件判断要用 `.value`
- 不要直接对 ref 变量重新赋值（`count = 10`），应该赋给 `.value`
- TypeScript 可以帮助发现忘记 `.value` 的错误
- 模板中的自动解包是编译器和渲染代理配合实现的

### 总结

ref 通过 `.value` 属性提供响应式的读写拦截。在 script 中必须显式使用 `.value`，在模板中顶层 ref 自动解包。reactive 对象中的 ref 自动解包（数组除外）。理解 `.value` 的解包规则是避免 Vue 3 常见 bug 的关键。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### ref在模板中的自动解包

### 概念说明

在 Vue 3 的 `<template>` 模板中，顶层的 ref 会被自动解包（unwrap），不需要写 `.value`。这个特性让模板代码更简洁，开发体验接近 Vue 2 的 data 选项。所谓"顶层"是指 ref 是 `<script setup>` 中直接声明的变量，或者是 setup 函数返回对象中的属性。

自动解包的实现依赖 Vue 编译器和渲染上下文代理（publicPropertiesMap + PublicInstanceProxyHandlers）。编译器将模板中的 `&lbrace;&lbrace; count &rbrace;&rbrace;` 编译为 `_ctx.count`，渲染代理在 get 陷阱中检测到 count 是 ref 后，自动返回 `count.value`。在 set 操作中同样自动走 `count.value = newVal`。

需要注意的是，自动解包只对"顶层"有效。如果 ref 嵌套在一个普通对象中（不是 reactive），在模板中不会自动解包。

### 基本示例

```vue
<script setup>
// 示例说明：模板中 ref 自动解包的各种场景

import { ref, reactive } from "vue";

// 顶层 ref → 模板中自动解包
const count = ref(0);
const message = ref("你好");
const user = ref({ name: "张三", age: 25 });
const list = ref(["苹果", "香蕉", "橘子"]);

// reactive 中的 ref → 模板中也自动解包
const state = reactive({
    total: ref(100),
});

// 普通对象中的 ref → 模板中不会自动解包
const plain = {
    num: ref(42),
};
</script>

<template>
    <div>
        <!-- 顶层 ref 自动解包 -->
        <p>{{ count }}</p>            <!-- 显示 0，不需要 count.value -->
        <p>{{ message }}</p>          <!-- 显示 "你好" -->
        <p>{{ user.name }}</p>        <!-- user 解包后访问 .name -->

        <!-- 表达式中也自动解包 -->
        <p>{{ count + 1 }}</p>        <!-- 显示 1 -->
        <p>{{ message.split("").reverse().join("") }}</p>

        <!-- v-bind 中自动解包 -->
        <div :id="`item-${count}`">绑定属性</div>

        <!-- 事件处理中自动解包 -->
        <button @click="count++">count: {{ count }}</button>
        <!-- count++ 等价于 count.value++ -->

        <!-- v-for 中自动解包 -->
        <ul>
            <li v-for="(item, i) in list" :key="i">{{ item }}</li>
        </ul>

        <!-- reactive 中的 ref 自动解包 -->
        <p>{{ state.total }}</p>     <!-- 显示 100 -->

        <!-- 普通对象中的 ref 不会自动解包 -->
        <p>{{ plain.num }}</p>       <!-- 显示 ref 对象，不是 42 -->
        <p>{{ plain.num.value }}</p> <!-- 需要手动 .value 才显示 42 -->
    </div>
</template>
```

### 内部原理

#### 自动解包的编译和运行时配合

```
模板编译阶段：
  {{ count }}
  编译为 → _toDisplayString(_ctx.count)

  @click="count++"
  编译为 → $event => (_ctx.count++)

运行时阶段（渲染代理）：
  当访问 _ctx.count 时：
    1. PublicInstanceProxyHandlers 的 get 陷阱
    2. 从 setupState 中获取 count
    3. 检查 count.__v_isRef 是否为 true
    4. 如果是 ref → 返回 count.value（自动解包）
    5. 如果不是 → 直接返回

  当写入 _ctx.count = newVal 时：
    1. PublicInstanceProxyHandlers 的 set 陷阱
    2. 检查 setupState.count 是否是 ref
    3. 如果是 ref → 执行 count.value = newVal
    4. 如果不是 → 直接赋值

什么情况不解包：
  → ref 嵌套在普通对象中（非 reactive）
  → 因为普通对象没有 Proxy，无法拦截和检测 ref
  → 解决方案：用 reactive 包裹，或手动 .value
```

### 与相关API的对比

| 场景 | 是否自动解包 | 原因 |
|------|------------|------|
| 模板中顶层 ref | 是 | 渲染代理的 get 拦截 |
| 模板中 reactive 内的 ref | 是 | reactive 的 get 拦截 |
| 模板中普通对象内的 ref | 否 | 普通对象无 Proxy |
| script 中 | 否 | 无拦截机制 |
| 模板中的表达式 `count + 1` | 是 | 先解包再运算 |

### 适用场景

- **所有模板绑定：** 插值、v-bind、v-on 中的 ref 都自动解包
- **条件渲染：** `v-if="visible"` 自动解包 ref
- **列表渲染：** `v-for="item in list"` 自动解包 ref 数组
- **双向绑定：** `v-model="inputValue"` 自动解包 ref

### 常见问题

#### 普通对象中的 ref 在模板中不解包怎么办

**解决方案：**

```vue
<script setup>
import { ref, reactive } from "vue";

// 问题：普通对象中的 ref 不会在模板中解包
const obj = { count: ref(0) };
// {{ obj.count }} 显示的是 ref 对象

// 方案1：用 reactive 包裹
const state = reactive({ count: ref(0) });
// {{ state.count }} 自动解包，显示 0

// 方案2：将 ref 提升为顶层变量
const count = ref(0);
// {{ count }} 自动解包

// 方案3：在模板中手动 .value（不推荐）
// {{ obj.count.value }}
</script>
```

### 注意事项

- 只有顶层 ref 在模板中自动解包
- reactive 对象中的 ref 也自动解包
- 普通对象中的 ref 不会自动解包
- 自动解包对 get 和 set 都生效
- `count++` 在模板中等价于 `count.value++`
- 不要把 ref 放在普通对象里传给模板

### 总结

Vue 3 模板中顶层 ref 自动解包，不需要写 `.value`。自动解包通过编译器和渲染上下文代理配合实现：编译器将模板表达式转为 `_ctx.xxx`，渲染代理在 get/set 中检测 ref 并自动访问 `.value`。reactive 对象中的 ref 也自动解包，但普通对象中的 ref 不会。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### ref在响应式对象中的解包

### 概念说明

当一个 ref 被嵌套在 reactive 对象中时，通过 reactive 对象访问该属性会自动解包——返回的是 ref 的 `.value` 而不是 ref 对象本身。这个行为让你在使用 reactive 对象时不需要关心某个属性到底是直接值还是 ref，访问方式完全一致。

这种自动解包发生在 reactive 的 Proxy get 陷阱中：当读取属性时，如果值是 ref（通过 `__v_isRef` 标记判断），就自动返回 `ref.value`；当写入属性时，如果原有值是 ref 且新值不是 ref，就自动执行 `ref.value = newValue`。

但是有一个例外：**当 ref 嵌套在 reactive 数组或 Map 等原生集合类型中时，不会自动解包**。数组通过索引访问的元素如果是 ref，仍然需要 `.value`。这是因为数组的索引访问语义与对象属性不同，自动解包可能导致混淆。

### 基本示例

```vue
<script setup>
// 示例说明：ref 在 reactive 对象和数组中的解包行为

import { ref, reactive } from "vue";

// ===== reactive 对象中的 ref：自动解包 =====
const count = ref(10);
const state = reactive({
    count,          // 嵌套 ref
    name: "张三",   // 普通值
});

// 读取：自动解包，返回 ref.value
console.log(state.count);  // 10（不是 ref 对象）
console.log(typeof state.count);  // "number"

// 写入：自动赋值到 ref.value
state.count = 20;
console.log(count.value);  // 20（同步更新了原始 ref）

// 用新的 ref 替换
const newCount = ref(100);
state.count = newCount;  // 新值是 ref → 替换原有 ref
console.log(state.count);  // 100
// 此时 state.count 指向 newCount

// ===== reactive 数组中的 ref：不自动解包 =====
const arr = reactive([ref(1), ref(2), ref(3)]);

// 数组中的 ref 不会自动解包
console.log(arr[0]);        // RefImpl 对象（不是 1）
console.log(arr[0].value);  // 1（需要手动 .value）

// 修改数组中的 ref
arr[0].value = 10;
console.log(arr[0].value);  // 10

// ===== Map 中的 ref：不自动解包 =====
const map = reactive(new Map([["key", ref(42)]]));
console.log(map.get("key"));        // RefImpl 对象
console.log(map.get("key").value);  // 42（需要手动 .value）
</script>
```

### 内部原理

#### reactive 的 get/set 如何处理 ref 解包

```
reactive 的 get 陷阱中对 ref 的处理（简化）：

get(target, key, receiver) {
    const result = Reflect.get(target, key, receiver);

    // 如果是数组且 key 是整数索引 → 不解包
    if (Array.isArray(target) && isIntegerKey(key)) {
        return result;
    }

    // 如果结果是 ref → 自动解包
    if (isRef(result)) {
        return result.value;  // 返回 ref.value
    }

    return result;
}

reactive 的 set 陷阱中对 ref 的处理（简化）：

set(target, key, value, receiver) {
    const oldValue = target[key];

    // 如果旧值是 ref 且新值不是 ref
    if (isRef(oldValue) && !isRef(value)) {
        // 赋值到 ref.value，而不是替换 ref
        oldValue.value = value;
        return true;
    }

    // 其他情况正常赋值（包括新值也是 ref 时直接替换）
    return Reflect.set(target, key, value, receiver);
}
```

### 与相关API的对比

| 容器类型 | ref 是否自动解包 | 读取方式 | 写入行为 |
|---------|----------------|---------|---------|
| reactive 对象 | 是 | `state.prop` | 赋值到 `ref.value` |
| reactive 数组 | 否 | `arr[i].value` | 需要 `.value` |
| reactive Map | 否 | `map.get(k).value` | 需要 `.value` |
| reactive Set | 否 | 遍历后 `.value` | 需要 `.value` |
| 普通对象 | 否 | `obj.prop.value` | 需要 `.value` |

### 适用场景

- **组合状态：** 将多个 ref 组合到一个 reactive 对象中
- **表单数据：** 各字段可能来自不同的 ref 或 composable
- **状态聚合：** 将多个来源的响应式数据合并

### 常见问题

#### 为什么数组中的 ref 不自动解包

**解决方案：**

```javascript
import { ref, reactive, unref } from "vue";

// 数组中 ref 不自动解包的原因：
// 数组通过索引访问，arr[0] 的语义是"第0个元素"
// 如果自动解包，arr.length、arr.indexOf 等操作行为会不一致
// 所以 Vue 选择不对数组做自动解包

const arr = reactive([ref(1), ref(2)]);

// 方案1：手动 .value
arr[0].value;

// 方案2：使用 unref 工具函数
unref(arr[0]);  // 如果是 ref 返回 .value，否则返回自身

// 方案3：避免在数组中放 ref
const list = reactive([1, 2, 3]);  // 直接放原始值
```

### 注意事项

- reactive 对象中的 ref 自动解包（读写都自动）
- reactive 数组和 Map/Set 中的 ref 不自动解包
- 赋值给已有 ref 属性时，如果新值不是 ref，会赋到 `.value`
- 赋值给已有 ref 属性时，如果新值是 ref，会替换整个 ref
- unref() 是手动解包的工具函数
- 避免在集合类型中嵌套 ref 以减少困惑

### 总结

ref 嵌套在 reactive 对象中时会自动解包：读取时返回 `.value`，写入非 ref 值时赋到 `.value`，写入 ref 值时替换整个 ref。但在 reactive 数组和 Map/Set 中不会自动解包，需要手动 `.value`。这个规则是 Vue 3 响应式系统中容易混淆的点，需要牢记对象解包、集合不解包的区别。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### readonly的只读响应式标记

### 概念说明

`readonly()` 接收一个对象（普通对象或 reactive 对象）或 ref，返回一个**深层只读**的代理。只读代理的所有属性（包括嵌套属性）都无法被修改，尝试修改会在开发环境中触发警告。readonly 对象仍然是响应式的——可以被追踪和收集依赖，当源对象变化时，只读代理的消费者也会更新。

readonly 的典型用途是：组件通过 provide 向子组件注入数据时，用 readonly 包裹防止子组件意外修改父组件的状态；在 composable 函数中返回只读数据，保护内部状态不被外部修改。

readonly 内部也是用 Proxy 实现的，但它的 set 和 deleteProperty 陷阱直接拦截并阻止修改操作。get 陷阱正常执行 track（依赖收集），但返回的嵌套对象也会被 readonly 包裹。

### 基本示例

```vue
<script setup>
// 示例说明：readonly 的使用场景

import { reactive, readonly, watchEffect, provide } from "vue";

// ===== 基本用法 =====
const original = reactive({ count: 0, nested: { value: 10 } });
const readonlyState = readonly(original);

// 读取正常
console.log(readonlyState.count);       // 0
console.log(readonlyState.nested.value); // 10

// 修改被阻止（开发环境警告）
// readonlyState.count = 1;
// 警告：Set operation on key "count" failed: target is readonly.

// readonlyState.nested.value = 20;
// 警告：深层嵌套属性也是只读的

// 但通过原始对象修改是可以的
original.count = 1;
// readonlyState.count 也变为 1（因为是同一个对象的代理）

// ===== watchEffect 可以追踪 readonly =====
watchEffect(() => {
    // readonly 对象可以被追踪
    console.log("readonly count:", readonlyState.count);
});
original.count = 2; // 触发 watchEffect 重新执行

// ===== provide/inject 场景 =====
const appState = reactive({
    user: { name: "张三", role: "admin" },
    settings: { theme: "dark" },
});

// 向子组件提供只读版本，防止子组件修改
provide("appState", readonly(appState));
// 子组件可以读取但不能修改
</script>
```

### 内部原理

#### readonly 的 Proxy handler

```
readonly 的核心实现：

const readonlyHandlers = {
    get(target, key, receiver) {
        // __v_isReadonly 标记
        if (key === "__v_isReadonly") return true;

        const result = Reflect.get(target, key, receiver);

        // 依赖收集（readonly 仍然可以被追踪）
        track(target, key);

        // 嵌套对象也返回 readonly 代理
        if (typeof result === "object" && result !== null) {
            return readonly(result);
        }

        return result;
    },

    set(target, key, value) {
        // 阻止修改，开发环境输出警告
        if (__DEV__) {
            console.warn(`Set operation on key "${key}" failed: target is readonly.`);
        }
        return true; // 返回 true 避免 TypeError
    },

    deleteProperty(target, key) {
        // 阻止删除
        if (__DEV__) {
            console.warn(`Delete operation on key "${key}" failed: target is readonly.`);
        }
        return true;
    },
};
```

### 与相关API的对比

| 对比维度 | reactive | readonly | shallowReadonly |
|----------|---------|---------|----------------|
| 可读 | 是 | 是 | 是 |
| 可写 | 是 | 否（所有层级） | 第一层否，深层可写 |
| 依赖收集 | 是 | 是 | 是 |
| 深层代理 | 是 | 是（只读） | 否 |
| 修改警告 | 无 | 开发环境警告 | 第一层警告 |

### 适用场景

- **provide/inject：** 父组件向子组件注入只读数据
- **composable 返回值：** 保护内部状态不被外部修改
- **Props 传递：** 组件 props 内部就是 readonly 的
- **配置对象：** 全局配置在初始化后设为只读

### 常见问题

#### readonly 和 Object.freeze 的区别

**解决方案：**

```javascript
import { readonly, reactive } from "vue";

// Object.freeze：浅冻结，且不是响应式的
const frozen = Object.freeze({ count: 0, nested: { value: 10 } });
// frozen.count = 1;          // 静默失败（严格模式报错）
// frozen.nested.value = 20;  // 成功！freeze 只冻结第一层

// readonly：深层只读 + 响应式
const state = reactive({ count: 0, nested: { value: 10 } });
const ro = readonly(state);
// ro.count = 1;              // 开发环境警告
// ro.nested.value = 20;      // 开发环境警告（深层也只读）

// readonly 是响应式的，Object.freeze 不是
// readonly 的警告只在开发环境
// Object.freeze 在生产环境严格模式下也会报错
```

### 注意事项

- readonly 是深层只读，所有嵌套属性都不可修改
- readonly 仍然是响应式的，可以被 watch 和模板追踪
- 通过原始对象修改数据，readonly 代理会同步更新
- 修改 readonly 对象只在开发环境警告，生产环境静默失败
- isReadonly() 可以判断一个对象是否是 readonly 代理
- Vue 组件的 props 内部就使用了类似 readonly 的机制

### 总结

readonly 创建深层只读的响应式代理，所有层级的属性都不可修改。通过 Proxy 的 set 和 deleteProperty 陷阱阻止写操作。readonly 仍然支持依赖收集，当源对象变化时消费者会更新。主要用于 provide/inject 保护状态和 composable 返回值保护。与 Object.freeze 的区别在于深层只读和响应式。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### shallowReactive的浅层响应式

### 概念说明

`shallowReactive()` 创建一个浅层响应式代理对象，只有对象的第一层属性是响应式的，嵌套对象的属性不会被代理。修改第一层属性会触发更新，但修改深层嵌套属性不会。

与 `reactive()` 的区别在于：reactive 在 get 陷阱中会对嵌套对象递归调用 reactive（懒代理），而 shallowReactive 的 get 陷阱直接返回原始值，不做递归代理。这在处理大型嵌套对象时可以减少代理创建的开销，适合那些只关心顶层属性变化的场景。

### 基本示例

```vue
<script setup>
// 示例说明：shallowReactive 的浅层行为

import { shallowReactive, isReactive } from "vue";

const state = shallowReactive({
    count: 0,
    nested: {
        value: 10,
        deep: { msg: "hello" },
    },
});

// 第一层是响应式的
console.log(isReactive(state));          // true
// 嵌套对象不是响应式的
console.log(isReactive(state.nested));   // false

// 修改第一层属性 → 触发更新
state.count = 1;  // 视图更新

// 修改嵌套属性 → 不触发更新
state.nested.value = 20;  // 视图不更新！

// 替换整个嵌套对象 → 触发更新（因为第一层属性变了）
state.nested = { value: 30, deep: { msg: "world" } };  // 视图更新
</script>

<template>
    <div>
        <p>count: {{ state.count }}</p>
        <p>nested.value: {{ state.nested.value }}</p>
    </div>
</template>
```

### 内部原理

#### shallowReactive 与 reactive 的 get 差异

```
reactive 的 get 陷阱：
  get(target, key, receiver) {
      const result = Reflect.get(target, key, receiver);
      track(target, key);
      // 递归代理嵌套对象
      if (isObject(result)) {
          return reactive(result);  // 深层代理
      }
      return result;
  }

shallowReactive 的 get 陷阱：
  get(target, key, receiver) {
      const result = Reflect.get(target, key, receiver);
      track(target, key);
      // 不递归，直接返回原始值
      return result;  // 不做任何代理
  }

区别仅在于 get 中是否对嵌套对象做递归代理
```

### 与相关API的对比

| 对比维度 | reactive | shallowReactive |
|----------|---------|----------------|
| 第一层响应式 | 是 | 是 |
| 嵌套层响应式 | 是（懒代理） | 否 |
| 性能 | 嵌套对象按需代理 | 无嵌套代理开销 |
| 修改深层属性 | 触发更新 | 不触发更新 |

### 适用场景

- **大型第三方数据：** 只关心顶层字段变化，不需要深层响应
- **性能敏感场景：** 大量嵌套对象，避免不必要的代理
- **外部状态集成：** 集成不需要深层追踪的外部状态

### 常见问题

#### 如何让 shallowReactive 的深层属性也触发更新

**解决方案：**

```javascript
import { shallowReactive, triggerRef } from "vue";

const state = shallowReactive({ nested: { value: 10 } });

// 方案：替换第一层引用（创建新对象）
function updateNested() {
    // 修改深层后，替换第一层引用触发更新
    state.nested = { ...state.nested, value: 20 };
}
```

### 注意事项

- 只有第一层属性的修改会触发更新
- 嵌套对象不是响应式的，修改不会被追踪
- 替换嵌套对象的引用（第一层赋值）会触发更新
- 适合只关心顶层属性变化的大型对象
- 不要和 reactive 混淆，注意检查 isReactive

### 总结

shallowReactive 创建浅层响应式代理，只有第一层属性是响应式的。get 陷阱中不对嵌套对象递归代理，减少了性能开销。修改深层属性不触发更新，需要通过替换第一层引用来间接触发。适合处理大型嵌套对象且只关心顶层变化的场景。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### shallowRef的浅层引用

### 概念说明

`shallowRef()` 创建一个浅层的 ref，只有对 `.value` 本身的替换会触发更新，对 `.value` 内部属性的修改不会触发更新。与普通 ref 不同，shallowRef 不会对对象类型的 `.value` 调用 reactive 进行深层代理。

普通 ref 在接收对象值时，内部会自动调用 `reactive(value)` 将对象转为深层响应式代理。而 shallowRef 跳过这一步，`.value` 就是原始对象本身，修改对象的属性不会被 Proxy 拦截，因此不会触发依赖更新。只有当 `.value` 被整体替换为一个新对象时，setter 才会被触发。

shallowRef 适合存储大型不可变数据结构、第三方类实例、或者需要手动控制更新时机的场景。配合 `triggerRef()` 可以在修改深层属性后手动触发更新。

### 基本示例

```vue
<script setup>
// 示例说明：shallowRef 的浅层行为

import { shallowRef, triggerRef, watchEffect } from "vue";

// 创建浅层 ref
const state = shallowRef({ count: 0, nested: { value: 10 } });

watchEffect(() => {
    console.log("state.value.count:", state.value.count);
});

// 修改深层属性 → 不触发更新
state.value.count = 1;
// watchEffect 不会重新执行（视图不更新）

// 替换整个 .value → 触发更新
state.value = { count: 2, nested: { value: 20 } };
// watchEffect 重新执行

// ===== 手动触发更新 =====
const data = shallowRef({ items: [] });

function addItem(item) {
    // 直接修改不触发更新
    data.value.items.push(item);
    // 手动触发更新
    triggerRef(data);
}
</script>

<template>
    <p>{{ state.count }}</p>
</template>
```

### 内部原理

#### shallowRef 与 ref 的区别

```
ref(obj) 内部：
  this._value = reactive(obj);  // 深层代理
  → obj.count 的修改被 Proxy 拦截 → 触发更新

shallowRef(obj) 内部：
  this._value = obj;  // 直接保存原始对象，不代理
  → obj.count 的修改不被拦截 → 不触发更新
  → 只有 ref.value = newObj 时触发 setter → 触发更新

triggerRef(ref)：
  → 手动调用 trigger(ref, "value")
  → 强制通知所有依赖该 ref 的 effect 重新执行
```

### 与相关API的对比

| 对比维度 | ref | shallowRef |
|----------|-----|-----------|
| .value 是对象时 | 深层响应式（reactive） | 原始对象（不代理） |
| 修改深层属性 | 触发更新 | 不触发更新 |
| 替换 .value | 触发更新 | 触发更新 |
| 手动触发 | 不需要 | triggerRef() |
| 性能 | 有代理开销 | 无代理开销 |

### 适用场景

- **大型数据结构：** 存储大型 JSON 数据，手动控制更新
- **第三方类实例：** 存储不需要深层追踪的对象（如地图实例）
- **不可变数据：** 配合 Immer 等不可变数据库使用
- **性能优化：** 减少不必要的深层代理开销

### 常见问题

#### 什么时候用 shallowRef 替代 ref

**解决方案：**

```javascript
import { shallowRef, ref } from "vue";

// 用 ref：需要深层响应式
const form = ref({ name: "", email: "" });
// form.value.name = "张三" → 自动触发更新

// 用 shallowRef：不需要深层响应，或数据量大
const chartData = shallowRef({ labels: [], datasets: [] });
// 每次更新替换整个对象
function updateChart(newData) {
    chartData.value = newData;  // 整体替换触发更新
}

// 用 shallowRef：存储第三方实例
const mapInstance = shallowRef(null);
// mapInstance.value = new AMap.Map(...)
```

### 注意事项

- shallowRef 的 `.value` 内部属性修改不触发更新
- 只有替换整个 `.value` 才触发更新
- triggerRef() 可以手动触发 shallowRef 的更新
- 不要对 shallowRef 和 ref 的行为搞混
- 适合不需要深层追踪的大型对象或第三方实例
- Vue 3.5+ 中 shallowRef 配合 `triggerRef` 使用更方便

### 总结

shallowRef 创建浅层引用，不对 `.value` 中的对象进行深层代理。只有替换 `.value` 本身才触发更新，修改深层属性不会被追踪。配合 triggerRef 可以手动触发更新。适合大型数据结构、第三方类实例和性能敏感场景。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### toRaw的原始对象获取

### 概念说明

`toRaw()` 用于获取 reactive、readonly 或 shallowReactive 代理对象背后的**原始对象**。通过 toRaw 返回的对象不是响应式的，对它的操作不会触发依赖收集和更新通知。

Vue 3 的响应式代理（Proxy）会在每次属性访问时执行 track（依赖收集），在大量数据操作时会带来额外的性能开销。当你需要对数据进行批量只读操作（比如序列化、深拷贝、传递给第三方库）且不需要触发响应式追踪时，可以用 toRaw 获取原始对象来避免这些开销。

toRaw 的实现很简单：每个代理对象内部都有一个 `__v_raw` 属性指向原始对象，toRaw 就是读取这个属性。如果传入的值不是代理对象，toRaw 直接返回传入的值本身。

### 基本示例

```vue
<script setup>
// 示例说明：toRaw 的使用场景

import { reactive, toRaw, isReactive } from "vue";

const state = reactive({
    items: [1, 2, 3, 4, 5],
    config: { theme: "dark", lang: "zh" },
});

// 获取原始对象
const raw = toRaw(state);

console.log(isReactive(state)); // true
console.log(isReactive(raw));   // false
console.log(raw === toRaw(state)); // true（同一个原始对象）

// ===== 场景1：大量数据操作时避免响应式开销 =====
function processData() {
    const rawState = toRaw(state);
    // 对原始对象操作不触发依赖收集
    // 适合大量循环和计算
    const sum = rawState.items.reduce((a, b) => a + b, 0);
    return sum;
}

// ===== 场景2：传递给第三方库 =====
function sendToAnalytics() {
    // 第三方库可能不需要响应式代理
    // toRaw 获取普通对象传递
    const rawConfig = toRaw(state.config);
    // analytics.init(rawConfig);
}

// ===== 场景3：序列化 =====
function serialize() {
    // JSON.stringify 可以直接用响应式对象
    // 但用 toRaw 可以避免不必要的 track
    const raw = toRaw(state);
    return JSON.stringify(raw);
}

// ===== 场景4：对比引用 =====
const original = { name: "张三" };
const proxy = reactive(original);
console.log(proxy === original);         // false（代理和原始是不同引用）
console.log(toRaw(proxy) === original);  // true
</script>
```

### 内部原理

#### toRaw 的实现

```
toRaw 的核心实现非常简单：

function toRaw(observed) {
    // 检查是否有 __v_raw 属性（响应式代理标记）
    const raw = observed && observed.__v_raw;
    // 如果有，递归获取（处理嵌套代理的情况）
    return raw ? toRaw(raw) : observed;
}

__v_raw 的来源：
  → reactive 创建代理时，在 get 陷阱中处理
  → 当访问 __v_raw 时，直接返回 target（原始对象）
  → 不触发 track，不进行依赖收集

get(target, key, receiver) {
    if (key === "__v_raw") {
        return target;  // 直接返回原始对象
    }
    // ... 正常的 track 和返回逻辑
}
```

### 与相关API的对比

| API | 作用 | 返回值 |
|-----|------|-------|
| toRaw | 获取原始对象 | 非响应式的原始对象 |
| markRaw | 标记对象跳过响应式 | 被标记的原始对象 |
| isReactive | 检查是否是 reactive 代理 | boolean |
| isProxy | 检查是否是任何代理 | boolean |

### 适用场景

- **性能优化：** 大量数据操作时跳过响应式追踪
- **第三方库集成：** 将纯对象传递给不需要响应式的库
- **序列化/深拷贝：** 获取纯对象用于 JSON 序列化
- **引用对比：** 比较代理对象和原始对象是否同源

### 常见问题

#### toRaw 获取的对象修改会影响响应式对象吗

**解决方案：**

```javascript
import { reactive, toRaw } from "vue";

const state = reactive({ count: 0 });
const raw = toRaw(state);

// 修改原始对象 → 值会改变，但不触发视图更新
raw.count = 10;
console.log(state.count); // 10（因为是同一个对象）
// 但是视图不会更新！因为修改没经过 Proxy 的 set 陷阱

// 如果之后通过代理读取，会拿到最新值
// 但依赖该属性的 effect 不会被触发

// 结论：toRaw 修改数据会造成数据和视图不一致
// 只在确实不需要触发更新时使用 toRaw
```

### 注意事项

- toRaw 返回的对象不是响应式的，修改不触发更新
- 修改原始对象会改变数据但不触发视图更新（数据/视图不一致）
- toRaw 主要用于只读场景（序列化、传递给第三方库）
- 对非代理对象调用 toRaw 直接返回自身
- toRaw 可以递归处理嵌套代理
- 不要用 toRaw 获取对象后修改并期望视图更新

### 总结

toRaw 通过读取代理对象的 `__v_raw` 属性获取原始对象。返回的对象不是响应式的，对它的操作不触发依赖收集和更新。主要用于大量数据操作的性能优化、第三方库集成和序列化场景。注意修改原始对象会导致数据和视图不一致，应仅在不需要触发更新的只读场景中使用。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### markRaw的跳过响应式标记

### 概念说明

`markRaw()` 用于标记一个对象，使其永远不会被转换为响应式代理。当你把一个被 markRaw 标记的对象传给 reactive 或 ref 时，Vue 会跳过代理，直接使用原始对象。这个标记是通过在对象上添加 `__v_skip: true` 属性实现的。

markRaw 的典型场景是：存储不需要响应式的大型第三方类实例（地图 SDK 实例、图表库实例、WebSocket 连接等）、不可变的常量数据、或者代理后会出问题的特殊对象。这些对象如果被代理，不仅浪费性能，还可能因为 Proxy 改变了对象的行为而导致 bug。

### 基本示例

```vue
<script setup>
// 示例说明：markRaw 的使用场景

import { markRaw, reactive, isReactive } from "vue";

// ===== 标记对象跳过响应式 =====
const thirdPartyLib = markRaw({
    init() { console.log("初始化"); },
    bindbindbindbindbindbindbindbindDestroy() { console.log("销毁"); },
    bindbindBindbindData: new ArrayBuffer(1024 * 1024), // 大型数据
});

// 即使放入 reactive，也不会被代理
const state = reactive({
    lib: thirdPartyLib,
    count: 0,
});

console.log(isReactive(state));     // true
console.log(isReactive(state.lib)); // false（被 markRaw 标记，跳过代理）

// ===== 场景：第三方类实例 =====
class MapSDK {
    constructor(container) {
        this.bindContainer = container;
        this.bindbindBindBindbindMarkers = [];
    }
    addMarker(bindMarker) {
        this.bindMarkers.push(bindMarker);
    }
}

// 地图实例不需要响应式
const mapInstance = markRaw(new MapSDK("bindMap-container"));

const appState = reactive({
    map: mapInstance,  // 不会被代理
    bindMapReady: false,
});

// ===== 场景：不可变的常量配置 =====
const ROUTES = markRaw([
    { path: "/", name: "Home" },
    { path: "/about", name: "About" },
    { path: "/contact", name: "Contact" },
]);

// 放入 reactive 中也不会被代理
const routeState = reactive({
    routes: ROUTES,
    currentIndex: 0,
});
</script>
```

### 内部原理

#### markRaw 的实现

```
markRaw 的核心实现：

function markRaw(value) {
    // 在对象上定义 __v_skip 属性
    Object.defineProperty(value, "__v_skip", {
        configurable: true,
        enumerable: false,  // 不可枚举，不影响遍历
        value: true,
    });
    return value;
}

reactive 中如何检测 markRaw：

function reactive(target) {
    // 检查是否被标记为跳过
    if (target.__v_skip) {
        return target;  // 直接返回原始对象，不创建代理
    }
    // ... 正常创建 Proxy
}

get 陷阱中的检测：

get(target, key, receiver) {
    const result = Reflect.get(target, key, receiver);
    // 如果嵌套值被 markRaw 标记
    if (isObject(result) && result.__v_skip) {
        return result;  // 不递归代理
    }
    return reactive(result);  // 正常递归代理
}
```

### 与相关API的对比

| API | 作用 | 时机 | 可逆性 |
|-----|------|------|-------|
| markRaw | 标记对象永不代理 | 创建代理前 | 不可逆 |
| toRaw | 获取代理的原始对象 | 创建代理后 | 不改变对象 |
| shallowReactive | 浅层代理 | 创建时选择 | 不可改为深层 |
| Object.freeze | 冻结对象 | 任何时候 | 不可逆 |

### 适用场景

- **第三方库实例：** 地图、图表、编辑器等 SDK 实例
- **大型不可变数据：** 常量配置、静态路由表
- **特殊对象：** WebSocket、Worker、DOM 元素引用
- **性能优化：** 避免对不需要追踪的大型对象创建代理

### 常见问题

#### markRaw 标记后还能恢复响应式吗

**解决方案：**

```javascript
import { markRaw, reactive, isReactive } from "vue";

const obj = markRaw({ count: 0 });
const proxy = reactive(obj);
console.log(isReactive(proxy)); // false（markRaw 标记不可逆）

// markRaw 一旦标记就无法恢复
// 如果确实需要响应式，不要使用 markRaw
// 或者创建对象的副本（副本没有 __v_skip 标记）
const copy = { ...obj };
delete copy.__v_skip; // 手动删除标记（不推荐）
const reactiveBindCopy = reactive(copy); // 这个是响应式的
```

### 注意事项

- markRaw 通过添加 `__v_skip` 属性标记对象
- 被标记的对象永远不会被 reactive/ref 代理
- markRaw 返回的是原始对象本身（不是新对象）
- 标记不可逆（除非手动删除 `__v_skip`，不推荐）
- 适合存储不需要响应式的大型对象和第三方实例
- 不要对需要响应式追踪的数据使用 markRaw

### 总结

markRaw 通过在对象上添加 `__v_skip: true` 标记，使其永远不会被 Vue 的响应式系统代理。适合第三方库实例、大型不可变数据、特殊对象等不需要响应式追踪的场景。标记不可逆，使用前需确认该对象确实不需要响应式。与 toRaw（获取原始对象）配合使用，是 Vue 3 响应式系统的重要逃生舱。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。



## 7.2 响应式原理进阶

### effect副作用函数的注册

### 概念说明

`effect` 是 Vue 3 响应式系统的底层核心。所谓副作用函数（side effect），是指执行时会产生"副作用"的函数——比如修改 DOM、发起网络请求、写入日志等。在 Vue 中，组件的渲染函数就是一个典型的副作用函数：它读取响应式数据并生成 DOM。

Vue 3 内部通过 `ReactiveEffect` 类来管理副作用函数。当一个 effect 被创建并执行时，它会将自己设为当前活跃的 effect（activeEffect），然后执行回调函数。回调函数中读取响应式数据时，Proxy 的 get 陷阱会调用 track，将 activeEffect 与被读取的属性建立依赖关系。当数据变化时，trigger 会找到所有相关的 effect 并重新执行。

`watchEffect`、`watch`、`computed` 以及组件渲染函数，底层都是基于 effect 实现的。Vue 不直接暴露 `effect` API 给用户（它在 `@vue/reactivity` 包中导出），但理解 effect 的注册机制对于掌握整个响应式系统至关重要。

### 基本示例

```javascript
// 示例说明：effect 的注册和执行机制

// ===== 简化的 effect 实现 =====
let activeEffect = null;          // 当前活跃的 effect
const effectStack = [];            // effect 栈（处理嵌套）

class ReactiveEffect {
    constructor(fn, scheduler) {
        this.fn = fn;              // 副作用函数
        this.scheduler = scheduler; // 调度器（可选）
        this.deps = [];            // 该 effect 依赖的 dep 集合（用于清理）
        this.active = true;        // 是否激活
    }

    // 执行副作用函数
    run() {
        if (!this.active) return this.fn();

        // 将自己设为当前活跃的 effect
        activeEffect = this;
        effectStack.push(this);

        // 清理旧的依赖关系（避免分支切换导致的多余依赖）
        cleanupEffect(this);

        try {
            // 执行副作用函数
            // 函数中读取响应式属性 → 触发 get → track → 收集当前 effect
            const result = this.fn();
            return result;
        } finally {
            // 执行完毕，从栈中弹出
            effectStack.pop();
            activeEffect = effectStack[effectStack.length - 1] || null;
        }
    }

    // 停止 effect
    stop() {
        if (this.active) {
            cleanupEffect(this);
            this.active = false;
        }
    }
}

// 清理 effect 的所有依赖
function cleanupEffect(effect) {
    effect.deps.forEach((dep) => dep.delete(effect));
    effect.deps.length = 0;
}

// 创建并执行 effect
function effect(fn, options = {}) {
    const _effect = new ReactiveEffect(fn, options.scheduler);
    // 立即执行一次（除非设置了 lazy）
    if (!options.lazy) {
        _effect.run();
    }
    return _effect;
}

// ===== 使用示例 =====
import { reactive } from "vue";

const state = reactive({ count: 0, show: true });

// 注册一个 effect
const runner = effect(() => {
    // 执行时读取 state.count → track → 建立依赖
    if (state.show) {
        console.log("count:", state.count);
    } else {
        console.log("隐藏");
    }
});

state.count = 1; // trigger → effect 重新执行 → 输出 "count: 1"
```

### 内部原理

#### effect 的注册和执行流程

```
effect 注册流程：

1. effect(fn) 调用
   → 创建 ReactiveEffect 实例
   → 立即调用 run()

2. run() 执行
   → 设置 activeEffect = this
   → 压入 effectStack
   → 清理旧依赖
   → 执行 fn()

3. fn() 执行期间
   → 读取 state.count → Proxy get → track(state, "count")
   → track 中：dep.add(activeEffect)
   → 依赖关系建立

4. fn() 执行完毕
   → 从 effectStack 弹出
   → 恢复上一个 activeEffect

effect 栈的作用（处理嵌套）：
  effect(() => {           // effect1
      state.a;              // track → effect1
      effect(() => {        // effect2（嵌套）
          state.b;          // track → effect2
      });
      state.c;              // track → effect1（不是 effect2）
  });
  // effectStack 确保嵌套时 activeEffect 正确恢复
```

### 与相关API的对比

| 上层 API | 底层 effect 特点 |
|----------|----------------|
| watchEffect | effect + 无 scheduler + 立即执行 |
| watch | effect + lazy + scheduler（回调执行时机） |
| computed | effect + lazy + scheduler（dirty 标记） |
| 组件渲染 | effect + scheduler（放入更新队列） |

### 适用场景

- **组件渲染：** 渲染函数作为 effect 自动追踪依赖
- **watchEffect：** 自动追踪回调中访问的响应式数据
- **computed：** 惰性 effect，读取时才执行
- **自定义响应式逻辑：** 底层使用 effect 构建自定义追踪

### 常见问题

#### effect 栈为什么需要

**解决方案：**

```javascript
// 没有 effect 栈时，嵌套 effect 会出问题
// 因为内层 effect 执行完后，activeEffect 变为 null
// 外层 effect 后续读取属性就无法正确收集依赖

// 有了 effect 栈：
// 外层 effect 入栈 → 内层 effect 入栈
// 内层执行完 → 出栈 → activeEffect 恢复为外层 effect
// 外层继续执行 → 正确收集依赖
```

### 注意事项

- effect 是 Vue 响应式系统的底层核心，不直接暴露给用户
- watchEffect、watch、computed 都是基于 effect 实现的
- effect 栈用于处理嵌套 effect 的 activeEffect 恢复
- 每次执行前会清理旧依赖（处理条件分支变化）
- effect.stop() 可以停止一个 effect 的响应式追踪
- scheduler 控制 effect 重新执行的时机和方式

### 总结

effect 是 Vue 3 响应式系统的底层驱动。ReactiveEffect 实例在执行时将自己设为 activeEffect，函数体中读取响应式属性时通过 track 建立依赖关系。effect 栈处理嵌套场景，每次执行前清理旧依赖避免残留。watchEffect、watch、computed 和组件渲染都基于 effect 构建。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### track依赖收集阶段

### 概念说明

`track` 是 Vue 3 响应式系统中负责依赖收集的核心函数。当响应式对象的属性被读取时（通过 Proxy 的 get/has/ownKeys 陷阱），track 被调用，将当前正在执行的 effect（activeEffect）记录到该属性的依赖集合中。

track 操作的数据结构是三层映射：`targetMap`（WeakMap<对象, Map>）→ `depsMap`（Map<属性名, Dep>）→ `dep`（依赖集合）。这种结构可以精确到"某个对象的某个属性被哪些 effect 依赖"。Vue 3.4 之前 dep 使用 Set 存储 effect，3.4+ 改为双向链表结构以提升性能。

track 只有在 activeEffect 存在时才执行。如果当前没有正在执行的 effect（比如在普通函数中读取响应式属性），track 会直接跳过，不进行任何收集。

### 基本示例

```javascript
// 示例说明：track 的工作原理

// ===== 完整的 track 实现（简化版） =====
const targetMap = new WeakMap(); // 全局依赖映射
let activeEffect = null;         // 当前活跃的 effect
let shouldTrack = true;          // 是否应该收集依赖

function track(target, type, key) {
    // 前置条件检查
    if (!shouldTrack || !activeEffect) {
        return; // 没有活跃 effect 或暂停追踪时跳过
    }

    // 第一层：获取目标对象的依赖映射
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        targetMap.set(target, (depsMap = new Map()));
    }

    // 第二层：获取具体属性的依赖集合
    let dep = depsMap.get(key);
    if (!dep) {
        depsMap.set(key, (dep = new Set()));
    }

    // 第三层：将当前 effect 添加到依赖集合
    if (!dep.has(activeEffect)) {
        dep.add(activeEffect);
        // 反向记录：effect 也保存它依赖的 dep（用于清理）
        activeEffect.deps.push(dep);
    }
}

// ===== track 被触发的场景 =====
import { reactive, watchEffect } from "vue";

const state = reactive({
    name: "张三",
    age: 25,
    address: { city: "北京" },
});

// watchEffect 内部创建了一个 effect
watchEffect(() => {
    // 读取 state.name → get 陷阱 → track(state, "get", "name")
    console.log(state.name);

    // 读取 state.age → get 陷阱 → track(state, "get", "age")
    console.log(state.age);

    // 读取 state.address → get → track(state, "get", "address")
    // 读取 state.address.city → get → track(addressProxy, "get", "city")
    console.log(state.address.city);
});

// 此时 targetMap 中的结构：
// WeakMap {
//   state → Map {
//     "name" → Set { watchEffect的effect },
//     "age" → Set { watchEffect的effect },
//     "address" → Set { watchEffect的effect }
//   },
//   addressProxy → Map {
//     "city" → Set { watchEffect的effect }
//   }
// }
```

### 内部原理

#### track 的类型分类

```
track 的触发类型（TrackOpTypes）：

GET    → 普通属性读取（obj.key）
HAS    → in 操作符（key in obj）
ITERATE → 遍历操作（Object.keys / for...in）

不同类型对应不同的陷阱：
  get 陷阱 → track(target, "get", key)
  has 陷阱 → track(target, "has", key)
  ownKeys 陷阱 → track(target, "iterate", ITERATE_KEY)

双向依赖关系：
  dep → effect：属性变化时找到需要重新执行的 effect
  effect → dep：effect 重新执行前清理旧的依赖关系

清理旧依赖的意义：
  effect(() => {
      if (state.show) {
          console.log(state.name);  // show=true 时依赖 name
      } else {
          console.log(state.age);   // show=false 时依赖 age
      }
  });
  // 当 show 从 true 变为 false 时
  // 应该清除对 name 的依赖，添加对 age 的依赖
  // 否则修改 name 还会触发这个 effect（多余的执行）
```

### 与相关API的对比

| track 类型 | 触发操作 | Proxy 陷阱 | 依赖的 key |
|-----------|---------|-----------|-----------|
| GET | `obj.key` | get | 属性名 |
| HAS | `key in obj` | has | 属性名 |
| ITERATE | `Object.keys(obj)` | ownKeys | ITERATE_KEY |

### 适用场景

- **模板渲染：** 模板中引用的响应式数据自动被 track
- **watchEffect：** 回调中访问的属性自动被 track
- **computed：** getter 中访问的属性自动被 track
- **watch 的 getter：** watch 的侦听源被 track

### 常见问题

#### 为什么有时候修改数据不触发更新

**解决方案：**

```javascript
import { reactive, watchEffect } from "vue";

const state = reactive({ count: 0 });

// track 只在 effect 执行期间发生
// 如果属性没有在 effect 中被读取，就不会建立依赖

// 情况1：异步代码中读取 → 不被 track
watchEffect(async () => {
    await new Promise((r) => setTimeout(r, 100));
    // 这时 activeEffect 已经不存在了
    console.log(state.count); // 不被 track
});

// 情况2：条件分支中未执行的路径
watchEffect(() => {
    if (false) {
        console.log(state.count); // 永远不执行，不被 track
    }
});

// 修改 state.count 不会触发上面的 watchEffect
```

### 注意事项

- track 只在 activeEffect 存在时才执行
- targetMap 使用 WeakMap，对象被垃圾回收时依赖自动清理
- 每次 effect 重新执行前清理旧依赖，避免残留
- effect 和 dep 之间是双向引用关系
- 异步操作中 activeEffect 已恢复，读取不会被 track
- shouldTrack 标志位可以暂停依赖收集

### 总结

track 是响应式系统中依赖收集的核心函数，在属性被读取时将 activeEffect 记录到 targetMap → depsMap → dep 三层结构中。支持 GET、HAS、ITERATE 三种追踪类型。effect 和 dep 之间建立双向引用，每次 effect 执行前清理旧依赖。只有在 activeEffect 存在时才进行收集。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### trigger触发更新阶段

### 概念说明

`trigger` 是 Vue 3 响应式系统中负责触发更新的核心函数。当响应式对象的属性被修改（set）、删除（deleteProperty）时，trigger 被调用，从 targetMap 中找到与该属性关联的所有 effect，然后逐一执行或交给调度器处理。

trigger 需要根据操作类型（ADD/SET/DELETE）决定除了该属性直接依赖的 effect 之外，是否还需要触发与遍历相关的 effect（ITERATE_KEY 对应的 effect）。比如新增属性会改变 Object.keys() 的结果，所以需要触发迭代相关的 effect；而修改已有属性不改变属性列表，就不需要触发。

trigger 还要处理一些边界情况：避免正在执行的 effect 触发自身（防止无限递归）、优先执行 computed 的 effect（保证计算属性在渲染前更新）等。

### 基本示例

```javascript
// 示例说明：trigger 的工作原理

// ===== 完整的 trigger 实现（简化版） =====
const ITERATE_KEY = Symbol("iterate");

function trigger(target, type, key, newValue, oldValue) {
    // 从全局映射中获取目标对象的依赖
    const depsMap = targetMap.get(target);
    if (!depsMap) return; // 没有任何依赖，直接返回

    // 收集需要执行的 effect
    const effectsToRun = new Set();

    // 辅助函数：将 dep 中的 effect 添加到待执行集合
    function addEffects(dep) {
        if (!dep) return;
        dep.forEach((effect) => {
            // 避免 effect 触发自身（防无限递归）
            if (effect !== activeEffect) {
                effectsToRun.add(effect);
            }
        });
    }

    // 添加该属性直接依赖的 effect
    addEffects(depsMap.get(key));

    // 根据操作类型，决定是否触发额外的 effect
    if (type === "ADD" || type === "DELETE") {
        // 新增或删除属性 → 属性列表变化
        // 需要触发 ITERATE_KEY 对应的 effect
        if (Array.isArray(target)) {
            // 数组新增元素 → 触发 length 相关的 effect
            addEffects(depsMap.get("length"));
        } else {
            addEffects(depsMap.get(ITERATE_KEY));
        }
    }

    // 如果是数组且修改了 length
    if (Array.isArray(target) && key === "length") {
        // 需要触发所有索引 >= 新 length 的 effect
        depsMap.forEach((dep, mapKey) => {
            if (mapKey >= newValue) {
                addEffects(dep);
            }
        });
    }

    // 执行所有收集到的 effect
    effectsToRun.forEach((effect) => {
        if (effect.scheduler) {
            // 有调度器 → 交给调度器（批量更新、异步队列等）
            effect.scheduler();
        } else {
            // 没有调度器 → 直接执行
            effect.run();
        }
    });
}
```

### 内部原理

#### trigger 的操作类型与触发规则

```
TriggerOpTypes 操作类型：

SET（修改属性）：
  → 触发该属性的直接依赖
  → 不触发 ITERATE_KEY 依赖（属性列表没变）

ADD（新增属性）：
  → 触发该属性的直接依赖（如果有预先依赖）
  → 触发 ITERATE_KEY 依赖（属性列表变了）
  → 数组：触发 length 依赖

DELETE（删除属性）：
  → 触发该属性的直接依赖
  → 触发 ITERATE_KEY 依赖（属性列表变了）

数组特殊处理：
  → 修改 length：触发所有 >= 新 length 的索引依赖
  → push/pop 等方法：内部会触发 length 变化
  → 索引赋值超出当前 length：同时触发 length 依赖

执行优先级：
  → computed effect 优先执行
  → 保证 computed 在渲染 effect 之前更新
  → 避免渲染时读到过期的 computed 值
```

### 与相关API的对比

| 操作类型 | 触发该属性 dep | 触发 ITERATE_KEY dep | 触发 length dep |
|---------|--------------|---------------------|----------------|
| SET | 是 | 否 | 否 |
| ADD | 是 | 是（对象）| 是（数组）|
| DELETE | 是 | 是 | 否 |
| 修改 length | 否 | 否 | 是 + 受影响的索引 |

### 适用场景

- **属性赋值：** `state.count = 10` → trigger(SET)
- **新增属性：** `state.newProp = 'value'` → trigger(ADD)
- **删除属性：** `delete state.prop` → trigger(DELETE)
- **数组操作：** `arr.push(item)` → trigger(ADD) + length

### 常见问题

#### 为什么同时修改多个属性只渲染一次

**解决方案：**

```javascript
import { reactive } from "vue";

const state = reactive({ a: 1, b: 2, c: 3 });

// 同步修改多个属性
state.a = 10; // trigger → 调度器将渲染 effect 放入微任务队列
state.b = 20; // trigger → 渲染 effect 已在队列中，跳过重复
state.c = 30; // trigger → 同上

// 当前同步代码执行完毕后
// 微任务队列中的渲染 effect 只执行一次
// 这就是 Vue 的批量更新机制
// 核心是 scheduler 将 effect 放入队列而非直接执行
```

### 注意事项

- trigger 会跳过正在执行的 effect（防止无限递归）
- scheduler 实现批量更新，多次触发合并为一次执行
- computed effect 优先于渲染 effect 执行
- 数组 length 修改需要特殊处理受影响的索引
- ADD 和 DELETE 会额外触发 ITERATE_KEY 依赖
- trigger 中收集 effect 使用 Set 去重

### 总结

trigger 从 targetMap 中查找被修改属性的依赖 effect 并执行。根据操作类型（SET/ADD/DELETE）决定是否额外触发迭代相关的 effect。通过 scheduler 实现批量更新，避免频繁渲染。trigger 还处理了防止无限递归、computed 优先执行、数组 length 特殊处理等边界情况。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### 依赖的清理与收集优化

### 概念说明

Vue 3 的响应式系统在每次 effect 重新执行前，会先清理该 effect 的所有旧依赖关系，然后在执行过程中重新收集依赖。这个机制解决了"条件分支切换导致多余依赖"的问题。

考虑这个场景：effect 中有一个 `if (state.show)` 分支，当 show 为 true 时读取 `state.name`，当 show 为 false 时读取 `state.age`。如果 show 从 true 变为 false，effect 应该不再依赖 name，只依赖 age。如果不清理旧依赖，修改 name 仍然会触发这个 effect，造成不必要的执行。

Vue 3.4 之前使用"全量清理 + 重新收集"策略，每次执行前删除所有依赖然后重新建立。Vue 3.4+ 引入了基于双向链表的优化方案，通过版本号标记来识别哪些依赖仍然有效、哪些已过期，避免了频繁的 Set 增删操作。

### 基本示例

```javascript
// 示例说明：依赖清理的必要性

import { reactive, watchEffect } from "vue";

const state = reactive({
    show: true,
    name: "张三",
    age: 25,
});

// 这个 watchEffect 的依赖会随 show 的值动态变化
watchEffect(() => {
    if (state.show) {
        // show 为 true 时，依赖 show 和 name
        console.log("名字:", state.name);
    } else {
        // show 为 false 时，依赖 show 和 age
        console.log("年龄:", state.age);
    }
});

// 第一次执行：依赖 = { show, name }
state.name = "李四";  // 触发更新（name 在依赖中）

// 切换分支
state.show = false;
// 重新执行：先清理旧依赖 { show, name }
// 执行后新依赖 = { show, age }

state.name = "王五";  // 不触发更新！（name 已不在依赖中）
state.age = 30;       // 触发更新（age 在依赖中）
```

### 内部原理

#### 清理策略的演进

```
Vue 3.0 - 3.3 的清理策略（全量清理）：

每次 effect.run() 时：
  1. cleanupEffect(effect)
     → 遍历 effect.deps 数组
     → 从每个 dep(Set) 中删除当前 effect
     → 清空 effect.deps
  2. 执行 fn()
     → 读取属性 → track → 重新将 effect 添加到 dep
     → 将 dep 添加到 effect.deps

问题：
  → 每次都全量删除再重新添加
  → Set 的 add/delete 频繁操作有性能开销
  → 大多数情况依赖没有变化，全量操作浪费

Vue 3.4+ 的优化策略（版本号标记）：

  1. 每次 effect.run() 时递增全局版本号
  2. track 时标记 dep 的版本号
  3. effect 执行完毕后对比版本号：
     → 版本号匹配 → 依赖仍然有效，保留
     → 版本号不匹配 → 依赖已过期，移除
  4. 避免了对未变化的依赖做无用的删除和添加

性能提升：
  → 减少 Set 操作次数
  → 依赖没变化时几乎零开销
  → 双向链表结构遍历更高效
```

### 与相关API的对比

| 策略 | Vue 版本 | 清理方式 | 性能特点 |
|------|---------|---------|---------|
| 全量清理 | 3.0-3.3 | 删除所有旧依赖再重建 | Set 增删频繁 |
| 版本号标记 | 3.4+ | 标记版本号对比差异 | 未变化依赖零开销 |

### 适用场景

- **条件渲染：** `v-if` 切换导致依赖路径变化
- **动态表达式：** 模板中根据条件读取不同属性
- **watchEffect：** 回调中有条件分支读取不同数据

### 常见问题

#### 依赖不清理会有什么后果

**解决方案：**

```javascript
// 如果不清理旧依赖：
// 1. 多余的 effect 执行 → 性能浪费
// 2. 可能导致逻辑错误（已不关心的数据变化触发了回调）

// Vue 自动处理依赖清理，开发者无需手动干预
// 但需要理解这个机制来排查性能问题

// 如果发现某个 watchEffect 被频繁触发
// 检查是否有条件分支导致依赖不稳定
// 考虑将稳定的依赖和不稳定的依赖拆分到不同的 watchEffect 中
```

### 注意事项

- Vue 自动处理依赖清理，开发者不需要手动管理
- 条件分支会导致依赖动态变化，每次执行可能收集不同的依赖
- Vue 3.4+ 的版本号优化大幅减少了依赖清理的开销
- 过多的条件分支可能导致频繁的依赖变化，影响性能
- 可以将稳定依赖和动态依赖拆分到不同的 effect 中

### 总结

Vue 3 在每次 effect 执行时清理旧依赖并重新收集，确保依赖关系始终与实际的数据访问路径一致。3.4 之前采用全量清理策略，3.4+ 引入版本号标记优化，只清理真正过期的依赖。这个机制解决了条件分支切换导致多余依赖的问题，是响应式系统精确更新的关键保障。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### effect的调度器scheduler配置

### 概念说明

`scheduler`（调度器）是 ReactiveEffect 的一个可选配置，它控制 effect 在被 trigger 触发后"如何执行"以及"何时执行"。当 trigger 找到需要重新执行的 effect 时，如果该 effect 配置了 scheduler，trigger 不会直接调用 `effect.run()`，而是调用 `effect.scheduler()`，把执行时机的控制权交给调度器。

Vue 的批量更新机制就是通过 scheduler 实现的：组件渲染 effect 的 scheduler 会将更新任务放入一个异步队列（微任务），而不是立即重新渲染。这样，同一个事件循环中多次修改数据只会触发一次渲染。computed 的 scheduler 负责将计算属性标记为 dirty 而非立即重新计算。watch 的 scheduler 控制回调在 DOM 更新前还是更新后执行。

### 基本示例

```javascript
// 示例说明：scheduler 的作用

// ===== 没有 scheduler：数据变化立即执行 =====
function effectWithoutScheduler() {
    const state = reactive({ count: 0 });
    
    effect(() => {
        console.log("count:", state.count);
    });
    
    state.count = 1; // 立即输出 "count: 1"
    state.count = 2; // 立即输出 "count: 2"
    state.count = 3; // 立即输出 "count: 3"
    // 总共执行了 4 次（初始 1 次 + 修改 3 次）
}

// ===== 有 scheduler：控制执行时机 =====
function effectWithScheduler() {
    const state = reactive({ count: 0 });
    const jobQueue = new Set();       // 去重队列
    let isFlushing = false;           // 是否正在刷新

    // 刷新队列（微任务中执行）
    function flushJobs() {
        if (isFlushing) return;
        isFlushing = true;
        Promise.resolve().then(() => {
            jobQueue.forEach((job) => job());
            jobQueue.clear();
            isFlushing = false;
        });
    }

    const runner = effect(
        () => {
            console.log("count:", state.count);
        },
        {
            // scheduler 控制执行时机
            scheduler() {
                // 不立即执行 effect，而是放入队列
                jobQueue.add(runner.run.bind(runner));
                flushJobs();
            },
        }
    );

    state.count = 1; // scheduler 将任务放入队列
    state.count = 2; // scheduler 再次放入（Set 去重，只保留一个）
    state.count = 3; // 同上
    console.log("同步代码执行完毕");
    // 微任务中执行一次：输出 "count: 3"
    // 总共只执行 2 次（初始 1 次 + 微任务 1 次）
}
```

### 内部原理

#### Vue 中不同 effect 的 scheduler 实现

```
组件渲染 effect 的 scheduler：
  scheduler() {
      // 将组件更新任务放入异步队列
      queueJob(instance.update);
      // 多次调用只入队一次（队列内部去重）
  }
  → 结果：同步代码中多次修改数据，只触发一次渲染

computed 的 scheduler：
  scheduler() {
      // 不立即重新计算
      // 只标记为 dirty
      if (!this._dirty) {
          this._dirty = true;
          // 通知依赖 computed 的 effect
          triggerRefValue(this);
      }
  }
  → 结果：数据变化时不立即计算，下次读取时才重新计算

watch 的 scheduler（flush: 'pre'）：
  scheduler() {
      // 在组件更新前执行回调
      queuePreFlushCb(job);
  }

watch 的 scheduler（flush: 'post'）：
  scheduler() {
      // 在组件更新后执行回调
      queuePostFlushCb(job);
  }

watch 的 scheduler（flush: 'sync'）：
  scheduler() {
      // 立即同步执行回调
      job();
  }
```

### 与相关API的对比

| effect 使用者 | scheduler 行为 | 执行时机 |
|--------------|---------------|---------|
| 组件渲染 | 放入异步更新队列 | 微任务中执行 |
| computed | 标记 dirty | 下次读取时执行 |
| watch(flush:'pre') | 放入 pre 队列 | DOM 更新前 |
| watch(flush:'post') | 放入 post 队列 | DOM 更新后 |
| watch(flush:'sync') | 同步执行 | 立即执行 |
| watchEffect | 放入 pre 队列 | DOM 更新前 |

### 适用场景

- **批量更新：** 多次修改合并为一次渲染
- **异步执行：** 将 effect 执行延迟到微任务
- **优先级控制：** 控制不同 effect 的执行顺序
- **惰性求值：** computed 标记 dirty 而非立即计算

### 常见问题

#### watch 的 flush 选项如何选择

**解决方案：**

```javascript
import { watch, ref } from "vue";

const count = ref(0);

// flush: 'pre'（默认）→ 回调在 DOM 更新前执行
watch(count, (newVal) => {
    // 此时 DOM 还是旧的
    console.log("pre:", newVal);
});

// flush: 'post' → 回调在 DOM 更新后执行
watch(count, (newVal) => {
    // 此时 DOM 已经更新，可以安全读取 DOM
    console.log("post:", newVal);
}, { flush: "post" });

// flush: 'sync' → 同步执行（慎用）
watch(count, (newVal) => {
    // 数据变化后立即执行，不经过批处理
    console.log("sync:", newVal);
}, { flush: "sync" });
```

### 注意事项

- scheduler 把执行时机的控制权从 trigger 转移给调度器
- Vue 的批量更新依赖 scheduler + 异步队列实现
- computed 的 scheduler 实现惰性求值（标记 dirty）
- watch 的 flush 选项实际上就是配置不同的 scheduler
- flush: 'sync' 会跳过批处理，可能导致性能问题
- 不要在 scheduler 中做耗时操作

### 总结

scheduler 是 effect 的执行调度器，控制 effect 被触发后的执行时机和方式。Vue 的批量更新（异步队列）、computed 的惰性求值（dirty 标记）、watch 的回调时机控制（flush 选项），都通过 scheduler 实现。scheduler 是 trigger 和实际执行之间的中间层，是 Vue 性能优化的关键机制。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### effect的lazy懒执行

### 概念说明

默认情况下，effect 在创建后会立即执行一次回调函数来完成初始的依赖收集。但通过设置 `lazy: true` 选项，可以让 effect 在创建时不自动执行，而是由调用者在合适的时机手动调用 `effect.run()` 来触发首次执行。

lazy 选项最典型的使用场景是 `computed`。计算属性在创建时不需要立即计算值，只有在第一次被读取时才需要执行 getter 函数。所以 computed 内部创建的 effect 就是 lazy 的——创建时不执行，当 `.value` 被读取时才调用 `effect.run()` 计算并缓存结果。

### 基本示例

```javascript
// 示例说明：lazy 选项的作用

// ===== 默认行为：立即执行 =====
const state = reactive({ count: 0 });

effect(() => {
    console.log("立即执行:", state.count);
});
// 创建后立即输出："立即执行: 0"

// ===== lazy: true：延迟执行 =====
const lazyRunner = effect(
    () => {
        console.log("懒执行:", state.count);
        return state.count * 2; // 可以有返回值
    },
    { lazy: true } // 不立即执行
);
// 创建后没有任何输出

// 手动触发执行
const result = lazyRunner.run();
// 输出："懒执行: 0"
// result = 0（返回值）

// ===== computed 利用 lazy =====
// computed 的简化实现
function computed(getter) {
    let cachedValue;
    let dirty = true; // 是否需要重新计算

    const _effect = effect(getter, {
        lazy: true, // 不立即执行
        scheduler() {
            // 数据变化时不立即重新计算
            // 只标记为 dirty
            if (!dirty) {
                dirty = true;
            }
        },
    });

    return {
        get value() {
            if (dirty) {
                // 第一次读取或数据变化后读取
                cachedValue = _effect.run(); // 手动执行
                dirty = false;
            }
            return cachedValue;
        },
    };
}
```

### 内部原理

#### lazy 在 effect 创建中的处理

```
effect 函数的核心逻辑：

function effect(fn, options = {}) {
    const _effect = new ReactiveEffect(fn, options.scheduler);

    if (!options.lazy) {
        // 默认行为：立即执行
        _effect.run();
    }
    // lazy: true 时跳过，不执行

    // 返回 effect 实例（或 runner 函数）
    return _effect;
}

lazy 的使用者：
  → computed：创建时不计算，读取时才执行
  → watch 的 immediate:false：创建时不执行回调
  → 底层都是 lazy effect + 手动 run()
```

### 与相关API的对比

| API | lazy | 首次执行时机 |
|-----|------|------------|
| watchEffect | false | 创建后立即执行 |
| watch(immediate:false) | true | 数据变化后执行 |
| watch(immediate:true) | false | 创建后立即执行 |
| computed | true | 第一次读取 .value 时 |
| 组件渲染 effect | false | 创建后立即渲染 |

### 适用场景

- **computed：** 惰性求值，读取时才计算
- **watch：** 默认不立即执行回调
- **自定义响应式逻辑：** 需要控制首次执行时机

### 常见问题

#### lazy effect 如何手动触发

**解决方案：**

```javascript
// lazy effect 返回 ReactiveEffect 实例
const runner = effect(() => state.count * 2, { lazy: true });

// 方式1：调用 run()
const value = runner.run(); // 手动执行并获取返回值

// 方式2：绑定为 runner 函数（Vue 内部常用）
const runnerFn = runner.run.bind(runner);
const value2 = runnerFn(); // 等价于 runner.run()
```

### 注意事项

- lazy effect 创建时不执行，不进行依赖收集
- 必须手动调用 run() 才会执行并收集依赖
- computed 内部就是 lazy effect + scheduler
- lazy effect 的 run() 会返回回调函数的返回值
- 数据变化后 trigger 仍然通过 scheduler 或直接触发重新执行

### 总结

lazy 选项让 effect 在创建时不自动执行，由调用者手动控制首次执行时机。computed 利用 lazy effect 实现惰性求值：创建时不计算，第一次读取 `.value` 时才执行 `effect.run()` 并缓存结果。lazy 是 effect 灵活性的重要组成部分。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### effect的onTrack/onTrigger调试

### 概念说明

`onTrack` 和 `onTrigger` 是 Vue 3 提供的调试钩子，只在开发环境中生效。它们可以帮助开发者观察响应式系统内部的依赖收集和更新触发过程。

`onTrack` 在依赖被收集时调用（track 阶段），告诉你哪个 effect 依赖了哪个对象的哪个属性。`onTrigger` 在依赖被触发时调用（trigger 阶段），告诉你哪个属性的变化导致了哪个 effect 的重新执行。

这两个钩子可以在 `watchEffect`、`watch`、`computed` 的选项中配置。在排查"为什么组件重新渲染了"或"为什么 watch 没有触发"等问题时非常有用。

### 基本示例

```vue
<script setup>
// 示例说明：onTrack 和 onTrigger 的调试用法

import { ref, watchEffect, watch, computed } from "vue";

const count = ref(0);
const name = ref("张三");

// ===== watchEffect 中使用 =====
watchEffect(
    () => {
        // 读取 count.value → 触发 onTrack
        console.log("count:", count.value);
    },
    {
        // 依赖被收集时触发
        onTrack(event) {
            // event 包含：
            // - effect：当前 effect 实例
            // - target：被追踪的目标对象（ref 的内部对象）
            // - type：追踪类型（"get"）
            // - key：被追踪的属性名（"value"）
            console.log("依赖收集:", event.type, event.key);
            // 可以打断点调试
            // debugger;
        },
        // 依赖变化触发更新时触发
        onTrigger(event) {
            // event 包含：
            // - effect：被触发的 effect 实例
            // - target：被修改的目标对象
            // - type：触发类型（"set"）
            // - key：被修改的属性名（"value"）
            // - newValue：新值
            // - oldValue：旧值
            console.log("触发更新:", event.type, event.key, event.newValue);
            // debugger;
        },
    }
);

// ===== watch 中使用 =====
watch(
    count,
    (newVal, oldVal) => {
        console.log("watch:", newVal);
    },
    {
        onTrack(e) {
            console.log("watch track:", e.key);
        },
        onTrigger(e) {
            console.log("watch trigger:", e.key, e.newValue);
        },
    }
);

// ===== computed 中使用 =====
const double = computed(
    () => count.value * 2,
    {
        onTrack(e) {
            console.log("computed track:", e.key);
        },
        onTrigger(e) {
            console.log("computed trigger:", e.key);
        },
    }
);

// 修改 count → 触发 onTrigger
count.value = 1;
</script>
```

### 内部原理

#### onTrack/onTrigger 的调用位置

```
track 函数中（简化）：

function track(target, type, key) {
    if (!activeEffect) return;
    // ... 正常的依赖收集逻辑

    // 开发环境下调用 onTrack 钩子
    if (__DEV__ && activeEffect.onTrack) {
        activeEffect.onTrack({
            effect: activeEffect,
            target,
            type,     // "get" | "has" | "iterate"
            key,
        });
    }
}

trigger 函数中（简化）：

function trigger(target, type, key, newValue, oldValue) {
    // ... 收集需要执行的 effect
    effectsToRun.forEach((effect) => {
        // 开发环境下调用 onTrigger 钩子
        if (__DEV__ && effect.onTrigger) {
            effect.onTrigger({
                effect,
                target,
                type,      // "set" | "add" | "delete"
                key,
                newValue,
                oldValue,
            });
        }
        // 执行 effect
    });
}
```

### 与相关API的对比

| 钩子 | 触发时机 | event 包含 | 作用 |
|------|---------|-----------|------|
| onTrack | track（依赖收集） | effect, target, type, key | 查看依赖了哪些数据 |
| onTrigger | trigger（触发更新） | effect, target, type, key, newValue, oldValue | 查看什么数据变化导致了更新 |

### 适用场景

- **排查多余渲染：** 查看哪些数据变化触发了组件更新
- **排查 watch 不触发：** 检查依赖是否正确收集
- **性能调试：** 观察某个 effect 依赖了多少个响应式属性
- **学习响应式原理：** 直观观察 track 和 trigger 的过程

### 常见问题

#### 生产环境中 onTrack/onTrigger 会生效吗

**解决方案：**

```javascript
// onTrack 和 onTrigger 只在开发环境中生效
// 生产构建（NODE_ENV=production）时会被 tree-shaking 移除
// 不会影响生产环境的性能

// 如果需要在生产环境中追踪响应式行为
// 可以使用 watch 的回调来间接观察
// 或使用 Vue Devtools 的时间线功能
```

### 注意事项

- 只在开发环境中生效，生产环境自动移除
- 可以在回调中使用 debugger 打断点
- event 对象包含详细的追踪/触发信息
- 不要在这些钩子中修改响应式数据（可能导致无限循环）
- 适合临时调试使用，不要作为业务逻辑的一部分
- computed 的 onTrack/onTrigger 作为第二个参数传入

### 总结

onTrack 和 onTrigger 是开发环境专用的调试钩子。onTrack 在依赖收集时触发，onTrigger 在更新触发时触发。它们提供详细的事件信息（目标对象、属性名、操作类型、新旧值），帮助排查响应式相关的问题。可以在 watchEffect、watch、computed 的选项中配置。生产环境中自动移除，不影响性能。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### effect作用域(Effect Scope)的批量清理

### 概念说明

Effect Scope（效果作用域）是 Vue 3.2 引入的概念，用于将多个 effect 归为一组，以便在需要时一次性停止和清理所有 effect。在组件内部，Vue 会自动为每个组件创建一个 effect scope，当组件卸载时，该 scope 中的所有 effect（包括 watchEffect、watch、computed）会被自动停止和清理。

在组件外部使用响应式 API 时（比如在独立的 composable 函数中、在 Pinia store 中、或者在测试中），没有组件来自动管理 effect 的生命周期。这时就需要手动创建 effect scope 来管理 effect 的清理，避免内存泄漏。

### 基本示例

```javascript
// 示例说明：Effect Scope 的批量清理机制

import { reactive, watchEffect, watch, computed, effectScope } from "vue";

const state = reactive({ count: 0, name: "张三" });

// ===== 创建 effect scope =====
const scope = effectScope();

// 在 scope 内运行，所有创建的 effect 都归属于该 scope
scope.run(() => {
    // 这个 watchEffect 归属于 scope
    watchEffect(() => {
        console.log("count:", state.count);
    });

    // 这个 watch 归属于 scope
    watch(
        () => state.name,
        (newVal) => console.log("name:", newVal)
    );

    // 这个 computed 归属于 scope
    const double = computed(() => state.count * 2);
});

// 数据变化 → 上面的 effect 都会执行
state.count = 1; // watchEffect 和 computed 响应
state.name = "李四"; // watch 响应

// 一次性停止所有 effect
scope.stop();
// 此后数据变化不再触发任何回调
state.count = 2; // 没有任何输出
state.name = "王五"; // 没有任何输出
```

### 内部原理

#### 组件的自动 scope 管理

```
Vue 组件的 setup 执行流程：

1. 创建组件实例时
   → Vue 自动创建 effectScope
   → instance.scope = effectScope()

2. 执行 setup 函数时
   → 在 scope 上下文中执行
   → setup 中的 watchEffect/watch/computed 自动归属于 scope

3. 组件卸载时
   → Vue 自动调用 instance.scope.stop()
   → 所有 effect 被批量清理
   → 无需开发者手动清理

scope 的内部结构：
  class EffectScope {
      effects = [];     // 所属的 effect 列表
      cleanups = [];    // 清理函数列表
      scopes = [];      // 子 scope 列表
      active = true;    // 是否激活

      run(fn) {
          // 将当前 scope 设为 activeEffectScope
          // fn 中创建的 effect 会自动添加到 this.effects
          activeEffectScope = this;
          const result = fn();
          activeEffectScope = parentScope;
          return result;
      }

      stop() {
          // 停止所有 effect
          this.effects.forEach(e => e.stop());
          // 执行清理函数
          this.cleanups.forEach(fn => fn());
          // 停止子 scope
          this.scopes.forEach(s => s.stop());
          this.active = false;
      }
  }
```

### 与相关API的对比

| 场景 | scope 管理方式 | 清理时机 |
|------|--------------|---------|
| 组件内 | Vue 自动创建和清理 | 组件卸载时 |
| Composable 中 | 继承组件的 scope | 组件卸载时 |
| 组件外部 | 手动 effectScope() | 手动 scope.stop() |
| Pinia store | Pinia 管理 scope | store 销毁时 |

### 适用场景

- **组件外使用响应式：** 独立的模块中使用 watch/computed
- **Pinia store：** store 内部管理 effect 生命周期
- **测试：** 测试中创建和清理响应式 effect
- **插件开发：** 插件中管理自己的 effect

### 常见问题

#### 不用 scope 会有什么问题

**解决方案：**

```javascript
// 不用 scope 时，组件外的 effect 无法自动清理
let stopWatch;

function setupOutsideComponent() {
    const state = reactive({ count: 0 });

    // 方式1：手动保存 stop 函数（繁琐）
    stopWatch = watchEffect(() => {
        console.log(state.count);
    });
    // 需要手动调用 stopWatch() 清理
}

// 方式2：使用 effectScope（简洁）
function setupWithScope() {
    const scope = effectScope();
    scope.run(() => {
        // 所有 effect 统一管理
        watchEffect(() => { /* ... */ });
        watch(someRef, () => { /* ... */ });
        const c = computed(() => { /* ... */ });
    });
    // 一次性清理所有
    return () => scope.stop();
}
```

### 注意事项

- 组件内的 effect 由 Vue 自动管理 scope，无需手动处理
- 组件外使用响应式 API 时需要手动创建 scope
- scope.stop() 会停止所有归属的 effect 和子 scope
- scope.run() 的返回值是回调函数的返回值
- 嵌套 scope 支持：子 scope 在父 scope stop 时也会被停止
- 不清理 effect 会导致内存泄漏

### 总结

Effect Scope 将多个 effect 归为一组，支持批量停止和清理。Vue 自动为每个组件创建 scope，组件卸载时自动清理所有 effect。组件外部使用响应式 API 时需要手动创建 effectScope 来管理生命周期。scope.stop() 一次性停止所有 effect，避免内存泄漏。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### effectScope API的显式作用域控制

### 概念说明

`effectScope()` 是 Vue 3.2+ 提供的 API，允许开发者显式创建一个 effect 作用域实例。通过 `scope.run(fn)` 在作用域内执行函数，函数中创建的所有响应式效果（watchEffect、watch、computed）都会被自动归属到该 scope。调用 `scope.stop()` 可以一次性停止和清理所有归属的 effect。

effectScope 还支持 `detached`（分离）模式：默认情况下，子 scope 会被收集到父 scope 中，父 scope stop 时子 scope 也会被停止；设置 `effectScope(true)` 创建分离的 scope，它不会被父 scope 自动停止，需要手动管理生命周期。

配套的 `getCurrentScope()` 函数用于获取当前活跃的 scope，`onScopeDispose(fn)` 用于在当前 scope 被停止时执行清理回调（类似组件的 onUnmounted）。

### 基本示例

```javascript
// 示例说明：effectScope API 的完整用法

import {
    effectScope,
    getCurrentScope,
    onScopeDispose,
    ref,
    watchEffect,
    computed,
} from "vue";

// ===== 基本用法 =====
const scope = effectScope();

const result = scope.run(() => {
    const count = ref(0);

    watchEffect(() => console.log("count:", count.value));

    const double = computed(() => count.value * 2);

    // onScopeDispose：scope 被 stop 时执行
    onScopeDispose(() => {
        console.log("scope 被清理了");
        // 可以在这里做资源释放，类似 onUnmounted
    });

    // run 的返回值
    return { count, double };
});

// result.count.value = 1; // 触发 watchEffect
// scope.stop(); // 停止所有 effect，输出 "scope 被清理了"

// ===== 嵌套 scope =====
const parentScope = effectScope();

parentScope.run(() => {
    // 普通子 scope：父 scope stop 时也会被 stop
    const childScope = effectScope();
    childScope.run(() => {
        watchEffect(() => console.log("child effect"));
    });

    // 分离子 scope：父 scope stop 时不会被 stop
    const detachedScope = effectScope(true); // true = detached
    detachedScope.run(() => {
        watchEffect(() => console.log("detached effect"));
    });
    // detachedScope 需要手动 stop
});

parentScope.stop();
// childScope 也被停止
// detachedScope 仍然存活，需要手动 detachedScope.stop()

// ===== 在 composable 中使用 =====
function useMouse() {
    const x = ref(0);
    const y = ref(0);

    function handler(e) {
        x.value = e.clientX;
        y.value = e.clientY;
    }

    window.addEventListener("mousemove", handler);

    // 在当前 scope 被清理时移除事件监听
    onScopeDispose(() => {
        window.removeEventListener("mousemove", handler);
    });

    return { x, y };
}
```

### 内部原理

#### effectScope 的关键方法

```
effectScope 的核心 API：

effectScope(detached?: boolean)
  → 创建一个新的 effect scope
  → detached=false（默认）：会被父 scope 收集
  → detached=true：不被父 scope 收集

scope.run(fn)
  → 将当前 activeEffectScope 设为 this
  → 执行 fn
  → fn 中创建的 effect 自动添加到 this.effects
  → 恢复之前的 activeEffectScope
  → 返回 fn 的返回值

scope.stop()
  → 停止 this.effects 中的所有 effect
  → 执行 this.cleanups 中的所有清理函数（onScopeDispose）
  → 递归停止所有非 detached 的子 scope
  → 设置 this.active = false

getCurrentScope()
  → 返回当前 activeEffectScope
  → 在组件 setup 中调用返回组件的 scope

onScopeDispose(fn)
  → 将 fn 添加到当前 scope 的 cleanups 数组
  → scope.stop() 时会调用 fn
```

### 与相关API的对比

| API | 作用 | 使用场景 |
|-----|------|---------|
| effectScope() | 创建 scope 实例 | 管理一组 effect 的生命周期 |
| scope.run(fn) | 在 scope 中执行函数 | 注册 effect 到 scope |
| scope.stop() | 停止所有 effect | 清理和释放资源 |
| getCurrentScope() | 获取当前 scope | 判断是否在 scope 上下文中 |
| onScopeDispose(fn) | 注册清理回调 | 释放事件监听等资源 |

### 适用场景

- **Composable 函数：** 使用 onScopeDispose 注册清理逻辑
- **Pinia Store：** 内部使用 effectScope 管理 store 的 effect
- **独立模块：** 组件外部使用响应式 API
- **测试：** 测试中隔离和清理响应式 effect

### 常见问题

#### onScopeDispose 和 onUnmounted 的区别

**解决方案：**

```javascript
import { onScopeDispose, onUnmounted } from "vue";

// onUnmounted：只在组件中使用，组件卸载时触发
// onScopeDispose：在任何 scope 中使用，scope stop 时触发

// 在组件的 setup 中，两者效果相同
// 因为组件卸载时会 stop 组件的 scope

// 在 composable 中推荐使用 onScopeDispose
// 因为 composable 可能在组件外部使用（如 Pinia store）
function useInterval(fn, interval) {
    const timer = setInterval(fn, interval);
    // 不管在组件中还是组件外，都能正确清理
    onScopeDispose(() => clearInterval(timer));
}
```

### 注意事项

- effectScope 是显式管理 effect 生命周期的工具
- 默认子 scope 跟随父 scope 停止，detached 子 scope 需手动停止
- onScopeDispose 比 onUnmounted 更通用（不限于组件上下文）
- scope.run 的返回值是回调函数的返回值
- scope.stop() 后 scope.active 变为 false，不能再 run
- composable 中优先使用 onScopeDispose 而非 onUnmounted

### 总结

effectScope API 提供了显式的 effect 生命周期管理。scope.run() 将 effect 注册到 scope 中，scope.stop() 批量清理。支持嵌套和 detached 模式。onScopeDispose 注册清理回调，比 onUnmounted 更通用。Pinia、composable 函数和组件外部使用响应式 API 时，effectScope 是管理 effect 生命周期的标准工具。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### 计算属性computed的惰性求值

### 概念说明

`computed()` 创建一个计算属性，它基于其依赖的响应式数据进行缓存。计算属性只有在依赖数据变化后才会重新计算，多次读取相同的计算属性在依赖未变化时只会返回缓存值，不会重复执行 getter 函数。这就是所谓的"惰性求值"（lazy evaluation）。

computed 内部基于 ReactiveEffect 实现，创建时使用 `lazy: true` 选项，不会立即执行 getter。当第一次读取 `.value` 时才执行 getter 并缓存结果。后续读取直接返回缓存值。当依赖的响应式数据变化时，effect 的 scheduler 将 computed 标记为 dirty（脏），但不会立即重新计算，直到下一次读取 `.value` 时才重新执行 getter。

这种机制避免了不必要的计算：如果一个 computed 的依赖频繁变化，但 computed 本身没有被读取，getter 不会执行任何一次。

### 基本示例

```vue
<script setup>
// 示例说明：computed 的惰性求值和缓存行为

import { ref, computed } from "vue";

const firstName = ref("张");
const lastName = ref("三");

// 创建计算属性
const fullName = computed(() => {
    console.log("getter 执行了"); // 用于观察执行次数
    return firstName.value + lastName.value;
});

// 第一次读取 → 执行 getter → 缓存结果
console.log(fullName.value); // 输出 "getter 执行了"，返回 "张三"

// 再次读取 → 依赖未变化 → 直接返回缓存值
console.log(fullName.value); // 不输出 "getter 执行了"，返回 "张三"
console.log(fullName.value); // 不输出 "getter 执行了"，返回 "张三"

// 修改依赖 → computed 标记为 dirty（但不立即计算）
firstName.value = "李";
// 此时 getter 还没有执行

// 下次读取时 → 发现 dirty → 重新执行 getter
console.log(fullName.value); // 输出 "getter 执行了"，返回 "李三"

// ===== 计算属性 vs 方法 =====
// 方法：每次调用都执行
function getFullName() {
    console.log("方法执行了");
    return firstName.value + lastName.value;
}

// 模板中使用方法 → 每次渲染都执行
// 模板中使用 computed → 依赖没变就不执行
</script>

<template>
    <p>{{ fullName }}</p>
</template>
```

### 内部原理

#### computed 的实现机制

```
computed 的简化实现：

class ComputedRefImpl {
    _value;          // 缓存的计算结果
    _dirty = true;   // 是否需要重新计算
    effect;          // 内部的 ReactiveEffect

    constructor(getter) {
        this.effect = new ReactiveEffect(getter, () => {
            // scheduler：依赖变化时触发
            if (!this._dirty) {
                this._dirty = true;  // 标记为脏
                // 通知依赖该 computed 的 effect（如渲染 effect）
                triggerRefValue(this);
            }
        });
        this.effect.computed = this; // 标记为 computed effect
    }

    get value() {
        // 依赖收集：让读取 computed 的 effect 依赖它
        trackRefValue(this);

        if (this._dirty) {
            // dirty 时重新计算
            this._value = this.effect.run();
            this._dirty = false;
        }
        return this._value;
    }
}

执行流程：
1. 创建 computed → effect(getter, { lazy: true, scheduler })
2. 首次读取 .value → dirty=true → effect.run() → getter 执行 → 缓存
3. 再次读取 → dirty=false → 返回缓存
4. 依赖变化 → scheduler → dirty=true → 不执行 getter
5. 下次读取 → dirty=true → effect.run() → getter 执行 → 更新缓存
```

### 与相关API的对比

| 对比维度 | computed | 方法调用 | watch |
|----------|---------|---------|-------|
| 缓存 | 有（依赖不变返回缓存） | 无（每次调用都执行） | 不适用 |
| 执行时机 | 读取时执行 | 调用时执行 | 依赖变化时执行 |
| 返回值 | ref 对象（.value） | 函数返回值 | 无返回值 |
| 惰性 | 是（不读不算） | 否 | 否（默认立即追踪） |

### 适用场景

- **派生数据：** 从现有数据计算出新的值
- **复杂表达式：** 模板中的复杂逻辑提取为 computed
- **性能优化：** 避免模板中重复计算
- **数据格式化：** 格式化显示日期、金额等

### 常见问题

#### computed 的 getter 中不要有副作用

**解决方案：**

```javascript
import { ref, computed, watch } from "vue";

const items = ref([1, 2, 3, 4, 5]);

// 错误：getter 中有副作用（修改其他状态、发请求等）
// const total = computed(() => {
//     console.log("计算中...");  // 日志是副作用
//     fetch("/api/log");          // 网络请求是副作用
//     otherState.value = items.value.length; // 修改状态是副作用
//     return items.value.reduce((a, b) => a + b, 0);
// });

// 正确：getter 只做纯计算
const total = computed(() => {
    return items.value.reduce((a, b) => a + b, 0);
});

// 副作用放到 watch 中
watch(total, (newTotal) => {
    console.log("total 变化了:", newTotal);
});
```

### 注意事项

- computed 是惰性的：不读取就不计算
- computed 有缓存：依赖没变化就不重新计算
- getter 中不要有副作用（修改状态、发请求等）
- computed 返回的是只读 ref（除非提供 setter）
- computed 的 effect 优先于渲染 effect 执行
- 避免在 computed 的 getter 中修改响应式数据

### 总结

computed 通过 lazy effect + dirty 标记 + 缓存实现惰性求值。首次读取时执行 getter 并缓存结果，依赖未变化时直接返回缓存。依赖变化时 scheduler 将 dirty 设为 true，下次读取才重新计算。这种机制避免了不必要的计算，适合从响应式数据派生新值的场景。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### computed的dirty标记与缓存

### 概念说明

computed 内部维护一个 `_dirty` 标志位来控制缓存行为。`_dirty` 为 true 表示缓存已过期，下次读取需要重新计算；`_dirty` 为 false 表示缓存有效，可以直接返回。

初始状态下 `_dirty` 为 true，第一次读取 `.value` 时执行 getter 并缓存结果，然后将 `_dirty` 设为 false。当依赖的响应式数据变化时，trigger 调用 computed 的 scheduler，scheduler 将 `_dirty` 重新设为 true，但不立即执行 getter。直到下一次读取 `.value` 时，检测到 `_dirty` 为 true，才重新执行 getter 更新缓存。

这种"脏检查 + 惰性计算"的模式让 computed 具备两个特性：一是缓存——连续多次读取不会重复计算；二是惰性——依赖变化后如果没有人读取，getter 就不执行，节省不必要的计算。

### 基本示例

```javascript
// 示例说明：dirty 标记和缓存的工作流程

import { ref, computed } from "vue";

const price = ref(100);
const quantity = ref(3);

const total = computed(() => {
    console.log("重新计算 total");
    return price.value * quantity.value;
});

// 状态：_dirty = true（初始状态）

// 第一次读取 → dirty=true → 执行 getter → 缓存 300 → dirty=false
console.log(total.value); // 输出 "重新计算 total"，返回 300

// 第二次读取 → dirty=false → 直接返回缓存
console.log(total.value); // 无输出，返回 300

// 修改依赖 → scheduler → dirty=true（但 getter 没执行）
price.value = 200;
// 此时 total 的 getter 没有执行

// 再次修改 → scheduler → dirty 已经是 true，跳过
quantity.value = 5;
// getter 仍然没有执行

// 读取 → dirty=true → 执行 getter → 缓存 1000 → dirty=false
console.log(total.value); // 输出 "重新计算 total"，返回 1000

// 连续修改两次但只读取一次 → getter 只执行一次
```

### 内部原理

#### dirty 标记的状态转换

```
dirty 标记的状态机：

          创建
           ↓
    ┌─── dirty=true ←────────────┐
    │                             │
    │ 读取 .value                  │ scheduler()
    │ → 执行 getter               │ (依赖变化时)
    │ → 缓存结果                   │
    ↓                             │
    dirty=false ──────────────────┘
    │
    │ 读取 .value
    │ → 返回缓存（不执行 getter）
    ↓
    dirty=false（保持）

scheduler 的关键逻辑：
  scheduler() {
      if (!this._dirty) {
          this._dirty = true;
          // 通知依赖 computed 的 effect
          triggerRefValue(this);
      }
      // 如果已经是 dirty，什么都不做
      // 避免重复触发依赖更新
  }

这意味着：
  → 多次修改依赖数据，scheduler 只在第一次标记 dirty
  → 后续修改跳过（已经 dirty 了）
  → 最终只计算一次（下次读取时）
```

### 与相关API的对比

| 状态 | _dirty 值 | 读取行为 | 触发条件 |
|------|----------|---------|---------|
| 初始 | true | 执行 getter 并缓存 | 创建时 |
| 缓存有效 | false | 直接返回缓存值 | getter 执行后 |
| 缓存过期 | true | 重新执行 getter | 依赖变化后 |

### 适用场景

- **频繁读取的派生数据：** 缓存避免重复计算
- **依赖频繁变化但读取少：** 惰性避免无用计算
- **复杂计算：** 排序、过滤、聚合等耗时操作

### 常见问题

#### computed 依赖没有变化但每次都重新计算

**解决方案：**

```javascript
import { ref, computed } from "vue";

const items = ref([1, 2, 3]);

// 问题：getter 中创建了新对象，看起来每次都不一样
// 但实际上 computed 的缓存是基于 dirty 标记
// 只有依赖变化时才重新计算

// 如果发现每次都重新计算，检查：
// 1. 是否每次读取都触发了依赖变化（循环依赖）
// 2. getter 中是否修改了响应式数据（副作用）
// 3. 是否用了方法调用而不是 computed

// 正确用法
const sorted = computed(() => {
    // 只有 items 变化时才重新排序
    return [...items.value].sort((a, b) => a - b);
});
```

### 注意事项

- dirty 标记是 computed 缓存的核心机制
- 初始状态 dirty=true，首次读取后变为 false
- 依赖变化时 scheduler 将 dirty 设为 true
- 多次依赖变化只标记一次 dirty
- getter 只在读取时且 dirty=true 时才执行
- 不要在 getter 中产生副作用

### 总结

computed 通过 dirty 标记控制缓存的有效性。dirty=true 时读取会重新执行 getter 并缓存结果，dirty=false 时直接返回缓存。依赖变化时 scheduler 将 dirty 设为 true 但不立即计算。这种机制实现了缓存和惰性求值，避免了不必要的重复计算。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### computed的setter可写配置

### 概念说明

默认情况下，computed 返回的是只读 ref，尝试修改 `.value` 会在开发环境中收到警告。但 computed 支持同时提供 getter 和 setter，使其变为可写的计算属性。当你对可写 computed 的 `.value` 赋值时，setter 函数会被调用，你可以在 setter 中更新它所依赖的源数据。

可写 computed 的典型场景是双向绑定的中间层：比如一个 fullName computed 依赖 firstName 和 lastName，当用户直接修改 fullName 时，setter 将新值拆分后更新 firstName 和 lastName。

### 基本示例

```vue
<script setup>
// 示例说明：可写 computed 的使用

import { ref, computed } from "vue";

const firstName = ref("张");
const lastName = ref("三");

// 可写 computed：同时提供 get 和 set
const fullName = computed({
    // getter：读取时执行
    get() {
        return firstName.value + lastName.value;
    },
    // setter：写入时执行
    set(newValue) {
        // 将新的全名拆分为姓和名
        // 假设第一个字符是姓，其余是名
        firstName.value = newValue.charAt(0);
        lastName.value = newValue.slice(1);
    },
});

console.log(fullName.value); // "张三"

// 写入 → 触发 setter → 更新源数据
fullName.value = "李四";
console.log(firstName.value); // "李"
console.log(lastName.value);  // "四"
console.log(fullName.value);  // "李四"（getter 重新计算）
</script>

<template>
    <!-- 可写 computed 可以直接用于 v-model -->
    <input v-model="fullName" />
    <p>姓: {{ firstName }}，名: {{ lastName }}</p>
</template>
```

### 内部原理

#### 可写 computed 的实现

```
computed 接受两种参数形式：

1. 只读：computed(getter)
   → 只有 get，set 为空
   → 写入时开发环境警告

2. 可写：computed({ get, set })
   → 同时提供 get 和 set
   → 写入时调用 set 函数

内部实现（简化）：

class ComputedRefImpl {
    constructor(getter, setter) {
        this._getter = getter;
        this._setter = setter;
        // ... effect 和 dirty 逻辑
    }

    get value() {
        trackRefValue(this);
        if (this._dirty) {
            this._value = this.effect.run();
            this._dirty = false;
        }
        return this._value;
    }

    set value(newValue) {
        // 调用用户提供的 setter
        this._setter(newValue);
        // setter 中修改了源数据
        // → 源数据的 trigger 会将 computed 标记为 dirty
        // → 下次读取时重新计算
    }
}
```

### 与相关API的对比

| 对比维度 | 只读 computed | 可写 computed | ref |
|----------|-------------|-------------|-----|
| 读取 | getter | getter | 直接读 .value |
| 写入 | 警告（开发环境） | setter | 直接写 .value |
| 缓存 | 有 | 有 | 无 |
| 用于 v-model | 不能 | 可以 | 可以 |

### 适用场景

- **v-model 绑定：** 需要双向绑定的计算属性
- **数据格式转换：** 读取时格式化，写入时解析
- **代理模式：** 对源数据的读写进行拦截和转换

### 常见问题

#### setter 中不要直接修改 computed 自身

**解决方案：**

```javascript
import { ref, computed } from "vue";

const celsius = ref(0);

// 温度转换：读取时转华氏度，写入时从华氏度转回
const fahrenheit = computed({
    get() {
        return celsius.value * 9 / 5 + 32;
    },
    set(f) {
        // setter 应该修改源数据，不要修改 computed 自身
        celsius.value = (f - 32) * 5 / 9;
        // 不要这样：fahrenheit.value = xxx（会无限递归）
    },
});

fahrenheit.value = 212; // setter → celsius = 100
console.log(celsius.value); // 100
```

### 注意事项

- 可写 computed 接收 `{ get, set }` 对象作为参数
- setter 中应该修改源数据，不要修改 computed 自身
- setter 执行后源数据变化会让 computed 重新标记 dirty
- 可写 computed 可以直接用于 v-model
- setter 不要做复杂的异步操作
- 大多数情况下只读 computed 就够用

### 总结

computed 支持通过 `{ get, set }` 配置可写计算属性。setter 在 `.value` 被赋值时调用，应在其中更新源数据。源数据变化后 computed 重新标记为 dirty。可写 computed 可以直接用于 v-model 双向绑定。setter 中不要修改 computed 自身避免无限递归。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### watch的侦听源类型(ref/reactive/getter)

### 概念说明

`watch()` 接受三种类型的侦听源：ref、reactive 对象和 getter 函数。不同类型的侦听源在依赖追踪和回调触发方面有不同的行为。

侦听 ref 时，watch 追踪 ref 的 `.value` 变化；侦听 reactive 对象时，watch 默认深度侦听该对象所有属性的变化；侦听 getter 函数时，watch 追踪 getter 函数中访问的所有响应式数据，只在 getter 的返回值变化时触发回调。

watch 还支持同时侦听多个源（数组形式），回调函数会接收到新值和旧值的数组。

### 基本示例

```vue
<script setup>
// 示例说明：watch 的三种侦听源

import { ref, reactive, watch } from "vue";

const count = ref(0);
const name = ref("张三");
const state = reactive({ x: 0, y: 0, nested: { z: 0 } });

// ===== 侦听 ref =====
watch(count, (newVal, oldVal) => {
    // count.value 变化时触发
    console.log(`count: ${oldVal} → ${newVal}`);
});

// ===== 侦听 reactive 对象 =====
watch(state, (newVal, oldVal) => {
    // state 中任何属性（包括深层）变化时触发
    // 注意：newVal 和 oldVal 是同一个引用（reactive 对象）
    console.log("state 变化了", newVal);
});

// ===== 侦听 getter 函数 =====
watch(
    () => state.x,  // getter：返回要侦听的值
    (newX, oldX) => {
        // 只有 state.x 变化时触发
        console.log(`x: ${oldX} → ${newX}`);
    }
);

// ===== 侦听 getter 返回对象（需要 deep） =====
watch(
    () => state.nested,
    (newVal) => {
        console.log("nested 变化了");
    },
    { deep: true } // getter 返回对象时需要 deep 才能追踪深层变化
);

// ===== 侦听多个源 =====
watch(
    [count, name, () => state.x],  // 数组形式
    ([newCount, newName, newX], [oldCount, oldName, oldX]) => {
        console.log("多个源变化:", { newCount, newName, newX });
    }
);

// 触发
count.value = 1;        // ref 侦听器触发
state.x = 10;           // getter 侦听器触发
state.nested.z = 5;     // reactive 整体侦听器触发
</script>
```

### 内部原理

#### watch 内部对不同侦听源的处理

```
watch(source, callback) 内部处理：

1. source 是 ref：
   → getter = () => source.value
   → 追踪 source.value 的变化

2. source 是 reactive：
   → getter = () => source
   → 自动设置 deep = true（强制深度侦听）
   → 递归遍历所有属性进行 track

3. source 是函数（getter）：
   → getter = source
   → 只追踪 getter 中访问的属性
   → 如果 getter 返回对象且 deep=true，递归追踪

4. source 是数组：
   → 对每个元素按上述规则处理
   → 任意一个源变化都触发回调
   → 回调参数是新值和旧值的数组

5. 创建 effect：
   → new ReactiveEffect(getter, scheduler)
   → scheduler 中执行 callback(newValue, oldValue)
```

### 与相关API的对比

| 侦听源类型 | 追踪方式 | 默认深度 | newVal/oldVal |
|-----------|---------|---------|---------------|
| ref | `.value` 变化 | 浅层 | 新值和旧值 |
| reactive | 所有属性变化 | 深层（强制） | 同一引用 |
| getter | getter 返回值变化 | 浅层 | 新值和旧值 |
| getter + deep | getter 返回值深层变化 | 深层 | 同一引用 |

### 适用场景

- **ref：** 侦听单个值的变化
- **reactive：** 侦听整个对象的任意变化
- **getter：** 精确侦听对象的某个属性
- **多源数组：** 同时侦听多个数据源

### 常见问题

#### 直接侦听 reactive 的属性值为什么不生效

**解决方案：**

```javascript
import { reactive, watch } from "vue";

const state = reactive({ count: 0 });

// 错误：直接传属性值（不是响应式的）
// watch(state.count, (newVal) => { ... });
// state.count 在这里求值为 0（原始值），不是响应式的

// 正确：使用 getter 函数
watch(
    () => state.count,
    (newVal) => { console.log(newVal); }
);
```

### 注意事项

- 侦听 reactive 对象默认深度侦听，newVal 和 oldVal 是同一引用
- 侦听 reactive 的单个属性必须用 getter 函数
- getter 返回对象时需要 `deep: true` 才能追踪深层变化
- 多源侦听时任意一个源变化都触发回调
- 不要直接传 `state.count` 作为侦听源（会被求值为原始值）

### 总结

watch 支持 ref、reactive、getter 函数三种侦听源。ref 追踪 `.value`，reactive 强制深度侦听，getter 精确追踪返回值变化。侦听 reactive 的单个属性必须用 getter。多源侦听使用数组形式。理解不同侦听源的追踪行为是正确使用 watch 的关键。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### watch的immediate立即执行选项

### 概念说明

默认情况下，watch 的回调函数只在侦听源变化后才执行，创建时不会立即调用。通过设置 `immediate: true` 选项，可以让 watch 在创建后立即执行一次回调。此时回调的 `oldValue` 参数为 `undefined`（因为没有旧值），`newValue` 为当前的值。

immediate 的实现原理很简单：watch 内部创建 effect 后会先执行一次 getter 获取初始值。如果 `immediate: true`，就立即调用 callback(newValue, undefined)；否则只保存初始值作为下次比较的 oldValue。

### 基本示例

```vue
<script setup>
// 示例说明：immediate 选项的使用

import { ref, watch } from "vue";

const userId = ref(1);
const userData = ref(null);

// ===== 默认行为：创建时不执行 =====
watch(userId, (newId) => {
    console.log("userId 变化:", newId);
    // 只有 userId 变化后才执行
});
// 创建后没有任何输出

// ===== immediate: true：创建时立即执行一次 =====
watch(
    userId,
    async (newId, oldId) => {
        console.log(`userId: ${oldId} → ${newId}`);
        // 首次执行时 oldId 为 undefined
        // 适合在页面加载时就需要根据初始值获取数据的场景
        const res = await fetch(`/api/users/${newId}`);
        userData.value = await res.json();
    },
    { immediate: true }
);
// 创建后立即输出: "userId: undefined → 1"
// 并发起 API 请求获取 userId=1 的数据

// 后续 userId 变化时也会触发
userId.value = 2; // 输出: "userId: 1 → 2"
</script>
```

### 内部原理

#### immediate 在 watch 内部的处理

```
watch 创建流程（简化）：

function watch(source, callback, options) {
    const getter = normalizeGetter(source);
    let oldValue;

    const effect = new ReactiveEffect(getter, scheduler);

    if (options.immediate) {
        // 立即执行一次回调
        const newValue = effect.run(); // 执行 getter 获取当前值
        callback(newValue, undefined); // oldValue 为 undefined
        oldValue = newValue;
    } else {
        // 只获取初始值，不执行回调
        oldValue = effect.run();
    }

    // scheduler：后续数据变化时触发
    function scheduler() {
        const newValue = effect.run();
        if (hasChanged(newValue, oldValue)) {
            callback(newValue, oldValue);
            oldValue = newValue;
        }
    }
}
```

### 与相关API的对比

| 选项 | 创建时行为 | 适用场景 |
|------|----------|---------|
| 默认（无 immediate） | 只记录初始值，不执行回调 | 只关心变化 |
| immediate: true | 立即执行一次回调 | 需要根据初始值执行操作 |
| watchEffect | 立即执行（自动追踪） | 不需要新旧值对比 |

### 适用场景

- **页面初始化：** 根据初始路由参数加载数据
- **初始配置应用：** 组件创建时就需要根据 props 执行操作
- **搜索功能：** 初始时就需要加载搜索结果

### 常见问题

#### immediate 和 watchEffect 怎么选

**解决方案：**

```javascript
import { ref, watch, watchEffect } from "vue";

const keyword = ref("vue");

// watch + immediate：需要新旧值对比
watch(keyword, (newVal, oldVal) => {
    console.log(`从 "${oldVal}" 变为 "${newVal}"`);
    // 可以对比新旧值做不同处理
}, { immediate: true });

// watchEffect：不需要新旧值，自动追踪依赖
watchEffect(() => {
    console.log("搜索:", keyword.value);
    // 自动追踪 keyword，等价于 immediate watch
    // 但无法获取旧值
});
```

### 注意事项

- immediate: true 时回调的 oldValue 为 undefined
- immediate 回调在 watch 创建的同步流程中执行
- watchEffect 天然就是"immediate"的（创建后立即执行）
- 需要新旧值对比时用 watch + immediate
- 不需要新旧值时直接用 watchEffect 更简洁

### 总结

immediate 选项让 watch 在创建后立即执行一次回调，首次回调的 oldValue 为 undefined。适合页面加载时就需要根据初始值执行操作的场景。如果不需要新旧值对比，watchEffect 是更简洁的替代方案。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### watch的deep深度侦听

### 概念说明

`deep` 选项控制 watch 是否深度侦听对象的嵌套属性变化。当使用 getter 函数返回一个对象时，默认只在返回的引用本身变化时触发回调，深层属性变化不会触发。设置 `deep: true` 后，watch 会递归遍历对象的所有属性进行依赖收集，任何层级的属性变化都会触发回调。

Vue 3.5+ 还支持 `deep` 设置为数字，表示侦听的深度层级。比如 `deep: 2` 只追踪到第二层属性，更深的变化不触发。

需要注意的是，直接侦听 reactive 对象时，Vue 会自动强制设置 `deep: true`，因为 reactive 本身就是深层响应式的。

### 基本示例

```vue
<script setup>
// 示例说明：deep 选项的各种用法

import { ref, reactive, watch } from "vue";

// ===== getter 返回对象，默认浅层侦听 =====
const state = reactive({
    user: { name: "张三", address: { city: "北京" } },
});

watch(
    () => state.user,
    (newUser) => {
        console.log("user 变化了（浅层）");
    }
);
// state.user.name = "李四"; → 不触发（只是修改了深层属性）
// state.user = { name: "王五" }; → 触发（引用变了）

// ===== deep: true 深度侦听 =====
watch(
    () => state.user,
    (newUser) => {
        console.log("user 变化了（深层）");
    },
    { deep: true }
);
// state.user.name = "李四"; → 触发
// state.user.address.city = "上海"; → 触发

// ===== 直接侦听 reactive → 自动 deep =====
watch(state, () => {
    console.log("state 任意属性变化");
});
// 等价于 deep: true，任何深层变化都触发

// ===== ref 包装对象 + deep =====
const config = ref({ theme: "dark", lang: "zh" });

watch(config, (newVal) => {
    // ref 的 .value 是对象时，默认深度侦听
    console.log("config 变化");
}, { deep: true });

config.value.theme = "light"; // 触发

// ===== Vue 3.5+：指定深度层级 =====
// watch(
//     () => state.user,
//     () => console.log("变化了"),
//     { deep: 2 } // 只追踪到第二层
// );
// state.user.name = "xxx"; → 触发（第一层）
// state.user.address.city = "xxx"; → 不触发（超过第二层）
</script>
```

### 内部原理

#### deep 的递归遍历实现

```
deep: true 时 watch 的处理：

原始 getter：() => state.user
包装后的 getter：() => traverse(state.user)

function traverse(value, depth = Infinity, seen = new Set()) {
    // 原始值直接返回
    if (!isObject(value) || depth <= 0) return value;

    // 避免循环引用
    if (seen.has(value)) return value;
    seen.add(value);

    depth--;

    if (isRef(value)) {
        traverse(value.value, depth, seen);
    } else if (Array.isArray(value)) {
        // 遍历数组每个元素 → 触发 get → track
        for (let i = 0; i < value.length; i++) {
            traverse(value[i], depth, seen);
        }
    } else if (isPlainObject(value)) {
        // 遍历对象每个属性 → 触发 get → track
        for (const key in value) {
            traverse(value[key], depth, seen);
        }
    }

    return value;
}

// traverse 的作用就是递归读取所有属性
// 每次读取都触发 Proxy 的 get → track
// 从而让 effect 依赖所有深层属性
```

### 与相关API的对比

| 侦听方式 | 默认深度 | 触发条件 |
|----------|---------|---------|
| watch(ref) | 浅层 | `.value` 变化 |
| watch(reactive) | 深层（强制） | 任意属性变化 |
| watch(getter) | 浅层 | 返回值引用变化 |
| watch(getter, { deep: true }) | 深层 | 返回值任意属性变化 |
| watch(getter, { deep: 2 }) | 指定层级 | 指定深度内属性变化 |

### 适用场景

- **表单对象：** 侦听整个表单对象的任意字段变化
- **配置变化：** 嵌套配置对象的任意属性变化时执行操作
- **数据同步：** 深层数据变化后同步到后端

### 常见问题

#### deep 对性能的影响

**解决方案：**

```javascript
import { reactive, watch } from "vue";

// deep: true 会递归遍历所有属性
// 对于大型嵌套对象可能有性能问题

const bigState = reactive({
    // 假设有数千个嵌套属性
    items: new Array(10000).fill(null).map((_, i) => ({
        id: i,
        data: { nested: { value: i } },
    })),
});

// 性能差：递归遍历所有嵌套属性
// watch(bigState, () => { ... }, { deep: true });

// 更好：精确侦听关心的属性
watch(
    () => bigState.items.length,
    (newLen) => console.log("数量变化:", newLen)
);

// 或者侦听特定项
watch(
    () => bigState.items[0]?.data,
    (newData) => console.log("第一项变化"),
    { deep: true }
);
```

### 注意事项

- 直接侦听 reactive 对象默认 deep: true
- getter 返回对象时默认浅层，需手动设置 deep
- deep 通过 traverse 递归读取所有属性实现
- 大型嵌套对象使用 deep 可能有性能问题
- Vue 3.5+ 支持 deep 设置为数字控制层级
- deep 侦听时 newVal 和 oldVal 是同一引用

### 总结

deep 选项控制 watch 是否递归追踪对象的所有嵌套属性。通过 traverse 函数递归读取每个属性来触发 track。直接侦听 reactive 对象默认深度侦听。getter 返回对象时默认浅层侦听，需手动 `deep: true`。Vue 3.5+ 支持数字形式的 deep 控制层级。大型对象应避免不必要的深度侦听。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### watch的flush调度时机(pre/sync/post)

### 概念说明

`flush` 选项控制 watch 回调函数的执行时机，相对于 Vue 的组件渲染更新。它有三个可选值：

- **`'pre'`（默认）**：回调在组件 DOM 更新之前执行。此时可以访问更新前的 DOM 状态。
- **`'post'`**：回调在组件 DOM 更新之后执行。此时可以安全地访问更新后的 DOM。
- **`'sync'`**：回调在数据变化后同步执行，不经过任何异步调度。

flush 的底层实现就是给 effect 的 scheduler 配置不同的队列：pre 放入 pre-flush 队列、post 放入 post-flush 队列、sync 直接同步调用。Vue 的更新队列执行顺序是：pre-flush 回调 → 组件渲染更新 → post-flush 回调。

### 基本示例

```vue
<script setup>
// 示例说明：flush 的三种时机

import { ref, watch, watchEffect } from "vue";

const count = ref(0);

// ===== flush: 'pre'（默认）=====
watch(count, (newVal) => {
    // 在组件 DOM 更新之前执行
    // 此时 DOM 还是旧的
    console.log("pre:", newVal);
    // document.querySelector('#count').textContent 还是旧值
}, { flush: "pre" });

// ===== flush: 'post' =====
watch(count, (newVal) => {
    // 在组件 DOM 更新之后执行
    // 此时 DOM 已经更新
    console.log("post:", newVal);
    // document.querySelector('#count').textContent 是新值
    // 适合需要操作更新后 DOM 的场景
}, { flush: "post" });

// ===== flush: 'sync' =====
watch(count, (newVal) => {
    // 数据变化后立即同步执行
    // 不经过任何队列调度
    console.log("sync:", newVal);
}, { flush: "sync" });

// 执行顺序演示
count.value = 1;
// 同步输出: "sync: 1"
// 微任务中输出: "pre: 1"
// 渲染更新后输出: "post: 1"
</script>

<template>
    <p id="count">{{ count }}</p>
</template>
```

### 内部原理

#### flush 对应的调度队列

```
Vue 的更新调度流程：

1. 数据变化 → trigger
2. flush:'sync' 的回调立即同步执行
3. 当前同步代码执行完毕
4. 微任务开始执行（Promise.then）
   a. pre-flush 队列（flush:'pre' 的回调）
   b. 组件渲染更新队列（DOM 更新）
   c. post-flush 队列（flush:'post' 的回调）

scheduler 实现：

flush: 'pre' →
  scheduler() { queuePreFlushCb(job); }

flush: 'post' →
  scheduler() { queuePostFlushCb(job); }

flush: 'sync' →
  scheduler() { job(); }  // 直接执行
```

### 与相关API的对比

| flush 值 | 执行时机 | 能否访问更新后 DOM | 性能影响 |
|---------|---------|-----------------|---------|
| 'pre'（默认） | DOM 更新前 | 否 | 低（批量处理） |
| 'post' | DOM 更新后 | 是 | 低（批量处理） |
| 'sync' | 数据变化后立即 | 否 | 高（跳过批处理） |

| API | 等价 flush |
|-----|----------|
| watchEffect() | 'pre' |
| watchPostEffect() | 'post' |
| watchSyncEffect() | 'sync' |

### 适用场景

- **pre（默认）：** 大多数业务逻辑、数据处理
- **post：** 需要操作更新后的 DOM（测量尺寸、滚动位置等）
- **sync：** 需要立即响应的场景（调试、极少数同步需求）

### 常见问题

#### 什么时候必须用 flush: 'post'

**解决方案：**

```vue
<script setup>
import { ref, watch, nextTick } from "vue";

const list = ref([1, 2, 3]);

// 场景：列表更新后滚动到底部
watch(
    list,
    () => {
        // flush: 'post' 确保 DOM 已更新
        const container = document.querySelector(".list-container");
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    },
    { flush: "post", deep: true }
);

// 等价写法：使用 nextTick
watch(list, async () => {
    await nextTick(); // 等待 DOM 更新
    const container = document.querySelector(".list-container");
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}, { deep: true });
</script>
```

### 注意事项

- 默认 flush 是 'pre'，在 DOM 更新前执行
- 需要访问更新后 DOM 时使用 'post'
- sync 跳过批处理，频繁触发可能影响性能
- watchPostEffect 是 flush:'post' 的 watchEffect 简写
- watchSyncEffect 是 flush:'sync' 的 watchEffect 简写
- nextTick() 可以替代 flush:'post' 但写法不同

### 总结

flush 选项控制 watch 回调相对于 DOM 更新的执行时机。'pre'（默认）在更新前执行，'post' 在更新后执行（适合 DOM 操作），'sync' 同步执行（跳过批处理）。Vue 提供了 watchPostEffect 和 watchSyncEffect 作为常用配置的快捷方式。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### watchEffect的自动依赖追踪

### 概念说明

`watchEffect()` 是 Vue 3 提供的一种更简洁的侦听方式。与 watch 需要显式指定侦听源不同，watchEffect 会自动追踪回调函数中使用的所有响应式数据。它在创建后立即执行一次回调（等价于 watch 的 `immediate: true`），在执行过程中自动收集依赖，当任何依赖变化时自动重新执行。

watchEffect 底层就是一个 `effect`，创建时 `lazy: false`（立即执行），没有显式侦听源。它不提供新旧值的对比——如果你需要获取旧值，应该使用 watch。

watchEffect 返回一个停止函数，调用后可以停止侦听。回调函数接收一个 `onCleanup` 参数，用于注册清理函数，在下次执行前或停止时调用。

### 基本示例

```vue
<script setup>
// 示例说明：watchEffect 的自动追踪和清理

import { ref, watchEffect } from "vue";

const keyword = ref("");
const page = ref(1);
const results = ref([]);

// watchEffect 自动追踪回调中使用的响应式数据
const stop = watchEffect((onCleanup) => {
    // 自动追踪 keyword.value 和 page.value
    const query = keyword.value;
    const currentPage = page.value;

    // 如果 keyword 为空，跳过请求
    if (!query) {
        results.value = [];
        return;
    }

    // 创建 AbortController 用于取消请求
    const controller = new AbortController();

    // 发起搜索请求
    fetch(`/api/search?q=${query}&page=${currentPage}`, {
        signal: controller.signal,
    })
        .then((res) => res.json())
        .then((data) => {
            results.value = data.items;
        })
        .catch((err) => {
            if (err.name !== "AbortError") {
                console.error("搜索失败:", err);
            }
        });

    // 注册清理函数：下次执行前或停止时调用
    onCleanup(() => {
        // 取消上一次未完成的请求
        controller.abort();
    });
});

// keyword 或 page 变化 → 自动重新执行
// keyword.value = "vue";  → 发起搜索
// keyword.value = "react"; → 取消上一次请求，发起新搜索

// 停止侦听
// stop();
</script>

<template>
    <input v-model="keyword" placeholder="搜索..." />
    <ul>
        <li v-for="item in results" :key="item.id">{{ item.title }}</li>
    </ul>
</template>
```

### 内部原理

#### watchEffect 与 watch 的内部差异

```
watchEffect(fn) 等价于：

watch(
    fn,   // fn 既是"getter"（用于依赖收集），也是"callback"
    null, // 没有单独的回调
    { immediate: true, flush: 'pre' }
);

但实际实现更直接：
  1. 创建 ReactiveEffect(fn, scheduler)
  2. 立即执行 effect.run()
  3. fn 执行时自动 track 所有响应式数据
  4. 数据变化 → scheduler → 重新执行 fn

watchEffect 不做新旧值对比：
  → watch 中：oldValue !== newValue 才触发回调
  → watchEffect：依赖变化直接重新执行，无条件

onCleanup 的工作原理：
  → 每次执行 fn 前，先调用上一次注册的 cleanup 函数
  → fn 中调用 onCleanup(cleanupFn) 注册新的 cleanup
  → effect 停止时也调用 cleanup
```

### 与相关API的对比

| 对比维度 | watchEffect | watch |
|----------|------------|-------|
| 侦听源 | 自动追踪 | 显式指定 |
| 新旧值 | 无 | 有 |
| 立即执行 | 是（始终） | 可选（immediate） |
| 依赖收集 | 回调执行时自动 | 侦听源中收集 |
| 清理函数 | onCleanup 参数 | onCleanup 参数（3.5+） |
| 适用场景 | 副作用同步 | 数据变化响应 |

### 适用场景

- **数据请求：** 根据响应式参数自动重新请求
- **副作用同步：** DOM 操作、第三方库更新
- **日志记录：** 自动追踪并记录状态变化
- **动画控制：** 根据响应式数据控制动画

### 常见问题

#### watchEffect 的异步代码中依赖不被追踪

**解决方案：**

```javascript
import { ref, watchEffect } from "vue";

const id = ref(1);
const data = ref(null);

// 问题：await 之后的代码中读取的响应式数据不被追踪
watchEffect(async () => {
    // id.value 在 await 之前读取 → 被追踪
    const currentId = id.value;

    const res = await fetch(`/api/data/${currentId}`);
    const json = await res.json();

    // 这里读取其他响应式数据不会被追踪
    // 因为 await 之后 activeEffect 已经不存在了
    data.value = json;
});

// 解决方案：确保所有需要追踪的响应式数据在第一个 await 之前读取
watchEffect(async () => {
    const currentId = id.value;        // 在 await 前读取
    const otherParam = someRef.value;  // 在 await 前读取

    const res = await fetch(`/api/data/${currentId}?param=${otherParam}`);
    data.value = await res.json();
});
```

### 注意事项

- watchEffect 创建后立即执行一次
- 自动追踪回调中访问的所有响应式数据
- await 之后的响应式数据读取不会被追踪
- onCleanup 注册的清理函数在下次执行前调用
- 返回值是停止函数，调用可停止侦听
- 不提供新旧值，需要新旧值时用 watch

### 总结

watchEffect 自动追踪回调中使用的响应式数据，创建后立即执行。底层基于 effect，不需要显式指定侦听源，依赖数据变化时自动重新执行。通过 onCleanup 注册清理函数处理副作用。注意 await 之后的响应式读取不被追踪，应在第一个 await 前读取所有需要追踪的数据。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### watchEffect的onCleanup清理

### 概念说明

watchEffect 的回调函数接收一个 `onCleanup` 参数（Vue 3.5+ 中也叫 `onWatcherCleanup`），用于注册一个清理函数。这个清理函数会在两个时机被调用：一是 watchEffect 下次重新执行之前，二是 watchEffect 被停止时（组件卸载或手动调用 stop）。

onCleanup 的典型用途是取消上一次未完成的异步操作。比如在 watchEffect 中发起了一个网络请求，当依赖变化导致 watchEffect 重新执行时，上一次的请求可能还没返回。这时就需要通过 onCleanup 注册的清理函数来取消旧请求，避免竞态条件（race condition）导致的数据错乱。

### 基本示例

```vue
<script setup>
// 示例说明：onCleanup 处理异步竞态

import { ref, watchEffect } from "vue";

const userId = ref(1);
const userInfo = ref(null);
const loading = ref(false);

watchEffect((onCleanup) => {
    const id = userId.value; // 追踪 userId
    loading.value = true;

    // 创建 AbortController 用于取消请求
    const controller = new AbortController();

    // 发起请求
    fetch(`/api/users/${id}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => {
            userInfo.value = data;
            loading.value = false;
        })
        .catch((err) => {
            // AbortError 是正常取消，不处理
            if (err.name !== "AbortError") {
                console.error("请求失败:", err);
                loading.value = false;
            }
        });

    // 注册清理函数
    // 当 userId 变化导致 watchEffect 重新执行时
    // 这个清理函数会先被调用，取消上一次未完成的请求
    onCleanup(() => {
        controller.abort();
    });
});

// 快速连续切换 userId：
// userId.value = 2; → 取消 id=1 的请求，发起 id=2 的请求
// userId.value = 3; → 取消 id=2 的请求，发起 id=3 的请求
// 最终只有 id=3 的请求结果会被使用
</script>
```

### 内部原理

#### onCleanup 的执行时机

```
watchEffect 的执行流程：

第一次执行：
  1. 调用 fn(onCleanup)
  2. fn 中调用 onCleanup(cleanupFn)
  3. Vue 保存 cleanupFn 到 effect._cleanup

数据变化后重新执行：
  1. trigger → scheduler → 准备重新执行
  2. 执行 effect._cleanup()（取消上一次的副作用）
  3. 清除 effect._cleanup
  4. 调用 fn(onCleanup)（新一轮执行）
  5. fn 中注册新的 cleanupFn

停止时：
  1. stop() 调用
  2. 执行 effect._cleanup()
  3. 清除 effect

onCleanup 实现（简化）：
  function watchEffect(fn) {
      let cleanup;

      const onCleanup = (cleanupFn) => {
          cleanup = cleanupFn;
      };

      const effect = new ReactiveEffect(() => {
          // 执行前先清理
          if (cleanup) {
              cleanup();
              cleanup = null;
          }
          fn(onCleanup);
      }, scheduler);

      effect.run();
  }
```

### 与相关API的对比

| 清理方式 | 使用位置 | 触发时机 |
|---------|---------|---------|
| onCleanup（watchEffect） | 回调参数 | 下次执行前 / 停止时 |
| onCleanup（watch，3.5+） | 回调第三个参数 | 下次执行前 / 停止时 |
| onUnmounted | setup 中 | 组件卸载时 |
| onScopeDispose | 任意 scope | scope 停止时 |

### 适用场景

- **取消网络请求：** AbortController 取消未完成的 fetch
- **清除定时器：** clearTimeout / clearInterval
- **移除事件监听：** removeEventListener
- **取消订阅：** WebSocket、EventSource 等

### 常见问题

#### 不用 onCleanup 会导致什么问题

**解决方案：**

```javascript
import { ref, watchEffect } from "vue";

const id = ref(1);
const data = ref(null);

// 问题：不取消旧请求，可能出现竞态
// watchEffect(() => {
//     fetch(`/api/${id.value}`)
//         .then(res => res.json())
//         .then(json => { data.value = json; });
// });
// 如果 id 快速从 1 变到 2，id=2 的请求可能先返回
// 然后 id=1 的请求后返回，覆盖了 id=2 的数据

// 正确：使用 onCleanup 取消旧请求
watchEffect((onCleanup) => {
    const controller = new AbortController();
    fetch(`/api/${id.value}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((json) => { data.value = json; })
        .catch(() => {});

    onCleanup(() => controller.abort());
});
```

### 注意事项

- onCleanup 注册的函数在下次执行前和停止时调用
- 每次执行只能注册一个清理函数（后注册会覆盖前面的）
- 清理函数中不要访问响应式数据（可能导致意外追踪）
- 异步请求必须用 onCleanup 处理竞态条件
- Vue 3.5+ 中 watch 的回调也支持 onCleanup 参数
- onCleanup 在同步部分调用，不要放在 await 之后

### 总结

onCleanup 是 watchEffect 处理副作用清理的机制。在下次重新执行前和停止时自动调用注册的清理函数。主要用于取消网络请求、清除定时器、移除事件监听等场景。不使用 onCleanup 处理异步操作可能导致竞态条件和数据错乱。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### watch与watchEffect的区别与选择

### 概念说明

watch 和 watchEffect 都用于侦听响应式数据变化并执行副作用，但它们的设计理念和使用方式不同。watch 要求显式指定侦听源，提供新旧值对比，默认不立即执行；watchEffect 自动追踪回调中的所有依赖，不提供新旧值，创建后立即执行。

选择哪个取决于具体场景：需要精确控制侦听源、需要旧值、需要条件性执行时用 watch；需要自动追踪多个依赖、不关心旧值、需要立即执行副作用时用 watchEffect。

### 基本示例

```vue
<script setup>
// 示例说明：watch 和 watchEffect 的对比

import { ref, reactive, watch, watchEffect } from "vue";

const keyword = ref("");
const page = ref(1);
const sortBy = ref("date");

// ===== watchEffect：自动追踪所有依赖 =====
// 适合：多个依赖都需要追踪，不需要旧值
watchEffect(() => {
    // 自动追踪 keyword、page、sortBy
    console.log(`搜索: ${keyword.value}, 页码: ${page.value}, 排序: ${sortBy.value}`);
    // 任何一个变化都会重新执行
});

// ===== watch：显式指定侦听源 =====
// 适合：只关心特定数据变化，需要新旧值对比
watch(keyword, (newVal, oldVal) => {
    console.log(`关键词从 "${oldVal}" 变为 "${newVal}"`);
    // 关键词变化时重置页码
    page.value = 1;
});

// ===== watch：精确控制，延迟执行 =====
const userId = ref(null);

watch(userId, async (newId) => {
    if (newId) {
        // 只在 userId 有值时才请求
        const res = await fetch(`/api/users/${newId}`);
        console.log(await res.json());
    }
});
// userId 为 null 时不会执行

// 如果用 watchEffect 就需要在内部判断
watchEffect(() => {
    if (!userId.value) return; // 需要手动判断
    // fetch...
});
</script>
```

### 内部原理

#### 底层实现的差异

```
两者都基于 ReactiveEffect，核心差异：

watch(source, callback, options):
  → getter = 规范化后的侦听源
  → effect = new ReactiveEffect(getter, scheduler)
  → scheduler 中对比新旧值，变化时调用 callback
  → lazy = !options.immediate

watchEffect(fn, options):
  → getter = fn（回调本身就是 getter）
  → effect = new ReactiveEffect(fn, scheduler)
  → scheduler 中直接重新执行 fn（不对比新旧值）
  → lazy = false（始终立即执行）
```

### 与相关API的对比

| 对比维度 | watch | watchEffect |
|----------|-------|------------|
| 侦听源 | 显式指定 | 自动追踪 |
| 新旧值 | 有 | 无 |
| 立即执行 | 可选（immediate） | 始终立即 |
| 惰性 | 默认惰性 | 非惰性 |
| 依赖变化检测 | 对比新旧值 | 依赖变化即执行 |
| 回调参数 | (newVal, oldVal, onCleanup) | (onCleanup) |
| 多源侦听 | 数组语法 | 自动多源 |

### 适用场景

- **用 watch：** 需要旧值对比、条件性执行、精确控制侦听源
- **用 watchEffect：** 自动追踪多个依赖、立即执行副作用、不关心旧值

### 常见问题

#### 同一个需求用 watch 和 watchEffect 如何实现

**解决方案：**

```javascript
import { ref, watch, watchEffect } from "vue";

const a = ref(1);
const b = ref(2);

// 需求：a 或 b 变化时打印它们的和

// watch 写法：显式指定两个源
watch([a, b], ([newA, newB], [oldA, oldB]) => {
    console.log(`和: ${newA + newB}，之前: ${oldA + oldB}`);
});

// watchEffect 写法：自动追踪
watchEffect(() => {
    console.log(`和: ${a.value + b.value}`);
});
// watchEffect 更简洁，但无法获取旧值
```

### 注意事项

- watchEffect 始终立即执行，watch 默认不立即执行
- watchEffect 不提供新旧值对比
- watch 可以精确控制侦听哪些数据
- watchEffect 中 await 之后的依赖不被追踪
- 两者都返回停止函数
- 两者都支持 onCleanup 清理副作用

### 总结

watch 和 watchEffect 的核心区别在于：watch 显式指定侦听源并提供新旧值，watchEffect 自动追踪依赖且立即执行。需要旧值或精确控制时用 watch，需要简洁地追踪多个依赖时用 watchEffect。两者底层都基于 ReactiveEffect 实现。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### toRef与toRefs的响应式转换

### 概念说明

`toRef()` 将 reactive 对象的某个属性转换为一个 ref，这个 ref 与源属性保持同步——修改 ref 的 `.value` 会更新源对象的属性，修改源对象的属性也会更新 ref。`toRefs()` 则将 reactive 对象的所有属性批量转换为 ref 对象组成的普通对象。

这两个 API 解决的核心问题是：reactive 对象的属性在解构后会丢失响应性（因为解构出来的是原始值，不经过 Proxy）。通过 toRef/toRefs 转换后，解构出来的是 ref 对象，仍然保持与源对象的响应式连接。

toRef 创建的 ref 不是独立的副本，而是源属性的"代理引用"——内部的 getter 和 setter 直接读写源对象的属性。

### 基本示例

```vue
<script setup>
// 示例说明：toRef 和 toRefs 的使用

import { reactive, toRef, toRefs } from "vue";

const state = reactive({
    name: "张三",
    age: 25,
    email: "zhangsan@test.com",
});

// ===== toRef：转换单个属性 =====
const nameRef = toRef(state, "name");

console.log(nameRef.value); // "张三"

// 修改 ref → 源对象同步更新
nameRef.value = "李四";
console.log(state.name); // "李四"

// 修改源对象 → ref 同步更新
state.name = "王五";
console.log(nameRef.value); // "王五"

// ===== toRefs：转换所有属性 =====
const { name, age, email } = toRefs(state);

// 每个解构出来的变量都是 ref
console.log(name.value);  // "王五"
console.log(age.value);   // 25
console.log(email.value); // "zhangsan@test.com"

// 修改解构的 ref → 源对象同步更新
age.value = 30;
console.log(state.age); // 30

// ===== 在 composable 中的典型用法 =====
function useUser() {
    const user = reactive({
        name: "张三",
        role: "admin",
    });

    // 返回 toRefs，调用方可以解构且保持响应性
    return toRefs(user);
}

// 调用方
const { name: userName, role } = useUser();
// userName 和 role 都是 ref，响应式正常工作
</script>

<template>
    <p>{{ name }} - {{ age }}</p>
</template>
```

### 内部原理

#### toRef 的实现

```
toRef 内部实现（简化）：

class ObjectRefImpl {
    constructor(object, key) {
        this._object = object; // 源 reactive 对象
        this._key = key;       // 属性名
    }

    get value() {
        // 直接读取源对象的属性
        // 由于源对象是 reactive，读取会触发 track
        return this._object[this._key];
    }

    set value(newVal) {
        // 直接写入源对象的属性
        // 由于源对象是 reactive，写入会触发 trigger
        this._object[this._key] = newVal;
    }
}

function toRef(object, key) {
    return new ObjectRefImpl(object, key);
}

function toRefs(object) {
    const result = {};
    for (const key in object) {
        result[key] = toRef(object, key);
    }
    return result;
}

// toRef 创建的 ref 不持有值的副本
// 而是通过 getter/setter 委托给源对象
// 所以是双向同步的
```

### 与相关API的对比

| API | 作用 | 与源对象关系 | 返回类型 |
|-----|------|-----------|---------|
| toRef(obj, key) | 单个属性转 ref | 双向同步 | Ref |
| toRefs(obj) | 所有属性转 ref | 双向同步 | { [key]: Ref } |
| ref(obj.key) | 创建独立 ref | 无关联（独立副本） | Ref |

### 适用场景

- **解构 reactive：** 解构时保持响应性
- **Composable 返回值：** 返回 toRefs 让调用方可解构
- **Props 解构：** 配合 defineProps 使用
- **传递单个属性：** 将 reactive 的某个属性传给子组件或函数

### 常见问题

#### toRef 和直接用 ref 有什么区别

**解决方案：**

```javascript
import { reactive, toRef, ref } from "vue";

const state = reactive({ count: 0 });

// toRef：与源对象保持同步
const countRef = toRef(state, "count");
countRef.value = 10;
console.log(state.count); // 10（同步更新）

// ref：创建独立副本，不同步
const countCopy = ref(state.count);
countCopy.value = 20;
console.log(state.count); // 10（不受影响）
```

### 注意事项

- toRef 创建的 ref 与源对象双向同步
- ref() 创建的是独立副本，与源对象无关
- toRefs 只转换第一层属性，嵌套对象不会递归转换
- toRef 对不存在的属性也可以创建（值为 undefined）
- composable 函数返回值推荐使用 toRefs
- Vue 3.3+ 的 toRef 还支持传入 getter 函数

### 总结

toRef 和 toRefs 将 reactive 对象的属性转换为 ref，保持与源对象的双向同步。解决了 reactive 对象解构后丢失响应性的问题。toRef 转换单个属性，toRefs 批量转换所有属性。在 composable 函数中返回 toRefs 是推荐的做法，让调用方可以自由解构且保持响应性。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### isRef/isReactive/isReadonly判断

### 概念说明

Vue 3 提供了一系列类型判断工具函数，用于在运行时检测一个值是否是特定类型的响应式对象。这些函数在编写通用的 composable 函数、处理不确定类型的参数时非常有用。

- `isRef(value)`：判断是否是 ref 对象（包括 computed）
- `isReactive(value)`：判断是否是 reactive 创建的代理
- `isReadonly(value)`：判断是否是 readonly 创建的只读代理
- `isProxy(value)`：判断是否是 reactive 或 readonly 创建的代理
- `unref(value)`：如果是 ref 返回 `.value`，否则返回自身

这些函数的实现原理很简单：reactive/readonly/ref 在创建代理时会在对象上设置特殊标记（`__v_isRef`、`__v_isReactive`、`__v_isReadonly`），判断函数就是检查这些标记。

### 基本示例

```javascript
// 示例说明：各种类型判断函数的使用

import {
    ref, reactive, readonly, computed, shallowRef, shallowReactive,
    isRef, isReactive, isReadonly, isProxy, unref
} from "vue";

const count = ref(0);
const state = reactive({ name: "张三" });
const readonlyState = readonly(state);
const double = computed(() => count.value * 2);
const shallowState = shallowReactive({ x: 1 });
const shallowCount = shallowRef(0);

// ===== isRef =====
console.log(isRef(count));          // true
console.log(isRef(double));         // true（computed 也是 ref）
console.log(isRef(shallowCount));   // true
console.log(isRef(state));          // false
console.log(isRef(0));              // false

// ===== isReactive =====
console.log(isReactive(state));         // true
console.log(isReactive(shallowState));  // true
console.log(isReactive(readonlyState)); // false（readonly 不是 reactive）
console.log(isReactive(count));         // false

// ===== isReadonly =====
console.log(isReadonly(readonlyState)); // true
console.log(isReadonly(state));         // false
console.log(isReadonly(count));         // false

// ===== isProxy =====
console.log(isProxy(state));           // true
console.log(isProxy(readonlyState));   // true
console.log(isProxy(count));           // false（ref 不是 Proxy）

// ===== unref：安全地获取值 =====
console.log(unref(count));    // 0（返回 count.value）
console.log(unref(100));      // 100（非 ref，返回自身）
console.log(unref("hello"));  // "hello"

// ===== 实际应用：编写通用函数 =====
function getValue(maybeRef) {
    // 不确定参数是 ref 还是普通值
    return unref(maybeRef);
    // 等价于 isRef(maybeRef) ? maybeRef.value : maybeRef
}
```

### 内部原理

#### 标记检测的实现

```
各判断函数的实现：

function isRef(value) {
    return !!(value && value.__v_isRef === true);
}

function isReactive(value) {
    // 如果是 readonly(reactive(obj))，检查内层
    if (isReadonly(value)) {
        return isReactive(value.__v_raw);
    }
    return !!(value && value.__v_isReactive === true);
}

function isReadonly(value) {
    return !!(value && value.__v_isReadonly === true);
}

function isProxy(value) {
    return isReactive(value) || isReadonly(value);
}

function unref(ref) {
    return isRef(ref) ? ref.value : ref;
}

标记的来源：
  → ref：RefImpl 类上定义 __v_isRef = true
  → reactive：Proxy get 陷阱中拦截 __v_isReactive
  → readonly：Proxy get 陷阱中拦截 __v_isReadonly
```

### 与相关API的对比

| 函数 | ref | reactive | readonly | computed | 普通值 |
|------|-----|---------|---------|---------|-------|
| isRef | true | false | false | true | false |
| isReactive | false | true | false | false | false |
| isReadonly | false | false | true | false | false |
| isProxy | false | true | true | false | false |

### 适用场景

- **通用 composable：** 接受 ref 或普通值作为参数
- **类型守卫：** TypeScript 中缩小类型范围
- **参数规范化：** 统一处理不同类型的响应式数据
- **调试：** 检查某个值的响应式类型

### 常见问题

#### unref 在 composable 中的典型用法

**解决方案：**

```typescript
import { ref, unref, computed, Ref } from "vue";

// MaybeRef 类型：可能是 ref 也可能是普通值
type MaybeRef<T> = T | Ref<T>;

// composable 接受 MaybeRef 参数
function useDouble(value: MaybeRef<number>) {
    return computed(() => {
        // unref 安全地获取值
        return unref(value) * 2;
    });
}

// 两种方式都可以调用
const result1 = useDouble(10);       // 传普通值
const count = ref(5);
const result2 = useDouble(count);    // 传 ref
```

### 注意事项

- computed 返回值 isRef 为 true（computed 也是 ref）
- readonly(reactive(obj)) 的 isReactive 检查需要穿透
- isProxy 对 ref 返回 false（ref 不是用 Proxy 实现的）
- unref 是最常用的工具函数，简化 ref/普通值的处理
- 这些函数是纯粹的运行时检查，不影响响应式行为
- TypeScript 中配合 MaybeRef 类型使用效果更好

### 总结

Vue 3 提供 isRef、isReactive、isReadonly、isProxy 等判断函数和 unref 工具函数。它们通过检查对象上的内部标记实现判断。unref 是最实用的工具，让 composable 可以同时接受 ref 和普通值。这些函数在编写通用响应式工具和类型处理时不可或缺。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### 响应式数组的特殊处理

### 概念说明

Vue 3 对数组的响应式处理需要额外的特殊逻辑。虽然 Proxy 可以拦截数组的索引访问和赋值，但数组的内置方法（如 push、pop、splice、indexOf、includes 等）在执行时会产生复杂的内部操作，如果不做特殊处理会导致性能问题或行为异常。

Vue 3 对数组做了两类特殊处理：一是对查找方法（indexOf、includes、lastIndexOf）进行了重写，使其先在代理对象上查找，找不到再在原始对象上查找；二是对修改方法（push、pop、shift、unshift、splice）进行了重写，在方法执行期间暂停依赖收集（pauseTracking），避免方法内部读取 length 属性导致不必要的依赖关系。

### 基本示例

```javascript
// 示例说明：数组响应式的特殊行为

import { reactive, watchEffect } from "vue";

// ===== 基本数组操作 =====
const arr = reactive([1, 2, 3]);

watchEffect(() => {
    console.log("数组:", arr.join(", "));
});

// 索引赋值 → 触发更新（Vue 2 做不到）
arr[0] = 10;    // 输出 "数组: 10, 2, 3"

// length 修改 → 触发更新
arr.length = 2; // 输出 "数组: 10, 2"

// 变更方法 → 触发更新
arr.push(4);    // 输出 "数组: 10, 2, 4"
arr.splice(1, 1); // 输出 "数组: 10, 4"

// ===== 查找方法的特殊处理 =====
const obj = {};
const reactiveArr = reactive([obj]);

// 问题：如果不做特殊处理
// reactiveArr[0] 返回的是 obj 的代理
// reactiveArr.includes(obj) 用原始 obj 去查找代理对象
// 结果是 false（不符合预期）

// Vue 的处理：先在代理上找，找不到再在原始对象上找
console.log(reactiveArr.includes(obj)); // true（Vue 做了特殊处理）

// ===== push 等方法的特殊处理 =====
const list = reactive([]);

// 在两个 effect 中分别 push
watchEffect(() => {
    list.push(1);
    // push 内部会读取 length 并修改 length
    // 如果不暂停追踪，两个 effect 都会依赖 length
    // 互相触发导致无限循环
});

watchEffect(() => {
    list.push(2);
});
// Vue 在 push 执行期间暂停 track，避免了这个问题
```

### 内部原理

#### 数组方法重写的机制

```
Vue 3 对数组方法的处理：

1. 查找方法重写（includes, indexOf, lastIndexOf）：

const arrayInstrumentations = {};

["includes", "indexOf", "lastIndexOf"].forEach((key) => {
    arrayInstrumentations[key] = function (...args) {
        const arr = toRaw(this);
        // 先遍历数组收集依赖
        for (let i = 0; i < this.length; i++) {
            track(arr, "get", i + "");
        }
        // 先用代理对象查找
        const res = Array.prototype[key].apply(this, args);
        if (res === -1 || res === false) {
            // 找不到 → 用原始参数在原始数组上查找
            return Array.prototype[key].apply(arr, args.map(toRaw));
        }
        return res;
    };
});

2. 修改方法重写（push, pop, shift, unshift, splice）：

["push", "pop", "shift", "unshift", "splice"].forEach((key) => {
    arrayInstrumentations[key] = function (...args) {
        // 暂停依赖收集
        pauseTracking();
        // 执行原始方法
        const res = Array.prototype[key].apply(this, args);
        // 恢复依赖收集
        resetTracking();
        return res;
    };
});

// 在 reactive 的 get 陷阱中
// 如果 key 是上述方法名，返回重写后的版本
```

### 与相关API的对比

| 数组操作 | Vue 2 | Vue 3 |
|---------|-------|-------|
| 索引赋值 `arr[0] = x` | 不触发更新 | 触发更新 |
| length 修改 | 不触发更新 | 触发更新 |
| push/pop 等方法 | 重写原型链方法 | Proxy + 方法重写 |
| includes(原始对象) | 无特殊处理 | 自动查找原始对象 |
| for...of 遍历 | 依赖 length | 依赖 length |

### 适用场景

- **列表渲染：** v-for 渲染数组时自动追踪变化
- **动态操作：** push/splice 等操作自动触发更新
- **查找判断：** includes/indexOf 正确处理代理对象

### 常见问题

#### 为什么 push 需要暂停追踪

**解决方案：**

```javascript
// push 的内部执行步骤：
// 1. 读取 this.length（触发 track）
// 2. 设置 this[length] = value（触发 trigger）
// 3. 设置 this.length = length + 1（触发 trigger）

// 如果不暂停追踪：
// effect A 中 push → 依赖 length
// effect B 中 push → 依赖 length
// A 的 push 修改了 length → 触发 B
// B 的 push 修改了 length → 触发 A
// → 无限循环

// Vue 的解决方案：push 执行期间暂停 track
// 不会收集对 length 的依赖
// 但 set 陷阱的 trigger 仍然正常工作
```

### 注意事项

- 数组索引赋值和 length 修改在 Vue 3 中都是响应式的
- 查找方法会自动处理原始对象和代理对象的匹配
- push 等修改方法在执行期间暂停依赖收集
- 大数组操作（如排序、过滤）建议先 toRaw 再操作
- for...of 和 forEach 遍历数组会追踪 length 和每个索引
- 数组的 ownKeys 陷阱使用 "length" 作为 key

### 总结

Vue 3 对数组做了两类特殊处理：查找方法（includes 等）支持原始对象和代理对象的匹配；修改方法（push 等）在执行期间暂停依赖收集避免无限循环。相比 Vue 2，Proxy 让索引赋值和 length 修改也能触发更新。这些特殊处理保证了数组操作在响应式环境中的正确性和性能。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### 响应式Map与Set的代理

### 概念说明

Vue 3 的 `reactive()` 不仅支持普通对象和数组，还支持 `Map`、`Set`、`WeakMap`、`WeakSet` 等集合类型。但集合类型的代理方式与普通对象不同：集合的操作方法（get、set、add、delete、has、forEach 等）需要通过特定的 this 上下文调用，直接用 Proxy 拦截会导致方法内部的 this 指向代理对象而非原始集合，从而引发 TypeError。

Vue 3 通过为集合类型提供专门的 handler（collectionHandlers）来解决这个问题。这些 handler 在 get 陷阱中拦截方法名，返回重写后的方法函数。重写的方法在调用原始方法前做依赖收集或更新触发，并确保 this 指向原始集合对象。

### 基本示例

```javascript
// 示例说明：响应式 Map 和 Set 的使用

import { reactive, watchEffect } from "vue";

// ===== 响应式 Map =====
const userMap = reactive(new Map([
    ["user1", { name: "张三", age: 25 }],
    ["user2", { name: "李四", age: 30 }],
]));

watchEffect(() => {
    // 读取 Map 的 size → track
    console.log("Map 大小:", userMap.size);
});

watchEffect(() => {
    // get 方法 → track
    const user = userMap.get("user1");
    console.log("user1:", user?.name);
});

// 修改 Map → trigger
userMap.set("user3", { name: "王五", age: 28 }); // size 变化 → 触发更新
userMap.get("user1").name = "张三丰"; // 深层属性变化 → 触发更新
userMap.delete("user2"); // 删除 → 触发更新

// ===== 响应式 Set =====
const tagSet = reactive(new Set(["前端", "Vue", "React"]));

watchEffect(() => {
    // 遍历 Set → track
    console.log("标签:", [...tagSet].join(", "));
});

// 修改 Set → trigger
tagSet.add("TypeScript"); // 触发更新
tagSet.delete("React");   // 触发更新
tagSet.clear();            // 触发更新

// ===== 遍历 =====
const dataMap = reactive(new Map());
dataMap.set("a", 1);
dataMap.set("b", 2);

watchEffect(() => {
    // forEach 遍历 → track 所有键值对
    dataMap.forEach((value, key) => {
        console.log(`${key}: ${value}`);
    });
});

// 修改或新增都会触发上面的 watchEffect
dataMap.set("c", 3);    // 触发
dataMap.set("a", 100);  // 触发
```

### 内部原理

#### 集合类型的 handler 实现

```
集合类型的代理策略：

普通对象：直接用 get/set/has/deleteProperty/ownKeys 陷阱
集合类型：只用 get 陷阱拦截方法调用

const collectionHandlers = {
    get(target, key, receiver) {
        // size 属性特殊处理
        if (key === "size") {
            track(target, "iterate", ITERATE_KEY);
            return Reflect.get(target, "size", target);
        }

        // 返回重写后的方法
        return instrumentations[key] || Reflect.get(target, key, target);
    }
};

重写的 Map 方法示例：

instrumentations = {
    get(key) {
        const target = toRaw(this);
        track(target, "get", key);       // 依赖收集
        const rawKey = toRaw(key);
        const res = target.get(rawKey);  // 在原始 Map 上调用
        return isObject(res) ? reactive(res) : res; // 深层代理
    },

    set(key, value) {
        const target = toRaw(this);
        const hadKey = target.has(key);
        const oldValue = target.get(key);
        target.set(key, toRaw(value));   // 在原始 Map 上设置
        if (!hadKey) {
            trigger(target, "add", key); // 新增
        } else if (oldValue !== value) {
            trigger(target, "set", key); // 修改
        }
    },

    has(key) {
        const target = toRaw(this);
        track(target, "has", key);
        return target.has(toRaw(key));
    },

    delete(key) {
        const target = toRaw(this);
        const hadKey = target.has(key);
        const result = target.delete(key);
        if (hadKey) {
            trigger(target, "delete", key);
        }
        return result;
    },

    forEach(callback, thisArg) {
        const target = toRaw(this);
        track(target, "iterate", ITERATE_KEY);
        // 遍历时对值做响应式包装
        target.forEach((value, key) => {
            callback.call(thisArg, wrap(value), wrap(key), this);
        });
    }
};
```

### 与相关API的对比

| 操作 | Map/Set 方法 | 响应式行为 |
|------|------------|----------|
| 读取 | get(key) | track |
| 写入 | set(key, value) | trigger(add/set) |
| 删除 | delete(key) | trigger(delete) |
| 判断 | has(key) | track |
| 大小 | size | track(ITERATE_KEY) |
| 遍历 | forEach / for...of | track(ITERATE_KEY) |
| 清空 | clear() | trigger(clear) |
| 添加(Set) | add(value) | trigger(add) |

### 适用场景

- **键值映射：** 用户信息缓存、配置映射
- **唯一集合：** 标签集合、选中项集合
- **复杂数据结构：** 需要非字符串 key 的映射关系

### 常见问题

#### Map/Set 中的 ref 不会自动解包

**解决方案：**

```javascript
import { reactive, ref } from "vue";

const map = reactive(new Map());
const countRef = ref(0);

map.set("count", countRef);

// Map/Set 中的 ref 不会自动解包（和数组一样）
console.log(map.get("count"));       // RefImpl 对象
console.log(map.get("count").value); // 0（需要手动 .value）
```

### 注意事项

- 集合类型使用专门的 collectionHandlers 代理
- 重写的方法确保在原始集合对象上调用（正确的 this）
- Map/Set 中的值如果是对象会被深层代理
- Map/Set 中的 ref 不会自动解包
- 遍历操作（forEach、for...of、size）追踪 ITERATE_KEY
- 存入 Map 的值会通过 toRaw 转换为原始值再存储

### 总结

Vue 3 通过专门的 collectionHandlers 代理 Map/Set 等集合类型。重写集合的方法函数，在原始方法调用前后插入 track 和 trigger 逻辑，并确保 this 指向原始集合。get/has 方法做依赖收集，set/delete/add/clear 方法做更新触发，遍历操作追踪 ITERATE_KEY。集合类型中的对象值会被深层代理，但 ref 不会自动解包。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### nextTick的异步更新队列原理

### 概念说明

`nextTick()` 用于在 Vue 完成 DOM 更新后执行回调。Vue 的响应式更新是异步的——当你修改响应式数据时，Vue 不会立即更新 DOM，而是将更新任务放入一个异步队列，在当前同步代码执行完毕后统一执行。nextTick 让你可以在 DOM 更新完成后获取最新的 DOM 状态。

Vue 3 的 nextTick 基于 `Promise.resolve().then()` 实现。当数据变化触发 trigger 时，组件的渲染 effect 通过 scheduler 被放入更新队列（queueJob）。Vue 在一个微任务中刷新这个队列，按顺序执行所有更新任务。nextTick 返回一个 Promise，该 Promise 在队列刷新完成后 resolve。

这种批量异步更新策略避免了同一事件循环中多次数据修改导致多次 DOM 更新的性能浪费。

### 基本示例

```vue
<script setup>
// 示例说明：nextTick 的使用场景

import { ref, nextTick } from "vue";

const count = ref(0);
const message = ref("hello");

// ===== 基本用法 =====
async function handleClick() {
    count.value = 100;
    message.value = "world";
    
    // 此时 DOM 还没更新
    console.log(document.getElementById("count").textContent); // "0"
    
    // 等待 DOM 更新完成
    await nextTick();
    
    // 此时 DOM 已经更新
    console.log(document.getElementById("count").textContent); // "100"
}

// ===== 回调形式 =====
function handleUpdate() {
    count.value = 200;
    
    nextTick(() => {
        // DOM 已更新
        const el = document.getElementById("count");
        console.log("更新后的 DOM:", el.textContent); // "200"
    });
}

// ===== 多次修改合并为一次更新 =====
function batchUpdate() {
    // 以下三次修改只会触发一次 DOM 更新
    count.value = 1;
    count.value = 2;
    count.value = 3;
    
    nextTick(() => {
        // DOM 中 count 显示为 3
        console.log("最终值:", count.value);
    });
}

// ===== 列表更新后滚动到底部 =====
const items = ref(["item1", "item2"]);

async function addItem() {
    items.value.push(`item${items.value.length + 1}`);
    
    await nextTick();
    
    // DOM 已渲染新元素，可以安全操作
    const container = document.querySelector(".list");
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}
</script>

<template>
    <p id="count">{{ count }}</p>
    <p>{{ message }}</p>
    <button @click="handleClick">更新</button>
</template>
```

### 内部原理

#### 异步更新队列的工作流程

```
Vue 3 的更新调度机制：

1. 数据变化
   → state.count = 10
   → Proxy set → trigger
   → 找到组件的渲染 effect
   → 调用 scheduler

2. scheduler 将更新任务入队
   → queueJob(componentUpdateFn)
   → 如果队列为空，注册微任务 flushJobs
   → 如果任务已在队列中，跳过（去重）

3. 当前同步代码继续执行
   → state.count = 20（scheduler 入队，但任务已存在，跳过）
   → state.count = 30（同上）

4. 同步代码执行完毕，微任务开始
   → flushJobs() 执行
   → 按优先级排序并执行队列中的任务
   → 组件渲染只执行一次（count = 30）
   → DOM 更新完成

5. nextTick 的 Promise resolve
   → nextTick 的回调执行
   → 可以安全访问更新后的 DOM

nextTick 的实现：

const resolvedPromise = Promise.resolve();
let currentFlushPromise = null;

function nextTick(fn) {
    const p = currentFlushPromise || resolvedPromise;
    return fn ? p.then(fn) : p;
}

// 当有更新任务时：
function queueFlush() {
    currentFlushPromise = resolvedPromise.then(flushJobs);
}
// nextTick 会等待 flushJobs 完成后再执行
```

### 与相关API的对比

| 方式 | 实现 | 时机 |
|------|------|------|
| nextTick | Promise.resolve().then() | DOM 更新后 |
| watch(flush:'post') | queuePostFlushCb | DOM 更新后 |
| setTimeout | 宏任务 | 下一个事件循环 |
| requestAnimationFrame | 浏览器渲染前 | 下一帧 |

### 适用场景

- **DOM 操作：** 数据更新后需要读取或操作 DOM
- **滚动定位：** 列表更新后滚动到指定位置
- **焦点管理：** 元素渲染后设置焦点
- **尺寸测量：** 内容变化后重新测量元素尺寸

### 常见问题

#### nextTick 和 setTimeout 的区别

**解决方案：**

```javascript
import { ref, nextTick } from "vue";

const count = ref(0);
count.value = 10;

// nextTick：微任务，在 DOM 更新后立即执行
nextTick(() => {
    console.log("nextTick"); // 先执行
});

// setTimeout：宏任务，在下一个事件循环执行
setTimeout(() => {
    console.log("setTimeout"); // 后执行
}, 0);

// 执行顺序：nextTick → setTimeout
// nextTick 更快，因为它是微任务
// 用 nextTick 就够了，不需要 setTimeout
```

### 注意事项

- nextTick 返回 Promise，可以用 await 或 .then
- 多次数据修改在同一个微任务中合并为一次 DOM 更新
- nextTick 在 DOM 更新后执行，比 setTimeout 更早
- 不要在循环中频繁调用 nextTick（应该在循环外调用一次）
- nextTick 可以不传回调，直接 await nextTick()
- Vue 3 的 nextTick 完全基于 Promise（Vue 2 有降级策略）

### 总结

nextTick 让你在 Vue 完成 DOM 更新后执行回调。Vue 将多次数据修改合并为一次异步 DOM 更新（通过微任务队列），nextTick 的回调在更新完成后执行。基于 Promise.resolve().then() 实现，比 setTimeout 更早。适合数据更新后需要操作 DOM 的场景。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。



## 7.3 组件系统基础

### Options API的data选项与函数返回

### 概念说明

在 Vue 的 Options API 中，`data` 选项用于声明组件的响应式状态。data 必须是一个返回对象的函数，而不是直接的对象字面量。这样每个组件实例在创建时都会调用该函数获得一个全新的数据对象副本，避免多个组件实例共享同一个数据对象导致相互污染。

data 函数返回的对象会被 Vue 的响应式系统处理——在 Vue 3 中是通过 `reactive()` 将返回的对象转为深层响应式代理。返回对象中的所有属性会被挂载到组件实例（this）上，可以在模板和其他选项（methods、computed、watch 等）中通过 this 直接访问。

Vue 3 仍然完整支持 Options API，但推荐使用 Composition API（setup / script setup）来组织代码逻辑。

### 基本示例

```javascript
// 示例说明：data 选项的正确和错误用法

// ===== 正确：data 是一个函数 =====
export default {
    data() {
        return {
            // 基本类型
            count: 0,
            message: "你好",
            visible: true,

            // 对象类型
            user: {
                name: "张三",
                age: 25,
            },

            // 数组类型
            items: ["苹果", "香蕉", "橘子"],

            // 初始为 null（后续赋值）
            fetchedData: null,
        };
    },

    methods: {
        increment() {
            // 通过 this 访问 data 中的属性
            this.count++;
        },
        updateUser() {
            // 修改嵌套对象的属性
            this.user.name = "李四";
        },
    },
};

// ===== 错误：data 是普通对象（Vue 3 会警告） =====
// export default {
//     data: {
//         count: 0, // 所有实例共享同一个对象！
//     },
// };
```

### 内部原理

#### data 函数的处理流程

```
组件初始化时 data 的处理：

1. 组件实例创建
   → Vue 调用 data() 函数
   → 获取返回的普通对象

2. 响应式转换
   → Vue 3：reactive(返回对象)
   → 将对象转为深层响应式代理

3. 挂载到实例
   → 将代理对象挂载到 instance.data
   → 通过 PublicInstanceProxyHandlers 代理
   → this.count → instance.data.count

4. 为什么必须是函数
   → 组件可能被多处使用（多个实例）
   → 如果是对象，所有实例共享同一个引用
   → 一个实例修改数据会影响其他实例
   → 函数每次调用返回新对象，实例间隔离
```

### 与相关API的对比

| 对比维度 | Options API data | Composition API ref/reactive |
|----------|-----------------|---------------------------|
| 声明方式 | data() 函数返回对象 | ref() / reactive() |
| 访问方式 | this.xxx | xxx.value / xxx.prop |
| 类型推导 | 较弱 | 较强（TypeScript 友好） |
| 代码组织 | 按选项分组 | 按功能分组 |

### 适用场景

- **简单组件：** 状态少、逻辑简单的组件
- **迁移项目：** 从 Vue 2 迁移到 Vue 3 的过渡期
- **团队习惯：** 团队已熟悉 Options API 的项目

### 常见问题

#### data 中不要使用箭头函数

**解决方案：**

```javascript
export default {
    // 错误：箭头函数中 this 不指向组件实例
    // data: () => ({
    //     count: this.initialCount, // this 是 undefined
    // }),

    // 正确：普通函数，this 指向组件实例
    data() {
        return {
            count: this.initialCount, // 可以访问 props
        };
    },

    props: {
        initialCount: {
            type: Number,
            default: 0,
        },
    },
};
```

### 注意事项

- data 必须是函数，不能是对象（避免实例间数据共享）
- data 函数中可以通过 this 访问 props
- 不要在 data 中使用箭头函数
- data 返回的对象会被 reactive 转为深层响应式
- 后续动态添加的属性也是响应式的（Vue 3 Proxy 特性）
- Vue 3 推荐使用 Composition API 替代 Options API

### 总结

Options API 的 data 选项必须是返回对象的函数，确保每个组件实例拥有独立的数据副本。返回的对象被 reactive 转为深层响应式，属性通过 this 访问。Vue 3 完全支持 Options API，但推荐新项目使用 Composition API。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### Options API的methods选项

### 概念说明

`methods` 选项用于在组件上定义方法。这些方法会被挂载到组件实例上，可以通过 `this` 在其他选项中调用，也可以在模板中作为事件处理器或插值表达式使用。

methods 中定义的函数不会被缓存——每次在模板中调用都会重新执行。这是 methods 与 computed 的核心区别：computed 有缓存，依赖不变时不重新计算；methods 没有缓存，每次调用都执行。

Vue 在初始化时会遍历 methods 对象，将每个方法通过 `bind` 绑定到组件实例上，确保方法内部的 `this` 始终指向组件实例。因此 methods 中不能使用箭头函数，否则 `this` 无法正确绑定。

### 基本示例

```javascript
// 示例说明：methods 选项的各种使用方式

export default {
    data() {
        return {
            count: 0,
            items: [],
        };
    },

    methods: {
        // 普通方法：修改组件状态
        increment() {
            this.count++;
        },

        // 带参数的方法
        addItem(item) {
            this.items.push(item);
        },

        // 异步方法
        async fetchData() {
            try {
                const res = await fetch("/api/data");
                const data = await res.json();
                this.items = data;
            } catch (err) {
                console.error("请求失败:", err);
            }
        },

        // 方法间互相调用
        reset() {
            this.count = 0;
            this.items = [];
            this.logAction("重置数据");
        },

        logAction(action) {
            console.log(`[${new Date().toLocaleString()}] ${action}`);
        },
    },
};
```

```html
<!-- 模板中使用 methods -->
<template>
    <div>
        <p>{{ count }}</p>
        <button @click="increment">+1</button>
        <button @click="addItem('新项目')">添加</button>
        <button @click="fetchData">加载数据</button>
        <button @click="reset">重置</button>
    </div>
</template>
```

### 内部原理

#### methods 的绑定过程

```
组件初始化时 methods 的处理：

1. 遍历 methods 对象的所有属性
2. 对每个方法执行 bind(instance)
   → method.bind(publicThis)
   → 确保 this 指向组件代理实例
3. 将绑定后的方法挂载到组件实例上
   → instance.ctx[methodName] = boundMethod

访问机制：
  → 模板中 @click="increment"
  → 编译为 _ctx.increment
  → 通过组件代理的 get 陷阱查找
  → 返回绑定后的方法
```

### 与相关API的对比

| 对比维度 | methods | computed | watch |
|----------|---------|---------|-------|
| 缓存 | 无 | 有（依赖不变返回缓存） | 不适用 |
| 触发时机 | 手动调用/事件触发 | 读取时自动计算 | 依赖变化时自动 |
| 返回值 | 可有可无 | 必须有 | 无 |
| 用途 | 事件处理、命令式操作 | 派生数据 | 副作用响应 |

### 适用场景

- **事件处理：** 按钮点击、表单提交等用户交互
- **命令式操作：** 发起网络请求、操作 DOM
- **复用逻辑：** 组件内多处调用的公共方法
- **生命周期回调中调用：** mounted 中调用 fetchData 等

### 常见问题

#### methods 中不能使用箭头函数

**解决方案：**

```javascript
export default {
    data() {
        return { count: 0 };
    },
    methods: {
        // 错误：箭头函数的 this 不指向组件实例
        // increment: () => {
        //     this.count++; // this 是 undefined 或外层作用域
        // },

        // 正确：普通函数或简写
        increment() {
            this.count++; // this 正确指向组件实例
        },
    },
};
```

### 注意事项

- methods 中不要使用箭头函数（this 绑定问题）
- methods 没有缓存，每次调用都执行
- 需要缓存的计算逻辑应该用 computed 而非 methods
- methods 中可以通过 this 访问 data、props、computed 等
- 方法名不要与 data、props、computed 的属性名重复
- Vue 3 推荐使用 Composition API 中的普通函数替代 methods

### 总结

methods 选项定义组件的方法，通过 bind 绑定 this 到组件实例。方法没有缓存，每次调用都执行。适合事件处理和命令式操作。不能使用箭头函数。在 Composition API 中，直接在 setup 或 script setup 中声明普通函数即可替代 methods。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### Options API的computed选项

### 概念说明

Options API 中的 `computed` 选项用于声明计算属性。计算属性基于其依赖的响应式数据进行缓存，只有依赖变化时才会重新计算。在模板中使用计算属性和使用普通 data 属性一样，但计算属性的值是动态派生的。

computed 中可以定义两种形式：一种是只有 getter 的简写形式（函数），另一种是同时提供 getter 和 setter 的对象形式。计算属性在 Vue 3 内部通过 `computed()` API 实现，会创建一个带缓存的 effect。

### 基本示例

```javascript
// 示例说明：computed 选项的两种形式

export default {
    data() {
        return {
            firstName: "张",
            lastName: "三",
            items: [
                { name: "苹果", price: 5, quantity: 3 },
                { name: "香蕉", price: 3, quantity: 5 },
            ],
        };
    },

    computed: {
        // 简写形式：只有 getter
        fullName() {
            // 依赖 firstName 和 lastName
            // 任一变化时自动重新计算
            return this.firstName + this.lastName;
        },

        // 派生数据：计算总价
        totalPrice() {
            return this.items.reduce((sum, item) => {
                return sum + item.price * item.quantity;
            }, 0);
        },

        // 对象形式：getter + setter
        fullNameWritable: {
            get() {
                return this.firstName + this.lastName;
            },
            set(newValue) {
                // 写入时拆分姓名
                this.firstName = newValue.charAt(0);
                this.lastName = newValue.slice(1);
            },
        },
    },
};
```

```html
<template>
    <p>{{ fullName }}</p>
    <p>总价: {{ totalPrice }} 元</p>
    <input v-model="fullNameWritable" />
</template>
```

### 内部原理

#### computed 选项的初始化

```
Options API computed 的处理流程：

1. 遍历 computed 对象的每个属性
2. 判断是函数还是对象
   → 函数：getter = fn, setter = NOOP
   → 对象：getter = fn.get, setter = fn.set
3. 调用 computed(getter, setter) 创建 ComputedRefImpl
4. 将 computed ref 挂载到组件实例
   → 通过代理 get 访问时自动解包（返回 .value）
   → this.fullName 实际是 computedRef.value
```

### 与相关API的对比

| 对比维度 | computed（Options） | computed()（Composition） |
|----------|-------------------|------------------------|
| 声明位置 | computed 选项 | setup / script setup |
| 访问方式 | this.xxx | xxx.value |
| 缓存 | 有 | 有 |
| setter | 对象形式提供 | 对象形式提供 |

### 适用场景

- **派生数据：** 从 data 或 props 计算出新的值
- **格式化：** 日期、金额等数据的显示格式
- **过滤/排序：** 对列表数据进行过滤和排序
- **条件判断：** 复杂的条件逻辑提取为计算属性

### 常见问题

#### computed 和 methods 怎么选

**解决方案：**

```javascript
export default {
    data() {
        return { list: [3, 1, 4, 1, 5] };
    },
    computed: {
        // 用 computed：有缓存，list 不变时不重新排序
        sortedList() {
            return [...this.list].sort((a, b) => a - b);
        },
    },
    methods: {
        // 用 methods：每次调用都重新排序
        getSortedList() {
            return [...this.list].sort((a, b) => a - b);
        },
    },
};
// 模板中 {{ sortedList }} 多次引用只计算一次
// 模板中 {{ getSortedList() }} 每次引用都计算
```

### 注意事项

- computed 有缓存，methods 没有缓存
- computed 的 getter 不应有副作用（不要修改状态、发请求）
- 不要在 computed 中使用箭头函数（this 问题）
- 可写 computed 需要用对象形式同时提供 get 和 set
- computed 中不要做异步操作

### 总结

Options API 的 computed 选项声明计算属性，支持函数简写（只读）和对象形式（可写）。计算属性有缓存，依赖不变时不重新计算。getter 中不应有副作用。适合从响应式数据派生新值。在 Composition API 中用 `computed()` 函数替代。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### Options API的watch选项

### 概念说明

Options API 中的 `watch` 选项用于侦听响应式数据的变化并执行副作用。watch 的键是要侦听的数据源（data 属性名、computed 属性名或用点号分隔的路径），值是回调函数或配置对象。

watch 适合在数据变化后执行异步操作或有副作用的操作（发请求、操作 DOM、写日志等）。与 computed 不同，watch 不返回值，它的目的是"响应变化"而非"计算数据"。

watch 选项支持 `deep`（深度侦听）、`immediate`（立即执行）、`flush`（回调时机）等配置，和 Composition API 的 `watch()` 函数的选项一致。

### 基本示例

```javascript
// 示例说明：watch 选项的各种用法

export default {
    data() {
        return {
            keyword: "",
            userId: 1,
            config: {
                theme: "dark",
                lang: "zh",
            },
        };
    },

    watch: {
        // 简写形式：函数
        keyword(newVal, oldVal) {
            console.log(`关键词从 "${oldVal}" 变为 "${newVal}"`);
            this.search(newVal);
        },

        // 完整形式：配置对象
        userId: {
            handler(newId, oldId) {
                console.log(`用户ID: ${oldId} → ${newId}`);
                this.fetchUser(newId);
            },
            immediate: true, // 创建时立即执行一次
        },

        // 深度侦听对象
        config: {
            handler(newConfig) {
                console.log("配置变化:", newConfig);
                this.applyConfig(newConfig);
            },
            deep: true, // 侦听嵌套属性变化
        },

        // 用点号路径侦听嵌套属性
        "config.theme"(newTheme) {
            console.log("主题变化:", newTheme);
            document.body.className = newTheme;
        },
    },

    methods: {
        search(keyword) {
            // 搜索逻辑
        },
        async fetchUser(id) {
            const res = await fetch(`/api/users/${id}`);
            console.log(await res.json());
        },
        applyConfig(config) {
            // 应用配置逻辑
        },
    },
};
```

### 内部原理

#### watch 选项的初始化

```
Options API watch 的处理流程：

1. 遍历 watch 对象的每个键
2. 判断值的类型：
   → 函数：handler = fn
   → 对象：handler = fn.handler，提取 options
   → 字符串：handler = methods[value]
   → 数组：对每个元素创建一个 watcher
3. 创建 watcher：
   → 构建 getter：() => instance[key]（通过点号路径解析）
   → 调用内部的 watch(getter, handler, options)
   → 等价于 Composition API 的 watch()
```

### 与相关API的对比

| 对比维度 | watch（Options） | watch()（Composition） |
|----------|----------------|---------------------|
| 侦听源 | 字符串键名/路径 | ref / reactive / getter |
| 回调 | handler 函数 | 第二个参数 |
| 配置 | deep / immediate / flush | deep / immediate / flush |
| 声明位置 | watch 选项 | setup / script setup |

### 适用场景

- **异步请求：** 参数变化后重新请求数据
- **副作用操作：** 数据变化后操作 DOM、写日志
- **深层对象变化：** 配合 deep 侦听嵌套属性
- **初始加载：** 配合 immediate 在创建时执行

### 常见问题

#### watch 一个数组的多种方式

**解决方案：**

```javascript
export default {
    watch: {
        // 方式1：字符串名 → 调用 methods 中的方法
        keyword: "handleKeywordChange",

        // 方式2：数组 → 多个处理器
        userId: [
            "fetchUserData",
            function (newId) {
                console.log("内联处理:", newId);
            },
            {
                handler: "logChange",
                immediate: true,
            },
        ],
    },

    methods: {
        handleKeywordChange(newVal) { /* ... */ },
        fetchUserData(newId) { /* ... */ },
        logChange(newVal) { /* ... */ },
    },
};
```

### 注意事项

- watch 的键是字符串，对应 data/computed/props 的属性名
- 支持点号路径侦听嵌套属性（如 "a.b.c"）
- handler 可以是函数、字符串（方法名）或数组
- deep: true 会递归遍历对象，大对象有性能问题
- immediate: true 使回调在创建时立即执行一次
- 不要在 watch 中使用箭头函数

### 总结

Options API 的 watch 选项通过字符串键名侦听响应式数据变化。支持函数简写、配置对象、方法名字符串和数组等多种形式。常用配置包括 deep（深度侦听）和 immediate（立即执行）。适合执行副作用操作。在 Composition API 中用 `watch()` 和 `watchEffect()` 替代。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### Options API的生命周期钩子

### 概念说明

Options API 提供了一系列生命周期钩子选项，让开发者在组件生命周期的不同阶段执行代码。Vue 3 中组件的生命周期包括：创建、挂载、更新、卸载四个主要阶段，每个阶段有"之前"和"之后"两个时机。

Options API 的生命周期钩子直接作为组件选项定义，函数中的 `this` 指向组件实例。Vue 3 保留了 Vue 2 的大部分钩子名称，但将 `beforeDestroy` 改为 `beforeUnmount`，`destroyed` 改为 `unmounted`，语义更清晰。

### 基本示例

```javascript
// 示例说明：Options API 中所有生命周期钩子

export default {
    data() {
        return { count: 0, timer: null };
    },

    // ===== 创建阶段 =====
    beforeCreate() {
        // 组件实例刚创建，data/computed/methods 尚未初始化
        // this 存在但 this.count 不可用
        console.log("beforeCreate");
    },

    created() {
        // data/computed/methods 已初始化，DOM 还未挂载
        // 可以访问 this.count，适合发起数据请求
        console.log("created, count:", this.count);
        this.fetchData();
    },

    // ===== 挂载阶段 =====
    beforeMount() {
        // 模板已编译，即将挂载到 DOM
        // $el 尚不可用
        console.log("beforeMount");
    },

    mounted() {
        // 组件已挂载到 DOM，$el 可用
        // 适合操作 DOM 和启动定时器
        console.log("mounted, el:", this.$el);
        this.timer = setInterval(() => this.count++, 1000);
    },

    // ===== 更新阶段 =====
    beforeUpdate() {
        // 数据变化后，DOM 更新之前
        // 可以访问更新前的 DOM 状态
        console.log("beforeUpdate");
    },

    updated() {
        // DOM 已更新
        // 避免在此修改数据（可能导致无限循环）
        console.log("updated");
    },

    // ===== 卸载阶段 =====
    beforeUnmount() {
        // 组件即将卸载，实例仍然完全可用
        // 适合执行清理操作
        console.log("beforeUnmount");
        clearInterval(this.timer);
    },

    unmounted() {
        // 组件已卸载，所有绑定和事件监听已移除
        console.log("unmounted");
    },

    methods: {
        async fetchData() {
            // ...
        },
    },
};
```

### 内部原理

#### 生命周期钩子的执行顺序

```
组件完整生命周期：

父组件 beforeCreate
父组件 created
父组件 beforeMount
  ↓ 子组件 beforeCreate
  ↓ 子组件 created
  ↓ 子组件 beforeMount
  ↓ 子组件 mounted
父组件 mounted

更新时：
父组件 beforeUpdate
  ↓ 子组件 beforeUpdate
  ↓ 子组件 updated
父组件 updated

卸载时：
父组件 beforeUnmount
  ↓ 子组件 beforeUnmount
  ↓ 子组件 unmounted
父组件 unmounted
```

### 与相关API的对比

| Options API | Composition API | 执行时机 |
|------------|----------------|---------|
| beforeCreate | setup() 本身 | 实例创建前 |
| created | setup() 本身 | 实例创建后 |
| beforeMount | onBeforeMount | DOM 挂载前 |
| mounted | onMounted | DOM 挂载后 |
| beforeUpdate | onBeforeUpdate | DOM 更新前 |
| updated | onUpdated | DOM 更新后 |
| beforeUnmount | onBeforeUnmount | 卸载前 |
| unmounted | onUnmounted | 卸载后 |

### 适用场景

- **created：** 发起数据请求、初始化非 DOM 依赖的逻辑
- **mounted：** 操作 DOM、初始化第三方库、启动定时器
- **beforeUnmount：** 清理定时器、取消订阅、移除事件监听
- **updated：** 在 DOM 更新后执行操作（谨慎使用）

### 常见问题

#### beforeCreate 和 created 在 Composition API 中的替代

**解决方案：**

```javascript
// Options API
export default {
    beforeCreate() { /* ... */ },
    created() { /* ... */ },
};

// Composition API：setup 本身就等价于 beforeCreate + created
// 没有对应的 onBeforeCreate 和 onCreated
import { onMounted } from "vue";

export default {
    setup() {
        // 这里的代码等价于 beforeCreate + created 阶段
        console.log("相当于 created");

        onMounted(() => {
            console.log("mounted");
        });
    },
};
```

### 注意事项

- beforeCreate 中不能访问 data/computed/methods
- 不要在 updated 中修改数据（可能导致无限循环）
- beforeUnmount 中做清理工作（定时器、事件监听等）
- 父子组件的钩子执行顺序是由内到外（挂载）和由外到内（卸载）
- SSR 中只有 beforeCreate 和 created 会在服务端执行
- Vue 3 将 destroyed 改名为 unmounted

### 总结

Options API 的生命周期钩子覆盖组件从创建到卸载的全过程。created 用于数据初始化，mounted 用于 DOM 操作，beforeUnmount 用于清理。父子组件的钩子遵循特定的执行顺序。Composition API 中 setup 替代了 beforeCreate/created，其他钩子使用 on 前缀的函数形式。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### Options API的props选项与验证

### 概念说明

`props` 选项用于声明组件接受的外部数据（属性）。父组件通过属性传递数据给子组件，子组件通过 props 选项声明它期望接收哪些属性、类型是什么、是否必填、默认值是多少。

props 可以用数组形式简单声明属性名，也可以用对象形式提供详细的类型检查和验证规则。Vue 在开发环境中会检查传入的 props 是否符合声明的约束，不符合时会在控制台输出警告。

props 是单向数据流：父组件向子组件传递数据，子组件不应直接修改 props。如果需要基于 props 派生数据，应使用 computed；如果需要本地可修改的副本，应使用 data 接收初始值。

### 基本示例

```javascript
// 示例说明：props 选项的各种验证方式

export default {
    props: {
        // 基本类型检查
        title: String,

        // 多种可能的类型
        value: [String, Number],

        // 必填项
        id: {
            type: Number,
            required: true,
        },

        // 带默认值
        status: {
            type: String,
            default: "pending",
        },

        // 对象/数组的默认值必须用工厂函数
        config: {
            type: Object,
            default() {
                return { theme: "light", lang: "zh" };
            },
        },

        // 自定义验证器
        age: {
            type: Number,
            validator(value) {
                // 验证年龄在 0-150 之间
                return value >= 0 && value <= 150;
            },
        },

        // 布尔类型的特殊处理
        disabled: {
            type: Boolean,
            default: false,
        },
    },

    computed: {
        // 基于 props 派生数据（不要直接修改 props）
        formattedTitle() {
            return this.title?.toUpperCase() || "";
        },
    },
};
```

```html
<!-- 父组件使用 -->
<template>
    <MyComponent
        :id="1"
        title="标题"
        :age="25"
        :config="{ theme: 'dark' }"
        disabled
    />
    <!-- disabled 不传值等价于 disabled="true"（Boolean 特性） -->
</template>
```

### 内部原理

#### props 的验证流程

```
组件初始化时 props 的处理：

1. 规范化 props 声明
   → 数组形式转为对象形式
   → ["title"] → { title: {} }

2. 从 vnode.props 中提取值
   → 匹配 camelCase 和 kebab-case

3. 类型检查（开发环境）
   → 检查 type 是否匹配
   → 检查 required 是否满足
   → 执行 validator 函数

4. 处理默认值
   → 值为 undefined 时使用 default
   → Object/Array 的 default 必须是工厂函数

5. 转为浅层响应式
   → shallowReactive(propsData)
   → props 是只读的（开发环境修改会警告）
```

### 与相关API的对比

| 声明形式 | 示例 | 特点 |
|---------|------|------|
| 数组 | `props: ['title']` | 简单，无验证 |
| 对象-简写 | `props: { title: String }` | 只有类型检查 |
| 对象-完整 | `props: { title: { type, default, required, validator } }` | 完整验证 |

### 适用场景

- **数据传递：** 父组件向子组件传递数据
- **组件接口：** 定义组件的公开 API
- **类型安全：** 在运行时验证数据类型
- **文档化：** props 声明本身就是组件的文档

### 常见问题

#### 不要直接修改 props

**解决方案：**

```javascript
export default {
    props: {
        initialCount: {
            type: Number,
            default: 0,
        },
    },
    data() {
        // 方式1：用 data 创建本地副本
        return {
            localCount: this.initialCount,
        };
    },
    computed: {
        // 方式2：用 computed 派生数据
        doubleCount() {
            return this.initialCount * 2;
        },
    },
};
```

### 注意事项

- props 是单向数据流，子组件不能修改
- 对象/数组类型的默认值必须用工厂函数返回
- Boolean 类型有特殊的默认处理（不传值 = true）
- 验证只在开发环境执行，不影响生产环境
- camelCase 的 props 在模板中可以用 kebab-case
- props 在组件内部是浅层响应式且只读的

### 总结

Options API 的 props 选项声明组件接受的外部属性，支持类型检查、必填验证、默认值和自定义验证器。props 是单向数据流，子组件不应直接修改。对象和数组的默认值必须用工厂函数。在 Composition API 中用 `defineProps` 替代。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### Options API的emits选项

### 概念说明

`emits` 选项用于声明组件会触发的自定义事件。Vue 3 新增了这个选项，让组件的事件接口更加明确。emits 可以是数组形式（只声明事件名）或对象形式（提供事件验证函数）。

声明 emits 有三个作用：一是文档化——让其他开发者知道这个组件会触发哪些事件；二是验证——对象形式可以校验事件参数是否合法；三是避免原生事件冲突——声明了的事件不会作为原生事件监听器绑定到组件根元素上。

在组件方法中通过 `this.$emit(eventName, ...args)` 触发事件，父组件通过 `@eventName` 监听。

### 基本示例

```javascript
// 示例说明：emits 选项的使用

// ===== 子组件 =====
export default {
    // 数组形式：只声明事件名
    // emits: ['submit', 'cancel', 'update'],

    // 对象形式：带验证
    emits: {
        // null 表示不做验证
        cancel: null,

        // 验证函数：返回 true 表示合法
        submit(payload) {
            if (payload && payload.email && payload.password) {
                return true;
            }
            // 返回 false 时开发环境会输出警告
            console.warn("submit 事件参数不完整");
            return false;
        },

        // 带类型验证的 update 事件
        update(id, value) {
            return typeof id === "number" && value !== undefined;
        },
    },

    methods: {
        handleSubmit() {
            // 通过 this.$emit 触发事件
            this.$emit("submit", {
                email: "test@example.com",
                password: "123456",
            });
        },
        handleCancel() {
            this.$emit("cancel");
        },
        handleUpdate(id, val) {
            this.$emit("update", id, val);
        },
    },
};
```

```html
<!-- 父组件监听事件 -->
<template>
    <MyForm
        @submit="onSubmit"
        @cancel="onCancel"
        @update="onUpdate"
    />
</template>

<script>
export default {
    methods: {
        onSubmit(payload) {
            console.log("提交:", payload);
        },
        onCancel() {
            console.log("取消");
        },
        onUpdate(id, value) {
            console.log("更新:", id, value);
        },
    },
};
</script>
```

### 内部原理

#### emits 的处理机制

```
emits 的作用：

1. 事件验证（开发环境）：
   → $emit 触发时检查 emits 声明
   → 对象形式时执行验证函数
   → 验证失败输出警告

2. 区分自定义事件和原生事件：
   → 声明在 emits 中的事件名不会绑定为原生事件
   → 未声明的事件监听器会作为 $attrs 透传

   例如：
   emits: ['click']
   → 父组件的 @click 不会绑定原生 click
   → 而是作为自定义事件处理

   如果不声明 emits: ['click']
   → @click 会同时绑定原生 click 和自定义 click
   → 可能导致事件触发两次
```

### 与相关API的对比

| 声明形式 | 示例 | 验证 |
|---------|------|------|
| 数组 | `emits: ['submit']` | 无验证 |
| 对象-null | `emits: { submit: null }` | 无验证 |
| 对象-函数 | `emits: { submit(payload) { return !!payload } }` | 有验证 |

### 适用场景

- **组件接口声明：** 明确组件会触发哪些事件
- **事件参数验证：** 确保事件参数格式正确
- **避免原生事件冲突：** 防止 click 等同名事件重复触发

### 常见问题

#### 不声明 emits 导致 click 事件触发两次

**解决方案：**

```javascript
// 问题场景：组件内部 $emit('click') 但没有声明 emits
export default {
    // 没有声明 emits: ['click']
    methods: {
        handleClick() {
            this.$emit("click"); // 触发自定义 click
        },
    },
};
// 父组件 @click 监听时：
// 1. 原生 click 事件冒泡触发一次
// 2. 自定义 $emit('click') 触发一次
// 总共触发两次！

// 解决：声明 emits
export default {
    emits: ["click"], // 声明后 @click 只监听自定义事件
    methods: {
        handleClick() {
            this.$emit("click");
        },
    },
};
```

### 注意事项

- Vue 3 新增 emits 选项，Vue 2 中不存在
- 声明 emits 可以避免与原生事件冲突
- 对象形式的验证函数只在开发环境执行
- emits 中声明的事件不会出现在 $attrs 中
- 在 Composition API 中用 defineEmits 替代
- 事件名推荐使用 camelCase，模板中可以用 kebab-case

### 总结

emits 选项声明组件触发的自定义事件，支持数组和对象两种形式。对象形式可以提供事件参数验证。声明 emits 能避免与原生同名事件冲突，防止事件重复触发。在 Composition API 中用 `defineEmits` 替代。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### Composition API的setup函数

### 概念说明

`setup()` 是 Composition API 的入口函数，在组件实例创建之后、初始化 props 之后执行，相当于 Options API 中 `beforeCreate` 和 `created` 两个钩子之间的阶段。setup 函数是使用 Composition API 的起点，所有的响应式状态声明、计算属性、侦听器、生命周期钩子注册都在 setup 中完成。

setup 函数接收两个参数：`props`（响应式的 props 对象）和 `context`（包含 attrs、slots、emit、expose 的上下文对象）。setup 返回的对象中的属性会暴露给模板和其他 Options API 选项使用。

需要注意的是，setup 中没有 `this`——它在组件实例完全创建之前执行，所以不能通过 this 访问 data、computed、methods 等选项。

### 基本示例

```javascript
// 示例说明：setup 函数的完整用法

import { ref, reactive, computed, watch, onMounted } from "vue";

export default {
    props: {
        initialCount: {
            type: Number,
            default: 0,
        },
    },

    // setup 函数：Composition API 的入口
    setup(props, context) {
        // props 是响应式的，可以用 watch 侦听
        // 但不能解构（解构会丢失响应性）

        // context 包含 attrs、slots、emit、expose
        const { attrs, slots, emit, expose } = context;

        // ===== 声明响应式状态 =====
        const count = ref(props.initialCount);
        const user = reactive({ name: "张三", age: 25 });

        // ===== 声明计算属性 =====
        const doubleCount = computed(() => count.value * 2);

        // ===== 声明方法 =====
        function increment() {
            count.value++;
            emit("update", count.value); // 触发事件
        }

        // ===== 侦听器 =====
        watch(count, (newVal, oldVal) => {
            console.log(`count: ${oldVal} → ${newVal}`);
        });

        // ===== 生命周期钩子 =====
        onMounted(() => {
            console.log("组件已挂载");
        });

        // ===== 暴露给模板 =====
        // 返回的对象中的属性可以在模板中直接使用
        return {
            count,
            user,
            doubleCount,
            increment,
        };
    },
};
```

```html
<template>
    <div>
        <p>{{ count }} × 2 = {{ doubleCount }}</p>
        <p>{{ user.name }}</p>
        <button @click="increment">+1</button>
    </div>
</template>
```

### 内部原理

#### setup 的执行时机

```
组件初始化流程中 setup 的位置：

1. 创建组件实例
2. 初始化 props
3. 调用 setup(props, context)    ← 在这里执行
   → beforeCreate 和 created 之间
   → this 不可用
4. 处理 setup 返回值
   → 返回对象：属性暴露给模板
   → 返回函数：作为渲染函数
5. 初始化其他 Options（data/computed/methods 等）
6. 编译模板 / 挂载

setup 的返回值处理：
  → 返回对象：proxyRefs(返回对象)
    → ref 在模板中自动解包
    → { count } → 模板中 {{ count }} 而非 {{ count.value }}
  → 返回函数：作为组件的 render 函数
    → 替代模板编译
```

### 与相关API的对比

| 对比维度 | setup() | script setup |
|----------|---------|-------------|
| 语法 | 显式函数 | 语法糖（隐式 setup） |
| 返回值 | 需要手动 return | 顶层绑定自动暴露 |
| props 访问 | setup 参数 | defineProps() |
| emit 访问 | context.emit | defineEmits() |
| 组件注册 | 需要 components 选项 | 自动注册 |

### 适用场景

- **复杂组件：** 需要按功能组织代码的场景
- **逻辑复用：** 将逻辑提取为 composable 函数
- **TypeScript：** 更好的类型推导支持
- **与 Options API 混用：** 渐进式迁移

### 常见问题

#### setup 中不能使用 this

**解决方案：**

```javascript
export default {
    setup(props, { emit }) {
        // 错误：setup 中没有 this
        // console.log(this.count); // undefined

        // 正确：直接使用 setup 参数和声明的变量
        const count = ref(0);
        console.log(count.value);
        console.log(props.initialCount);
        emit("change", count.value);

        return { count };
    },
};
```

### 注意事项

- setup 中不能使用 this（组件实例尚未创建）
- props 参数是响应式的，不能解构（解构会丢失响应性）
- context 可以解构（attrs、slots、emit、expose 不是响应式的）
- setup 返回对象中的 ref 会自动解包（模板中不需要 .value）
- setup 可以返回渲染函数替代模板
- 推荐使用 script setup 语法糖替代显式 setup 函数

### 总结

setup 是 Composition API 的入口函数，在 beforeCreate 和 created 之间执行。接收 props 和 context 两个参数，没有 this。返回的对象属性暴露给模板使用，ref 自动解包。setup 允许按功能组织代码和提取 composable。推荐使用 `<script setup>` 语法糖简化写法。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### setup函数的执行时机(创建阶段)

### 概念说明

setup 函数在组件创建阶段执行，具体时机是在 props 初始化之后、beforeCreate 和 created 钩子之间。这意味着 setup 执行时 props 已经可用，但 data、computed、methods 等 Options API 选项尚未初始化，组件实例也尚未完全创建。

这个执行时机决定了几个关键特性：setup 中可以访问 props，但不能访问 this（因为组件实例还没准备好）；setup 中注册的生命周期钩子（如 onMounted）会在后续相应阶段执行；setup 的返回值会在 Options API 初始化之前设置好，所以 Options API 中可以通过 this 访问 setup 返回的属性。

### 基本示例

```javascript
// 示例说明：setup 在组件生命周期中的执行位置

import { ref, onBeforeMount, onMounted } from "vue";

export default {
    props: {
        msg: String,
    },

    // setup 在 beforeCreate 和 created 之间执行
    setup(props) {
        console.log("1. setup 执行");
        console.log("   props.msg:", props.msg); // 可以访问 props

        const count = ref(0);

        // 注册的钩子不会立即执行，而是在对应阶段执行
        onBeforeMount(() => {
            console.log("3. onBeforeMount");
        });

        onMounted(() => {
            console.log("4. onMounted");
        });

        return { count };
    },

    // Options API 的 beforeCreate 在 setup 之前
    beforeCreate() {
        console.log("0. beforeCreate（实际在 setup 之前）");
        // 注意：如果同时有 setup 和 beforeCreate
        // 实际执行顺序是 setup → beforeCreate → created
        // 因为 Vue 3 中 setup 会在 Options 处理之前执行
    },

    created() {
        console.log("2. created");
        // 此时可以通过 this 访问 setup 返回的属性
        console.log("   this.count:", this.count); // 0
    },

    mounted() {
        console.log("5. mounted（Options 版本）");
    },
};

// 实际执行顺序：
// 1. setup 执行
// 0. beforeCreate
// 2. created
// 3. onBeforeMount
// 4. onMounted
// 5. mounted
```

### 内部原理

#### setup 在组件初始化中的位置

```
Vue 3 组件初始化流程：

setupComponent(instance) {
    // 1. 初始化 props 和 slots
    initProps(instance, rawProps);
    initSlots(instance, children);

    // 2. 调用 setup 函数（如果存在）
    if (setup) {
        const setupResult = setup(
            shallowReadonly(instance.props),
            { attrs, slots, emit, expose }
        );
        handleSetupResult(instance, setupResult);
    }

    // 3. 处理 Options API（如果存在）
    // → 初始化 beforeCreate 钩子
    // → 初始化 data、computed、watch、methods
    // → 初始化 created 钩子
    finishComponentSetup(instance);
}

// setup 在 Options 之前执行
// 所以 setup 中不能访问 Options 的内容
// 但 Options 中可以访问 setup 的返回值
```

### 与相关API的对比

| 执行阶段 | 可访问 | 不可访问 |
|---------|-------|---------|
| setup | props、注入的数据 | this、data、computed、methods |
| beforeCreate | setup 返回值 | data、computed（尚未初始化） |
| created | 所有选项 | DOM（尚未挂载） |
| mounted | 所有选项 + DOM | - |

### 适用场景

- **初始化响应式状态：** 在 setup 中声明 ref/reactive
- **注册生命周期钩子：** onMounted 等会在正确时机执行
- **逻辑组织：** 将相关逻辑集中在 setup 中

### 常见问题

#### setup 和 Options API 混用时的执行顺序

**解决方案：**

```javascript
export default {
    setup() {
        const setupData = ref("来自 setup");
        return { setupData };
    },

    data() {
        return {
            optionsData: "来自 data",
            // 可以访问 setup 返回的属性
            combined: this.setupData + " + data",
        };
    },

    created() {
        // 两者都可以通过 this 访问
        console.log(this.setupData);   // "来自 setup"
        console.log(this.optionsData); // "来自 data"
    },
};
```

### 注意事项

- setup 在 props 初始化后、Options 处理前执行
- setup 中不能使用 this
- setup 返回值在 Options API 初始化前就已设置
- Options API 中可以通过 this 访问 setup 返回的属性
- setup 中注册的生命周期钩子会在对应阶段执行
- SSR 环境中 setup 在服务端执行

### 总结

setup 在组件创建阶段执行，时机在 props 初始化之后、Options API 处理之前。setup 中可以访问 props 但没有 this。注册的生命周期钩子会在对应阶段执行。setup 的返回值先于 Options 初始化设置，所以 Options API 可以通过 this 访问 setup 返回的属性。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### setup函数的this上下文(未定义)

### 概念说明

在 setup 函数内部，`this` 是 `undefined`，不指向组件实例。这是 Vue 3 Composition API 的设计决策——setup 在组件实例完全创建之前执行，此时组件实例上的 data、computed、methods 等选项尚未初始化，提供一个不完整的 this 反而容易引起误解和错误。

因此，Composition API 采用了完全不同的模式：不依赖 this，而是通过导入的函数（ref、reactive、computed、watch 等）和 setup 的参数（props、context）来组织逻辑。这种设计带来了更好的类型推导、更容易的逻辑复用（composable）和更清晰的依赖关系。

### 基本示例

```javascript
// 示例说明：setup 中 this 的行为

import { ref, computed } from "vue";

export default {
    props: {
        initialValue: Number,
    },

    data() {
        return { optionsData: "hello" };
    },

    setup(props, { emit }) {
        // ===== this 是 undefined =====
        console.log(this); // undefined（严格模式下）

        // 错误：不能通过 this 访问任何东西
        // console.log(this.initialValue); // TypeError
        // console.log(this.optionsData);  // TypeError
        // this.$emit("change");           // TypeError

        // 正确：通过 setup 参数访问 props
        console.log(props.initialValue);

        // 正确：通过 context 参数触发事件
        function handleChange(value) {
            emit("change", value);
        }

        // 正确：直接声明响应式状态
        const count = ref(0);
        const double = computed(() => count.value * 2);

        function increment() {
            count.value++;
            handleChange(count.value);
        }

        return { count, double, increment };
    },
};
```

### 内部原理

#### 为什么 setup 中 this 是 undefined

```
设计原因：

1. 执行时机问题
   → setup 在组件实例初始化之前调用
   → 此时 data/computed/methods 还未创建
   → 即使提供 this，也是不完整的

2. 避免歧义
   → setup 返回值和 Options API 可能有同名属性
   → 如果有 this，到底访问哪个？
   → 不提供 this 就没有这个问题

3. 更好的代码复用
   → 不依赖 this → 函数可以独立提取
   → composable 函数不需要绑定组件实例
   → 测试更简单（不需要模拟组件上下文）

4. TypeScript 友好
   → this 的类型推导复杂且容易出错
   → 直接使用变量，类型推导简单直接
```

### 与相关API的对比

| 对比维度 | Options API | Composition API (setup) |
|----------|------------|----------------------|
| this | 组件实例 | undefined |
| 状态访问 | this.count | count.value |
| props 访问 | this.propName | props.propName |
| 事件触发 | this.$emit() | emit()（context 参数） |
| 方法定义 | methods: { fn() {} } | const fn = () => {} |

### 适用场景

- **所有 Composition API 代码：** setup / script setup 中的逻辑
- **Composable 函数：** 不依赖 this 的可复用逻辑

### 常见问题

#### 从 Options API 迁移到 setup 的 this 替换

**解决方案：**

```javascript
// Options API 写法
export default {
    data() { return { count: 0 } },
    props: { msg: String },
    computed: {
        double() { return this.count * 2; }
    },
    methods: {
        increment() {
            this.count++;
            this.$emit("change", this.count);
        }
    },
    mounted() {
        console.log(this.$el);
        console.log(this.$refs.input);
    }
};

// Composition API 等价写法
import { ref, computed, onMounted, useTemplateRef } from "vue";

export default {
    props: { msg: String },
    emits: ["change"],
    setup(props, { emit }) {
        const count = ref(0);                       // this.count → count.value
        const double = computed(() => count.value * 2); // this.double → double.value
        const inputRef = useTemplateRef("input");   // this.$refs.input

        function increment() {
            count.value++;                           // this.count++ → count.value++
            emit("change", count.value);             // this.$emit → emit
        }

        onMounted(() => {
            // this.$el 不再需要，用 ref 替代
            console.log(inputRef.value);
        });

        return { count, double, increment, inputRef };
    },
};
```

### 注意事项

- setup 中 this 是 undefined，不能用于任何访问
- 通过 props 参数访问 props，通过 context.emit 触发事件
- 不依赖 this 让代码更容易提取为 composable
- script setup 语法糖中同样没有 this
- 如果混用 Options API，Options 中的 this 仍然正常工作
- TypeScript 中不需要为 this 做类型声明

### 总结

setup 中 this 是 undefined，这是刻意的设计。通过 setup 参数（props、context）和导入的 API 函数来替代 this 的所有功能。这种设计让代码更容易复用、类型推导更准确、逻辑提取更方便。从 Options API 迁移时，需要将 this.xxx 替换为对应的 ref/reactive 变量和 context 方法。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### script setup语法糖的编译转换

### 概念说明

`<script setup>` 是 Vue 3.2 引入的编译时语法糖，它简化了 Composition API 的使用。在 `<script setup>` 中编写的代码会被编译器转换为组件的 `setup()` 函数内容。顶层声明的变量、函数、导入的组件都会自动暴露给模板，不需要手动 return。

编译器在编译阶段做了大量工作：将顶层绑定收集并暴露给模板渲染上下文、将 defineProps/defineEmits 等编译器宏转换为对应的运行时代码、将导入的组件自动注册等。这些都是编译时的转换，不增加运行时开销。

### 基本示例

```vue
<!-- 示例说明：script setup 的写法及其编译产物 -->

<!-- ===== 开发者写的代码 ===== -->
<script setup>
import { ref, computed } from "vue";
import MyButton from "./MyButton.vue";

// 编译器宏：声明 props
const props = defineProps({
    title: String,
});

// 编译器宏：声明 emits
const emit = defineEmits(["submit"]);

// 响应式状态
const count = ref(0);

// 计算属性
const double = computed(() => count.value * 2);

// 方法
function increment() {
    count.value++;
    emit("submit", count.value);
}
</script>

<template>
    <h1>{{ title }}</h1>
    <p>{{ count }} × 2 = {{ double }}</p>
    <MyButton @click="increment">+1</MyButton>
</template>
```

```javascript
// ===== 编译器转换后的等价代码（简化） =====
import { ref, computed, defineComponent } from "vue";
import MyButton from "./MyButton.vue";

export default defineComponent({
    props: {
        title: String,
    },
    emits: ["submit"],
    setup(__props, { emit, expose }) {
        // expose() 默认不暴露任何东西（除非用 defineExpose）
        expose();

        const props = __props;
        const count = ref(0);
        const double = computed(() => count.value * 2);

        function increment() {
            count.value++;
            emit("submit", count.value);
        }

        // 编译器自动生成的返回值
        return {
            props,
            count,
            double,
            increment,
            MyButton, // 导入的组件也自动暴露
        };
    },
});
```

### 内部原理

#### 编译器的转换步骤

```
<script setup> 编译流程：

1. 解析阶段
   → 解析 <script setup> 中的 JavaScript/TypeScript
   → 识别顶层声明（变量、函数、类等）
   → 识别 import 语句
   → 识别编译器宏（defineProps、defineEmits 等）

2. 转换阶段
   → defineProps → 提取为组件的 props 选项
   → defineEmits → 提取为组件的 emits 选项
   → defineExpose → 转换为 expose() 调用
   → import 的 .vue 文件 → 自动注册为组件

3. 生成阶段
   → 生成 setup 函数
   → 所有顶层绑定作为 return 对象的属性
   → 编译器宏被移除（不在运行时存在）
   → 包装为 export default defineComponent({...})

编译器宏的特点：
  → 不需要 import（编译器内置识别）
  → 编译后被转换为其他代码
  → 只能在 <script setup> 中使用
  → TypeScript 类型参数直接支持
```

### 与相关API的对比

| 对比维度 | script setup | 显式 setup() |
|----------|-------------|-------------|
| 代码量 | 少（无 return） | 多（需要 return） |
| 组件注册 | 自动 | 需要 components 选项 |
| Props 声明 | defineProps() | setup 参数 + props 选项 |
| 编译器宏 | 支持 | 不支持 |
| 性能 | 编译优化更多 | 稍差 |

### 适用场景

- **新项目：** Vue 3 新项目推荐使用 script setup
- **SFC 组件：** 所有单文件组件
- **TypeScript：** 更好的类型推导支持

### 常见问题

#### script setup 如何与普通 script 共存

**解决方案：**

```vue
<!-- 普通 script：用于声明不属于 setup 的选项 -->
<script>
export default {
    name: "MyComponent",        // 组件名
    inheritAttrs: false,         // 关闭属性继承
    customOptions: {},           // 自定义选项
};
</script>

<!-- script setup：Composition API 逻辑 -->
<script setup>
import { ref } from "vue";

const count = ref(0);
</script>

<!-- 两个 script 块会被合并 -->
```

### 注意事项

- script setup 是编译时语法糖，不增加运行时开销
- 顶层声明自动暴露给模板，不需要 return
- 编译器宏（defineProps 等）不需要 import
- 导入的 .vue 组件自动注册，不需要 components 选项
- script setup 默认不暴露组件实例（需要 defineExpose）
- 可以和普通 `<script>` 共存

### 总结

`<script setup>` 是编译时语法糖，将顶层代码转换为 setup 函数。顶层声明自动暴露给模板，导入的组件自动注册，编译器宏（defineProps/defineEmits 等）被转换为运行时代码。相比显式 setup 函数，代码更简洁、编译优化更多、TypeScript 支持更好。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### script setup的顶层级绑定暴露

### 概念说明

在 `<script setup>` 中，所有顶层声明的变量、函数、import 导入的值都会自动暴露给模板使用，无需手动 return。编译器会分析所有顶层绑定，自动将它们包含在 setup 函数的返回值中。

"顶层"指的是直接在 `<script setup>` 根作用域中声明的绑定，不包括函数内部的局部变量。具体包括：const/let/var 声明的变量、function 声明的函数、import 导入的值（包括组件、工具函数、常量等）。

这个特性由编译器在编译阶段完成，运行时并无额外开销。编译器会收集所有顶层标识符并生成对应的 return 语句。

### 基本示例

```vue
<script setup>
// 示例说明：各种顶层绑定的自动暴露

// import 导入 → 自动暴露给模板
import { ref, computed } from "vue";
import { formatDate } from "@/utils/date";
import MyButton from "./MyButton.vue"; // 组件也自动注册
import IconStar from "./icons/IconStar.vue";

// const 声明 → 自动暴露
const API_URL = "/api/data";
const count = ref(0);
const message = ref("你好");

// computed → 自动暴露
const double = computed(() => count.value * 2);

// function 声明 → 自动暴露
function increment() {
    count.value++;
}

// 箭头函数 → 自动暴露
const decrement = () => {
    count.value--;
};

// class 声明 → 自动暴露
class UserModel {
    constructor(name) {
        this.name = name;
    }
}

// 以上所有顶层绑定在模板中直接使用
</script>

<template>
    <!-- ref 自动解包 -->
    <p>{{ count }} × 2 = {{ double }}</p>
    <p>{{ message }}</p>

    <!-- 函数直接调用 -->
    <MyButton @click="increment">+1</MyButton>
    <MyButton @click="decrement">-1</MyButton>

    <!-- 导入的工具函数 -->
    <p>{{ formatDate(new Date()) }}</p>

    <!-- 导入的组件 -->
    <IconStar />

    <!-- 常量 -->
    <a :href="API_URL">API</a>
</template>
```

### 内部原理

#### 编译器如何收集顶层绑定

```
编译器的绑定收集流程：

1. 解析 <script setup> 的 AST

2. 遍历顶层语句，收集绑定：
   → VariableDeclaration: const/let/var 声明的变量名
   → FunctionDeclaration: function 声明的函数名
   → ClassDeclaration: class 声明的类名
   → ImportDeclaration: import 导入的标识符
   → 编译器宏返回值: defineProps() 等

3. 每个绑定记录类型：
   → setup-const: const 声明（可能是 ref/reactive）
   → setup-let: let 声明（可变绑定）
   → setup-ref: ref() 调用的结果
   → imported: import 导入的值

4. 生成 return 语句：
   return { count, message, double, increment, decrement, ... }

5. 模板编译时使用绑定信息：
   → ref 类型自动加 .value（模板编译优化）
   → import 的组件自动识别为组件标签
```

### 与相关API的对比

| 绑定类型 | 模板中使用方式 | 编译处理 |
|---------|-------------|---------|
| ref | `&lbrace;&lbrace; count &rbrace;&rbrace;` | 自动 .value 解包 |
| reactive | `&lbrace;&lbrace; state.name &rbrace;&rbrace;` | 直接访问属性 |
| computed | `&lbrace;&lbrace; double &rbrace;&rbrace;` | 自动 .value 解包 |
| 函数 | `@click="fn"` | 直接引用 |
| import 组件 | `<MyComp />` | 自动注册 |
| import 函数 | `&lbrace;&lbrace; format() &rbrace;&rbrace;` | 直接调用 |
| 常量 | `&lbrace;&lbrace; API_URL &rbrace;&rbrace;` | 直接引用 |

### 适用场景

- **简化模板引用：** 不需要手动 return 暴露变量
- **自动组件注册：** import 的组件直接在模板中使用
- **工具函数：** import 的工具函数模板中直接调用

### 常见问题

#### 哪些绑定不会暴露给模板

**解决方案：**

```vue
<script setup>
import { ref } from "vue";

const count = ref(0); // 暴露

function outer() {
    const inner = 10; // 不暴露（不是顶层）
    return inner;
}

// 解构的变量会暴露
const { x, y } = { x: 1, y: 2 }; // x 和 y 都暴露

// 类型导入不会暴露（TypeScript）
// import type { UserType } from './types'; // 不暴露
</script>
```

### 注意事项

- 只有顶层声明会自动暴露，函数内部的变量不会
- ref 在模板中自动解包，不需要 .value
- import 的 .vue 文件自动注册为组件
- TypeScript 的 type import 不会暴露（编译时被移除）
- 顶层绑定暴露是编译时行为，没有运行时开销
- 默认不暴露给父组件的 ref 访问（需要 defineExpose）

### 总结

script setup 中所有顶层声明（变量、函数、import）自动暴露给模板。编译器在编译阶段收集所有顶层绑定并生成 return 语句。ref 在模板中自动解包，import 的组件自动注册。这是编译时优化，不增加运行时开销。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### script setup的组件自动注册

### 概念说明

在 `<script setup>` 中，通过 import 导入的 `.vue` 组件可以直接在模板中使用，不需要通过 `components` 选项手动注册。编译器会识别导入的组件，自动将其注册到当前组件的渲染上下文中。

这个自动注册机制是编译时行为：编译器检测到 import 的标识符在模板中作为组件标签使用时，会自动生成对应的组件注册代码。这减少了样板代码，也避免了"导入了组件但忘记注册"的常见错误。

组件名在模板中可以使用 PascalCase 或 kebab-case 形式。编译器会自动匹配 import 的标识符名称。

### 基本示例

```vue
<script setup>
// 示例说明：组件自动注册的用法

// 导入组件 → 自动注册，直接在模板中使用
import MyButton from "./components/MyButton.vue";
import UserCard from "./components/UserCard.vue";
import TheHeader from "./components/TheHeader.vue";

// 动态组件也可以直接使用
import FooComponent from "./Foo.vue";
import BarComponent from "./Bar.vue";

import { ref } from "vue";

const currentTab = ref("foo");
const tabs = { foo: FooComponent, bar: BarComponent };
</script>

<template>
    <!-- PascalCase 形式 -->
    <TheHeader />

    <!-- kebab-case 形式（同样有效） -->
    <my-button @click="handleClick">点击</my-button>

    <!-- 正常使用 props 和 events -->
    <UserCard name="张三" :age="25" @select="onSelect" />

    <!-- 动态组件 -->
    <component :is="tabs[currentTab]" />
</template>
```

```javascript
// 编译后的等价代码（简化）
import MyButton from "./components/MyButton.vue";
import UserCard from "./components/UserCard.vue";
import TheHeader from "./components/TheHeader.vue";

export default {
    // 编译器自动生成组件注册
    setup() {
        // ...
        return {
            MyButton,   // 暴露给模板渲染上下文
            UserCard,
            TheHeader,
        };
    },
};
// 模板编译时直接引用这些组件，无需 components 选项
```

### 内部原理

#### 编译器的组件识别逻辑

```
编译器识别组件的流程：

1. 收集 <script setup> 中的 import 语句
   → 记录所有 import 的标识符和来源

2. 解析模板中的标签名
   → <MyButton> → 查找绑定 "MyButton"
   → <my-button> → 转换为 "MyButton" 再查找
   → <user-card> → 转换为 "UserCard" 再查找

3. 匹配规则
   → 模板标签名与 import 标识符匹配
   → 支持 PascalCase 和 kebab-case 互转
   → 匹配成功 → 作为组件处理
   → 匹配失败 → 作为原生 HTML 元素

4. 代码生成
   → 组件引用直接使用 import 的变量
   → 不生成 components 注册代码
   → 渲染函数中：_resolveComponent 被替换为直接引用
```

### 与相关API的对比

| 注册方式 | 写法 | 适用场景 |
|---------|------|---------|
| script setup 自动注册 | import + 直接使用 | SFC 组件 |
| components 选项 | `components: { MyComp }` | Options API |
| app.component | `app.component('name', Comp)` | 全局注册 |

### 适用场景

- **SFC 开发：** 所有使用 script setup 的单文件组件
- **按需引入：** 只导入使用的组件（Tree Shaking 友好）
- **大型项目：** 减少组件注册的样板代码

### 常见问题

#### 动态组件和自动注册

**解决方案：**

```vue
<script setup>
import Foo from "./Foo.vue";
import Bar from "./Bar.vue";

import { shallowRef } from "vue";

// 动态切换组件
const currentComponent = shallowRef(Foo);

function switchToBar() {
    currentComponent.value = Bar;
}
</script>

<template>
    <!-- 动态组件：通过 :is 绑定 -->
    <component :is="currentComponent" />
    <button @click="switchToBar">切换到 Bar</button>
</template>
```

### 注意事项

- 只有在模板中使用的 import 组件才会被注册
- 支持 PascalCase 和 kebab-case 两种模板标签写法
- 自动注册是局部注册，不影响其他组件
- 比全局注册更利于 Tree Shaking
- 动态组件使用 `<component :is>` 配合 import 的组件
- 递归组件可以通过组件名自引用

### 总结

script setup 中 import 的 Vue 组件自动注册，可以直接在模板中使用。编译器自动识别并匹配模板标签和 import 标识符，支持 PascalCase 和 kebab-case。这减少了样板代码，避免了忘记注册的问题，同时保持局部注册利于 Tree Shaking。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### defineProps的编译器宏与类型推导

### 概念说明

`defineProps` 是 `<script setup>` 中用于声明组件 props 的编译器宏。它不需要导入，编译器会自动识别并将其转换为组件的 props 选项。defineProps 支持两种声明方式：运行时声明（传入对象）和类型声明（传入 TypeScript 泛型参数）。

运行时声明与 Options API 的 props 选项写法一致，支持 type、required、default、validator 等配置。类型声明利用 TypeScript 接口或类型字面量，编译器会自动推导出运行时的 props 定义，提供更好的类型安全和开发体验。

defineProps 返回一个响应式的 props 对象，可以在 script setup 中直接使用。

### 基本示例

```vue
<script setup lang="ts">
// 示例说明：defineProps 的两种声明方式

// ===== 方式1：运行时声明（JavaScript/TypeScript 通用）=====
// const props = defineProps({
//     title: {
//         type: String,
//         required: true,
//     },
//     count: {
//         type: Number,
//         default: 0,
//     },
//     items: {
//         type: Array as PropType<string[]>,
//         default: () => [],
//     },
// });

// ===== 方式2：类型声明（TypeScript 推荐）=====
interface Props {
    title: string;          // 必填（没有 ? 号）
    count?: number;         // 可选
    items?: string[];       // 可选
    user?: {
        name: string;
        age: number;
    };
    onSubmit?: (data: any) => void; // 函数类型
}

// 编译器从类型中推导出 props 定义
const props = defineProps<Props>();

// 使用 props
console.log(props.title);       // string
console.log(props.count);       // number | undefined
console.log(props.items);       // string[] | undefined

// props 是响应式的，可以在 watch/computed 中使用
import { computed, watch } from "vue";

const upperTitle = computed(() => props.title.toUpperCase());

watch(() => props.count, (newVal) => {
    console.log("count 变化:", newVal);
});
</script>

<template>
    <h1>{{ title }}</h1>
    <p>{{ count }}</p>
</template>
```

### 内部原理

#### 编译器宏的转换过程

```
defineProps 的编译转换：

类型声明方式：
  defineProps<{ title: string; count?: number }>()

编译器提取类型信息：
  → title: string → type: String, required: true
  → count?: number → type: Number, required: false

转换为运行时代码：
  export default {
      props: {
          title: { type: String, required: true },
          count: { type: Number, required: false },
      },
      setup(__props) {
          const props = __props;
          // ...
      }
  }

类型到运行时的映射：
  string → String
  number → Number
  boolean → Boolean
  string[] → Array
  object → Object
  Function → Function
  自定义接口 → Object
```

### 与相关API的对比

| 声明方式 | 类型安全 | 默认值 | 验证器 |
|---------|---------|-------|-------|
| 运行时声明 | 弱 | 支持 | 支持 |
| 类型声明 | 强 | 需要 withDefaults | 不支持（需运行时） |
| 混合使用 | 不允许 | - | - |

### 适用场景

- **TypeScript 项目：** 类型声明方式提供完整类型推导
- **JavaScript 项目：** 运行时声明方式
- **复杂类型：** 接口继承、联合类型等

### 常见问题

#### 类型声明和运行时声明不能混用

**解决方案：**

```vue
<script setup lang="ts">
// 错误：不能同时传泛型和参数
// defineProps<{ title: string }>({ title: { default: '' } });

// 正确1：纯类型声明 + withDefaults
const props = withDefaults(defineProps<{
    title: string;
    count?: number;
}>(), {
    count: 0,  // 默认值
});

// 正确2：纯运行时声明
// const props = defineProps({
//     title: { type: String, required: true },
//     count: { type: Number, default: 0 },
// });
</script>
```

### 注意事项

- defineProps 是编译器宏，不需要 import
- 只能在 `<script setup>` 中使用
- 类型声明和运行时声明不能混用
- 返回的 props 对象是响应式的但不能解构（解构丢失响应性）
- 需要解构时使用 `toRefs(props)` 或 Vue 3.5+ 的响应式解构
- 类型声明方式的默认值需要通过 withDefaults 设置

### 总结

defineProps 是 script setup 中声明 props 的编译器宏，支持运行时声明和类型声明两种方式。类型声明利用 TypeScript 泛型提供强类型推导，编译器自动将类型映射为运行时 props 定义。返回的 props 对象是响应式的。类型声明的默认值需要通过 withDefaults 设置。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### defineProps的withDefaults默认值

### 概念说明

当使用 TypeScript 类型声明方式定义 props 时，无法直接在类型中指定默认值。`withDefaults` 是配合 `defineProps` 的类型声明方式使用的编译器辅助函数，用于为 props 提供默认值。

withDefaults 接收两个参数：第一个是 `defineProps<T>()` 的调用，第二个是包含默认值的对象。对于对象和数组类型的 props，withDefaults 会自动将默认值包装为工厂函数（开发者不需要手动写工厂函数）。

withDefaults 返回的 props 对象中，有默认值的可选属性在类型上不再是 `T | undefined`，而是确定的 `T` 类型，提供了更好的类型推导。

### 基本示例

```vue
<script setup lang="ts">
// 示例说明：withDefaults 的使用

interface Props {
    // 必填属性（没有 ?）
    title: string;

    // 可选属性（有 ?）
    count?: number;
    message?: string;
    tags?: string[];
    config?: {
        theme: string;
        lang: string;
    };
    disabled?: boolean;
    formatter?: (value: number) => string;
}

// withDefaults 为可选属性提供默认值
const props = withDefaults(defineProps<Props>(), {
    // 基本类型：直接写值
    count: 0,
    message: "默认消息",
    disabled: false,

    // 数组类型：直接写值（编译器自动包装为工厂函数）
    tags: () => ["默认标签"],

    // 对象类型：同样直接写或用工厂函数
    config: () => ({
        theme: "light",
        lang: "zh",
    }),

    // 函数类型
    formatter: (value: number) => `${value}元`,
});

// 类型推导：
// props.title → string（必填，无默认值）
// props.count → number（有默认值，不再是 number | undefined）
// props.tags → string[]（有默认值，不再是 string[] | undefined）

console.log(props.count);     // 0（如果父组件没传）
console.log(props.tags);      // ["默认标签"]（如果父组件没传）
console.log(props.config);    // { theme: "light", lang: "zh" }
</script>

<template>
    <h1>{{ title }}</h1>
    <p>数量: {{ count }}</p>
    <p>{{ message }}</p>
    <span v-for="tag in tags" :key="tag">{{ tag }}</span>
</template>
```

### 内部原理

#### withDefaults 的编译转换

```
withDefaults 编译前：

withDefaults(defineProps<{
    title: string;
    count?: number;
    tags?: string[];
}>(), {
    count: 0,
    tags: () => ['默认'],
});

编译后：

export default {
    props: {
        title: { type: String, required: true },
        count: { type: Number, required: false, default: 0 },
        tags: {
            type: Array,
            required: false,
            default: () => ['默认'],  // 自动包装为工厂函数
        },
    },
    setup(__props) {
        // ...
    }
};

类型推导优化：
  → 没有 withDefaults 时：count 的类型是 number | undefined
  → 有 withDefaults 时：count 的类型是 number（确定有值）
```

### 与相关API的对比

| 方式 | 语法 | 类型安全 | 默认值写法 |
|------|------|---------|----------|
| 运行时声明 | `defineProps({ count: { default: 0 } })` | 弱 | 内联 |
| 类型声明 + withDefaults | `withDefaults(defineProps<T>(), {...})` | 强 | 外部对象 |
| Vue 3.5+ 响应式解构 | `const { count = 0 } = defineProps<T>()` | 强 | 解构默认值 |

### 适用场景

- **TypeScript 项目：** 使用类型声明方式定义 props 时
- **复杂默认值：** 对象、数组、函数类型的默认值
- **类型收窄：** 需要移除 undefined 联合类型时

### 常见问题

#### Vue 3.5+ 的解构默认值替代方案

**解决方案：**

```vue
<script setup lang="ts">
// Vue 3.5+ 支持 props 的响应式解构
// 可以直接在解构时指定默认值，不需要 withDefaults

const {
    title,
    count = 0,
    tags = ["默认"],
    config = { theme: "light", lang: "zh" },
} = defineProps<{
    title: string;
    count?: number;
    tags?: string[];
    config?: { theme: string; lang: string };
}>();

// 解构出来的变量是响应式的（Vue 3.5+ 编译器支持）
// 等价于 withDefaults 的效果
</script>
```

### 注意事项

- withDefaults 只能配合类型声明方式的 defineProps 使用
- 对象/数组类型的默认值推荐使用工厂函数形式
- withDefaults 返回的 props 有更精确的类型（移除 undefined）
- Vue 3.5+ 支持响应式解构默认值，可替代 withDefaults
- withDefaults 是编译时行为，不增加运行时开销

### 总结

withDefaults 为 TypeScript 类型声明方式的 defineProps 提供默认值。对象和数组类型的默认值推荐使用工厂函数。withDefaults 返回的 props 类型更精确（有默认值的属性不再是 undefined 联合类型）。Vue 3.5+ 支持响应式解构默认值作为替代方案。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### defineProps的required验证

### 概念说明

在 Vue 组件中，props 的 `required` 配置用于标记某个属性是否为必填。如果一个 prop 被标记为 `required: true`，而父组件没有传递该属性，Vue 会在开发环境中输出控制台警告。

在运行时声明方式中，通过 `required: true` 显式标记。在 TypeScript 类型声明方式中，不带 `?` 的属性自动被视为 required，带 `?` 的属性被视为可选。编译器会根据类型声明中的可选标记自动生成对应的 required 配置。

required 验证只在开发环境中执行，生产环境中会被移除以减小代码体积。

### 基本示例

```vue
<script setup lang="ts">
// 示例说明：required 的两种声明方式

// ===== 运行时声明方式 =====
// const props = defineProps({
//     // required: true → 必须传递
//     id: {
//         type: Number,
//         required: true,
//     },
//     // required: false（默认）→ 可以不传
//     title: {
//         type: String,
//         required: false,
//         default: "默认标题",
//     },
//     // 没有 required → 默认 false
//     description: String,
// });

// ===== TypeScript 类型声明方式 =====
interface Props {
    id: number;           // 没有 ? → required: true
    title?: string;       // 有 ? → required: false
    description?: string; // 有 ? → required: false
}

const props = defineProps<Props>();

// 编译器转换结果：
// props: {
//     id: { type: Number, required: true },
//     title: { type: String, required: false },
//     description: { type: String, required: false },
// }
</script>

<template>
    <div>
        <p>ID: {{ id }}</p>
        <p>{{ title }}</p>
    </div>
</template>
```

```html
<!-- 父组件使用 -->
<template>
    <!-- 正确：传递了 required 的 id -->
    <MyComponent :id="1" title="标题" />

    <!-- 警告：缺少 required 的 id -->
    <MyComponent title="标题" />
    <!-- [Vue warn]: Missing required prop: "id" -->
</template>
```

### 内部原理

#### required 验证的执行过程

```
Props 验证流程（开发环境）：

1. 组件接收 props 时遍历所有声明的 prop
2. 对每个 prop 检查：
   a. required: true 且值为 undefined
      → 输出警告："Missing required prop: xxx"
   b. type 不匹配
      → 输出警告："Invalid prop: type check failed"
   c. validator 返回 false
      → 输出警告："Invalid prop: custom validator check failed"

3. 检查顺序：required → type → validator

TypeScript 类型到 required 的映射：
  → 非可选属性（无 ?）→ required: true
  → 可选属性（有 ?）→ required: false
  → 有 default 的属性 → required 自动变为 false
```

### 与相关API的对比

| 声明方式 | required 写法 | 示例 |
|---------|-------------|------|
| 运行时 | `required: true` | `{ type: String, required: true }` |
| 类型声明 | 不加 `?` | `title: string` |
| 类型声明（可选） | 加 `?` | `title?: string` |

### 适用场景

- **核心数据：** 组件功能所必需的属性（如 id）
- **组件接口约束：** 确保调用者传递必要的数据
- **团队协作：** 明确组件的必传参数

### 常见问题

#### required 和 default 同时存在

**解决方案：**

```vue
<script setup>
// required: true 和 default 同时存在是多余的
// 如果有 default，即使不传也有值，required 没有意义

// 不推荐
const props = defineProps({
    title: {
        type: String,
        required: true,
        default: "默认",  // 有默认值就不需要 required
    },
});

// 推荐：二选一
// 要么 required 不给 default
// 要么给 default 不设 required
</script>
```

### 注意事项

- required 验证只在开发环境执行，生产环境移除
- TypeScript 类型中不带 `?` 的属性自动为 required
- required 和 default 不应同时使用（逻辑矛盾）
- 传递 undefined 等同于不传（会触发 required 警告）
- 传递 null 不会触发 required 警告（null 是一个有效的值）
- Boolean 类型的 props 不传时默认为 false，不触发 required 警告

### 总结

required 标记 prop 是否为必填。运行时声明通过 `required: true` 设置，TypeScript 类型声明通过是否有 `?` 标记自动推导。required 验证只在开发环境执行。不应同时设置 required 和 default。传递 undefined 视为未传递，null 视为有效值。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### defineProps的type与validator校验

### 概念说明

Props 的 `type` 配置用于检查传入值的数据类型，`validator` 配置用于自定义验证逻辑。type 支持 JavaScript 原生构造函数（String、Number、Boolean、Array、Object、Date、Function、Symbol）以及自定义类（通过 instanceof 检查）。validator 是一个接收 prop 值作为参数的函数，返回布尔值表示验证是否通过。

type 可以是单个构造函数，也可以是构造函数数组（表示接受多种类型）。validator 可以做任意自定义校验，比如检查值是否在允许的枚举列表中、是否满足特定格式等。两者都只在开发环境中执行。

在 TypeScript 类型声明方式中，type 从类型信息自动推导。但 validator 无法通过类型表达，如果需要自定义验证，要么使用运行时声明方式，要么在 setup 中手动添加验证逻辑。

### 基本示例

```vue
<script setup>
// 示例说明：type 和 validator 的各种用法

// 自定义类
class User {
    constructor(name, age) {
        this.name = name;
        this.age = age;
    }
}

const props = defineProps({
    // 单个类型
    title: {
        type: String,
    },

    // 多种类型
    value: {
        type: [String, Number],
    },

    // 自定义类（通过 instanceof 检查）
    user: {
        type: User,
    },

    // validator：枚举值校验
    status: {
        type: String,
        validator(value) {
            // 只允许特定值
            return ["pending", "active", "disabled"].includes(value);
        },
    },

    // validator：范围校验
    score: {
        type: Number,
        validator(value) {
            return value >= 0 && value <= 100;
        },
    },

    // validator：格式校验
    email: {
        type: String,
        validator(value) {
            // 简单的邮箱格式检查
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        },
    },

    // validator：复杂对象结构校验
    config: {
        type: Object,
        validator(value) {
            // 检查必要的字段是否存在
            return (
                typeof value.theme === "string" &&
                typeof value.lang === "string"
            );
        },
    },
});
</script>
```

### 内部原理

#### 类型检查的实现

```
type 检查的执行逻辑：

function assertType(value, type) {
    if (type === String) {
        return typeof value === 'string';
    }
    if (type === Number) {
        return typeof value === 'number';
    }
    if (type === Boolean) {
        return typeof value === 'boolean';
    }
    if (type === Array) {
        return Array.isArray(value);
    }
    if (type === Object) {
        return typeof value === 'object' && value !== null;
    }
    if (type === Function) {
        return typeof value === 'function';
    }
    // 自定义类：instanceof 检查
    return value instanceof type;
}

验证执行顺序：
1. 检查 required（是否必填）
2. 检查 type（类型是否匹配）
   → 多类型时只要匹配其中一个就通过
3. 执行 validator（自定义验证）
   → 返回 false 时输出警告
```

### 与相关API的对比

| 校验方式 | 作用 | 执行环境 | 示例 |
|---------|------|---------|------|
| type | 检查数据类型 | 开发环境 | `type: String` |
| required | 检查是否传值 | 开发环境 | `required: true` |
| validator | 自定义验证逻辑 | 开发环境 | `validator(v) { return v > 0 }` |
| TypeScript 类型 | 编译时类型检查 | 编译时 | `title: string` |

### 适用场景

- **枚举约束：** 限制 prop 值在特定列表中
- **范围约束：** 限制数值在合法范围内
- **格式约束：** 验证邮箱、URL 等格式
- **结构约束：** 验证对象是否包含必要字段

### 常见问题

#### TypeScript 类型声明方式如何添加 validator

**解决方案：**

```vue
<script setup lang="ts">
// TypeScript 类型声明无法直接添加 validator
// 方式1：改用运行时声明
const props = defineProps({
    status: {
        type: String as () => "pending" | "active",
        validator: (v: string) => ["pending", "active"].includes(v),
    },
});

// 方式2：类型声明 + 手动验证
// const props = defineProps<{ status: 'pending' | 'active' }>();
// TypeScript 在编译时检查类型
// 但运行时不会验证（比如动态数据可能不符合类型）
</script>
```

### 注意事项

- type 和 validator 验证只在开发环境执行
- type 为数组时，匹配任意一个类型即通过
- 自定义类通过 instanceof 检查
- validator 函数中不能访问组件实例（在实例创建前执行）
- TypeScript 类型声明方式不支持 validator
- null 和 undefined 会跳过类型检查（除非 required: true）

### 总结

type 通过构造函数检查 prop 的数据类型，支持原生类型和自定义类。validator 提供自定义验证逻辑，适合枚举、范围、格式等约束。两者都只在开发环境执行。TypeScript 类型声明方式自动推导 type 但不支持 validator，需要运行时验证时应使用运行时声明方式。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### defineEmits的编译器宏与事件定义

### 概念说明

`defineEmits` 是 `<script setup>` 中用于声明组件会触发的自定义事件的编译器宏。它不需要导入，编译器会自动识别并将其转换为组件的 emits 选项。和 defineProps 类似，defineEmits 也支持运行时声明和 TypeScript 类型声明两种方式。

defineEmits 返回一个 emit 函数，在 script setup 中通过调用这个函数来触发事件。这个 emit 函数等价于 Options API 中的 `this.$emit`。

声明 emits 的重要性在于：一是让组件的事件接口清晰可见；二是避免与原生 DOM 事件冲突（比如 click）；三是在 TypeScript 中提供事件参数的类型检查。

### 基本示例

```vue
<script setup lang="ts">
// 示例说明：defineEmits 的两种声明方式

// ===== 方式1：运行时声明 =====
// const emit = defineEmits(['submit', 'cancel', 'update']);

// ===== 方式2：运行时声明（带验证） =====
// const emit = defineEmits({
//     submit: (payload: { email: string }) => {
//         return !!payload.email; // 验证参数
//     },
//     cancel: null, // 不验证
// });

// ===== 方式3：TypeScript 类型声明（推荐） =====
const emit = defineEmits<{
    // 事件名: 参数列表
    submit: [payload: { email: string; password: string }];
    cancel: [];
    update: [id: number, value: string];
    // Vue 3.3+ 简写语法
}>();

// 使用 emit 触发事件
function handleSubmit() {
    emit("submit", { email: "test@test.com", password: "123456" });
}

function handleCancel() {
    emit("cancel");
}

function handleUpdate(id: number) {
    emit("update", id, "新值");
}
</script>

<template>
    <form @submit.prevent="handleSubmit">
        <button type="submit">提交</button>
        <button type="button" @click="handleCancel">取消</button>
    </form>
</template>
```

```html
<!-- 父组件监听事件 -->
<template>
    <MyForm
        @submit="onSubmit"
        @cancel="onCancel"
        @update="onUpdate"
    />
</template>
```

### 内部原理

#### defineEmits 的编译转换

```
defineEmits 编译前（TypeScript 类型声明）：

const emit = defineEmits<{
    submit: [payload: { email: string }];
    cancel: [];
}>();

编译后：

export default {
    emits: ['submit', 'cancel'],
    setup(__props, { emit }) {
        // emit 就是 context.emit
        // 类型检查在编译时完成（TypeScript）
        // 运行时的事件验证在开发环境执行
    }
};

emit 函数的调用过程：
  emit('submit', payload)
  → instance.emit('submit', payload)
  → 查找父组件的 onSubmit 或 @submit 监听器
  → 执行监听器回调
```

### 与相关API的对比

| 声明方式 | 语法 | 类型安全 |
|---------|------|---------|
| 运行时数组 | `defineEmits(['submit'])` | 无 |
| 运行时对象 | `defineEmits({ submit: validator })` | 运行时验证 |
| TS 类型声明 | `defineEmits<{ submit: [...] }>()` | 编译时类型检查 |

### 适用场景

- **子传父通信：** 子组件向父组件发送消息
- **表单提交：** 提交事件携带表单数据
- **状态同步：** 通知父组件更新数据
- **用户交互：** 传递用户操作事件

### 常见问题

#### Vue 3.3 之前的类型声明语法

**解决方案：**

```vue
<script setup lang="ts">
// Vue 3.3 之前使用函数签名形式
const emit = defineEmits<{
    (e: "submit", payload: { email: string }): void;
    (e: "cancel"): void;
    (e: "update", id: number, value: string): void;
}>();

// Vue 3.3+ 使用更简洁的元组语法
const emit = defineEmits<{
    submit: [payload: { email: string }];
    cancel: [];
    update: [id: number, value: string];
}>();

// 两种写法效果相同，3.3+ 的写法更简洁
</script>
```

### 注意事项

- defineEmits 是编译器宏，不需要 import
- 只能在 `<script setup>` 中使用
- 返回的 emit 函数等价于 this.$emit
- 声明的事件不会作为原生事件绑定到根元素
- TypeScript 类型声明提供编译时参数类型检查
- Vue 3.3+ 支持更简洁的元组类型声明语法

### 总结

defineEmits 是 script setup 中声明组件事件的编译器宏，支持运行时声明和 TypeScript 类型声明。返回的 emit 函数用于触发事件。TypeScript 类型声明提供编译时的事件名和参数类型检查。Vue 3.3+ 引入了更简洁的元组语法。声明 emits 可避免与原生事件冲突。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### defineEmits的类型安全触发

### 概念说明

当使用 TypeScript 类型声明方式定义 `defineEmits` 时，返回的 emit 函数具有完整的类型约束：调用时会检查事件名是否合法、参数类型是否正确、参数数量是否匹配。这意味着拼错事件名、传错参数类型、漏传参数等问题都能在编译时被捕获，而不是等到运行时才发现。

这种类型安全贯穿整个事件通信链路：子组件的 emit 函数有类型约束，父组件监听事件时的回调参数也能获得正确的类型推导。配合 IDE 的智能提示，开发者可以清楚地知道每个事件需要传递什么参数。

### 基本示例

```vue
<script setup lang="ts">
// 示例说明：类型安全的事件触发

// 使用 TypeScript 类型声明定义事件
const emit = defineEmits<{
    // 无参数事件
    close: [];
    // 单参数事件
    select: [id: number];
    // 多参数事件
    update: [field: string, value: string | number];
    // 复杂参数事件
    submit: [data: { name: string; email: string; age: number }];
}>();

// ===== 正确的调用 =====
emit("close");                              // 无参数
emit("select", 42);                         // number 参数
emit("update", "name", "张三");              // string, string
emit("update", "age", 25);                  // string, number
emit("submit", {                            // 对象参数
    name: "张三",
    email: "test@test.com",
    age: 25,
});

// ===== TypeScript 编译时错误 =====
// emit("closee");              // 错误：事件名不存在
// emit("select");              // 错误：缺少参数
// emit("select", "abc");       // 错误：参数类型不匹配（期望 number）
// emit("update", "name");      // 错误：缺少第二个参数
// emit("submit", { name: 1 }); // 错误：name 应该是 string

// ===== 在模板事件处理中使用 =====
function handleClick(id: number) {
    emit("select", id); // 类型安全
}

function handleFormSubmit(formData: { name: string; email: string; age: number }) {
    emit("submit", formData); // 类型安全
}
</script>

<template>
    <button @click="handleClick(1)">选择</button>
    <button @click="emit('close')">关闭</button>
</template>
```

```vue
<!-- 父组件：事件回调也有类型推导 -->
<script setup lang="ts">
// 父组件的事件监听器参数自动获得类型
function onSelect(id: number) {
    console.log("选中 ID:", id);
}

function onUpdate(field: string, value: string | number) {
    console.log(`${field} 更新为 ${value}`);
}
</script>

<template>
    <ChildComponent
        @select="onSelect"
        @update="onUpdate"
        @close="() => console.log('关闭')"
    />
</template>
```

### 内部原理

#### 类型安全的实现机制

```
TypeScript 如何实现 emit 的类型检查：

defineEmits<{
    select: [id: number];
    update: [field: string, value: string | number];
}>()

编译器生成的 emit 函数类型：

type EmitFn = {
    (event: 'select', id: number): void;
    (event: 'update', field: string, value: string | number): void;
}

这是函数重载类型：
  → 调用 emit('select', ...) 时检查第二个参数是否为 number
  → 调用 emit('update', ...) 时检查后续参数类型
  → 调用 emit('xxx', ...) 时报错（事件名不在类型中）

IDE 支持：
  → 输入 emit(' 时提示可用事件名
  → 选择事件名后提示参数类型
  → 参数类型不匹配时红色波浪线提示
```

### 与相关API的对比

| 方式 | 事件名检查 | 参数类型检查 | 参数数量检查 |
|------|----------|-----------|-----------|
| this.$emit（JS） | 无 | 无 | 无 |
| defineEmits 数组 | 无 | 无 | 无 |
| defineEmits 类型声明 | 编译时 | 编译时 | 编译时 |

### 适用场景

- **TypeScript 项目：** 所有使用 TS 的 Vue 组件
- **大型项目：** 组件间通信复杂，需要类型保障
- **团队协作：** 明确事件接口，减少沟通成本
- **重构：** 修改事件参数时编译器自动标记所有需要修改的地方

### 常见问题

#### 事件参数类型与父组件回调参数不匹配

**解决方案：**

```vue
<!-- 子组件 -->
<script setup lang="ts">
const emit = defineEmits<{
    change: [value: number];
}>();

emit("change", 42);
</script>

<!-- 父组件 -->
<script setup lang="ts">
// 错误：参数类型不匹配
// function handleChange(value: string) { ... }

// 正确：参数类型与子组件 emit 定义一致
function handleChange(value: number) {
    console.log("值:", value);
}
</script>

<template>
    <Child @change="handleChange" />
</template>
```

### 注意事项

- 类型安全只在 TypeScript 编译时生效，运行时不检查
- Vue 3.3+ 的元组语法更简洁、类型推导更好
- emit 函数在模板中也可以直接使用（`@click="emit('close')"`）
- 父组件的事件回调参数类型会自动推导
- IDE 的智能提示依赖正确的类型声明
- 重构事件名或参数时，TypeScript 会标记所有受影响的代码

### 总结

TypeScript 类型声明方式的 defineEmits 提供编译时的事件类型安全：检查事件名、参数类型和参数数量。错误在编译阶段就能发现，不需要等到运行时。配合 IDE 的智能提示和父组件回调的类型推导，形成完整的类型安全事件通信链路。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### defineExpose的组件实例暴露控制

### 概念说明

`defineExpose` 是 `<script setup>` 中用于控制组件实例对外暴露内容的编译器宏。默认情况下，使用 `<script setup>` 的组件是封闭的——父组件通过模板引用（ref）获取子组件实例时，无法访问子组件内部的任何绑定。只有通过 `defineExpose` 显式暴露的属性和方法，父组件才能通过 ref 访问。

这与传统的 Options API 不同——在 Options API 中，父组件通过 ref 可以访问子组件实例上的所有属性和方法。`<script setup>` 的这种封闭行为是刻意设计的，遵循了最小暴露原则，让组件的公开接口更加明确和可控。

### 基本示例

```vue
<!-- 子组件 ChildComponent.vue -->
<script setup lang="ts">
// 示例说明：defineExpose 控制暴露内容

import { ref } from "vue";

// 内部状态
const count = ref(0);
const secretData = ref("内部数据");

// 内部方法
function increment() {
    count.value++;
}

function reset() {
    count.value = 0;
}

function internalMethod() {
    // 不想暴露给父组件的方法
    console.log("内部方法");
}

// 只暴露需要的属性和方法
defineExpose({
    count,      // 暴露 count
    increment,  // 暴露 increment 方法
    reset,      // 暴露 reset 方法
    // secretData 和 internalMethod 不暴露
});
</script>

<template>
    <p>{{ count }}</p>
    <button @click="increment">+1</button>
</template>
```

```vue
<!-- 父组件 -->
<script setup lang="ts">
import { ref, onMounted } from "vue";
import ChildComponent from "./ChildComponent.vue";

// 模板引用
const childRef = ref<InstanceType<typeof ChildComponent> | null>(null);

onMounted(() => {
    if (childRef.value) {
        // 可以访问 defineExpose 暴露的内容
        console.log(childRef.value.count);      // 0
        childRef.value.increment();              // 调用暴露的方法
        childRef.value.reset();                  // 调用暴露的方法

        // 无法访问未暴露的内容
        // console.log(childRef.value.secretData);     // undefined
        // childRef.value.internalMethod();             // TypeError
    }
});
</script>

<template>
    <ChildComponent ref="childRef" />
</template>
```

### 内部原理

#### defineExpose 的工作机制

```
defineExpose 的编译转换：

编译前：
defineExpose({ count, increment });

编译后（在 setup 函数内）：
expose({ count, increment });
// expose 是 setup context 中的方法

工作原理：
1. <script setup> 编译时默认调用 expose()（空参数）
   → 关闭组件实例的公开访问
2. defineExpose({ ... }) 覆盖默认行为
   → 只暴露指定的属性和方法
3. 父组件通过 ref 访问时
   → 返回的是 exposed 对象，不是完整的组件实例
   → 只能访问 defineExpose 中声明的内容

对比 Options API：
  → Options API 没有 expose 机制（默认全部暴露）
  → <script setup> 默认全部封闭（需要 defineExpose 打开）
```

### 与相关API的对比

| API 风格 | 默认行为 | ref 可访问内容 |
|---------|---------|-------------|
| Options API | 全部暴露 | 所有 data/methods/computed |
| `<script setup>` 无 defineExpose | 全部封闭 | 无 |
| `<script setup>` 有 defineExpose | 选择性暴露 | 仅 defineExpose 中的内容 |
| Options API + expose 选项 | 选择性暴露 | 仅 expose 中的内容 |

### 适用场景

- **表单组件：** 暴露 validate()、reset() 等方法
- **弹窗组件：** 暴露 open()、close() 方法
- **编辑器组件：** 暴露 getValue()、setValue() 方法
- **列表组件：** 暴露 scrollTo()、refresh() 方法

### 常见问题

#### TypeScript 中获取暴露内容的类型

**解决方案：**

```vue
<!-- 子组件 -->
<script setup lang="ts">
import { ref } from "vue";

const count = ref(0);
function reset() { count.value = 0; }

defineExpose({ count, reset });
</script>

<!-- 父组件 -->
<script setup lang="ts">
import { ref } from "vue";
import ChildComponent from "./ChildComponent.vue";

// 使用 InstanceType 获取组件实例类型
const childRef = ref<InstanceType<typeof ChildComponent> | null>(null);

// 或者手动定义接口
// interface ChildExposed {
//     count: number;
//     reset: () => void;
// }
// const childRef = ref<ChildExposed | null>(null);
</script>
```

### 注意事项

- defineExpose 是编译器宏，不需要 import
- 不调用 defineExpose 时组件默认全封闭
- 暴露的 ref 会自动解包（父组件访问时不需要 .value）
- defineExpose 应该只暴露必要的公开接口
- Options API 中用 `expose` 选项实现类似功能
- 暴露内容变化不会触发父组件重新渲染

### 总结

defineExpose 控制 `<script setup>` 组件对外暴露的内容。默认情况下组件完全封闭，只有通过 defineExpose 声明的属性和方法才能被父组件通过 ref 访问。这遵循了最小暴露原则，让组件的公开接口明确可控。适合暴露表单验证、弹窗控制等必要的命令式方法。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### defineOptions的组件选项定义

### 概念说明

`defineOptions` 是 Vue 3.3 引入的编译器宏，用于在 `<script setup>` 中直接设置组件选项，比如 `name`、`inheritAttrs`、`customOptions` 等。在 defineOptions 出现之前，要设置这些选项需要额外写一个普通的 `<script>` 块，defineOptions 消除了这个麻烦。

defineOptions 接收一个对象参数，对象中的键值对就是组件选项。但它不能用于设置已经有编译器宏的选项——比如 props（用 defineProps）、emits（用 defineEmits）、expose（用 defineExpose）、slots（用 defineSlots）。

### 基本示例

```vue
<script setup>
// 示例说明：defineOptions 设置组件选项

// ===== 设置组件名称 =====
// 组件名在 DevTools 调试、keep-alive 的 include/exclude 等场景中用到
defineOptions({
    name: "MySpecialComponent",
});

// ===== 关闭属性继承 =====
// defineOptions({
//     inheritAttrs: false,
// });

// ===== 组合使用 =====
// defineOptions({
//     name: "UserCard",
//     inheritAttrs: false,
//     // 自定义选项（某些插件需要）
//     customOption: "some-value",
// });

import { ref } from "vue";

const count = ref(0);
</script>

<template>
    <p>{{ count }}</p>
</template>
```

```vue
<!-- Vue 3.3 之前的写法：需要额外的 <script> 块 -->
<script>
export default {
    name: "MySpecialComponent",
    inheritAttrs: false,
};
</script>

<script setup>
import { ref } from "vue";
const count = ref(0);
</script>

<template>
    <p>{{ count }}</p>
</template>
```

### 内部原理

#### defineOptions 的编译转换

```
编译前：

<script setup>
defineOptions({
    name: 'UserCard',
    inheritAttrs: false,
});
const count = ref(0);
</script>

编译后：

export default {
    name: 'UserCard',
    inheritAttrs: false,
    setup() {
        const count = ref(0);
        return { count };
    }
};

// defineOptions 的内容直接合并到组件定义对象中
// 不需要额外的 <script> 块
```

### 与相关API的对比

| 设置方式 | 适用场景 | 可设置选项 |
|---------|---------|----------|
| defineOptions | script setup 中 | name、inheritAttrs、自定义选项 |
| 额外 `<script>` 块 | script setup 之前 | 任意选项 |
| defineProps | script setup 中 | props |
| defineEmits | script setup 中 | emits |

### 适用场景

- **组件命名：** 设置 name 用于调试和 keep-alive
- **属性继承控制：** 设置 inheritAttrs: false
- **自定义选项：** 插件需要的自定义配置
- **替代额外 script 块：** 简化组件结构

### 常见问题

#### defineOptions 不能设置哪些选项

**解决方案：**

```vue
<script setup>
// defineOptions 不能设置以下选项（有专门的宏）：
// × props → 用 defineProps
// × emits → 用 defineEmits
// × expose → 用 defineExpose
// × slots → 用 defineSlots

// defineOptions 可以设置的选项：
defineOptions({
    name: "MyComponent",          // 组件名
    inheritAttrs: false,          // 属性继承
    // 以及其他没有专门编译器宏的选项
});
</script>
```

### 注意事项

- Vue 3.3+ 才支持 defineOptions
- 不需要 import，是编译器宏
- 不能设置 props/emits/expose/slots（有专门的宏）
- 一个组件只能调用一次 defineOptions
- 替代了之前需要额外 `<script>` 块的写法
- 参数必须是对象字面量（不能是变量引用）

### 总结

defineOptions 是 Vue 3.3 引入的编译器宏，在 `<script setup>` 中直接设置 name、inheritAttrs 等组件选项，消除了额外 `<script>` 块的需要。不能设置已有专门编译器宏的选项（props、emits 等）。编译后选项直接合并到组件定义对象中。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### defineSlots的插槽类型定义

### 概念说明

`defineSlots` 是 Vue 3.3 引入的编译器宏，用于在 `<script setup>` 中为组件的插槽提供 TypeScript 类型定义。它让父组件在使用插槽时获得完整的类型提示——包括插槽名称和插槽作用域参数的类型。

defineSlots 只用于类型声明，不影响运行时行为。它接收一个泛型参数，描述每个插槽的名称及其作用域属性的类型。返回值是 slots 对象（等价于 `useSlots()` 的返回值），可以在 script setup 中使用。

在 defineSlots 出现之前，插槽的类型信息需要通过 `.d.ts` 文件或第三方工具来定义，defineSlots 提供了更直接的方案。

### 基本示例

```vue
<!-- 子组件 DataList.vue -->
<script setup lang="ts" generic="T">
// 示例说明：defineSlots 定义插槽类型

// 定义插槽类型
const slots = defineSlots<{
    // 默认插槽：无作用域参数
    default(): any;

    // 具名插槽 header：无作用域参数
    header(): any;

    // 作用域插槽 item：有参数
    item(props: { data: T; index: number }): any;

    // 作用域插槽 empty：无参数
    empty(): any;
}>();

// 定义 props
const props = defineProps<{
    items: T[];
    loading?: boolean;
}>();
</script>

<template>
    <div class="data-list">
        <!-- header 插槽 -->
        <header>
            <slot name="header" />
        </header>

        <!-- 列表渲染，item 作用域插槽 -->
        <ul v-if="items.length > 0">
            <li v-for="(item, index) in items" :key="index">
                <slot name="item" :data="item" :index="index" />
            </li>
        </ul>

        <!-- 空状态插槽 -->
        <div v-else>
            <slot name="empty">
                <p>暂无数据</p>
            </slot>
        </div>

        <!-- 默认插槽 -->
        <footer>
            <slot />
        </footer>
    </div>
</template>
```

```vue
<!-- 父组件使用 -->
<script setup lang="ts">
interface User {
    id: number;
    name: string;
    age: number;
}

const users: User[] = [
    { id: 1, name: "张三", age: 25 },
    { id: 2, name: "李四", age: 30 },
];
</script>

<template>
    <!-- 使用带类型的插槽 -->
    <DataList :items="users">
        <template #header>
            <h2>用户列表</h2>
        </template>

        <!-- item 插槽：data 的类型被推导为 User -->
        <template #item="{ data, index }">
            <span>{{ index + 1 }}. {{ data.name }} ({{ data.age }}岁)</span>
        </template>

        <template #empty>
            <p>没有用户数据</p>
        </template>
    </DataList>
</template>
```

### 内部原理

#### defineSlots 的编译处理

```
defineSlots 的工作方式：

1. 编译时：
   → 提取泛型参数中的插槽类型信息
   → 生成对应的类型定义文件
   → 不产生任何运行时代码

2. 类型系统层面：
   → 父组件使用 #slotName="props" 时
   → TypeScript 从 defineSlots 的类型中推导 props 类型
   → 提供自动补全和类型检查

3. 编译后：
   defineSlots 调用被移除（纯类型声明）
   等价于：
   const slots = useSlots();
   // 但附带了类型信息

配合 generic 组件：
  <script setup lang="ts" generic="T">
  → T 是泛型参数
  → defineSlots 中可以使用 T
  → 父组件传入具体类型时，插槽参数类型自动推导
```

### 与相关API的对比

| API | 用途 | 类型支持 | 运行时 |
|-----|------|---------|-------|
| defineSlots | 声明插槽类型 | 完整 | 无（纯类型） |
| useSlots() | 访问插槽对象 | 弱 | 有 |
| $slots | 访问插槽对象（Options API） | 无 | 有 |

### 适用场景

- **通用组件库：** 表格、列表等需要作用域插槽的组件
- **TypeScript 项目：** 需要插槽参数类型提示
- **泛型组件：** 配合 generic 实现类型安全的通用组件

### 常见问题

#### defineSlots 和 useSlots 的关系

**解决方案：**

```vue
<script setup lang="ts">
// defineSlots 返回的就是 slots 对象（带类型）
const slots = defineSlots<{
    default(): any;
    header(): any;
}>();

// 等价于 useSlots()，但多了类型信息
// const slots = useSlots();

// 可以用 slots 检查插槽是否存在
if (slots.header) {
    console.log("header 插槽存在");
}
</script>
```

### 注意事项

- Vue 3.3+ 才支持 defineSlots
- defineSlots 是纯类型声明，不影响运行时
- 返回值等价于 useSlots()
- 配合 generic 组件可以实现泛型插槽
- 插槽类型的返回值通常写 any（Vue 不检查渲染内容类型）
- 不需要 import，是编译器宏

### 总结

defineSlots 是 Vue 3.3 引入的编译器宏，为组件插槽提供 TypeScript 类型定义。它是纯类型声明，不产生运行时代码。配合 generic 组件可以实现泛型作用域插槽，父组件使用时自动获得参数类型推导。返回的 slots 对象可用于检查插槽是否存在。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### defineModel的双向绑定(3.4+)

### 概念说明

`defineModel` 是 Vue 3.4 正式引入的编译器宏，用于简化组件的 `v-model` 双向绑定实现。在此之前，实现 v-model 需要手动声明 prop（如 modelValue）和 emit（如 update:modelValue），然后在组件内部手动触发事件来更新父组件的值。defineModel 将这些样板代码封装起来，返回一个可以直接读写的 ref，写入时自动触发 `update:modelValue` 事件。

defineModel 让子组件实现双向绑定变得和使用普通 ref 一样简单——直接读取和赋值就行，不需要关心底层的 prop + emit 机制。

### 基本示例

```vue
<!-- 子组件 MyInput.vue -->
<script setup>
// 示例说明：defineModel 简化 v-model 实现

// ===== defineModel 写法（Vue 3.4+） =====
// 返回一个 ref，读取时获取 modelValue 的值
// 写入时自动触发 update:modelValue 事件
const model = defineModel();

// 等价于以下传统写法：
// const props = defineProps(['modelValue']);
// const emit = defineEmits(['update:modelValue']);
// 然后在修改时调用 emit('update:modelValue', newValue);

// ===== 带类型和选项 =====
// const model = defineModel<string>({ required: true });
// const model = defineModel<number>({ default: 0 });
</script>

<template>
    <!-- 直接用 v-model 绑定，model 是一个 ref -->
    <input v-model="model" />

    <!-- 或者手动读写 -->
    <input
        :value="model"
        @input="model = $event.target.value"
    />
</template>
```

```vue
<!-- 父组件 -->
<script setup>
import { ref } from "vue";
import MyInput from "./MyInput.vue";

const username = ref("");
</script>

<template>
    <!-- 使用 v-model 绑定 -->
    <MyInput v-model="username" />
    <p>输入内容: {{ username }}</p>
</template>
```

```vue
<!-- 多个 v-model 的场景 -->
<script setup>
// 子组件支持多个 v-model

// 默认 model（对应 v-model）
const value = defineModel();

// 命名 model（对应 v-model:title）
const title = defineModel("title");

// 带类型的命名 model
const count = defineModel("count", { type: Number, default: 0 });
</script>

<template>
    <input v-model="value" />
    <input v-model="title" />
    <input v-model.number="count" type="number" />
</template>

<!-- 父组件使用多个 v-model -->
<!-- <MyComponent v-model="val" v-model:title="t" v-model:count="c" /> -->
```

### 内部原理

#### defineModel 的编译转换

```
defineModel 编译前：

const model = defineModel();

编译后：

export default {
    props: {
        modelValue: {},           // 声明 modelValue prop
    },
    emits: ['update:modelValue'], // 声明 update 事件
    setup(__props, { emit }) {
        // 创建一个特殊的 ref
        // 读取时返回 __props.modelValue
        // 写入时调用 emit('update:modelValue', newValue)
        const model = useModel(__props, 'modelValue', { emit });
        return { model };
    }
};

useModel 的工作原理（简化）：
  function useModel(props, name, { emit }) {
      return customRef((track, trigger) => ({
          get() {
              track();
              return props[name]; // 读取 prop
          },
          set(value) {
              emit(`update:${name}`, value); // 触发事件
              trigger();
          }
      }));
  }
```

### 与相关API的对比

| 方式 | 代码量 | 可读性 | Vue 版本 |
|------|-------|--------|---------|
| defineModel | 1 行 | 高 | 3.4+ |
| defineProps + defineEmits | 多行 | 中 | 3.0+ |
| computed get/set | 多行 | 中 | 3.0+ |

### 适用场景

- **表单组件：** input、select、checkbox 等
- **自定义组件：** 需要双向绑定的任何组件
- **多 v-model：** 一个组件支持多个双向绑定值

### 常见问题

#### defineModel 之前的传统写法对比

**解决方案：**

```vue
<!-- 传统写法（Vue 3.0+）-->
<script setup>
const props = defineProps(["modelValue"]);
const emit = defineEmits(["update:modelValue"]);

// 需要手动创建计算属性或在事件中 emit
function updateValue(newVal) {
    emit("update:modelValue", newVal);
}
</script>
<template>
    <input :value="modelValue" @input="updateValue($event.target.value)" />
</template>

<!-- defineModel 写法（Vue 3.4+）-->
<script setup>
const model = defineModel();
</script>
<template>
    <input v-model="model" />
</template>
<!-- 代码量大幅减少，逻辑更清晰 -->
```

### 注意事项

- Vue 3.4+ 才正式支持（3.3 需要开启实验性功能）
- defineModel 返回的是一个 ref
- 默认 model 对应 v-model，命名 model 对应 v-model:name
- 支持 type、required、default 等选项
- 支持修饰符（通过 defineModel 的第二个参数配置）
- 编译器宏，不需要 import

### 总结

defineModel 是 Vue 3.4 引入的编译器宏，将 v-model 的实现从手动声明 prop + emit 简化为一行代码。返回的 ref 读取时获取 prop 值，写入时自动触发 update 事件。支持默认和命名 model、类型配置和修饰符。大幅减少了双向绑定组件的样板代码。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### defineModel的modifiers与options

### 概念说明

`defineModel` 支持处理 `v-model` 的修饰符（modifiers）。Vue 内置了 `.lazy`、`.number`、`.trim` 三个修饰符，开发者也可以定义自定义修饰符。当父组件使用 `v-model.myModifier` 时，子组件可以通过 defineModel 返回的第二个值（modifiers 对象）检测到修饰符的存在，并在 `set` 转换函数中对值进行处理。

defineModel 的第二个参数是选项对象，除了常规的 type、required、default 外，还支持 `set` 和 `get` 转换函数。`set` 函数在值写入前执行转换（比如修饰符处理），`get` 函数在值读取时执行转换。

### 基本示例

```vue
<!-- 子组件 MyInput.vue -->
<script setup>
// 示例说明：defineModel 处理修饰符

// ===== 基本修饰符处理 =====
// defineModel 返回 [modelRef, modifiers]
const [model, modifiers] = defineModel({
    // set 转换函数：写入前处理值
    set(value) {
        // 检查是否有 capitalize 修饰符
        if (modifiers.capitalize) {
            // 首字母大写
            return value.charAt(0).toUpperCase() + value.slice(1);
        }
        return value;
    },
});

// modifiers 是一个对象，包含父组件传入的修饰符
// 例如 v-model.capitalize="val" → modifiers = { capitalize: true }
</script>

<template>
    <input
        type="text"
        v-model="model"
    />
    <p>修饰符: {{ modifiers }}</p>
</template>
```

```vue
<!-- 父组件 -->
<script setup>
import { ref } from "vue";
import MyInput from "./MyInput.vue";

const text = ref("");
</script>

<template>
    <!-- 使用自定义修饰符 -->
    <MyInput v-model.capitalize="text" />
    <p>值: {{ text }}</p>
    <!-- 输入 "hello" → text 变为 "Hello" -->
</template>
```

```vue
<!-- 更完整的修饰符示例 -->
<script setup>
// 命名 model 的修饰符
const [title, titleModifiers] = defineModel("title", {
    set(value) {
        // 处理 trim 修饰符
        if (titleModifiers.trim) {
            value = value.trim();
        }
        // 处理 uppercase 修饰符
        if (titleModifiers.uppercase) {
            value = value.toUpperCase();
        }
        return value;
    },
});

// 带 get 转换的 model
const [price, priceModifiers] = defineModel("price", {
    type: Number,
    default: 0,
    // get：读取时转换（显示格式）
    get(value) {
        if (priceModifiers.currency) {
            return value; // 实际返回数字，模板中可以格式化
        }
        return value;
    },
    // set：写入时转换（存储格式）
    set(value) {
        if (priceModifiers.round) {
            return Math.round(value);
        }
        return value;
    },
});
</script>

<template>
    <input v-model="title" placeholder="标题" />
    <input v-model.number="price" type="number" placeholder="价格" />
</template>

<!-- 父组件使用：
<MyComponent
    v-model:title.trim.uppercase="titleVal"
    v-model:price.round="priceVal"
/>
-->
```

### 内部原理

#### 修饰符的传递机制

```
v-model 修饰符的编译转换：

父组件模板：
<MyInput v-model.capitalize.trim="text" />

编译为：
h(MyInput, {
    modelValue: text.value,
    'onUpdate:modelValue': (val) => { text.value = val },
    modelModifiers: { capitalize: true, trim: true },
    // 修饰符通过 xxxModifiers prop 传递
})

命名 model 的修饰符：
<MyInput v-model:title.uppercase="text" />

编译为：
h(MyInput, {
    title: text.value,
    'onUpdate:title': (val) => { text.value = val },
    titleModifiers: { uppercase: true },
})

defineModel 内部处理：
1. 自动声明 modelModifiers prop（默认值为空对象）
2. 返回的数组第二个元素就是 modifiers prop 的值
3. set 转换函数在 emit 之前执行
4. get 转换函数在读取 prop 时执行
```

### 与相关API的对比

| 修饰符类型 | 来源 | 处理位置 |
|-----------|------|---------|
| .lazy | Vue 内置 | 自动处理（change 代替 input） |
| .number | Vue 内置 | 自动处理（转为数字） |
| .trim | Vue 内置 | 自动处理（去除首尾空格） |
| 自定义修饰符 | 开发者定义 | defineModel 的 set 函数中 |

### 适用场景

- **文本转换：** 首字母大写、全大写、trim 等
- **数值处理：** 四舍五入、限制范围、格式化
- **数据清洗：** 去除特殊字符、标准化格式
- **组件库开发：** 为表单组件提供灵活的修饰符

### 常见问题

#### Vue 3.4 之前如何处理自定义修饰符

**解决方案：**

```vue
<!-- Vue 3.4 之前的写法 -->
<script setup>
const props = defineProps({
    modelValue: String,
    modelModifiers: {
        default: () => ({}), // 修饰符对象
    },
});
const emit = defineEmits(["update:modelValue"]);

function handleInput(e) {
    let value = e.target.value;
    // 手动检查修饰符
    if (props.modelModifiers.capitalize) {
        value = value.charAt(0).toUpperCase() + value.slice(1);
    }
    emit("update:modelValue", value);
}
</script>

<template>
    <input :value="modelValue" @input="handleInput" />
</template>

<!-- Vue 3.4+ defineModel 写法更简洁 -->
```

### 注意事项

- defineModel 返回数组 [ref, modifiers] 用于处理修饰符
- set 转换函数在值写入（emit）前执行
- get 转换函数在值读取时执行
- Vue 内置修饰符（.lazy/.number/.trim）自动处理
- 自定义修饰符通过 xxxModifiers prop 传递
- 修饰符对象中的键是修饰符名，值是 boolean

### 总结

defineModel 支持通过解构返回值获取修饰符对象，并通过 set/get 转换函数处理修饰符逻辑。Vue 内置的 .lazy、.number、.trim 自动处理，自定义修饰符需要在 set 函数中手动处理。修饰符通过 xxxModifiers prop 从父组件传递到子组件。相比 Vue 3.4 之前的手动处理方式，defineModel 大幅简化了修饰符的实现。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。



## 7.4 组件通信模式

### Props的父传子单向数据流

### 概念说明

Vue 中组件间的数据传递遵循单向数据流原则：父组件通过 props 向子组件传递数据，数据只能从父组件流向子组件，子组件不能直接修改从父组件接收的 props。这种设计让数据流向清晰可追踪，当应用出现数据问题时，可以从父组件向下排查，不会因为子组件的随意修改导致数据来源混乱。

如果子组件需要基于 prop 做变化，有两种方式：一是用 data/ref 接收初始值作为本地副本；二是用 computed 派生新值。如果子组件需要通知父组件更新数据，应该通过 emit 事件通信，由父组件决定是否修改数据。

### 基本示例

```vue
<!-- 父组件 -->
<script setup>
import { ref } from "vue";
import ChildComponent from "./ChildComponent.vue";

// 数据源在父组件
const userName = ref("张三");
const userAge = ref(25);

// 父组件决定是否修改数据
function handleNameChange(newName) {
    userName.value = newName;
}
</script>

<template>
    <!-- 通过 props 向下传递 -->
    <ChildComponent
        :name="userName"
        :age="userAge"
        @update-name="handleNameChange"
    />
</template>
```

```vue
<!-- 子组件 ChildComponent.vue -->
<script setup>
import { ref, computed } from "vue";

const props = defineProps({
    name: String,
    age: Number,
});

const emit = defineEmits(["update-name"]);

// 方式1：用 ref 创建本地副本（初始值来自 prop）
const localName = ref(props.name);

// 方式2：用 computed 派生数据（只读）
const greeting = computed(() => `你好，${props.name}，今年${props.age}岁`);

// 需要修改时，通过 emit 通知父组件
function changeName() {
    // 错误：不要直接修改 prop
    // props.name = '李四'; // Vue 会警告

    // 正确：通知父组件修改
    emit("update-name", "李四");
}
</script>

<template>
    <p>{{ greeting }}</p>
    <button @click="changeName">改名</button>
</template>
```

### 内部原理

#### 单向数据流的实现

```
Vue 的单向数据流机制：

1. Props 传递
   父组件渲染时：
   → 将 props 值写入子组件的 vnode.props
   → 子组件初始化时：initProps(instance, rawProps)
   → props 被包装为 shallowReadonly（开发环境只读代理）

2. 只读保护（开发环境）
   → props 被 shallowReadonly 包装
   → 子组件尝试修改 props 时触发 set 陷阱
   → 输出警告：Attempting to mutate prop "xxx"
   → 修改被阻止

3. 更新流程
   父组件数据变化 → 父组件重新渲染
   → 新的 props 传递给子组件
   → 子组件检测 props 变化
   → 子组件触发更新

4. 为什么是单向的
   → 如果子组件能修改 props
   → 父组件无法感知（没有反向通知机制）
   → 其他子组件可能使用相同的数据
   → 数据状态变得不可预测
```

### 与相关API的对比

| 通信方向 | 方式 | 适用场景 |
|---------|------|---------|
| 父 → 子 | props | 传递数据和配置 |
| 子 → 父 | emit | 通知父组件变化 |
| 双向 | v-model | 表单组件 |
| 跨层级 | provide/inject | 祖先到后代 |
| 全局 | Pinia | 任意组件共享 |

### 适用场景

- **数据展示：** 父组件传递数据给子组件显示
- **配置传递：** 传递主题、语言等配置项
- **状态下发：** 父组件管理状态，子组件接收使用

### 常见问题

#### 对象类型 prop 的"意外修改"

**解决方案：**

```vue
<script setup>
const props = defineProps({
    user: Object,
});

// 问题：修改对象的属性不会被 Vue 拦截
// props.user.name = '李四'; // 不会警告！但违反单向数据流

// 原因：shallowReadonly 只保护第一层
// props.user 不能被替换，但 props.user.name 可以被修改

// 正确做法：通过 emit 通知父组件修改
const emit = defineEmits(["update-user"]);

function updateName(newName) {
    emit("update-user", { ...props.user, name: newName });
}
</script>
```

### 注意事项

- Props 是单向数据流，子组件不能直接修改
- 开发环境中修改 prop 会触发警告
- 对象/数组类型的 prop 修改内部属性不会被拦截（但不推荐）
- 需要本地可变副本时用 ref/reactive 接收初始值
- 需要派生数据时用 computed
- 需要修改父组件数据时用 emit

### 总结

Props 实现父组件到子组件的单向数据流。子组件不能直接修改 props，需要通过 emit 通知父组件。这种设计让数据流向清晰可追踪。对象类型的 prop 虽然可以修改内部属性但不推荐，应该始终遵循单向数据流原则。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### Props的静态与动态绑定

### 概念说明

Vue 中向子组件传递 props 有两种方式：静态绑定和动态绑定。静态绑定直接写属性值（字符串），动态绑定使用 `v-bind`（简写 `:`）绑定 JavaScript 表达式。

静态绑定传递的始终是字符串类型。如果需要传递非字符串类型（数字、布尔值、对象、数组等），必须使用动态绑定 `:prop="expression"`，让 Vue 将属性值作为 JavaScript 表达式解析。

一个容易忽略的点：即使传递的是固定值（比如数字 42），也需要用动态绑定 `:count="42"`，否则子组件收到的是字符串 `"42"` 而不是数字 `42`。

### 基本示例

```html
<!-- 示例说明：静态绑定和动态绑定的区别 -->

<template>
    <!-- ===== 静态绑定：值始终是字符串 ===== -->
    <MyComponent title="你好世界" />
    <!-- 子组件收到：props.title = "你好世界"（string） -->

    <MyComponent count="42" />
    <!-- 子组件收到：props.count = "42"（string！不是 number） -->

    <MyComponent disabled="false" />
    <!-- 子组件收到：props.disabled = "false"（string！不是 boolean） -->


    <!-- ===== 动态绑定：值是 JavaScript 表达式 ===== -->
    <MyComponent :title="pageTitle" />
    <!-- 子组件收到：pageTitle 变量的值 -->

    <MyComponent :count="42" />
    <!-- 子组件收到：props.count = 42（number） -->

    <MyComponent :disabled="false" />
    <!-- 子组件收到：props.disabled = false（boolean） -->

    <MyComponent :items="[1, 2, 3]" />
    <!-- 子组件收到：[1, 2, 3]（Array） -->

    <MyComponent :config="{ theme: 'dark' }" />
    <!-- 子组件收到：{ theme: 'dark' }（Object） -->


    <!-- ===== 布尔类型的特殊行为 ===== -->
    <MyComponent disabled />
    <!-- 等价于 :disabled="true"（Boolean prop 的特殊处理） -->

    <MyComponent />
    <!-- 如果 disabled 声明为 Boolean 类型，不传值时默认为 false -->


    <!-- ===== v-bind 批量绑定 ===== -->
    <MyComponent v-bind="propsObject" />
    <!-- 等价于逐个绑定 propsObject 中的每个属性 -->
</template>

<script setup>
import { ref, reactive } from "vue";

const pageTitle = ref("首页");

// 用对象批量绑定 props
const propsObject = reactive({
    title: "批量绑定",
    count: 10,
    disabled: false,
});
</script>
```

### 内部原理

#### 静态和动态绑定的编译差异

```
模板编译结果对比：

静态绑定：<MyComponent title="hello" />
编译为：h(MyComponent, { title: "hello" })
→ 值始终是字符串 "hello"

动态绑定：<MyComponent :title="msg" />
编译为：h(MyComponent, { title: _ctx.msg })
→ 值是 msg 变量的运行时值

动态绑定常量：<MyComponent :count="42" />
编译为：h(MyComponent, { count: 42 })
→ 值是数字 42

v-bind 批量绑定：<MyComponent v-bind="obj" />
编译为：h(MyComponent, _ctx.obj)
→ 对象展开为多个 props
```

### 与相关API的对比

| 绑定方式 | 语法 | 值类型 | 响应式 |
|---------|------|-------|-------|
| 静态绑定 | `prop="value"` | 始终 string | 否 |
| 动态绑定 | `:prop="expr"` | 表达式结果 | 是 |
| 批量绑定 | `v-bind="obj"` | 对象各属性 | 是 |

### 适用场景

- **静态绑定：** 传递固定的字符串值
- **动态绑定：** 传递变量、非字符串类型、表达式
- **批量绑定：** 一次传递多个 props

### 常见问题

#### 传递数字和布尔值时忘记加冒号

**解决方案：**

```html
<!-- 错误：传递的是字符串 -->
<Pagination total="100" />     <!-- "100" string -->
<Modal visible="true" />       <!-- "true" string -->

<!-- 正确：传递实际类型 -->
<Pagination :total="100" />    <!-- 100 number -->
<Modal :visible="true" />      <!-- true boolean -->
<Modal visible />               <!-- true boolean（布尔简写） -->
```

### 注意事项

- 静态绑定始终传递字符串
- 非字符串类型必须使用动态绑定（加冒号）
- Boolean 类型的 prop 只写属性名等价于 true
- v-bind="obj" 可以批量传递 props
- 动态绑定的值是响应式的，变化时子组件自动更新
- camelCase 的 prop 名在模板中可以用 kebab-case

### 总结

静态绑定传递字符串值，动态绑定（`:prop`）传递 JavaScript 表达式的结果。传递数字、布尔值、对象、数组等非字符串类型时必须用动态绑定。`v-bind="obj"` 可以批量绑定多个 props。Boolean 类型有特殊的简写行为。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### Props的验证与默认值

### 概念说明

Vue 提供了完整的 props 验证机制，在开发环境中对传入的 props 进行类型检查、必填检查、自定义验证和默认值处理。这套机制既是运行时的防护网，也是组件接口的文档化手段。

验证的执行顺序是：required 检查 → type 检查 → validator 执行。默认值在 prop 未传递（值为 undefined）时生效。对象和数组类型的默认值必须使用工厂函数返回，避免多个组件实例共享同一个引用。

在 TypeScript 类型声明方式中，类型检查在编译时完成，默认值通过 `withDefaults` 设置。运行时声明方式的验证只在开发环境执行，生产构建中会被移除。

### 基本示例

```vue
<script setup>
// 示例说明：Props 验证与默认值的完整用法

const props = defineProps({
    // 基本类型 + 默认值
    title: {
        type: String,
        default: "默认标题",
    },

    // 必填属性
    id: {
        type: [String, Number], // 允许多种类型
        required: true,
    },

    // 数字范围验证
    score: {
        type: Number,
        default: 0,
        validator(value) {
            return value >= 0 && value <= 100;
        },
    },

    // 枚举验证
    size: {
        type: String,
        default: "medium",
        validator(value) {
            return ["small", "medium", "large"].includes(value);
        },
    },

    // 对象默认值：必须用工厂函数
    options: {
        type: Object,
        default() {
            return {
                border: true,
                shadow: false,
            };
        },
    },

    // 数组默认值：必须用工厂函数
    tags: {
        type: Array,
        default: () => [],
    },

    // Boolean 类型的特殊行为
    disabled: {
        type: Boolean,
        default: false,
        // Boolean 不传值时默认 false
        // <MyComp disabled /> 等价于 :disabled="true"
    },

    // 自定义类实例
    // date: {
    //     type: Date,
    //     default: () => new Date(),
    // },
});
</script>

<template>
    <div :class="['card', `card-${size}`]">
        <h3>{{ title }}</h3>
        <p>分数: {{ score }}</p>
    </div>
</template>
```

### 内部原理

#### 验证流程的执行细节

```
Props 验证的完整流程（开发环境）：

对每个声明的 prop 执行：

1. 获取实际传入的值
   → 从 vnode.props 中查找（支持 camelCase/kebab-case）
   → 未找到 → value = undefined

2. 处理 Boolean 类型特殊逻辑
   → type 包含 Boolean 且值为空字符串或与属性名同名
   → 转换为 true
   → type 包含 Boolean 且未传值
   → 转换为 false（如果没有同时声明 String 类型）

3. 处理默认值
   → value === undefined 且有 default
   → default 是函数 → 调用获取默认值
   → default 不是函数 → 直接使用

4. 验证
   a. required 检查：required && value === undefined → 警告
   b. type 检查：typeof/instanceof 不匹配 → 警告
   c. validator 检查：validator(value) === false → 警告
```

### 与相关API的对比

| 验证特性 | 运行时声明 | TypeScript 类型声明 |
|---------|----------|-----------------|
| 类型检查 | type 选项（运行时） | 泛型参数（编译时） |
| 必填检查 | required: true | 不带 `?` 的属性 |
| 默认值 | default 选项 | withDefaults() |
| 自定义验证 | validator 函数 | 不支持（需运行时声明） |
| 执行环境 | 开发环境 | 编译时 |

### 适用场景

- **组件库开发：** 完善的 props 验证保证组件正确使用
- **团队协作：** 验证规则即文档
- **防御性编程：** 在开发阶段捕获错误

### 常见问题

#### 对象默认值不用工厂函数的后果

**解决方案：**

```javascript
// 错误：直接写对象
// 所有组件实例共享同一个对象引用
// 一个实例修改会影响其他实例
defineProps({
    // config: {
    //     type: Object,
    //     default: { theme: 'light' }, // 共享引用！
    // },
});

// 正确：使用工厂函数
defineProps({
    config: {
        type: Object,
        default() {
            return { theme: "light" }; // 每个实例独立对象
        },
    },
    // 或箭头函数简写
    tags: {
        type: Array,
        default: () => [],
    },
});
```

### 注意事项

- 验证只在开发环境执行，生产构建中被移除
- 对象/数组默认值必须使用工厂函数
- Boolean 类型有特殊的默认值行为
- validator 中不能访问组件实例（this）
- 传递 null 会跳过 type 检查但不触发 required 警告
- 验证失败只输出警告，不阻止组件渲染

### 总结

Props 验证包括 type 类型检查、required 必填检查、validator 自定义验证和 default 默认值。对象和数组的默认值必须用工厂函数。Boolean 类型有特殊的默认值行为。验证只在开发环境执行。TypeScript 类型声明在编译时检查类型，运行时声明在开发环境检查。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### emit子传父的事件触发

### 概念说明

`emit` 是 Vue 中子组件向父组件通信的核心机制。子组件通过 `emit` 触发一个自定义事件，并可以携带数据作为参数；父组件通过 `@eventName` 监听该事件并执行回调函数。这样子组件不需要知道父组件是谁，只需要触发事件，实现了组件间的解耦。

在 `<script setup>` 中，通过 `defineEmits` 声明事件并获取 emit 函数。在 Options API 中，通过 `this.$emit` 触发事件。emit 可以携带任意数量和类型的参数，父组件的回调函数按顺序接收这些参数。

### 基本示例

```vue
<!-- 子组件 SearchBar.vue -->
<script setup>
// 示例说明：emit 子传父通信

import { ref } from "vue";

// 声明组件会触发的事件
const emit = defineEmits(["search", "clear", "focus"]);

const keyword = ref("");

// 触发 search 事件，携带关键词参数
function handleSearch() {
    if (keyword.value.trim()) {
        emit("search", keyword.value.trim());
    }
}

// 触发 clear 事件，不携带参数
function handleClear() {
    keyword.value = "";
    emit("clear");
}

// 触发 focus 事件，携带多个参数
function handleFocus(event) {
    emit("focus", event, keyword.value);
}
</script>

<template>
    <div class="search-bar">
        <input
            v-model="keyword"
            @keyup.enter="handleSearch"
            @focus="handleFocus"
            placeholder="输入关键词..."
        />
        <button @click="handleSearch">搜索</button>
        <button @click="handleClear">清空</button>
    </div>
</template>
```

```vue
<!-- 父组件 -->
<script setup>
import { ref } from "vue";
import SearchBar from "./SearchBar.vue";

const results = ref([]);

// 监听子组件的 search 事件
function onSearch(keyword) {
    console.log("搜索关键词:", keyword);
    // 执行搜索逻辑
    results.value = fetchResults(keyword);
}

// 监听子组件的 clear 事件
function onClear() {
    console.log("已清空");
    results.value = [];
}

// 监听子组件的 focus 事件（多参数）
function onFocus(event, currentKeyword) {
    console.log("获得焦点，当前关键词:", currentKeyword);
}
</script>

<template>
    <!-- 通过 @ 监听子组件的事件 -->
    <SearchBar
        @search="onSearch"
        @clear="onClear"
        @focus="onFocus"
    />
</template>
```

### 内部原理

#### emit 的事件派发机制

```
emit 的内部执行流程：

1. 子组件调用 emit('search', keyword)

2. Vue 内部处理：
   → 事件名转换：'search' → 'onSearch'（加 on 前缀，首字母大写）
   → 在组件的 vnode.props 中查找 'onSearch'
   → 找到 → 执行对应的回调函数

3. 父组件模板中：
   @search="onSearch"
   编译为：{ onSearch: onSearch }
   存储在子组件 vnode.props 中

4. emit 并不是真正的"事件冒泡"
   → 不同于 DOM 事件的冒泡机制
   → 只是查找父组件传入的回调函数并调用
   → 不会向上层组件传播
```

### 与相关API的对比

| 方式 | 语法 | 适用范围 |
|------|------|---------|
| emit | `emit('event', data)` | 子 → 直接父组件 |
| provide/inject | `provide/inject` | 祖先 → 后代 |
| v-model | `defineModel()` | 父 ↔ 子双向 |
| Pinia | store | 任意组件 |

### 适用场景

- **表单提交：** 子组件触发提交事件携带表单数据
- **用户交互：** 按钮点击、输入变化等操作通知父组件
- **状态更新请求：** 子组件请求父组件修改数据
- **确认/取消操作：** 弹窗组件的确认和取消回调

### 常见问题

#### 在模板中直接使用 $emit

**解决方案：**

```vue
<script setup>
// 在 script setup 中必须用 defineEmits 获取 emit
const emit = defineEmits(["increment"]);
</script>

<template>
    <!-- 方式1：调用 script 中的 emit 函数 -->
    <button @click="emit('increment', 1)">+1</button>

    <!-- 方式2：模板中可以直接用 $emit（不需要 defineEmits 的返回值） -->
    <button @click="$emit('increment', 1)">+1</button>
    <!-- 但仍然推荐用 defineEmits 声明事件 -->
</template>
```

### 注意事项

- emit 只能通信到直接父组件，不能跨层级
- 推荐使用 defineEmits 声明所有事件
- 事件名推荐 camelCase，模板中可用 kebab-case
- emit 的参数数量不限，按顺序传递
- 声明在 emits 中的事件不会作为原生事件监听
- emit 是同步执行的（回调函数同步调用）

### 总结

emit 实现子组件到父组件的事件通信。子组件通过 emit 触发事件并携带数据，父组件通过 `@eventName` 监听并处理。emit 的本质是调用父组件传入的回调函数，不是 DOM 事件冒泡。推荐使用 defineEmits 声明事件，保持组件接口清晰。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### emit的校验与类型安全

### 概念说明

Vue 3 的 emits 选项支持对触发的事件进行参数校验。在运行时声明中，可以为每个事件提供验证函数；在 TypeScript 类型声明中，编译器会自动检查事件名和参数类型。两种方式结合使用可以在编译时和运行时（开发环境）双重保障事件通信的正确性。

运行时验证函数接收 emit 传递的参数，返回布尔值。返回 false 时 Vue 在开发环境输出警告，但不会阻止事件触发。TypeScript 类型声明则在编译阶段检查，拼错事件名或传错参数类型会直接报编译错误。

### 基本示例

```vue
<script setup lang="ts">
// 示例说明：emit 的运行时验证和类型安全

// ===== 运行时验证（开发环境警告） =====
// const emit = defineEmits({
//     submit(payload) {
//         // 验证 payload 必须包含 email
//         if (!payload || !payload.email) {
//             console.warn('submit 事件缺少 email 字段');
//             return false;
//         }
//         return true;
//     },
//     delete(id) {
//         return typeof id === 'number' && id > 0;
//     },
// });

// ===== TypeScript 类型安全（编译时检查） =====
const emit = defineEmits<{
    submit: [payload: { email: string; password: string }];
    delete: [id: number];
    cancel: [];
}>();

// 正确调用
emit("submit", { email: "a@b.com", password: "123" });
emit("delete", 1);
emit("cancel");

// 编译时错误（TypeScript 报错）
// emit("submitt", {});         // 事件名不存在
// emit("delete", "abc");       // 参数类型错误
// emit("submit");              // 缺少必需参数
// emit("cancel", "多余参数");   // 参数数量错误
</script>
```

### 内部原理

#### 验证的执行机制

```
运行时验证流程（开发环境）：

emit('submit', payload)
  → 查找 emits 声明中 'submit' 的验证函数
  → 调用验证函数：validator(payload)
  → 返回 false → 输出 Vue warn
  → 无论验证结果如何，事件都会正常触发

TypeScript 类型检查流程（编译时）：

defineEmits<{ submit: [payload: T] }>()
  → 生成 emit 函数的类型签名
  → 调用 emit 时 TypeScript 编译器检查
  → 类型不匹配 → 编译错误（红色波浪线）
```

### 与相关API的对比

| 校验方式 | 检查时机 | 阻止触发 | 适用语言 |
|---------|---------|---------|---------|
| 运行时验证函数 | 开发环境运行时 | 否（只警告） | JS / TS |
| TypeScript 类型声明 | 编译时 | 是（编译错误） | 仅 TS |

### 适用场景

- **组件库开发：** 对外暴露的事件需要参数校验
- **TypeScript 项目：** 利用类型系统保障通信正确性
- **团队协作：** 明确事件参数格式，减少沟通成本

### 常见问题

#### 运行时验证和类型声明能否同时使用

**解决方案：**

```vue
<script setup lang="ts">
// 不能同时使用两种声明方式
// 但可以在类型声明的基础上手动添加运行时验证

const emit = defineEmits<{
    submit: [data: { email: string }];
}>();

// 封装 emit，添加运行时验证
function safeEmit(data: { email: string }) {
    if (!data.email.includes("@")) {
        console.warn("邮箱格式不正确");
        return;
    }
    emit("submit", data);
}
</script>
```

### 注意事项

- 运行时验证只在开发环境执行，不阻止事件触发
- TypeScript 类型声明在编译时检查，更严格
- 两种声明方式不能混用
- 运行时验证函数不能访问组件实例
- 验证失败只输出警告，事件仍然会被触发
- 推荐 TypeScript 项目使用类型声明方式

### 总结

emit 的校验有运行时验证和 TypeScript 类型声明两种方式。运行时验证在开发环境执行，返回 false 输出警告但不阻止触发。TypeScript 类型声明在编译时检查事件名和参数类型，发现错误直接报编译错误。推荐 TypeScript 项目使用类型声明方式获得更强的类型保障。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### provide/inject的跨层级注入

### 概念说明

`provide` 和 `inject` 是 Vue 提供的跨层级组件通信方案。祖先组件通过 `provide` 提供数据，后代组件（无论嵌套多深）通过 `inject` 注入并使用这些数据。这解决了 props 需要逐层传递（"prop drilling"）的问题。

provide/inject 的查找是就近原则：inject 会从当前组件开始向上查找最近的 provide，如果多个祖先组件提供了相同 key 的数据，后代组件会使用最近的那个。

在 Composition API 中，provide 和 inject 是从 vue 导入的函数；在 Options API 中，它们是组件选项。provide 可以提供任何类型的值，包括响应式数据（ref、reactive）。

### 基本示例

```vue
<!-- 祖先组件 App.vue -->
<script setup>
import { ref, provide } from "vue";

// 提供响应式数据
const theme = ref("dark");
const locale = ref("zh-CN");

// provide(key, value)
provide("theme", theme);
provide("locale", locale);

// 提供方法（让后代可以修改数据）
function toggleTheme() {
    theme.value = theme.value === "dark" ? "light" : "dark";
}
provide("toggleTheme", toggleTheme);
</script>

<template>
    <div :class="theme">
        <ParentComponent />
    </div>
</template>
```

```vue
<!-- 中间组件 ParentComponent.vue -->
<script setup>
// 中间组件不需要知道 theme 的存在
// 不需要传递任何 props
import ChildComponent from "./ChildComponent.vue";
</script>

<template>
    <div>
        <h2>中间组件</h2>
        <ChildComponent />
    </div>
</template>
```

```vue
<!-- 后代组件 ChildComponent.vue -->
<script setup>
import { inject } from "vue";

// inject(key, defaultValue?)
const theme = inject("theme");           // ref("dark")
const locale = inject("locale");         // ref("zh-CN")
const toggleTheme = inject("toggleTheme"); // function

// 提供默认值（当没有祖先 provide 时使用）
const fontSize = inject("fontSize", 14);
</script>

<template>
    <div>
        <p>当前主题: {{ theme }}</p>
        <p>当前语言: {{ locale }}</p>
        <button @click="toggleTheme">切换主题</button>
    </div>
</template>
```

### 内部原理

#### provide/inject 的查找链

```
provide/inject 的工作机制：

provide 阶段：
  → 组件实例有一个 provides 对象
  → provide(key, value) 将键值对存入 provides
  → 子组件的 provides 原型链指向父组件的 provides
  → instance.provides = Object.create(parent.provides)

inject 阶段：
  → inject(key) 从当前组件的 provides 向上查找
  → 利用原型链自动就近查找
  → 找到 → 返回值
  → 找不到 → 返回默认值或 undefined

查找路径：
  App provides: { theme: 'dark' }
    ↓ 原型链
  Parent provides: {}（未提供新的 theme）
    ↓ 原型链
  Child inject('theme')
    → 沿原型链找到 App 的 theme → 'dark'
```

### 与相关API的对比

| 通信方式 | 方向 | 层级限制 | 响应式 |
|---------|------|---------|-------|
| props | 父 → 子 | 直接父子 | 是 |
| emit | 子 → 父 | 直接父子 | - |
| provide/inject | 祖先 → 后代 | 跨任意层级 | 可选 |
| Pinia | 任意 | 无限制 | 是 |

### 适用场景

- **主题/国际化：** 全局主题和语言设置
- **用户信息：** 登录用户数据的全局注入
- **配置注入：** 组件库的全局配置
- **避免 prop drilling：** 深层嵌套的数据传递

### 常见问题

#### 使用 Symbol 作为 key 避免命名冲突

**解决方案：**

```javascript
// keys.js - 集中管理 injection key
export const ThemeKey = Symbol("theme");
export const LocaleKey = Symbol("locale");

// 祖先组件
import { provide } from "vue";
import { ThemeKey } from "./keys";
provide(ThemeKey, ref("dark"));

// 后代组件
import { inject } from "vue";
import { ThemeKey } from "./keys";
const theme = inject(ThemeKey);
```

### 注意事项

- provide/inject 只能从祖先到后代，不能反向
- inject 的查找遵循就近原则（原型链）
- 默认值可以是工厂函数（第三个参数为 true 时）
- 提供的值不自动是响应式的，需要提供 ref/reactive
- 推荐使用 Symbol 作为 key 避免命名冲突
- 不要滥用，简单场景用 props 就够了

### 总结

provide/inject 实现祖先到后代的跨层级通信，避免了 props 逐层传递。provide 提供数据，inject 注入数据，查找遵循原型链就近原则。提供响应式数据（ref/reactive）可以保持数据同步。推荐使用 Symbol key 和集中管理 key 的方式。适合主题、国际化、全局配置等场景。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### provide的响应式数据注入

### 概念说明

provide 提供的值本身不会自动变成响应式的。如果 provide 传入的是普通值（字符串、数字等），后代组件 inject 得到的就是一个静态值，祖先组件修改后后代不会感知到变化。要实现响应式的 provide/inject，需要提供 ref 或 reactive 对象。

当 provide 提供的是 ref 或 reactive 时，后代组件 inject 到的也是同一个响应式引用。祖先组件修改数据后，所有 inject 了该数据的后代组件都会自动更新。这是实现跨层级响应式数据共享的关键。

为了保持单向数据流的清晰性，推荐的做法是：祖先组件 provide 数据的同时也 provide 修改数据的方法，或者使用 readonly 包装后再 provide，防止后代组件直接修改数据。

### 基本示例

```vue
<!-- 祖先组件 -->
<script setup>
import { ref, reactive, provide, readonly } from "vue";

// ===== 提供响应式 ref =====
const count = ref(0);
provide("count", count); // 后代 inject 到的是同一个 ref

// ===== 提供响应式 reactive =====
const user = reactive({
    name: "张三",
    age: 25,
});
provide("user", user);

// ===== 推荐：提供 readonly 包装 + 修改方法 =====
// 防止后代组件直接修改数据，保持单向数据流
provide("readonlyCount", readonly(count));
provide("updateCount", (newVal) => {
    count.value = newVal;
});

// ===== 推荐：提供 readonly 的 reactive =====
provide("readonlyUser", readonly(user));
provide("updateUser", (updates) => {
    Object.assign(user, updates);
});

function increment() {
    count.value++;
}
</script>

<template>
    <p>祖先 count: {{ count }}</p>
    <button @click="increment">+1</button>
    <ChildComponent />
</template>
```

```vue
<!-- 后代组件 -->
<script setup>
import { inject, watch } from "vue";

// inject 响应式数据
const count = inject("count");           // 同一个 ref，响应式
const user = inject("user");             // 同一个 reactive，响应式
const readonlyCount = inject("readonlyCount"); // readonly ref
const updateCount = inject("updateCount");     // 修改方法

// 可以 watch 注入的响应式数据
watch(count, (newVal) => {
    console.log("count 变化:", newVal);
});

// 通过注入的方法修改数据（推荐方式）
function handleClick() {
    updateCount(count.value + 10);
}

// 直接修改也会生效，但不推荐
// count.value = 100; // 可以，但违反单向数据流
// readonlyCount.value = 100; // 错误！readonly 会阻止修改
</script>

<template>
    <p>后代 count: {{ count }}</p>
    <p>用户: {{ user.name }}</p>
    <button @click="handleClick">+10</button>
</template>
```

### 内部原理

#### 响应式 provide/inject 的数据流

```
响应式 provide/inject 的工作原理：

1. provide(key, ref(0))
   → 将 ref 对象存入组件的 provides
   → ref 对象是引用传递，不是值传递

2. inject(key)
   → 沿原型链找到 ref 对象
   → 返回的是同一个 ref 引用
   → 后代组件和祖先组件共享同一个 ref

3. 数据变化时：
   祖先修改 ref.value
   → ref 内部 trigger
   → 所有 track 了该 ref 的 effect 重新执行
   → 包括后代组件的模板渲染 effect
   → 后代组件自动更新

readonly 包装的效果：
   provide(key, readonly(ref))
   → 后代 inject 到的是 readonly 代理
   → 读取正常，依赖追踪正常
   → 写入被拦截，开发环境输出警告
```

### 与相关API的对比

| 提供方式 | 后代可读 | 后代可写 | 响应式 |
|---------|---------|---------|-------|
| provide(key, 普通值) | 是 | 不适用 | 否 |
| provide(key, ref) | 是 | 是 | 是 |
| provide(key, readonly(ref)) | 是 | 否（警告） | 是 |
| provide(key, reactive) | 是 | 是 | 是 |
| provide(key, readonly(reactive)) | 是 | 否（警告） | 是 |

### 适用场景

- **全局主题：** provide 响应式的主题 ref，后代自动更新
- **用户状态：** 登录状态、用户信息的跨组件共享
- **配置管理：** 动态配置的响应式注入
- **composable 状态共享：** 在组件树中共享 composable 的状态

### 常见问题

#### 非响应式 provide 导致后代不更新

**解决方案：**

```vue
<script setup>
import { ref, provide } from "vue";

const count = ref(0);

// 错误：provide 普通值，后代不会响应更新
// provide('count', count.value); // 提供的是 0（number），不是 ref

// 正确：provide ref 对象本身
provide("count", count); // 提供的是 ref 对象
</script>
```

### 注意事项

- 提供 ref/reactive 才能实现响应式注入
- 不要 provide(key, ref.value)，这样提供的是普通值
- 推荐用 readonly 包装，防止后代直接修改
- 同时 provide 修改方法，保持数据流清晰
- 后代组件可以 watch 注入的响应式数据
- computed 也可以作为 provide 的值

### 总结

provide 提供 ref 或 reactive 对象时，后代 inject 到的是同一个响应式引用，数据变化会自动同步。推荐使用 readonly 包装后再 provide，防止后代直接修改数据。同时 provide 修改方法让后代通过方法修改数据，保持单向数据流的清晰性。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### inject的默认值与工厂函数

### 概念说明

`inject` 在注入数据时，如果没有祖先组件 provide 对应的 key，默认返回 undefined。为了避免这种情况，inject 支持设置默认值。默认值有两种形式：直接传入一个值，或传入一个工厂函数。

当默认值本身是一个函数时，需要通过第三个参数 `true` 告诉 Vue 这是一个工厂函数（需要调用后才是默认值），否则 Vue 会把函数本身当作默认值返回。工厂函数适合需要创建新对象或执行计算逻辑的场景，避免多个组件共享同一个默认对象引用。

### 基本示例

```vue
<script setup>
import { inject } from "vue";

// ===== 无默认值 =====
const theme = inject("theme");
// 如果没有祖先 provide('theme', ...)
// theme 的值为 undefined

// ===== 直接默认值 =====
const locale = inject("locale", "zh-CN");
// 如果没有祖先 provide('locale', ...)
// locale 的值为 "zh-CN"

// ===== 对象默认值（有隐患） =====
const config = inject("config", { debug: false });
// 注意：所有使用此默认值的组件共享同一个对象引用
// 如果一个组件修改了 config.debug，其他组件也受影响

// ===== 工厂函数默认值（推荐） =====
// 第三个参数为 true，表示第二个参数是工厂函数
const safeConfig = inject(
    "config",
    () => ({ debug: false, logLevel: "info" }),
    true // 标记为工厂函数
);
// 每个组件获得独立的默认对象

// ===== 工厂函数：创建复杂默认值 =====
const store = inject(
    "store",
    () => {
        // 执行初始化逻辑
        const state = { count: 0, items: [] };
        return state;
    },
    true
);

// ===== 函数类型的默认值 =====
// 如果默认值本身就是一个函数
const formatter = inject(
    "formatter",
    () => (value) => `${value}元`, // 工厂函数返回一个函数
    true
);
// formatter 的值是 (value) => `${value}元`

// 如果不加第三个参数 true：
// const fn = inject("formatter", (value) => `${value}元`);
// fn 的值就是这个函数本身（不会被调用）
// 这可能是你想要的，也可能不是
</script>
```

### 内部原理

#### inject 默认值的处理逻辑

```
inject(key, defaultValue, treatDefaultAsFactory) 的内部逻辑：

function inject(key, defaultValue, treatDefaultAsFactory = false) {
    // 获取当前组件实例
    const instance = currentInstance;

    // 从父组件的 provides 中查找
    const provides = instance.parent?.provides;

    if (provides && key in provides) {
        // 找到了 → 返回 provide 的值
        return provides[key];
    }

    // 没找到 → 处理默认值
    if (arguments.length > 1) {
        // 有默认值参数
        if (treatDefaultAsFactory && typeof defaultValue === 'function') {
            // 第三个参数为 true → 调用工厂函数
            return defaultValue();
        }
        // 直接返回默认值
        return defaultValue;
    }

    // 没有默认值 → 开发环境警告
    // warn(`injection "${key}" not found.`);
    return undefined;
}
```

### 与相关API的对比

| 默认值形式 | 语法 | 每次调用是否独立 |
|-----------|------|---------------|
| 无默认值 | `inject('key')` | - |
| 直接值 | `inject('key', 'default')` | 基本类型独立，引用类型共享 |
| 对象直接值 | `inject('key', { a: 1 })` | 共享同一引用 |
| 工厂函数 | `inject('key', () => ({ a: 1 }), true)` | 每次独立 |

### 适用场景

- **可选注入：** 组件可以独立使用也可以被注入
- **安全防护：** 防止 inject 返回 undefined 导致错误
- **独立默认对象：** 需要每个实例有独立默认值时

### 常见问题

#### 忘记加第三个参数 true 导致工厂函数不执行

**解决方案：**

```vue
<script setup>
import { inject } from "vue";

// 错误：工厂函数没有被调用
// const config = inject('config', () => ({ debug: false }));
// config 的值是箭头函数本身，不是 { debug: false }

// 正确：加上第三个参数 true
const config = inject("config", () => ({ debug: false }), true);
// config 的值是 { debug: false }
</script>
```

### 注意事项

- 没有默认值且未找到 provide 时返回 undefined
- 对象类型的默认值推荐使用工厂函数（避免共享引用）
- 第三个参数 true 表示第二个参数是工厂函数
- 函数类型的默认值要注意是否需要标记为工厂函数
- 工厂函数每次 inject 调用时都会执行
- TypeScript 中可以用泛型指定 inject 的返回类型

### 总结

inject 支持默认值和工厂函数两种形式。直接默认值适合基本类型，工厂函数适合对象/数组（避免共享引用）。第三个参数 `true` 标记默认值为工厂函数。函数类型的默认值需要特别注意是否需要标记为工厂函数。没有默认值且未找到 provide 时返回 undefined。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### $attrs的透传属性访问

### 概念说明

`$attrs` 是一个包含了父组件传递给子组件但未被子组件声明为 props 或 emits 的所有属性和事件监听器的对象。在 Vue 3 中，`$attrs` 包含了除 props 和 emits 之外的所有内容，包括 `class`、`style`、`id`、`v-on` 事件监听器等。

默认情况下，`$attrs` 中的属性会自动"透传"到子组件的根元素上。如果子组件只有一个根元素，这些属性会自动添加到根元素上。如果子组件有多个根元素或者需要将属性传递到非根元素上，需要手动处理 `$attrs`。

Vue 2 中 `$attrs` 不包含 `class` 和 `style`，也不包含事件监听器（事件在 `$listeners` 中）。Vue 3 合并了这些，统一放在 `$attrs` 中，不再有 `$listeners`。

### 基本示例

```vue
<!-- 父组件 -->
<script setup>
import MyButton from "./MyButton.vue";
</script>

<template>
    <!-- 传递多个属性给子组件 -->
    <MyButton
        id="submit-btn"
        class="primary"
        style="font-size: 16px"
        data-testid="submit"
        title="提交按钮"
        @click="handleClick"
        @mouseenter="handleHover"
    />
    <!--
        假设 MyButton 声明了 props: { title: String }
        那么 $attrs 包含：
        {
            id: "submit-btn",
            class: "primary",
            style: { fontSize: "16px" },
            "data-testid": "submit",
            onClick: handleClick,
            onMouseenter: handleHover,
        }
        title 不在 $attrs 中（已被声明为 prop）
    -->
</template>
```

```vue
<!-- 子组件 MyButton.vue -->
<script setup>
import { useAttrs } from "vue";

// 声明的 props 不会出现在 $attrs 中
const props = defineProps({
    title: String,
});

// 在 script setup 中通过 useAttrs() 访问
const attrs = useAttrs();
console.log(attrs); // { id, class, style, data-testid, onClick, onMouseenter }
console.log(attrs.id); // "submit-btn"
</script>

<template>
    <!-- 单根元素：$attrs 自动透传到根元素 -->
    <button>
        {{ title }}
    </button>
    <!--
        渲染结果：
        <button
            id="submit-btn"
            class="primary"
            style="font-size: 16px"
            data-testid="submit"
        >
            提交按钮
        </button>
        click 和 mouseenter 事件也会绑定到 button 上
    -->
</template>
```

### 内部原理

#### $attrs 的收集和透传

```
$attrs 的工作流程：

1. 父组件传递属性：
   vnode.props = {
       title: "提交按钮",
       id: "submit-btn",
       class: "primary",
       onClick: handler,
       ...
   }

2. 子组件初始化时分离：
   → 遍历 vnode.props
   → 匹配 props 声明 → 归入 instance.props
   → 匹配 emits 声明 → 标记为已处理
   → 剩余的 → 归入 instance.attrs

3. 自动透传（inheritAttrs: true，默认）：
   → 渲染时将 attrs 合并到根元素的属性上
   → class 和 style 会智能合并（不是覆盖）
   → 事件监听器会正确绑定

4. 多根元素：
   → 不会自动透传（Vue 不知道该透传到哪个根元素）
   → 需要手动 v-bind="$attrs" 指定目标
```

### 与相关API的对比

| 特性 | Vue 2 $attrs | Vue 3 $attrs |
|------|-------------|-------------|
| 包含 class/style | 否 | 是 |
| 包含事件监听器 | 否（在 $listeners 中） | 是 |
| 自动透传 | 需要配合 $listeners | 统一处理 |
| $listeners | 存在 | 已移除 |

### 适用场景

- **包装组件：** 包装原生元素或第三方组件时透传属性
- **高阶组件：** 将未知属性传递到内部组件
- **组件库开发：** 允许用户自定义底层元素的属性

### 常见问题

#### 多根元素时的透传警告

**解决方案：**

```vue
<!-- 多根元素组件 -->
<script setup>
defineOptions({ inheritAttrs: false }); // 关闭自动透传
</script>

<template>
    <!-- 多根元素：手动指定透传目标 -->
    <header>标题</header>
    <main v-bind="$attrs">
        <!-- $attrs 透传到 main 元素 -->
        <slot />
    </main>
    <footer>底部</footer>
</template>
```

### 注意事项

- Vue 3 的 $attrs 包含 class、style 和事件监听器
- 单根元素自动透传，多根元素需要手动处理
- 声明为 props 或 emits 的属性不会出现在 $attrs 中
- script setup 中通过 useAttrs() 访问
- 模板中通过 $attrs 访问
- $attrs 是响应式的（属性变化时自动更新）

### 总结

$attrs 包含父组件传递的未被声明为 props 或 emits 的所有属性和事件。Vue 3 将 class、style、事件监听器统一纳入 $attrs，移除了 $listeners。单根元素自动透传到根元素，多根元素需要手动 `v-bind="$attrs"` 指定目标。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### $attrs在script setup中的useAttrs

### 概念说明

在 `<script setup>` 中，无法直接通过 `this.$attrs` 访问透传属性（因为没有 this）。Vue 3 提供了 `useAttrs()` 组合式函数，用于在 script setup 中获取 `$attrs` 对象。useAttrs 返回的对象与模板中的 `$attrs` 是同一个引用，包含所有未被声明为 props 或 emits 的属性和事件监听器。

useAttrs 通常用于需要在 JavaScript 逻辑中读取或处理透传属性的场景，比如根据某个透传属性决定组件行为、将属性有选择地分发到不同的内部元素等。如果只是在模板中透传，直接用 `$attrs` 或 `v-bind="$attrs"` 就够了，不需要 useAttrs。

### 基本示例

```vue
<script setup>
import { useAttrs, computed, watchEffect } from "vue";

// 获取 $attrs 对象
const attrs = useAttrs();

// 读取特定属性
console.log(attrs.id);        // 父组件传的 id
console.log(attrs.class);     // 父组件传的 class
console.log(attrs.onClick);   // 父组件传的 @click 处理函数

// 监听 attrs 变化
watchEffect(() => {
    console.log("当前 attrs:", attrs);
});

// 拆分 attrs：将事件和普通属性分开
const eventAttrs = computed(() => {
    const events = {};
    const rest = {};
    for (const key in attrs) {
        if (key.startsWith("on") && typeof attrs[key] === "function") {
            events[key] = attrs[key];
        } else {
            rest[key] = attrs[key];
        }
    }
    return { events, rest };
});
</script>

<template>
    <!-- 模板中仍然可以直接用 $attrs -->
    <div v-bind="eventAttrs.rest">
        <input v-bind="eventAttrs.events" />
    </div>
</template>
```

```vue
<!-- 实际场景：包装 input 组件 -->
<script setup>
import { useAttrs, computed } from "vue";

defineOptions({ inheritAttrs: false }); // 关闭自动透传

const props = defineProps({
    label: String,
    error: String,
});

const attrs = useAttrs();

// 过滤掉某些属性，只将特定属性传给 input
const inputAttrs = computed(() => {
    const { class: className, style, ...rest } = attrs;
    return rest; // 不将 class 和 style 传给 input
});
</script>

<template>
    <div class="form-field" :class="attrs.class" :style="attrs.style">
        <label v-if="label">{{ label }}</label>
        <input v-bind="inputAttrs" />
        <span v-if="error" class="error">{{ error }}</span>
    </div>
</template>
```

### 内部原理

#### useAttrs 的实现

```
useAttrs 的内部实现（简化）：

function useAttrs() {
    // 获取当前组件实例
    const instance = getCurrentInstance();
    // 返回实例的 attrs 对象
    return instance.attrs;
    // 这个对象是响应式的（Proxy 代理）
    // 父组件更新属性时，attrs 自动更新
}

useAttrs 与 $attrs 的关系：
  → useAttrs() 返回的就是 instance.attrs
  → 模板中的 $attrs 也是 instance.attrs
  → 两者是同一个对象引用
  → 都是响应式的，属性变化时自动更新
```

### 与相关API的对比

| 访问方式 | 使用位置 | 返回值 |
|---------|---------|-------|
| `$attrs` | 模板 | attrs 对象 |
| `useAttrs()` | script setup | attrs 对象（同一个） |
| `setup(props, { attrs })` | 显式 setup | attrs 对象（同一个） |
| `this.$attrs` | Options API | attrs 对象 |

### 适用场景

- **属性分发：** 将 attrs 拆分后传给不同的内部元素
- **条件逻辑：** 根据 attrs 中的属性决定渲染逻辑
- **包装组件：** 开发通用包装组件时处理透传属性
- **日志/调试：** 打印查看当前组件接收到的所有透传属性

### 常见问题

#### useAttrs 和 defineProps 的配合

**解决方案：**

```vue
<script setup>
import { useAttrs } from "vue";

// defineProps 声明的属性不会出现在 attrs 中
const props = defineProps({
    modelValue: String,
    label: String,
});

// defineEmits 声明的事件也不会出现在 attrs 中
const emit = defineEmits(["update:modelValue"]);

const attrs = useAttrs();
// attrs 中只有未声明的属性
// 比如 id, class, style, placeholder, disabled 等
</script>
```

### 注意事项

- useAttrs 返回的是响应式对象，不需要额外包装
- 与模板中的 $attrs 是同一个对象
- 声明为 props 或 emits 的属性不在 attrs 中
- 配合 `inheritAttrs: false` 手动控制属性透传位置
- 不要解构 useAttrs 的返回值（会丢失响应性）
- attrs 中的事件名以 "on" 前缀命名（如 onClick）

### 总结

useAttrs 是在 script setup 中访问 $attrs 的组合式函数，返回包含所有未声明透传属性的响应式对象。适合需要在 JavaScript 逻辑中处理透传属性的场景，如属性拆分、条件判断、包装组件等。配合 `inheritAttrs: false` 可以完全控制属性的透传目标。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### v-bind="$attrs"的批量透传

### 概念说明

`v-bind="$attrs"` 是将 `$attrs` 中的所有属性一次性绑定到指定元素上的语法。当组件有多个根元素，或者需要将透传属性绑定到非根元素时，需要配合 `inheritAttrs: false` 关闭自动透传，然后手动使用 `v-bind="$attrs"` 指定属性的接收目标。

`v-bind` 不带参数时接收一个对象，将对象的每个键值对作为独立的属性绑定到元素上。`$attrs` 本身就是一个对象，所以 `v-bind="$attrs"` 会将所有透传属性展开绑定，包括 class、style、id、data-* 属性和事件监听器等。

### 基本示例

```vue
<!-- 包装组件：将 attrs 透传到内部的 input 元素 -->
<script setup>
defineOptions({
    inheritAttrs: false, // 关闭自动透传到根元素
});

defineProps({
    label: String,
});
</script>

<template>
    <div class="form-item">
        <label>{{ label }}</label>
        <!-- 将所有透传属性绑定到 input 上 -->
        <input v-bind="$attrs" />
        <!-- 
            父组件传的 id, class, placeholder, disabled,
            @input, @focus 等都会绑定到这个 input 上
        -->
    </div>
</template>
```

```vue
<!-- 父组件使用 -->
<script setup>
import FormInput from "./FormInput.vue";
</script>

<template>
    <FormInput
        label="用户名"
        id="username"
        class="custom-input"
        placeholder="请输入用户名"
        maxlength="20"
        @input="handleInput"
        @focus="handleFocus"
    />
    <!--
        label → 被 defineProps 接收
        其余所有属性 → 通过 v-bind="$attrs" 绑定到 input
    -->
</template>
```

```vue
<!-- 多根元素组件 -->
<script setup>
defineOptions({ inheritAttrs: false });
</script>

<template>
    <!-- 多根元素：必须手动指定 $attrs 绑定目标 -->
    <header>头部</header>
    <main v-bind="$attrs">
        <slot />
    </main>
    <footer>底部</footer>
</template>
```

### 内部原理

#### v-bind="$attrs" 的编译和渲染

```
v-bind="$attrs" 的处理过程：

1. 模板编译：
   <input v-bind="$attrs" />
   编译为：
   h('input', _mergeProps(_ctx.$attrs))

2. 渲染时：
   → $attrs = { id: 'username', placeholder: '...', onInput: fn }
   → 展开为独立属性绑定到 input 元素
   → 等价于 <input id="username" placeholder="..." @input="fn" />

3. 与其他属性合并：
   <input v-bind="$attrs" class="base" />
   → class 会合并：$attrs.class + "base"
   → 不会覆盖，而是智能合并

4. inheritAttrs: false 的效果：
   → 关闭 → $attrs 不自动绑定到根元素
   → 开启（默认）→ $attrs 自动绑定到根元素
   → 关闭后需要手动 v-bind="$attrs"
```

### 与相关API的对比

| 场景 | 写法 | 效果 |
|------|------|------|
| 默认透传（单根） | 不写 | 自动绑定到根元素 |
| 手动透传 | `v-bind="$attrs"` | 绑定到指定元素 |
| 部分透传 | `v-bind="filteredAttrs"` | 绑定过滤后的属性 |
| 禁止透传 | `inheritAttrs: false` 且不绑定 | 属性不透传 |

### 适用场景

- **包装原生元素：** input、select、textarea 的封装
- **多根元素组件：** 指定 attrs 的绑定目标
- **高阶组件：** 透传属性到内部组件
- **组件库开发：** 允许用户自定义内部元素属性

### 常见问题

#### class 和 style 的合并行为

**解决方案：**

```vue
<script setup>
defineOptions({ inheritAttrs: false });
</script>

<template>
    <!--
        如果父组件传了 class="custom"
        $attrs.class = "custom"
        这里会合并为 class="base custom"
    -->
    <div class="base" v-bind="$attrs">
        <slot />
    </div>
</template>
```

### 注意事项

- 使用 v-bind="$attrs" 前通常要设置 inheritAttrs: false
- class 和 style 会智能合并，不是简单覆盖
- 事件监听器也会通过 $attrs 透传
- 多根元素组件不设 v-bind="$attrs" 会输出警告
- 可以配合 useAttrs 过滤后再绑定部分属性
- $attrs 是响应式的，父组件属性变化时自动更新

### 总结

`v-bind="$attrs"` 将所有透传属性批量绑定到指定元素。配合 `inheritAttrs: false` 可以精确控制属性的绑定目标。class 和 style 会智能合并。适合包装原生元素、多根元素组件和组件库开发场景。事件监听器也会通过 $attrs 一并透传。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### inheritAttrs选项的继承控制

### 概念说明

`inheritAttrs` 是一个组件选项，控制是否将 `$attrs` 中的属性自动透传到组件的根元素上。默认值为 `true`，即自动透传。设置为 `false` 时，Vue 不会自动将透传属性绑定到根元素，开发者需要手动通过 `v-bind="$attrs"` 决定属性绑定到哪个元素上。

这个选项在开发包装组件时非常常用。比如封装一个 input 组件时，你希望 placeholder、maxlength 等属性绑定到内部的 input 元素，而不是外层的 div 容器。此时设置 `inheritAttrs: false`，然后在 input 上使用 `v-bind="$attrs"`。

需要注意的是，`inheritAttrs: false` 不影响 `class` 和 `style` 的绑定行为——它们始终会透传到根元素上。不过在 Vue 3 中，如果设置了 `inheritAttrs: false`，class 和 style 也会被包含在 $attrs 中并遵循手动绑定规则。

### 基本示例

```vue
<!-- 示例说明：inheritAttrs 的开启和关闭对比 -->

<!-- ===== inheritAttrs: true（默认）===== -->
<!-- 子组件 ButtonDefault.vue -->
<template>
    <div class="wrapper">
        <button>点击</button>
    </div>
</template>

<!-- 父组件使用 -->
<!-- <ButtonDefault id="my-btn" class="custom" @click="fn" /> -->
<!-- 渲染结果：id、class、@click 自动绑定到根元素 div 上 -->
<!-- <div class="wrapper custom" id="my-btn"> -->
<!--     <button>点击</button> -->
<!-- </div> -->
<!-- 问题：click 绑定在 div 上，而不是 button 上 -->


<!-- ===== inheritAttrs: false ===== -->
<!-- 子组件 ButtonCustom.vue -->
<script setup>
defineOptions({
    inheritAttrs: false, // 关闭自动透传
});
</script>

<template>
    <div class="wrapper">
        <!-- 手动将 $attrs 绑定到 button 上 -->
        <button v-bind="$attrs">点击</button>
    </div>
</template>

<!-- 父组件使用 -->
<!-- <ButtonCustom id="my-btn" class="custom" @click="fn" /> -->
<!-- 渲染结果：id、class、@click 绑定到 button 上 -->
<!-- <div class="wrapper"> -->
<!--     <button id="my-btn" class="custom">点击</button> -->
<!-- </div> -->
```

### 内部原理

#### inheritAttrs 的工作机制

```
inheritAttrs 在渲染时的处理：

1. 渲染子组件时：
   → 收集 $attrs（未声明的属性和事件）

2. if (inheritAttrs !== false) {
       // 默认行为：将 $attrs 合并到根元素的 props 上
       rootVNode.props = mergeProps(rootVNode.props, attrs);
   }

3. if (inheritAttrs === false) {
       // 不自动合并
       // $attrs 仍然可用（通过 $attrs 或 useAttrs）
       // 但不会绑定到任何元素上
       // 需要开发者手动 v-bind="$attrs"
   }

设置方式（Vue 3）：
  → Options API: export default { inheritAttrs: false }
  → script setup: defineOptions({ inheritAttrs: false })
  → 额外 <script> 块: export default { inheritAttrs: false }
```

### 与相关API的对比

| 配置 | $attrs 自动透传 | 手动透传 | class/style 行为 |
|------|---------------|---------|----------------|
| inheritAttrs: true | 是（到根元素） | 也可以 | 合并到根元素 |
| inheritAttrs: false | 否 | 需要手动 | 包含在 $attrs 中 |

### 适用场景

- **表单组件封装：** input、select、textarea 的包装
- **多根元素组件：** 指定透传目标
- **样式隔离：** 不希望外部 class 影响根元素
- **组件库开发：** 精确控制属性绑定位置

### 常见问题

#### script setup 中如何设置 inheritAttrs

**解决方案：**

```vue
<!-- 方式1：defineOptions（Vue 3.3+，推荐） -->
<script setup>
defineOptions({
    inheritAttrs: false,
});
</script>

<!-- 方式2：额外 <script> 块 -->
<script>
export default {
    inheritAttrs: false,
};
</script>
<script setup>
// Composition API 逻辑
</script>
```

### 注意事项

- 默认 inheritAttrs 为 true，属性自动透传到根元素
- 设置 false 后需要手动 v-bind="$attrs"
- 多根元素组件默认不透传（即使 inheritAttrs 为 true）
- Vue 3.3+ 可以用 defineOptions 设置
- inheritAttrs: false 不影响 props 和 emits 的正常工作
- 常与 v-bind="$attrs" 配合使用

### 总结

inheritAttrs 控制 $attrs 是否自动透传到根元素。默认为 true 自动透传。设置为 false 时需要手动 `v-bind="$attrs"` 指定绑定目标。适合封装表单组件和需要精确控制属性位置的场景。Vue 3.3+ 使用 defineOptions 在 script setup 中设置。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### $refs的模板引用获取

### 概念说明

模板引用（Template Refs）是 Vue 提供的直接访问 DOM 元素或子组件实例的机制。通过在模板中给元素或组件添加 `ref` 属性，然后在 JavaScript 中通过 ref 变量或 `$refs` 对象访问对应的 DOM 元素或组件实例。

在 Composition API 中，通过声明一个同名的 ref 变量来获取模板引用。在 Options API 中，通过 `this.$refs` 访问。模板引用只在组件挂载后才可用（mounted 之后），在 beforeMount 阶段 ref 的值为 null。

Vue 3.5+ 引入了 `useTemplateRef()` 函数，提供更清晰的模板引用方式，不再要求变量名与 ref 属性值一致。

### 基本示例

```vue
<!-- Composition API 模板引用 -->
<script setup>
import { ref, onMounted, useTemplateRef } from "vue";

// 方式1：同名 ref（Vue 3.0+）
// ref 变量名必须与模板中的 ref 属性值一致
const inputRef = ref(null);

// 方式2：useTemplateRef（Vue 3.5+，推荐）
// 变量名不需要与 ref 属性值一致
const myInput = useTemplateRef("input-el");

onMounted(() => {
    // 挂载后才能访问
    console.log(inputRef.value);   // <input> DOM 元素
    console.log(myInput.value);    // <input> DOM 元素

    // 可以直接操作 DOM
    inputRef.value.focus();
});

// 注意：挂载前 ref 为 null
console.log(inputRef.value); // null
</script>

<template>
    <!-- 方式1：ref 属性值与变量名一致 -->
    <input ref="inputRef" placeholder="方式1" />

    <!-- 方式2：ref 属性值与 useTemplateRef 参数一致 -->
    <input ref="input-el" placeholder="方式2" />
</template>
```

```vue
<!-- v-for 中的模板引用 -->
<script setup>
import { ref, onMounted } from "vue";

const items = ref(["A", "B", "C"]);

// v-for 中的 ref 会收集为数组
const itemRefs = ref([]);

onMounted(() => {
    console.log(itemRefs.value); // [li, li, li] DOM 元素数组
    // 注意：数组顺序不保证与源数组一致
});
</script>

<template>
    <ul>
        <li v-for="item in items" :key="item" ref="itemRefs">
            {{ item }}
        </li>
    </ul>
</template>
```

### 内部原理

#### 模板引用的绑定时机

```
模板引用的工作流程：

1. 模板编译时：
   <input ref="inputRef" />
   编译为 VNode：{ ref: 'inputRef', ... }

2. 组件挂载时（patch 阶段）：
   → 创建或更新真实 DOM
   → 检查 VNode 是否有 ref
   → 有 ref → 设置引用

3. 设置引用的逻辑：
   → 如果 ref 是字符串 → 查找 setupState 中的同名 ref
   → 找到 → ref.value = el（DOM 元素或组件实例）
   → 如果在 v-for 中 → ref.value 收集为数组

4. 组件卸载时：
   → ref.value = null（清除引用）

时机：
  beforeMount → ref.value === null
  mounted → ref.value === DOM 元素
  beforeUnmount → ref.value === DOM 元素
  unmounted → ref.value === null
```

### 与相关API的对比

| 方式 | 语法 | 适用版本 | 特点 |
|------|------|---------|------|
| 同名 ref | `const el = ref(null)` | 3.0+ | 变量名须与 ref 属性一致 |
| useTemplateRef | `useTemplateRef('name')` | 3.5+ | 变量名可自定义 |
| $refs | `this.$refs.name` | Options API | 通过 this 访问 |

### 适用场景

- **DOM 操作：** 聚焦输入框、滚动到指定位置
- **第三方库集成：** 将 DOM 元素传给第三方库初始化
- **获取组件实例：** 调用子组件暴露的方法
- **Canvas/Video：** 操作 canvas 或 video 元素

### 常见问题

#### ref 在 onMounted 之前为 null

**解决方案：**

```vue
<script setup>
import { ref, onMounted, watchEffect } from "vue";

const el = ref(null);

// 错误：setup 阶段还没挂载
// el.value.focus(); // TypeError: Cannot read property 'focus' of null

// 正确1：在 onMounted 中访问
onMounted(() => {
    el.value?.focus();
});

// 正确2：用 watchEffect 等待 ref 可用
watchEffect(() => {
    if (el.value) {
        el.value.focus();
    }
});
</script>

<template>
    <input ref="el" />
</template>
```

### 注意事项

- 模板引用只在 mounted 之后可用
- v-for 中的 ref 收集为数组，顺序不保证
- 对组件使用 ref 获取的是组件实例（script setup 需要 defineExpose）
- Vue 3.5+ 推荐使用 useTemplateRef
- 不要过度使用 ref 操作 DOM，优先使用声明式绑定
- 条件渲染的元素在隐藏时 ref 为 null

### 总结

模板引用通过 ref 属性获取 DOM 元素或组件实例。Composition API 中用同名 ref 或 useTemplateRef（3.5+）获取。引用只在 mounted 之后可用。v-for 中的 ref 收集为数组。对组件使用 ref 时需要配合 defineExpose。优先使用声明式绑定，ref 适合必须直接操作 DOM 的场景。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### 模板引用的组件实例暴露

### 概念说明

当对一个子组件使用模板引用（ref）时，获取到的是子组件的实例。在 Options API 中，父组件可以通过 ref 访问子组件实例上的所有属性和方法。但在 `<script setup>` 中，组件默认是封闭的，父组件通过 ref 无法访问任何内部内容，子组件必须通过 `defineExpose` 显式暴露才行。

这种封闭行为是 `<script setup>` 的特性，目的是让组件的公开接口更加明确。子组件只暴露父组件需要调用的方法和属性，内部实现细节保持私有。这遵循了最小暴露原则，让组件间的耦合度更低。

### 基本示例

```vue
<!-- 子组件 FormDialog.vue -->
<script setup>
import { ref } from "vue";

// 内部状态
const visible = ref(false);
const formData = ref({ name: "", email: "" });

// 内部方法
function open() {
    visible.value = true;
}

function close() {
    visible.value = false;
    formData.value = { name: "", email: "" };
}

function validate() {
    // 验证逻辑
    const isValid = formData.value.name && formData.value.email;
    return isValid;
}

function internalHelper() {
    // 不需要暴露给外部的内部方法
}

// 只暴露父组件需要的方法
defineExpose({
    open,
    close,
    validate,
});
</script>

<template>
    <div v-if="visible" class="dialog">
        <input v-model="formData.name" placeholder="姓名" />
        <input v-model="formData.email" placeholder="邮箱" />
        <button @click="close">关闭</button>
    </div>
</template>
```

```vue
<!-- 父组件 -->
<script setup>
import { ref } from "vue";
import FormDialog from "./FormDialog.vue";

const dialogRef = ref(null);

function showDialog() {
    // 调用子组件暴露的方法
    dialogRef.value?.open();
}

async function handleSubmit() {
    // 调用子组件暴露的方法
    const isValid = dialogRef.value?.validate();
    if (isValid) {
        // 提交逻辑
        dialogRef.value?.close();
    }
}

// 无法访问未暴露的内容
// dialogRef.value?.formData;       // undefined
// dialogRef.value?.internalHelper; // undefined
</script>

<template>
    <button @click="showDialog">打开弹窗</button>
    <button @click="handleSubmit">提交</button>
    <FormDialog ref="dialogRef" />
</template>
```

### 内部原理

#### 组件 ref 的获取过程

```
组件模板引用的工作流程：

1. 模板中 <ChildComponent ref="childRef" />

2. 子组件挂载时：
   → Options API：ref.value = 组件实例（proxy）
     → 可以访问所有 data/methods/computed
   → script setup：ref.value = exposed 对象
     → 默认 exposed = {}（空对象）
     → defineExpose({...}) 覆盖 exposed

3. 父组件访问 childRef.value 时：
   → Options API：返回完整的组件代理实例
   → script setup：返回 exposed 对象
     → 只包含 defineExpose 声明的内容
     → ref 类型的值会自动解包

4. 为什么 script setup 默认封闭：
   → 编译时自动调用 expose()（空参数）
   → 关闭了实例的公开访问
   → 必须通过 defineExpose 主动打开
```

### 与相关API的对比

| 组件类型 | ref 获取的内容 | 暴露控制 |
|---------|-------------|---------|
| Options API | 完整组件实例 | 默认全部暴露 |
| script setup（无 defineExpose） | 空对象 | 全部封闭 |
| script setup（有 defineExpose） | exposed 对象 | 选择性暴露 |
| Options API + expose 选项 | expose 中的内容 | 选择性暴露 |

### 适用场景

- **弹窗/抽屉控制：** 暴露 open/close 方法
- **表单组件：** 暴露 validate/reset 方法
- **滚动容器：** 暴露 scrollTo 方法
- **编辑器组件：** 暴露 getValue/setValue 方法

### 常见问题

#### TypeScript 中获取子组件暴露内容的类型

**解决方案：**

```vue
<script setup lang="ts">
import { ref } from "vue";
import FormDialog from "./FormDialog.vue";

// InstanceType 获取组件实例类型
// 包含 defineExpose 暴露的内容类型
const dialogRef = ref<InstanceType<typeof FormDialog> | null>(null);

// 类型提示：dialogRef.value?.open / close / validate
dialogRef.value?.open(); // 有类型提示
</script>
```

### 注意事项

- script setup 组件默认封闭，需要 defineExpose 暴露
- Options API 组件默认暴露所有内容
- 暴露的 ref 会自动解包（父组件不需要 .value）
- 模板引用只在 mounted 之后可用
- 推荐只暴露必要的公开接口
- TypeScript 中用 InstanceType 获取类型

### 总结

对组件使用模板引用时，script setup 组件默认封闭，需要 defineExpose 显式暴露属性和方法。Options API 组件默认暴露所有内容。推荐只暴露必要的公开接口，保持组件间低耦合。TypeScript 中通过 InstanceType 获取组件暴露内容的类型。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### v-model的双向绑定语法糖

### 概念说明

`v-model` 是 Vue 提供的双向绑定语法糖，它在不同元素上有不同的展开方式。在原生表单元素（input、textarea、select）上，v-model 会根据元素类型自动选择正确的属性和事件来绑定。在自定义组件上，v-model 展开为一个 prop 和一个 emit 事件的组合。

Vue 3 中组件上的 `v-model` 默认使用 `modelValue` 作为 prop 名，`update:modelValue` 作为事件名。Vue 2 中使用的是 `value` 和 `input`。Vue 3 还支持多个 v-model 绑定到同一个组件上，通过 `v-model:propName` 指定不同的 prop 名。

v-model 本质上只是简化了 `:prop + @event` 的写法，没有引入新的机制，所以叫做"语法糖"。

### 基本示例

```html
<!-- 示例说明：v-model 在不同元素上的展开 -->

<!-- ===== 原生 input =====  -->
<input v-model="message" />
<!-- 等价于 -->
<input :value="message" @input="message = $event.target.value" />

<!-- ===== 原生 textarea ===== -->
<textarea v-model="content"></textarea>
<!-- 等价于 -->
<textarea :value="content" @input="content = $event.target.value"></textarea>

<!-- ===== 原生 checkbox ===== -->
<input type="checkbox" v-model="checked" />
<!-- 等价于 -->
<input type="checkbox" :checked="checked" @change="checked = $event.target.checked" />

<!-- ===== 原生 select ===== -->
<select v-model="selected">
    <option value="a">A</option>
    <option value="b">B</option>
</select>
<!-- 等价于 -->
<select :value="selected" @change="selected = $event.target.value">
    <option value="a">A</option>
    <option value="b">B</option>
</select>

<!-- ===== 自定义组件 ===== -->
<MyInput v-model="username" />
<!-- Vue 3 等价于 -->
<MyInput :modelValue="username" @update:modelValue="username = $event" />
```

```vue
<!-- 子组件实现 v-model 支持 -->
<script setup>
// 方式1：传统写法
// const props = defineProps(['modelValue']);
// const emit = defineEmits(['update:modelValue']);
// function handleInput(e) {
//     emit('update:modelValue', e.target.value);
// }

// 方式2：defineModel（Vue 3.4+，推荐）
const model = defineModel();
</script>

<template>
    <!-- 方式1 -->
    <!-- <input :value="modelValue" @input="handleInput" /> -->

    <!-- 方式2 -->
    <input v-model="model" />
</template>
```

### 内部原理

#### v-model 的编译转换

```
v-model 在模板编译时的转换：

原生元素：
  <input v-model="msg" />
  编译为：
  h('input', {
      value: msg,
      onInput: (e) => { msg = e.target.value }
  })

  <input type="checkbox" v-model="checked" />
  编译为：
  h('input', {
      type: 'checkbox',
      checked: checked,
      onChange: (e) => { checked = e.target.checked }
  })

组件：
  <MyComp v-model="val" />
  编译为：
  h(MyComp, {
      modelValue: val,
      'onUpdate:modelValue': (v) => { val = v }
  })

命名 v-model：
  <MyComp v-model:title="t" />
  编译为：
  h(MyComp, {
      title: t,
      'onUpdate:title': (v) => { t = v }
  })
```

### 与相关API的对比

| 元素/组件 | prop | 事件 | Vue 版本 |
|----------|------|------|---------|
| input[text] | value | input | 2 & 3 |
| input[checkbox] | checked | change | 2 & 3 |
| select | value | change | 2 & 3 |
| 组件（Vue 2） | value | input | 2 |
| 组件（Vue 3） | modelValue | update:modelValue | 3 |

### 适用场景

- **表单绑定：** input、textarea、select 等表单元素
- **自定义表单组件：** 封装的输入组件
- **双向数据流：** 需要父子组件同步状态的场景

### 常见问题

#### v-model 修饰符的作用

**解决方案：**

```html
<!-- .lazy：将 input 事件改为 change 事件 -->
<!-- 不是实时同步，而是失焦或回车时才同步 -->
<input v-model.lazy="msg" />

<!-- .number：将输入值转为数字 -->
<input v-model.number="age" type="number" />

<!-- .trim：去除输入值首尾空格 -->
<input v-model.trim="name" />

<!-- 修饰符可以组合 -->
<input v-model.lazy.trim="msg" />
```

### 注意事项

- v-model 是语法糖，本质是 :prop + @event
- Vue 3 组件上用 modelValue/update:modelValue
- Vue 3 支持多个 v-model（v-model:name）
- 原生元素上 v-model 根据元素类型自动适配
- .lazy 修饰符将 input 事件改为 change 事件
- Vue 3.4+ 推荐用 defineModel 简化组件内部实现

### 总结

v-model 是 Vue 的双向绑定语法糖，在原生元素上自动选择正确的属性和事件，在组件上展开为 modelValue prop 和 update:modelValue 事件。Vue 3 支持多个 v-model 和内置修饰符（.lazy/.number/.trim）。Vue 3.4+ 的 defineModel 进一步简化了组件内部的 v-model 实现。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### v-model的modelValue与update:modelValue

### 概念说明

在 Vue 3 中，组件上的 `v-model` 默认使用 `modelValue` 作为 prop 名，`update:modelValue` 作为事件名。这是 Vue 3 相比 Vue 2 的一个重要变化——Vue 2 中组件 v-model 使用的是 `value` prop 和 `input` 事件。

这个变化的原因是：Vue 2 中组件只能有一个 v-model，且绑定的 prop 名固定为 value，限制了组件设计的灵活性。Vue 3 采用 `modelValue` + `update:modelValue` 的命名约定后，通过 `v-model:propName` 语法可以支持多个 v-model，每个 v-model 对应不同的 prop 名和 `update:propName` 事件。

子组件要支持 v-model，需要接收 `modelValue` prop 并在值变化时触发 `update:modelValue` 事件。Vue 3.4+ 的 `defineModel` 将这个过程简化为一行代码。

### 基本示例

```vue
<!-- 子组件 CustomInput.vue：手动实现 v-model -->
<script setup>
// 声明 modelValue prop 和 update:modelValue 事件
const props = defineProps({
    modelValue: {
        type: String,
        default: "",
    },
});

const emit = defineEmits(["update:modelValue"]);

// 输入变化时触发 update:modelValue 事件
function handleInput(event) {
    emit("update:modelValue", event.target.value);
}
</script>

<template>
    <!-- 绑定 modelValue 到 input 的 value -->
    <!-- 监听 input 事件触发 update:modelValue -->
    <input :value="modelValue" @input="handleInput" />
</template>
```

```vue
<!-- 父组件使用 -->
<script setup>
import { ref } from "vue";
import CustomInput from "./CustomInput.vue";

const username = ref("");
</script>

<template>
    <!-- v-model 语法糖 -->
    <CustomInput v-model="username" />

    <!-- 等价于手动写法 -->
    <CustomInput
        :modelValue="username"
        @update:modelValue="username = $event"
    />

    <p>输入值: {{ username }}</p>
</template>
```

```vue
<!-- 使用 computed 实现双向绑定（常见模式） -->
<script setup>
import { computed } from "vue";

const props = defineProps({
    modelValue: String,
});

const emit = defineEmits(["update:modelValue"]);

// 用 computed 的 get/set 创建一个可写的中间变量
const innerValue = computed({
    get() {
        return props.modelValue;
    },
    set(newVal) {
        emit("update:modelValue", newVal);
    },
});
</script>

<template>
    <!-- 可以直接用 v-model 绑定 computed -->
    <input v-model="innerValue" />
</template>
```

### 内部原理

#### modelValue/update:modelValue 的编译展开

```
v-model 的编译过程：

<MyComp v-model="val" />

编译为 VNode 的 props：
{
    modelValue: val.value,
    'onUpdate:modelValue': ($event) => {
        val.value = $event;
    }
}

子组件内部：
  → props.modelValue 接收父组件的值
  → emit('update:modelValue', newVal) 通知父组件更新
  → 父组件收到事件后更新 val.value
  → val.value 变化触发子组件 props 更新
  → 子组件重新渲染

Vue 2 vs Vue 3 对比：
  Vue 2: { value: val, onInput: handler }
  Vue 3: { modelValue: val, 'onUpdate:modelValue': handler }
```

### 与相关API的对比

| 版本 | prop 名 | 事件名 | 多 v-model |
|------|---------|--------|-----------|
| Vue 2 | value | input | 不支持 |
| Vue 2 (.sync) | propName | update:propName | 通过 .sync |
| Vue 3 | modelValue | update:modelValue | 支持 |
| Vue 3 (命名) | propName | update:propName | 支持 |

### 适用场景

- **表单组件：** 自定义 input、select、datepicker 等
- **状态同步：** 父子组件需要同步某个值
- **组件库开发：** 对外提供 v-model 接口

### 常见问题

#### 从 Vue 2 迁移到 Vue 3 的 v-model 变化

**解决方案：**

```javascript
// Vue 2 写法
export default {
    props: ["value"],  // Vue 2 用 value
    methods: {
        update(val) {
            this.$emit("input", val); // Vue 2 用 input 事件
        },
    },
};

// Vue 3 写法
export default {
    props: ["modelValue"],  // Vue 3 用 modelValue
    emits: ["update:modelValue"],
    methods: {
        update(val) {
            this.$emit("update:modelValue", val); // Vue 3 用 update:modelValue
        },
    },
};

// Vue 3.4+ defineModel 写法
// const model = defineModel();
// 一行搞定，不需要手动声明 props 和 emits
```

### 注意事项

- Vue 3 组件 v-model 用 modelValue 而非 value
- 事件名是 update:modelValue（带冒号）
- 子组件不应直接修改 modelValue prop
- 使用 computed get/set 是常见的中间层模式
- Vue 3.4+ 推荐使用 defineModel 简化实现
- 多个 v-model 用 v-model:name 语法

### 总结

Vue 3 组件的 v-model 使用 modelValue 作为 prop、update:modelValue 作为事件。子组件接收 modelValue 并在变化时 emit update:modelValue。computed get/set 是实现双向绑定的常见模式。Vue 3.4+ 的 defineModel 将这个过程简化为一行代码。Vue 3 还支持通过 v-model:name 实现多个双向绑定。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### v-model的参数自定义(多个v-model)

### 概念说明

Vue 3 支持在一个组件上同时使用多个 `v-model`，每个 v-model 可以绑定不同的 prop。语法是 `v-model:propName="value"`，其中 propName 就是自定义的 prop 名称，对应的事件名是 `update:propName`。

这是 Vue 3 相比 Vue 2 的重大改进。Vue 2 只支持一个 v-model（绑定 value/input），额外的双向绑定需要用 `.sync` 修饰符。Vue 3 取消了 `.sync`，统一用 `v-model:name` 的语法来实现多个双向绑定，语义更一致。

不带参数的 `v-model` 等价于 `v-model:modelValue`，这是默认的 prop 名。带参数的 v-model 可以自定义 prop 名，一个组件可以同时有多个。

### 基本示例

```vue
<!-- 子组件 UserForm.vue -->
<script setup>
// 方式1：手动声明多个 prop 和 emit
// const props = defineProps({
//     firstName: String,
//     lastName: String,
//     age: Number,
// });
// const emit = defineEmits([
//     'update:firstName',
//     'update:lastName',
//     'update:age',
// ]);

// 方式2：使用 defineModel（Vue 3.4+，推荐）
const firstName = defineModel("firstName", { type: String, default: "" });
const lastName = defineModel("lastName", { type: String, default: "" });
const age = defineModel("age", { type: Number, default: 0 });
</script>

<template>
    <div class="user-form">
        <label>
            姓：<input v-model="firstName" />
        </label>
        <label>
            名：<input v-model="lastName" />
        </label>
        <label>
            年龄：<input v-model.number="age" type="number" />
        </label>
    </div>
</template>
```

```vue
<!-- 父组件 -->
<script setup>
import { ref } from "vue";
import UserForm from "./UserForm.vue";

const first = ref("张");
const last = ref("三");
const userAge = ref(25);
</script>

<template>
    <!-- 多个 v-model 同时使用 -->
    <UserForm
        v-model:firstName="first"
        v-model:lastName="last"
        v-model:age="userAge"
    />

    <!-- 等价于手动写法 -->
    <!--
    <UserForm
        :firstName="first"
        @update:firstName="first = $event"
        :lastName="last"
        @update:lastName="last = $event"
        :age="userAge"
        @update:age="userAge = $event"
    />
    -->

    <p>姓名：{{ first }}{{ last }}，年龄：{{ userAge }}</p>
</template>
```

### 内部原理

#### 多 v-model 的编译展开

```
多 v-model 的编译转换：

<UserForm
    v-model:firstName="first"
    v-model:lastName="last"
    v-model:age="userAge"
/>

编译为：
h(UserForm, {
    firstName: first.value,
    'onUpdate:firstName': (v) => { first.value = v },
    lastName: last.value,
    'onUpdate:lastName': (v) => { last.value = v },
    age: userAge.value,
    'onUpdate:age': (v) => { userAge.value = v },
})

每个 v-model:xxx 都展开为：
  → :xxx="value"（prop 绑定）
  → @update:xxx="value = $event"（事件监听）
```

### 与相关API的对比

| 语法 | prop 名 | 事件名 | 场景 |
|------|---------|--------|------|
| `v-model` | modelValue | update:modelValue | 默认双向绑定 |
| `v-model:title` | title | update:title | 自定义名称 |
| `v-model:firstName` | firstName | update:firstName | 多个双向绑定 |
| Vue 2 `.sync` | propName | update:propName | Vue 2 多双向（已废弃） |

### 适用场景

- **表单组件：** 多个表单字段需要独立双向绑定
- **复杂组件：** 弹窗的 visible + content 同时双向绑定
- **布局组件：** 侧边栏的 collapsed + width 双向绑定

### 常见问题

#### 默认 v-model 和命名 v-model 混用

**解决方案：**

```vue
<script setup>
// 默认 v-model（modelValue）
const value = defineModel({ type: String, default: "" });

// 命名 v-model
const title = defineModel("title", { type: String, default: "" });
const visible = defineModel("visible", { type: Boolean, default: false });
</script>

<!-- 父组件：三个 v-model 同时使用 -->
<!-- <MyComp v-model="val" v-model:title="t" v-model:visible="show" /> -->
```

### 注意事项

- Vue 3 支持多个 v-model，Vue 2 只支持一个
- 每个 v-model:name 对应一个 prop 和一个 update:name 事件
- 不带参数的 v-model 等价于 v-model:modelValue
- Vue 2 的 .sync 在 Vue 3 中被 v-model:name 替代
- 每个 v-model 都可以独立使用修饰符
- Vue 3.4+ 的 defineModel 支持命名参数

### 总结

Vue 3 通过 `v-model:propName` 语法支持多个双向绑定，每个绑定对应独立的 prop 和 update:propName 事件。取代了 Vue 2 的 .sync 修饰符，语义更统一。不带参数的 v-model 等价于 v-model:modelValue。Vue 3.4+ 的 defineModel 支持命名参数，进一步简化了多 v-model 的实现。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### v-model的修饰符(.lazy/.number/.trim)

### 概念说明

Vue 为 `v-model` 提供了三个内置修饰符：`.lazy`、`.number` 和 `.trim`，用于在数据同步时自动进行常见的值转换处理。

`.lazy` 将默认的 `input` 事件改为 `change` 事件，即不在每次输入时同步，而是在输入框失焦或按回车时才同步数据。`.number` 将用户输入的值自动转换为数字类型（内部使用 parseFloat，如果无法转换则保留原始字符串）。`.trim` 自动去除用户输入内容首尾的空白字符。

这三个修饰符可以单独使用，也可以组合使用（如 `.lazy.trim`）。在自定义组件上使用时，修饰符信息会通过 `modelModifiers` prop 传递给子组件。

### 基本示例

```html
<!-- 示例说明：三个内置修饰符的效果 -->

<script setup>
import { ref } from "vue";

const message = ref("");
const age = ref(0);
const username = ref("");
const search = ref("");
</script>

<template>
    <!-- ===== .lazy 修饰符 ===== -->
    <!-- 默认：input 事件（每次按键都同步） -->
    <input v-model="message" />

    <!-- .lazy：change 事件（失焦或回车才同步） -->
    <input v-model.lazy="message" />
    <!-- 适合不需要实时同步的场景，比如搜索框 -->

    <!-- ===== .number 修饰符 ===== -->
    <!-- 默认：输入的值是字符串 -->
    <input v-model="age" type="number" />
    <!-- typeof age === 'string'（即使设了 type="number"） -->

    <!-- .number：自动转为数字 -->
    <input v-model.number="age" type="number" />
    <!-- typeof age === 'number' -->
    <!-- 输入 "abc" → 保留字符串 "abc"（parseFloat 失败） -->
    <!-- 输入 "123abc" → 转为数字 123 -->

    <!-- ===== .trim 修饰符 ===== -->
    <!-- 默认：保留首尾空格 -->
    <input v-model="username" />
    <!-- 输入 "  张三  " → username = "  张三  " -->

    <!-- .trim：去除首尾空格 -->
    <input v-model.trim="username" />
    <!-- 输入 "  张三  " → username = "张三" -->

    <!-- ===== 组合使用 ===== -->
    <input v-model.lazy.trim="search" />
    <!-- 失焦时同步 + 自动去除首尾空格 -->
</template>
```

### 内部原理

#### 修饰符的编译处理

```
修饰符在编译时的处理：

<input v-model.lazy="msg" />
编译为：
h('input', {
    value: msg,
    onChange: (e) => { msg = e.target.value }
    // 注意：是 onChange 而不是 onInput
})

<input v-model.number="num" />
编译为：
h('input', {
    value: num,
    onInput: (e) => {
        let val = e.target.value;
        const parsed = parseFloat(val);
        num = isNaN(parsed) ? val : parsed;
    }
})

<input v-model.trim="str" />
编译为：
h('input', {
    value: str,
    onInput: (e) => {
        str = e.target.value.trim();
    }
})

在自定义组件上使用修饰符：
<MyInput v-model.trim.lazy="val" />
编译为：
h(MyInput, {
    modelValue: val,
    'onUpdate:modelValue': handler,
    modelModifiers: { trim: true, lazy: true }
})
```

### 与相关API的对比

| 修饰符 | 效果 | 触发事件 | 值转换 |
|--------|------|---------|-------|
| 无 | 实时同步，原始字符串 | input | 无 |
| .lazy | 延迟同步 | change | 无 |
| .number | 实时同步，转数字 | input | parseFloat |
| .trim | 实时同步，去空格 | input | trim() |
| .lazy.trim | 延迟同步，去空格 | change | trim() |

### 适用场景

- **.lazy：** 搜索框、不需要实时反馈的输入
- **.number：** 年龄、价格、数量等数字输入
- **.trim：** 用户名、邮箱等需要去除空格的输入
- **组合使用：** 根据业务需要组合多个修饰符

### 常见问题

#### type="number" 不等于 .number

**解决方案：**

```html
<!-- type="number" 只限制输入界面，值仍然是字符串 -->
<input v-model="age" type="number" />
<!-- typeof age 仍然是 "string" -->

<!-- .number 才真正将值转为数字 -->
<input v-model.number="age" type="number" />
<!-- typeof age 是 "number" -->

<!-- 两者配合使用效果最好 -->
<!-- type="number" 提供输入控制 + .number 提供类型转换 -->
```

### 注意事项

- .lazy 将 input 事件改为 change 事件（失焦/回车才触发）
- .number 使用 parseFloat 转换，无法转换时保留原字符串
- .trim 只去除首尾空格，不影响中间的空格
- 修饰符可以组合使用
- 在自定义组件上，修饰符通过 modelModifiers prop 传递
- 原生元素的修饰符由编译器自动处理

### 总结

Vue 提供 .lazy、.number、.trim 三个内置 v-model 修饰符。.lazy 改为 change 事件延迟同步，.number 用 parseFloat 转换为数字，.trim 去除首尾空格。三者可以组合使用。在自定义组件上使用时，修饰符信息通过 modelModifiers prop 传递，需要子组件手动处理。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### v-model的自定义修饰符

### 概念说明

除了 Vue 内置的 `.lazy`、`.number`、`.trim` 修饰符外，开发者可以为组件的 v-model 定义自定义修饰符。当父组件使用 `v-model.myModifier` 时，修饰符信息会通过一个名为 `modelModifiers` 的 prop 传递给子组件（命名 v-model 的修饰符 prop 名为 `[name]Modifiers`）。

子组件可以读取修饰符对象来判断父组件使用了哪些修饰符，然后在处理值时进行相应的转换。Vue 3.4+ 的 `defineModel` 提供了更简洁的方式来处理自定义修饰符——通过解构返回值获取修饰符对象，并使用 `set` 转换函数处理值。

### 基本示例

```vue
<!-- 子组件 MyInput.vue：处理自定义修饰符 -->
<script setup>
// ===== Vue 3.4+ defineModel 方式（推荐） =====
const [model, modifiers] = defineModel({
    // set 函数在值写入前执行转换
    set(value) {
        // 处理 capitalize 修饰符：首字母大写
        if (modifiers.capitalize) {
            value = value.charAt(0).toUpperCase() + value.slice(1);
        }
        // 处理 uppercase 修饰符：全部大写
        if (modifiers.uppercase) {
            value = value.toUpperCase();
        }
        // 处理 lowercase 修饰符：全部小写
        if (modifiers.lowercase) {
            value = value.toLowerCase();
        }
        return value;
    },
});
</script>

<template>
    <input v-model="model" />
    <!-- 调试用：查看当前修饰符 -->
    <!-- <pre>{{ modifiers }}</pre> -->
</template>
```

```vue
<!-- 父组件使用自定义修饰符 -->
<script setup>
import { ref } from "vue";
import MyInput from "./MyInput.vue";

const name = ref("");
const code = ref("");
</script>

<template>
    <!-- 使用 capitalize 修饰符 -->
    <MyInput v-model.capitalize="name" />
    <!-- 输入 "hello" → name = "Hello" -->

    <!-- 使用 uppercase 修饰符 -->
    <MyInput v-model.uppercase="code" />
    <!-- 输入 "abc" → code = "ABC" -->

    <!-- 组合使用修饰符 -->
    <!-- <MyInput v-model.capitalize.trim="name" /> -->
</template>
```

```vue
<!-- Vue 3.4 之前的传统写法 -->
<script setup>
const props = defineProps({
    modelValue: String,
    // 修饰符通过这个 prop 接收
    modelModifiers: {
        default: () => ({}),
    },
});

const emit = defineEmits(["update:modelValue"]);

function handleInput(e) {
    let value = e.target.value;

    // 根据修饰符处理值
    if (props.modelModifiers.capitalize) {
        value = value.charAt(0).toUpperCase() + value.slice(1);
    }

    emit("update:modelValue", value);
}
</script>

<template>
    <input :value="modelValue" @input="handleInput" />
</template>
```

### 内部原理

#### 自定义修饰符的传递机制

```
自定义修饰符的编译过程：

默认 v-model 的修饰符：
<MyInput v-model.capitalize.trim="val" />
编译为：
h(MyInput, {
    modelValue: val,
    'onUpdate:modelValue': handler,
    modelModifiers: { capitalize: true, trim: true }
})

命名 v-model 的修饰符：
<MyInput v-model:title.uppercase="val" />
编译为：
h(MyInput, {
    title: val,
    'onUpdate:title': handler,
    titleModifiers: { uppercase: true }
})

修饰符 prop 命名规则：
  v-model → modelModifiers
  v-model:name → nameModifiers
  v-model:firstName → firstNameModifiers

defineModel 处理修饰符：
  const [model, modifiers] = defineModel({ set(value) { ... } });
  → modifiers = props.modelModifiers（自动获取）
  → set 函数在 emit 前执行
  → 返回值作为 emit 的参数
```

### 与相关API的对比

| 修饰符类型 | 处理方式 | 子组件实现 |
|-----------|---------|----------|
| .lazy / .number / .trim | Vue 自动处理（原生元素） | 无需处理 |
| .lazy / .number / .trim（组件上） | 通过 modelModifiers 传递 | 子组件手动处理 |
| 自定义修饰符 | 通过 modelModifiers 传递 | 子组件手动处理 |

### 适用场景

- **文本格式化：** 首字母大写、全大写、全小写
- **数据清洗：** 去除特殊字符、格式化手机号
- **组件库开发：** 提供灵活的输入转换选项
- **业务规则：** 强制输入格式（如只允许数字）

### 常见问题

#### 命名 v-model 的修饰符 prop 名

**解决方案：**

```vue
<script setup>
// 命名 v-model 的修饰符
const [title, titleModifiers] = defineModel("title", {
    set(value) {
        if (titleModifiers.uppercase) {
            return value.toUpperCase();
        }
        return value;
    },
});

// 修饰符 prop 名规则：
// v-model → modelModifiers
// v-model:title → titleModifiers
// v-model:firstName → firstNameModifiers
</script>

<!-- 父组件使用：<MyComp v-model:title.uppercase="t" /> -->
```

### 注意事项

- 自定义修饰符通过 xxxModifiers prop 传递给子组件
- 内置修饰符在原生元素上自动处理，在组件上需要手动处理
- defineModel 的 set 函数是处理修饰符的推荐方式（3.4+）
- 修饰符对象中的键是修饰符名，值始终是 true
- 可以定义任意名称的修饰符
- 多个修饰符可以组合使用

### 总结

自定义修饰符通过 modelModifiers（或 nameModifiers）prop 传递给子组件。Vue 3.4+ 的 defineModel 通过解构获取修饰符对象，配合 set 转换函数处理修饰符逻辑。内置修饰符在原生元素上自动处理，在自定义组件上需要手动处理。自定义修饰符适合文本格式化、数据清洗等输入转换场景。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### 事件总线(EventBus)的替代方案mitt

### 概念说明

Vue 2 中常用 `new Vue()` 作为事件总线（EventBus）实现任意组件间通信。Vue 3 移除了 `$on`、`$off`、`$once` 实例方法，不再支持这种模式。官方推荐使用第三方库 `mitt` 作为替代方案，或者使用 Pinia 进行状态管理。

mitt 是一个极其轻量的事件发射器（仅约 200 字节），提供 `on`（监听）、`off`（取消监听）、`emit`（触发）三个核心方法。它与框架无关，可以在任何 JavaScript 环境中使用。mitt 支持通配符 `*` 监听所有事件，也支持 TypeScript 类型安全。

事件总线适合简单的跨组件通信，但不适合复杂的状态管理。如果需要共享状态和派生数据，推荐使用 Pinia。

### 基本示例

```javascript
// eventBus.js - 创建全局事件总线
import mitt from "mitt";

// 创建事件发射器实例
const emitter = mitt();

export default emitter;
```

```vue
<!-- 组件A：触发事件 -->
<script setup>
import emitter from "./eventBus";

function sendMessage() {
    // emit(事件名, 数据)
    emitter.emit("user-login", {
        name: "张三",
        role: "admin",
    });
}

function notifyUpdate() {
    emitter.emit("data-update", { id: 1, value: "新数据" });
}
</script>

<template>
    <button @click="sendMessage">发送登录消息</button>
    <button @click="notifyUpdate">通知更新</button>
</template>
```

```vue
<!-- 组件B：监听事件 -->
<script setup>
import { onMounted, onUnmounted } from "vue";
import emitter from "./eventBus";

// 事件处理函数
function handleLogin(data) {
    console.log("收到登录消息:", data.name, data.role);
}

function handleUpdate(data) {
    console.log("收到更新:", data);
}

// 监听所有事件（通配符）
function handleAll(type, data) {
    console.log(`[${type}] 事件:`, data);
}

onMounted(() => {
    // on(事件名, 回调)
    emitter.on("user-login", handleLogin);
    emitter.on("data-update", handleUpdate);

    // 监听所有事件
    emitter.on("*", handleAll);
});

onUnmounted(() => {
    // 组件卸载时移除监听，防止内存泄漏
    emitter.off("user-login", handleLogin);
    emitter.off("data-update", handleUpdate);
    emitter.off("*", handleAll);

    // 或者清除所有监听
    // emitter.all.clear();
});
</script>
```

```typescript
// TypeScript 类型安全的用法
import mitt from "mitt";

// 定义事件类型
type Events = {
    "user-login": { name: string; role: string };
    "data-update": { id: number; value: string };
    logout: void; // 无参数事件
};

// 创建带类型的事件发射器
const emitter = mitt<Events>();

// 类型安全的 emit 和 on
emitter.emit("user-login", { name: "张三", role: "admin" }); // 类型检查
emitter.on("user-login", (data) => {
    console.log(data.name); // data 类型自动推导
});
```

### 内部原理

#### mitt 的实现原理

```
mitt 的核心实现（简化）：

function mitt() {
    // 用 Map 存储事件名 → 回调数组的映射
    const all = new Map();

    return {
        // 监听事件
        on(type, handler) {
            const handlers = all.get(type);
            if (handlers) {
                handlers.push(handler);
            } else {
                all.set(type, [handler]);
            }
        },

        // 取消监听
        off(type, handler) {
            const handlers = all.get(type);
            if (handlers) {
                const index = handlers.indexOf(handler);
                if (index > -1) handlers.splice(index, 1);
            }
        },

        // 触发事件
        emit(type, data) {
            // 执行该事件的所有回调
            const handlers = all.get(type);
            if (handlers) handlers.forEach(fn => fn(data));
            // 执行通配符 * 的回调
            const wildcard = all.get('*');
            if (wildcard) wildcard.forEach(fn => fn(type, data));
        },

        // 暴露 Map 用于清除
        all,
    };
}
```

### 与相关API的对比

| 方案 | 适用场景 | 状态管理 | 体积 |
|------|---------|---------|------|
| mitt | 简单事件通知 | 不支持 | ~200B |
| Pinia | 共享状态和派生数据 | 支持 | ~1KB |
| provide/inject | 祖先到后代通信 | 部分支持 | 内置 |
| props/emit | 父子组件通信 | 不适用 | 内置 |

### 适用场景

- **跨组件通知：** 兄弟组件间的简单消息传递
- **全局事件：** 登录/登出、主题切换等全局通知
- **插件通信：** 不同模块间的松耦合通信
- **临时通信：** 不需要持久化的一次性消息

### 常见问题

#### 忘记取消监听导致内存泄漏

**解决方案：**

```vue
<script setup>
import { onUnmounted } from "vue";
import emitter from "./eventBus";

function handler(data) {
    console.log(data);
}

emitter.on("event", handler);

// 必须在组件卸载时取消监听
onUnmounted(() => {
    emitter.off("event", handler);
});

// 注意：必须传入同一个函数引用
// 错误：emitter.off('event', (data) => { ... }) 
// 这是新的函数引用，off 不会生效
</script>
```

### 注意事项

- Vue 3 移除了 $on/$off/$once，不能用 Vue 实例做事件总线
- mitt 需要手动管理监听的生命周期（on/off）
- 组件卸载时必须取消监听，防止内存泄漏
- off 必须传入 on 时同一个函数引用
- 复杂状态管理推荐用 Pinia 而非 mitt
- mitt 支持 TypeScript 类型安全
- 通配符 * 可以监听所有事件

### 总结

mitt 是 Vue 3 中替代 EventBus 的推荐方案，提供 on/off/emit 三个核心方法。体积极小（约 200 字节），支持 TypeScript 类型安全和通配符监听。组件卸载时必须取消监听防止内存泄漏。适合简单的跨组件事件通知，复杂状态管理应使用 Pinia。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### Pinia的全局状态共享

### 概念说明

Pinia 是 Vue 官方推荐的状态管理库，也是 Vuex 的替代方案。它允许在任意组件之间共享响应式状态，不受组件层级关系的限制。无论组件之间是父子、兄弟还是完全不相关的关系，都可以通过 Pinia Store 读取和修改同一份共享状态。

Pinia 的核心概念包括：Store（状态容器）、State（响应式数据）、Getters（计算属性）和 Actions（方法）。相比 Vuex，Pinia 去掉了 Mutations 的概念，可以在 Actions 中直接修改 State，API 更简洁。Pinia 原生支持 TypeScript、Composition API 和模块化。

作为组件通信方案，Pinia 适合需要在多个不相关组件间共享和同步状态的场景，比如用户登录信息、购物车数据、全局配置等。

### 基本示例

```javascript
// stores/user.js - 定义 Store
import { defineStore } from "pinia";
import { ref, computed } from "vue";

// Composition API 风格（推荐）
export const useUserStore = defineStore("user", () => {
    // State：响应式数据
    const name = ref("");
    const token = ref("");
    const roles = ref([]);

    // Getters：计算属性
    const isLoggedIn = computed(() => !!token.value);
    const isAdmin = computed(() => roles.value.includes("admin"));

    // Actions：方法（可以是异步的）
    async function login(credentials) {
        const res = await fetch("/api/login", {
            method: "POST",
            body: JSON.stringify(credentials),
            headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        // 直接修改 state
        name.value = data.name;
        token.value = data.token;
        roles.value = data.roles;
    }

    function logout() {
        name.value = "";
        token.value = "";
        roles.value = [];
    }

    return { name, token, roles, isLoggedIn, isAdmin, login, logout };
});
```

```vue
<!-- 组件A：登录页 -->
<script setup>
import { ref } from "vue";
import { useUserStore } from "@/stores/user";

const userStore = useUserStore();

const email = ref("");
const password = ref("");

async function handleLogin() {
    await userStore.login({ email: email.value, password: password.value });
    // 登录成功后所有使用 userStore 的组件自动更新
}
</script>

<template>
    <form @submit.prevent="handleLogin">
        <input v-model="email" placeholder="邮箱" />
        <input v-model="password" type="password" placeholder="密码" />
        <button type="submit">登录</button>
    </form>
</template>
```

```vue
<!-- 组件B：导航栏（与组件A没有父子关系） -->
<script setup>
import { useUserStore } from "@/stores/user";

// 使用同一个 Store 实例
const userStore = useUserStore();
</script>

<template>
    <nav>
        <!-- 状态自动同步：登录后这里立即更新 -->
        <template v-if="userStore.isLoggedIn">
            <span>{{ userStore.name }}</span>
            <span v-if="userStore.isAdmin">[管理员]</span>
            <button @click="userStore.logout">退出</button>
        </template>
        <template v-else>
            <span>未登录</span>
        </template>
    </nav>
</template>
```

### 内部原理

#### Pinia 实现全局共享的机制

```
Pinia 的工作原理：

1. createPinia() 创建 Pinia 实例
   → 内部有一个 Map 存储所有 Store
   → 通过 app.use(pinia) 注入到 Vue 应用

2. defineStore('id', setup) 定义 Store
   → 返回 useXxxStore 函数（composable）
   → 首次调用时执行 setup 函数
   → 将返回值包装为响应式对象
   → 缓存到 Pinia 的 Map 中

3. useXxxStore() 获取 Store
   → 从 Pinia 的 Map 中查找对应 id 的 Store
   → 找到 → 返回缓存的 Store（单例）
   → 没找到 → 执行 setup 创建新 Store
   → 任何组件调用都获得同一个 Store 实例

4. 状态共享原理
   → 所有组件获取的是同一个 reactive 对象
   → 组件A修改 state → 触发响应式更新
   → 所有依赖该 state 的组件自动重新渲染
```

### 与相关API的对比

| 通信方案 | 方向 | 层级限制 | 状态持久 | 适合场景 |
|---------|------|---------|---------|---------|
| props/emit | 父子 | 直接父子 | 否 | 简单父子通信 |
| provide/inject | 祖先→后代 | 需要组件关系 | 否 | 跨层级注入 |
| mitt | 任意 | 无限制 | 否 | 简单事件通知 |
| Pinia | 任意 | 无限制 | 可选 | 共享状态管理 |

### 适用场景

- **用户信息：** 登录状态、用户资料在多处使用
- **购物车：** 商品列表页和购物车组件共享数据
- **全局配置：** 主题、语言等全局设置
- **跨页面数据：** 不同路由页面间共享状态

### 常见问题

#### 解构 Store 丢失响应性

**解决方案：**

```vue
<script setup>
import { storeToRefs } from "pinia";
import { useUserStore } from "@/stores/user";

const userStore = useUserStore();

// 错误：解构会丢失响应性
// const { name, isLoggedIn } = userStore;

// 正确：使用 storeToRefs 保持响应性
const { name, isLoggedIn } = storeToRefs(userStore);

// 注意：方法不需要 storeToRefs，直接解构
const { login, logout } = userStore;
</script>
```

### 注意事项

- Pinia Store 是单例的，所有组件共享同一个实例
- 解构 Store 的 state/getters 需要 storeToRefs
- 解构 Actions 不需要 storeToRefs（函数不是响应式的）
- Pinia 支持 SSR、DevTools 调试、插件系统
- 不要把所有状态都放到 Store（局部状态用组件自身管理）
- Pinia 替代了 Vuex，是 Vue 官方推荐方案

### 总结

Pinia 通过全局单例 Store 实现任意组件间的状态共享。所有组件获取同一个 Store 实例，一个组件修改 state 后其他组件自动更新。支持 State、Getters、Actions，去掉了 Vuex 的 Mutations。解构 state 和 getters 需要 storeToRefs。适合用户信息、购物车、全局配置等跨组件共享状态的场景。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。



## 7.5 渲染机制

### 模板编译的三阶段(解析/转换/生成)

### 概念说明

Vue 的模板编译器将 `<template>` 中的 HTML-like 模板字符串转换为 JavaScript 渲染函数。这个过程分为三个阶段：

**Parse（解析）：** 将模板字符串解析为 AST（抽象语法树）。解析器逐字符读取模板，识别标签、属性、指令、插值表达式等，构建出一棵树形结构来表示模板的语法结构。

**Transform（转换）：** 对 AST 进行遍历和优化。在这个阶段，编译器分析指令（v-if、v-for、v-bind 等）的语义，标记静态节点、动态节点，应用 PatchFlag，执行静态提升等优化操作。转换后的 AST 包含了足够的信息来生成高效的渲染代码。

**Codegen（代码生成）：** 将优化后的 AST 转换为 JavaScript 渲染函数的代码字符串。生成的代码调用 Vue 运行时的辅助函数（如 `createVNode`、`toDisplayString` 等）来创建 VNode 树。

### 基本示例

```html
<!-- 原始模板 -->
<template>
    <div id="app" class="container">
        <h1>{{ title }}</h1>
        <p v-if="show">动态内容</p>
        <span>静态文本</span>
    </div>
</template>
```

```
阶段1 - Parse（解析为 AST）：

{
    type: 'Root',
    children: [{
        type: 'Element',
        tag: 'div',
        props: [
            { name: 'id', value: 'app' },
            { name: 'class', value: 'container' }
        ],
        children: [
            {
                type: 'Element',
                tag: 'h1',
                children: [{
                    type: 'Interpolation',    // 插值表达式
                    content: { type: 'SimpleExpression', content: 'title' }
                }]
            },
            {
                type: 'Element',
                tag: 'p',
                props: [{ type: 'Directive', name: 'if', exp: 'show' }],
                children: [{ type: 'Text', content: '动态内容' }]
            },
            {
                type: 'Element',
                tag: 'span',
                children: [{ type: 'Text', content: '静态文本' }]
            }
        ]
    }]
}
```

```
阶段2 - Transform（优化 AST）：

→ 标记静态节点：<span>静态文本</span> 标记为静态
→ 分析 v-if 指令：转换为条件分支节点
→ 分析插值表达式：标记 PatchFlag（TEXT）
→ 静态提升：将静态 VNode 提升到渲染函数外部
```

```javascript
// 阶段3 - Codegen（生成渲染函数代码）
import { createElementVNode as _createElementVNode, toDisplayString as _toDisplayString, openBlock as _openBlock, createElementBlock as _createElementBlock, createCommentVNode as _createCommentVNode } from "vue";

// 静态提升：静态节点在函数外部创建一次
const _hoisted_1 = { id: "app", class: "container" };
const _hoisted_2 = /*#__PURE__*/_createElementVNode("span", null, "静态文本", -1 /* HOISTED */);

export function render(_ctx, _cache) {
    return (_openBlock(), _createElementBlock("div", _hoisted_1, [
        // h1 包含动态插值，每次渲染都需要更新
        _createElementVNode("h1", null, _toDisplayString(_ctx.title), 1 /* TEXT */),
        // v-if 条件渲染
        _ctx.show
            ? (_openBlock(), _createElementBlock("p", { key: 0 }, "动态内容"))
            : _createCommentVNode("v-if", true),
        // 静态节点直接引用提升的变量
        _hoisted_2
    ]))
}
```

### 内部原理

#### 三阶段的协作流程

```
Vue 模板编译的完整流程：

function compile(template) {
    // 1. Parse：模板字符串 → AST
    const ast = parse(template);

    // 2. Transform：AST → 优化后的 AST
    transform(ast, {
        nodeTransforms: [
            transformIf,        // 处理 v-if
            transformFor,       // 处理 v-for
            transformElement,   // 处理元素节点
            transformText,      // 处理文本节点
            // ...
        ],
        directiveTransforms: {
            bind: transformBind,    // 处理 v-bind
            on: transformOn,        // 处理 v-on
            model: transformModel,  // 处理 v-model
        },
    });

    // 3. Codegen：优化后的 AST → 渲染函数代码字符串
    const code = generate(ast);

    return code;
}

编译时机：
  → 开发环境：浏览器运行时编译（包含完整编译器）
  → 生产环境：构建时编译（通过 vue-loader/vite 插件）
  → 生产构建只包含运行时，不包含编译器（体积更小）
```

### 与相关API的对比

| 阶段 | 输入 | 输出 | 核心操作 |
|------|------|------|---------|
| Parse | 模板字符串 | AST | 词法分析 + 语法分析 |
| Transform | AST | 优化后的 AST | 指令处理 + 静态分析 + 优化标记 |
| Codegen | 优化后的 AST | JS 渲染函数代码 | 拼接代码字符串 |

### 适用场景

- **理解编译优化：** 知道 Vue 如何优化模板渲染
- **调试模板问题：** 通过编译结果理解模板行为
- **自定义编译器插件：** 扩展编译器功能
- **性能优化：** 利用编译优化特性写出更高效的模板

### 常见问题

#### 如何查看编译后的渲染函数

**解决方案：**

```javascript
// 方式1：Vue Template Explorer（在线工具）
// https://template-explorer.vuejs.org/

// 方式2：编程方式
import { compile } from "@vue/compiler-dom";

const { code } = compile(`<div>{{ msg }}</div>`);
console.log(code);
// 输出生成的渲染函数代码

// 方式3：Vue DevTools 中查看组件的渲染函数
```

### 注意事项

- 生产环境推荐构建时编译（不打包编译器）
- 运行时编译需要引入完整版 Vue（包含编译器）
- 编译结果会被缓存，相同模板不会重复编译
- Transform 阶段是优化的核心（PatchFlag、静态提升等）
- 编译错误（如无效指令）在 Parse 或 Transform 阶段报出
- SFC 的 `<template>` 由 vue-loader/vite 插件在构建时编译

### 总结

Vue 模板编译分为 Parse（解析为 AST）、Transform（优化 AST）和 Codegen（生成渲染函数）三个阶段。Parse 将模板字符串转换为 AST 树形结构，Transform 进行指令处理、静态分析和优化标记，Codegen 生成调用 Vue 运行时辅助函数的 JavaScript 代码。生产环境推荐构建时编译，避免打包编译器。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### Parser解析器的HTML解析

### 概念说明

Parser（解析器）是 Vue 模板编译的第一个阶段，负责将模板字符串逐字符解析为 AST（抽象语法树）。Vue 3 的解析器采用有限状态自动机的思路，通过维护一个状态栈来追踪当前解析的位置和上下文。

解析器的工作过程是：从左到右扫描模板字符串，遇到 `<` 判断是开始标签还是结束标签，遇到 `&lbrace;&lbrace;` 判断是插值表达式，其余内容作为文本节点处理。对于开始标签，解析器会继续解析标签名、属性、指令等信息。解析器维护一个标签栈来追踪嵌套关系，确保标签正确闭合。

Vue 3 的解析器相比 Vue 2 有较大改进，不再使用正则表达式，而是基于字符扫描的方式，性能更好，错误信息也更准确。

### 基本示例

```html
<!-- 待解析的模板 -->
<div class="app" :id="dynamicId">
    <h1>{{ title }}</h1>
    <input v-model="name" @click="handle" />
    纯文本内容
</div>
```

```
解析器逐步解析过程：

1. 遇到 '<div' → 识别为开始标签
   → 解析标签名: 'div'
   → 解析属性: class="app"（静态属性）
   → 解析属性: :id="dynamicId"（v-bind 指令）
   → 遇到 '>' → 标签解析完成
   → 压入标签栈: ['div']

2. 遇到 '<h1>' → 开始标签
   → 标签栈: ['div', 'h1']

3. 遇到 '{{' → 识别为插值表达式
   → 解析表达式内容: 'title'
   → 遇到 '}}' → 插值解析完成

4. 遇到 '</h1>' → 结束标签
   → 与栈顶 'h1' 匹配 → 弹出
   → 标签栈: ['div']

5. 遇到 '<input' → 自闭合标签
   → 解析 v-model 指令
   → 解析 @click 事件绑定
   → 遇到 '/>' → 自闭合，不压栈

6. '纯文本内容' → 文本节点

7. 遇到 '</div>' → 结束标签
   → 与栈顶 'div' 匹配 → 弹出
   → 标签栈: []（解析完成）

最终生成 AST：
{
    type: 'Root',
    children: [{
        type: 'Element',
        tag: 'div',
        props: [
            { type: 'Attribute', name: 'class', value: 'app' },
            { type: 'Directive', name: 'bind', arg: 'id', exp: 'dynamicId' }
        ],
        children: [
            { type: 'Element', tag: 'h1', children: [
                { type: 'Interpolation', content: 'title' }
            ]},
            { type: 'Element', tag: 'input', props: [
                { type: 'Directive', name: 'model', exp: 'name' },
                { type: 'Directive', name: 'on', arg: 'click', exp: 'handle' }
            ]},
            { type: 'Text', content: '纯文本内容' }
        ]
    }]
}
```

### 内部原理

#### 解析器的核心逻辑

```
Vue 3 Parser 的简化逻辑：

function parse(template) {
    const context = {
        source: template,    // 剩余待解析的模板
        column: 1,           // 当前列号（用于错误定位）
        line: 1,             // 当前行号
    };
    const ancestors = [];    // 标签栈

    const nodes = parseChildren(context, ancestors);
    return { type: 'Root', children: nodes };
}

function parseChildren(context, ancestors) {
    const nodes = [];
    while (!isEnd(context, ancestors)) {
        let node;
        const s = context.source;

        if (s.startsWith('{{')) {
            // 插值表达式
            node = parseInterpolation(context);
        } else if (s[0] === '<') {
            if (s[1] === '/') {
                // 结束标签 </xxx>
                parseEndTag(context, ancestors);
                continue;
            } else {
                // 开始标签 <xxx>
                node = parseElement(context, ancestors);
            }
        } else {
            // 文本内容
            node = parseText(context);
        }

        nodes.push(node);
    }
    return nodes;
}
```

### 与相关API的对比

| 解析内容 | 识别方式 | AST 节点类型 |
|---------|---------|-------------|
| `<div>` | `<` + 字母开头 | Element |
| `</div>` | `</` | 触发栈弹出 |
| `&lbrace;&lbrace; expr &rbrace;&rbrace;` | `&lbrace;&lbrace;` 开头 | Interpolation |
| `v-if="x"` | 属性名以 v- 开头 | Directive |
| `:prop="x"` | 属性名以 : 开头 | Directive (bind) |
| `@event="x"` | 属性名以 @ 开头 | Directive (on) |
| 普通文本 | 其他字符 | Text |

### 适用场景

- **理解编译原理：** 了解模板如何转换为程序可处理的结构
- **调试模板错误：** 理解解析器如何定位语法错误
- **自定义指令解析：** 了解指令在编译阶段的处理方式

### 常见问题

#### 标签未正确闭合的错误

**解决方案：**

```html
<!-- 错误：标签未闭合 -->
<!-- <div><span></div> -->
<!-- 解析器栈中有 'span' 未弹出 -->
<!-- 报错：Element is missing end tag -->

<!-- 正确：标签正确嵌套 -->
<div><span></span></div>

<!-- 自闭合标签不需要结束标签 -->
<input />
<img />
<br />
```

### 注意事项

- Vue 3 的解析器基于字符扫描，不使用正则表达式
- 标签栈用于追踪嵌套关系和检测未闭合标签
- 解析器会记录每个节点的源码位置（行号、列号）
- 属性名以 v-、:、@、# 开头的被识别为指令
- 解析错误会包含准确的位置信息
- 解析器不做语义分析，只做语法解析

### 总结

Parser 解析器将模板字符串逐字符解析为 AST。通过识别 `<`、`&lbrace;&lbrace;`、文本等不同内容类型，结合标签栈追踪嵌套关系。Vue 3 采用字符扫描方式替代正则表达式，性能更好，错误定位更准确。解析器只负责语法解析，语义分析和优化在 Transform 阶段完成。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### Transform转换器的AST优化

### 概念说明

Transform（转换）是 Vue 模板编译的第二个阶段，负责对 Parse 阶段生成的原始 AST 进行语义分析和优化。转换器通过深度优先遍历 AST 的每个节点，对指令（v-if、v-for、v-bind 等）进行语义转换，对节点进行静态/动态标记，并执行各种编译优化。

Transform 阶段的核心工作包括：将 v-if/v-for 等结构性指令转换为对应的 AST 节点结构，分析节点是否为静态节点（内容永远不变），为动态节点添加 PatchFlag 标记，执行静态提升（将不变的节点提升到渲染函数外部），以及缓存事件处理函数等。

转换器采用插件化设计，由多个 nodeTransforms 和 directiveTransforms 组成，每个 transform 负责处理特定类型的节点或指令。这种设计让编译器具有良好的可扩展性。

### 基本示例

```html
<!-- 原始模板 -->
<div>
    <h1>静态标题</h1>
    <p :class="cls">{{ msg }}</p>
    <ul v-if="show">
        <li v-for="item in list" :key="item.id">{{ item.name }}</li>
    </ul>
</div>
```

```
Transform 阶段的处理过程：

1. transformElement 处理元素节点
   → 分析 <h1>静态标题</h1>
   → 标记为静态节点（没有动态绑定）
   → 标记可以被静态提升

2. transformElement 处理 <p :class="cls">
   → 检测到动态 class 绑定
   → 添加 PatchFlag: CLASS (2)
   → 标记为动态节点

3. transformText 处理 {{ msg }}
   → 识别插值表达式
   → 添加 PatchFlag: TEXT (1)

4. transformIf 处理 v-if="show"
   → 将 <ul v-if> 转换为 IfNode
   → 包含条件分支结构：
   {
       type: 'If',
       branches: [{
           condition: 'show',
           children: [/* ul 节点 */]
       }]
   }

5. transformFor 处理 v-for="item in list"
   → 将 <li v-for> 转换为 ForNode
   → 包含迭代信息：
   {
       type: 'For',
       source: 'list',
       value: 'item',
       children: [/* li 节点 */]
   }

6. 静态提升分析
   → <h1>静态标题</h1> 被标记为可提升
   → 在 Codegen 时会被提升到渲染函数外部

7. Block 树构建
   → 根节点 div 作为 Block
   → 收集所有动态子节点到 dynamicChildren 数组
   → Patch 时只需要对比 dynamicChildren
```

### 内部原理

#### Transform 的插件化架构

```
Transform 的执行流程：

function transform(root, options) {
    const context = {
        // 节点转换插件列表
        nodeTransforms: [
            transformIf,         // 处理 v-if/v-else-if/v-else
            transformFor,        // 处理 v-for
            transformExpression,  // 处理表达式
            transformSlotOutlet, // 处理 <slot>
            transformElement,    // 处理元素节点
            transformText,       // 处理文本节点
        ],
        // 指令转换插件
        directiveTransforms: {
            bind: transformBind,
            on: transformOn,
            model: transformModel,
        },
        hoists: [],  // 收集静态提升的节点
    };

    // 深度优先遍历 AST
    traverseNode(root, context);

    // 执行静态提升
    if (options.hoistStatic) {
        hoistStatic(root, context);
    }

    // 构建 Block 树
    createRootCodegen(root);
}

// 遍历节点时，每个 transform 都有机会处理
function traverseNode(node, context) {
    // 进入阶段：收集 transform 的退出回调
    const exitFns = [];
    for (const transform of context.nodeTransforms) {
        const onExit = transform(node, context);
        if (onExit) exitFns.push(onExit);
    }

    // 递归处理子节点
    traverseChildren(node, context);

    // 退出阶段：倒序执行退出回调
    for (let i = exitFns.length - 1; i >= 0; i--) {
        exitFns[i]();
    }
}
```

### 与相关API的对比

| Transform 插件 | 处理内容 | 输出 |
|---------------|---------|------|
| transformIf | v-if/v-else | IfNode 条件分支 |
| transformFor | v-for | ForNode 循环结构 |
| transformElement | 元素属性 | PatchFlag 标记 |
| transformText | 文本/插值 | 合并文本节点 |
| hoistStatic | 静态分析 | 标记可提升节点 |

### 适用场景

- **理解编译优化：** Transform 是 Vue 3 性能优化的核心阶段
- **理解 PatchFlag：** 知道为什么 Diff 可以跳过静态节点
- **自定义编译器插件：** 扩展 Transform 行为

### 常见问题

#### Transform 阶段的进入/退出机制

**解决方案：**

```
Transform 采用进入-退出模式：

进入阶段（自顶向下）：
  → 先处理父节点，收集退出回调
  → 可以在进入时修改节点结构

退出阶段（自底向上）：
  → 子节点处理完成后执行退出回调
  → 此时子节点信息已完整
  → 适合做依赖子节点的分析（如 PatchFlag）

这种设计的好处：
  → transformFor 在进入时将 v-for 转换为 ForNode
  → transformElement 在退出时分析子节点确定 PatchFlag
  → 保证分析顺序的正确性
```

### 注意事项

- Transform 是编译优化的核心阶段
- 采用插件化设计，每个 transform 处理特定逻辑
- 使用进入-退出双阶段遍历模式
- 结构性指令（v-if、v-for）在进入阶段转换
- PatchFlag 和静态提升在退出阶段确定
- Transform 不修改原始模板，只优化 AST 结构

### 总结

Transform 是 Vue 编译的第二阶段，通过插件化的 nodeTransforms 和 directiveTransforms 遍历 AST。核心工作包括指令语义转换、PatchFlag 标记、静态节点分析和静态提升。采用进入-退出双阶段遍历模式，保证分析顺序正确。Transform 阶段的优化直接决定了运行时 Diff 和渲染的性能。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### Codegen生成器的代码字符串生成

### 概念说明

Codegen（代码生成）是 Vue 模板编译的第三个也是最后一个阶段。它接收 Transform 阶段优化后的 AST，将其转换为 JavaScript 渲染函数的代码字符串。生成的代码会调用 Vue 运行时的辅助函数（如 `createElementVNode`、`createBlock`、`toDisplayString` 等）来构建 VNode 树。

Codegen 的核心工作是递归遍历 AST 节点，根据节点类型拼接对应的 JavaScript 代码。对于元素节点生成 `createElementVNode` 调用，对于文本节点生成字符串，对于插值表达式生成 `toDisplayString` 调用，对于 v-if 生成三元表达式，对于 v-for 生成 `renderList` 调用等。

生成的代码还包含 Transform 阶段标记的优化信息，比如 PatchFlag 参数、静态提升的变量声明、Block 的开关等。

### 基本示例

```html
<!-- 原始模板 -->
<div id="app">
    <h1>静态标题</h1>
    <p>{{ message }}</p>
    <button @click="handleClick">点击</button>
</div>
```

```javascript
// Codegen 生成的渲染函数代码

// 导入运行时辅助函数
import {
    createElementVNode as _createElementVNode,
    toDisplayString as _toDisplayString,
    openBlock as _openBlock,
    createElementBlock as _createElementBlock,
} from "vue";

// 静态提升：不变的节点在函数外部只创建一次
const _hoisted_1 = { id: "app" };
const _hoisted_2 = /*#__PURE__*/ _createElementVNode(
    "h1",
    null,
    "静态标题",
    -1 /* HOISTED */
);

// 渲染函数
export function render(_ctx, _cache) {
    return (
        _openBlock(),
        _createElementBlock("div", _hoisted_1, [
            // 静态节点：直接引用提升的变量
            _hoisted_2,
            // 动态文本节点：PatchFlag = 1 (TEXT)
            _createElementVNode(
                "p",
                null,
                _toDisplayString(_ctx.message),
                1 /* TEXT */
            ),
            // 事件绑定节点
            _createElementVNode(
                "button",
                { onClick: _ctx.handleClick },
                "点击",
                8 /* PROPS */,
                ["onClick"]
            ),
        ])
    );
}
```

### 内部原理

#### Codegen 的递归生成逻辑

```
Codegen 的核心流程（简化）：

function generate(ast) {
    const context = {
        code: '',           // 最终代码字符串
        indentLevel: 0,     // 缩进层级
        push(code) { this.code += code },  // 追加代码
        indent() { this.indentLevel++ },
        deindent() { this.indentLevel-- },
    };

    // 生成导入语句
    genImports(ast.helpers, context);

    // 生成静态提升变量
    genHoists(ast.hoists, context);

    // 生成渲染函数
    context.push('function render(_ctx, _cache) {');
    context.push('  return ');
    genNode(ast.codegenNode, context);
    context.push('}');

    return context.code;
}

// 根据节点类型生成对应代码
function genNode(node, context) {
    switch (node.type) {
        case 'Element':
            genElement(node, context);  // → createElementVNode(...)
            break;
        case 'Text':
            genText(node, context);     // → "文本内容"
            break;
        case 'Interpolation':
            genInterpolation(node, context); // → toDisplayString(...)
            break;
        case 'If':
            genIf(node, context);       // → condition ? a : b
            break;
        case 'For':
            genFor(node, context);      // → renderList(...)
            break;
    }
}
```

### 与相关API的对比

| AST 节点类型 | 生成的代码 | 运行时辅助函数 |
|-------------|----------|-------------|
| Element | `createElementVNode(tag, props, children, patchFlag)` | createElementVNode |
| Text | `"文本字符串"` | - |
| Interpolation | `toDisplayString(expr)` | toDisplayString |
| If | `condition ? branch1 : branch2` | createCommentVNode |
| For | `renderList(source, (item) => ...)` | renderList |
| Block | `openBlock(), createElementBlock(...)` | openBlock, createElementBlock |

### 适用场景

- **理解渲染函数：** 知道模板编译后的实际运行代码
- **手写渲染函数：** 理解 h 函数和辅助函数的用法
- **性能分析：** 通过编译结果判断优化是否生效
- **调试：** 在 Vue Template Explorer 中查看编译输出

### 常见问题

#### 生成代码中的 PatchFlag 数字含义

**解决方案：**

```javascript
// PatchFlag 是传给 createElementVNode 的最后一个数字参数
// 用于告诉运行时 Diff 只需要检查什么

// _createElementVNode("p", null, text, 1)
// 1 = TEXT → 只有文本内容会变化

// _createElementVNode("div", { class: cls }, children, 2)
// 2 = CLASS → 只有 class 会变化

// _createElementVNode("div", props, children, 8, ["onClick"])
// 8 = PROPS → 指定的动态 props 会变化

// -1 = HOISTED → 静态提升的节点，永远不需要 Diff
// -2 = BAIL → 需要完整 Diff
```

### 注意事项

- Codegen 生成的是代码字符串，不是直接执行的函数
- 生成的代码依赖 Vue 运行时辅助函数
- PatchFlag 参数是编译时优化的关键产物
- 静态提升的节点在渲染函数外部声明
- 生产构建时代码在构建阶段生成（不需要运行时编译器）
- 可以通过 Vue Template Explorer 在线查看编译结果

### 总结

Codegen 是模板编译的最后阶段，将优化后的 AST 递归转换为 JavaScript 渲染函数代码字符串。生成的代码调用 Vue 运行时辅助函数来创建 VNode。代码中包含 PatchFlag 参数、静态提升变量等编译优化信息。生产环境在构建时完成代码生成，运行时只执行生成的渲染函数。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### 虚拟DOM的VNode结构

### 概念说明

虚拟 DOM（Virtual DOM）是用 JavaScript 对象来描述真实 DOM 结构的一种抽象表示。Vue 中的虚拟 DOM 节点叫做 VNode（Virtual Node），每个 VNode 对应一个真实 DOM 元素或组件实例。渲染函数执行后返回一棵 VNode 树，Vue 通过对比新旧 VNode 树的差异（Diff），只更新变化的部分到真实 DOM 上。

虚拟 DOM 的核心价值不在于"比直接操作 DOM 快"（实际上直接操作 DOM 在某些场景更快），而在于提供了一个声明式的编程模型：开发者描述"界面应该是什么样"，Vue 负责计算差异并高效更新。虚拟 DOM 还让跨平台渲染成为可能（比如 SSR、Native 渲染）。

### 基本示例

```javascript
// 一个 VNode 的基本结构
const vnode = {
    type: "div",                // 节点类型：标签名、组件对象、Fragment 等
    props: {                    // 属性
        id: "app",
        class: "container",
        onClick: handleClick,
    },
    children: [                 // 子节点
        {
            type: "h1",
            props: null,
            children: "标题文本",  // 文本子节点可以直接是字符串
        },
        {
            type: "p",
            props: { class: "content" },
            children: "段落内容",
        },
    ],
    key: null,                  // 用于 Diff 算法的唯一标识
    el: null,                   // 对应的真实 DOM 元素（挂载后赋值）
    shapeFlag: 17,              // 节点形状标记（用于快速判断节点类型）
    patchFlag: 0,               // 编译时优化标记（标记哪些内容会变化）
    dynamicChildren: null,      // 动态子节点数组（Block 优化）
};
```

```javascript
// 使用 h 函数创建 VNode
import { h } from "vue";

// h(type, props, children)
const vnode1 = h("div", { id: "app" }, [
    h("h1", null, "标题"),
    h("p", { class: "content" }, "段落"),
]);

// 组件 VNode
import MyComponent from "./MyComponent.vue";
const vnode2 = h(MyComponent, {
    title: "标题",
    onUpdate: handleUpdate,
});

// 文本 VNode
import { createTextVNode } from "vue";
const vnode3 = createTextVNode("纯文本");

// Fragment VNode（多个根节点）
import { Fragment } from "vue";
const vnode4 = h(Fragment, null, [
    h("p", null, "段落1"),
    h("p", null, "段落2"),
]);
```

### 内部原理

#### VNode 的创建和使用流程

```
VNode 在 Vue 中的生命周期：

1. 创建 VNode（渲染函数执行）
   render() → 返回 VNode 树
   → h('div', props, children) 创建 VNode 对象

2. 首次挂载（mount）
   → 遍历 VNode 树
   → 为每个 VNode 创建对应的真实 DOM
   → vnode.el = document.createElement(vnode.type)
   → 设置属性、添加子节点
   → 插入到页面

3. 更新（patch）
   → 组件状态变化 → 重新执行渲染函数
   → 得到新的 VNode 树
   → 对比新旧 VNode 树（Diff）
   → 只更新差异部分到真实 DOM

4. 卸载（unmount）
   → 从 DOM 中移除元素
   → 清理事件监听器
   → vnode.el = null

VNode 的类型判断（shapeFlag）：
  ELEMENT = 1            // 普通 HTML 元素
  FUNCTIONAL_COMPONENT = 2  // 函数式组件
  STATEFUL_COMPONENT = 4    // 有状态组件
  TEXT_CHILDREN = 8         // 子节点是文本
  ARRAY_CHILDREN = 16       // 子节点是数组
  SLOTS_CHILDREN = 32       // 子节点是插槽
  // 通过位运算组合：ELEMENT | ARRAY_CHILDREN = 17
```

### 与相关API的对比

| VNode 类型 | type 值 | 示例 |
|-----------|---------|------|
| 元素节点 | 字符串（标签名） | `{ type: 'div' }` |
| 组件节点 | 组件对象 | `{ type: MyComponent }` |
| 文本节点 | Symbol(Text) | `{ type: Text, children: '文本' }` |
| 注释节点 | Symbol(Comment) | `{ type: Comment }` |
| Fragment | Symbol(Fragment) | `{ type: Fragment, children: [...] }` |

### 适用场景

- **理解渲染原理：** VNode 是 Vue 渲染系统的核心数据结构
- **手写渲染函数：** 使用 h 函数直接创建 VNode
- **性能优化：** 理解 Diff 算法的工作基础
- **跨平台渲染：** VNode 抽象使 SSR、Native 渲染成为可能

### 常见问题

#### VNode 是一次性的还是可复用的

**解决方案：**

```javascript
// VNode 是一次性的，不能复用
// 每次渲染都需要创建新的 VNode 树

// 错误：复用 VNode
// const cached = h('div', null, '文本');
// return [cached, cached]; // 两个引用指向同一个 VNode

// 正确：每次创建新的 VNode
// 渲染函数每次执行都会创建新的 VNode
// Vue 通过 Diff 对比新旧 VNode 来计算最小更新
```

### 注意事项

- VNode 是轻量级的 JavaScript 对象，创建成本低
- VNode 是一次性的，每次渲染都创建新的 VNode 树
- shapeFlag 用位运算表示节点类型组合
- patchFlag 是编译时优化标记，指示动态内容类型
- vnode.el 在挂载后指向真实 DOM 元素
- key 属性用于 Diff 算法优化列表更新

### 总结

VNode 是 Vue 虚拟 DOM 的核心数据结构，用 JavaScript 对象描述真实 DOM。包含 type（类型）、props（属性）、children（子节点）、key（唯一标识）等关键字段。渲染函数每次执行创建新的 VNode 树，Vue 通过 Diff 对比新旧树计算最小更新。VNode 的抽象让声明式编程和跨平台渲染成为可能。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### VNode的type/props/children/key

### 概念说明

VNode 的四个核心字段决定了一个虚拟节点的全部信息：

**type：** 节点的类型。可以是字符串（HTML 标签名如 `'div'`）、组件对象、Symbol（如 Text、Comment、Fragment）等。type 决定了 Vue 如何处理这个节点——创建 DOM 元素、实例化组件还是处理特殊类型。

**props：** 节点的属性集合，是一个对象。包含 HTML 属性（id、class、style）、组件 props、事件监听器（以 on 前缀命名，如 onClick）、以及指令绑定等。props 为 null 表示没有属性。

**children：** 子节点。可以是字符串（文本子节点）、VNode 数组（多个子节点）、对象（插槽）或 null。children 的类型决定了 shapeFlag 中的子节点标记。

**key：** 唯一标识，用于 Diff 算法在列表更新时识别和复用节点。key 通常在 v-for 中通过 `:key` 指定。没有 key 时 Vue 使用就地更新策略，有 key 时使用基于 key 的高效 Diff。

### 基本示例

```javascript
import { h, Fragment, Text, Comment } from "vue";
import MyComponent from "./MyComponent.vue";

// ===== type 的各种取值 =====

// 字符串 → HTML 元素
h("div");           // type: 'div'
h("input");         // type: 'input'
h("custom-el");     // type: 'custom-el'（自定义元素）

// 组件对象 → 组件 VNode
h(MyComponent);     // type: MyComponent（组件定义对象）

// Symbol → 特殊类型
h(Text, "文本");     // type: Symbol(Text)
h(Comment, "注释");  // type: Symbol(Comment)
h(Fragment, [        // type: Symbol(Fragment)
    h("p", "段落1"),
    h("p", "段落2"),
]);


// ===== props 的各种内容 =====
h("div", {
    // HTML 属性
    id: "app",
    class: ["container", { active: true }],
    style: { color: "red", fontSize: "14px" },

    // 自定义属性
    "data-id": "123",

    // 事件监听器（on 前缀 + 首字母大写）
    onClick: handleClick,
    onMouseenter: handleHover,

    // 组件 props（在组件 VNode 上）
    // title: '标题',
    // modelValue: value,
    // 'onUpdate:modelValue': handler,
});


// ===== children 的各种形式 =====

// 字符串文本
h("p", null, "文本内容");

// VNode 数组
h("div", null, [
    h("span", null, "子节点1"),
    h("span", null, "子节点2"),
]);

// 插槽对象（组件的 children）
h(MyComponent, null, {
    default: () => h("p", null, "默认插槽"),
    header: () => h("h1", null, "头部插槽"),
});


// ===== key 的使用 =====

// 在列表渲染中指定 key
const items = [
    { id: 1, name: "A" },
    { id: 2, name: "B" },
];

h("ul", null,
    items.map((item) =>
        h("li", { key: item.id }, item.name)
        // key: 1, key: 2 → Diff 时用于识别节点
    )
);
```

### 内部原理

#### createVNode 函数的处理逻辑

```
createVNode(type, props, children, patchFlag) 的内部流程：

1. 规范化 type
   → 字符串 → 标记为 ELEMENT
   → 对象（有 setup 或 render）→ 标记为 COMPONENT
   → Symbol(Text/Comment/Fragment) → 标记为对应类型

2. 规范化 props
   → class 归一化（字符串/对象/数组 → 字符串）
   → style 归一化（字符串 → 对象）
   → 事件监听器标准化

3. 规范化 children
   → 字符串 → shapeFlag |= TEXT_CHILDREN
   → 数组 → shapeFlag |= ARRAY_CHILDREN
   → 对象（插槽）→ shapeFlag |= SLOTS_CHILDREN

4. 生成 VNode 对象
   {
       type, props, children, key: props?.key,
       shapeFlag, patchFlag,
       el: null,          // 真实 DOM 引用
       component: null,   // 组件实例引用
       dynamicChildren: null,
   }
```

### 与相关API的对比

| 字段 | 类型 | 作用 | Diff 时的角色 |
|------|------|------|-------------|
| type | string / object / Symbol | 决定节点种类 | 类型不同直接替换 |
| props | object / null | 属性和事件 | 逐个对比更新 |
| children | string / array / object | 子节点内容 | 递归 Diff |
| key | string / number / null | 唯一标识 | 列表 Diff 的匹配依据 |

### 适用场景

- **手写渲染函数：** 理解 h 函数的参数含义
- **Diff 算法理解：** 这四个字段是 Diff 对比的核心
- **性能优化：** 正确使用 key 提升列表更新性能
- **组件开发：** 理解 props 和 children 在组件中的传递

### 常见问题

#### key 的选择策略

**解决方案：**

```javascript
// 正确：使用唯一且稳定的 ID
items.map(item => h("li", { key: item.id }, item.name));

// 错误：使用数组索引
items.map((item, index) => h("li", { key: index }, item.name));
// 列表重排时 index 变化，导致错误的节点复用

// 错误：使用随机数
items.map(item => h("li", { key: Math.random() }, item.name));
// 每次渲染 key 都不同，无法复用任何节点
```

### 注意事项

- type 相同才会进行 Diff 对比，不同直接替换
- props 中的 key 会被提取到 VNode 的 key 字段
- children 为字符串时是文本子节点，为数组时是多子节点
- 组件的 children 被当作插槽处理
- key 应该是唯一且稳定的值，不要用数组索引
- shapeFlag 用位运算组合 type 和 children 的类型标记

### 总结

VNode 的 type 决定节点种类，props 包含属性和事件，children 表示子节点内容，key 用于 Diff 算法的节点识别。type 不同直接替换节点，props 逐个对比更新，children 递归 Diff，key 用于列表更新时的高效匹配。正确使用 key（唯一稳定的 ID）对列表渲染性能至关重要。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### Patch算法的同层级比较

### 概念说明

Patch 算法是 Vue 运行时的核心，负责将新旧 VNode 树的差异应用到真实 DOM 上。Patch 采用同层级比较策略：只比较同一层级的节点，不会跨层级比较。这是一个基于实际场景的权衡——在真实的 Web 应用中，跨层级移动 DOM 节点的情况极少，同层级比较可以将 O(n^3) 的完整树 Diff 复杂度降低到 O(n)。

Patch 的核心逻辑是：如果新旧 VNode 的 type 和 key 相同，认为是同一个节点，进行属性和子节点的更新（patch）；如果 type 不同，直接卸载旧节点，挂载新节点（replace）；如果新节点不存在，卸载旧节点（unmount）；如果旧节点不存在，挂载新节点（mount）。

### 基本示例

```
同层级比较的过程示意：

旧 VNode 树：               新 VNode 树：
    div                        div
   / | \                      / | \
  h1  p  span               h1  p  ul
  |   |   |                 |   |   |
 "A" "B" "C"               "X" "B"  li
                                     |
                                    "D"

Patch 过程（同层级比较）：

第1层：div vs div
  → type 相同 → patch（更新属性，递归比较子节点）

第2层：
  h1 vs h1 → type 相同 → patch
  p vs p → type 相同 → patch
  span vs ul → type 不同 → 卸载 span，挂载 ul

第3层：
  "A" vs "X" → 文本不同 → 更新文本
  "B" vs "B" → 相同 → 跳过
  "C" 已被卸载（随 span 一起）
  li 是新节点 → 挂载

不会发生的情况：
  → 不会把第2层的 span 和第3层的 li 比较
  → 不会跨层级移动节点
```

```javascript
// Patch 算法的简化实现
function patch(n1, n2, container) {
    // n1: 旧 VNode, n2: 新 VNode

    // 如果旧节点存在且类型不同，直接替换
    if (n1 && n1.type !== n2.type) {
        unmount(n1);       // 卸载旧节点
        n1 = null;         // 当作首次挂载
    }

    const { type } = n2;

    if (typeof type === "string") {
        // 元素节点
        if (!n1) {
            mountElement(n2, container);      // 首次挂载
        } else {
            patchElement(n1, n2);             // 更新
        }
    } else if (typeof type === "object") {
        // 组件节点
        if (!n1) {
            mountComponent(n2, container);    // 挂载组件
        } else {
            patchComponent(n1, n2);           // 更新组件
        }
    } else if (type === Text) {
        // 文本节点
        if (!n1) {
            // 挂载文本
            const el = document.createTextNode(n2.children);
            container.appendChild(el);
            n2.el = el;
        } else {
            // 更新文本
            if (n1.children !== n2.children) {
                n1.el.textContent = n2.children;
            }
            n2.el = n1.el;
        }
    }
}
```

### 内部原理

#### Patch 的完整判断流程

```
patch(n1, n2, container) 的决策树：

1. n1 === n2
   → 完全相同的 VNode → 跳过（什么都不做）

2. n1 存在 且 n1.type !== n2.type
   → 类型不同 → unmount(n1) + mount(n2)

3. n1 存在 且 n1.key !== n2.key
   → key 不同 → unmount(n1) + mount(n2)

4. 根据 n2.type 分发处理：
   → string（元素）→ processElement
   → object（组件）→ processComponent
   → Text → processText
   → Comment → processComment
   → Fragment → processFragment

5. processElement 内部：
   → n1 为 null → mountElement（创建 DOM）
   → n1 存在 → patchElement（更新属性 + Diff 子节点）

6. patchElement 内部：
   → patchProps（逐个对比属性）
   → patchChildren（对比子节点）
     → 新旧都是文本 → 更新文本
     → 新是数组，旧是文本 → 清空文本，挂载数组
     → 新是文本，旧是数组 → 卸载数组，设置文本
     → 新旧都是数组 → 进入 Diff 算法
```

### 与相关API的对比

| 操作 | 条件 | DOM 操作 |
|------|------|---------|
| 跳过 | n1 === n2 | 无 |
| 挂载 | n1 为 null | createElement + appendChild |
| 卸载 | n2 为 null | removeChild |
| 替换 | type 不同 | removeChild + createElement + appendChild |
| 更新 | type 和 key 相同 | 更新属性 + 递归子节点 |

### 适用场景

- **理解 Vue 更新机制：** Patch 是 Vue 响应式更新的最后一环
- **性能优化：** 理解为什么 key 对列表渲染重要
- **调试渲染问题：** 理解为什么某些情况下组件被销毁重建

### 常见问题

#### 为什么不做跨层级比较

**解决方案：**

```
跨层级比较的代价：
  完整树 Diff 的时间复杂度是 O(n^3)
  1000 个节点需要 10^9 次比较 → 不可接受

同层级比较的权衡：
  时间复杂度降到 O(n)
  1000 个节点只需要 1000 次比较

实际场景中跨层级移动很少见：
  → 大多数 UI 更新是文本变化、属性变化、列表增删
  → 很少把一个节点从一个父节点移到完全不同的父节点
  → 即使有这种需求，卸载+重建的成本通常可接受
```

### 注意事项

- Patch 只做同层级比较，不跨层级
- type 不同的节点直接替换，不尝试复用
- key 不同的节点也视为不同节点
- 文本节点的更新直接修改 textContent
- 组件节点的更新通过 props 对比触发组件自身更新
- Fragment 节点直接比较其 children

### 总结

Patch 算法采用同层级比较策略，将树 Diff 复杂度从 O(n^3) 降到 O(n)。type 和 key 相同的节点进行更新，不同的节点直接替换。根据节点类型（元素、组件、文本等）分发到不同的处理逻辑。同层级比较是基于实际 Web 应用场景的合理权衡。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### Diff算法的双端比较策略

### 概念说明

当新旧两组子节点都是数组时，Vue 需要通过 Diff 算法找出差异并高效更新。Vue 3 的 Diff 算法在处理有 key 的子节点列表时，采用了一种结合预处理和最长递增子序列的策略，而 Vue 2 则使用经典的双端比较法。

双端比较的思路是：同时从新旧两个子节点数组的头部和尾部进行比较。维护四个指针——旧头（oldStart）、旧尾（oldEnd）、新头（newStart）、新尾（newEnd），每次比较时尝试四种匹配：旧头对新头、旧尾对新尾、旧头对新尾、旧尾对新头。如果匹配成功（type 和 key 相同），则复用并移动节点；如果四种都不匹配，则在旧列表中查找新头对应的节点。

Vue 3 的算法在双端预处理（头头/尾尾比较）的基础上，对中间乱序部分使用最长递增子序列（LIS）来最小化 DOM 移动操作，比 Vue 2 的双端比较更高效。

### 基本示例

```
Vue 3 的 Diff 过程（简化示意）：

旧子节点：[A, B, C, D, E, F, G]
新子节点：[A, B, E, C, D, H, F, G]

===== 第1步：从头部开始预处理 =====
A vs A → 相同 → patch，头指针后移
B vs B → 相同 → patch，头指针后移
C vs E → 不同 → 停止头部预处理

===== 第2步：从尾部开始预处理 =====
G vs G → 相同 → patch，尾指针前移
F vs F → 相同 → patch，尾指针前移

===== 第3步：处理中间乱序部分 =====
旧：[C, D, E]
新：[E, C, D, H]

→ 建立旧节点 key → index 的映射：{ C:2, D:3, E:4 }
→ 遍历新中间部分：
  E → 在旧中找到 index=4 → 标记复用
  C → 在旧中找到 index=2 → 标记复用
  D → 在旧中找到 index=3 → 标记复用
  H → 在旧中找不到 → 标记为新增

→ 复用节点的旧索引序列：[4, 2, 3]
→ 最长递增子序列：[2, 3]（对应 C, D）
→ C 和 D 不需要移动，E 需要移动到前面
→ H 是新节点，需要挂载

最终 DOM 操作：
  → 移动 E 到 C 前面
  → 挂载 H 到 D 后面
  → 总共 2 次 DOM 操作（移动1次 + 挂载1次）
```

### 内部原理

#### Vue 3 Diff 算法的核心流程

```
patchKeyedChildren(c1, c2, container) 的核心步骤：

1. 头部预处理（sync from start）
   while (i <= e1 && i <= e2) {
       if (isSameVNodeType(c1[i], c2[i])) {
           patch(c1[i], c2[i]);
           i++;
       } else break;
   }

2. 尾部预处理（sync from end）
   while (i <= e1 && i <= e2) {
       if (isSameVNodeType(c1[e1], c2[e2])) {
           patch(c1[e1], c2[e2]);
           e1--; e2--;
       } else break;
   }

3. 仅有新增节点
   if (i > e1 && i <= e2) {
       // 旧节点已遍历完，剩余新节点全部挂载
       for (let j = i; j <= e2; j++) mount(c2[j]);
   }

4. 仅有删除节点
   if (i > e2 && i <= e1) {
       // 新节点已遍历完，剩余旧节点全部卸载
       for (let j = i; j <= e1; j++) unmount(c1[j]);
   }

5. 中间乱序部分
   → 建立新节点 key → index 映射
   → 遍历旧中间节点，在映射中查找
     → 找到 → patch 复用
     → 找不到 → unmount 删除
   → 计算最长递增子序列（LIS）
   → LIS 中的节点不需要移动
   → 其他节点需要移动或新增
```

### 与相关API的对比

| 算法 | 框架 | 策略 | 移动优化 |
|------|------|------|---------|
| Vue 2 双端比较 | Vue 2 | 四指针首尾交叉 | 无 LIS 优化 |
| Vue 3 快速 Diff | Vue 3 | 预处理 + LIS | 最长递增子序列 |
| React Diff | React | 单向遍历 | 仅右移 |

### 适用场景

- **列表渲染：** v-for 渲染的列表增删改排序
- **动态组件：** 条件切换的组件更新
- **性能优化：** 理解 key 对 Diff 效率的影响

### 常见问题

#### 没有 key 时的就地更新策略

**解决方案：**

```
没有 key 时 Vue 使用"就地更新"策略：

旧：[A, B, C]
新：[B, C, A]

无 key → 逐位置比较：
  位置0：A → B → patch A 为 B（修改内容）
  位置1：B → C → patch B 为 C
  位置2：C → A → patch C 为 A
  → 3 次 DOM 内容更新

有 key → 识别相同节点并移动：
  A(key:1) 移动到末尾
  → 1 次 DOM 移动

有 key 时 DOM 操作更少，且能正确保持组件状态。
```

### 注意事项

- Vue 3 的 Diff 比 Vue 2 更高效（LIS 优化）
- 头尾预处理可以快速处理常见的增删场景
- 最长递增子序列最小化了 DOM 移动操作
- 没有 key 时使用就地更新，可能导致状态错乱
- key 应该是唯一且稳定的标识
- Diff 只处理同层级的子节点数组

### 总结

Vue 3 的 Diff 算法采用头尾预处理加最长递增子序列（LIS）的策略。头尾预处理快速处理不变的头部和尾部节点，中间乱序部分通过 key 映射查找复用节点，LIS 确定不需要移动的最大节点集合，最小化 DOM 移动操作。相比 Vue 2 的双端比较和 React 的单向遍历都更高效。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### Diff算法的快速路径(相同引用)

### 概念说明

Vue 3 的 Patch 算法在进入复杂的 Diff 比较之前，会先执行一些快速路径检查。最直接的一个就是"相同引用检查"：如果新旧 VNode 是同一个 JavaScript 对象引用（`n1 === n2`），说明 VNode 完全没有变化，可以直接跳过整个 Patch 过程，不做任何 DOM 操作。

这种优化在几个场景中会生效：静态提升的 VNode（因为被提升到渲染函数外部，每次渲染返回的是同一个引用）；被 `v-once` 标记的节点（只创建一次 VNode，后续渲染复用同一引用）；以及 `v-memo` 缓存命中时返回的缓存 VNode。

快速路径检查是 O(1) 的操作，可以在最早的阶段避免不必要的深层比较和 DOM 操作，是 Vue 3 编译时优化和运行时优化协作的体现。

### 基本示例

```javascript
// Patch 函数中的快速路径检查
function patch(n1, n2, container) {
    // 快速路径：相同引用，直接跳过
    if (n1 === n2) {
        return; // 什么都不做
    }

    // ... 后续的 type 检查、属性对比、子节点 Diff 等
}
```

```javascript
// 静态提升使快速路径生效的原理

// 编译后的代码：
// 静态 VNode 在渲染函数外部创建，只创建一次
const _hoisted_1 = /*#__PURE__*/ createElementVNode(
    "h1", null, "静态标题", -1 /* HOISTED */
);
const _hoisted_2 = /*#__PURE__*/ createElementVNode(
    "p", null, "静态段落", -1 /* HOISTED */
);

function render(_ctx) {
    return createElementBlock("div", null, [
        _hoisted_1,  // 每次渲染返回同一个引用
        _hoisted_2,  // 每次渲染返回同一个引用
        createElementVNode("span", null, toDisplayString(_ctx.msg), 1),
    ]);
}

// 第一次渲染：挂载所有节点
// 第二次渲染（msg 变化时）：
//   _hoisted_1: n1 === n2（同一引用）→ 跳过
//   _hoisted_2: n1 === n2（同一引用）→ 跳过
//   span: msg 变化 → 只更新文本
```

### 内部原理

#### 快速路径的触发场景

```
快速路径 (n1 === n2) 的触发场景：

1. 静态提升（HoistStatic）
   → 静态节点被提升为模块级变量
   → 每次渲染函数执行返回同一个 VNode 引用
   → Patch 时 n1 === n2 → 跳过

2. v-once
   → 首次渲染后缓存 VNode
   → 后续渲染直接返回缓存的 VNode
   → n1 === n2 → 跳过

3. v-memo 缓存命中
   → 依赖值未变化时返回缓存的 VNode 子树
   → n1 === n2 → 跳过整个子树

4. 静态组件树
   → 没有动态绑定的组件子树
   → 编译器检测到不需要更新
   → 返回相同引用

性能收益：
  → 跳过属性对比（O(props) → O(1)）
  → 跳过子节点 Diff（O(children) → O(1)）
  → 跳过 DOM 操作（0 次 DOM 访问）
  → 对于大量静态内容的页面，提升显著
```

### 与相关API的对比

| 优化方式 | 机制 | 跳过范围 |
|---------|------|---------|
| 相同引用 (n1===n2) | 引用比较 | 整个节点及子树 |
| PatchFlag | 位标记 | 只对比标记的部分 |
| Block + dynamicChildren | 动态子节点追踪 | 跳过静态子节点 |

### 适用场景

- **静态内容多的页面：** 大量文字、固定布局等
- **v-once 标记的一次性内容：** 不会变化的大型模板片段
- **v-memo 缓存的列表项：** 条件未变化时跳过更新

### 常见问题

#### 如何让更多节点命中快速路径

**解决方案：**

```vue
<template>
    <!-- 编译器自动静态提升（不需要手动处理） -->
    <h1>这个标题永远不变</h1>
    <p>这段文字也不变</p>

    <!-- v-once：手动标记一次性内容 -->
    <div v-once>
        <p>{{ initialData }}</p>
        <!-- 只渲染一次，后续更新跳过 -->
    </div>

    <!-- v-memo：条件缓存 -->
    <div v-memo="[item.id, item.selected]">
        <!-- 只有 id 或 selected 变化时才重新渲染 -->
        <p>{{ item.name }}</p>
    </div>
</template>
```

### 注意事项

- 相同引用检查是 Patch 的第一步，开销最小
- 静态提升由编译器自动完成，开发者不需要手动处理
- v-once 和 v-memo 是开发者可以主动使用的优化手段
- 不要手动缓存和复用 VNode 对象（可能导致问题）
- 快速路径跳过的是整个子树，包括所有后代节点
- 这是编译时优化和运行时优化协作的典型体现

### 总结

相同引用快速路径（n1 === n2）是 Patch 算法的第一个检查，可以在 O(1) 时间内跳过整个节点及其子树的对比和更新。静态提升、v-once、v-memo 缓存命中都会触发这个快速路径。对于静态内容多的页面，这个优化可以显著减少不必要的 Diff 和 DOM 操作。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### Diff算法的keyed children优化

### 概念说明

当子节点列表中的每个节点都有唯一的 `key` 属性时，Vue 的 Diff 算法可以通过 key 精确识别每个节点的身份，从而做出最优的更新决策——复用已有节点、移动节点位置、新增或删除节点。

没有 key 时，Vue 使用"就地更新"策略：按索引位置逐个对比，直接在原位置更新内容。这种方式在列表项内容简单时没问题，但在列表项包含组件状态、表单输入等有内部状态的元素时，会导致状态错乱——因为 Vue 复用了错误位置的 DOM 元素。

有 key 时，Vue 构建 key → VNode 的映射关系，精确找到新旧列表中相同 key 的节点进行 patch，并通过最长递增子序列（LIS）算法最小化 DOM 移动操作。

### 基本示例

```vue
<script setup>
import { ref } from "vue";

const items = ref([
    { id: 1, name: "苹果" },
    { id: 2, name: "香蕉" },
    { id: 3, name: "橙子" },
]);

// 在头部插入新元素
function addFirst() {
    items.value.unshift({ id: Date.now(), name: "葡萄" });
}

// 删除第二个元素
function removeSecond() {
    items.value.splice(1, 1);
}

// 反转列表
function reverse() {
    items.value.reverse();
}
</script>

<template>
    <!-- 有 key：精确匹配，最小化 DOM 操作 -->
    <ul>
        <li v-for="item in items" :key="item.id">
            {{ item.name }}
            <input placeholder="输入内容" />
        </li>
    </ul>
    <!-- 反转时：移动 DOM 节点，input 的输入内容跟随正确的 item -->

    <!-- 无 key：就地更新，可能状态错乱 -->
    <!-- <ul>
        <li v-for="item in items">
            {{ item.name }}
            <input placeholder="输入内容" />
        </li>
    </ul> -->
    <!-- 反转时：只更新文本，input 不移动，输入内容错位 -->

    <button @click="addFirst">头部添加</button>
    <button @click="removeSecond">删除第二个</button>
    <button @click="reverse">反转</button>
</template>
```

```
有 key 的 Diff 过程（头部插入场景）：

旧：[{id:1}, {id:2}, {id:3}]
新：[{id:4}, {id:1}, {id:2}, {id:3}]

头部预处理：id:1 vs id:4 → 不同 → 停止
尾部预处理：id:3 vs id:3 → 相同 → patch
            id:2 vs id:2 → 相同 → patch
            id:1 vs id:1 → 相同 → patch

剩余：新节点 {id:4} 没有对应旧节点 → 挂载
结果：只需要 1 次 DOM 插入操作

无 key 的就地更新（同样场景）：
  位置0: {id:1}→{id:4} → 更新文本
  位置1: {id:2}→{id:1} → 更新文本
  位置2: {id:3}→{id:2} → 更新文本
  位置3: 无→{id:3} → 新增
  结果：3 次文本更新 + 1 次新增 = 4 次 DOM 操作
```

### 内部原理

#### keyed Diff 的映射和匹配

```
patchKeyedChildren 中间乱序部分的处理：

旧：[A(1), B(2), C(3), D(4), E(5)]
新：[A(1), D(4), B(2), E(5), C(3)]

头部预处理：A vs A → patch（相同）
尾部预处理：无匹配

中间乱序部分：
旧：[B(2), C(3), D(4), E(5)]
新：[D(4), B(2), E(5), C(3)]

步骤1：建立新节点 key → index 映射
  { 4→0, 2→1, 5→2, 3→3 }

步骤2：遍历旧节点，在映射中查找
  B(key:2) → 在新中 index=1 → patch 复用
  C(key:3) → 在新中 index=3 → patch 复用
  D(key:4) → 在新中 index=0 → patch 复用
  E(key:5) → 在新中 index=2 → patch 复用

步骤3：计算旧索引在新序列中的位置
  新位置序列：[0, 1, 2, 3]
  对应旧索引：[2, 0, 3, 1]（D在旧中index=2, B=0, E=3, C=1）

步骤4：最长递增子序列
  [2, 0, 3, 1] 的 LIS = [0, 1]（对应 B, C）
  B 和 C 不需要移动
  D 需要移动到最前面
  E 需要移动到 B 后面

步骤5：从右向左遍历，移动不在 LIS 中的节点
  → 2 次 DOM 移动操作
```

### 与相关API的对比

| 场景 | 无 key | 有 key |
|------|--------|--------|
| 头部插入 | 所有节点更新内容 | 只插入新节点 |
| 尾部追加 | 只追加新节点 | 只追加新节点 |
| 列表反转 | 所有节点更新内容 | 移动 DOM 节点 |
| 中间删除 | 后续节点全部更新 | 只删除目标节点 |
| 内部状态保持 | 可能错乱 | 正确保持 |

### 适用场景

- **动态列表：** 有增删改排序的列表渲染
- **有状态列表项：** 列表项包含组件、表单输入等
- **动画列表：** transition-group 需要 key 来追踪元素

### 常见问题

#### 用数组索引做 key 的问题

**解决方案：**

```vue
<!-- 错误：数组索引做 key -->
<li v-for="(item, index) in items" :key="index">
    {{ item.name }}
    <input v-model="item.input" />
</li>
<!-- 
  问题：删除第一项后，所有 index 都变化
  index:0 的内容从 A 变成 B → 就地更新
  input 状态错乱
-->

<!-- 正确：唯一稳定的 ID 做 key -->
<li v-for="item in items" :key="item.id">
    {{ item.name }}
    <input v-model="item.input" />
</li>
```

### 注意事项

- v-for 必须提供 key，且 key 应唯一且稳定
- 不要用数组索引做 key（列表变化时索引也变）
- 有 key 时 Vue 使用精确匹配 + LIS 优化
- 无 key 时 Vue 使用就地更新，可能导致状态错乱
- key 相同但 type 不同的节点仍会被替换
- transition-group 中 key 是必须的

### 总结

keyed children 优化让 Diff 算法可以通过 key 精确识别节点身份，在列表增删改排序时做出最优决策。有 key 时通过映射匹配 + 最长递增子序列最小化 DOM 操作，无 key 时使用就地更新可能导致状态错乱。key 应该是唯一且稳定的标识（如数据库 ID），不要使用数组索引。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### PatchFlag的动态节点标记

### 概念说明

PatchFlag 是 Vue 3 编译时优化的核心机制。编译器在分析模板时，会为每个动态节点标记一个 PatchFlag 数字，告诉运行时的 Patch 算法这个节点的哪些部分是动态的（会变化的）。Patch 时只需要检查 PatchFlag 标记的部分，跳过静态部分的对比。

PatchFlag 的值是位掩码（bitmask），每一位代表一种动态类型。比如 `1` 表示只有文本内容是动态的，`2` 表示只有 class 是动态的，`4` 表示只有 style 是动态的。多种动态类型可以通过位或运算组合（如 TEXT | CLASS = 3）。

PatchFlag 是编译时确定的，不需要运行时计算。这是 Vue 3 相比 Vue 2 的关键性能优化之一——Vue 2 的 Diff 需要对比所有属性，Vue 3 只对比 PatchFlag 标记的动态部分。

### 基本示例

```html
<!-- 模板 -->
<div>
    <p>{{ message }}</p>
    <div :class="cls">内容</div>
    <span :style="style">文本</span>
    <input :id="id" :disabled="disabled" />
    <h1>静态标题</h1>
</div>
```

```javascript
// 编译后的渲染函数（简化）
import { createElementVNode, toDisplayString, openBlock, createElementBlock } from "vue";

const _hoisted_1 = createElementVNode("h1", null, "静态标题", -1); // HOISTED

function render(_ctx) {
    return (openBlock(), createElementBlock("div", null, [
        // PatchFlag = 1 (TEXT)：只有文本是动态的
        createElementVNode("p", null, toDisplayString(_ctx.message), 1 /* TEXT */),

        // PatchFlag = 2 (CLASS)：只有 class 是动态的
        createElementVNode("div", { class: _ctx.cls }, "内容", 2 /* CLASS */),

        // PatchFlag = 4 (STYLE)：只有 style 是动态的
        createElementVNode("span", { style: _ctx.style }, "文本", 4 /* STYLE */),

        // PatchFlag = 8 (PROPS)：指定的 props 是动态的
        createElementVNode("input", {
            id: _ctx.id,
            disabled: _ctx.disabled,
        }, null, 8 /* PROPS */, ["id", "disabled"]),
        // 第5个参数告诉运行时具体哪些 props 是动态的

        // PatchFlag = -1 (HOISTED)：静态提升，永不更新
        _hoisted_1,
    ]));
}
```

### 内部原理

#### PatchFlag 在 Patch 时的作用

```
PatchFlag 的运行时处理：

function patchElement(n1, n2) {
    const el = n2.el = n1.el;
    const patchFlag = n2.patchFlag;

    if (patchFlag > 0) {
        // 有 PatchFlag → 精确更新

        if (patchFlag & 1 /* TEXT */) {
            // 只更新文本内容
            if (n1.children !== n2.children) {
                el.textContent = n2.children;
            }
        }

        if (patchFlag & 2 /* CLASS */) {
            // 只更新 class
            if (n1.props.class !== n2.props.class) {
                el.className = n2.props.class;
            }
        }

        if (patchFlag & 4 /* STYLE */) {
            // 只更新 style
            patchStyle(el, n1.props.style, n2.props.style);
        }

        if (patchFlag & 8 /* PROPS */) {
            // 只更新指定的动态 props
            const dynamicProps = n2.dynamicProps; // ["id", "disabled"]
            for (const key of dynamicProps) {
                if (n1.props[key] !== n2.props[key]) {
                    patchProp(el, key, n1.props[key], n2.props[key]);
                }
            }
        }

        // 没有标记的属性完全跳过对比
    } else if (patchFlag === 0) {
        // 没有 PatchFlag → 全量对比所有属性
        patchProps(el, n1.props, n2.props);
    }

    // patchFlag < 0 的特殊值：
    // -1 (HOISTED)：静态提升，不会进入 patchElement
    // -2 (BAIL)：需要完整 Diff
}
```

### 与相关API的对比

| PatchFlag 值 | 常量名 | 含义 |
|-------------|-------|------|
| 1 | TEXT | 动态文本内容 |
| 2 | CLASS | 动态 class |
| 4 | STYLE | 动态 style |
| 8 | PROPS | 动态非 class/style 的 props |
| 16 | FULL_PROPS | 包含动态 key 的 props |
| 32 | NEED_HYDRATION | 需要 SSR 水合 |
| 64 | STABLE_FRAGMENT | 子节点顺序不变的 Fragment |
| -1 | HOISTED | 静态提升节点 |
| -2 | BAIL | 退出优化模式 |

### 适用场景

- **理解编译优化：** PatchFlag 是 Vue 3 性能优化的核心
- **性能调优：** 通过编译结果确认优化是否生效
- **对比 Vue 2/3：** 理解 Vue 3 Diff 更快的原因

### 常见问题

#### 什么情况下 PatchFlag 会变成 FULL_PROPS

**解决方案：**

```html
<!-- 动态属性名（key 是动态的） -->
<div :[dynamicAttr]="value">内容</div>
<!-- PatchFlag = 16 (FULL_PROPS) -->
<!-- 因为不知道哪个属性会变，需要全量对比 props -->

<!-- v-bind 展开对象 -->
<div v-bind="propsObj">内容</div>
<!-- PatchFlag = 16 (FULL_PROPS) -->

<!-- 静态属性名（优化更好） -->
<div :class="cls" :id="id">内容</div>
<!-- PatchFlag = 2 | 8 (CLASS | PROPS) -->
<!-- 只对比 class 和指定的 props -->
```

### 注意事项

- PatchFlag 是编译时确定的，不需要运行时计算
- 位掩码设计支持多种动态类型的组合
- PatchFlag > 0 表示有具体的动态标记
- PatchFlag = 0 表示没有标记，需要全量对比
- PatchFlag < 0 表示特殊状态（HOISTED 或 BAIL）
- 动态属性名会退化为 FULL_PROPS，性能较差

### 总结

PatchFlag 是 Vue 3 编译时优化的核心，为每个动态节点标记哪些部分会变化。运行时 Patch 只对比 PatchFlag 标记的部分，跳过静态内容。使用位掩码设计支持类型组合。这让 Vue 3 的 Diff 从全量属性对比变为精确的靶向更新，大幅提升了更新性能。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### PatchFlag的TEXT/CLASS/STYLE等标记

### 概念说明

PatchFlag 使用位掩码表示不同的动态内容类型，每个标记对应一种特定的动态属性。Vue 3 定义了多种 PatchFlag 常量，编译器根据模板中的动态绑定自动选择对应的标记。运行时 Patch 根据这些标记精确定位需要更新的部分。

常用的 PatchFlag 标记包括：TEXT（1，动态文本）、CLASS（2，动态 class）、STYLE（4，动态 style）、PROPS（8，动态非 class/style 属性）、FULL_PROPS（16，含动态 key 的属性）等。多种标记可以通过位或运算组合，比如一个节点同时有动态文本和动态 class，其 PatchFlag 就是 `TEXT | CLASS = 3`。

### 基本示例

```html
<!-- 各种 PatchFlag 标记对应的模板写法 -->

<!-- TEXT (1)：动态文本内容 -->
<p>{{ message }}</p>
<!-- patchFlag = 1 -->

<!-- CLASS (2)：动态 class 绑定 -->
<div :class="activeClass">内容</div>
<!-- patchFlag = 2 -->

<!-- STYLE (4)：动态 style 绑定 -->
<span :style="{ color: textColor }">文本</span>
<!-- patchFlag = 4 -->

<!-- PROPS (8)：动态的具名 props -->
<input :id="inputId" :placeholder="hint" />
<!-- patchFlag = 8, dynamicProps = ["id", "placeholder"] -->

<!-- 组合标记：TEXT | CLASS = 3 -->
<p :class="cls">{{ msg }}</p>
<!-- patchFlag = 3 -->

<!-- 组合标记：CLASS | STYLE | PROPS = 14 -->
<div :class="cls" :style="stl" :title="tip">内容</div>
<!-- patchFlag = 14, dynamicProps = ["title"] -->

<!-- FULL_PROPS (16)：动态属性名 -->
<div :[attrName]="attrValue">内容</div>
<!-- patchFlag = 16（无法确定哪个属性变化，全量对比） -->

<!-- NEED_HYDRATION (32)：SSR 水合相关 -->
<!-- 由 SSR 编译器自动添加 -->

<!-- STABLE_FRAGMENT (64)：子节点顺序不变的 Fragment -->
<!-- v-for 产生的 Fragment -->

<!-- HOISTED (-1)：静态提升节点 -->
<h1>永远不变的标题</h1>
<!-- patchFlag = -1，永不参与 Diff -->
```

```javascript
// 编译后的代码展示各种 PatchFlag
function render(_ctx) {
    return (openBlock(), createElementBlock("div", null, [
        // TEXT (1)
        createElementVNode("p", null,
            toDisplayString(_ctx.message), 1 /* TEXT */),

        // CLASS (2)
        createElementVNode("div",
            { class: normalizeClass(_ctx.activeClass) },
            "内容", 2 /* CLASS */),

        // STYLE (4)
        createElementVNode("span",
            { style: normalizeStyle({ color: _ctx.textColor }) },
            "文本", 4 /* STYLE */),

        // PROPS (8) + 指定动态属性名列表
        createElementVNode("input", {
            id: _ctx.inputId,
            placeholder: _ctx.hint,
        }, null, 8 /* PROPS */, ["id", "placeholder"]),

        // TEXT | CLASS (3)
        createElementVNode("p",
            { class: normalizeClass(_ctx.cls) },
            toDisplayString(_ctx.msg), 3 /* TEXT, CLASS */),
    ]));
}
```

### 内部原理

#### 位掩码的运算逻辑

```
PatchFlag 位掩码设计：

TEXT       = 0b00000001 = 1
CLASS      = 0b00000010 = 2
STYLE      = 0b00000100 = 4
PROPS      = 0b00001000 = 8
FULL_PROPS = 0b00010000 = 16

组合示例：
TEXT | CLASS = 0b00000011 = 3
→ 表示文本和 class 都是动态的

运行时检查：
if (patchFlag & TEXT)  → 检查文本是否变化
if (patchFlag & CLASS) → 检查 class 是否变化
if (patchFlag & STYLE) → 检查 style 是否变化

位运算的好处：
  → 一个数字表示多种组合
  → 检查某一位只需要 & 运算（O(1)）
  → 不需要数组或对象来存储标记
```

### 与相关API的对比

| PatchFlag | 值 | 含义 | Patch 行为 |
|-----------|------|------|-----------|
| TEXT | 1 | 动态文本 | 对比 textContent |
| CLASS | 2 | 动态 class | 对比 className |
| STYLE | 4 | 动态 style | 逐属性对比 style |
| PROPS | 8 | 动态具名 props | 只对比指定的 props |
| FULL_PROPS | 16 | 动态 key | 全量对比所有 props |
| HOISTED | -1 | 静态提升 | 完全跳过 |
| BAIL | -2 | 退出优化 | 全量 Diff |

### 适用场景

- **理解编译输出：** 分析 Vue Template Explorer 的编译结果
- **性能分析：** 确认动态绑定是否获得了正确的 PatchFlag
- **避免性能退化：** 避免触发 FULL_PROPS 或 BAIL

### 常见问题

#### 如何避免退化为 FULL_PROPS

**解决方案：**

```html
<!-- 退化为 FULL_PROPS (16) 的情况 -->
<!-- 动态属性名 -->
<div :[key]="value"></div>

<!-- v-bind 展开 -->
<div v-bind="obj"></div>

<!-- 优化写法：使用静态属性名 -->
<div :class="cls" :id="id" :title="tip"></div>
<!-- patchFlag = 2 | 8 (CLASS | PROPS) -->
<!-- 只对比 class + 指定的 props，比 FULL_PROPS 更高效 -->
```

### 注意事项

- PatchFlag 由编译器自动生成，开发者不需要手动设置
- 位掩码支持多种类型组合
- PROPS (8) 额外携带动态属性名列表作为第5个参数
- FULL_PROPS (16) 性能较差，尽量使用静态属性名
- HOISTED (-1) 的节点完全不参与 Diff
- BAIL (-2) 退出优化模式，触发全量 Diff

### 总结

PatchFlag 使用位掩码精确标记节点的动态内容类型：TEXT（文本）、CLASS、STYLE、PROPS（具名属性）等。运行时通过位与运算快速判断需要更新的部分。多种类型可以组合。PROPS 标记额外携带动态属性名列表。避免动态属性名和 v-bind 展开以防退化为 FULL_PROPS。这是 Vue 3 编译时优化的核心产物。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### 静态提升(HoistStatic)的编译优化

### 概念说明

静态提升（Hoist Static）是 Vue 3 编译器的一项重要优化。编译器在 Transform 阶段分析模板，将不包含任何动态绑定的静态节点（包括静态属性对象）提升到渲染函数外部，作为模块级别的常量。这样每次组件重新渲染时，不需要重新创建这些静态 VNode，直接复用已有的引用。

静态提升带来两个好处：一是减少了每次渲染时创建 VNode 的开销（内存和 CPU），二是 Patch 时由于新旧 VNode 是同一个引用（n1 === n2），可以直接跳过对比。对于包含大量静态内容的页面（如文档站、营销页），静态提升的性能收益非常明显。

Vue 3.x 默认在生产构建时开启静态提升。Vue 3 还会将连续的静态节点序列化为一个静态 HTML 字符串，通过 innerHTML 一次性插入，进一步提升首次渲染性能。

### 基本示例

```html
<!-- 模板 -->
<div>
    <h1>静态标题</h1>
    <p class="intro">这是一段固定的介绍文字</p>
    <span>{{ dynamicText }}</span>
    <footer>
        <p>版权信息 2026</p>
        <p>联系方式</p>
    </footer>
</div>
```

```javascript
// 未开启静态提升的编译结果：
// 每次渲染都重新创建所有 VNode
function render(_ctx) {
    return createElementBlock("div", null, [
        createElementVNode("h1", null, "静态标题"),           // 每次重新创建
        createElementVNode("p", { class: "intro" }, "这是一段固定的介绍文字"), // 每次重新创建
        createElementVNode("span", null, toDisplayString(_ctx.dynamicText), 1),
        createElementVNode("footer", null, [
            createElementVNode("p", null, "版权信息 2026"),     // 每次重新创建
            createElementVNode("p", null, "联系方式"),          // 每次重新创建
        ]),
    ]);
}
```

```javascript
// 开启静态提升后的编译结果：
// 静态节点提升到渲染函数外部

// 静态 VNode：只创建一次，所有渲染共享
const _hoisted_1 = /*#__PURE__*/ createElementVNode(
    "h1", null, "静态标题", -1 /* HOISTED */
);
const _hoisted_2 = /*#__PURE__*/ createElementVNode(
    "p", { class: "intro" }, "这是一段固定的介绍文字", -1 /* HOISTED */
);
// 连续静态节点可能被序列化为静态 HTML 字符串
const _hoisted_3 = /*#__PURE__*/ createStaticVNode(
    "<footer><p>版权信息 2026</p><p>联系方式</p></footer>", 1
);

function render(_ctx) {
    return (openBlock(), createElementBlock("div", null, [
        _hoisted_1,  // 直接引用，不重新创建
        _hoisted_2,  // 直接引用，不重新创建
        createElementVNode("span", null, toDisplayString(_ctx.dynamicText), 1 /* TEXT */),
        _hoisted_3,  // 静态 HTML 字符串
    ]));
}
```

### 内部原理

#### 静态提升的判断规则

```
编译器判断节点是否可以静态提升：

可以提升的条件：
  → 没有动态绑定（:bind、@on、v-if、v-for 等）
  → 没有插值表达式 {{ }}
  → 不是组件节点
  → 子节点也都是静态的（递归检查）

不能提升的情况：
  → 包含 :class、:style、:id 等动态绑定
  → 包含 {{ expr }} 插值
  → 包含 v-if、v-for、v-show 等指令
  → 是组件节点（组件可能有内部状态）
  → ref 属性（需要运行时绑定）

静态属性对象也会被提升：
  <div id="app" class="container">{{ msg }}</div>
  → { id: "app", class: "container" } 被提升
  → 节点本身因为有插值不能提升
  → 但属性对象是静态的，可以单独提升

连续静态节点的字符串化：
  → 多个连续静态节点序列化为 HTML 字符串
  → 通过 innerHTML 一次性插入
  → 首次渲染更快（减少 createElement 调用）
```

### 与相关API的对比

| 优化策略 | 作用阶段 | 效果 |
|---------|---------|------|
| 静态提升 | 编译时 | 避免重复创建静态 VNode |
| PatchFlag | 编译时 + 运行时 | 精确标记动态内容 |
| 快速路径(n1===n2) | 运行时 | 跳过静态节点 Diff |
| 静态字符串化 | 编译时 | 连续静态节点用 innerHTML |

### 适用场景

- **内容型页面：** 文档站、博客、营销页等静态内容多的页面
- **固定布局：** 导航栏、页脚等不变的 UI 结构
- **大型列表项：** 列表项中的静态部分

### 常见问题

#### 如何确认静态提升是否生效

**解决方案：**

```javascript
// 方式1：Vue Template Explorer
// 访问 https://template-explorer.vuejs.org/
// 勾选 Options → hoistStatic
// 查看编译输出中 _hoisted_ 开头的变量

// 方式2：检查构建产物
// 在构建后的代码中搜索 _hoisted_ 或 createStaticVNode
// 如果存在，说明静态提升已生效

// 方式3：Vue DevTools
// 在组件的渲染函数中查看是否有静态提升的引用
```

### 注意事项

- 静态提升在生产构建中默认开启
- 开发模式下可能不开启（便于调试）
- 只有完全静态的节点才会被提升
- 动态属性会阻止节点提升，但静态属性对象可以单独提升
- 连续静态节点会被序列化为 HTML 字符串
- 提升的 VNode 带有 PatchFlag = -1 (HOISTED)

### 总结

静态提升将不含动态绑定的节点提升到渲染函数外部，避免每次渲染重复创建 VNode。提升后的节点因为是同一引用，Patch 时可以直接跳过。连续静态节点还会被序列化为 HTML 字符串通过 innerHTML 插入。对于静态内容多的页面，这项优化可以显著减少内存分配和 CPU 开销。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### 静态节点的重复渲染跳过

### 概念说明

在 Vue 3 中，静态节点（没有任何动态绑定的节点）在组件更新时会被完全跳过，不参与 Diff 对比和 DOM 操作。这是静态提升和 Block 树两种优化机制协作的结果。

静态提升让静态 VNode 在每次渲染时返回同一个引用，Patch 算法检测到新旧 VNode 是同一个引用（n1 === n2）时直接跳过。Block 树机制则通过 dynamicChildren 数组只追踪动态子节点，Patch 时直接遍历 dynamicChildren 而非所有 children，静态节点根本不会被访问到。

这两种机制配合，让 Vue 3 在更新时的性能与模板大小无关，只与动态内容的数量相关。一个包含 1000 个静态节点和 1 个动态节点的模板，更新开销和只有 1 个动态节点的模板几乎一样。

### 基本示例

```html
<!-- 模板：大量静态内容 + 少量动态内容 -->
<div>
    <header>
        <h1>网站标题</h1>
        <nav>
            <a href="/">首页</a>
            <a href="/about">关于</a>
            <a href="/contact">联系</a>
        </nav>
    </header>
    <main>
        <p>这是一段很长的静态介绍文字...</p>
        <p>这是另一段静态内容...</p>
        <!-- 100 个静态段落... -->

        <!-- 唯一的动态内容 -->
        <span>{{ counter }}</span>
    </main>
    <footer>
        <p>版权所有 2026</p>
    </footer>
</div>
```

```javascript
// 编译后（简化）：

// 所有静态内容被提升（或字符串化）
const _hoisted_header = createStaticVNode("<header>...</header>", 1);
const _hoisted_paragraphs = createStaticVNode("<p>...</p><p>...</p>...", 100);
const _hoisted_footer = createStaticVNode("<footer>...</footer>", 1);

function render(_ctx) {
    return (openBlock(), createElementBlock("div", null, [
        _hoisted_header,      // 静态：跳过
        createElementVNode("main", null, [
            _hoisted_paragraphs,  // 静态：跳过
            // 唯一的动态节点
            createElementVNode("span", null,
                toDisplayString(_ctx.counter), 1 /* TEXT */),
        ]),
        _hoisted_footer,      // 静态：跳过
    ]));
}

// counter 变化时的更新过程：
// → Block 的 dynamicChildren 只包含 span 节点
// → Patch 只访问 span，对比文本
// → 其他 100+ 个静态节点完全不被访问
// → 更新耗时与静态节点数量无关
```

### 内部原理

#### Block 树如何跳过静态节点

```
Block 树 + dynamicChildren 的工作机制：

渲染时：
  openBlock()  → 开始收集动态子节点
  createElementBlock("div", ..., children)
    → 遍历 children
    → 检查每个子节点的 patchFlag
    → patchFlag > 0 → 加入 dynamicChildren
    → patchFlag <= 0（静态/提升）→ 不加入

div (Block) 的结构：
{
    type: 'div',
    children: [header, main, footer, ...],  // 所有子节点
    dynamicChildren: [span],                 // 只有动态子节点
}

更新时（patchBlockChildren）：
  → 不遍历 children（包含静态+动态）
  → 只遍历 dynamicChildren（只有动态节点）
  → 对每个动态节点执行 patch
  → 静态节点完全不被触及

性能对比：
  Vue 2：遍历所有子节点 → O(total_children)
  Vue 3：只遍历动态子节点 → O(dynamic_children)
  → 100 个静态 + 1 个动态 → Vue 3 只处理 1 个
```

### 与相关API的对比

| 机制 | 跳过方式 | 粒度 |
|------|---------|------|
| 静态提升 | 同一引用 n1===n2 | 单个节点 |
| Block dynamicChildren | 不遍历静态节点 | 整个静态子树 |
| 静态字符串化 | innerHTML 插入 | 连续静态节点序列 |
| v-once | 缓存 VNode | 指定子树 |

### 适用场景

- **内容型网站：** 文章页、文档页等大量静态文本
- **仪表盘：** 固定布局 + 少量动态数据
- **表单页面：** 大量标签文字 + 少量输入框

### 常见问题

#### 动态绑定会阻止静态跳过

**解决方案：**

```html
<!-- 问题：给静态元素加了不必要的动态绑定 -->
<p :class="'fixed-class'">静态内容</p>
<!-- 虽然 class 值永远不变，但编译器检测到 : 绑定 -->
<!-- 标记为动态节点，无法跳过 -->

<!-- 优化：使用静态属性 -->
<p class="fixed-class">静态内容</p>
<!-- 编译器识别为静态节点，可以提升和跳过 -->

<!-- 同理，避免对常量使用动态绑定 -->
<!-- 不好：<div :id="'app'"> -->
<!-- 好：  <div id="app"> -->
```

### 注意事项

- 静态节点跳过是自动的，不需要手动配置
- 更新性能只与动态节点数量相关，与模板总大小无关
- 避免给静态内容添加不必要的动态绑定
- Block 树的 dynamicChildren 是跳过的核心机制
- 静态字符串化进一步优化首次渲染性能
- 这是 Vue 3 相比 Vue 2 的重大性能提升

### 总结

Vue 3 通过静态提升和 Block 树的 dynamicChildren 机制，在更新时完全跳过静态节点。静态提升让静态 VNode 保持同一引用，Block 树只追踪动态子节点。更新性能只与动态内容数量相关，与模板大小无关。开发者应避免给静态内容添加不必要的动态绑定，以充分利用这项优化。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### 事件监听器的缓存(Cache Handler)

### 概念说明

事件监听器缓存（Cache Handler）是 Vue 3 编译器的一项优化。在模板中使用 `@click="handler"` 这样的事件绑定时，编译器会将事件处理函数缓存到组件实例的 `_cache` 数组中。后续渲染时直接使用缓存的函数引用，避免每次渲染都创建新的函数引用。

这个优化的意义在于：如果每次渲染都创建新的事件处理函数，Patch 时会检测到 `onClick` 的值发生了变化（新旧函数引用不同），从而触发不必要的 DOM 事件更新。缓存后函数引用保持不变，Patch 可以跳过事件属性的更新。

更重要的是，缓存事件处理函数后，编译器可以将节点视为"更静态"——原本因为事件绑定而被标记为动态的节点，在缓存后可以不带 PROPS 的 PatchFlag，减少运行时对比。

### 基本示例

```html
<!-- 模板 -->
<button @click="handleClick">点击</button>
<input @input="handleInput" @focus="handleFocus" />
```

```javascript
// 未开启事件缓存的编译结果：
function render(_ctx) {
    return (openBlock(), createElementBlock(Fragment, null, [
        // 每次渲染都创建新的 onClick 函数引用
        createElementVNode("button", {
            onClick: _ctx.handleClick  // 每次都是新的引用
        }, "点击", 8 /* PROPS */, ["onClick"]),
        // PatchFlag = 8，运行时需要对比 onClick

        createElementVNode("input", {
            onInput: _ctx.handleInput,
            onFocus: _ctx.handleFocus,
        }, null, 8 /* PROPS */, ["onInput", "onFocus"]),
    ]));
}
```

```javascript
// 开启事件缓存后的编译结果：
function render(_ctx, _cache) {
    return (openBlock(), createElementBlock(Fragment, null, [
        createElementVNode("button", {
            // 缓存事件处理函数
            onClick: _cache[0] || (_cache[0] = (...args) => (_ctx.handleClick && _ctx.handleClick(...args)))
        }, "点击"),
        // 没有 PatchFlag！因为事件已缓存，不需要对比

        createElementVNode("input", {
            onInput: _cache[1] || (_cache[1] = (...args) => (_ctx.handleInput && _ctx.handleInput(...args))),
            onFocus: _cache[2] || (_cache[2] = (...args) => (_ctx.handleFocus && _ctx.handleFocus(...args))),
        }, null),
        // 同样没有 PatchFlag
    ]));
}
```

### 内部原理

#### 事件缓存的工作机制

```
事件缓存的编译转换：

@click="handleClick" 编译为：

未缓存：
  onClick: _ctx.handleClick
  → 每次渲染从 _ctx 取值，得到新引用
  → PatchFlag 标记为 PROPS

缓存后：
  onClick: _cache[0] || (_cache[0] = (...args) => (
      _ctx.handleClick && _ctx.handleClick(...args)
  ))
  → 首次渲染：_cache[0] 不存在 → 创建包装函数并缓存
  → 后续渲染：_cache[0] 已存在 → 直接使用缓存
  → 函数引用始终是 _cache[0]，不变
  → 包装函数内部通过 _ctx 动态查找实际 handler
  → 即使 handler 变了，缓存的包装函数不变

_cache 是组件实例上的数组：
  → 在 setupComponent 时初始化
  → 每个缓存的事件占一个数组位置
  → 整个组件生命周期内持久存在

性能收益：
  → 避免每次渲染创建新函数
  → PatchFlag 可以不标记 PROPS
  → Patch 时跳过事件属性对比
  → 对子组件的 props 不变检查也有帮助
```

### 与相关API的对比

| 特性 | 未缓存 | 已缓存 |
|------|--------|--------|
| 函数引用 | 每次渲染新引用 | 始终同一引用 |
| PatchFlag | PROPS (8) | 无（或更小的标记） |
| Patch 行为 | 需要对比事件属性 | 跳过事件属性 |
| 子组件影响 | 可能触发子组件更新 | 不触发不必要更新 |

### 适用场景

- **普通事件绑定：** @click、@input、@change 等
- **内联处理函数：** @click="count++" 等简单表达式
- **性能敏感组件：** 频繁更新的组件中的事件绑定

### 常见问题

#### 内联函数与缓存的关系

**解决方案：**

```html
<!-- 内联函数也会被缓存 -->
<button @click="count++">+1</button>
<!-- 编译为：
  onClick: _cache[0] || (_cache[0] = $event => (_ctx.count++))
-->

<!-- 带参数的内联函数 -->
<button @click="handleClick(item.id)">操作</button>
<!-- 注意：如果 item.id 是动态的，缓存可能不适用 -->
<!-- 编译器会根据具体情况决定是否缓存 -->

<!-- 简单的方法引用：一定会被缓存 -->
<button @click="handleClick">操作</button>
<!-- 编译为：
  onClick: _cache[0] || (_cache[0] = (...args) => (
      _ctx.handleClick && _ctx.handleClick(...args)
  ))
-->
```

### 注意事项

- 事件缓存在 SFC 编译时默认开启
- 缓存使用组件实例的 _cache 数组
- 缓存的是包装函数，内部通过 _ctx 动态查找实际 handler
- 缓存后节点的 PatchFlag 会减少或消失
- 对子组件来说，缓存避免了因函数引用变化导致的不必要更新
- 运行时编译（非 SFC）可能不开启此优化

### 总结

事件监听器缓存将事件处理函数存储在组件的 _cache 数组中，后续渲染复用同一引用。缓存后节点不需要 PROPS PatchFlag，Patch 可以跳过事件属性对比。同时避免了因函数引用变化导致的子组件不必要更新。这是 Vue 3 SFC 编译器默认开启的优化。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### v-once的一次性渲染

### 概念说明

`v-once` 是 Vue 提供的内置指令，用于将元素或组件标记为"只渲染一次"。首次渲染后，该节点及其所有子节点的 VNode 会被缓存，后续组件更新时直接复用缓存的 VNode，跳过渲染函数的重新执行和 Diff 对比。

v-once 适合那些在首次渲染后永远不会变化的内容。即使内部引用了响应式数据，v-once 标记的节点也不会因为数据变化而更新。这既是优化手段，也是一种需要谨慎使用的特性——如果错误地对需要更新的内容使用 v-once，会导致界面无法响应数据变化。

与静态提升不同的是，v-once 可以用于包含动态表达式的节点。静态提升只能处理完全没有动态绑定的节点，而 v-once 可以让包含插值的节点也只渲染一次。

### 基本示例

```vue
<script setup>
import { ref } from "vue";

const title = ref("初始标题");
const count = ref(0);
const items = ref(["A", "B", "C"]);

function changeTitle() {
    title.value = "修改后的标题"; // 不会反映到 v-once 的元素上
}
</script>

<template>
    <!-- v-once：只渲染一次，后续更新跳过 -->
    <h1 v-once>{{ title }}</h1>
    <!-- 首次渲染显示 "初始标题" -->
    <!-- changeTitle() 后仍然显示 "初始标题" -->

    <!-- 没有 v-once：正常响应更新 -->
    <h2>{{ title }}</h2>
    <!-- changeTitle() 后显示 "修改后的标题" -->

    <!-- v-once 用于大型静态内容 -->
    <div v-once>
        <p>用户协议内容...</p>
        <p>这里有很多不需要更新的文字...</p>
        <p>创建时间: {{ new Date().toLocaleDateString() }}</p>
        <!-- 时间也只在首次渲染时计算，后续不更新 -->
    </div>

    <!-- v-once 用于列表 -->
    <ul v-once>
        <li v-for="item in items" :key="item">{{ item }}</li>
    </ul>
    <!-- items 变化后列表不会更新 -->

    <!-- v-once 用于组件 -->
    <MyComponent v-once :data="count" />
    <!-- 组件只挂载一次，count 变化后不会触发更新 -->
</template>
```

### 内部原理

#### v-once 的编译和运行时处理

```
v-once 的工作机制：

编译时：
  <h1 v-once>{{ title }}</h1>
  编译为：
  _cache[0] || (
      setBlockTracking(-1),  // 暂停 Block 追踪
      _cache[0] = createElementVNode("h1", null,
          toDisplayString(_ctx.title), 1 /* TEXT */),
      setBlockTracking(1),   // 恢复 Block 追踪
      _cache[0]
  )

运行时：
  首次渲染：
    → _cache[0] 不存在
    → 执行 createElementVNode 创建 VNode
    → 存入 _cache[0]
    → setBlockTracking(-1) 阻止该 VNode 加入 dynamicChildren
    → 返回 VNode 用于挂载

  后续渲染：
    → _cache[0] 已存在
    → 直接返回缓存的 VNode（不重新创建）
    → Patch 时 n1 === n2（同一引用）→ 跳过

关键点：
  → setBlockTracking(-1) 的作用是不让这个节点加入 dynamicChildren
  → 这样 Block 的 patchBlockChildren 也不会访问到它
  → 首次渲染后完全从更新流程中消失
```

### 与相关API的对比

| 优化方式 | 适用对象 | 首次渲染后 | 手动/自动 |
|---------|---------|-----------|---------|
| 静态提升 | 完全静态节点 | 跳过 Diff | 自动（编译器） |
| v-once | 任何节点（含动态） | 跳过 Diff | 手动（开发者） |
| v-memo | 任何节点 | 条件跳过 | 手动（开发者） |

### 适用场景

- **条款/协议：** 用户协议、隐私政策等大段文字
- **初始化数据展示：** 只需要显示一次的数据
- **大型静态列表：** 永远不会变化的列表
- **性能敏感区域：** 减少不必要的渲染开销

### 常见问题

#### v-once 导致数据更新不生效

**解决方案：**

```vue
<template>
    <!-- 错误用法：对需要更新的内容使用 v-once -->
    <!-- <p v-once>计数: {{ count }}</p> -->
    <!-- count 变化后显示不会更新 -->

    <!-- 正确：只对确定不需要更新的内容使用 -->
    <p v-once>创建时间: {{ createdAt }}</p>
    <!-- createdAt 是不变的，适合 v-once -->

    <!-- 需要更新的内容不要用 v-once -->
    <p>计数: {{ count }}</p>
</template>
```

### 注意事项

- v-once 标记的节点及其所有子节点都只渲染一次
- 内部的响应式数据变化不会触发更新
- VNode 缓存在组件的 _cache 中
- 不要对需要动态更新的内容使用 v-once
- v-once 可以用于元素、组件和 v-for 列表
- 过度使用 v-once 会增加内存占用（缓存 VNode）

### 总结

v-once 将节点标记为一次性渲染，首次渲染后缓存 VNode，后续更新完全跳过。适合永远不需要更新的内容。与静态提升不同，v-once 可以用于包含动态表达式的节点。使用时需要确认内容确实不需要更新，否则会导致界面无法响应数据变化。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### v-memo的自定义缓存条件

### 概念说明

`v-memo` 是 Vue 3.2 引入的内置指令，允许开发者为节点或子树指定自定义的缓存条件。它接受一个依赖数组，只有当数组中的值发生变化时才重新渲染该节点，否则跳过渲染并复用缓存的 VNode。

v-memo 是 v-once 的增强版。v-once 是永远不更新，v-memo 是条件性不更新。v-memo 的依赖数组类似于 React 的 useMemo/useCallback 的依赖数组——Vue 会浅比较依赖数组中的每个值，全部相同则跳过更新。

v-memo 最典型的应用场景是大型 v-for 列表的性能优化。在包含大量列表项的场景中，即使只有少数项需要更新，Vue 默认也会对所有项执行渲染和 Diff。使用 v-memo 可以让未变化的列表项直接跳过，大幅提升列表更新性能。

### 基本示例

```vue
<script setup>
import { ref } from "vue";

const items = ref([
    { id: 1, name: "苹果", selected: false },
    { id: 2, name: "香蕉", selected: false },
    { id: 3, name: "橙子", selected: true },
    // ... 1000 个项目
]);

const selectedId = ref(3);

function select(id) {
    // 取消之前的选中
    const prev = items.value.find((i) => i.id === selectedId.value);
    if (prev) prev.selected = false;
    // 选中新的
    const next = items.value.find((i) => i.id === id);
    if (next) next.selected = true;
    selectedId.value = id;
}
</script>

<template>
    <!-- 大型列表优化：v-memo 配合 v-for -->
    <div
        v-for="item in items"
        :key="item.id"
        v-memo="[item.selected]"
    >
        <!--
            v-memo="[item.selected]" 的含义：
            → 只有 item.selected 变化时才重新渲染这个 div
            → item.name 等其他属性变化不会触发更新
            → 每次点击选择，只有2个项需要更新（旧选中 + 新选中）
            → 其他 998 个项直接跳过
        -->
        <span :class="{ active: item.selected }">
            {{ item.name }}
        </span>
        <button @click="select(item.id)">选择</button>
    </div>

    <!-- 普通元素上使用 v-memo -->
    <div v-memo="[valueA, valueB]">
        <!-- 只有 valueA 或 valueB 变化时才更新 -->
        <p>{{ valueA }}</p>
        <p>{{ valueB }}</p>
        <p>{{ valueC }}</p>
        <!-- valueC 变化不会触发此区域更新 -->
    </div>

    <!-- v-memo="[]"：等价于 v-once -->
    <div v-memo="[]">
        <!-- 空数组永远不变 → 永远不更新 -->
        <p>{{ msg }}</p>
    </div>
</template>
```

### 内部原理

#### v-memo 的编译和运行时处理

```
v-memo 的工作机制：

编译时：
  <div v-memo="[item.selected]">...</div>
  编译为：
  withMemo(
      [item.selected],    // 依赖数组
      () => createElementVNode("div", ...),  // 渲染函数
      _cache,             // 缓存数组
      index               // 缓存位置
  )

运行时 withMemo 函数：
  function withMemo(memo, render, cache, index) {
      const cached = cache[index];
      // 如果有缓存，且依赖数组没变化
      if (cached && isMemoSame(cached.memo, memo)) {
          return cached;  // 返回缓存的 VNode
      }
      // 依赖变化 → 重新渲染
      const ret = render();
      ret.memo = memo.slice();  // 保存当前依赖值
      cache[index] = ret;       // 更新缓存
      return ret;
  }

  function isMemoSame(prev, next) {
      // 浅比较每个依赖值
      for (let i = 0; i < prev.length; i++) {
          if (prev[i] !== next[i]) return false;
      }
      return true;
  }

v-for + v-memo 的特殊优化：
  → 编译器识别 v-memo 在 v-for 内部
  → 每个列表项有独立的缓存位置
  → 项的依赖不变 → 跳过该项的渲染和 Diff
```

### 与相关API的对比

| 指令 | 更新条件 | 适用场景 |
|------|---------|---------|
| v-once | 永远不更新 | 完全静态内容 |
| v-memo="[]" | 永远不更新（等价 v-once） | 同 v-once |
| v-memo="[a, b]" | a 或 b 变化时更新 | 条件性静态内容 |
| 无指令 | 任何依赖变化都更新 | 默认行为 |

### 适用场景

- **大型列表：** 1000+ 项的列表中只有少数项需要更新
- **选中状态切换：** 列表项的选中/取消选中
- **条件性更新：** 只需要响应特定数据变化的区域
- **性能瓶颈：** 通过 v-memo 减少不必要的渲染和 Diff

### 常见问题

#### v-memo 的依赖数组遗漏导致不更新

**解决方案：**

```vue
<template>
    <div v-for="item in items" :key="item.id"
        v-memo="[item.selected, item.name]">
        <!--
            如果只写 v-memo="[item.selected]"
            → item.name 变化时不会更新（被 memo 跳过了）

            需要更新的数据都要加入依赖数组
            → v-memo="[item.selected, item.name]"
        -->
        <span :class="{ active: item.selected }">
            {{ item.name }}
        </span>
    </div>
</template>
```

### 注意事项

- v-memo 使用浅比较（===）检查依赖变化
- 依赖数组中遗漏的值变化不会触发更新
- v-memo="[]" 等价于 v-once
- 主要用于大型列表的性能优化
- 不要过度使用，简单场景下 Vue 默认优化已经足够
- v-memo 在 v-for 内部有特殊的编译优化

### 总结

v-memo 通过自定义依赖数组实现条件性缓存，只有依赖值变化时才重新渲染。最典型的场景是大型 v-for 列表优化——配合 v-memo 让未变化的列表项直接跳过渲染和 Diff。依赖数组使用浅比较，需要确保所有需要响应的数据都包含在内。v-memo="[]" 等价于 v-once。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### 块(Block)与动态子节点追踪

### 概念说明

Block（块）是 Vue 3 编译优化中的核心概念。一个 Block 是一个特殊的 VNode，它除了普通的 `children` 数组外，还额外维护了一个 `dynamicChildren` 数组，用于存储该 Block 范围内所有动态子节点（无论嵌套多深）。

传统的 Diff 算法需要递归遍历整棵 VNode 树来查找变化。Block 机制改变了这一点：更新时，Patch 算法只需要遍历 Block 的 `dynamicChildren` 数组，直接定位到所有动态节点并进行精确更新，完全跳过静态节点。这让 Diff 的复杂度从与模板大小成正比，变为只与动态内容数量成正比。

模板的根节点、v-if 的每个分支、v-for 的每个项都会创建一个 Block。Block 之间形成 Block 树，每个 Block 负责追踪自己范围内的动态子节点。

### 基本示例

```html
<!-- 模板 -->
<div>                           <!-- Block（根节点） -->
    <h1>静态标题</h1>            <!-- 静态，不在 dynamicChildren 中 -->
    <p>{{ msg }}</p>             <!-- 动态，加入 dynamicChildren -->
    <div>
        <span>静态内容</span>    <!-- 静态，跳过 -->
        <span :class="cls">     <!-- 动态，加入 dynamicChildren -->
            {{ text }}
        </span>
    </div>
</div>
```

```javascript
// 编译后的渲染函数
function render(_ctx) {
    return (
        // openBlock() 开始收集动态子节点
        openBlock(),
        // createElementBlock 创建 Block VNode
        createElementBlock("div", null, [
            // 静态节点（被提升）
            _hoisted_1, // <h1>静态标题</h1>

            // 动态节点：PatchFlag = 1 → 加入 dynamicChildren
            createElementVNode("p", null,
                toDisplayString(_ctx.msg), 1 /* TEXT */),

            createElementVNode("div", null, [
                _hoisted_2, // <span>静态内容</span>（静态提升）

                // 动态节点：PatchFlag = 3 → 加入 dynamicChildren
                createElementVNode("span",
                    { class: normalizeClass(_ctx.cls) },
                    toDisplayString(_ctx.text), 3 /* TEXT, CLASS */),
            ]),
        ])
    );
}

// 生成的 Block VNode 结构：
// {
//     type: 'div',
//     children: [h1, p, div(span, span)],  // 所有子节点
//     dynamicChildren: [p, span],           // 只有动态子节点（扁平化）
// }
```

### 内部原理

#### Block 的收集机制

```
Block 和 dynamicChildren 的工作原理：

1. openBlock()
   → 创建一个新的动态子节点收集数组
   → 压入全局的 blockStack 栈

2. createElementVNode(..., patchFlag)
   → 如果 patchFlag > 0（动态节点）
   → 将该 VNode 加入当前 blockStack 栈顶的数组
   → 注意：是扁平化收集，不管嵌套多深

3. createElementBlock(...)
   → 创建 Block VNode
   → 将收集到的动态子节点赋值给 vnode.dynamicChildren
   → 从 blockStack 弹出

收集过程示意：
  openBlock() → currentBlock = []
  createVNode("p", ..., 1)     → currentBlock.push(p)
  createVNode("span", ..., 3)  → currentBlock.push(span)
  createElementBlock("div")    → div.dynamicChildren = [p, span]

更新时 patchBlockChildren：
  function patchBlockChildren(oldBlock, newBlock) {
      const oldDynamic = oldBlock.dynamicChildren;
      const newDynamic = newBlock.dynamicChildren;
      // 直接按位置一一对比动态子节点
      for (let i = 0; i < newDynamic.length; i++) {
          patch(oldDynamic[i], newDynamic[i]);
      }
      // 完全不遍历 children（包含静态节点）
  }

结构性指令会创建新的 Block：
  v-if 的每个分支 → 独立的 Block
  v-for 的每个项 → 独立的 Block
  → 因为这些指令会改变子节点的数量和结构
  → 不能简单地按位置对比 dynamicChildren
```

### 与相关API的对比

| 概念 | 作用 | 粒度 |
|------|------|------|
| Block | 收集范围内的动态子节点 | 模板根/v-if/v-for |
| dynamicChildren | 扁平化的动态子节点数组 | Block 内所有动态节点 |
| PatchFlag | 标记节点的动态内容类型 | 单个节点 |
| 静态提升 | 静态节点提升为常量 | 单个静态节点 |

### 适用场景

- **理解 Vue 3 更新机制：** Block 是性能优化的基础
- **理解结构性指令：** v-if/v-for 为什么创建新 Block
- **性能分析：** dynamicChildren 的数量决定更新开销

### 常见问题

#### v-if/v-for 为什么需要独立的 Block

**解决方案：**

```
问题：如果 v-if/v-for 不创建 Block 会怎样？

<div>            ← Block
    <p>{{ a }}</p>
    <div v-if="show">
        <span>{{ b }}</span>
    </div>
    <p>{{ c }}</p>
</div>

如果不为 v-if 创建 Block：
  show=true 时: dynamicChildren = [p(a), span(b), p(c)]
  show=false时: dynamicChildren = [p(a), p(c)]
  → 数量不同！无法按位置一一对比

为 v-if 创建 Block 后：
  外层 Block: dynamicChildren = [p(a), v-if-Block, p(c)]
  → 数量始终固定为 3
  → v-if-Block 内部自己处理分支切换
```

### 注意事项

- Block 是 Vue 3 编译优化的核心机制
- dynamicChildren 是扁平化的，不管动态节点嵌套多深
- 更新时只遍历 dynamicChildren，跳过所有静态节点
- v-if、v-for 会创建独立的 Block（结构性指令）
- Block 树让更新性能与动态节点数量成正比
- 手写渲染函数中无法使用 Block 优化（编译器专属）

### 总结

Block 是 Vue 3 的核心编译优化机制，通过 dynamicChildren 数组扁平化追踪所有动态子节点。更新时只遍历 dynamicChildren，完全跳过静态节点，让 Diff 性能只与动态内容数量相关。v-if 和 v-for 会创建独立的 Block 来处理结构变化。这是 Vue 3 相比 Vue 2 在更新性能上的根本性提升。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### 编译时优化与运行时性能平衡

### 概念说明

Vue 3 的性能优势来源于编译时（Compile Time）和运行时（Runtime）的深度协作。编译器在构建阶段分析模板，生成带有优化元数据的渲染函数代码；运行时渲染器利用这些元数据来跳过不必要的工作。这种分工让 Vue 3 既保持了模板的声明式开发体验，又获得了接近手写优化代码的运行性能。

编译时优化包括：PatchFlag 标记动态内容类型、Block 树追踪动态子节点、静态提升避免重复创建 VNode、事件监听器缓存避免函数引用变化、静态字符串化将连续静态节点序列化为 HTML 字符串。这些优化将运行时 Diff 的复杂度从 O(模板总节点数) 降低到 O(动态节点数)。

运行时优化包括：基于 PatchFlag 的精确属性对比、Block 的 dynamicChildren 扁平化遍历、相同引用快速路径跳过、最长递增子序列最小化 DOM 移动等。编译时生成的元数据是运行时优化的前提，两者缺一不可。

这种"编译时信息 + 运行时利用"的模式，是 Vue 3 区别于 React（纯运行时 Diff）和 Svelte（纯编译时生成命令式代码）的核心设计哲学。Vue 3 在两者之间取得了平衡：保留虚拟 DOM 的灵活性，同时通过编译优化消除虚拟 DOM 的性能劣势。

### 基本示例

```html
<!-- 一个典型的模板，展示各种优化如何协作 -->
<template>
    <div class="page">
        <!-- 静态提升：提升到渲染函数外部，只创建一次 -->
        <header>
            <h1>网站标题</h1>
            <nav>
                <a href="/">首页</a>
                <a href="/about">关于</a>
            </nav>
        </header>

        <!-- Block 追踪：只有动态节点进入 dynamicChildren -->
        <main>
            <!-- PatchFlag = TEXT：只对比文本内容 -->
            <p>{{ description }}</p>

            <!-- PatchFlag = CLASS：只对比 class -->
            <div :class="activeClass">内容区域</div>

            <!-- 事件缓存：onClick 引用不变 -->
            <button @click="handleSubmit">提交</button>

            <!-- v-for 创建独立 Block -->
            <ul>
                <li v-for="item in list" :key="item.id">
                    {{ item.name }}
                </li>
            </ul>
        </main>

        <!-- 静态字符串化：连续静态节点用 innerHTML 插入 -->
        <footer>
            <p>版权所有 2026</p>
            <p>备案号: xxxxx</p>
            <p>联系方式: xxx@xxx.com</p>
        </footer>
    </div>
</template>
```

```
编译优化的协作流程：

1. 编译阶段（构建时）
   Parse → Transform → Codegen
   ↓
   Transform 阶段产出的优化信息：
   → header/footer 标记为静态 → 静态提升
   → footer 的 3 个连续静态 p → 静态字符串化
   → <p>{{ description }}</p> → PatchFlag = 1 (TEXT)
   → <div :class> → PatchFlag = 2 (CLASS)
   → @click → 事件缓存到 _cache
   → v-for → 创建独立 Block
   → 根 div → Block，收集 dynamicChildren

2. 首次渲染（运行时）
   → 静态提升的 VNode 只创建一次
   → 静态字符串化的 footer 通过 innerHTML 插入
   → Block 收集 dynamicChildren: [p, div, button, v-for-Block]

3. 更新渲染（运行时）
   → 只遍历 dynamicChildren（4个节点）
   → p 节点：PatchFlag=TEXT → 只对比文本
   → div 节点：PatchFlag=CLASS → 只对比 class
   → button：事件已缓存 → 无 PatchFlag → 跳过
   → v-for Block：进入列表 Diff
   → header/footer：完全跳过（静态提升）

   最终：O(动态节点数) 而非 O(总节点数)
```

### 内部原理

#### 编译时与运行时的分工

```
编译时的职责（构建阶段完成，零运行时开销）：
  → 分析模板结构，区分静态和动态内容
  → 生成 PatchFlag 标记
  → 标记 Block 边界（openBlock/createBlock）
  → 执行静态提升（hoistStatic）
  → 缓存事件处理函数
  → 序列化连续静态节点（createStaticVNode）

运行时的职责（每次更新时执行）：
  → 检查 n1 === n2 快速路径
  → 根据 PatchFlag 精确更新属性
  → 通过 dynamicChildren 跳过静态节点
  → 列表 Diff 使用 LIS 最小化移动

Vue 3 vs React vs Svelte 的哲学对比：

React（纯运行时）：
  → 没有编译优化（JSX 只是语法转换）
  → 每次更新全量 Diff 虚拟 DOM 树
  → 依赖 React.memo/useMemo 手动优化
  → 灵活性最高，但默认性能不如 Vue 3

Svelte（纯编译时）：
  → 编译为命令式 DOM 操作代码
  → 没有虚拟 DOM，没有运行时 Diff
  → 性能极好，但灵活性受限
  → 不支持手写渲染函数

Vue 3（编译时 + 运行时平衡）：
  → 编译器生成优化元数据
  → 运行时利用元数据精确更新
  → 保留虚拟 DOM 的灵活性（可手写 h 函数）
  → 模板用户享受编译优化，渲染函数用户保持灵活
```

### 与相关API的对比

| 优化技术 | 阶段 | 作用 | 性能收益 |
|---------|------|------|---------|
| PatchFlag | 编译时生成，运行时消费 | 精确标记动态内容 | 跳过静态属性对比 |
| Block Tree | 编译时标记，运行时收集 | 扁平化动态子节点 | 跳过静态子节点遍历 |
| 静态提升 | 编译时执行 | 静态 VNode 只创建一次 | 减少内存分配和 GC |
| 事件缓存 | 编译时生成 | 函数引用不变 | 减少 PatchFlag 标记 |
| 静态字符串化 | 编译时执行 | 连续静态节点序列化 | innerHTML 批量插入 |
| LIS | 运行时执行 | 最小化 DOM 移动 | 减少列表更新的 DOM 操作 |

### 适用场景

- **模板开发：** 自动获得全部编译优化（推荐）
- **渲染函数开发：** 不享受编译优化，但保持灵活性
- **性能敏感页面：** 利用 v-once/v-memo 手动增强优化
- **大型应用：** 编译优化让更新性能与模板大小无关

### 常见问题

#### 手写渲染函数能享受编译优化吗

**解决方案：**

```javascript
import { h } from "vue";

// 手写渲染函数：不享受编译优化
// → 没有 PatchFlag
// → 没有静态提升
// → 没有 Block 树
// → 每次更新全量 Diff
export default {
    setup() {
        return () => h("div", null, [
            h("h1", null, "标题"),  // 每次都重新创建
            h("p", null, msg.value), // 全量属性对比
        ]);
    },
};

// 建议：优先使用模板语法
// 只在需要高度动态逻辑时才使用渲染函数
// 或者混合使用：组件用模板，局部用渲染函数
```

### 注意事项

- 模板语法自动享受全部编译优化
- 手写渲染函数（h 函数/JSX）不享受编译优化
- 编译优化让更新性能与动态节点数成正比，与模板大小无关
- 生产构建时编译在构建阶段完成，不打包编译器
- Vue 3.6+ 的 Vapor Mode 进一步将编译优化推向极致
- 优先使用模板语法，只在必要时使用渲染函数

### 总结

Vue 3 通过编译时和运行时的深度协作实现高性能更新。编译器生成 PatchFlag、Block 树、静态提升、事件缓存等优化元数据，运行时渲染器利用这些元数据精确定位变化并最小化 DOM 操作。更新复杂度从 O(模板总节点) 降到 O(动态节点数)。这种平衡既保留了虚拟 DOM 的灵活性，又获得了接近编译时框架的性能。模板语法自动享受全部优化，是推荐的开发方式。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。



## 7.6 内置组件

### keep-alive的组件缓存机制

### 概念说明

`<KeepAlive>` 是 Vue 内置的抽象组件，用于缓存动态切换的组件实例。正常情况下，组件被切换掉时会被销毁（执行 unmounted），再次显示时会重新创建（执行 mounted）。而被 `<KeepAlive>` 包裹的组件在切换时不会被销毁，而是被"停用"并缓存在内存中，再次激活时恢复之前的状态，不需要重新创建和挂载。

KeepAlive 的典型应用场景是 Tab 切换页面——用户在 Tab A 填写了表单内容，切换到 Tab B 后再切回 Tab A，期望之前填写的内容还在。没有 KeepAlive，Tab A 的组件会被销毁重建，表单数据丢失；有了 KeepAlive，Tab A 的组件被缓存，切回时状态完整保留。

被缓存的组件不再触发 mounted/unmounted，而是触发 activated/deactivated 生命周期钩子。

### 基本示例

```vue
<script setup>
import { ref, shallowRef } from "vue";
import TabA from "./TabA.vue";
import TabB from "./TabB.vue";
import TabC from "./TabC.vue";

// 当前激活的组件
const currentTab = shallowRef(TabA);

const tabs = [
    { label: "Tab A", comp: TabA },
    { label: "Tab B", comp: TabB },
    { label: "Tab C", comp: TabC },
];
</script>

<template>
    <div class="tabs">
        <button
            v-for="tab in tabs"
            :key="tab.label"
            :class="{ active: currentTab === tab.comp }"
            @click="currentTab = tab.comp"
        >
            {{ tab.label }}
        </button>
    </div>

    <!-- KeepAlive 缓存组件实例 -->
    <KeepAlive>
        <component :is="currentTab" />
    </KeepAlive>
    <!--
        切换 Tab 时：
        → 旧组件不销毁，触发 deactivated
        → 新组件如已缓存则恢复，触发 activated
        → 新组件如未缓存则首次挂载，触发 mounted + activated
    -->
</template>
```

```vue
<!-- TabA.vue -->
<script setup>
import { ref, onMounted, onUnmounted, onActivated, onDeactivated } from "vue";

const formData = ref("");

onMounted(() => {
    console.log("TabA mounted - 只在首次挂载时触发");
});

onUnmounted(() => {
    // 被 KeepAlive 包裹时，这个钩子不会触发
    console.log("TabA unmounted - 不会执行");
});

onActivated(() => {
    // 组件被激活时触发（包括首次挂载）
    console.log("TabA activated - 每次切入时触发");
});

onDeactivated(() => {
    // 组件被停用时触发
    console.log("TabA deactivated - 每次切出时触发");
});
</script>

<template>
    <div>
        <h2>Tab A</h2>
        <!-- 切换回来后 input 的值仍然保留 -->
        <input v-model="formData" placeholder="输入内容不会丢失" />
        <p>已输入: {{ formData }}</p>
    </div>
</template>
```

### 内部原理

#### KeepAlive 的缓存机制

```
KeepAlive 的内部工作流程：

1. 数据结构
   → 维护一个 Map<VNodeType, VNode> 缓存组件 VNode
   → 维护一个 Set<VNodeType> 记录缓存的 key
   → 当缓存数量超过 max 时，使用 LRU 策略淘汰

2. 子组件切换时的处理
   → 获取新的子组件 VNode
   → 检查缓存中是否存在
     → 存在：从缓存中恢复，标记为 COMPONENT_KEPT_ALIVE
     → 不存在：正常创建，标记为 COMPONENT_SHOULD_KEEP_ALIVE

3. 渲染器对标记的处理
   → COMPONENT_SHOULD_KEEP_ALIVE：
     卸载时不销毁，而是调用 deactivate
     → 将 DOM 移动到一个隐藏容器中
     → 触发 deactivated 钩子

   → COMPONENT_KEPT_ALIVE：
     挂载时不重新创建，而是调用 activate
     → 将 DOM 从隐藏容器移回页面
     → 触发 activated 钩子

4. 关键点
   → 组件实例始终存在于内存中
   → DOM 节点被移动到隐藏容器而非销毁
   → 响应式状态、DOM 状态（如滚动位置、输入值）都保留
```

### 与相关API的对比

| 特性 | 有 KeepAlive | 无 KeepAlive |
|------|------------|-------------|
| 切出时 | deactivated（停用） | unmounted（销毁） |
| 切入时 | activated（激活） | mounted（重建） |
| 组件状态 | 保留 | 丢失 |
| DOM 状态 | 保留 | 丢失 |
| 内存占用 | 较高（缓存实例） | 较低 |
| 首次加载 | 正常 | 正常 |

### 适用场景

- **Tab 切换：** 多标签页面保持各页签状态
- **路由缓存：** 列表页→详情页→返回列表页保持滚动位置
- **表单暂存：** 多步骤表单切换时保持已填内容
- **仪表盘：** 多面板切换时保持图表状态

### 常见问题

#### KeepAlive 只能有一个直接子组件

**解决方案：**

```vue
<template>
    <!-- 正确：只有一个直接子组件 -->
    <KeepAlive>
        <component :is="currentView" />
    </KeepAlive>

    <!-- 正确：条件渲染也可以 -->
    <KeepAlive>
        <CompA v-if="active === 'a'" />
        <CompB v-else />
    </KeepAlive>

    <!-- 错误：多个直接子组件 -->
    <!-- <KeepAlive>
        <CompA />
        <CompB />
    </KeepAlive> -->
</template>
```

### 注意事项

- KeepAlive 只能包裹一个直接子组件
- 缓存的组件会占用内存，注意控制缓存数量
- 缓存组件不触发 mounted/unmounted，改为 activated/deactivated
- 适合需要保持状态的场景，不适合每次都需要刷新数据的场景
- 配合 include/exclude 可以控制哪些组件被缓存
- 配合 max 可以限制缓存数量，超出时使用 LRU 淘汰

### 总结

KeepAlive 通过缓存组件实例和 DOM 节点来避免重复销毁和创建，保留组件的响应式状态和 DOM 状态。切换时触发 activated/deactivated 替代 mounted/unmounted。内部使用 Map 存储缓存，通过将 DOM 移动到隐藏容器实现"停用"。适合 Tab 切换、路由缓存等需要保持状态的场景，配合 include/exclude/max 控制缓存范围。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### keep-alive的include白名单

### 概念说明

`<KeepAlive>` 的 `include` 属性用于指定哪些组件应该被缓存。只有名称匹配 include 的组件才会被缓存，不匹配的组件在切换时正常销毁。include 支持三种格式：逗号分隔的字符串、正则表达式、数组。

匹配的依据是组件的 `name` 选项。在 `<script setup>` 中，组件名默认从文件名推导；也可以通过 `defineOptions({ name: 'xxx' })` 显式设置。如果组件没有 name，则无法被 include 匹配。

include 和 exclude 可以同时使用，exclude 的优先级高于 include。

### 基本示例

```vue
<script setup>
import { ref, shallowRef } from "vue";
import UserList from "./UserList.vue";    // 组件名: UserList
import UserDetail from "./UserDetail.vue"; // 组件名: UserDetail
import Settings from "./Settings.vue";     // 组件名: Settings

const currentView = shallowRef(UserList);
</script>

<template>
    <!-- 字符串格式：逗号分隔，不要有空格 -->
    <KeepAlive include="UserList,UserDetail">
        <component :is="currentView" />
    </KeepAlive>
    <!-- UserList 和 UserDetail 会被缓存 -->
    <!-- Settings 不会被缓存，切换时正常销毁 -->

    <!-- 正则表达式格式：需要 v-bind -->
    <KeepAlive :include="/^User/">
        <component :is="currentView" />
    </KeepAlive>
    <!-- 匹配所有以 User 开头的组件名 -->

    <!-- 数组格式：需要 v-bind -->
    <KeepAlive :include="['UserList', 'UserDetail']">
        <component :is="currentView" />
    </KeepAlive>

    <!-- 动态控制缓存列表 -->
    <KeepAlive :include="cachedViews">
        <component :is="currentView" />
    </KeepAlive>
</template>
```

```vue
<!-- UserList.vue：确保组件有 name -->
<script setup>
// 方式1：defineOptions 显式设置 name
defineOptions({
    name: "UserList",
});

// 方式2：如果不写 defineOptions，SFC 编译器会从文件名推导
// UserList.vue → name: "UserList"
</script>

<template>
    <div>用户列表</div>
</template>
```

### 内部原理

#### include 的匹配逻辑

```
KeepAlive 处理 include 的流程：

1. 获取子组件的 name
   → 优先使用组件选项中的 name
   → 没有 name 则尝试从 __name（SFC 编译生成）获取

2. 匹配 include
   function matches(pattern, name) {
       if (isArray(pattern)) {
           return pattern.includes(name);
       } else if (isString(pattern)) {
           return pattern.split(',').includes(name);
       } else if (isRegExp(pattern)) {
           return pattern.test(name);
       }
       return false;
   }

3. 判断是否缓存
   → name 匹配 include → 缓存
   → name 不匹配 include → 不缓存，正常渲染
   → 如果同时设置了 exclude 且匹配 → 不缓存（exclude 优先）

4. 动态更新
   → include 是响应式的
   → include 变化时，KeepAlive 会遍历缓存
   → 不再匹配的组件从缓存中移除并销毁
```

### 与相关API的对比

| include 格式 | 写法 | 示例 |
|-------------|------|------|
| 字符串 | `include="A,B"` | 逗号分隔，无空格 |
| 正则表达式 | `:include="/^User/"` | 需要 v-bind |
| 数组 | `:include="['A','B']"` | 需要 v-bind |

### 适用场景

- **选择性缓存：** 只缓存特定页面，如列表页
- **动态缓存：** 根据用户操作动态添加/移除缓存
- **路由缓存：** 配合路由 meta 控制哪些路由页面缓存

### 常见问题

#### 组件没有 name 导致 include 不生效

**解决方案：**

```vue
<!-- 确保组件有正确的 name -->
<script setup>
// 方式1：显式定义（推荐，最可靠）
defineOptions({ name: "MyComponent" });

// 方式2：依赖文件名推导（SFC 编译器自动处理）
// 文件名 MyComponent.vue → name: "MyComponent"
</script>
```

### 注意事项

- include 匹配的是组件的 name 选项
- 字符串格式中逗号后不要有空格
- 正则和数组格式需要使用 v-bind（冒号语法）
- include 动态变化时会自动清理不再匹配的缓存
- exclude 优先级高于 include
- 没有 name 的组件无法被 include 匹配

### 总结

KeepAlive 的 include 属性通过白名单机制控制哪些组件被缓存。支持字符串、正则、数组三种格式，匹配组件的 name 选项。include 是响应式的，变化时自动清理不匹配的缓存。组件必须有 name 才能被匹配，推荐使用 defineOptions 显式设置。exclude 优先级高于 include。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### keep-alive的exclude黑名单

### 概念说明

`<KeepAlive>` 的 `exclude` 属性用于指定哪些组件不应被缓存。名称匹配 exclude 的组件在切换时会被正常销毁，不匹配的组件则被缓存。exclude 和 include 一样支持三种格式：逗号分隔的字符串、正则表达式、数组。

exclude 的优先级高于 include。如果一个组件同时匹配了 include 和 exclude，最终不会被缓存。这在实际开发中很有用——可以用 include 设置一个大范围的缓存白名单，再用 exclude 排除其中个别组件。

exclude 同样是响应式的，值变化时 KeepAlive 会自动清理或恢复缓存。

### 基本示例

```vue
<script setup>
import { ref, shallowRef } from "vue";
import Dashboard from "./Dashboard.vue";
import Profile from "./Profile.vue";
import Settings from "./Settings.vue";

const currentView = shallowRef(Dashboard);
</script>

<template>
    <!-- 字符串格式：Settings 不缓存，其他都缓存 -->
    <KeepAlive exclude="Settings">
        <component :is="currentView" />
    </KeepAlive>

    <!-- 正则格式：排除所有以 Admin 开头的组件 -->
    <KeepAlive :exclude="/^Admin/">
        <component :is="currentView" />
    </KeepAlive>

    <!-- 数组格式 -->
    <KeepAlive :exclude="['Settings', 'LoginForm']">
        <component :is="currentView" />
    </KeepAlive>

    <!-- include + exclude 同时使用 -->
    <KeepAlive include="Dashboard,Profile,Settings" exclude="Settings">
        <component :is="currentView" />
    </KeepAlive>
    <!-- Dashboard 和 Profile 被缓存 -->
    <!-- Settings 匹配 exclude，不缓存（exclude 优先） -->
</template>
```

### 内部原理

#### exclude 的判断流程

```
KeepAlive 在渲染子组件时的判断逻辑：

function shouldCache(name) {
    // 1. 如果设置了 include 且不匹配 → 不缓存
    if (include && !matches(include, name)) {
        return false;
    }
    // 2. 如果设置了 exclude 且匹配 → 不缓存（优先级最高）
    if (exclude && matches(exclude, name)) {
        return false;
    }
    // 3. 通过所有检查 → 缓存
    return true;
}

动态 exclude 变化时的处理：
  → KeepAlive 内部 watch exclude 的值
  → exclude 新增一个组件名时：
    → 检查该组件是否在缓存中
    → 如果在 → 从缓存中移除并销毁
  → exclude 移除一个组件名时：
    → 下次切换到该组件时会被缓存
```

### 与相关API的对比

| 属性 | 作用 | 优先级 | 匹配结果 |
|------|------|--------|---------|
| include | 白名单 | 低 | 匹配 → 缓存 |
| exclude | 黑名单 | 高 | 匹配 → 不缓存 |
| 两者都匹配 | exclude 生效 | exclude 优先 | 不缓存 |
| 两者都不设 | 全部缓存 | - | 缓存 |

### 适用场景

- **排除频繁变化的组件：** 每次需要最新数据的组件不缓存
- **排除大内存组件：** 占用内存大的组件不缓存以节省资源
- **动态控制：** 根据条件动态排除某些组件的缓存

### 常见问题

#### 动态修改 exclude 清理已缓存的组件

**解决方案：**

```vue
<script setup>
import { ref } from "vue";

// 动态 exclude 列表
const excludeList = ref(["Settings"]);

// 需要清除某个组件的缓存时，加入 exclude
function clearCache(name) {
    if (!excludeList.value.includes(name)) {
        excludeList.value.push(name);
    }
    // 下一个 tick 后再移除，让 KeepAlive 有机会清理
    nextTick(() => {
        const index = excludeList.value.indexOf(name);
        if (index > -1) excludeList.value.splice(index, 1);
    });
}
</script>

<template>
    <KeepAlive :exclude="excludeList">
        <component :is="currentView" />
    </KeepAlive>
</template>
```

### 注意事项

- exclude 优先级高于 include
- exclude 是响应式的，变化时自动清理缓存
- 匹配依据是组件的 name 选项
- 支持字符串、正则、数组三种格式
- 没有 name 的组件无法被 exclude 匹配
- 被 exclude 的组件正常触发 mounted/unmounted

### 总结

KeepAlive 的 exclude 属性通过黑名单机制排除特定组件的缓存。优先级高于 include，同时匹配时以 exclude 为准。支持字符串、正则、数组三种格式，匹配组件的 name。exclude 是响应式的，可以通过动态修改 exclude 来清理已缓存的组件。适合排除需要实时刷新或占用大量内存的组件。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### keep-alive的max缓存数量与LRU

### 概念说明

`<KeepAlive>` 的 `max` 属性用于限制最多缓存的组件实例数量。当缓存的组件数超过 max 值时，KeepAlive 会使用 LRU（Least Recently Used，最近最少使用）策略，自动销毁最久未被访问的缓存组件，为新组件腾出空间。

LRU 算法的核心思想是：最近被访问过的组件更可能在未来被再次访问，而长时间未被访问的组件可以被淘汰。KeepAlive 内部维护一个有序的缓存列表，每次组件被激活时将其移到列表末尾（标记为最近使用），淘汰时从列表头部移除（最久未使用）。

设置 max 可以防止缓存无限增长导致内存泄漏，在路由缓存等场景中尤为重要。

### 基本示例

```vue
<script setup>
import { shallowRef } from "vue";
import PageA from "./PageA.vue";
import PageB from "./PageB.vue";
import PageC from "./PageC.vue";
import PageD from "./PageD.vue";

const currentPage = shallowRef(PageA);
</script>

<template>
    <!-- 最多缓存 3 个组件实例 -->
    <KeepAlive :max="3">
        <component :is="currentPage" />
    </KeepAlive>
    <!--
        访问顺序：A → B → C → D
        
        max = 3 时的缓存变化：
        访问 A：缓存 [A]
        访问 B：缓存 [A, B]
        访问 C：缓存 [A, B, C]（已满）
        访问 D：缓存已满，淘汰最久未用的 A
                缓存 [B, C, D]
        
        再次访问 B：B 移到末尾（标记为最近使用）
                    缓存 [C, D, B]
        
        访问新的 E：淘汰最久未用的 C
                    缓存 [D, B, E]
    -->

    <!-- 配合路由使用 -->
    <router-view v-slot="{ Component }">
        <KeepAlive :max="5">
            <component :is="Component" />
        </KeepAlive>
    </router-view>
</template>
```

### 内部原理

#### LRU 缓存淘汰机制

```
KeepAlive 的 LRU 实现：

数据结构：
  cache: Map<key, vnode>  // 存储缓存的 VNode
  keys: Set<key>          // 有序记录访问顺序（Set 保持插入顺序）

操作流程：

缓存命中（已缓存的组件被激活）：
  1. 从 keys 中删除该 key
  2. 重新添加到 keys 末尾（标记为最近使用）
  → 效果：该 key 移到 Set 的末尾

缓存新增（新组件加入缓存）：
  1. cache.set(key, vnode)
  2. keys.add(key)
  3. 检查 keys.size > max
     → 超出 → 获取 keys 的第一个元素（最久未使用）
     → 从 cache 和 keys 中移除
     → 销毁该组件实例

淘汰过程（pruneCacheEntry）：
  → 获取被淘汰的 VNode
  → 如果该组件当前不是激活状态
    → 调用 unmount 销毁组件
    → 释放 DOM 和组件实例
  → 从 cache 和 keys 中删除

示例：max = 3
  keys: [A, B, C]
  访问 D → keys.size(4) > 3
         → 淘汰 keys 第一个: A
         → keys: [B, C, D]
  访问 B → 删除 B，重新添加
         → keys: [C, D, B]
```

### 与相关API的对比

| max 设置 | 缓存行为 | 内存占用 | 适用场景 |
|---------|---------|---------|---------|
| 不设置 | 无限缓存 | 持续增长 | 少量固定组件 |
| max=5 | 最多5个，LRU淘汰 | 可控 | 路由页面缓存 |
| max=1 | 只缓存当前组件 | 最小 | 特殊场景 |

### 适用场景

- **路由缓存：** 限制缓存的页面数，防止内存溢出
- **Tab 页签：** 限制同时缓存的标签页数量
- **移动端：** 内存有限，需要严格控制缓存数

### 常见问题

#### max 值设置多少合适

**解决方案：**

```vue
<template>
    <!-- 根据应用场景选择 max 值 -->

    <!-- 后台管理系统：Tab 页签通常不超过 10 个 -->
    <KeepAlive :max="10">
        <router-view />
    </KeepAlive>

    <!-- 移动端 H5：内存有限，建议 3-5 -->
    <KeepAlive :max="3">
        <router-view />
    </KeepAlive>

    <!-- 建议：
        → 评估每个缓存组件的内存占用
        → 桌面端可以设置较大值（10-20）
        → 移动端建议较小值（3-5）
        → 包含大量数据的组件建议不缓存
    -->
</template>
```

### 注意事项

- max 接受 number 或 string 类型的数字
- 超出 max 时淘汰最久未使用的组件（LRU）
- 被淘汰的组件会触发 unmounted 生命周期
- 当前正在展示的组件不会被淘汰
- 不设置 max 时缓存会无限增长，注意内存
- max 变小时会立即淘汰多余的缓存

### 总结

KeepAlive 的 max 属性限制缓存的组件实例数量，超出时使用 LRU 策略淘汰最久未访问的组件。内部通过 Set 维护访问顺序，每次激活组件时将其移到末尾，淘汰时从头部移除。合理设置 max 值可以在状态保持和内存消耗之间取得平衡，桌面端建议 10-20，移动端建议 3-5。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### keep-alive的生命周期钩子(activated/deactivated)

### 概念说明

被 `<KeepAlive>` 缓存的组件拥有两个专属生命周期钩子：`onActivated`（激活时触发）和 `onDeactivated`（停用时触发）。这两个钩子替代了常规的 mounted/unmounted，因为缓存组件不会被真正销毁和重建。

`onActivated` 在以下时机触发：组件首次挂载时（在 onMounted 之后）；组件从缓存中恢复时（每次切入）。`onDeactivated` 在以下时机触发：组件被切换出去进入缓存时（每次切出）；组件所在的 KeepAlive 被卸载时。

这两个钩子不仅对直接子组件生效，对 KeepAlive 内部所有嵌套的后代组件也生效。常见用法是在 activated 中刷新数据或恢复定时器，在 deactivated 中暂停定时器或取消未完成的请求。

### 基本示例

```vue
<script setup>
import {
    ref,
    onMounted,
    onUnmounted,
    onActivated,
    onDeactivated,
} from "vue";

const data = ref([]);
const timer = ref(null);

// 首次挂载时触发（只触发一次）
onMounted(() => {
    console.log("mounted - 首次挂载");
    fetchData(); // 首次加载数据
});

// 不会触发（因为组件被缓存，不会卸载）
onUnmounted(() => {
    console.log("unmounted - 不会执行");
});

// 每次组件被激活时触发（包括首次挂载后）
onActivated(() => {
    console.log("activated - 组件激活");
    // 恢复定时器
    timer.value = setInterval(() => {
        refreshData();
    }, 30000);
    // 刷新数据（用户可能离开一段时间后回来）
    fetchData();
});

// 每次组件被停用时触发
onDeactivated(() => {
    console.log("deactivated - 组件停用");
    // 暂停定时器，节省资源
    if (timer.value) {
        clearInterval(timer.value);
        timer.value = null;
    }
});

async function fetchData() {
    const res = await fetch("/api/data");
    data.value = await res.json();
}

function refreshData() {
    console.log("定时刷新数据...");
}
</script>

<template>
    <ul>
        <li v-for="item in data" :key="item.id">{{ item.name }}</li>
    </ul>
</template>
```

```
生命周期执行顺序：

首次挂载（从未缓存过）：
  setup → onBeforeMount → onMounted → onActivated

切出（进入缓存）：
  onDeactivated

切入（从缓存恢复）：
  onActivated

KeepAlive 被卸载（整个组件树销毁）：
  onDeactivated → onUnmounted
```

### 内部原理

#### activated/deactivated 的触发机制

```
KeepAlive 的激活/停用流程：

停用（deactivate）：
  1. 渲染器检测到组件有 COMPONENT_SHOULD_KEEP_ALIVE 标记
  2. 不执行 unmount，而是调用 deactivate 方法
  3. 将组件的 DOM 从页面移动到隐藏容器
  4. 递归触发组件及所有后代的 deactivated 钩子
  5. 组件实例保留在内存中

激活（activate）：
  1. 渲染器检测到组件有 COMPONENT_KEPT_ALIVE 标记
  2. 不执行 mount，而是调用 activate 方法
  3. 将组件的 DOM 从隐藏容器移回页面
  4. 递归触发组件及所有后代的 activated 钩子
  5. 响应式系统恢复正常追踪
```

### 与相关API的对比

| 钩子 | 触发时机 | 触发次数 | 用途 |
|------|---------|---------|------|
| onMounted | 首次挂载完成 | 1次 | 初始化设置 |
| onActivated | 每次激活（含首次） | 多次 | 恢复状态、刷新数据 |
| onDeactivated | 每次停用 | 多次 | 暂停、保存状态 |
| onUnmounted | 真正销毁时 | 0或1次 | 最终清理 |

### 适用场景

- **定时任务管理：** activated 恢复定时器，deactivated 暂停
- **数据刷新：** activated 中重新拉取最新数据
- **视频/音频：** deactivated 暂停播放，activated 恢复
- **WebSocket：** deactivated 断开，activated 重连

### 常见问题

#### 区分首次挂载和后续激活

**解决方案：**

```vue
<script setup>
import { ref, onMounted, onActivated } from "vue";

const isFirstMount = ref(true);

onMounted(() => {
    // 首次挂载的逻辑
    initChart();
});

onActivated(() => {
    if (isFirstMount.value) {
        // 首次激活（紧跟 mounted 之后）
        isFirstMount.value = false;
        return; // 数据已在 mounted 中加载
    }
    // 后续激活（从缓存恢复）
    refreshData(); // 只刷新数据，不重新初始化
});
</script>
```

### 注意事项

- activated 在首次挂载时也会触发（在 mounted 之后）
- deactivated 对所有嵌套后代组件都生效
- 缓存组件不触发 unmounted（除非 KeepAlive 本身被卸载）
- 适合在 deactivated 中暂停耗资源的操作
- 不要在 deactivated 中做需要 DOM 的操作（DOM 即将被移走）
- Options API 中对应 activated 和 deactivated 选项

### 总结

onActivated 和 onDeactivated 是 KeepAlive 缓存组件的专属生命周期钩子。activated 在每次组件激活时触发（包括首次挂载后），适合恢复定时器和刷新数据；deactivated 在每次停用时触发，适合暂停定时器和取消请求。这两个钩子对所有嵌套后代组件都生效。通过 isFirstMount 标记可以区分首次挂载和后续激活。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### teleport的DOM移动挂载

### 概念说明

`<Teleport>` 是 Vue 3 内置组件，可以将组件的 DOM 内容"传送"到 DOM 树中的其他位置，而不改变组件的逻辑层级关系。也就是说，Teleport 内部的组件在逻辑上仍然是当前组件的子组件（可以访问父组件的 provide、接收 props 等），但渲染出来的 DOM 节点被移动到了指定的目标容器中。

Teleport 的典型应用场景是模态框（Modal）、通知提示（Toast）、下拉菜单（Dropdown）等需要脱离父元素 CSS 层叠上下文的 UI 元素。这些元素在逻辑上属于某个组件，但在 DOM 层面需要挂载到 body 或其他顶层容器下，以避免被父元素的 overflow:hidden、z-index 等 CSS 属性影响。

### 基本示例

```vue
<script setup>
import { ref } from "vue";

const showModal = ref(false);
</script>

<template>
    <div class="parent" style="overflow: hidden; position: relative;">
        <button @click="showModal = true">打开弹窗</button>

        <!-- Teleport 将内容传送到 body 下 -->
        <Teleport to="body">
            <div v-if="showModal" class="modal-overlay">
                <div class="modal-content">
                    <h2>弹窗标题</h2>
                    <p>这个弹窗的 DOM 在 body 下</p>
                    <p>但逻辑上仍属于当前组件</p>
                    <button @click="showModal = false">关闭</button>
                </div>
            </div>
        </Teleport>
        <!--
            没有 Teleport：
            → modal 的 DOM 在 .parent 内部
            → overflow:hidden 会裁剪弹窗
            → z-index 受父元素层叠上下文限制

            有 Teleport：
            → modal 的 DOM 被移到 body 下
            → 不受 .parent 的 CSS 影响
            → 但 showModal 等状态仍属于当前组件
        -->
    </div>
</template>

<style>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}
.modal-content {
    background: white;
    padding: 20px;
    border-radius: 8px;
    min-width: 300px;
}
</style>
```

### 内部原理

#### Teleport 的 DOM 移动机制

```
Teleport 的工作流程：

1. 编译阶段
   → <Teleport to="body"> 编译为 Teleport 组件 VNode
   → to 属性作为 props 传递

2. 挂载阶段（mount）
   → 渲染器识别 Teleport 类型的 VNode
   → 解析 to 属性，找到目标 DOM 容器
     → 字符串 → document.querySelector(to)
     → HTMLElement → 直接使用
   → 将子节点的 DOM 创建后插入到目标容器
   → 而非插入到父组件的 DOM 中

3. 更新阶段（patch）
   → 如果 to 属性变化 → 将 DOM 移动到新的目标容器
   → 如果子内容变化 → 正常 patch 子节点

4. 卸载阶段（unmount）
   → 从目标容器中移除 DOM 节点

逻辑层级不变：
  → Teleport 内的组件仍是当前组件的子组件
  → 可以使用 inject 接收祖先的 provide
  → 事件冒泡沿 Vue 组件树而非 DOM 树
```

### 与相关API的对比

| 特性 | Teleport | 直接在 body 挂载 |
|------|---------|----------------|
| 逻辑归属 | 属于父组件 | 独立 |
| provide/inject | 正常工作 | 不可用 |
| 状态管理 | 共享父组件状态 | 需要额外方案 |
| CSS 层叠上下文 | 脱离父元素 | 脱离父元素 |
| 组件卸载 | 随父组件一起卸载 | 需要手动清理 |

### 适用场景

- **模态框/对话框：** 脱离父元素的 CSS 限制
- **通知/Toast：** 固定在页面顶层
- **下拉菜单：** 避免被 overflow:hidden 裁剪
- **全屏覆盖层：** 需要覆盖整个页面

### 常见问题

#### 目标容器不存在导致报错

**解决方案：**

```vue
<template>
    <!-- 确保目标容器存在 -->
    <!-- 方式1：使用 body（始终存在） -->
    <Teleport to="body">
        <div>内容</div>
    </Teleport>

    <!-- 方式2：使用已存在的容器 -->
    <!-- 在 index.html 中添加: <div id="modal-root"></div> -->
    <Teleport to="#modal-root">
        <div>内容</div>
    </Teleport>

    <!-- 方式3：Vue 3.5+ defer 延迟解析 -->
    <Teleport to="#later-container" defer>
        <div>内容</div>
    </Teleport>
    <!-- defer 会延迟目标解析到同一渲染周期的其他部分挂载后 -->
</template>
```

### 注意事项

- to 属性接受 CSS 选择器字符串或 HTMLElement
- 目标容器必须在 Teleport 挂载前存在（除非使用 defer）
- 逻辑层级不变，provide/inject 正常工作
- 多个 Teleport 可以传送到同一个目标容器
- Teleport 可以和 v-if 配合实现条件传送
- SSR 场景下 Teleport 有特殊处理

### 总结

Teleport 将组件的 DOM 传送到指定的目标容器中，解决模态框、下拉菜单等 UI 元素被父元素 CSS 限制的问题。DOM 位置改变但逻辑层级不变，provide/inject 和事件系统正常工作。to 属性支持 CSS 选择器和 HTMLElement。Vue 3.5+ 新增 defer 属性支持延迟目标解析。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### teleport的to目标选择器

### 概念说明

`<Teleport>` 的 `to` 属性指定内容传送的目标容器。它是必填属性，接受两种值类型：CSS 选择器字符串（如 `"body"`、`"#modal-root"`、`".container"`）或者 HTMLElement 对象。Vue 在挂载 Teleport 时通过 `document.querySelector(to)` 来查找目标容器。

to 属性支持动态绑定（`:to`），可以在运行时改变传送目标。当 to 的值变化时，Teleport 会自动将 DOM 从旧容器移动到新容器。

如果指定的目标容器不存在，Vue 会在开发模式下发出警告。生产模式下 Teleport 的内容不会被渲染。因此需要确保目标容器在 Teleport 挂载之前已经存在于 DOM 中。

### 基本示例

```vue
<script setup>
import { ref } from "vue";

const target = ref("#container-a");

function switchTarget() {
    // 动态切换传送目标
    target.value = target.value === "#container-a"
        ? "#container-b"
        : "#container-a";
}
</script>

<template>
    <!-- CSS 选择器：ID 选择器 -->
    <Teleport to="#modal-root">
        <div class="modal">弹窗内容</div>
    </Teleport>

    <!-- CSS 选择器：body 标签 -->
    <Teleport to="body">
        <div class="toast">提示消息</div>
    </Teleport>

    <!-- CSS 选择器：class 选择器 -->
    <Teleport to=".notification-container">
        <div>通知内容</div>
    </Teleport>

    <!-- 动态 to：绑定变量 -->
    <Teleport :to="target">
        <div>可移动的内容</div>
    </Teleport>
    <button @click="switchTarget">切换容器</button>
</template>
```

```html
<!-- index.html 中预先准备目标容器 -->
<!DOCTYPE html>
<html>
<body>
    <div id="app"></div>

    <!-- Teleport 的目标容器 -->
    <div id="modal-root"></div>
    <div id="container-a"></div>
    <div id="container-b"></div>
    <div class="notification-container"></div>
</body>
</html>
```

```vue
<script setup>
import { ref, onMounted } from "vue";

// 使用 HTMLElement 作为 to 的值
const containerRef = ref(null);
</script>

<template>
    <!-- 目标容器 -->
    <div ref="containerRef"></div>

    <!-- 使用 ref 元素作为 to（需要等 mounted 后才可用） -->
    <Teleport :to="containerRef" v-if="containerRef">
        <div>传送到 ref 元素</div>
    </Teleport>
</template>
```

### 内部原理

#### to 属性的解析和移动

```
Teleport 对 to 的处理流程：

1. 解析目标
   function resolveTarget(to) {
       if (typeof to === 'string') {
           // CSS 选择器 → querySelector 查找
           const target = document.querySelector(to);
           if (!target) {
               warn('Teleport target not found: ' + to);
           }
           return target;
       }
       // HTMLElement → 直接使用
       return to;
   }

2. 挂载时
   → 解析 to 获得目标容器
   → 创建子节点的 DOM
   → 插入到目标容器中（而非父元素）

3. to 变化时
   → 解析新的目标容器
   → 将子节点的 DOM 从旧容器移动到新容器
   → 使用 insertBefore 或 appendChild

4. 多个 Teleport 传送到同一目标
   → 按照模板中的顺序依次追加
   → 后传送的排在前面的后面
```

### 与相关API的对比

| to 值类型 | 示例 | 适用场景 |
|----------|------|---------|
| ID 选择器 | `to="#modal-root"` | 最常用，明确唯一 |
| body | `to="body"` | 全局覆盖层 |
| class 选择器 | `to=".container"` | 匹配第一个 |
| HTMLElement | `:to="elRef"` | 动态引用 |
| 动态变量 | `:to="target"` | 运行时切换 |

### 适用场景

- **固定目标：** 模态框传送到 `#modal-root`
- **动态目标：** 根据条件切换传送位置
- **组件内目标：** 使用 ref 指向组件内的 DOM 元素

### 常见问题

#### 目标容器还不存在时的处理

**解决方案：**

```vue
<template>
    <!-- 方案1：在 index.html 中预先创建 -->
    <!-- <div id="modal-root"></div> -->

    <!-- 方案2：v-if 确保目标存在后再传送 -->
    <Teleport to="#dynamic-container" v-if="containerReady">
        <div>内容</div>
    </Teleport>

    <!-- 方案3：Vue 3.5+ defer 延迟解析 -->
    <Teleport to="#later-target" defer>
        <div>内容</div>
    </Teleport>
    <!-- defer 让 Teleport 在同一渲染周期的其他内容挂载后再解析目标 -->
</template>
```

### 注意事项

- to 是必填属性，不能省略
- CSS 选择器匹配第一个符合条件的元素
- 目标容器必须在 Teleport 挂载前存在
- to 支持动态绑定，值变化时自动移动 DOM
- 使用 HTMLElement 时需要确保 ref 已赋值
- 开发模式下目标不存在会发出警告

### 总结

Teleport 的 to 属性指定内容传送的目标 DOM 容器，支持 CSS 选择器字符串和 HTMLElement 两种格式。to 支持动态绑定，值变化时自动移动 DOM。目标容器必须在 Teleport 挂载前存在，或使用 Vue 3.5+ 的 defer 属性延迟解析。最常用的写法是 `to="body"` 或 `to="#modal-root"`。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### teleport的disabled禁用

### 概念说明

`<Teleport>` 的 `disabled` 属性用于动态控制是否执行传送。当 `disabled` 为 `true` 时，Teleport 的内容不会被传送到目标容器，而是在原位置渲染（就像没有 Teleport 一样）。当 `disabled` 为 `false` 或不设置时，正常传送到 `to` 指定的目标容器。

disabled 是响应式的，可以在运行时动态切换。当 disabled 从 true 变为 false 时，DOM 会被移动到目标容器；从 false 变为 true 时，DOM 会被移回原位置。这个特性常用于响应式布局——桌面端需要传送（如弹窗显示在 body 下），移动端不需要传送（如内联显示）。

### 基本示例

```vue
<script setup>
import { ref, computed } from "vue";

const isMobile = ref(window.innerWidth < 768);
const showPanel = ref(false);

// 根据屏幕宽度决定是否禁用 Teleport
window.addEventListener("resize", () => {
    isMobile.value = window.innerWidth < 768;
});
</script>

<template>
    <button @click="showPanel = !showPanel">切换面板</button>

    <!-- 移动端：disabled=true，内容在原位置渲染 -->
    <!-- 桌面端：disabled=false，内容传送到 body -->
    <Teleport to="body" :disabled="isMobile">
        <div v-if="showPanel" class="panel">
            <h3>操作面板</h3>
            <p>桌面端显示为浮层，移动端显示为内联</p>
        </div>
    </Teleport>
    <!--
        isMobile = true 时：
        → panel 的 DOM 在当前组件的 DOM 中
        → 作为普通子元素渲染

        isMobile = false 时：
        → panel 的 DOM 被传送到 body 下
        → 可以用 fixed/absolute 定位
    -->
</template>

<style>
/* 桌面端样式：浮层 */
@media (min-width: 768px) {
    .panel {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 1000;
        background: white;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        padding: 20px;
        border-radius: 8px;
    }
}

/* 移动端样式：内联 */
@media (max-width: 767px) {
    .panel {
        margin-top: 10px;
        padding: 15px;
        border: 1px solid #eee;
        border-radius: 8px;
    }
}
</style>
```

### 内部原理

#### disabled 的切换处理

```
Teleport 对 disabled 变化的处理：

挂载时：
  if (disabled) {
      // 在原位置插入子节点 DOM
      mountChildren(children, container);
  } else {
      // 在目标容器插入子节点 DOM
      mountChildren(children, targetContainer);
  }

更新时（disabled 变化）：
  if (旧disabled=true → 新disabled=false) {
      // 从原位置移动到目标容器
      moveTeleport(children, targetContainer);
  }
  if (旧disabled=false → 新disabled=true) {
      // 从目标容器移回原位置
      moveTeleport(children, container);
  }

  moveTeleport 的实现：
  → 遍历 Teleport 的所有子 DOM 节点
  → 调用 insertBefore 将每个节点移动到新容器
  → DOM 节点是被移动的，不是重新创建
  → 组件状态和 DOM 状态完全保留
```

### 与相关API的对比

| disabled 值 | DOM 位置 | 适用场景 |
|------------|---------|---------|
| false（默认） | 目标容器 | 需要脱离 CSS 上下文 |
| true | 原位置 | 内联显示 |
| 动态切换 | 随值变化移动 | 响应式布局 |

### 适用场景

- **响应式布局：** 桌面端浮层、移动端内联
- **条件传送：** 根据业务状态决定是否传送
- **调试：** 临时禁用传送查看原始布局
- **SSR：** 服务端渲染时禁用传送

### 常见问题

#### disabled 切换时的过渡效果

**解决方案：**

```vue
<template>
    <!-- disabled 切换时 DOM 会被移动 -->
    <!-- 移动过程没有过渡效果 -->
    <!-- 如果需要过渡，可以配合 Transition 使用 -->
    <Teleport to="body" :disabled="isMobile">
        <Transition name="fade">
            <div v-if="show" class="panel">内容</div>
        </Transition>
    </Teleport>
    <!-- 注意：disabled 切换本身不触发 Transition -->
    <!-- Transition 只在 v-if/v-show 变化时生效 -->
</template>
```

### 注意事项

- disabled 是可选属性，默认 false（不禁用）
- disabled 切换时 DOM 节点被移动而非重建
- 组件状态在切换过程中完全保留
- disabled 切换不触发 Transition 动画
- 即使 disabled=true，to 属性仍然是必填的
- 动态 disabled 适合响应式布局场景

### 总结

Teleport 的 disabled 属性控制是否执行传送。disabled=true 时内容在原位置渲染，disabled=false 时传送到目标容器。disabled 是响应式的，切换时 DOM 被移动而非重建，状态完全保留。典型应用是响应式布局——桌面端传送为浮层，移动端禁用传送为内联显示。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### teleport的延迟传送(3.5+)

### 概念说明

Vue 3.5 新增了 `<Teleport>` 的 `defer` 属性，用于延迟目标容器的解析。正常情况下，Teleport 在自身挂载时立即解析 `to` 指定的目标容器，如果目标容器还不存在就会报警告。而设置 `defer` 后，Teleport 会等到同一渲染周期中其他所有 DOM 内容都挂载完成后，再解析目标容器并传送内容。

这解决了一个常见的问题：Teleport 的目标容器是由同一个 Vue 应用渲染的 DOM 元素，而不是在 index.html 中预先定义的。没有 defer 时，如果 Teleport 在模板中出现在目标元素之前，目标元素还未挂载，Teleport 就找不到目标。有了 defer，Teleport 会延迟到所有 DOM 都挂载后再查找目标，解决了渲染顺序的依赖问题。

### 基本示例

```vue
<script setup>
import { ref } from "vue";

const showContent = ref(true);
</script>

<template>
    <!-- 没有 defer：Teleport 挂载时 #target 可能还不存在 -->
    <!-- 如果 Teleport 在模板中出现在 #target 之前会报错 -->

    <!-- 有 defer：延迟到所有 DOM 挂载后再解析目标 -->
    <Teleport to="#target" defer>
        <div v-if="showContent">
            <p>这段内容会被传送到下面的 #target 容器中</p>
        </div>
    </Teleport>

    <!-- 目标容器在 Teleport 之后渲染 -->
    <!-- 没有 defer 的话，Teleport 挂载时这个 div 还不存在 -->
    <div id="target" class="target-container">
        <!-- Teleport 的内容会出现在这里 -->
    </div>
</template>

<style>
.target-container {
    border: 2px dashed #ccc;
    padding: 16px;
    margin-top: 20px;
    min-height: 50px;
}
</style>
```

```vue
<!-- 实际应用：布局组件 -->
<script setup>
import { ref } from "vue";
</script>

<template>
    <div class="layout">
        <!-- 侧边栏中的操作按钮想传送到头部的工具栏 -->
        <aside>
            <h3>侧边栏</h3>
            <!-- defer 确保 #toolbar 已存在 -->
            <Teleport to="#toolbar" defer>
                <button>从侧边栏传送的按钮</button>
            </Teleport>
        </aside>

        <main>
            <header>
                <!-- 工具栏：接收从其他组件传送来的内容 -->
                <div id="toolbar" class="toolbar">
                    <span>工具栏：</span>
                </div>
            </header>
            <div class="content">
                <p>主要内容区域</p>
            </div>
        </main>
    </div>
</template>
```

### 内部原理

#### defer 的实现机制

```
defer 的工作原理：

没有 defer 的 Teleport：
  1. 组件渲染时立即解析 to
  2. document.querySelector(to)
  3. 目标不存在 → 报警告，内容不渲染

有 defer 的 Teleport：
  1. 组件渲染时不立即解析 to
  2. 将传送操作推迟到"后置刷新"阶段
  3. 后置刷新阶段：所有组件的 DOM 都已插入页面
  4. 此时再解析 to → 目标容器已存在
  5. 将内容传送到目标容器

时序对比：
  普通 Teleport：
    组件A挂载 → 解析to → 目标不存在(报错) → 组件B挂载(创建目标)

  defer Teleport：
    组件A挂载(标记延迟) → 组件B挂载(创建目标) → 后置刷新 → 解析to → 目标存在(成功)
```

### 与相关API的对比

| 方案 | 目标容器要求 | 适用场景 |
|------|------------|---------|
| 普通 Teleport | 必须在挂载前存在 | 目标在 index.html 中 |
| defer Teleport | 同一渲染周期即可 | 目标由 Vue 渲染 |
| v-if 延迟 | 手动控制时机 | 需要额外状态管理 |

### 适用场景

- **同应用内传送：** 目标容器由同一 Vue 应用渲染
- **布局组件：** 子组件向布局中的插槽区域传送内容
- **Portal 模式：** 组件内容传送到应用其他区域

### 常见问题

#### defer 之前的替代方案

**解决方案：**

```vue
<script setup>
import { ref, onMounted } from "vue";

// Vue 3.5 之前的替代方案：用 v-if 延迟渲染
const targetReady = ref(false);

onMounted(() => {
    // mounted 后目标容器已存在
    targetReady.value = true;
});
</script>

<template>
    <div id="my-target"></div>

    <!-- 旧方案：手动延迟 -->
    <Teleport to="#my-target" v-if="targetReady">
        <div>内容</div>
    </Teleport>

    <!-- Vue 3.5+ 新方案：直接使用 defer -->
    <Teleport to="#my-target" defer>
        <div>内容</div>
    </Teleport>
</template>
```

### 注意事项

- defer 是 Vue 3.5+ 新增的属性
- defer 只延迟目标解析，不影响内容渲染
- 目标容器必须在同一渲染周期内被创建
- defer 不会无限等待，只延迟到当前 tick 的后置刷新
- 如果后置刷新后目标仍不存在，仍会报警告
- defer 与 disabled 可以同时使用

### 总结

Vue 3.5+ 的 Teleport defer 属性解决了目标容器由 Vue 渲染时的顺序依赖问题。defer 将目标解析延迟到同一渲染周期的后置刷新阶段，此时所有组件的 DOM 都已挂载。适合同应用内传送、布局组件等场景，比之前用 v-if + onMounted 的方案更简洁。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### transition的进入/离开动画类名

### 概念说明

`<Transition>` 是 Vue 内置组件，为单个元素或组件的进入和离开提供动画效果。当被 Transition 包裹的元素通过 v-if、v-show 或动态组件切换时，Vue 会自动在合适的时机添加和移除 CSS 类名，开发者通过定义这些类名的样式来实现过渡动画。

Transition 定义了 6 个 CSS 类名，分为进入（enter）和离开（leave）两组，每组 3 个：

进入过程：`v-enter-from`（进入起始状态）→ `v-enter-active`（进入过程中）→ `v-enter-to`（进入结束状态）

离开过程：`v-leave-from`（离开起始状态）→ `v-leave-active`（离开过程中）→ `v-leave-to`（离开结束状态）

其中 `v-` 是默认前缀，可以通过 `name` 属性自定义。比如 `<Transition name="fade">` 对应的类名就变成 `fade-enter-from`、`fade-enter-active` 等。

### 基本示例

```vue
<script setup>
import { ref } from "vue";

const show = ref(true);
</script>

<template>
    <button @click="show = !show">切换</button>

    <!-- name="fade" → 类名前缀为 fade- -->
    <Transition name="fade">
        <p v-if="show">淡入淡出效果</p>
    </Transition>

    <!-- name="slide" → 类名前缀为 slide- -->
    <Transition name="slide">
        <div v-if="show" class="box">滑动效果</div>
    </Transition>
</template>

<style>
/* === 淡入淡出动画 === */

/* 进入和离开的过渡过程：定义过渡属性和时长 */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

/* 进入的起始状态 和 离开的结束状态：完全透明 */
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

/* === 滑动动画 === */

.slide-enter-active,
.slide-leave-active {
    transition: transform 0.3s ease, opacity 0.3s ease;
}

/* 进入起始：从左侧滑入 */
.slide-enter-from {
    transform: translateX(-30px);
    opacity: 0;
}

/* 离开结束：向右侧滑出 */
.slide-leave-to {
    transform: translateX(30px);
    opacity: 0;
}
</style>
```

```
6 个类名的添加/移除时序：

进入过程（v-if 从 false → true）：
  第1帧：添加 v-enter-from + v-enter-active
  第2帧：移除 v-enter-from，添加 v-enter-to
  过渡结束：移除 v-enter-active + v-enter-to

离开过程（v-if 从 true → false）：
  第1帧：添加 v-leave-from + v-leave-active
  第2帧：移除 v-leave-from，添加 v-leave-to
  过渡结束：移除 v-leave-active + v-leave-to
  → 然后才从 DOM 中移除元素
```

### 内部原理

#### Transition 类名的添加时机

```
Vue Transition 的内部流程：

进入动画：
  1. 创建 DOM 元素（但还未插入页面）
  2. 添加 enter-from 和 enter-active 类名
  3. 插入 DOM
  4. 下一帧（requestAnimationFrame）：
     → 移除 enter-from
     → 添加 enter-to
     → 此时浏览器触发 CSS transition
  5. 监听 transitionend 或 animationend 事件
  6. 过渡结束后：
     → 移除 enter-active 和 enter-to

离开动画：
  1. 添加 leave-from 和 leave-active 类名
  2. 下一帧：
     → 移除 leave-from
     → 添加 leave-to
     → CSS transition 开始
  3. 监听 transitionend 事件
  4. 过渡结束后：
     → 移除 leave-active 和 leave-to
     → 从 DOM 中移除元素（或 display:none）
```

### 与相关API的对比

| 类名 | 时机 | 持续时间 | 常见用途 |
|------|------|---------|---------|
| v-enter-from | 进入第1帧 | 1帧 | 定义初始状态 |
| v-enter-active | 整个进入过程 | 过渡持续 | 定义 transition 属性 |
| v-enter-to | 进入第2帧到结束 | 过渡持续 | 定义目标状态（通常不需要） |
| v-leave-from | 离开第1帧 | 1帧 | 定义离开起始状态（通常不需要） |
| v-leave-active | 整个离开过程 | 过渡持续 | 定义 transition 属性 |
| v-leave-to | 离开第2帧到结束 | 过渡持续 | 定义离开结束状态 |

### 适用场景

- **显示/隐藏动画：** v-if/v-show 切换时的淡入淡出
- **路由切换动画：** 页面进入和离开的过渡效果
- **列表项动画：** 配合 TransitionGroup 使用
- **动态组件切换：** component :is 切换时的过渡

### 常见问题

#### CSS transition 和 CSS animation 的区别

**解决方案：**

```css
/* CSS transition：通过 active 类定义 transition 属性 */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

/* CSS animation：通过 active 类定义 animation */
.bounce-enter-active {
    animation: bounce-in 0.5s;
}
.bounce-leave-active {
    animation: bounce-in 0.5s reverse;
}
@keyframes bounce-in {
    0% { transform: scale(0); }
    50% { transform: scale(1.25); }
    100% { transform: scale(1); }
}
```

### 注意事项

- Transition 只能包裹单个元素或组件
- name 属性决定 CSS 类名的前缀
- 不设置 name 时前缀为 v-（即 v-enter-from 等）
- enter-to 和 leave-from 通常不需要定义（使用元素的默认样式）
- Transition 会自动检测使用的是 transition 还是 animation
- 可以通过 type="transition" 或 type="animation" 强制指定

### 总结

Transition 通过 6 个 CSS 类名（enter-from/enter-active/enter-to + leave-from/leave-active/leave-to）实现元素的进入和离开动画。active 类定义过渡属性和持续时间，from/to 类定义起始和结束状态。name 属性自定义类名前缀。支持 CSS transition 和 CSS animation 两种动画方式。Vue 自动在合适时机添加和移除类名，开发者只需定义对应的 CSS 样式。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### transition的v-enter-from/v-enter-to/v-enter-active

### 概念说明

`v-enter-from`、`v-enter-active`、`v-enter-to` 是 `<Transition>` 进入动画的三个 CSS 类名，分别对应进入过程的起始状态、激活过程和结束状态。

**v-enter-from：** 进入的起始状态。在元素被插入 DOM 之前添加，插入后的下一帧移除。用于定义元素进入前的初始样式（比如 opacity: 0、transform: translateX(-20px)）。

**v-enter-active：** 进入的激活状态。在整个进入过渡期间存在，从元素插入前添加，过渡完成后移除。用于定义过渡的 `transition` 属性（持续时间、缓动函数等）或 `animation` 属性。

**v-enter-to：** 进入的结束状态。在 v-enter-from 被移除的同一帧添加（即插入后的下一帧），过渡完成后移除。通常不需要显式定义，因为元素的默认样式就是最终状态。

Vue 2 中这三个类名分别叫 `v-enter`、`v-enter-active`、`v-enter-to`。Vue 3 将 `v-enter` 重命名为 `v-enter-from`，语义更清晰。

### 基本示例

```vue
<script setup>
import { ref } from "vue";

const visible = ref(false);
</script>

<template>
    <button @click="visible = !visible">切换显示</button>

    <Transition name="scale">
        <div v-if="visible" class="box">缩放进入效果</div>
    </Transition>

    <Transition name="slide-fade">
        <p v-if="visible">滑动淡入效果</p>
    </Transition>
</template>

<style>
/* === 缩放进入动画 === */

/* 起始状态：缩小到 0 并且透明 */
.scale-enter-from {
    transform: scale(0);
    opacity: 0;
}

/* 激活过程：定义过渡属性 */
.scale-enter-active {
    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    /* cubic-bezier 产生弹性效果 */
}

/* 结束状态：通常不需要定义 */
/* 元素会自然回到默认样式（scale(1), opacity: 1） */
/* .scale-enter-to {
    transform: scale(1);
    opacity: 1;
} */


/* === 滑动淡入动画 === */

/* 起始状态：从右侧偏移并透明 */
.slide-fade-enter-from {
    transform: translateX(20px);
    opacity: 0;
}

/* 激活过程：两个属性分别设置不同的过渡时间 */
.slide-fade-enter-active {
    transition: transform 0.3s ease-out, opacity 0.5s ease;
}

/* 结束状态：默认位置和透明度 */
/* 通常不需要显式定义 */


/* === 使用 CSS animation 的进入动画 === */
.bounce-enter-active {
    animation: bounce-in 0.5s;
}

@keyframes bounce-in {
    0% {
        transform: scale(0);
        opacity: 0;
    }
    50% {
        transform: scale(1.15);
    }
    100% {
        transform: scale(1);
        opacity: 1;
    }
}
</style>
```

### 内部原理

#### 进入类名的添加和移除时序

```
v-enter 三个类名的精确时序：

帧0（元素插入前）：
  → 添加 v-enter-from    ← 定义起始状态
  → 添加 v-enter-active  ← 定义过渡属性
  → 元素插入 DOM

帧1（下一个 requestAnimationFrame）：
  → 移除 v-enter-from    ← 触发 CSS transition
  → 添加 v-enter-to      ← 定义目标状态

transitionend / animationend 事件触发：
  → 移除 v-enter-active
  → 移除 v-enter-to

为什么要两帧分开操作？
  → 浏览器需要在添加 v-enter-from 后至少渲染一帧
  → 这样移除 v-enter-from 时才会产生样式变化
  → 样式变化 + transition 属性 → 触发 CSS 过渡动画
  → 如果同帧添加和移除，浏览器不会产生过渡效果
```

### 与相关API的对比

| 类名 | Vue 3 | Vue 2 | 作用 |
|------|-------|-------|------|
| 进入起始 | v-enter-from | v-enter | 定义初始状态 |
| 进入过程 | v-enter-active | v-enter-active | 定义 transition/animation |
| 进入结束 | v-enter-to | v-enter-to | 定义目标状态（通常省略） |

### 适用场景

- **淡入效果：** enter-from 设置 opacity: 0
- **滑入效果：** enter-from 设置 transform: translateX
- **缩放效果：** enter-from 设置 transform: scale(0)
- **组合效果：** 同时设置多个属性的变化

### 常见问题

#### 进入动画不生效

**解决方案：**

```css
/* 问题：enter-active 中没有定义 transition */
/* .my-enter-from { opacity: 0; } */
/* 缺少 .my-enter-active { transition: ... } */
/* 没有 transition 属性，样式直接跳到最终值，无动画 */

/* 正确：必须在 enter-active 中定义过渡属性 */
.my-enter-from {
    opacity: 0;
}
.my-enter-active {
    transition: opacity 0.3s ease; /* 必须有这个 */
}
```

### 注意事项

- v-enter-from 在元素插入前添加，下一帧移除
- v-enter-active 贯穿整个进入过程
- v-enter-to 通常不需要显式定义
- enter-active 中必须定义 transition 或 animation
- Vue 2 的 v-enter 在 Vue 3 中改名为 v-enter-from
- name 属性决定类名前缀（name="fade" → fade-enter-from）

### 总结

v-enter-from 定义进入的起始状态（初始样式），v-enter-active 定义过渡属性（transition/animation），v-enter-to 定义结束状态（通常省略，使用默认样式）。三个类名配合浏览器的两帧渲染机制触发 CSS 过渡。enter-active 中必须包含 transition 或 animation 属性，否则动画不会生效。Vue 3 将 Vue 2 的 v-enter 重命名为 v-enter-from。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### transition的v-leave-from/v-leave-to/v-leave-active

### 概念说明

`v-leave-from`、`v-leave-active`、`v-leave-to` 是 `<Transition>` 离开动画的三个 CSS 类名，分别对应离开过程的起始状态、激活过程和结束状态。

**v-leave-from：** 离开的起始状态。在离开过渡触发时立即添加，下一帧移除。通常不需要显式定义，因为元素当前的样式就是离开的起始状态。

**v-leave-active：** 离开的激活状态。在整个离开过渡期间存在，从离开触发时添加，过渡完成后移除。用于定义过渡的 `transition` 属性或 `animation` 属性。

**v-leave-to：** 离开的结束状态。在 v-leave-from 移除的同一帧添加，过渡完成后移除。用于定义元素离开后的最终样式（比如 opacity: 0、transform: translateX(20px)）。过渡结束后元素才从 DOM 中移除。

离开动画的关键点是：元素不会在离开触发时立即从 DOM 中移除，而是等到离开过渡动画完全结束后才移除。

### 基本示例

```vue
<script setup>
import { ref } from "vue";

const show = ref(true);
</script>

<template>
    <button @click="show = !show">切换</button>

    <Transition name="fade">
        <div v-if="show" class="box">淡出效果</div>
    </Transition>

    <Transition name="slide-up">
        <div v-if="show" class="panel">向上滑出</div>
    </Transition>
</template>

<style>
/* === 淡出动画 === */

/* 离开的过渡属性 */
.fade-leave-active {
    transition: opacity 0.3s ease;
}

/* 离开的结束状态：完全透明 */
.fade-leave-to {
    opacity: 0;
}

/* leave-from 通常不需要定义 */
/* 元素当前的样式就是离开起始状态 */


/* === 向上滑出动画 === */

/* 离开过程的过渡属性 */
.slide-up-leave-active {
    transition: all 0.3s ease-in;
    /* ease-in 让离开动画加速，符合物理直觉 */
}

/* 离开的结束状态：向上偏移并透明 */
.slide-up-leave-to {
    transform: translateY(-20px);
    opacity: 0;
}


/* === 进入和离开通常配对定义 === */

/* 进入：淡入 */
.fade-enter-from { opacity: 0; }
.fade-enter-active { transition: opacity 0.3s ease; }

/* 进入：从下方滑入 */
.slide-up-enter-from {
    transform: translateY(20px);
    opacity: 0;
}
.slide-up-enter-active {
    transition: all 0.3s ease-out;
    /* ease-out 让进入动画减速，符合物理直觉 */
}
</style>
```

### 内部原理

#### 离开类名的时序和 DOM 移除

```
v-leave 三个类名的精确时序：

触发离开（v-if 变为 false）：
  帧0：
    → 添加 v-leave-from    ← 离开起始状态
    → 添加 v-leave-active  ← 过渡属性

  帧1（下一个 requestAnimationFrame）：
    → 移除 v-leave-from    ← 触发 CSS transition
    → 添加 v-leave-to      ← 离开结束状态

  transitionend 事件触发：
    → 移除 v-leave-active
    → 移除 v-leave-to
    → 从 DOM 中移除元素    ← 此时才真正移除

关键区别：
  进入动画：先插入 DOM，再动画
  离开动画：先动画，再移除 DOM
  → 离开动画结束前元素一直在 DOM 中
  → 这保证了离开动画的完整性
```

### 与相关API的对比

| 类名 | 添加时机 | 移除时机 | 常见定义内容 |
|------|---------|---------|------------|
| v-leave-from | 离开触发时 | 下一帧 | 通常不需要定义 |
| v-leave-active | 离开触发时 | 过渡结束 | transition/animation 属性 |
| v-leave-to | 下一帧 | 过渡结束 | 离开结束样式 |

### 适用场景

- **淡出：** leave-to 设置 opacity: 0
- **滑出：** leave-to 设置 transform: translateX/Y
- **缩小消失：** leave-to 设置 transform: scale(0)
- **组合效果：** 同时设置多个属性

### 常见问题

#### 进入和离开使用不同的动画时长

**解决方案：**

```css
/* 进入：较慢（用户注意到新内容出现） */
.my-enter-active {
    transition: all 0.5s ease-out;
}
.my-enter-from {
    opacity: 0;
    transform: translateY(20px);
}

/* 离开：较快（旧内容快速消失） */
.my-leave-active {
    transition: all 0.2s ease-in;
}
.my-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}

/* 常见做法：进入比离开慢一些 */
/* 进入动画吸引注意，离开动画不要拖延 */
```

### 注意事项

- leave-from 通常不需要定义，元素当前样式就是起始状态
- leave-active 必须包含 transition 或 animation
- 离开动画结束后元素才从 DOM 移除
- 进入和离开可以使用不同的动画时长和缓动函数
- 进入用 ease-out（减速），离开用 ease-in（加速）更自然
- v-show 的离开动画结束后设置 display:none 而非移除 DOM

### 总结

v-leave-from 定义离开起始状态（通常省略），v-leave-active 定义过渡属性，v-leave-to 定义离开结束状态（如 opacity:0）。离开动画结束后元素才从 DOM 移除，保证动画完整性。进入和离开可以配合不同的时长和缓动函数。leave-active 中必须包含 transition 或 animation 属性。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### transition的mode过渡模式(out-in/in-out)

### 概念说明

`<Transition>` 的 `mode` 属性用于控制进入和离开动画的执行顺序。默认情况下，进入和离开动画是同时执行的——旧元素在离开的同时新元素开始进入。这在某些场景下会导致两个元素同时存在于 DOM 中，产生布局跳动或重叠的视觉问题。

mode 提供两种模式来解决这个问题：

**out-in：** 先执行离开动画，等旧元素完全离开后，再执行新元素的进入动画。这是最常用的模式，适合大多数切换场景，可以避免两个元素同时存在导致的布局问题。

**in-out：** 先执行进入动画，等新元素完全进入后，再执行旧元素的离开动画。这个模式用得较少，适合特殊的叠加切换效果。

### 基本示例

```vue
<script setup>
import { ref } from "vue";

const current = ref("A");

function toggle() {
    current.value = current.value === "A" ? "B" : "A";
}
</script>

<template>
    <button @click="toggle">切换组件</button>

    <!-- out-in：旧元素先离开，新元素再进入（推荐） -->
    <Transition name="fade" mode="out-in">
        <component :is="current === 'A' ? CompA : CompB" :key="current" />
    </Transition>

    <!-- in-out：新元素先进入，旧元素再离开 -->
    <Transition name="fade" mode="in-out">
        <component :is="current === 'A' ? CompA : CompB" :key="current" />
    </Transition>

    <!-- 默认（无 mode）：进入和离开同时执行 -->
    <Transition name="fade">
        <component :is="current === 'A' ? CompA : CompB" :key="current" />
    </Transition>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
```

```vue
<!-- 典型应用：Tab 内容切换 -->
<script setup>
import { ref, shallowRef } from "vue";
import TabHome from "./TabHome.vue";
import TabProfile from "./TabProfile.vue";
import TabSettings from "./TabSettings.vue";

const activeTab = shallowRef(TabHome);
</script>

<template>
    <div class="tab-content">
        <!-- out-in 避免两个 Tab 内容同时显示 -->
        <Transition name="slide" mode="out-in">
            <component :is="activeTab" />
        </Transition>
    </div>
</template>

<style>
.slide-enter-active,
.slide-leave-active {
    transition: all 0.2s ease;
}

.slide-enter-from {
    opacity: 0;
    transform: translateX(20px);
}

.slide-leave-to {
    opacity: 0;
    transform: translateX(-20px);
}
</style>
```

### 内部原理

#### mode 对动画时序的控制

```
三种模式的时序对比：

默认（无 mode）：
  时间 → ────────────────────────
  旧元素：[===离开动画===]
  新元素：[===进入动画===]
  → 同时执行，两个元素短暂共存
  → 可能产生布局跳动

out-in：
  时间 → ────────────────────────
  旧元素：[===离开动画===]
  新元素：               [===进入动画===]
  → 先离开，完成后再进入
  → 任何时刻只有一个元素

in-out：
  时间 → ────────────────────────
  新元素：[===进入动画===]
  旧元素：               [===离开动画===]
  → 先进入，完成后再离开
  → 中间阶段两个元素共存

内部实现：
  out-in：
    → 执行旧元素的离开动画
    → 监听 afterLeave 回调
    → 回调中触发新元素的进入动画

  in-out：
    → 执行新元素的进入动画
    → 监听 afterEnter 回调
    → 回调中触发旧元素的离开动画
```

### 与相关API的对比

| mode | 执行顺序 | 共存情况 | 适用场景 |
|------|---------|---------|---------|
| 默认 | 同时 | 短暂共存 | 叠加效果 |
| out-in | 先离开后进入 | 不共存 | 大多数切换 |
| in-out | 先进入后离开 | 中间共存 | 特殊覆盖效果 |

### 适用场景

- **out-in：** Tab 切换、页面切换、表单步骤切换
- **in-out：** 卡片翻转、覆盖式切换效果
- **默认：** 交叉淡入淡出效果

### 常见问题

#### 不使用 mode 时布局跳动

**解决方案：**

```vue
<template>
    <!-- 方案1：使用 out-in（推荐） -->
    <Transition name="fade" mode="out-in">
        <component :is="activeComp" :key="activeKey" />
    </Transition>

    <!-- 方案2：用 CSS 绝对定位避免跳动 -->
    <div style="position: relative;">
        <Transition name="fade">
            <component
                :is="activeComp"
                :key="activeKey"
                style="position: absolute; width: 100%;"
            />
        </Transition>
    </div>
</template>
```

### 注意事项

- out-in 是最常用的模式
- 不设置 mode 时进入和离开同时执行
- 动态组件切换需要配合 :key 使用
- out-in 会增加总动画时长（两段动画串行）
- in-out 较少使用，适合特殊效果
- mode 只对 Transition 有效，TransitionGroup 不支持

### 总结

Transition 的 mode 属性控制进入和离开动画的执行顺序。out-in 先完成离开再开始进入，是最常用的模式，避免两个元素同时存在导致的布局问题。in-out 先进入后离开，适合覆盖式效果。默认不设置 mode 时两个动画同时执行。动态组件切换时需要配合 :key 来触发过渡。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### transition-group的列表过渡

### 概念说明

`<TransitionGroup>` 是 Vue 内置组件，用于对 v-for 渲染的列表中的元素提供进入、离开和移动的过渡动画。与 `<Transition>` 不同，TransitionGroup 可以同时包裹多个元素，每个列表项都可以独立地执行进入和离开动画。

TransitionGroup 的核心特性：
- 默认渲染为一个真实的 DOM 元素（默认是 `<span>`），可以通过 `tag` 属性指定标签
- 不支持 `mode` 属性（因为多个元素可以同时进入和离开）
- 列表项必须有唯一的 `key` 属性
- CSS 过渡类名会应用到列表中的每个子元素上，而非容器

TransitionGroup 还支持移动动画（move transition）——当列表项的位置因为排序、插入、删除等操作发生变化时，Vue 会使用 FLIP 动画技术平滑地移动元素到新位置。

### 基本示例

```vue
<script setup>
import { ref } from "vue";

const items = ref([
    { id: 1, text: "苹果" },
    { id: 2, text: "香蕉" },
    { id: 3, text: "橙子" },
]);

let nextId = 4;

function addItem() {
    // 在随机位置插入新项
    const index = Math.floor(Math.random() * (items.value.length + 1));
    items.value.splice(index, 0, {
        id: nextId++,
        text: "新水果" + (nextId - 1),
    });
}

function removeItem(id) {
    const index = items.value.findIndex((i) => i.id === id);
    if (index > -1) items.value.splice(index, 1);
}

function shuffle() {
    // 随机打乱列表
    items.value = items.value
        .map((item) => ({ item, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ item }) => item);
}
</script>

<template>
    <button @click="addItem">添加</button>
    <button @click="shuffle">打乱</button>

    <!-- tag="ul" 让 TransitionGroup 渲染为 ul 标签 -->
    <TransitionGroup name="list" tag="ul">
        <li v-for="item in items" :key="item.id">
            {{ item.text }}
            <button @click="removeItem(item.id)">删除</button>
        </li>
    </TransitionGroup>
</template>

<style>
/* 进入动画 */
.list-enter-from {
    opacity: 0;
    transform: translateX(-30px);
}
.list-enter-active {
    transition: all 0.4s ease;
}

/* 离开动画 */
.list-leave-active {
    transition: all 0.4s ease;
    /* 离开时使用绝对定位，让其他元素可以移动 */
    position: absolute;
}
.list-leave-to {
    opacity: 0;
    transform: translateX(30px);
}

/* 移动动画：其他元素平滑移动到新位置 */
.list-move {
    transition: transform 0.4s ease;
}
</style>
```

### 内部原理

#### TransitionGroup 的渲染和动画机制

```
TransitionGroup 的工作流程：

1. 渲染
   → 渲染为 tag 指定的 DOM 元素（默认 span）
   → 每个子元素必须有唯一 key
   → 子元素各自独立应用过渡类名

2. 列表变化时
   → 对比新旧列表
   → 新增项 → 应用 enter 动画
   → 删除项 → 应用 leave 动画
   → 位置变化项 → 应用 move 动画

3. FLIP 移动动画
   → First: 记录每个元素的当前位置
   → Last: 应用 DOM 变更后记录新位置
   → Invert: 计算位置差，用 transform 将元素移回原位
   → Play: 添加 move 类名（含 transition），移除 transform
   → 浏览器自动过渡到新位置

4. 离开动画的绝对定位
   → 离开的元素设置 position: absolute
   → 这样它不再占据空间
   → 其他元素可以平滑移动填补空位
   → 如果不设置绝对定位，移动动画会有卡顿
```

### 与相关API的对比

| 特性 | Transition | TransitionGroup |
|------|-----------|----------------|
| 子元素数量 | 1个 | 多个 |
| mode 属性 | 支持 | 不支持 |
| move 动画 | 不支持 | 支持 |
| 渲染 DOM | 不渲染容器 | 渲染容器元素 |
| key 要求 | 可选 | 必须 |
| tag 属性 | 无 | 指定容器标签 |

### 适用场景

- **动态列表：** 添加、删除列表项时的动画
- **排序列表：** 列表重新排序时的移动动画
- **筛选列表：** 筛选条件变化时的进出动画
- **购物车：** 商品添加/移除的动画反馈

### 常见问题

#### 移动动画不流畅

**解决方案：**

```css
/* 关键：离开的元素必须脱离文档流 */
.list-leave-active {
    /* 绝对定位让元素脱离文档流 */
    position: absolute;
    /* 这样其他元素才能立即开始移动 */
}

/* move 类名定义移动过渡 */
.list-move {
    transition: transform 0.4s ease;
}

/* 如果列表项宽度不固定 */
.list-leave-active {
    position: absolute;
    width: 100%; /* 保持离开时的宽度 */
}
```

### 注意事项

- 每个子元素必须有唯一的 key
- 不支持 mode 属性
- 离开动画中设置 position: absolute 让移动动画流畅
- tag 属性指定容器元素（默认 span，通常设为 ul、div 等）
- move 类名用于位置变化的过渡
- FLIP 动画在列表项数量大时可能有性能问题

### 总结

TransitionGroup 为 v-for 列表提供进入、离开和移动三种过渡动画。每个列表项需要唯一 key，独立应用过渡类名。移动动画使用 FLIP 技术实现平滑位置变化。离开动画中需要设置 position:absolute 让其他元素能够移动填补空位。通过 tag 属性指定渲染的容器元素。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### transition-group的key必要性

### 概念说明

在 `<TransitionGroup>` 中，每个子元素必须有唯一的 `key` 属性。这不仅仅是 v-for 的最佳实践，更是 TransitionGroup 正常工作的硬性要求。没有 key，Vue 无法准确追踪每个列表项的身份，导致无法判断哪些项是新增的、哪些被删除、哪些只是位置变了。

key 的作用在于给每个列表项一个稳定的身份标识。当列表发生变化时，Vue 通过 key 来匹配新旧列表中的同一个项，从而决定对每个项执行进入动画（新增项）、离开动画（删除项）还是移动动画（位置变化项）。

如果使用数组索引（index）作为 key，在列表中间插入或删除元素时，后续元素的索引都会变化，Vue 会认为这些元素都是"不同的"，导致动画行为异常——本该移动的项变成了先删除再新增。

### 基本示例

```vue
<script setup>
import { ref } from "vue";

const items = ref([
    { id: "apple", name: "苹果" },
    { id: "banana", name: "香蕉" },
    { id: "orange", name: "橙子" },
]);

function insertAtStart() {
    items.value.unshift({ id: "grape-" + Date.now(), name: "葡萄" });
}

function removeFirst() {
    items.value.shift();
}
</script>

<template>
    <button @click="insertAtStart">在开头插入</button>
    <button @click="removeFirst">删除第一个</button>

    <!-- 正确：使用唯一且稳定的 id 作为 key -->
    <TransitionGroup name="list" tag="ul">
        <li v-for="item in items" :key="item.id">
            {{ item.name }}
        </li>
    </TransitionGroup>
    <!--
        在开头插入"葡萄"时：
        → 葡萄：进入动画（新增项）
        → 苹果、香蕉、橙子：移动动画（位置下移）
        → 行为正确
    -->

    <!-- 错误：使用 index 作为 key -->
    <!-- <TransitionGroup name="list" tag="ul">
        <li v-for="(item, index) in items" :key="index">
            {{ item.name }}
        </li>
    </TransitionGroup> -->
    <!--
        在开头插入"葡萄"时（使用 index 作 key）：
        → key=0: 旧=苹果 新=葡萄 → Vue 认为是"更新"（不是新增）
        → key=1: 旧=香蕉 新=苹果 → Vue 认为是"更新"
        → key=2: 旧=橙子 新=香蕉 → Vue 认为是"更新"
        → key=3: 不存在 → 新=橙子 → Vue 认为是"新增"
        → 动画完全错误：橙子执行进入动画，而不是葡萄
    -->
</template>

<style>
.list-enter-from { opacity: 0; transform: translateX(-30px); }
.list-enter-active { transition: all 0.4s ease; }
.list-leave-to { opacity: 0; transform: translateX(30px); }
.list-leave-active { transition: all 0.4s ease; position: absolute; }
.list-move { transition: transform 0.4s ease; }
</style>
```

### 内部原理

#### key 在 TransitionGroup 中的匹配逻辑

```
TransitionGroup 利用 key 判断列表项的状态：

旧列表: [{id:"a"}, {id:"b"}, {id:"c"}]
新列表: [{id:"d"}, {id:"a"}, {id:"c"}]

通过 key 匹配：
  key="d" → 旧列表中不存在 → 新增项 → 进入动画
  key="a" → 旧列表中存在，位置从 0 变为 1 → 移动动画
  key="b" → 新列表中不存在 → 删除项 → 离开动画
  key="c" → 旧列表中存在，位置从 2 变为 2 → 不动

如果用 index 作 key：
  旧: [0:"a", 1:"b", 2:"c"]
  新: [0:"d", 1:"a", 2:"c"]
  key=0: 旧="a" 新="d" → Vue 认为是同一个元素，内容更新
  key=1: 旧="b" 新="a" → Vue 认为是同一个元素，内容更新
  key=2: 旧="c" 新="c" → 碰巧一样
  → 没有进入动画、没有离开动画、没有移动动画
  → 动画完全失效
```

### 与相关API的对比

| key 类型 | 稳定性 | 动画效果 | 推荐程度 |
|---------|--------|---------|---------|
| 唯一 ID（如数据库 id） | 稳定 | 正确 | 强烈推荐 |
| 唯一标识（如 UUID） | 稳定 | 正确 | 推荐 |
| 数组索引 index | 不稳定 | 错误 | 禁止 |
| 随机数 | 每次都变 | 全部重新渲染 | 禁止 |

### 适用场景

- **数据库列表：** 使用记录的 id 字段
- **前端生成列表：** 使用递增计数器或 UUID
- **组合数据：** 使用多字段组合的唯一标识

### 常见问题

#### 没有天然 id 时如何生成 key

**解决方案：**

```javascript
// 方案1：在数据创建时分配递增 id
let nextId = 1;
function createItem(text) {
    return { id: nextId++, text };
}

// 方案2：使用 crypto.randomUUID()
function createItem(text) {
    return { id: crypto.randomUUID(), text };
}

// 方案3：在获取数据时补充 id
const rawData = await fetch("/api/list").then((r) => r.json());
const items = rawData.map((item, i) => ({
    ...item,
    _uid: item.id || `item-${i}-${Date.now()}`,
}));
```

### 注意事项

- TransitionGroup 的子元素必须有 key
- 不能使用数组索引作为 key（动画会错乱）
- 不能使用随机数作为 key（每次都变导致全量重渲染）
- key 必须是唯一且稳定的
- key 用于匹配新旧列表中的同一项
- 没有 key 或 key 不唯一会导致不可预期的行为

### 总结

TransitionGroup 依赖 key 来追踪每个列表项的身份，判断哪些项是新增（进入动画）、删除（离开动画）还是位置变化（移动动画）。key 必须是唯一且稳定的标识符，如数据库 id 或递增计数器。使用数组索引作为 key 会导致动画行为完全错误，因为索引在插入删除后会变化，Vue 无法正确匹配列表项。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### transition-group的move类名与FLIP动画

### 概念说明

`<TransitionGroup>` 除了支持进入和离开动画外，还支持移动动画（move transition）。当列表项的位置因为插入、删除或排序操作发生变化时，Vue 会自动为位置变化的元素添加 `v-move` 类名（如果设置了 `name="list"`，则为 `list-move`），开发者在这个类名中定义 `transition` 属性即可实现平滑的位置移动效果。

移动动画的底层实现使用了 FLIP 技术。FLIP 是 First、Last、Invert、Play 四个步骤的缩写：

- **First：** 记录每个元素在 DOM 变更前的位置
- **Last：** 执行 DOM 变更，记录元素的新位置
- **Invert：** 计算新旧位置的差值，通过 CSS transform 将元素"移回"到旧位置
- **Play：** 添加 transition，移除 transform，让浏览器自动过渡到新位置

FLIP 的核心思想是"先移动再动画"——DOM 立即更新到最终状态，然后通过 CSS transition 补上过渡效果。

### 基本示例

```vue
<script setup>
import { ref, computed } from "vue";

const numbers = ref([1, 2, 3, 4, 5, 6, 7, 8, 9]);

function shuffle() {
    // Fisher-Yates 洗牌算法
    const arr = [...numbers.value];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    numbers.value = arr;
}

function sortAsc() {
    numbers.value = [...numbers.value].sort((a, b) => a - b);
}
</script>

<template>
    <button @click="shuffle">打乱</button>
    <button @click="sortAsc">升序</button>

    <!-- 网格布局：列表项排序时平滑移动 -->
    <TransitionGroup name="grid" tag="div" class="grid-container">
        <div v-for="n in numbers" :key="n" class="grid-item">
            {{ n }}
        </div>
    </TransitionGroup>
</template>

<style>
.grid-container {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    width: 200px;
}

.grid-item {
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #42b883;
    color: white;
    border-radius: 4px;
    font-size: 18px;
    font-weight: bold;
}

/* 移动动画：位置变化时平滑过渡 */
.grid-move {
    transition: transform 0.5s ease;
}

/* 进入动画 */
.grid-enter-from {
    opacity: 0;
    transform: scale(0);
}
.grid-enter-active {
    transition: all 0.3s ease;
}

/* 离开动画：必须绝对定位 */
.grid-leave-active {
    transition: all 0.3s ease;
    position: absolute;
}
.grid-leave-to {
    opacity: 0;
    transform: scale(0);
}
</style>
```

### 内部原理

#### FLIP 动画的实现步骤

```
Vue TransitionGroup 的 FLIP 实现：

步骤1 - First（记录旧位置）：
  → 在 DOM 更新前，对每个子元素调用 getBoundingClientRect()
  → 保存每个元素的 { left, top } 旧位置

步骤2 - Last（记录新位置）：
  → 执行 DOM 更新（插入、删除、重排）
  → 对每个子元素再次调用 getBoundingClientRect()
  → 获取每个元素的新位置

步骤3 - Invert（反转）：
  → 计算位置差值：dx = oldLeft - newLeft, dy = oldTop - newTop
  → 通过 style.transform = `translate(${dx}px, ${dy}px)` 将元素"移回"旧位置
  → 此时视觉上元素还在原来的位置

步骤4 - Play（播放）：
  → 强制浏览器回流（读取 offsetHeight）
  → 添加 v-move 类名（包含 transition: transform）
  → 移除 inline transform
  → 浏览器检测到 transform 变化 + transition → 触发过渡动画
  → 元素平滑地从旧位置移动到新位置

  → transitionend 后移除 v-move 类名

为什么 FLIP 性能好？
  → DOM 操作只发生一次（步骤2）
  → 动画使用 transform（GPU 加速，不触发重排）
  → 视觉上是"先记录再动画"，实际是"先移动再补动画"
```

### 与相关API的对比

| 动画方式 | 实现原理 | 性能 | 复杂度 |
|---------|---------|------|--------|
| FLIP (TransitionGroup) | transform + transition | 高（GPU 加速） | Vue 自动处理 |
| 手动改变 top/left | 布局属性 | 低（触发重排） | 需要手动计算 |
| Web Animations API | JS 驱动 | 中 | 需要手动实现 |

### 适用场景

- **列表排序：** 拖拽排序、筛选排序的平滑移动
- **网格重排：** 瀑布流、网格布局的项目移动
- **看板：** Kanban 看板的卡片拖动
- **棋盘游戏：** 棋子移动的动画效果

### 常见问题

#### 移动动画不生效

**解决方案：**

```css
/* 问题1：忘记定义 move 类名 */
/* 必须定义 v-move（或 name-move）类名 */
.list-move {
    transition: transform 0.4s ease;
}

/* 问题2：离开的元素没有绝对定位 */
/* 离开的元素如果不脱离文档流，会阻止其他元素移动 */
.list-leave-active {
    position: absolute; /* 必须有 */
}

/* 问题3：transition 属性写成了 all 而非 transform */
/* move 只需要 transform 的过渡 */
.list-move {
    transition: transform 0.4s ease; /* 推荐只写 transform */
}
```

### 注意事项

- move 类名用于位置变化的元素
- FLIP 使用 transform 动画，性能好（GPU 加速）
- 离开动画必须设置 position: absolute
- move 的 transition 建议只设置 transform
- 大量列表项的 FLIP 可能有性能问题（每个元素都要 getBoundingClientRect）
- FLIP 不支持 display:none 的元素

### 总结

TransitionGroup 的 move 类名配合 FLIP 动画技术实现列表项的平滑位置移动。FLIP 通过记录旧位置、更新 DOM、用 transform 反转回旧位置、再播放过渡到新位置四个步骤实现。使用 transform 动画性能好，不触发重排。离开动画中必须设置 position:absolute 让其他元素能够移动。move 的 transition 建议只设置 transform 属性。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### suspense的异步依赖等待

### 概念说明

`<Suspense>` 是 Vue 3 内置组件，用于协调组件树中异步依赖的加载状态。当 Suspense 的默认插槽中存在异步组件（通过 `defineAsyncComponent` 定义）或使用了 `async setup()` 的组件时，Suspense 会等待所有异步依赖都 resolve 后再显示默认内容，在等待期间显示 `#fallback` 插槽中的内容（如加载指示器）。

Suspense 解决的核心问题是：在包含多个异步组件的页面中，统一管理加载状态。没有 Suspense 时，每个异步组件需要各自管理自己的 loading 状态，导致页面可能出现"逐块加载"的破碎体验。有了 Suspense，整个区域要么全部加载完成要么显示统一的 loading 界面。

Suspense 可以等待两种类型的异步依赖：异步组件（defineAsyncComponent）和带有 async setup 的组件（setup 返回 Promise 或使用了顶层 await）。

### 基本示例

```vue
<!-- App.vue -->
<script setup>
import Dashboard from "./Dashboard.vue"; // 内部有异步依赖
</script>

<template>
    <!-- Suspense 等待 Dashboard 及其子组件的异步依赖 -->
    <Suspense>
        <!-- 默认插槽：异步组件 -->
        <Dashboard />

        <!-- fallback 插槽：加载中显示的内容 -->
        <template #fallback>
            <div class="loading">
                <p>正在加载仪表盘数据...</p>
            </div>
        </template>
    </Suspense>
</template>
```

```vue
<!-- Dashboard.vue：使用 async setup（顶层 await） -->
<script setup>
// 顶层 await 让组件变为异步组件
// Suspense 会等待这个 Promise resolve
const userData = await fetch("/api/user").then((r) => r.json());
const statsData = await fetch("/api/stats").then((r) => r.json());

// 组件会在两个请求都完成后才渲染
</script>

<template>
    <div class="dashboard">
        <h1>欢迎, {{ userData.name }}</h1>
        <div class="stats">
            <p>总访问量: {{ statsData.visits }}</p>
            <p>活跃用户: {{ statsData.activeUsers }}</p>
        </div>
    </div>
</template>
```

```vue
<!-- 嵌套异步组件：Suspense 会等待所有后代异步依赖 -->
<script setup>
import { defineAsyncComponent } from "vue";

// 异步组件
const UserProfile = defineAsyncComponent(() => import("./UserProfile.vue"));
const ActivityFeed = defineAsyncComponent(() => import("./ActivityFeed.vue"));
const Notifications = defineAsyncComponent(() => import("./Notifications.vue"));
</script>

<template>
    <Suspense>
        <div class="page">
            <!-- 三个异步组件，Suspense 等待全部完成 -->
            <UserProfile />
            <ActivityFeed />
            <Notifications />
        </div>

        <template #fallback>
            <p>加载中...</p>
        </template>
    </Suspense>
    <!-- 三个组件全部加载完成后才一起显示 -->
</template>
```

### 内部原理

#### Suspense 的异步依赖收集

```
Suspense 的工作流程：

1. 渲染默认插槽
   → 开始渲染默认插槽中的组件树
   → 遇到异步组件或 async setup → 注册为"异步依赖"
   → 暂停默认插槽的渲染

2. 显示 fallback
   → 所有异步依赖注册完成后
   → 如果存在未 resolve 的依赖
   → 渲染并显示 #fallback 插槽内容

3. 等待 resolve
   → 每个异步依赖 resolve 时通知 Suspense
   → Suspense 检查是否所有依赖都已 resolve

4. 切换到默认内容
   → 所有依赖 resolve 后
   → 卸载 fallback 内容
   → 显示默认插槽内容
   → 触发 @resolve 事件

异步依赖的类型：
  1. defineAsyncComponent → 组件定义本身是异步加载的
  2. async setup() → 组件的 setup 返回 Promise
  3. <script setup> 中的顶层 await → 编译为 async setup
```

### 与相关API的对比

| 特性 | Suspense | 手动 loading 状态 |
|------|---------|------------------|
| 管理粒度 | 区域级别 | 组件级别 |
| 代码量 | 少（声明式） | 多（每个组件单独管理） |
| 统一加载体验 | 自动 | 需要手动协调 |
| 嵌套异步 | 自动收集 | 需要 Promise.all |
| 错误处理 | onErrorCaptured | try/catch |

### 适用场景

- **数据驱动页面：** 页面依赖多个 API 数据
- **异步组件：** 路由懒加载、条件加载的组件
- **仪表盘：** 多个面板各自异步加载数据
- **配合路由：** RouterView + Suspense 统一页面加载状态

### 常见问题

#### Suspense 配合 RouterView 使用

**解决方案：**

```vue
<template>
    <RouterView v-slot="{ Component }">
        <template v-if="Component">
            <Suspense>
                <component :is="Component" />

                <template #fallback>
                    <div class="page-loading">页面加载中...</div>
                </template>
            </Suspense>
        </template>
    </RouterView>
</template>
```

### 注意事项

- Suspense 目前仍是实验性功能，API 可能变化
- 默认插槽只能有一个直接根节点
- Suspense 会等待所有后代异步依赖（不只是直接子组件）
- async setup 中的错误需要通过 onErrorCaptured 捕获
- 可以配合 Transition 和 KeepAlive 一起使用
- 嵌套 Suspense 时，内层优先处理自己范围内的异步依赖

### 总结

Suspense 统一管理组件树中的异步依赖加载状态。在所有异步组件和 async setup 都 resolve 之前显示 fallback 内容，全部完成后切换到默认内容。适合多个异步组件组成的页面，避免逐块加载的破碎体验。支持嵌套使用，可以配合 RouterView、Transition、KeepAlive 组合使用。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### suspense的fallback插槽

### 概念说明

`<Suspense>` 的 `#fallback` 插槽用于定义在异步依赖加载期间显示的占位内容。当默认插槽中的异步组件或 async setup 尚未 resolve 时，Suspense 会渲染 fallback 插槽的内容，给用户一个视觉反馈表示"正在加载"。

fallback 插槽中可以放置任何内容：简单的文字提示、加载动画（Spinner）、骨架屏（Skeleton）等。fallback 在所有异步依赖 resolve 后会被卸载，替换为默认插槽的真实内容。

Suspense 有一个 `timeout` 属性（实验性），可以控制延迟多少毫秒后才显示 fallback。如果异步依赖在 timeout 时间内就 resolve 了，则 fallback 根本不会显示，避免了短暂闪烁。

### 基本示例

```vue
<script setup>
import { defineAsyncComponent } from "vue";

const HeavyChart = defineAsyncComponent(() => import("./HeavyChart.vue"));
</script>

<template>
    <!-- 基本的 fallback 用法 -->
    <Suspense>
        <HeavyChart />

        <template #fallback>
            <div class="loading-state">
                <div class="spinner"></div>
                <p>图表加载中，请稍候...</p>
            </div>
        </template>
    </Suspense>
</template>

<style>
.loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px;
    color: #666;
}

/* 简单的 CSS 旋转加载动画 */
.spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #42b883;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 12px;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}
</style>
```

```vue
<!-- 骨架屏作为 fallback -->
<template>
    <Suspense>
        <UserProfile />

        <template #fallback>
            <!-- 骨架屏：模拟真实内容的布局 -->
            <div class="skeleton">
                <div class="skeleton-avatar"></div>
                <div class="skeleton-line skeleton-name"></div>
                <div class="skeleton-line skeleton-bio"></div>
                <div class="skeleton-line skeleton-bio short"></div>
            </div>
        </template>
    </Suspense>
</template>

<style>
.skeleton {
    padding: 20px;
}
.skeleton-avatar {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: #e0e0e0;
    margin-bottom: 12px;
}
.skeleton-line {
    height: 14px;
    background: #e0e0e0;
    border-radius: 4px;
    margin-bottom: 8px;
}
.skeleton-name { width: 120px; height: 18px; }
.skeleton-bio { width: 100%; }
.skeleton-bio.short { width: 60%; }
</style>
```

### 内部原理

#### fallback 的渲染和切换时机

```
Suspense 的 fallback 渲染流程：

初始加载：
  1. Suspense 开始渲染默认插槽
  2. 发现异步依赖 → 暂停默认插槽渲染
  3. 渲染 #fallback 插槽内容并显示
  4. 异步依赖 resolve → 卸载 fallback → 显示默认内容

已加载后的更新（已有内容，依赖变化）：
  1. Suspense 已经显示了默认内容
  2. 某个异步依赖重新变为 pending
  3. 默认行为：保持显示旧的默认内容（不切回 fallback）
  4. 这避免了页面闪烁

timeout 属性（实验性）：
  → 设置延迟时间（毫秒）
  → 在 timeout 时间内 resolve → 不显示 fallback
  → 超过 timeout 才显示 fallback
  → 避免快速加载时的闪烁
```

### 与相关API的对比

| fallback 内容 | 优点 | 缺点 | 适用场景 |
|--------------|------|------|---------|
| 文字提示 | 简单 | 体验一般 | 简单页面 |
| Spinner 动画 | 直观 | 不展示布局 | 通用 |
| 骨架屏 | 体验好 | 需要额外开发 | 重要页面 |
| 进度条 | 有进度感 | 需要进度数据 | 文件加载 |

### 适用场景

- **页面加载：** 整页的加载状态
- **区域加载：** 页面某个区域的异步内容
- **路由切换：** 页面切换时的过渡加载状态
- **数据依赖：** 组件依赖异步数据才能渲染

### 常见问题

#### fallback 闪烁问题

**解决方案：**

```vue
<template>
    <!-- 问题：网络很快时 fallback 一闪而过 -->
    <!-- 方案1：CSS 延迟显示 -->
    <Suspense>
        <AsyncContent />
        <template #fallback>
            <div class="delayed-fallback">
                <p>加载中...</p>
            </div>
        </template>
    </Suspense>
</template>

<style>
/* CSS 延迟：200ms 内加载完就不显示 fallback */
.delayed-fallback {
    animation: delayed-show 0.2s forwards;
    opacity: 0;
}
@keyframes delayed-show {
    0%, 99% { opacity: 0; }
    100% { opacity: 1; }
}
</style>
```

### 注意事项

- fallback 是可选的，但强烈建议提供
- 不提供 fallback 时异步加载期间什么都不显示
- 骨架屏是用户体验最好的 fallback 方案
- 已加载的内容重新 pending 时默认不切回 fallback
- fallback 中不要放异步组件（会造成无限等待）
- Suspense 目前仍是实验性功能

### 总结

Suspense 的 #fallback 插槽定义异步加载期间的占位内容，在所有异步依赖 resolve 后被替换为真实内容。支持文字、Spinner、骨架屏等各种形式。骨架屏提供最好的用户体验。已加载内容重新 pending 时默认保持显示旧内容不切回 fallback。可以通过 CSS 延迟动画避免快速加载时的闪烁。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### suspense的resolve与reject处理

### 概念说明

`<Suspense>` 提供了事件来监听异步依赖的解析结果。当所有异步依赖成功 resolve 时，Suspense 触发 `@resolve` 事件；当某个异步依赖 reject（抛出错误）时，需要通过 `onErrorCaptured` 生命周期钩子在父组件中捕获错误。

Suspense 本身没有直接的 `@reject` 或 `@error` 事件，错误处理依赖 Vue 的错误捕获机制。async setup 中未被 try/catch 捕获的异常、defineAsyncComponent 加载失败的异常，都会沿着组件树向上传播，可以被祖先组件的 `onErrorCaptured` 捕获。

Suspense 还提供 `@pending` 和 `@fallback` 事件。`@pending` 在进入挂起状态时触发，`@fallback` 在 fallback 内容显示时触发。这些事件可以用于记录日志、上报监控等。

### 基本示例

```vue
<!-- 父组件：处理 Suspense 的 resolve 和 reject -->
<script setup>
import { ref, onErrorCaptured } from "vue";
import AsyncPage from "./AsyncPage.vue";

const error = ref(null);
const isResolved = ref(false);

// 捕获子组件（包括 Suspense 内部）的错误
onErrorCaptured((err, instance, info) => {
    error.value = err;
    // 返回 false 阻止错误继续向上传播
    return false;
});

function handleResolve() {
    isResolved.value = true;
    console.log("所有异步依赖已加载完成");
}

function handlePending() {
    isResolved.value = false;
    console.log("进入加载状态");
}

function retry() {
    error.value = null;
    // 通过 key 强制重新渲染 Suspense
    suspenseKey.value++;
}

const suspenseKey = ref(0);
</script>

<template>
    <!-- 错误状态：显示错误信息 -->
    <div v-if="error" class="error-state">
        <p>加载失败: {{ error.message }}</p>
        <button @click="retry">重试</button>
    </div>

    <!-- 正常状态：Suspense 处理异步加载 -->
    <Suspense
        v-else
        :key="suspenseKey"
        @resolve="handleResolve"
        @pending="handlePending"
    >
        <AsyncPage />

        <template #fallback>
            <div class="loading">加载中...</div>
        </template>
    </Suspense>
</template>
```

```vue
<!-- AsyncPage.vue：可能成功也可能失败 -->
<script setup>
// 顶层 await：如果请求失败，错误会传播到 Suspense 的父组件
const response = await fetch("/api/page-data");

if (!response.ok) {
    // 抛出错误 → 被父组件的 onErrorCaptured 捕获
    throw new Error(`请求失败: ${response.status}`);
}

const data = await response.json();
</script>

<template>
    <div>
        <h1>{{ data.title }}</h1>
        <p>{{ data.content }}</p>
    </div>
</template>
```

```vue
<!-- 带有内部错误处理的异步组件 -->
<script setup>
import { ref } from "vue";

const data = ref(null);
const loadError = ref(null);

try {
    const res = await fetch("/api/data");
    data.value = await res.json();
} catch (err) {
    // 内部捕获错误：不会传播到 Suspense 父组件
    // Suspense 会正常 resolve（因为 setup 没有抛出未捕获的错误）
    loadError.value = err.message;
}
</script>

<template>
    <div v-if="loadError" class="inline-error">
        <p>数据加载失败: {{ loadError }}</p>
    </div>
    <div v-else>
        <p>{{ data.title }}</p>
    </div>
</template>
```

### 内部原理

#### Suspense 的状态流转

```
Suspense 的生命周期和事件：

初始加载：
  [pending] → 渲染默认插槽 → 发现异步依赖
    ↓ @pending 事件
  [fallback] → 显示 fallback 内容
    ↓ @fallback 事件
  等待异步依赖...
    ↓
  全部 resolve → [resolved]
    ↓ @resolve 事件
  显示默认内容

  某个 reject → 错误沿组件树传播
    ↓ onErrorCaptured 捕获
  父组件自行处理错误状态

错误传播路径：
  async setup 抛出错误
    → Suspense 内部捕获
    → 触发 Vue 的错误处理机制
    → 沿组件树向上传播
    → 被最近的 onErrorCaptured 捕获
    → 如果没有被捕获 → 到达全局错误处理器 app.config.errorHandler

重试机制：
  → 没有内置重试功能
  → 通过改变 Suspense 的 :key 强制重新渲染
  → key 变化 → Suspense 完全重建 → 重新触发异步加载
```

### 与相关API的对比

| 事件/钩子 | 触发时机 | 用途 |
|----------|---------|------|
| @pending | 进入挂起状态 | 记录开始加载 |
| @fallback | fallback 开始显示 | 记录 fallback 时机 |
| @resolve | 所有依赖 resolve | 记录加载完成 |
| onErrorCaptured | 异步依赖 reject | 错误处理和展示 |

### 适用场景

- **错误边界：** 捕获异步加载错误，显示友好的错误页面
- **重试机制：** 加载失败后提供重试按钮
- **加载监控：** 通过事件记录加载时间和状态
- **降级处理：** 加载失败时显示缓存内容或默认内容

### 常见问题

#### 实现重试功能

**解决方案：**

```vue
<script setup>
import { ref, onErrorCaptured } from "vue";

const error = ref(null);
const retryCount = ref(0);

onErrorCaptured((err) => {
    error.value = err;
    return false;
});

function retry() {
    error.value = null;
    retryCount.value++; // key 变化触发 Suspense 重建
}
</script>

<template>
    <div v-if="error">
        <p>出错了: {{ error.message }}</p>
        <button @click="retry">重试</button>
    </div>

    <!-- key 变化 → Suspense 重建 → 重新加载 -->
    <Suspense v-else :key="retryCount">
        <AsyncContent />
        <template #fallback>
            <p>加载中...</p>
        </template>
    </Suspense>
</template>
```

### 注意事项

- Suspense 没有直接的 @error 事件
- 错误处理依赖 onErrorCaptured 或 app.config.errorHandler
- async setup 中未捕获的错误会传播到父组件
- 内部 try/catch 捕获的错误不会传播
- 重试通过改变 :key 强制 Suspense 重建
- Suspense 仍是实验性功能，事件 API 可能变化

### 总结

Suspense 通过 @resolve 事件通知异步依赖全部成功加载，通过 @pending 和 @fallback 事件跟踪加载状态。错误处理没有专门的事件，依赖 onErrorCaptured 钩子捕获异步依赖 reject 的错误。重试功能通过改变 Suspense 的 :key 强制重建实现。async setup 中建议对关键请求使用 try/catch，让组件内部处理错误状态。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。



## 7.7 生命周期钩子

### onBeforeMount的挂载前钩子

### 概念说明

`onBeforeMount` 是 Vue 3 Composition API 提供的生命周期钩子，在组件即将首次挂载到 DOM 之前调用。此时组件的响应式状态已经设置完成（setup 已执行），但还没有创建任何 DOM 节点。

在 onBeforeMount 执行时，组件的渲染函数还没有被调用，模板还没有编译为 VNode，真实 DOM 也不存在。因此在这个钩子中无法访问 DOM 元素（template ref 为 null）。

onBeforeMount 的使用场景相对有限，因为大多数初始化逻辑可以直接放在 setup 中执行，而需要 DOM 的操作应该放在 onMounted 中。onBeforeMount 主要用于需要在渲染前执行某些同步操作的场景，比如在 SSR 中这个钩子也会被调用（而 onMounted 不会）。

### 基本示例

```vue
<script setup>
import { ref, onBeforeMount, onMounted } from "vue";

const containerRef = ref(null);
const startTime = ref(0);

// setup 阶段：响应式状态初始化
console.log("setup 执行");

onBeforeMount(() => {
    // 挂载前：DOM 还不存在
    console.log("onBeforeMount 执行");
    console.log("DOM ref:", containerRef.value); // null
    
    // 记录挂载开始时间
    startTime.value = performance.now();
});

onMounted(() => {
    // 挂载后：DOM 已存在
    console.log("onMounted 执行");
    console.log("DOM ref:", containerRef.value); // <div> 元素
    
    // 计算挂载耗时
    const mountTime = performance.now() - startTime.value;
    console.log(`挂载耗时: ${mountTime.toFixed(2)}ms`);
});

// 执行顺序：setup → onBeforeMount → onMounted
</script>

<template>
    <div ref="containerRef">
        <p>组件内容</p>
    </div>
</template>
```

### 内部原理

#### onBeforeMount 在组件生命周期中的位置

```
组件挂载的完整流程：

1. 创建组件实例
2. 执行 setup()（初始化响应式状态、注册钩子）
3. ▶ onBeforeMount 钩子执行
4. 调用渲染函数，生成 VNode 树
5. 将 VNode 树转为真实 DOM
6. 将 DOM 插入页面
7. ▶ onMounted 钩子执行

onBeforeMount 时的状态：
  → setup 已完成 ✓
  → 响应式数据可用 ✓
  → computed/watch 已注册 ✓
  → 渲染函数未执行 ✗
  → DOM 不存在 ✗
  → template ref 为 null ✗
```

### 与相关API的对比

| 钩子 | DOM 状态 | SSR 调用 | 常见用途 |
|------|---------|---------|---------|
| setup | 不存在 | 是 | 初始化状态 |
| onBeforeMount | 不存在 | 是 | 挂载前准备 |
| onMounted | 已存在 | 否 | DOM 操作、数据请求 |

### 适用场景

- **挂载计时：** 记录挂载开始时间
- **SSR 兼容逻辑：** 需要在服务端和客户端都执行的代码
- **同步准备工作：** 在渲染前设置某些同步状态

### 常见问题

#### onBeforeMount 中能否访问 DOM

**解决方案：**

```vue
<script setup>
import { ref, onBeforeMount, onMounted } from "vue";

const el = ref(null);

onBeforeMount(() => {
    // 不能访问 DOM
    console.log(el.value); // null
    // 需要 DOM 的操作放到 onMounted
});

onMounted(() => {
    // 可以访问 DOM
    console.log(el.value); // HTMLElement
});
</script>

<template>
    <div ref="el">内容</div>
</template>
```

### 注意事项

- onBeforeMount 中无法访问 DOM
- 在 SSR 中会被调用（onMounted 不会）
- 大多数场景下直接用 setup 或 onMounted 即可
- 同一组件中可以多次调用 onBeforeMount（注册多个回调）
- Options API 对应 `beforeMount` 选项
- 不要在此钩子中进行异步操作后期望 DOM 存在

### 总结

onBeforeMount 在组件首次挂载到 DOM 之前执行，此时响应式状态已就绪但 DOM 尚未创建。适合挂载前的同步准备工作和 SSR 兼容逻辑。大多数场景下，初始化逻辑放在 setup 中，DOM 操作放在 onMounted 中，onBeforeMount 的使用频率较低。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### onMounted的挂载完成钩子

### 概念说明

`onMounted` 是 Vue 3 中最常用的生命周期钩子之一，在组件首次挂载到 DOM 之后调用。此时组件的所有同步子组件都已挂载完成，真实 DOM 已经插入页面，template ref 可以正常访问。

onMounted 是执行需要 DOM 的操作的最佳时机：初始化第三方库（如 ECharts、地图）、获取元素尺寸、绑定 DOM 事件、发起数据请求等。在 SSR 场景中，onMounted 只在客户端执行，不会在服务端调用。

需要注意的是，onMounted 保证所有同步子组件都已挂载，但不保证异步组件（defineAsyncComponent）已加载完成。如果需要等待整个组件树（包括异步组件）都渲染完毕，可以在 onMounted 中使用 `nextTick`。

### 基本示例

```vue
<script setup>
import { ref, onMounted, nextTick } from "vue";

const chartRef = ref(null);
const userData = ref(null);
const containerWidth = ref(0);

onMounted(() => {
    // 1. 访问 DOM 元素
    console.log("图表容器:", chartRef.value); // HTMLDivElement

    // 2. 获取元素尺寸
    containerWidth.value = chartRef.value.offsetWidth;

    // 3. 初始化第三方库（需要 DOM 存在）
    initChart();

    // 4. 发起数据请求
    fetchUserData();
});

onMounted(async () => {
    // 可以注册多个 onMounted 回调，按注册顺序执行
    // 等待所有子组件渲染完成（包括异步更新）
    await nextTick();
    console.log("所有子组件渲染完成");
});

function initChart() {
    // 初始化 ECharts 等第三方图表库
    // const chart = echarts.init(chartRef.value);
    // chart.setOption({ ... });
}

async function fetchUserData() {
    const res = await fetch("/api/user");
    userData.value = await res.json();
}
</script>

<template>
    <div ref="chartRef" class="chart-container">
        <!-- 图表渲染区域 -->
    </div>
    <div v-if="userData">
        <p>{{ userData.name }}</p>
    </div>
</template>
```

### 内部原理

#### onMounted 的执行时机

```
组件挂载流程中 onMounted 的位置：

父子组件的挂载顺序（同步子组件）：
  父 setup → 父 onBeforeMount
    → 子 setup → 子 onBeforeMount → 子 onMounted
  → 父 onMounted

即：子组件先 mounted，父组件后 mounted
→ 父组件的 onMounted 执行时，所有同步子组件已挂载完成

onMounted 时的状态：
  → setup 已完成 ✓
  → 渲染函数已执行 ✓
  → 真实 DOM 已插入页面 ✓
  → template ref 可访问 ✓
  → 所有同步子组件已挂载 ✓
  → 异步子组件可能未完成 ✗（需要 Suspense）
```

### 与相关API的对比

| 钩子 | DOM 可用 | SSR 执行 | 执行次数 |
|------|---------|---------|---------|
| setup | 否 | 是 | 1次 |
| onBeforeMount | 否 | 是 | 1次 |
| onMounted | 是 | 否 | 1次 |
| onUpdated | 是 | 否 | 多次 |

### 适用场景

- **DOM 操作：** 获取尺寸、设置焦点、滚动到指定位置
- **第三方库初始化：** ECharts、地图、富文本编辑器
- **数据请求：** 组件挂载后立即加载数据
- **事件监听：** 绑定 window/document 级别的事件

### 常见问题

#### onMounted 中绑定事件需要在卸载时清理

**解决方案：**

```vue
<script setup>
import { onMounted, onUnmounted } from "vue";

function handleResize() {
    console.log("窗口大小变化");
}

onMounted(() => {
    // 挂载时绑定事件
    window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
    // 卸载时清理事件，防止内存泄漏
    window.removeEventListener("resize", handleResize);
});
</script>
```

### 注意事项

- onMounted 只在客户端执行，SSR 中不调用
- 子组件先 mounted，父组件后 mounted
- 可以多次调用 onMounted 注册多个回调
- onMounted 中绑定的事件/定时器需要在 onUnmounted 中清理
- 异步子组件不保证在 onMounted 时已完成
- Options API 对应 `mounted` 选项

### 总结

onMounted 在组件 DOM 挂载完成后执行，是进行 DOM 操作、初始化第三方库、发起数据请求的最佳时机。所有同步子组件在父组件 onMounted 前已挂载完成。SSR 中不执行。挂载时绑定的事件和定时器需要在 onUnmounted 中清理。可以注册多个回调，按注册顺序执行。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### onBeforeUpdate的更新前钩子

### 概念说明

`onBeforeUpdate` 在组件因响应式数据变化即将重新渲染之前调用。此时响应式数据已经是最新的值，但 DOM 还未更新——DOM 仍然反映的是旧数据对应的状态。这个钩子提供了一个在 DOM 更新前访问旧 DOM 状态的机会。

onBeforeUpdate 只在组件首次挂载之后的更新中触发，首次渲染不会触发。如果组件挂载后数据从未变化（没有触发重新渲染），这个钩子也不会被调用。

常见用途是在 DOM 更新前保存某些 DOM 状态（如滚动位置），以便在 onUpdated 中恢复。

### 基本示例

```vue
<script setup>
import { ref, onBeforeUpdate, onUpdated } from "vue";

const count = ref(0);
const listRef = ref(null);
let savedScrollTop = 0;

onBeforeUpdate(() => {
    // DOM 还是旧的状态
    console.log("onBeforeUpdate - count:", count.value); // 新值
    console.log("DOM 文本:", listRef.value?.textContent); // 旧的 DOM 内容

    // 保存滚动位置（DOM 更新后可能变化）
    if (listRef.value) {
        savedScrollTop = listRef.value.scrollTop;
    }
});

onUpdated(() => {
    // DOM 已更新为新状态
    console.log("onUpdated - DOM 已更新");

    // 恢复滚动位置
    if (listRef.value) {
        listRef.value.scrollTop = savedScrollTop;
    }
});
</script>

<template>
    <button @click="count++">计数: {{ count }}</button>
    <div ref="listRef" style="height: 200px; overflow: auto;">
        <p v-for="i in count" :key="i">项目 {{ i }}</p>
    </div>
</template>
```

### 内部原理

#### onBeforeUpdate 的执行时机

```
更新流程中 onBeforeUpdate 的位置：

1. 响应式数据变化（如 count.value++）
2. 触发组件的更新调度
3. ▶ onBeforeUpdate 钩子执行
   → 此时数据是新值，DOM 是旧状态
4. 调用渲染函数，生成新的 VNode 树
5. Patch 新旧 VNode，更新 DOM
6. ▶ onUpdated 钩子执行
   → 此时数据和 DOM 都是新状态

onBeforeUpdate 时的状态：
  → 响应式数据：新值 ✓
  → DOM：旧状态 ✓
  → 可以读取旧 DOM 信息
```

### 与相关API的对比

| 钩子 | 数据状态 | DOM 状态 | 触发时机 |
|------|---------|---------|---------|
| onBeforeUpdate | 新值 | 旧 DOM | 更新前 |
| onUpdated | 新值 | 新 DOM | 更新后 |

### 适用场景

- **保存滚动位置：** 更新前记录，更新后恢复
- **记录旧 DOM 尺寸：** 用于计算布局变化
- **调试：** 观察数据变化和 DOM 更新的时序

### 常见问题

#### 不要在 onBeforeUpdate 中修改响应式数据

**解决方案：**

```vue
<script setup>
import { ref, onBeforeUpdate } from "vue";

const count = ref(0);

onBeforeUpdate(() => {
    // 不要这样做：会导致无限更新循环
    // count.value++;

    // 正确：只读取状态，不修改
    console.log("即将更新，当前值:", count.value);
});
</script>
```

### 注意事项

- 首次挂载不触发，只在后续更新时触发
- 此时数据是新值，DOM 是旧状态
- 不要在此钩子中修改响应式数据（可能导致无限循环）
- 适合保存旧 DOM 状态（滚动位置、元素尺寸等）
- Options API 对应 `beforeUpdate` 选项
- SSR 中不会调用

### 总结

onBeforeUpdate 在组件 DOM 更新前执行，此时响应式数据已是新值但 DOM 仍是旧状态。适合在 DOM 更新前保存旧的 DOM 状态（如滚动位置），配合 onUpdated 恢复。首次挂载不触发。不要在此钩子中修改响应式数据。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### onUpdated的更新完成钩子

### 概念说明

`onUpdated` 在组件因响应式数据变化导致 DOM 更新完成后调用。此时数据和 DOM 都已经是最新状态，可以安全地执行依赖于更新后 DOM 的操作。

onUpdated 会在组件的任何 DOM 更新后触发，不仅仅是某个特定数据变化。如果需要在特定数据变化后访问更新的 DOM，应该使用 `nextTick()` 而不是 onUpdated。

与 onBeforeUpdate 一样，onUpdated 不在首次挂载时触发，只在后续更新时触发。父组件的 onUpdated 在子组件的 onUpdated 之后调用。

### 基本示例

```vue
<script setup>
import { ref, onUpdated, nextTick } from "vue";

const messages = ref(["消息1", "消息2"]);
const listRef = ref(null);

// onUpdated：任何数据变化导致的 DOM 更新后触发
onUpdated(() => {
    // DOM 已更新，可以安全操作
    // 自动滚动到底部（聊天消息列表）
    if (listRef.value) {
        listRef.value.scrollTop = listRef.value.scrollHeight;
    }
});

function addMessage() {
    messages.value.push(`消息${messages.value.length + 1}`);
}

// 如果只关心特定数据变化后的 DOM，用 nextTick 更精确
async function addAndScroll() {
    messages.value.push(`消息${messages.value.length + 1}`);
    // nextTick：等待这次数据变化引起的 DOM 更新完成
    await nextTick();
    if (listRef.value) {
        listRef.value.scrollTop = listRef.value.scrollHeight;
    }
}
</script>

<template>
    <div ref="listRef" style="height: 200px; overflow: auto;">
        <p v-for="(msg, i) in messages" :key="i">{{ msg }}</p>
    </div>
    <button @click="addMessage">添加消息</button>
</template>
```

### 内部原理

#### onUpdated 的执行顺序

```
父子组件更新的 onUpdated 执行顺序：

子组件数据变化触发更新：
  子 onBeforeUpdate → 子 DOM 更新 → 子 onUpdated

父组件数据变化触发更新（影响子组件）：
  父 onBeforeUpdate
    → 子 onBeforeUpdate → 子 DOM 更新 → 子 onUpdated
  → 父 DOM 更新 → 父 onUpdated

即：子组件先 updated，父组件后 updated
（与 mounted 的顺序一致：由内到外）
```

### 与相关API的对比

| 方式 | 触发条件 | 粒度 | 推荐场景 |
|------|---------|------|---------|
| onUpdated | 任何数据变化 | 组件级 | 通用 DOM 更新后操作 |
| nextTick | 当前数据变化 | 单次 | 特定数据变化后操作 |
| watch + flush:'post' | 指定数据变化 | 精确 | 监听特定数据更新 DOM |

### 适用场景

- **自动滚动：** 消息列表、日志面板自动滚到底部
- **DOM 测量：** 更新后重新获取元素尺寸
- **第三方库同步：** 数据变化后更新图表等第三方库

### 常见问题

#### 不要在 onUpdated 中修改导致更新的数据

**解决方案：**

```vue
<script setup>
import { ref, onUpdated } from "vue";

const count = ref(0);

onUpdated(() => {
    // 危险：修改数据会触发新的更新 → 再次触发 onUpdated → 无限循环
    // count.value++;

    // 安全：只读取 DOM 状态
    console.log("DOM 已更新");
});
</script>
```

### 注意事项

- 首次挂载不触发，只在后续更新时触发
- 任何响应式数据变化导致的更新都会触发
- 不要修改触发更新的响应式数据（无限循环）
- 子组件先 updated，父组件后 updated
- 精确控制建议用 nextTick 或 watch flush:'post'
- Options API 对应 `updated` 选项

### 总结

onUpdated 在组件 DOM 更新完成后执行，此时数据和 DOM 都是最新状态。适合自动滚动、DOM 测量等操作。任何数据变化都会触发，如果只关心特定数据，推荐使用 nextTick 或 watch flush:'post'。不要在此钩子中修改导致更新的数据。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### onBeforeUnmount的卸载前钩子

### 概念说明

`onBeforeUnmount` 在组件即将被卸载之前调用。此时组件实例仍然完全可用——DOM 还在页面中，响应式数据正常，template ref 可以访问，事件监听器仍然存在。这个钩子适合执行需要在组件还"活着"时完成的清理工作。

与 onUnmounted 的区别在于：onBeforeUnmount 时 DOM 还在，onUnmounted 时 DOM 已被移除。如果清理操作需要访问 DOM（如获取元素位置用于动画），应该在 onBeforeUnmount 中执行。

### 基本示例

```vue
<script setup>
import { ref, onBeforeUnmount, onUnmounted } from "vue";

const inputRef = ref(null);

onBeforeUnmount(() => {
    // DOM 还在，可以访问
    console.log("onBeforeUnmount");
    console.log("DOM ref:", inputRef.value); // HTMLElement（还存在）

    // 保存当前输入值到 localStorage（DOM 还可以访问）
    if (inputRef.value) {
        localStorage.setItem("draft", inputRef.value.value);
    }
});

onUnmounted(() => {
    // DOM 已被移除
    console.log("onUnmounted");
    console.log("DOM ref:", inputRef.value); // null
});
</script>

<template>
    <input ref="inputRef" placeholder="输入内容..." />
</template>
```

### 内部原理

#### onBeforeUnmount 的执行时机

```
组件卸载流程：

1. 触发卸载（v-if 变为 false、路由切换等）
2. ▶ onBeforeUnmount 钩子执行
   → DOM 还在页面中 ✓
   → 组件实例完全可用 ✓
   → template ref 可访问 ✓
3. 卸载所有子组件
4. 移除 DOM 节点
5. 清理响应式效果
6. ▶ onUnmounted 钩子执行
   → DOM 已被移除 ✗
   → template ref 为 null ✗

父子组件卸载顺序：
  父 onBeforeUnmount → 子 onBeforeUnmount → 子 onUnmounted → 父 onUnmounted
```

### 与相关API的对比

| 钩子 | DOM 状态 | 组件状态 | 适合的操作 |
|------|---------|---------|-----------|
| onBeforeUnmount | 存在 | 完全可用 | 需要 DOM 的清理 |
| onUnmounted | 已移除 | 清理中 | 不需要 DOM 的清理 |

### 适用场景

- **保存 DOM 状态：** 保存滚动位置、输入内容等
- **动画准备：** 获取元素位置用于离开动画
- **同步清理：** 需要在 DOM 存在时完成的操作

### 常见问题

#### 选择 onBeforeUnmount 还是 onUnmounted

**解决方案：**

```vue
<script setup>
import { onBeforeUnmount, onUnmounted } from "vue";

// 需要 DOM → onBeforeUnmount
onBeforeUnmount(() => {
    // 保存滚动位置（需要 DOM）
    const scrollTop = document.querySelector(".list").scrollTop;
    sessionStorage.setItem("scrollPos", scrollTop);
});

// 不需要 DOM → onUnmounted
onUnmounted(() => {
    // 清除定时器（不需要 DOM）
    clearInterval(timer);
    // 取消请求（不需要 DOM）
    abortController.abort();
});
</script>
```

### 注意事项

- onBeforeUnmount 时 DOM 仍在页面中
- 适合需要 DOM 的清理操作
- 父组件先触发 onBeforeUnmount，子组件后触发
- 不需要 DOM 的清理放在 onUnmounted 更安全
- Options API 对应 `beforeUnmount` 选项
- KeepAlive 缓存的组件不触发此钩子（触发 deactivated）

### 总结

onBeforeUnmount 在组件卸载前执行，此时 DOM 和组件实例都完全可用。适合保存 DOM 状态、执行需要 DOM 的清理等操作。父组件先触发，子组件后触发。不需要 DOM 的清理操作建议放在 onUnmounted 中。KeepAlive 缓存的组件不触发此钩子。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### onUnmounted的卸载完成钩子

### 概念说明

`onUnmounted` 在组件被卸载完成后调用。此时组件的 DOM 已从页面中移除，所有响应式效果（watch、computed）已停止，所有子组件也已卸载。这是执行最终清理工作的时机——清除定时器、取消网络请求、移除全局事件监听、断开 WebSocket 连接等。

onUnmounted 是防止内存泄漏的关键钩子。如果在 onMounted 或 setup 中创建了定时器、事件监听、订阅等副作用，必须在 onUnmounted 中清理，否则组件被销毁后这些副作用仍然在运行，造成内存泄漏和意外行为。

### 基本示例

```vue
<script setup>
import { ref, onMounted, onUnmounted } from "vue";

const data = ref(null);
let timer = null;
let abortController = null;

onMounted(() => {
    // 定时器
    timer = setInterval(() => {
        console.log("定时任务执行中...");
    }, 5000);

    // 事件监听
    window.addEventListener("resize", handleResize);

    // 可取消的请求
    abortController = new AbortController();
    fetch("/api/data", { signal: abortController.signal })
        .then((r) => r.json())
        .then((d) => (data.value = d))
        .catch((e) => {
            if (e.name !== "AbortError") console.error(e);
        });
});

onUnmounted(() => {
    // 清除定时器
    if (timer) {
        clearInterval(timer);
        timer = null;
    }

    // 移除事件监听
    window.removeEventListener("resize", handleResize);

    // 取消未完成的请求
    if (abortController) {
        abortController.abort();
    }

    console.log("组件已卸载，所有副作用已清理");
});

function handleResize() {
    console.log("窗口大小:", window.innerWidth);
}
</script>

<template>
    <div v-if="data">{{ data }}</div>
</template>
```

### 内部原理

#### onUnmounted 的执行时机

```
组件卸载完成后的状态：

onUnmounted 执行时：
  → DOM 已从页面移除 ✗
  → template ref 为 null ✗
  → 响应式效果已停止 ✗
  → 子组件已卸载 ✓（子先卸载）
  → 组件实例仍可访问局部变量 ✓

需要清理的副作用类型：
  → setInterval / setTimeout
  → addEventListener (window/document 级别)
  → WebSocket 连接
  → EventSource / SSE 连接
  → AbortController（取消请求）
  → 第三方库实例（图表、地图、编辑器）
  → MutationObserver / ResizeObserver / IntersectionObserver
  → BroadcastChannel
```

### 与相关API的对比

| 副作用创建 | 清理位置 | 说明 |
|-----------|---------|------|
| onMounted 中的 addEventListener | onUnmounted | 必须清理 |
| onMounted 中的 setInterval | onUnmounted | 必须清理 |
| setup 中的 watch | 自动清理 | Vue 自动处理 |
| setup 中的 computed | 自动清理 | Vue 自动处理 |

### 适用场景

- **定时器清理：** clearInterval、clearTimeout
- **事件解绑：** removeEventListener
- **请求取消：** AbortController.abort()
- **第三方库销毁：** chart.dispose()、editor.destroy()
- **连接断开：** WebSocket.close()

### 常见问题

#### 忘记清理导致内存泄漏

**解决方案：**

```vue
<script setup>
import { onMounted, onUnmounted } from "vue";

// 推荐模式：创建和清理配对
const cleanups = [];

onMounted(() => {
    // 每个副作用都记录清理函数
    const timer = setInterval(() => {}, 5000);
    cleanups.push(() => clearInterval(timer));

    const handler = () => {};
    window.addEventListener("scroll", handler);
    cleanups.push(() => window.removeEventListener("scroll", handler));
});

onUnmounted(() => {
    // 统一执行所有清理
    cleanups.forEach((fn) => fn());
});
</script>
```

### 注意事项

- onUnmounted 时 DOM 已不存在
- Vue 自动清理 watch 和 computed，不需要手动处理
- 手动创建的副作用（定时器、事件、连接）必须手动清理
- KeepAlive 缓存的组件不触发此钩子（触发 deactivated）
- 子组件先 unmounted，父组件后 unmounted
- Options API 对应 `unmounted` 选项

### 总结

onUnmounted 在组件卸载完成后执行，是清理手动创建的副作用的最终时机。定时器、事件监听、网络连接、第三方库实例等必须在此清理，防止内存泄漏。Vue 自动管理的响应式效果（watch、computed）不需要手动清理。KeepAlive 缓存的组件不触发此钩子。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### onErrorCaptured的错误捕获钩子

### 概念说明

`onErrorCaptured` 在捕获到后代组件传递的错误时调用。它的工作方式类似于"错误边界"——可以在祖先组件中捕获子组件、孙子组件等任意后代组件中抛出的错误，并进行统一处理（如显示错误页面、上报错误日志）。

onErrorCaptured 接收三个参数：错误对象（Error）、触发错误的组件实例、错误来源信息字符串。错误来源信息说明了错误是在哪个钩子或操作中产生的（如 "setup function"、"render function"、"watcher callback" 等）。

这个钩子可以返回 `false` 来阻止错误继续向上传播。如果不返回 false，错误会继续沿组件树向上传播，直到被其他 onErrorCaptured 捕获或到达全局错误处理器 `app.config.errorHandler`。

错误来源包括：渲染函数、生命周期钩子、事件处理器、watch 回调、自定义指令钩子、Transition 钩子等。

### 基本示例

```vue
<!-- ErrorBoundary.vue：错误边界组件 -->
<script setup>
import { ref, onErrorCaptured } from "vue";

const error = ref(null);
const errorInfo = ref("");

onErrorCaptured((err, instance, info) => {
    // err: Error 对象
    // instance: 触发错误的组件实例（可能为 null）
    // info: 错误来源描述字符串

    error.value = err;
    errorInfo.value = info;

    // 上报错误到监控平台
    reportError({
        message: err.message,
        stack: err.stack,
        component: instance?.$options?.name || "Unknown",
        info: info,
    });

    // 返回 false 阻止错误继续向上传播
    return false;
});

function reset() {
    error.value = null;
    errorInfo.value = "";
}

function reportError(data) {
    // 发送到错误监控服务
    console.error("错误上报:", data);
    // fetch('/api/error-report', { method: 'POST', body: JSON.stringify(data) });
}
</script>

<template>
    <div v-if="error" class="error-fallback">
        <h3>出错了</h3>
        <p>{{ error.message }}</p>
        <p class="error-info">错误来源: {{ errorInfo }}</p>
        <button @click="reset">重试</button>
    </div>

    <!-- 没有错误时渲染子组件 -->
    <slot v-else />
</template>
```

```vue
<!-- 使用错误边界 -->
<script setup>
import ErrorBoundary from "./ErrorBoundary.vue";
import RiskyComponent from "./RiskyComponent.vue";
</script>

<template>
    <ErrorBoundary>
        <RiskyComponent />
    </ErrorBoundary>
</template>
```

```vue
<!-- RiskyComponent.vue：可能抛出错误的组件 -->
<script setup>
import { ref } from "vue";

const data = ref(null);

// setup 中的错误会被 onErrorCaptured 捕获
const res = await fetch("/api/data");
if (!res.ok) throw new Error("数据加载失败");
data.value = await res.json();
</script>

<template>
    <div>{{ data.title }}</div>
</template>
```

### 内部原理

#### 错误传播机制

```
Vue 的错误传播链：

子组件抛出错误
    ↓
父组件的 onErrorCaptured
    → 返回 false → 停止传播
    → 不返回 false → 继续向上
        ↓
祖父组件的 onErrorCaptured
    → 返回 false → 停止传播
    → 不返回 false → 继续向上
        ↓
...（沿组件树向上）
        ↓
app.config.errorHandler（全局错误处理器）
    → 如果没有设置 → 错误输出到控制台

可捕获的错误来源：
  → "setup function" — setup 中的同步/异步错误
  → "render function" — 渲染函数错误
  → "watcher callback" — watch 回调错误
  → "component event handler" — 事件处理器错误
  → "lifecycle hook" — 生命周期钩子错误
  → "v-on handler" — 模板事件处理器错误
  → "custom directive hook" — 自定义指令钩子错误
```

### 与相关API的对比

| 错误处理方式 | 作用范围 | 粒度 |
|------------|---------|------|
| onErrorCaptured | 后代组件 | 组件级错误边界 |
| app.config.errorHandler | 全局 | 应用级兜底 |
| try/catch | 当前作用域 | 代码级 |
| window.onerror | 全局 | 浏览器级 |

### 适用场景

- **错误边界组件：** 包裹可能出错的区域，显示友好的错误页面
- **错误上报：** 统一收集后代组件的错误并上报监控
- **降级处理：** 组件出错时显示备用内容
- **Suspense 配合：** 处理异步组件加载失败

### 常见问题

#### onErrorCaptured 无法捕获的错误

**解决方案：**

```javascript
// onErrorCaptured 不能捕获自身组件的错误
// 也不能捕获异步回调中未被 Vue 管理的错误

// 无法捕获：setTimeout 中的错误
setTimeout(() => {
    throw new Error("无法被 onErrorCaptured 捕获");
}, 1000);

// 可以捕获：事件处理器中的错误（Vue 管理的）
// 可以捕获：watch 回调中的错误
// 可以捕获：生命周期钩子中的错误

// 全局兜底：
// app.config.errorHandler = (err, instance, info) => { ... }
```

### 注意事项

- 返回 false 阻止错误向上传播
- 不返回 false 时错误继续传播到父组件
- 不能捕获自身组件的错误
- setTimeout/setInterval 中的错误不被捕获（非 Vue 管理）
- Promise reject（非 async setup）需要额外处理
- Options API 对应 `errorCaptured` 选项

### 总结

onErrorCaptured 作为组件级错误边界，捕获后代组件中的错误。接收错误对象、组件实例和来源信息三个参数。返回 false 阻止传播，否则沿组件树向上传递到全局 errorHandler。适合封装错误边界组件、统一错误上报。不能捕获自身错误和非 Vue 管理的异步错误。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### onRenderTracked的渲染追踪调试

### 概念说明

`onRenderTracked` 是 Vue 3 提供的调试专用生命周期钩子，在组件的渲染函数追踪到一个响应式依赖时调用。每当渲染函数读取一个响应式属性（ref、reactive 的属性等），Vue 的响应式系统会将其记录为渲染依赖，同时触发 onRenderTracked 钩子。

这个钩子接收一个 DebuggerEvent 对象，包含以下信息：
- `effect`：当前的渲染效果
- `target`：被追踪的响应式对象
- `type`：操作类型（通常是 "get"）
- `key`：被访问的属性名

onRenderTracked 只在开发模式下工作，生产构建中会被移除。它的主要用途是调试——帮助开发者了解组件的渲染函数依赖了哪些响应式数据，排查"为什么组件重新渲染了"或"组件依赖了哪些数据"的问题。

### 基本示例

```vue
<script setup>
import { ref, reactive, onRenderTracked } from "vue";

const count = ref(0);
const user = reactive({
    name: "张三",
    age: 25,
});

// 仅开发模式有效
onRenderTracked((event) => {
    // 每追踪到一个依赖就触发一次
    console.log("追踪到渲染依赖:");
    console.log("  target:", event.target);  // 响应式对象
    console.log("  type:", event.type);      // "get"
    console.log("  key:", event.key);        // 属性名

    // 推荐：使用 debugger 在浏览器中交互式检查
    // debugger;
});

/*
    首次渲染时，模板中使用了 count、user.name、user.age
    onRenderTracked 会触发 3 次：
    1. target: Ref, key: "value"         → count.value
    2. target: {name, age}, key: "name"  → user.name
    3. target: {name, age}, key: "age"   → user.age
*/
</script>

<template>
    <div>
        <p>计数: {{ count }}</p>
        <p>姓名: {{ user.name }}</p>
        <p>年龄: {{ user.age }}</p>
    </div>
</template>
```

### 内部原理

#### onRenderTracked 的触发机制

```
响应式追踪与 onRenderTracked 的关系：

1. 组件渲染时执行渲染函数
2. 渲染函数读取 count.value
   → 触发 Proxy 的 get 拦截器
   → track() 函数将 count 记录为渲染依赖
   → 如果注册了 onRenderTracked 钩子 → 调用钩子
3. 渲染函数读取 user.name
   → 同上，追踪 user.name
4. 渲染函数读取 user.age
   → 同上，追踪 user.age

DebuggerEvent 结构：
  {
      effect: ReactiveEffect,   // 当前渲染效果
      target: Object,           // 被追踪的原始对象
      type: "get",              // 操作类型
      key: string | symbol,     // 被访问的属性
  }

注意：
  → 每次渲染都会重新追踪所有依赖
  → 条件渲染中未执行到的分支不会被追踪
  → v-if 为 false 的部分中的响应式数据不会触发追踪
```

### 与相关API的对比

| 钩子 | 触发时机 | 信息 | 用途 |
|------|---------|------|------|
| onRenderTracked | 追踪到渲染依赖时 | 被追踪的属性 | 查看组件依赖了哪些数据 |
| onRenderTriggered | 依赖变化触发重渲染时 | 变化的属性和新旧值 | 查看什么触发了重渲染 |

### 适用场景

- **调试依赖关系：** 了解组件渲染依赖了哪些响应式数据
- **排查意外依赖：** 检查是否追踪了不必要的响应式数据
- **性能分析：** 分析组件依赖数量是否过多

### 常见问题

#### onRenderTracked 触发次数太多难以阅读

**解决方案：**

```vue
<script setup>
import { onRenderTracked } from "vue";

onRenderTracked((event) => {
    // 过滤：只关心特定对象的依赖
    if (event.key === "name") {
        console.log("追踪到 name 依赖:", event);
    }

    // 或者使用 debugger 在浏览器中逐个检查
    // debugger;
});
</script>
```

### 注意事项

- 只在开发模式下工作，生产构建自动移除
- 每追踪到一个依赖触发一次，可能触发多次
- 用于调试，不要在其中执行业务逻辑
- 配合 debugger 语句在浏览器 DevTools 中使用效果最好
- Options API 对应 `renderTracked` 选项
- 条件渲染中未执行的分支不触发追踪

### 总结

onRenderTracked 是开发模式专用的调试钩子，在渲染函数追踪到响应式依赖时触发。接收 DebuggerEvent 包含被追踪的对象、属性和操作类型。适合排查组件依赖了哪些数据、是否有意外依赖。配合 debugger 语句在浏览器中交互式调试效果最好。生产环境自动移除，不影响性能。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### onRenderTriggered的渲染触发调试

### 概念说明

`onRenderTriggered` 是 Vue 3 提供的调试专用生命周期钩子，在响应式依赖的变化触发组件重新渲染时调用。与 onRenderTracked（追踪依赖被读取）不同，onRenderTriggered 关注的是"哪个依赖的变化导致了这次重新渲染"。

这个钩子接收的 DebuggerEvent 对象比 onRenderTracked 更丰富，包含：
- `target`：发生变化的响应式对象
- `type`：变化类型（"set"、"add"、"delete"、"clear"）
- `key`：变化的属性名
- `newValue`：新值
- `oldValue`：旧值

onRenderTriggered 同样只在开发模式下工作。它是排查"组件为什么重新渲染了"这类问题的利器——当组件意外重新渲染时，通过这个钩子可以精确定位是哪个数据的变化触发的。

### 基本示例

```vue
<script setup>
import { ref, reactive, onRenderTriggered } from "vue";

const count = ref(0);
const user = reactive({
    name: "张三",
    age: 25,
});

onRenderTriggered((event) => {
    // 哪个数据变化触发了重新渲染
    console.log("触发重渲染:");
    console.log("  target:", event.target);    // 变化的响应式对象
    console.log("  type:", event.type);        // "set"
    console.log("  key:", event.key);          // 变化的属性名
    console.log("  newValue:", event.newValue); // 新值
    console.log("  oldValue:", event.oldValue); // 旧值

    // 在浏览器中断点调试
    // debugger;
});

function increment() {
    count.value++;
    // → onRenderTriggered 触发
    // → target: Ref, key: "value", oldValue: 0, newValue: 1
}

function updateName() {
    user.name = "李四";
    // → onRenderTriggered 触发
    // → target: {name, age}, key: "name", oldValue: "张三", newValue: "李四"
}
</script>

<template>
    <p>{{ count }}</p>
    <p>{{ user.name }} - {{ user.age }}</p>
    <button @click="increment">+1</button>
    <button @click="updateName">改名</button>
</template>
```

### 内部原理

#### onRenderTriggered 的触发机制

```
响应式数据变化到重渲染的流程：

1. count.value = 1  （修改响应式数据）
2. 触发 Proxy 的 set 拦截器
3. trigger() 函数通知所有依赖这个数据的效果
4. 找到组件的渲染效果（render effect）
5. 如果注册了 onRenderTriggered → 调用钩子
   → 传入 DebuggerEvent（包含变化详情）
6. 将组件渲染标记为需要更新
7. 下一个微任务中执行组件重渲染

DebuggerEvent 的完整结构：
  {
      effect: ReactiveEffect,    // 组件的渲染效果
      target: Object,            // 发生变化的原始对象
      type: "set" | "add" | "delete" | "clear",
      key: string | symbol,      // 变化的属性
      newValue: any,             // 新值（set/add 时有）
      oldValue: any,             // 旧值（set/delete 时有）
      oldTarget: Map | Set,      // 旧集合（clear 时有）
  }

type 的含义：
  "set"    → 修改已有属性的值
  "add"    → 添加新属性（reactive 对象）或新元素（Set/Map）
  "delete" → 删除属性或元素
  "clear"  → 清空集合（Map.clear() / Set.clear()）
```

### 与相关API的对比

| 钩子 | 触发时机 | 核心信息 | 调试问题 |
|------|---------|---------|---------|
| onRenderTracked | 依赖被读取时 | 追踪了哪些依赖 | 组件依赖了什么 |
| onRenderTriggered | 依赖变化时 | 哪个变化触发更新 | 为什么重新渲染 |

### 适用场景

- **排查意外渲染：** 组件频繁重渲染，定位触发源
- **性能优化：** 找出不必要的数据变化
- **调试复杂状态：** 多个数据变化时确认触发顺序

### 常见问题

#### 组件频繁重渲染的排查

**解决方案：**

```vue
<script setup>
import { onRenderTriggered } from "vue";

onRenderTriggered((event) => {
    // 打印完整的触发信息
    console.group("组件重渲染");
    console.log("触发属性:", event.key);
    console.log("旧值:", event.oldValue);
    console.log("新值:", event.newValue);
    console.log("操作类型:", event.type);
    console.trace("调用栈"); // 查看是谁修改了数据
    console.groupEnd();

    // 或者直接断点
    // debugger;
});
</script>
```

### 注意事项

- 只在开发模式下工作，生产构建自动移除
- 每次触发重渲染调用一次
- 包含新值和旧值信息，比 onRenderTracked 更详细
- 配合 console.trace() 可以追溯数据修改的调用栈
- 不要在其中执行业务逻辑
- Options API 对应 `renderTriggered` 选项

### 总结

onRenderTriggered 是开发模式专用的调试钩子，在响应式数据变化触发组件重渲染时调用。提供变化的对象、属性、新旧值等详细信息，是排查"组件为什么重新渲染"的最直接工具。配合 debugger 或 console.trace 可以精确定位问题。与 onRenderTracked 互补——tracked 看依赖了什么，triggered 看什么触发了更新。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### onActivated的keep-alive激活钩子

### 概念说明

`onActivated` 是被 `<KeepAlive>` 缓存的组件专属的生命周期钩子，在组件被激活时调用。激活的时机有两种：组件首次挂载时（紧跟在 onMounted 之后）；组件从缓存中恢复显示时（每次切回时）。

与 onMounted 不同，onMounted 只在首次挂载时触发一次，而 onActivated 在每次组件被激活时都会触发（包括首次）。这使得 onActivated 成为"每次组件变为可见时执行操作"的理想钩子，比如刷新数据、恢复定时器、重新连接 WebSocket 等。

onActivated 不仅对 KeepAlive 的直接子组件生效，对其所有嵌套后代组件也生效。

### 基本示例

```vue
<script setup>
import { ref, onMounted, onActivated } from "vue";

const dataList = ref([]);
const lastRefresh = ref("");

// 只在首次挂载时触发（1次）
onMounted(() => {
    console.log("mounted - 首次挂载");
    // 初始化工作：创建图表实例等一次性操作
});

// 每次激活时触发（包括首次挂载后）
onActivated(() => {
    console.log("activated - 组件激活");
    // 刷新数据：用户可能离开一段时间后回来
    refreshData();
    lastRefresh.value = new Date().toLocaleTimeString();
});

async function refreshData() {
    const res = await fetch("/api/list");
    dataList.value = await res.json();
}
</script>

<template>
    <div>
        <p>上次刷新: {{ lastRefresh }}</p>
        <ul>
            <li v-for="item in dataList" :key="item.id">{{ item.name }}</li>
        </ul>
    </div>
</template>
```

```
生命周期执行顺序（KeepAlive 缓存组件）：

首次挂载：
  setup → onBeforeMount → onMounted → onActivated

切出（进入缓存）：
  onDeactivated

切回（从缓存恢复）：
  onActivated

KeepAlive 被卸载：
  onDeactivated → onUnmounted
```

### 内部原理

#### onActivated 的触发机制

```
KeepAlive 激活组件的流程：

1. 渲染器检测到组件有 COMPONENT_KEPT_ALIVE 标记
2. 调用 activate 方法（而非 mount）
3. 将组件的 DOM 从隐藏容器移回页面
4. 递归触发组件及所有后代的 onActivated 钩子
5. 恢复响应式追踪

首次挂载时的触发：
  → 正常执行 mount 流程
  → onMounted 触发后
  → 检测到父组件是 KeepAlive
  → 额外触发 onActivated

后续激活时：
  → 不执行 mount（组件实例还在内存中）
  → 只执行 activate（DOM 移回页面）
  → 触发 onActivated
```

### 与相关API的对比

| 钩子 | 触发条件 | 触发次数 | 用途 |
|------|---------|---------|------|
| onMounted | 首次挂载完成 | 1次 | 一次性初始化 |
| onActivated | 每次激活（含首次） | 多次 | 每次可见时的操作 |
| onDeactivated | 每次停用 | 多次 | 每次隐藏时的操作 |

### 适用场景

- **数据刷新：** 每次切回时重新拉取最新数据
- **定时器恢复：** 恢复被 deactivated 暂停的定时器
- **页面统计：** 每次页面可见时记录 PV
- **媒体恢复：** 恢复视频/音频播放

### 常见问题

#### 区分首次挂载和后续激活

**解决方案：**

```vue
<script setup>
import { ref, onMounted, onActivated } from "vue";

const isMounted = ref(false);

onMounted(() => {
    isMounted.value = true;
    // 首次挂载：初始化图表等重量级操作
    initChart();
});

onActivated(() => {
    if (!isMounted.value) return; // 防御性检查
    // 后续激活：只刷新数据，不重新初始化
    refreshChartData();
});

// 或者更简洁的方式：
let isFirstActivation = true;
onActivated(() => {
    if (isFirstActivation) {
        isFirstActivation = false;
        return; // 首次激活跳过（已在 mounted 中处理）
    }
    // 后续激活的逻辑
    refreshData();
});
</script>
```

### 注意事项

- 只对 KeepAlive 缓存的组件生效
- 首次挂载时也会触发（在 onMounted 之后）
- 对所有嵌套后代组件都生效
- 适合放"每次可见时"的逻辑
- 一次性初始化逻辑放 onMounted，不要放 onActivated
- Options API 对应 `activated` 选项

### 总结

onActivated 是 KeepAlive 缓存组件的激活钩子，在每次组件变为可见时触发（包括首次挂载后）。适合数据刷新、定时器恢复等"每次可见时"的操作。一次性初始化应放在 onMounted，可通过标记变量区分首次和后续激活。对所有嵌套后代组件生效。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### onDeactivated的keep-alive停用钩子

### 概念说明

`onDeactivated` 是被 `<KeepAlive>` 缓存的组件专属的生命周期钩子，在组件被停用（从页面中移除进入缓存）时调用。停用意味着组件的 DOM 被移动到一个隐藏容器中，但组件实例仍然保留在内存里，响应式状态不会丢失。

onDeactivated 的触发时机有两种：组件被切换出去进入缓存时；KeepAlive 本身被卸载时（此时会先触发 onDeactivated 再触发 onUnmounted）。

onDeactivated 是执行"暂停"操作的理想位置——暂停定时器、暂停视频播放、断开临时连接等。这些资源在组件不可见时没有必要继续运行，等组件重新激活时在 onActivated 中恢复即可。

### 基本示例

```vue
<script setup>
import { ref, onActivated, onDeactivated } from "vue";

let pollingTimer = null;
const messages = ref([]);

onActivated(() => {
    // 激活时：开始轮询
    pollingTimer = setInterval(async () => {
        const res = await fetch("/api/messages/new");
        const newMessages = await res.json();
        messages.value.push(...newMessages);
    }, 10000);
});

onDeactivated(() => {
    // 停用时：暂停轮询，节省资源
    if (pollingTimer) {
        clearInterval(pollingTimer);
        pollingTimer = null;
    }
    console.log("组件停用，轮询已暂停");
});
</script>

<template>
    <ul>
        <li v-for="msg in messages" :key="msg.id">{{ msg.text }}</li>
    </ul>
</template>
```

```vue
<!-- 视频播放器：停用时暂停播放 -->
<script setup>
import { ref, onActivated, onDeactivated } from "vue";

const videoRef = ref(null);

onActivated(() => {
    // 激活时恢复播放（如果之前在播放）
    if (videoRef.value && videoRef.value.dataset.wasPlaying === "true") {
        videoRef.value.play();
    }
});

onDeactivated(() => {
    // 停用时暂停播放
    if (videoRef.value) {
        videoRef.value.dataset.wasPlaying = !videoRef.value.paused;
        videoRef.value.pause();
    }
});
</script>

<template>
    <video ref="videoRef" src="/video.mp4" controls />
</template>
```

### 内部原理

#### onDeactivated 的触发机制

```
KeepAlive 停用组件的流程：

1. 渲染器检测到组件有 COMPONENT_SHOULD_KEEP_ALIVE 标记
2. 不执行 unmount（不销毁），而是调用 deactivate
3. 将组件的 DOM 从页面移动到隐藏容器
4. 递归触发组件及所有后代的 onDeactivated 钩子

停用后的状态：
  → 组件实例仍在内存中 ✓
  → 响应式数据完整保留 ✓
  → DOM 在隐藏容器中（不在页面上） ✗
  → 定时器、事件监听等副作用仍在运行 ⚠️（需手动暂停）

KeepAlive 被卸载时：
  → 先触发 onDeactivated
  → 再触发 onUnmounted
  → 组件彻底销毁
```

### 与相关API的对比

| 钩子 | 触发时机 | 组件状态 | 适合的操作 |
|------|---------|---------|-----------|
| onDeactivated | 进入缓存 | 实例保留 | 暂停副作用 |
| onUnmounted | 彻底销毁 | 实例销毁 | 最终清理 |
| onBeforeUnmount | 销毁前 | DOM 还在 | 保存 DOM 状态 |

### 适用场景

- **暂停定时器：** 停止轮询、停止动画帧
- **暂停媒体：** 暂停视频/音频播放
- **断开临时连接：** 断开不必要的 WebSocket
- **保存状态：** 记录当前操作进度

### 常见问题

#### activated 和 deactivated 必须配对使用

**解决方案：**

```vue
<script setup>
import { onActivated, onDeactivated } from "vue";

// 配对模式：activated 创建，deactivated 清理
let timer = null;

onActivated(() => {
    // 创建
    timer = setInterval(() => { /* ... */ }, 5000);
});

onDeactivated(() => {
    // 清理（与 activated 配对）
    clearInterval(timer);
    timer = null;
});

// 不要只在 onMounted 创建而期望 onDeactivated 清理
// 因为 onMounted 只执行一次，onActivated/onDeactivated 多次
</script>
```

### 注意事项

- 只对 KeepAlive 缓存的组件生效
- 对所有嵌套后代组件都生效
- 停用不是销毁，组件实例和状态保留
- 副作用（定时器等）不会自动暂停，需手动处理
- 与 onActivated 配对使用
- Options API 对应 `deactivated` 选项

### 总结

onDeactivated 是 KeepAlive 缓存组件的停用钩子，在组件从页面移入缓存时触发。组件实例和状态保留，但 DOM 不在页面中。适合暂停定时器、媒体播放等不必要的副作用。与 onActivated 配对使用——activated 创建/恢复，deactivated 暂停/清理。对所有嵌套后代组件生效。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### 生命周期钩子的同步执行顺序

### 概念说明

Vue 3 组件的生命周期钩子按照严格的顺序同步执行。理解这个顺序对于正确放置初始化逻辑、DOM 操作、清理代码至关重要。执行顺序分为三个阶段：挂载阶段、更新阶段、卸载阶段。

在父子组件嵌套的场景中，执行顺序遵循"由外到内创建，由内到外完成"的规则。父组件的 setup 和 onBeforeMount 先执行，然后递归处理子组件，子组件完成 onMounted 后父组件才执行 onMounted。卸载时同理：父组件先触发 onBeforeUnmount，子组件完成 onUnmounted 后父组件才触发 onUnmounted。

同一组件中通过多次调用同一钩子注册的多个回调，按照注册顺序执行。

### 基本示例

```vue
<!-- Parent.vue -->
<script setup>
import {
    onBeforeMount, onMounted,
    onBeforeUpdate, onUpdated,
    onBeforeUnmount, onUnmounted,
} from "vue";
import Child from "./Child.vue";

console.log("Parent setup");

onBeforeMount(() => console.log("Parent onBeforeMount"));
onMounted(() => console.log("Parent onMounted"));
onBeforeUpdate(() => console.log("Parent onBeforeUpdate"));
onUpdated(() => console.log("Parent onUpdated"));
onBeforeUnmount(() => console.log("Parent onBeforeUnmount"));
onUnmounted(() => console.log("Parent onUnmounted"));
</script>

<template>
    <Child />
</template>
```

```vue
<!-- Child.vue -->
<script setup>
import {
    onBeforeMount, onMounted,
    onBeforeUpdate, onUpdated,
    onBeforeUnmount, onUnmounted,
} from "vue";

console.log("Child setup");

onBeforeMount(() => console.log("Child onBeforeMount"));
onMounted(() => console.log("Child onMounted"));
onBeforeUpdate(() => console.log("Child onBeforeUpdate"));
onUpdated(() => console.log("Child onUpdated"));
onBeforeUnmount(() => console.log("Child onBeforeUnmount"));
onUnmounted(() => console.log("Child onUnmounted"));
</script>

<template>
    <div>子组件</div>
</template>
```

```
执行顺序输出：

=== 挂载阶段 ===
Parent setup
Parent onBeforeMount
  Child setup
  Child onBeforeMount
  Child onMounted         ← 子组件先完成挂载
Parent onMounted           ← 父组件后完成挂载

=== 更新阶段（父组件数据变化影响子组件）===
Parent onBeforeUpdate
  Child onBeforeUpdate
  Child onUpdated          ← 子组件先完成更新
Parent onUpdated            ← 父组件后完成更新

=== 卸载阶段 ===
Parent onBeforeUnmount
  Child onBeforeUnmount
  Child onUnmounted        ← 子组件先完成卸载
Parent onUnmounted          ← 父组件后完成卸载
```

### 内部原理

#### 完整的生命周期时序

```
单个组件的完整生命周期：

创建阶段：
  1. setup()                    ← 初始化响应式状态

挂载阶段：
  2. onBeforeMount()            ← DOM 不存在
  3. 渲染函数执行，生成 VNode
  4. 创建真实 DOM 并插入页面
  5. onMounted()                ← DOM 已存在

更新阶段（可重复多次）：
  6. 响应式数据变化
  7. onBeforeUpdate()           ← 数据新值，DOM 旧状态
  8. 渲染函数重新执行，Patch DOM
  9. onUpdated()                ← 数据和 DOM 都是新状态

卸载阶段：
  10. onBeforeUnmount()         ← DOM 还在
  11. 卸载子组件，移除 DOM
  12. onUnmounted()             ← DOM 已移除

KeepAlive 缓存组件的额外钩子：
  挂载后：onActivated()
  切出时：onDeactivated()（替代 onUnmounted）
  切入时：onActivated()（替代 onMounted）

多个子组件的挂载顺序：
  父 setup → 父 onBeforeMount
    → 子A setup → 子A onBeforeMount → 子A onMounted
    → 子B setup → 子B onBeforeMount → 子B onMounted
  → 父 onMounted
  （子组件按模板中的顺序依次挂载）
```

### 与相关API的对比

| 阶段 | 钩子 | 父先/子先 | DOM 状态 |
|------|------|----------|---------|
| 挂载前 | onBeforeMount | 父先 | 不存在 |
| 挂载后 | onMounted | 子先 | 已存在 |
| 更新前 | onBeforeUpdate | 父先 | 旧状态 |
| 更新后 | onUpdated | 子先 | 新状态 |
| 卸载前 | onBeforeUnmount | 父先 | 还在 |
| 卸载后 | onUnmounted | 子先 | 已移除 |

### 适用场景

- **初始化顺序控制：** 子组件的 DOM 在父组件 onMounted 前就绑定好
- **数据流理解：** 理解 props 传递和状态更新的时序
- **调试：** 排查钩子执行顺序相关的问题

### 常见问题

#### 父组件 onMounted 中访问子组件的 DOM

**解决方案：**

```vue
<!-- 父组件 -->
<script setup>
import { ref, onMounted } from "vue";

const childRef = ref(null);

onMounted(() => {
    // 父 onMounted 时子组件已经 mounted
    // 可以安全访问子组件的 ref
    console.log(childRef.value); // 子组件实例或 DOM
});
</script>

<template>
    <ChildComponent ref="childRef" />
</template>
```

### 注意事项

- 父子组件遵循"外到内创建，内到外完成"的规则
- 同一钩子多次注册的回调按注册顺序执行
- onBeforeXxx 父先执行，onXxx 子先执行
- 异步组件可能打破同步执行顺序
- setup 是同步执行的（除非 async setup）
- 更新阶段的钩子只在数据变化触发重渲染时执行

### 总结

Vue 3 生命周期钩子按 setup → onBeforeMount → onMounted → onBeforeUpdate → onUpdated → onBeforeUnmount → onUnmounted 顺序执行。父子组件遵循"外到内开始，内到外完成"的规则——onBeforeXxx 系列父组件先执行，onXxx 系列子组件先完成。理解这个顺序对正确放置初始化逻辑和清理代码至关重要。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### Options API与Composition API生命周期映射

### 概念说明

Vue 3 同时支持 Options API 和 Composition API 两种编写方式，它们的生命周期钩子存在一一对应关系。Options API 中的钩子作为组件选项直接定义（如 `mounted()`），Composition API 中的钩子通过导入函数在 setup 中注册（如 `onMounted()`）。

两种 API 的钩子在功能上完全等价，执行时机也一致。区别在于 Composition API 的钩子可以在 setup 中的任何位置调用，可以注册多个回调，可以在可组合函数（composables）中使用，更利于逻辑复用。Options API 的钩子则每个只能定义一次，但写法更直观。

Vue 3 中有两个 Options API 钩子被移除了：`beforeCreate` 和 `created`。它们的逻辑在 Composition API 中直接写在 setup 函数体内即可，因为 setup 本身就在 beforeCreate 和 created 之间执行。

### 基本示例

```javascript
// === Options API 写法 ===
export default {
    // beforeCreate 和 created → 直接用 setup 替代
    beforeCreate() {
        console.log("beforeCreate");
    },
    created() {
        console.log("created");
    },
    beforeMount() {
        console.log("beforeMount");
    },
    mounted() {
        console.log("mounted");
    },
    beforeUpdate() {
        console.log("beforeUpdate");
    },
    updated() {
        console.log("updated");
    },
    beforeUnmount() {
        console.log("beforeUnmount");
    },
    unmounted() {
        console.log("unmounted");
    },
    errorCaptured(err, instance, info) {
        console.log("errorCaptured");
        return false;
    },
    renderTracked(event) {
        console.log("renderTracked");
    },
    renderTriggered(event) {
        console.log("renderTriggered");
    },
    activated() {
        console.log("activated");
    },
    deactivated() {
        console.log("deactivated");
    },
};
```

```vue
<!-- === Composition API 写法 === -->
<script setup>
import {
    onBeforeMount,
    onMounted,
    onBeforeUpdate,
    onUpdated,
    onBeforeUnmount,
    onUnmounted,
    onErrorCaptured,
    onRenderTracked,
    onRenderTriggered,
    onActivated,
    onDeactivated,
} from "vue";

// beforeCreate 和 created 的逻辑直接写在 setup 中
console.log("相当于 beforeCreate + created");

onBeforeMount(() => console.log("onBeforeMount"));
onMounted(() => console.log("onMounted"));
onBeforeUpdate(() => console.log("onBeforeUpdate"));
onUpdated(() => console.log("onUpdated"));
onBeforeUnmount(() => console.log("onBeforeUnmount"));
onUnmounted(() => console.log("onUnmounted"));

onErrorCaptured((err, instance, info) => {
    console.log("onErrorCaptured");
    return false;
});

// 仅开发模式
onRenderTracked((event) => console.log("onRenderTracked"));
onRenderTriggered((event) => console.log("onRenderTriggered"));

// KeepAlive 专用
onActivated(() => console.log("onActivated"));
onDeactivated(() => console.log("onDeactivated"));

// Composition API 的优势：可以注册多个回调
onMounted(() => console.log("第二个 onMounted 回调"));
onMounted(() => console.log("第三个 onMounted 回调"));
</script>
```

### 内部原理

#### 两种 API 的执行时序

```
Options API 和 Composition API 混用时的执行顺序：

setup()                    ← Composition API 入口
  → 注册 onBeforeMount 等钩子
beforeCreate()             ← Options API（setup 之前）
created()                  ← Options API（setup 之后）

实际上在 Vue 3 内部：
  1. 执行 setup()
  2. 初始化 Options API（data、computed、methods 等）
  3. beforeCreate 和 created 在 setup 前后执行

但在 <script setup> 中：
  → 没有 beforeCreate 和 created
  → setup 体内的代码就是 created 阶段的逻辑

两种 API 混用时同名钩子的执行顺序：
  → Composition API 的钩子先执行
  → Options API 的钩子后执行
  → 例如：onMounted() → mounted()
```

### 与相关API的对比

| Options API | Composition API | 说明 |
|------------|----------------|------|
| beforeCreate | setup() 体内 | 直接写在 setup 中 |
| created | setup() 体内 | 直接写在 setup 中 |
| beforeMount | onBeforeMount | 挂载前 |
| mounted | onMounted | 挂载后 |
| beforeUpdate | onBeforeUpdate | 更新前 |
| updated | onUpdated | 更新后 |
| beforeUnmount | onBeforeUnmount | 卸载前 |
| unmounted | onUnmounted | 卸载后 |
| errorCaptured | onErrorCaptured | 错误捕获 |
| renderTracked | onRenderTracked | 依赖追踪（开发） |
| renderTriggered | onRenderTriggered | 触发更新（开发） |
| activated | onActivated | KeepAlive 激活 |
| deactivated | onDeactivated | KeepAlive 停用 |

### 适用场景

- **新项目：** 推荐使用 Composition API + `<script setup>`
- **迁移项目：** 逐步从 Options API 迁移到 Composition API
- **简单组件：** Options API 可能更直观
- **复杂逻辑复用：** Composition API + composables

### 常见问题

#### Options API 迁移到 Composition API

**解决方案：**

```javascript
// Options API
export default {
    data() {
        return { count: 0 };
    },
    created() {
        this.fetchData();
    },
    mounted() {
        this.initChart();
    },
    unmounted() {
        this.chart?.dispose();
    },
    methods: {
        fetchData() { /* ... */ },
        initChart() { /* ... */ },
    },
};
```

```vue
<!-- Composition API 等价写法 -->
<script setup>
import { ref, onMounted, onUnmounted } from "vue";

const count = ref(0);
let chart = null;

// created → 直接写在 setup 中
fetchData();

onMounted(() => {
    chart = initChart();
});

onUnmounted(() => {
    chart?.dispose();
});

async function fetchData() { /* ... */ }
function initChart() { /* ... */ }
</script>
```

### 注意事项

- beforeCreate 和 created 在 Composition API 中没有对应钩子
- beforeCreate/created 的逻辑直接写在 setup 体内
- Composition API 钩子可以注册多个回调
- 两种 API 混用时 Composition API 钩子先执行
- `<script setup>` 是推荐的 Composition API 写法
- Vue 2 的 beforeDestroy/destroyed 在 Vue 3 中改名为 beforeUnmount/unmounted

### 总结

Options API 和 Composition API 的生命周期钩子一一对应，功能完全等价。beforeCreate 和 created 在 Composition API 中由 setup 体内代码替代。Composition API 的优势在于可注册多个回调、支持 composables 逻辑复用。混用时 Composition API 钩子先于 Options API 钩子执行。新项目推荐使用 Composition API + `<script setup>`。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。



## 7.8 状态管理(Pinia)

### Store的定义与命名

### 概念说明

Pinia 中的 Store 是用于管理全局状态的容器，通过 `defineStore` 函数定义。每个 Store 都有一个唯一的 ID 标识，用于在 Pinia 实例中注册和查找。Store 内部包含三个核心部分：State（状态数据）、Getters（计算属性）、Actions（方法/操作）。

`defineStore` 支持两种定义风格：Options Store（类似 Vue Options API，传入包含 state/getters/actions 的选项对象）和 Setup Store（类似 Vue Composition API，传入 setup 函数，在函数内使用 ref/computed/function 定义状态、计算属性和方法）。

Store 的命名约定是使用 `use` 前缀 + 业务名称 + `Store` 后缀，如 `useUserStore`、`useCartStore`。这种命名符合 Vue composable 的命名习惯，也便于在组件中识别。

### 基本示例

```javascript
// stores/counter.js

import { defineStore } from "pinia";

// === Options Store 风格 ===
// 第一个参数是 Store 的唯一 ID
// 第二个参数是选项对象
export const useCounterStore = defineStore("counter", {
    // state：返回初始状态的函数
    state: () => ({
        count: 0,
        name: "计数器",
    }),

    // getters：计算属性
    getters: {
        doubleCount: (state) => state.count * 2,
    },

    // actions：方法（可以是同步或异步）
    actions: {
        increment() {
            this.count++;
        },
    },
});
```

```javascript
// stores/user.js

import { defineStore } from "pinia";
import { ref, computed } from "vue";

// === Setup Store 风格 ===
// 第一个参数是 Store 的唯一 ID
// 第二个参数是 setup 函数
export const useUserStore = defineStore("user", () => {
    // ref() → state
    const name = ref("张三");
    const age = ref(25);
    const token = ref("");

    // computed() → getters
    const isLoggedIn = computed(() => !!token.value);
    const userInfo = computed(() => `${name.value}, ${age.value}岁`);

    // function → actions
    async function login(username, password) {
        const res = await fetch("/api/login", {
            method: "POST",
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        token.value = data.token;
        name.value = data.name;
    }

    function logout() {
        token.value = "";
        name.value = "";
    }

    // 必须返回所有需要暴露的状态、计算属性和方法
    return { name, age, token, isLoggedIn, userInfo, login, logout };
});
```

```vue
<!-- 在组件中使用 Store -->
<script setup>
import { useCounterStore } from "@/stores/counter";
import { useUserStore } from "@/stores/user";

// 调用 useXxxStore() 获取 store 实例
const counterStore = useCounterStore();
const userStore = useUserStore();
</script>

<template>
    <p>{{ counterStore.count }}</p>
    <p>{{ counterStore.doubleCount }}</p>
    <button @click="counterStore.increment()">+1</button>

    <p>{{ userStore.userInfo }}</p>
    <p>{{ userStore.isLoggedIn ? "已登录" : "未登录" }}</p>
</template>
```

### 内部原理

#### defineStore 的工作机制

```
defineStore 的内部流程：

1. defineStore("counter", options)
   → 返回一个 useCounterStore 函数（composable）
   → Store 尚未创建，只是定义

2. 组件中调用 useCounterStore()
   → 获取当前 Pinia 实例（通过 inject）
   → 检查 pinia._s（store 映射）中是否存在 id="counter" 的 store
     → 存在：直接返回（单例模式）
     → 不存在：创建新的 store 实例并注册

3. Store 创建过程
   → Options Store：将 state() 返回值转为 reactive
   → Setup Store：执行 setup 函数，收集返回的 ref/computed/function
   → 包装为 reactive 代理
   → 注册到 pinia._s.set("counter", store)

4. 单例模式
   → 同一个 Store 在整个应用中只创建一次
   → 多个组件调用 useCounterStore() 获取的是同一个实例
   → 状态变化自动同步到所有使用该 Store 的组件
```

### 与相关API的对比

| 特性 | Options Store | Setup Store |
|------|-------------|-------------|
| 写法风格 | 类似 Options API | 类似 Composition API |
| state 定义 | state() 函数 | ref() / reactive() |
| getters 定义 | getters 对象 | computed() |
| actions 定义 | actions 对象 | 普通函数 |
| $reset() | 自动支持 | 需要手动实现 |
| TypeScript 推导 | 较好 | 更好 |
| 灵活性 | 结构固定 | 更灵活 |

### 适用场景

- **全局状态：** 用户信息、权限、主题等跨组件共享的状态
- **业务逻辑封装：** 购物车、订单等独立业务模块
- **缓存数据：** API 数据缓存避免重复请求

### 常见问题

#### Store ID 命名冲突

**解决方案：**

```javascript
// Store ID 必须唯一，建议使用模块前缀
export const useAuthUserStore = defineStore("auth-user", { /* ... */ });
export const useProductListStore = defineStore("product-list", { /* ... */ });
export const useCartStore = defineStore("shopping-cart", { /* ... */ });

// 不要这样做：两个 Store 使用相同的 ID
// defineStore("user", { ... })  // Store A
// defineStore("user", { ... })  // Store B — 冲突！
```

### 注意事项

- Store ID 在整个应用中必须唯一
- Store 是单例的，多次调用 useXxxStore() 返回同一实例
- 命名约定：use + 业务名 + Store
- Options Store 自动支持 $reset()，Setup Store 需要手动实现
- Store 文件建议放在 stores/ 目录下
- 不要在 Store 外部解构 state（会失去响应性），使用 storeToRefs

### 总结

Pinia 通过 defineStore 定义 Store，支持 Options 和 Setup 两种风格。Store 是单例的，同一 ID 的 Store 全局唯一。Options Store 结构清晰，Setup Store 更灵活。命名使用 use + 业务名 + Store 的约定。Store 文件推荐放在 stores/ 目录下，按业务模块分割。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### State的初始状态定义

### 概念说明

State 是 Pinia Store 的核心数据源，代表应用的全局状态。在 Options Store 中，State 通过 `state` 选项定义，它必须是一个返回初始状态对象的函数（类似 Vue 组件的 data）。在 Setup Store 中，State 通过 `ref()` 或 `reactive()` 定义。

state 必须是函数而非对象的原因与 Vue 组件的 data 相同：确保每个 Store 实例都有独立的状态副本（虽然 Pinia Store 是单例的，但在 SSR 场景中需要为每个请求创建独立状态）。

State 定义后会被 Pinia 转为响应式对象，可以直接在组件模板中使用，数据变化时视图自动更新。State 支持直接修改（`store.count++`），也支持通过 `$patch` 批量修改。

### 基本示例

```javascript
// stores/product.js
import { defineStore } from "pinia";

// Options Store 的 state 定义
export const useProductStore = defineStore("product", {
    state: () => ({
        // 基本类型
        loading: false,
        error: null,

        // 数组
        products: [],

        // 对象
        selectedProduct: null,

        // 嵌套对象
        filters: {
            category: "",
            priceRange: { min: 0, max: Infinity },
            sortBy: "default",
        },

        // 分页信息
        pagination: {
            page: 1,
            pageSize: 20,
            total: 0,
        },
    }),

    getters: {
        totalPages: (state) =>
            Math.ceil(state.pagination.total / state.pagination.pageSize),
    },

    actions: {
        async fetchProducts() {
            this.loading = true;
            try {
                const res = await fetch("/api/products");
                this.products = await res.json();
            } catch (err) {
                this.error = err.message;
            } finally {
                this.loading = false;
            }
        },
    },
});
```

```javascript
// stores/product-setup.js
import { defineStore } from "pinia";
import { ref, reactive } from "vue";

// Setup Store 的 state 定义
export const useProductStore = defineStore("product", () => {
    // ref → 基本类型和数组
    const loading = ref(false);
    const error = ref(null);
    const products = ref([]);

    // ref → 可能为 null 的对象
    const selectedProduct = ref(null);

    // reactive → 固定结构的对象
    const filters = reactive({
        category: "",
        priceRange: { min: 0, max: Infinity },
        sortBy: "default",
    });

    return { loading, error, products, selectedProduct, filters };
});
```

### 内部原理

#### State 的响应式处理

```
Pinia 对 State 的处理：

Options Store：
  1. 调用 state() 获取初始状态对象
  2. 用 reactive() 包装为响应式对象
  3. 存储为 store.$state
  4. 将 $state 的每个属性代理到 store 上
     → store.count 实际访问的是 store.$state.count

Setup Store：
  1. 执行 setup 函数
  2. 收集返回值中的 ref 和 reactive
  3. 将所有 ref/reactive 合并为 $state
  4. 同样代理到 store 实例上

访问方式：
  store.count          → 代理访问 store.$state.count
  store.$state.count   → 直接访问响应式状态
  两者等价，通常使用 store.count 更简洁
```

### 与相关API的对比

| 定义方式 | Options Store | Setup Store |
|---------|-------------|-------------|
| 基本类型 | `state: () => ({ count: 0 })` | `const count = ref(0)` |
| 数组 | `state: () => ({ list: [] })` | `const list = ref([])` |
| 对象 | `state: () => ({ obj: {} })` | `const obj = reactive({})` |
| 可空对象 | `state: () => ({ item: null })` | `const item = ref(null)` |

### 适用场景

- **用户状态：** token、用户信息、权限列表
- **UI 状态：** 侧边栏展开/收起、主题模式
- **数据缓存：** 列表数据、详情数据
- **表单状态：** 多步骤表单的跨页数据

### 常见问题

#### TypeScript 中定义 State 类型

**解决方案：**

```typescript
// Options Store：通过接口定义类型
interface ProductState {
    loading: boolean;
    products: Product[];
    selectedProduct: Product | null;
}

export const useProductStore = defineStore("product", {
    state: (): ProductState => ({
        loading: false,
        products: [],
        selectedProduct: null,
    }),
});

// Setup Store：ref 自动推导类型
export const useProductStore = defineStore("product", () => {
    const loading = ref(false); // Ref<boolean>
    const products = ref<Product[]>([]); // Ref<Product[]>
    const selectedProduct = ref<Product | null>(null); // Ref<Product | null>
    return { loading, products, selectedProduct };
});
```

### 注意事项

- Options Store 的 state 必须是函数，不能是对象
- State 会自动变为响应式，不需要手动包装
- 直接修改 state 是允许的（与 Vuex 不同）
- 深层嵌套的对象也是响应式的
- SSR 场景下 state 函数确保每个请求有独立状态
- 初始值应该覆盖所有需要的属性，避免后续动态添加

### 总结

Pinia 的 State 通过函数返回初始状态对象（Options Store）或使用 ref/reactive（Setup Store）定义。State 自动转为响应式，支持直接修改。TypeScript 中可以通过接口或泛型精确定义类型。初始值应覆盖所有属性，避免动态添加。state 必须是函数以支持 SSR 的独立状态。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### Getters的计算属性缓存

### 概念说明

Pinia 中的 Getters 等同于 Store 的计算属性，基于 State 派生出新的值。Getters 具有缓存特性——只有当依赖的 State 发生变化时才会重新计算，多次访问相同的 Getter 会直接返回缓存结果，不会重复执行计算逻辑。

在 Options Store 中，Getters 定义在 `getters` 选项中，每个 Getter 接收 `state` 作为第一个参数，也可以通过 `this` 访问整个 Store 实例（包括其他 Getters）。在 Setup Store 中，Getters 就是 `computed()` 函数。

Getters 的缓存机制与 Vue 的 computed 完全一致——底层就是用 computed 实现的。

### 基本示例

```javascript
// stores/cart.js
import { defineStore } from "pinia";

export const useCartStore = defineStore("cart", {
    state: () => ({
        items: [
            { id: 1, name: "手机", price: 3999, quantity: 1 },
            { id: 2, name: "耳机", price: 299, quantity: 2 },
            { id: 3, name: "充电器", price: 99, quantity: 3 },
        ],
        discount: 0.9, // 9折
    }),

    getters: {
        // 基本 Getter：接收 state 参数
        itemCount: (state) => state.items.length,

        // 计算总价：依赖 state.items
        totalPrice: (state) => {
            return state.items.reduce((sum, item) => {
                return sum + item.price * item.quantity;
            }, 0);
        },

        // 访问其他 Getter：通过 this
        discountedTotal() {
            // this.totalPrice 访问上面定义的 Getter
            return this.totalPrice * this.discount;
        },

        // 带过滤的 Getter
        expensiveItems: (state) => {
            return state.items.filter((item) => item.price > 200);
        },
    },
});
```

```vue
<script setup>
import { useCartStore } from "@/stores/cart";

const cartStore = useCartStore();

// Getters 像属性一样访问（不需要括号）
console.log(cartStore.itemCount);       // 3
console.log(cartStore.totalPrice);      // 4896
console.log(cartStore.discountedTotal); // 4406.4
console.log(cartStore.expensiveItems);  // [手机, 耳机]

// 缓存特性：多次访问不重复计算
console.log(cartStore.totalPrice); // 直接返回缓存值
console.log(cartStore.totalPrice); // 直接返回缓存值
// items 变化后才会重新计算
</script>

<template>
    <p>商品数量: {{ cartStore.itemCount }}</p>
    <p>总价: {{ cartStore.totalPrice }}</p>
    <p>折后价: {{ cartStore.discountedTotal }}</p>
</template>
```

### 内部原理

#### Getters 的缓存实现

```
Pinia Getters 的底层实现：

Options Store 中的 Getters 处理：
  1. 遍历 getters 选项中的每个 Getter 函数
  2. 用 computed() 包装每个 Getter
     const doubleCount = computed(() => getterFn.call(store, store.$state))
  3. 将 computed ref 注册到 store 上
  4. 访问 store.doubleCount → 实际访问 computed.value

缓存机制（与 Vue computed 相同）：
  → 首次访问：执行计算函数，缓存结果，标记为"干净"
  → 依赖未变时再次访问：直接返回缓存，不重新计算
  → 依赖变化时：标记为"脏"
  → 下次访问时重新计算并缓存

Setup Store 中：
  → Getters 就是 computed()，没有额外处理
  → 开发者直接使用 computed 的缓存能力
```

### 与相关API的对比

| 特性 | Getters | 普通方法 |
|------|---------|---------|
| 缓存 | 有（依赖不变时不重算） | 无（每次调用都执行） |
| 调用方式 | 属性访问（无括号） | 函数调用（有括号） |
| 底层实现 | computed | 普通函数 |
| 适用场景 | 派生数据 | 带参数的查询 |

### 适用场景

- **数据聚合：** 计算总价、平均值、统计数量
- **数据过滤：** 筛选符合条件的列表项
- **格式化：** 将原始数据格式化为展示用的字符串
- **跨 Getter 计算：** 基于其他 Getter 进一步派生

### 常见问题

#### Getter 访问其他 Store 的状态

**解决方案：**

```javascript
import { defineStore } from "pinia";
import { useAuthStore } from "./auth";

export const useOrderStore = defineStore("order", {
    state: () => ({
        orders: [],
    }),
    getters: {
        // 在 Getter 中使用其他 Store
        myOrders() {
            const authStore = useAuthStore();
            return this.orders.filter(
                (order) => order.userId === authStore.userId
            );
        },
    },
});
```

### 注意事项

- Getters 有缓存，依赖不变时不重新计算
- 通过属性方式访问，不要加括号
- Options Store 中通过 this 访问其他 Getters
- 箭头函数定义的 Getter 不能使用 this（用 state 参数）
- 需要传参的 Getter 应返回一个函数（但会失去缓存）
- Setup Store 中直接使用 computed()

### 总结

Pinia Getters 是 Store 的计算属性，具有缓存特性。Options Store 通过 getters 选项定义，Setup Store 通过 computed() 定义。底层基于 Vue 的 computed 实现，依赖不变时返回缓存值。通过属性方式访问，可以使用 this 访问其他 Getters 和跨 Store 数据。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### Getters的参数传递与返回函数

### 概念说明

Pinia 的 Getters 默认不接受参数，因为它们本质是 computed 计算属性。但在实际开发中，经常需要根据参数查询数据，比如"根据 ID 获取某个商品"。解决方式是让 Getter 返回一个函数，调用这个函数时传入参数。

需要注意的是，返回函数的 Getter 会失去缓存特性。因为 Getter 的返回值是一个函数（函数引用不变），所以 computed 认为它没有变化，但每次调用返回的函数时都会重新执行内部逻辑。如果需要缓存带参数的查询结果，可以在 Getter 内部自行维护一个缓存 Map。

### 基本示例

```javascript
// stores/product.js
import { defineStore } from "pinia";

export const useProductStore = defineStore("product", {
    state: () => ({
        products: [
            { id: 1, name: "手机", category: "电子", price: 3999 },
            { id: 2, name: "耳机", category: "电子", price: 299 },
            { id: 3, name: "T恤", category: "服装", price: 99 },
            { id: 4, name: "运动鞋", category: "服装", price: 599 },
        ],
    }),

    getters: {
        // 普通 Getter：不接受参数，有缓存
        allProducts: (state) => state.products,

        // 返回函数的 Getter：接受参数，无缓存
        getProductById: (state) => {
            // 返回一个函数，调用时传入 id
            return (id) => state.products.find((p) => p.id === id);
        },

        // 按分类筛选
        getProductsByCategory: (state) => {
            return (category) =>
                state.products.filter((p) => p.category === category);
        },

        // 按价格范围筛选
        getProductsByPriceRange: (state) => {
            return (min, max) =>
                state.products.filter(
                    (p) => p.price >= min && p.price <= max
                );
        },
    },
});
```

```vue
<script setup>
import { useProductStore } from "@/stores/product";

const productStore = useProductStore();

// 普通 Getter：属性访问
console.log(productStore.allProducts); // 全部商品

// 返回函数的 Getter：先访问属性获取函数，再调用函数传参
const phone = productStore.getProductById(1);
console.log(phone); // { id: 1, name: "手机", ... }

const electronics = productStore.getProductsByCategory("电子");
console.log(electronics); // [手机, 耳机]

const affordable = productStore.getProductsByPriceRange(0, 500);
console.log(affordable); // [耳机, T恤]
</script>

<template>
    <div>
        <h3>电子产品</h3>
        <ul>
            <li v-for="p in productStore.getProductsByCategory('电子')" :key="p.id">
                {{ p.name }} - {{ p.price }}元
            </li>
        </ul>
    </div>
</template>
```

### 内部原理

#### 返回函数的 Getter 为什么没有缓存

```
普通 Getter（有缓存）：
  const totalPrice = computed(() => {
      return items.reduce((sum, i) => sum + i.price, 0);
  });
  // 返回值是数字
  // items 不变 → 返回缓存的数字 → 不重新计算

返回函数的 Getter（无缓存）：
  const getById = computed(() => {
      return (id) => items.find(i => i.id === id);
  });
  // 返回值是函数
  // computed 缓存的是这个函数引用（引用不变 → "没变化"）
  // 但每次调用 getById(1) 时，find 都会重新执行
  // → 查询逻辑本身没有缓存

手动缓存方案：
  const getById = computed(() => {
      // 在 computed 内部建立 Map 缓存
      const cache = new Map();
      items.forEach(item => cache.set(item.id, item));
      // items 变化时 computed 重新执行，Map 重建
      return (id) => cache.get(id);
      // 单次查询 O(1)，而非 O(n)
  });
```

### 与相关API的对比

| Getter 类型 | 调用方式 | 缓存 | 适用场景 |
|------------|---------|------|---------|
| 普通 Getter | `store.total` | 有 | 派生数据 |
| 返回函数 Getter | `store.getById(1)` | 无 | 带参数查询 |
| Action | `store.fetchById(1)` | 无 | 异步操作 |

### 适用场景

- **按 ID 查询：** 根据唯一标识获取单条数据
- **条件筛选：** 根据参数筛选列表
- **格式化输出：** 根据参数格式化数据展示

### 常见问题

#### 在模板中频繁调用返回函数的 Getter

**解决方案：**

```vue
<script setup>
import { computed } from "vue";
import { useProductStore } from "@/stores/product";

const store = useProductStore();

// 方案：在组件中用 computed 缓存调用结果
const electronics = computed(() =>
    store.getProductsByCategory("电子")
);
// electronics 有缓存，store.products 不变时不重新计算
</script>

<template>
    <!-- 使用组件级 computed 而非直接在模板中调用 -->
    <li v-for="p in electronics" :key="p.id">{{ p.name }}</li>
</template>
```

### 注意事项

- 返回函数的 Getter 失去 computed 缓存
- 在模板中直接调用会每次渲染都执行
- 建议在组件中用 computed 包裹调用结果
- 大量数据时可以在 Getter 内部维护 Map 缓存
- 如果只是异步获取数据，用 Action 更合适
- Setup Store 中同样可以用 computed 返回函数

### 总结

Pinia Getters 通过返回函数实现参数传递，但会失去 computed 的缓存特性。调用方式为先访问 Getter 属性获取函数，再调用函数传参。为避免性能问题，建议在组件中用 computed 缓存调用结果，或在 Getter 内部维护 Map 缓存。纯查询操作用 Getter 返回函数，异步操作用 Action。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### Actions的异步方法定义

### 概念说明

Pinia 的 Actions 是 Store 中定义的方法，用于封装业务逻辑和修改 State。与 Vuex 不同，Pinia 的 Actions 可以直接是异步函数（async/await），不需要区分 mutations 和 actions。异步 Actions 是处理 API 请求、数据获取、表单提交等异步操作的标准方式。

在 Options Store 中，Actions 定义在 `actions` 选项中，通过 `this` 访问 State 和 Getters。在 Setup Store 中，Actions 就是普通的异步函数，通过闭包访问 ref 和 reactive 状态。

异步 Actions 返回 Promise，调用方可以 await 等待结果，也可以用 .then/.catch 处理。

### 基本示例

```javascript
// stores/user.js
import { defineStore } from "pinia";

export const useUserStore = defineStore("user", {
    state: () => ({
        user: null,
        token: "",
        loading: false,
        error: null,
    }),

    actions: {
        // 异步 Action：登录
        async login(username, password) {
            this.loading = true;
            this.error = null;

            try {
                const res = await fetch("/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password }),
                });

                if (!res.ok) {
                    throw new Error("登录失败: " + res.statusText);
                }

                const data = await res.json();

                // 直接修改 State
                this.token = data.token;
                this.user = data.user;

                // 持久化 token
                localStorage.setItem("token", data.token);

                return data; // 返回值可以被调用方接收
            } catch (err) {
                this.error = err.message;
                throw err; // 重新抛出让调用方处理
            } finally {
                this.loading = false;
            }
        },

        // 异步 Action：获取用户信息
        async fetchUserProfile() {
            if (!this.token) return;

            this.loading = true;
            try {
                const res = await fetch("/api/user/profile", {
                    headers: { Authorization: `Bearer ${this.token}` },
                });
                this.user = await res.json();
            } catch (err) {
                this.error = err.message;
            } finally {
                this.loading = false;
            }
        },

        // Action 中调用其他 Action
        async logout() {
            try {
                await fetch("/api/auth/logout", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${this.token}` },
                });
            } finally {
                // 无论请求是否成功，都清理本地状态
                this.token = "";
                this.user = null;
                localStorage.removeItem("token");
            }
        },
    },
});
```

```vue
<!-- 组件中使用异步 Action -->
<script setup>
import { ref } from "vue";
import { useUserStore } from "@/stores/user";

const userStore = useUserStore();
const username = ref("");
const password = ref("");

async function handleLogin() {
    try {
        // await 等待 Action 完成
        const result = await userStore.login(username.value, password.value);
        console.log("登录成功:", result);
        // 跳转到首页
    } catch (err) {
        console.error("登录失败:", err.message);
        // 错误已经保存在 userStore.error 中
    }
}
</script>

<template>
    <form @submit.prevent="handleLogin">
        <input v-model="username" placeholder="用户名" />
        <input v-model="password" type="password" placeholder="密码" />
        <button :disabled="userStore.loading">
            {{ userStore.loading ? "登录中..." : "登录" }}
        </button>
        <p v-if="userStore.error" class="error">{{ userStore.error }}</p>
    </form>
</template>
```

### 内部原理

#### 异步 Action 的执行机制

```
Pinia Action 的内部处理：

1. Action 被调用时
   → Pinia 包装 Action，绑定 this 为 Store 实例
   → 触发 $onAction 订阅（如果有的话）
   → 执行 Action 函数

2. 异步 Action 的特殊处理
   → Action 返回 Promise
   → Pinia 监听 Promise 的 resolve/reject
   → resolve 时触发 $onAction 的 after 回调
   → reject 时触发 $onAction 的 onError 回调

3. State 修改
   → Action 中通过 this 直接修改 State
   → 每次修改立即触发响应式更新
   → 如果需要批量修改避免多次更新，使用 $patch
```

### 与相关API的对比

| 特性 | Pinia Actions | Vuex Actions | Vuex Mutations |
|------|-------------|-------------|---------------|
| 异步支持 | 直接 async/await | 支持 | 不支持 |
| 修改 State | 直接修改 | 通过 commit | 直接修改 |
| this 访问 | Store 实例 | context 对象 | state |
| 返回值 | 任意 | Promise | 无 |

### 适用场景

- **API 请求：** 登录、获取数据、提交表单
- **多步骤操作：** 先请求A再请求B
- **跨 Store 操作：** 在 Action 中使用其他 Store
- **错误处理：** 统一处理异步错误

### 常见问题

#### Action 中使用其他 Store

**解决方案：**

```javascript
import { defineStore } from "pinia";
import { useAuthStore } from "./auth";

export const useOrderStore = defineStore("order", {
    actions: {
        async createOrder(orderData) {
            // 在 Action 内部获取其他 Store
            const authStore = useAuthStore();

            if (!authStore.isLoggedIn) {
                throw new Error("请先登录");
            }

            const res = await fetch("/api/orders", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${authStore.token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(orderData),
            });
            return await res.json();
        },
    },
});
```

### 注意事项

- 异步 Action 直接使用 async/await
- Action 中通过 this 访问和修改 State
- 返回值可以被调用方接收（await）
- 错误建议 throw 让调用方自行处理
- 批量修改 State 建议用 $patch 减少更新次数
- Action 中可以使用其他 Store

### 总结

Pinia 的异步 Actions 直接使用 async/await 处理异步操作，通过 this 访问和修改 State。返回 Promise 可被调用方 await。错误处理通过 try/catch 和 throw 配合。可以在 Action 中调用其他 Action 和其他 Store。与 Vuex 相比，不需要区分 mutations 和 actions，代码更简洁。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### Actions的同步方法定义

### 概念说明

Pinia 的 Actions 不仅可以是异步的，也可以是同步方法。同步 Actions 用于封装不涉及异步操作的状态修改逻辑，比如增加计数、切换布尔值、添加/删除列表项、重置表单等。

同步 Actions 的优势在于可以封装复杂的状态修改逻辑到一个方法中，让组件的调用更简洁。虽然 Pinia 允许直接修改 State（`store.count++`），但当修改逻辑涉及多个属性或需要条件判断时，封装成 Action 更清晰，也便于在多个组件中复用。

在 Options Store 中，同步 Actions 定义在 actions 选项中；在 Setup Store 中就是普通函数。

### 基本示例

```javascript
// stores/counter.js
import { defineStore } from "pinia";

export const useCounterStore = defineStore("counter", {
    state: () => ({
        count: 0,
        step: 1,
        history: [],
    }),

    actions: {
        // 简单的同步 Action
        increment() {
            this.count += this.step;
            this.history.push({ action: "increment", value: this.count });
        },

        decrement() {
            this.count -= this.step;
            this.history.push({ action: "decrement", value: this.count });
        },

        // 带参数的同步 Action
        setStep(newStep) {
            if (newStep > 0) {
                this.step = newStep;
            }
        },

        // 涉及多个 State 的同步 Action
        reset() {
            this.count = 0;
            this.step = 1;
            this.history = [];
        },

        // 带条件判断的 Action
        incrementIfOdd() {
            if (this.count % 2 !== 0) {
                this.increment(); // Action 中调用其他 Action
            }
        },

        // 撤销操作
        undo() {
            if (this.history.length > 0) {
                this.history.pop();
                const lastEntry = this.history[this.history.length - 1];
                this.count = lastEntry ? lastEntry.value : 0;
            }
        },
    },
});
```

```javascript
// Setup Store 风格
import { defineStore } from "pinia";
import { ref } from "vue";

export const useCounterStore = defineStore("counter", () => {
    const count = ref(0);
    const step = ref(1);

    // 同步方法就是普通函数
    function increment() {
        count.value += step.value;
    }

    function decrement() {
        count.value -= step.value;
    }

    function reset() {
        count.value = 0;
        step.value = 1;
    }

    return { count, step, increment, decrement, reset };
});
```

```vue
<script setup>
import { useCounterStore } from "@/stores/counter";

const counter = useCounterStore();
</script>

<template>
    <p>计数: {{ counter.count }}</p>
    <p>步长: {{ counter.step }}</p>
    <button @click="counter.increment()">+{{ counter.step }}</button>
    <button @click="counter.decrement()">-{{ counter.step }}</button>
    <button @click="counter.setStep(5)">步长设为5</button>
    <button @click="counter.reset()">重置</button>
</template>
```

### 内部原理

#### 同步 Action 与直接修改 State 的区别

```
直接修改 State：
  store.count++
  → 简单直接
  → 适合单个属性的简单修改
  → 逻辑分散在各个组件中

同步 Action：
  store.increment()
  → 逻辑封装在 Store 中
  → 可以包含条件判断、多属性修改
  → 在所有组件中复用相同逻辑
  → 可以被 $onAction 监听
  → DevTools 中可以追踪

Pinia 对 Action 的包装：
  1. 绑定 this 为 Store 实例
  2. 同步 Action 的返回值直接返回
  3. 触发 $onAction 订阅的回调
  4. 在 Vue DevTools 中记录 Action 调用
```

### 与相关API的对比

| 修改方式 | 适用场景 | DevTools 追踪 | 可复用 |
|---------|---------|-------------|--------|
| 直接修改 `store.x = y` | 简单的单属性修改 | 不明显 | 否 |
| Action | 复杂逻辑、多属性修改 | 是 | 是 |
| $patch | 批量修改多个属性 | 是 | 否 |

### 适用场景

- **状态切换：** 开关、主题切换、模式切换
- **列表操作：** 添加、删除、排序、筛选
- **表单操作：** 重置、清空、填充默认值
- **计数操作：** 增加、减少、设置步长

### 常见问题

#### 同步 Action 中修改多个属性的性能

**解决方案：**

```javascript
export const useFormStore = defineStore("form", {
    state: () => ({
        name: "",
        email: "",
        phone: "",
        address: "",
    }),
    actions: {
        // 方式1：逐个修改（每次修改都触发更新）
        resetForm() {
            this.name = "";
            this.email = "";
            this.phone = "";
            this.address = "";
            // 4次状态变化，但 Vue 会批量处理
        },

        // 方式2：使用 $patch 批量修改（一次更新）
        resetFormBatch() {
            this.$patch({
                name: "",
                email: "",
                phone: "",
                address: "",
            });
        },
    },
});
```

### 注意事项

- 同步 Action 通过 this 访问和修改 State
- 简单修改可以直接修改 State，复杂逻辑用 Action
- Action 中可以调用其他 Action
- 批量修改多个属性建议用 $patch
- 同步 Action 的返回值直接返回给调用方
- Setup Store 中同步 Action 就是普通函数

### 总结

Pinia 的同步 Actions 封装不涉及异步操作的状态修改逻辑。通过 this 访问 State 和其他 Actions。与直接修改 State 相比，Action 封装了逻辑便于复用，可被 DevTools 追踪和 $onAction 监听。简单的单属性修改可以直接修改 State，复杂逻辑建议封装为 Action。批量修改多个属性推荐使用 $patch。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### storeToRefs的响应式解构

### 概念说明

`storeToRefs` 是 Pinia 提供的工具函数，用于从 Store 中解构出响应式的 State 和 Getters，同时保持它们的响应性。直接对 Store 进行解构会丢失响应性，因为解构操作会提取出普通值而非响应式引用。

Store 实例本身是一个 reactive 对象，直接解构 reactive 对象的属性会得到普通值（失去响应性）。`storeToRefs` 的作用是将 Store 中的每个 State 和 Getter 转为独立的 ref，这样解构后仍然是响应式的。

需要注意的是，storeToRefs 只处理 State 和 Getters（响应式数据），不处理 Actions（方法）。Actions 可以直接从 Store 中解构，因为函数引用不需要响应性。

### 基本示例

```vue
<script setup>
import { storeToRefs } from "pinia";
import { useUserStore } from "@/stores/user";

const userStore = useUserStore();

// 错误：直接解构会丢失响应性
// const { name, age, isLoggedIn } = userStore;
// name 和 age 变成了普通字符串和数字，不再响应式

// 正确：使用 storeToRefs 解构 State 和 Getters
const { name, age, isLoggedIn } = storeToRefs(userStore);
// name → Ref<string>
// age → Ref<number>
// isLoggedIn → ComputedRef<boolean>（Getter 变成 computed ref）

// Actions 直接从 store 解构（函数不需要响应性）
const { login, logout } = userStore;

// 使用时需要 .value（因为是 ref）
console.log(name.value); // "张三"

// 在模板中自动解包，不需要 .value
</script>

<template>
    <!-- 模板中直接使用解构出的 ref，自动解包 -->
    <p>姓名: {{ name }}</p>
    <p>年龄: {{ age }}</p>
    <p>{{ isLoggedIn ? "已登录" : "未登录" }}</p>
    <button @click="login('admin', '123')">登录</button>
    <button @click="logout()">退出</button>
</template>
```

```vue
<script setup>
import { storeToRefs } from "pinia";
import { useCounterStore } from "@/stores/counter";

const counterStore = useCounterStore();

// storeToRefs 只提取 state 和 getters
const { count, doubleCount } = storeToRefs(counterStore);

// actions 直接解构
const { increment, decrement } = counterStore;

// 修改 ref 会同步到 store
count.value = 100; // 等同于 counterStore.count = 100
</script>

<template>
    <p>{{ count }} x 2 = {{ doubleCount }}</p>
    <button @click="increment()">+1</button>
</template>
```

### 内部原理

#### storeToRefs 的工作机制

```
storeToRefs 的实现原理：

1. 遍历 Store 实例的所有属性
2. 对每个属性判断类型：
   → 如果是 ref → 直接提取该 ref
   → 如果是 reactive 的属性 → 用 toRef() 转为 ref
   → 如果是 computed（Getter） → 直接提取该 computed ref
   → 如果是函数（Action） → 跳过，不处理
3. 返回包含所有 ref 的普通对象

简化的内部实现：
  function storeToRefs(store) {
      const refs = {};
      for (const key in store) {
          const value = store[key];
          if (isRef(value) || isReactive(value)) {
              refs[key] = toRef(store, key);
          }
          // 跳过函数（Actions）
      }
      return refs;
  }

与 toRefs 的区别：
  → Vue 的 toRefs() 会转换所有属性（包括方法）
  → Pinia 的 storeToRefs() 只转换响应式属性
  → storeToRefs 跳过 Actions 和 $开头的内部属性
```

### 与相关API的对比

| 解构方式 | 响应性 | Actions | 适用场景 |
|---------|--------|---------|---------|
| 直接解构 | 丢失 | 可用 | 不推荐用于 state |
| storeToRefs | 保持 | 不包含 | 推荐方式 |
| Vue toRefs | 保持 | 也会转换 | 不推荐（多余转换） |
| 不解构 | 保持 | 可用 | store.xxx 访问 |

### 适用场景

- **模板简化：** 避免重复写 store.xxx
- **组合式函数：** 在 composable 中使用 store 的值
- **解构赋值：** 同时提取多个 state 和 getters

### 常见问题

#### 解构后修改 ref 值是否同步到 Store

**解决方案：**

```vue
<script setup>
import { storeToRefs } from "pinia";
import { useCounterStore } from "@/stores/counter";

const store = useCounterStore();
const { count } = storeToRefs(store);

// 修改 ref 会同步到 store（双向绑定）
count.value = 50;
console.log(store.count); // 50

// store 的修改也会反映到 ref
store.count = 100;
console.log(count.value); // 100

// 它们引用的是同一个响应式数据
</script>
```

### 注意事项

- storeToRefs 只提取 State 和 Getters，不提取 Actions
- Actions 直接从 store 解构即可
- 解构出的 ref 与 store 双向同步
- 在 script 中使用需要 .value，模板中自动解包
- 不要用 Vue 的 toRefs 替代 storeToRefs（会包含不必要的属性）
- 每次调用 storeToRefs 都创建新的 ref 引用对象

### 总结

storeToRefs 将 Store 的 State 和 Getters 转为独立的 ref，解构后仍保持响应性。Actions 直接从 store 解构。解构出的 ref 与 store 双向同步。是在组件中简化 store 使用的推荐方式，避免在模板中反复写 store.xxx。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### $patch的批量状态更新

### 概念说明

`$patch` 是 Pinia Store 实例上的方法，用于一次性批量修改多个 State 属性。与逐个修改 State 相比，$patch 将多个修改合并为一次更新，减少响应式系统的触发次数，在 Vue DevTools 中也只产生一条变更记录。

$patch 支持两种调用方式：

**对象形式：** `store.$patch({ count: 10, name: '新名称' })`。传入一个包含要修改属性的对象，Pinia 会将其与当前 State 进行浅合并。适合简单的属性赋值。

**函数形式：** `store.$patch((state) => { state.items.push(newItem); state.count++ })`。传入一个接收 state 的函数，在函数内直接修改 state。适合涉及数组操作、条件判断等复杂修改逻辑。

### 基本示例

```javascript
import { defineStore } from "pinia";

export const useSettingsStore = defineStore("settings", {
    state: () => ({
        theme: "light",
        fontSize: 14,
        language: "zh-CN",
        notifications: {
            email: true,
            push: false,
            sms: false,
        },
        recentSearches: ["Vue", "Pinia"],
    }),
});
```

```vue
<script setup>
import { useSettingsStore } from "@/stores/settings";

const settings = useSettingsStore();

// === 对象形式 $patch ===
function switchToDarkMode() {
    // 一次性修改多个属性
    settings.$patch({
        theme: "dark",
        fontSize: 16,
    });
    // 只触发一次更新，DevTools 只记录一条变更
}

// 对象形式的浅合并特点
function updateNotifications() {
    // 注意：对象形式是浅合并
    settings.$patch({
        notifications: {
            email: false,
            push: true,
            sms: true,
        },
    });
    // notifications 整个被替换为新对象
}

// === 函数形式 $patch ===
function addSearch(keyword) {
    settings.$patch((state) => {
        // 数组操作：push、splice 等
        state.recentSearches.push(keyword);

        // 条件修改
        if (state.recentSearches.length > 10) {
            state.recentSearches.shift(); // 超过10条删除最早的
        }
    });
}

function toggleNotification(type) {
    settings.$patch((state) => {
        // 动态属性修改
        state.notifications[type] = !state.notifications[type];
    });
}
</script>

<template>
    <button @click="switchToDarkMode">深色模式</button>
    <button @click="addSearch('React')">添加搜索</button>
</template>
```

### 内部原理

#### $patch 的合并与更新机制

```
$patch 的内部处理：

对象形式 $patch(partialState)：
  1. 遍历 partialState 的每个属性
  2. 与 store.$state 进行浅合并（Object.assign 风格）
  3. 嵌套对象会被整个替换（不是深合并）
  4. 将所有变更批量应用，只触发一次响应式更新

函数形式 $patch(fn)：
  1. 调用 fn(store.$state)
  2. fn 内部直接修改 state（所有修改被 Vue 批量处理）
  3. 函数执行完成后触发一次响应式更新

两种形式的区别：
  对象形式：
    → 简单赋值，浅合并
    → 嵌套对象被替换
    → 不能做数组 push/splice

  函数形式：
    → 可以执行任意逻辑
    → 支持数组方法
    → 支持条件判断
    → 更灵活
```

### 与相关API的对比

| 修改方式 | 更新次数 | 灵活性 | DevTools 记录 |
|---------|---------|--------|-------------|
| 逐个修改 `store.a = 1; store.b = 2` | Vue 批量处理 | 简单 | 多条 |
| $patch 对象形式 | 1次 | 中等 | 1条 |
| $patch 函数形式 | 1次 | 高 | 1条 |
| Action 中修改 | Vue 批量处理 | 最高 | 1条（Action） |

### 适用场景

- **批量赋值：** 同时修改多个属性
- **数组操作：** 函数形式支持 push/splice 等
- **表单重置：** 一次性重置多个表单字段
- **API 响应处理：** 一次性更新多个状态

### 常见问题

#### 对象形式 $patch 对嵌套对象的处理

**解决方案：**

```javascript
const store = useSettingsStore();

// 问题：对象形式是浅合并，嵌套对象被整个替换
store.$patch({
    notifications: { email: false },
});
// notifications 变成 { email: false }
// push 和 sms 属性丢失！

// 方案1：函数形式（推荐）
store.$patch((state) => {
    state.notifications.email = false;
    // 其他属性不受影响
});

// 方案2：对象形式但展开旧值
store.$patch({
    notifications: {
        ...store.notifications,
        email: false,
    },
});
```

### 注意事项

- 对象形式是浅合并，嵌套对象会被替换
- 函数形式更灵活，推荐用于复杂修改
- $patch 在 DevTools 中只产生一条记录
- 数组操作必须用函数形式
- $patch 也会触发 $subscribe 订阅
- $patch 可以在组件和 Action 中使用

### 总结

$patch 支持对象形式和函数形式两种批量更新方式。对象形式简洁但只支持浅合并，嵌套对象会被替换。函数形式更灵活，支持数组操作和条件判断。$patch 将多个修改合并为一次更新，在 DevTools 中只产生一条记录。涉及嵌套对象和数组操作时推荐使用函数形式。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### $reset的状态重置

### 概念说明

`$reset()` 是 Pinia Store 实例上的方法，用于将 State 重置为初始值。调用 `store.$reset()` 后，Store 的所有 State 属性都会恢复到 `state()` 函数返回的初始状态。

$reset 只在 Options Store 中自动可用，因为 Options Store 的 state 是一个函数，Pinia 可以重新调用这个函数获取初始值。Setup Store 没有 state 函数，Pinia 无法自动知道初始值是什么，因此需要开发者手动实现 $reset 方法。

$reset 在表单重置、用户退出登录后清理状态、开发调试等场景非常实用。

### 基本示例

```javascript
// Options Store：$reset 自动可用
import { defineStore } from "pinia";

export const useFormStore = defineStore("form", {
    state: () => ({
        name: "",
        email: "",
        phone: "",
        agreed: false,
        selectedPlan: "free",
    }),

    actions: {
        async submitForm() {
            await fetch("/api/submit", {
                method: "POST",
                body: JSON.stringify({
                    name: this.name,
                    email: this.email,
                    phone: this.phone,
                    plan: this.selectedPlan,
                }),
            });
            // 提交成功后重置表单
            this.$reset();
        },
    },
});
```

```vue
<script setup>
import { useFormStore } from "@/stores/form";

const formStore = useFormStore();

async function handleSubmit() {
    await formStore.submitForm();
    // 表单已被重置为初始值
}

function handleCancel() {
    // 取消时重置表单
    formStore.$reset();
}
</script>

<template>
    <form @submit.prevent="handleSubmit">
        <input v-model="formStore.name" placeholder="姓名" />
        <input v-model="formStore.email" placeholder="邮箱" />
        <input v-model="formStore.phone" placeholder="电话" />
        <label>
            <input type="checkbox" v-model="formStore.agreed" />
            同意条款
        </label>
        <button type="submit">提交</button>
        <button type="button" @click="handleCancel">取消</button>
    </form>
</template>
```

```javascript
// Setup Store：需要手动实现 $reset
import { defineStore } from "pinia";
import { ref } from "vue";

export const useFormStore = defineStore("form", () => {
    const name = ref("");
    const email = ref("");
    const phone = ref("");

    // 手动实现 $reset
    function $reset() {
        name.value = "";
        email.value = "";
        phone.value = "";
    }

    return { name, email, phone, $reset };
});
```

### 内部原理

#### $reset 的工作机制

```
Options Store 的 $reset 实现：

1. defineStore 创建 Store 时保存 state 函数的引用
2. 调用 $reset() 时：
   → 重新调用 state() 获取初始状态对象
   → 调用 $patch(initialState) 用初始状态覆盖当前状态
   → 触发一次响应式更新

简化的内部实现：
  store.$reset = () => {
      const initialState = options.state();  // 重新调用 state()
      store.$patch((currentState) => {
          Object.assign(currentState, initialState);
      });
  };

Setup Store 没有 $reset 的原因：
  → Setup Store 用 ref() 定义状态
  → Pinia 不知道每个 ref 的初始值
  → 无法自动生成 $reset 逻辑
  → 需要开发者手动实现

通用的 Setup Store $reset 插件：
  可以通过 Pinia 插件为所有 Setup Store 添加 $reset 支持
```

### 与相关API的对比

| 重置方式 | 适用范围 | 自动化 | 粒度 |
|---------|---------|--------|------|
| $reset() | Options Store | 自动 | 全部 State |
| $patch | 两种 Store | 手动 | 部分 State |
| 手动赋值 | 两种 Store | 手动 | 单个属性 |

### 适用场景

- **表单重置：** 提交或取消后清空表单
- **用户退出：** 退出登录后清理用户相关状态
- **开发调试：** 快速将状态恢复到初始值
- **页面离开：** 离开页面时重置临时状态

### 常见问题

#### 为 Setup Store 实现通用 $reset 插件

**解决方案：**

```javascript
// plugins/resetStore.js
// 通过插件为 Setup Store 支持 $reset

import { cloneDeep } from "lodash-es";

export function resetStorePlugin({ store }) {
    // 保存初始状态的深拷贝
    const initialState = cloneDeep(store.$state);

    // 覆盖或添加 $reset 方法
    store.$reset = () => {
        store.$patch(cloneDeep(initialState));
    };
}

// main.js 中注册插件
// import { createPinia } from 'pinia';
// import { resetStorePlugin } from './plugins/resetStore';
// const pinia = createPinia();
// pinia.use(resetStorePlugin);
```

### 注意事项

- $reset 只在 Options Store 中自动可用
- Setup Store 需要手动实现或使用插件
- $reset 重置所有 State 属性，不能选择性重置
- 重置会触发 $subscribe 订阅
- $reset 内部使用 $patch，是一次性更新
- 如果只需重置部分属性，直接用 $patch

### 总结

$reset 将 Store 的 State 重置为初始值，通过重新调用 state() 函数获取初始状态。Options Store 自动支持，Setup Store 需要手动实现或通过插件添加。适用于表单重置、用户退出、调试等场景。内部使用 $patch 实现，是一次性更新。如果只需重置部分属性，使用 $patch 更合适。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### $subscribe的状态订阅

### 概念说明

`$subscribe` 是 Pinia Store 实例上的方法，用于监听 State 的变化。每当 State 发生变更时（无论是直接修改、$patch 还是 Action 中修改），$subscribe 的回调函数都会被触发。回调接收两个参数：mutation 信息对象和变更后的完整 state。

mutation 信息对象包含：
- `type`：变更类型，值为 `'direct'`（直接修改）、`'patch object'`（$patch 对象形式）或 `'patch function'`（$patch 函数形式）
- `storeId`：Store 的 ID
- `events`：变更事件的详细信息（开发模式下可用）
- `payload`：$patch 对象形式时传入的对象

$subscribe 常用于状态持久化——监听状态变化后将其保存到 localStorage 或 sessionStorage，实现页面刷新后状态恢复。

### 基本示例

```vue
<script setup>
import { useUserStore } from "@/stores/user";

const userStore = useUserStore();

// 订阅状态变化
const unsubscribe = userStore.$subscribe((mutation, state) => {
    // mutation.type: 'direct' | 'patch object' | 'patch function'
    console.log("变更类型:", mutation.type);
    console.log("Store ID:", mutation.storeId);

    // state: 变更后的完整状态
    console.log("当前状态:", state);

    // 持久化到 localStorage
    localStorage.setItem("user-store", JSON.stringify(state));
});

// 取消订阅
// unsubscribe();
</script>
```

```javascript
// 状态持久化的完整示例
import { defineStore } from "pinia";

export const useSettingsStore = defineStore("settings", {
    state: () => {
        // 初始化时从 localStorage 恢复
        const saved = localStorage.getItem("settings-store");
        const defaults = {
            theme: "light",
            fontSize: 14,
            language: "zh-CN",
        };
        return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    },
});

// 在组件或 main.js 中设置订阅
// const settingsStore = useSettingsStore();
// settingsStore.$subscribe((mutation, state) => {
//     localStorage.setItem("settings-store", JSON.stringify(state));
// });
```

```vue
<!-- 订阅选项 -->
<script setup>
import { useCartStore } from "@/stores/cart";

const cartStore = useCartStore();

// detached: true → 组件卸载后订阅仍然保留
cartStore.$subscribe(
    (mutation, state) => {
        sessionStorage.setItem("cart", JSON.stringify(state));
    },
    { detached: true }
);
// 默认情况下，组件卸载时订阅自动取消
// detached: true 让订阅在组件卸载后继续生效
</script>
```

### 内部原理

#### $subscribe 的触发机制

```
$subscribe 的触发时机：

1. 直接修改 State
   store.count = 10
   → mutation.type = 'direct'
   → mutation.payload = undefined

2. $patch 对象形式
   store.$patch({ count: 10 })
   → mutation.type = 'patch object'
   → mutation.payload = { count: 10 }

3. $patch 函数形式
   store.$patch(state => { state.count = 10 })
   → mutation.type = 'patch function'
   → mutation.payload = undefined

4. Action 中修改
   store.increment() // 内部 this.count++
   → mutation.type = 'direct'

内部实现：
  → $subscribe 底层使用 Vue 的 watch 监听 store.$state
  → watch 的 flush 默认为 'sync'（同步触发）
  → 可以通过第二个参数设置 { flush: 'post' }（DOM 更新后触发）

detached 选项：
  → 默认：订阅与组件生命周期绑定，组件卸载时自动取消
  → detached: true：脱离组件生命周期，需要手动取消或永久保留
```

### 与相关API的对比

| 监听方式 | 监听范围 | 触发时机 | 变更信息 |
|---------|---------|---------|---------|
| $subscribe | 整个 Store State | 任何 State 变化 | mutation 对象 |
| watch | 指定数据 | 指定数据变化 | 新值和旧值 |
| $onAction | Action 调用 | Action 执行时 | Action 名和参数 |

### 适用场景

- **状态持久化：** 自动保存到 localStorage/sessionStorage
- **变更日志：** 记录所有状态变更
- **数据同步：** 状态变化时同步到服务器
- **调试：** 监控状态变化情况

### 常见问题

#### $subscribe 与 watch 的选择

**解决方案：**

```vue
<script setup>
import { watch } from "vue";
import { useUserStore } from "@/stores/user";

const userStore = useUserStore();

// $subscribe：监听整个 Store 的任何变化
userStore.$subscribe((mutation, state) => {
    // 任何 state 属性变化都触发
    localStorage.setItem("user", JSON.stringify(state));
});

// watch：只监听特定属性
watch(
    () => userStore.token,
    (newToken) => {
        // 只在 token 变化时触发
        if (newToken) {
            localStorage.setItem("token", newToken);
        } else {
            localStorage.removeItem("token");
        }
    }
);
</script>
```

### 注意事项

- 默认订阅在组件卸载时自动取消
- detached: true 让订阅脱离组件生命周期
- $subscribe 返回取消订阅的函数
- mutation.type 区分直接修改和 $patch
- 持久化逻辑建议放在插件中而非每个组件
- $subscribe 底层用 watch 实现，支持 flush 选项

### 总结

$subscribe 监听 Store State 的所有变化，回调接收 mutation 信息和完整 state。支持 detached 选项脱离组件生命周期。常用于状态持久化、变更日志等场景。与 watch 的区别在于 $subscribe 监听整个 Store，watch 监听特定属性。持久化建议通过 Pinia 插件统一实现。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### $onAction的动作订阅

### 概念说明

`$onAction` 是 Pinia Store 实例上的方法，用于监听 Store 中 Action 的调用。每当 Action 被调用时，$onAction 的回调函数会触发，提供 Action 的名称、参数、Store 实例等信息，还可以注册 `after` 和 `onError` 回调来监听 Action 的完成和失败。

$onAction 回调接收一个上下文对象，包含以下属性：
- `name`：被调用的 Action 名称
- `store`：Store 实例
- `args`：传给 Action 的参数数组
- `after(callback)`：注册 Action 成功完成后的回调
- `onError(callback)`：注册 Action 抛出错误时的回调

$onAction 适用于日志记录、性能监控、错误上报等横切关注点。

### 基本示例

```vue
<script setup>
import { useUserStore } from "@/stores/user";

const userStore = useUserStore();

// 订阅 Action 调用
const unsubscribe = userStore.$onAction(
    ({
        name,    // Action 名称
        store,   // Store 实例
        args,    // Action 参数
        after,   // 成功回调
        onError, // 失败回调
    }) => {
        // Action 调用时立即执行
        const startTime = Date.now();
        console.log(`Action "${name}" 开始执行，参数:`, args);

        // 注册成功回调（Action resolve 后触发）
        after((result) => {
            const duration = Date.now() - startTime;
            console.log(`Action "${name}" 成功，耗时: ${duration}ms，返回值:`, result);
        });

        // 注册失败回调（Action reject 后触发）
        onError((error) => {
            const duration = Date.now() - startTime;
            console.error(`Action "${name}" 失败，耗时: ${duration}ms，错误:`, error);

            // 上报错误
            // reportError({ action: name, error: error.message, duration });
        });
    },
    true // detached: true → 组件卸载后仍保留订阅
);

// 取消订阅
// unsubscribe();
</script>
```

```javascript
// 在插件中使用 $onAction（全局监控所有 Store）
// plugins/actionLogger.js
export function actionLoggerPlugin({ store }) {
    store.$onAction(({ name, args, after, onError }) => {
        const start = performance.now();

        console.log(`[${store.$id}] ${name}(${JSON.stringify(args)})`);

        after((result) => {
            const ms = (performance.now() - start).toFixed(1);
            console.log(`[${store.$id}] ${name} → 完成 (${ms}ms)`);
        });

        onError((err) => {
            const ms = (performance.now() - start).toFixed(1);
            console.error(`[${store.$id}] ${name} → 失败 (${ms}ms):`, err.message);
        });
    });
}

// main.js
// const pinia = createPinia();
// pinia.use(actionLoggerPlugin);
```

### 内部原理

#### $onAction 的触发时序

```
Action 调用时 $onAction 的执行流程：

store.login("admin", "123")
    ↓
1. 触发 $onAction 回调
   → name: "login"
   → args: ["admin", "123"]
   → 执行回调函数体（如记录开始时间）
   → 注册 after 和 onError 回调
    ↓
2. 执行 Action 函数
   → 如果是同步 Action → 直接执行
   → 如果是异步 Action → 返回 Promise
    ↓
3a. Action 成功（resolve）
   → 触发所有 after 回调
   → 传入 Action 的返回值
    ↓
3b. Action 失败（reject）
   → 触发所有 onError 回调
   → 传入错误对象

注意：
  → $onAction 回调在 Action 执行前触发
  → after 在 Action 成功后触发
  → onError 在 Action 失败后触发
  → after 和 onError 互斥，只触发其中一个
```

### 与相关API的对比

| 订阅方式 | 监听目标 | 信息 | 适用场景 |
|---------|---------|------|---------|
| $onAction | Action 调用 | 名称、参数、结果 | 日志、性能监控 |
| $subscribe | State 变化 | mutation 类型、state | 持久化、同步 |
| watch | 指定数据 | 新旧值 | 特定数据变化 |

### 适用场景

- **日志记录：** 记录所有 Action 调用和结果
- **性能监控：** 监控异步 Action 的执行时间
- **错误上报：** 统一捕获 Action 中的错误
- **审计追踪：** 记录用户操作行为

### 常见问题

#### 在 $onAction 中修改 Action 的返回值

**解决方案：**

```javascript
store.$onAction(({ after }) => {
    after((result) => {
        // after 回调可以接收 Action 的返回值
        // 但不能修改返回值（它只是监听）
        console.log("Action 返回:", result);
    });
});

// 如果需要修改行为，应该在 Action 内部处理
// 或使用 Pinia 插件包装 Action
```

### 注意事项

- $onAction 回调在 Action 执行前触发
- after 和 onError 回调在 Action 完成后触发
- 默认订阅在组件卸载时取消，传入 true 保持 detached
- 插件中的 $onAction 对所有 Store 实例生效
- 返回取消订阅的函数
- 不能通过 $onAction 阻止或修改 Action 的执行

### 总结

$onAction 监听 Store 中 Action 的调用，提供 Action 名称、参数，并通过 after/onError 回调监听成功和失败。适用于日志记录、性能监控、错误上报等横切关注点。在 Pinia 插件中使用可以全局监控所有 Store 的 Action。默认与组件生命周期绑定，传入 true 可以脱离。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### 模块化的Store分割

### 概念说明

Pinia 天然支持模块化的 Store 分割——每个 Store 都是一个独立的模块，拥有自己的 State、Getters 和 Actions。与 Vuex 的嵌套模块不同，Pinia 采用扁平化结构，所有 Store 平级存在，通过唯一 ID 标识，Store 之间可以相互引用。

模块化分割的核心思想是按业务领域划分 Store，每个 Store 只管理一个业务模块的状态。比如用户模块（useUserStore）、购物车模块（useCartStore）、商品模块（useProductStore）等。这种方式让代码组织清晰，每个 Store 体量小、职责明确、易于维护和测试。

Store 之间可以相互调用——在一个 Store 的 Action 或 Getter 中直接调用另一个 Store 的 useXxxStore() 即可。Pinia 会自动处理依赖关系，不需要额外配置。

### 基本示例

```
项目 Store 目录结构：

src/stores/
  ├── index.js          // 创建和导出 Pinia 实例
  ├── user.js           // 用户模块
  ├── auth.js           // 认证模块
  ├── cart.js           // 购物车模块
  ├── product.js        // 商品模块
  ├── order.js          // 订单模块
  └── settings.js       // 设置模块
```

```javascript
// stores/index.js
import { createPinia } from "pinia";

const pinia = createPinia();
export default pinia;
```

```javascript
// stores/auth.js — 认证模块
import { defineStore } from "pinia";

export const useAuthStore = defineStore("auth", {
    state: () => ({
        token: localStorage.getItem("token") || "",
        refreshToken: "",
    }),

    getters: {
        isLoggedIn: (state) => !!state.token,
    },

    actions: {
        async login(credentials) {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(credentials),
            });
            const data = await res.json();
            this.token = data.token;
            this.refreshToken = data.refreshToken;
            localStorage.setItem("token", data.token);
        },

        logout() {
            this.token = "";
            this.refreshToken = "";
            localStorage.removeItem("token");
        },
    },
});
```

```javascript
// stores/cart.js — 购物车模块（引用 auth 模块）
import { defineStore } from "pinia";
import { useAuthStore } from "./auth";

export const useCartStore = defineStore("cart", {
    state: () => ({
        items: [],
    }),

    getters: {
        totalPrice: (state) =>
            state.items.reduce((sum, i) => sum + i.price * i.quantity, 0),
        itemCount: (state) =>
            state.items.reduce((sum, i) => sum + i.quantity, 0),
    },

    actions: {
        addItem(product) {
            const existing = this.items.find((i) => i.id === product.id);
            if (existing) {
                existing.quantity++;
            } else {
                this.items.push({ ...product, quantity: 1 });
            }
        },

        // 跨 Store 调用：提交订单需要认证信息
        async checkout() {
            const authStore = useAuthStore();
            if (!authStore.isLoggedIn) {
                throw new Error("请先登录");
            }

            const res = await fetch("/api/orders", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${authStore.token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ items: this.items }),
            });

            if (res.ok) {
                this.items = []; // 清空购物车
            }
            return await res.json();
        },
    },
});
```

### 内部原理

#### Pinia 的扁平化架构

```
Pinia 与 Vuex 的模块架构对比：

Vuex（嵌套模块）：
  store
  ├── state
  ├── modules/
  │   ├── user/
  │   │   ├── state
  │   │   ├── mutations
  │   │   └── namespaced: true
  │   └── cart/
  │       ├── state
  │       └── mutations
  → 访问：store.state.user.name
  → 提交：store.commit('user/setName', '张三')
  → 嵌套结构，命名空间复杂

Pinia（扁平化）：
  pinia._s (Map)
  ├── "auth" → useAuthStore 实例
  ├── "cart" → useCartStore 实例
  ├── "user" → useUserStore 实例
  └── "product" → useProductStore 实例
  → 访问：useAuthStore().token
  → 调用：useCartStore().addItem(product)
  → 平级结构，直接引用

跨 Store 引用：
  → 在 Action/Getter 内部调用 useXxxStore()
  → Pinia 通过 inject 获取全局 Pinia 实例
  → 从 pinia._s 中获取目标 Store（不存在则创建）
  → 不需要额外配置，无循环依赖问题
```

### 与相关API的对比

| 特性 | Pinia 模块化 | Vuex 模块化 |
|------|------------|------------|
| 模块结构 | 扁平化 | 嵌套 |
| 命名空间 | 自动（ID） | 需要 namespaced |
| 跨模块调用 | 直接 useXxxStore() | rootState/rootGetters |
| TypeScript | 自动推导 | 需要额外声明 |
| 代码分割 | 天然支持 | 需要动态注册 |

### 适用场景

- **按业务领域分割：** 用户、商品、订单、支付
- **按功能分割：** 认证、通知、设置、主题
- **跨模块协作：** 订单模块引用用户和购物车模块

### 常见问题

#### 避免循环依赖

**解决方案：**

```javascript
// Store A
import { defineStore } from "pinia";
// 不要在顶层 import Store B（如果 B 也 import A）

export const useStoreA = defineStore("storeA", {
    actions: {
        doSomething() {
            // 在 Action 内部动态引入，避免循环依赖
            const { useStoreB } = require("./storeB");
            // 或在同一文件中已有引用时，直接在函数内调用
            const storeB = useStoreB();
            storeB.someAction();
        },
    },
});

// 大多数情况下，Pinia 的顶层 import 不会有循环依赖问题
// 因为 defineStore 返回的是函数，不是立即创建的实例
// 只有在函数调用时才真正获取 Store 实例
```

### 注意事项

- 每个 Store 一个文件，按业务模块分割
- Store 之间通过 useXxxStore() 相互引用
- 在 Action 或 Getter 内部调用其他 Store，不要在 state 中引用
- Store ID 全局唯一
- Pinia 不需要像 Vuex 那样注册模块
- 大型项目可以按 feature 目录组织 Store 文件

### 总结

Pinia 采用扁平化的模块架构，每个 Store 独立一个文件。Store 之间通过在 Action 或 Getter 中调用 useXxxStore() 相互引用，不需要命名空间和额外配置。按业务领域分割 Store，保持每个 Store 职责单一。与 Vuex 的嵌套模块相比，代码更简洁、TypeScript 支持更好、跨模块调用更直接。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### 插件系统与持久化存储

### 概念说明

Pinia 的插件系统允许开发者扩展所有 Store 的功能。插件是一个函数，接收一个上下文对象（包含 store、pinia、app、options），可以为每个 Store 添加属性、方法、订阅等。通过 `pinia.use(plugin)` 注册插件后，每个 Store 创建时都会自动执行插件逻辑。

持久化存储是 Pinia 插件最常见的应用场景之一。通过插件监听 State 变化并保存到 localStorage/sessionStorage，在 Store 创建时从存储中恢复状态，实现页面刷新后状态不丢失。社区中最流行的持久化插件是 `pinia-plugin-persistedstate`，提供了声明式的配置方式。

插件还可以用于添加全局属性（如 router）、错误处理、日志记录、性能监控等。

### 基本示例

```javascript
// plugins/persistence.js — 手动实现持久化插件
export function persistencePlugin({ store, options }) {
    // 检查 Store 是否配置了持久化
    // 自定义选项通过 options 传入
    const persistConfig = options.persist;
    if (!persistConfig) return;

    // 确定存储的 key
    const storageKey = typeof persistConfig === "object"
        ? persistConfig.key || store.$id
        : store.$id;

    // 确定使用的存储引擎
    const storage = typeof persistConfig === "object"
        ? persistConfig.storage || localStorage
        : localStorage;

    // Store 创建时：从存储中恢复状态
    const savedState = storage.getItem(storageKey);
    if (savedState) {
        try {
            store.$patch(JSON.parse(savedState));
        } catch (e) {
            console.warn(`恢复 ${store.$id} 状态失败:`, e);
            storage.removeItem(storageKey);
        }
    }

    // 监听状态变化：保存到存储
    store.$subscribe(
        (mutation, state) => {
            try {
                // 如果配置了 paths，只保存指定属性
                if (typeof persistConfig === "object" && persistConfig.paths) {
                    const partial = {};
                    persistConfig.paths.forEach((path) => {
                        partial[path] = state[path];
                    });
                    storage.setItem(storageKey, JSON.stringify(partial));
                } else {
                    storage.setItem(storageKey, JSON.stringify(state));
                }
            } catch (e) {
                console.warn(`保存 ${store.$id} 状态失败:`, e);
            }
        },
        { detached: true } // 脱离组件生命周期
    );
}
```

```javascript
// main.js — 注册插件
import { createApp } from "vue";
import { createPinia } from "pinia";
import { persistencePlugin } from "./plugins/persistence";
import App from "./App.vue";

const app = createApp(App);
const pinia = createPinia();

// 注册持久化插件
pinia.use(persistencePlugin);

app.use(pinia);
app.mount("#app");
```

```javascript
// stores/user.js — 使用持久化配置
import { defineStore } from "pinia";

export const useUserStore = defineStore("user", {
    state: () => ({
        token: "",
        name: "",
        avatar: "",
        preferences: {},
    }),

    // 自定义选项：启用持久化
    persist: {
        key: "app-user",              // 存储的 key
        storage: localStorage,         // 存储引擎
        paths: ["token", "name"],      // 只持久化指定属性
    },

    actions: {
        async login(credentials) {
            const res = await fetch("/api/login", {
                method: "POST",
                body: JSON.stringify(credentials),
            });
            const data = await res.json();
            this.token = data.token;
            this.name = data.name;
            // token 和 name 会自动保存到 localStorage
        },
    },
});
```

```javascript
// 使用社区插件 pinia-plugin-persistedstate
// npm install pinia-plugin-persistedstate

import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

// Store 中配置
export const useAuthStore = defineStore("auth", {
    state: () => ({ token: "", user: null }),
    persist: true, // 简单开启持久化
});

export const useSettingsStore = defineStore("settings", {
    state: () => ({ theme: "light", lang: "zh-CN", fontSize: 14 }),
    persist: {
        key: "app-settings",
        storage: sessionStorage, // 使用 sessionStorage
        pick: ["theme", "lang"], // 只持久化部分属性
    },
});
```

### 内部原理

#### Pinia 插件的执行机制

```
插件注册和执行流程：

1. 注册阶段
   pinia.use(myPlugin)
   → 将 myPlugin 添加到 pinia._p（插件列表）

2. Store 创建时
   useXxxStore() 首次调用
   → 创建 Store 实例
   → 遍历 pinia._p 中的所有插件
   → 对每个插件执行：plugin({ store, pinia, app, options })
   → 插件返回的对象会合并到 Store 上

3. 插件上下文
   {
       store,    // 当前 Store 实例
       pinia,    // Pinia 实例
       app,      // Vue App 实例
       options,  // defineStore 的选项（含自定义选项）
   }

4. 插件可以做的事
   → store.xxx = value      — 添加属性
   → store.$subscribe(...)  — 监听状态变化
   → store.$onAction(...)   — 监听 Action
   → 返回对象               — 合并到 Store
```

### 与相关API的对比

| 持久化方案 | 配置方式 | 功能 | 适用场景 |
|-----------|---------|------|---------|
| 手写插件 | 自定义 | 完全可控 | 特殊需求 |
| pinia-plugin-persistedstate | 声明式 | 成熟稳定 | 生产项目 |
| 手动 $subscribe | 命令式 | 简单 | 单个 Store |

### 适用场景

- **状态持久化：** localStorage/sessionStorage 存储
- **全局属性注入：** router、i18n 注入到每个 Store
- **日志和监控：** 统一记录所有 Store 的操作
- **错误处理：** 统一为所有 Action 添加错误处理

### 常见问题

#### 插件添加的属性在 TypeScript 中没有类型提示

**解决方案：**

```typescript
// 声明模块扩展
import "pinia";

declare module "pinia" {
    export interface PiniaCustomProperties {
        // 添加到每个 Store 的自定义属性
        router: Router;
    }

    export interface DefineStoreOptionsBase<S, Store> {
        // 自定义 Store 选项
        persist?: boolean | {
            key?: string;
            storage?: Storage;
            paths?: string[];
        };
    }
}
```

### 注意事项

- 插件对所有 Store 生效，通过 options 区分
- 插件返回的对象会合并到 Store 实例上
- 持久化插件需要处理 JSON 序列化失败的情况
- 敏感数据（如 token）持久化需要考虑安全性
- 生产项目推荐使用 pinia-plugin-persistedstate
- 插件中添加的响应式属性需要用 ref() 或 reactive()

### 总结

Pinia 插件通过 pinia.use() 注册，在每个 Store 创建时执行，接收 store/pinia/app/options 上下文。最常见的应用是状态持久化——监听 $subscribe 保存状态，Store 创建时恢复状态。生产项目推荐使用 pinia-plugin-persistedstate 社区插件。插件还可以用于全局属性注入、日志记录、错误处理等横切关注点。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。



## 7.9 路由(Vue Router 4)

### createRouter的路由实例创建

### 概念说明

`createRouter` 是 Vue Router 4 提供的工厂函数，用于创建路由实例。Vue Router 4 抛弃了 Vue Router 3 中 `new Router()` 的构造函数写法，改为函数式的 `createRouter()`，与 Vue 3 的 `createApp()` 风格保持一致。

createRouter 接收一个配置对象，包含两个必选属性：`history`（路由模式）和 `routes`（路由配置数组）。此外还支持多个可选配置：`scrollBehavior`（滚动行为）、`linkActiveClass`（活跃链接类名）、`linkExactActiveClass`（精确活跃类名）、`parseQuery`/`stringifyQuery`（自定义查询参数序列化）等。

创建的路由实例需要通过 `app.use(router)` 注册到 Vue 应用中，这会注入全局的 `<RouterView>` 和 `<RouterLink>` 组件，并提供 `useRoute()` 和 `useRouter()` 组合式函数。

### 基本示例

```javascript
// router/index.js
import { createRouter, createWebHistory } from "vue-router";
import HomeView from "@/views/HomeView.vue";
import AboutView from "@/views/AboutView.vue";

// 创建路由实例
const router = createRouter({
    // history：路由模式（必选）
    history: createWebHistory(import.meta.env.BASE_URL),

    // routes：路由配置数组（必选）
    routes: [
        {
            path: "/",
            name: "home",
            component: HomeView,
        },
        {
            path: "/about",
            name: "about",
            component: AboutView,
        },
        {
            path: "/user/:id",
            name: "user",
            // 路由懒加载
            component: () => import("@/views/UserView.vue"),
        },
    ],

    // scrollBehavior：滚动行为（可选）
    scrollBehavior(to, from, savedPosition) {
        if (savedPosition) {
            return savedPosition; // 浏览器前进/后退时恢复位置
        }
        return { top: 0 }; // 新导航滚动到顶部
    },

    // linkActiveClass：自定义活跃链接类名（可选）
    linkActiveClass: "active",
    linkExactActiveClass: "exact-active",
});

export default router;
```

```javascript
// main.js
import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";

const app = createApp(App);

// 注册路由插件
app.use(router);

// 等路由准备就绪后再挂载
// 确保初始导航完成，异步路由组件加载完毕
router.isReady().then(() => {
    app.mount("#app");
});
```

### 内部原理

#### createRouter 的初始化流程

```
createRouter 的内部工作：

1. 解析路由配置
   → 将 routes 数组编译为路由匹配器（route matcher）
   → 每个路由生成正则表达式用于路径匹配
   → 嵌套路由生成层级匹配器

2. 创建路由实例对象
   → 包含 push/replace/go/back/forward 导航方法
   → 包含 beforeEach/beforeResolve/afterEach 守卫注册
   → 包含 addRoute/removeRoute 动态路由方法
   → 包含 currentRoute（当前路由的响应式引用）

3. app.use(router) 注册时
   → 注册全局组件：RouterView、RouterLink
   → 通过 provide 注入路由实例和当前路由
   → 设置全局属性 $router 和 $route
   → 执行初始导航

4. 初始导航
   → 根据当前 URL 匹配路由
   → 执行导航守卫
   → 加载异步组件
   → router.isReady() 在此完成后 resolve
```

### 与相关API的对比

| 特性 | Vue Router 4 | Vue Router 3 |
|------|-------------|-------------|
| 创建方式 | createRouter() | new Router() |
| 路由模式 | createWebHistory() | mode: 'history' |
| TypeScript | 完整类型推导 | 类型支持有限 |
| 组合式 API | useRoute/useRouter | this.$route/$router |

### 适用场景

- **SPA 应用：** 单页面应用的路由管理
- **多页面切换：** 页面级别的组件切换
- **权限控制：** 配合导航守卫实现路由权限
- **SSR 应用：** 配合 createMemoryHistory 实现服务端路由

### 常见问题

#### router.isReady() 的作用

**解决方案：**

```javascript
// 问题：应用挂载时初始路由可能还没解析完成
// 解决：等待 isReady 后再挂载

const app = createApp(App);
app.use(router);

// 确保初始导航完成（异步组件加载、守卫执行）
router.isReady().then(() => {
    app.mount("#app");
});

// 在 SSR 场景中尤其重要
// 服务端需要等待所有异步路由组件加载完毕才能渲染
```

### 注意事项

- createRouter 替代了 Vue Router 3 的 new Router()
- history 和 routes 是必选配置
- 推荐使用 router.isReady() 等待初始导航完成后挂载
- 路由实例是单例的，整个应用共享
- SSR 场景使用 createMemoryHistory
- 路由懒加载使用 `() => import()` 语法

### 总结

createRouter 是 Vue Router 4 创建路由实例的工厂函数，接收 history（路由模式）和 routes（路由配置）两个必选参数。通过 app.use(router) 注册到应用，注入全局组件和组合式 API。推荐使用 router.isReady() 等待初始导航完成后再挂载应用。与 Vue Router 3 相比，API 更函数化，TypeScript 支持更完善。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### createWebHistory的History模式

### 概念说明

`createWebHistory` 创建基于 HTML5 History API 的路由模式。这种模式使用浏览器的 `history.pushState` 和 `history.replaceState` 来管理 URL，生成干净的 URL 路径（如 `/about`、`/user/123`），没有 `#` 号。

History 模式的 URL 看起来和传统多页面应用一样：`https://example.com/user/profile`。这种 URL 对 SEO 更友好，用户体验也更好。但它有一个前提——服务器需要正确配置，将所有路由请求都指向 `index.html`，否则用户直接访问或刷新非根路径时会得到 404 错误。

createWebHistory 接收一个可选的 `base` 参数，用于指定应用的基础路径。比如应用部署在 `https://example.com/app/` 下，base 应设为 `/app/`。

### 基本示例

```javascript
import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
    // 创建 History 模式
    // import.meta.env.BASE_URL 来自 Vite 的 base 配置
    history: createWebHistory(import.meta.env.BASE_URL),

    routes: [
        { path: "/", component: () => import("@/views/Home.vue") },
        { path: "/about", component: () => import("@/views/About.vue") },
        { path: "/user/:id", component: () => import("@/views/User.vue") },
    ],
});

// URL 示例：
// https://example.com/           → Home
// https://example.com/about      → About
// https://example.com/user/123   → User
```

```nginx
### Nginx 服务器配置（History 模式必需）
server {
    listen 80;
    server_name example.com;
    root /usr/share/nginx/html;

    location / {
        # 尝试匹配静态文件，找不到则返回 index.html
        try_files $uri $uri/ /index.html;
    }
}
```

### 内部原理

#### History API 的路由实现

```
createWebHistory 的工作机制：

导航时（如点击 RouterLink）：
  1. 调用 history.pushState(state, '', '/about')
  2. 浏览器地址栏变为 /about（不刷新页面）
  3. Vue Router 匹配 /about 对应的组件
  4. 渲染对应组件到 RouterView

浏览器前进/后退时：
  1. 浏览器触发 popstate 事件
  2. Vue Router 监听 popstate
  3. 从 event.state 获取路由信息
  4. 匹配并渲染对应组件

直接访问/刷新时（如 /about）：
  1. 浏览器向服务器发送 GET /about 请求
  2. 服务器没有 /about 对应的文件
  3. 如果未配置 fallback → 返回 404
  4. 配置 try_files 后 → 返回 index.html
  5. index.html 加载 JS → Vue Router 解析 URL → 渲染对应组件
```

### 与相关API的对比

| 特性 | History 模式 | Hash 模式 |
|------|------------|----------|
| URL 格式 | /about | /#/about |
| 服务器配置 | 需要 | 不需要 |
| SEO | 友好 | 不友好 |
| 兼容性 | IE10+ | 全兼容 |
| SSR 支持 | 支持 | 不支持 |

### 适用场景

- **生产级 SPA：** 需要干净 URL 的正式项目
- **SEO 需求：** 需要搜索引擎收录的页面
- **SSR/SSG：** 服务端渲染或静态生成的应用
- **企业应用：** 需要专业 URL 的后台管理系统

### 常见问题

#### 部署后刷新页面 404

**解决方案：**

```
不同服务器的配置：

Apache (.htaccess)：
  <IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
  </IfModule>

Node.js (Express)：
  const history = require('connect-history-api-fallback');
  app.use(history());
  app.use(express.static('dist'));

Vercel (vercel.json)：
  { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

### 注意事项

- 必须配置服务器的 fallback 到 index.html
- base 参数需要与部署路径一致
- 直接访问/刷新时依赖服务器配置
- 开发服务器（Vite/Webpack）默认已配置 fallback
- 需要在前端配置 404 路由捕获未匹配路径
- SSR 场景需要服务端也配置路由匹配

### 总结

createWebHistory 基于 HTML5 History API 实现干净的 URL 路由，没有 # 号。SEO 友好，用户体验好。但需要服务器配置将所有路径 fallback 到 index.html，否则刷新会 404。通过 base 参数指定部署基础路径。是生产级 SPA 的推荐路由模式。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### createWebHashHistory的Hash模式

### 概念说明

`createWebHashHistory` 创建基于 URL hash（`#`）的路由模式。在这种模式下，路由路径放在 `#` 后面（如 `https://example.com/#/about`），hash 部分的变化不会触发浏览器向服务器发送请求，因此不需要任何服务器端配置。

Hash 模式利用 `window.location.hash` 和 `hashchange` 事件来实现路由切换。由于 `#` 后面的内容不会发送给服务器，即使用户刷新页面，服务器收到的请求始终是根路径，然后由前端 JS 解析 hash 部分来匹配路由。

Hash 模式的优势是零服务器配置，兼容性极好；缺点是 URL 不够美观（带 `#`），对 SEO 不友好（搜索引擎通常忽略 hash 部分），不支持 SSR。

### 基本示例

```javascript
import { createRouter, createWebHashHistory } from "vue-router";

const router = createRouter({
    // 创建 Hash 模式
    history: createWebHashHistory(),

    routes: [
        { path: "/", component: () => import("@/views/Home.vue") },
        { path: "/about", component: () => import("@/views/About.vue") },
        { path: "/user/:id", component: () => import("@/views/User.vue") },
    ],
});

// URL 示例：
// https://example.com/#/           → Home
// https://example.com/#/about      → About
// https://example.com/#/user/123   → User

// 同样支持 base 参数
// createWebHashHistory('/app/')
// → https://example.com/app/#/about
```

### 内部原理

#### Hash 路由的工作机制

```
Hash 模式的工作流程：

导航时：
  1. 修改 window.location.hash = '#/about'
  2. 浏览器地址栏变为 /#/about
  3. 触发 hashchange 事件
  4. Vue Router 监听 hashchange
  5. 解析 hash 中的路径 → /about
  6. 匹配路由并渲染组件

刷新页面时：
  1. 浏览器向服务器请求 https://example.com/
  2. 服务器返回 index.html（# 后面的内容不发送）
  3. JS 加载后读取 window.location.hash
  4. 解析 hash → 匹配路由 → 渲染组件
  5. 不需要服务器特殊配置

为什么不需要服务器配置：
  → # 是 URL 的片段标识符（fragment）
  → 浏览器规范规定 # 后面的内容不发送给服务器
  → 服务器始终收到根路径请求
  → 返回 index.html 即可
```

### 与相关API的对比

| 特性 | Hash 模式 | History 模式 | Memory 模式 |
|------|----------|------------|------------|
| URL 格式 | /#/path | /path | 无 URL |
| 服务器配置 | 不需要 | 需要 | 不适用 |
| SEO | 不友好 | 友好 | 不适用 |
| SSR | 不支持 | 支持 | 服务端用 |
| 兼容性 | 全兼容 | IE10+ | 全兼容 |

### 适用场景

- **静态文件托管：** GitHub Pages、S3 等无法配置 fallback 的环境
- **内网应用：** 不需要 SEO 的企业内部系统
- **快速原型：** 不想配置服务器的开发原型
- **Electron 应用：** 桌面应用不需要服务器配置

### 常见问题

#### Hash 模式下锚点定位失效

**解决方案：**

```javascript
// Hash 模式占用了 # 号，原生锚点定位失效
// 解决方案：使用 scrollBehavior 手动处理

const router = createRouter({
    history: createWebHashHistory(),
    routes: [/* ... */],
    scrollBehavior(to) {
        // 如果路由有 hash（如 #section），滚动到对应元素
        if (to.hash) {
            return {
                el: to.hash,
                behavior: "smooth",
            };
        }
        return { top: 0 };
    },
});
```

### 注意事项

- URL 中包含 `#` 号，不够美观
- 搜索引擎通常忽略 hash 部分，SEO 不友好
- 不支持 SSR
- 不需要服务器配置，部署简单
- 原生锚点功能被占用，需要手动处理
- 微信等平台可能对 hash URL 有特殊处理

### 总结

createWebHashHistory 基于 URL hash 实现路由，URL 格式为 `/#/path`。不需要服务器配置，兼容性好，部署简单。缺点是 URL 带 `#`、SEO 不友好、不支持 SSR。适合静态托管、内网应用等不需要 SEO 的场景。对于需要美观 URL 和 SEO 的项目，推荐使用 History 模式。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### History模式的SSR与404处理

### 概念说明

History 模式下，服务器需要将所有未匹配到静态资源的请求都指向 `index.html`，这意味着服务器不再返回真正的 404 页面。当用户访问一个不存在的路径时，服务器仍然返回 `index.html`，然后由前端路由来判断路径是否有效。

因此，前端需要定义一个"兜底路由"来捕获所有未匹配的路径，显示自定义的 404 页面。这通常通过在路由配置的最后添加一个通配符路由 `path: '/:pathMatch(.*)*'` 来实现。

在 SSR（服务端渲染）场景中，History 模式是必须的，因为服务器需要根据请求路径匹配路由并渲染对应的 HTML。Hash 模式不支持 SSR，因为服务器收不到 hash 部分的信息。SSR 中使用 `createMemoryHistory` 在服务端创建路由实例。

### 基本示例

```javascript
// router/index.js
import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: "/", name: "home", component: () => import("@/views/Home.vue") },
        { path: "/about", name: "about", component: () => import("@/views/About.vue") },
        { path: "/user/:id", name: "user", component: () => import("@/views/User.vue") },

        // 兜底路由：捕获所有未匹配的路径
        // 必须放在路由配置的最后
        {
            path: "/:pathMatch(.*)*",
            name: "not-found",
            component: () => import("@/views/NotFound.vue"),
        },
    ],
});

export default router;
```

```vue
<!-- views/NotFound.vue -->
<script setup>
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

function goHome() {
    router.push("/");
}
</script>

<template>
    <div class="not-found">
        <h1>404</h1>
        <p>页面 "{{ route.fullPath }}" 不存在</p>
        <button @click="goHome">返回首页</button>
    </div>
</template>
```

```javascript
// SSR 场景：服务端使用 createMemoryHistory
// server.js
import { createRouter, createMemoryHistory } from "vue-router";
import { routes } from "./router/routes";

export function createServerRouter() {
    return createRouter({
        // 服务端使用 Memory 模式
        history: createMemoryHistory(),
        routes,
    });
}

// 服务端渲染时：
// const router = createServerRouter();
// router.push(req.url);  // 根据请求 URL 导航
// await router.isReady(); // 等待异步组件
// 渲染 HTML...
```

### 内部原理

#### 404 处理和 SSR 的路由解析

```
History 模式的 404 处理流程：

1. 用户访问 /not-exist-page
2. 服务器 try_files 未找到文件 → 返回 index.html
3. 前端 JS 加载 → Vue Router 初始化
4. 解析 URL /not-exist-page
5. 按顺序匹配路由配置：
   → / → 不匹配
   → /about → 不匹配
   → /user/:id → 不匹配
   → /:pathMatch(.*)* → 匹配（兜底）
6. 渲染 NotFound 组件

SSR 的路由解析：
  客户端：createWebHistory() → 读取浏览器 URL
  服务端：createMemoryHistory() → 通过 router.push(req.url) 设置 URL
  → 两端使用相同的 routes 配置
  → 服务端渲染 HTML 后发送给客户端
  → 客户端 hydrate 后接管路由
```

### 与相关API的对比

| 场景 | History 模式 | Hash 模式 |
|------|------------|----------|
| SSR | 支持 | 不支持 |
| 404 处理 | 前端兜底路由 | 前端兜底路由 |
| 服务器 404 | 需要 fallback 配置 | 不需要 |
| SEO 404 | 可配置正确状态码 | 无法控制 |

### 适用场景

- **SSR 应用：** Nuxt.js 等服务端渲染框架
- **SEO 关键页面：** 需要正确 404 状态码的站点
- **大型 SPA：** 需要友好错误页面的项目

### 常见问题

#### 服务器返回正确的 404 状态码

**解决方案：**

```javascript
// Node.js + Express SSR 场景
app.get("*", async (req, res) => {
    const router = createServerRouter();
    router.push(req.url);
    await router.isReady();

    const matchedRoute = router.currentRoute.value;

    // 检查是否匹配到 404 路由
    if (matchedRoute.name === "not-found") {
        res.status(404); // 设置正确的 HTTP 状态码
    }

    // 渲染 HTML
    const html = await renderToString(app);
    res.send(html);
});
```

### 注意事项

- 兜底路由必须放在 routes 数组的最后
- Vue Router 4 用 `/:pathMatch(.*)*` 替代 Vue Router 3 的 `*`
- SSR 服务端用 createMemoryHistory，客户端用 createWebHistory
- 纯 SPA 的 404 只是前端展示，HTTP 状态码仍为 200
- SSR 可以返回正确的 404 状态码
- 服务器 fallback 配置不要覆盖 API 路由

### 总结

History 模式需要服务器 fallback 配置和前端兜底路由来处理 404。兜底路由使用 `/:pathMatch(.*)*` 通配符捕获未匹配路径。SSR 场景必须使用 History 模式，服务端用 createMemoryHistory，可以返回正确的 HTTP 404 状态码。纯 SPA 的 404 只是前端展示。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### Hash模式的兼容性优势

### 概念说明

Hash 模式的核心兼容性优势在于它完全不依赖服务器配置。由于 URL 中 `#` 后面的内容（hash fragment）不会被浏览器发送给服务器，服务器始终只收到根路径请求。这意味着无论部署在什么环境——静态文件托管（GitHub Pages、Netlify、S3）、共享主机、CDN，甚至本地直接打开 HTML 文件——都能正常工作。

Hash 模式还兼容所有浏览器，包括不支持 HTML5 History API 的老旧浏览器。虽然现代浏览器都已支持 History API，但在某些特殊环境（如嵌入式 WebView、某些企业内网浏览器）中，Hash 模式仍然是更安全的选择。

此外，Hash 模式在微前端、iframe 嵌套等场景中也有优势——hash 变化不会导致父页面刷新，与宿主环境的冲突更少。

### 基本示例

```javascript
import { createRouter, createWebHashHistory } from "vue-router";

const router = createRouter({
    // Hash 模式：零配置部署
    history: createWebHashHistory(),
    routes: [
        { path: "/", component: () => import("@/views/Home.vue") },
        { path: "/dashboard", component: () => import("@/views/Dashboard.vue") },
    ],
});

// 部署到 GitHub Pages：
//   直接将 dist 目录推送到 gh-pages 分支
//   无需任何服务器配置
//   URL: https://username.github.io/repo/#/dashboard

// 部署到 S3 静态托管：
//   直接上传 dist 目录
//   无需配置重定向规则
//   URL: https://bucket.s3.amazonaws.com/#/dashboard

// 本地打开 HTML 文件（file://）：
//   双击 dist/index.html 也能正常路由
//   file:///C:/project/dist/index.html#/dashboard
```

### 内部原理

#### Hash 模式的兼容性原理

```
Hash 模式在不同环境下的工作：

静态文件托管（无服务器配置）：
  请求: GET https://cdn.com/index.html
  服务器返回: index.html（唯一的 HTML 文件）
  JS 读取: window.location.hash → "#/dashboard"
  路由匹配: /dashboard → 渲染对应组件
  → 无论怎么刷新，服务器都返回同一个 index.html

对比 History 模式在相同环境：
  请求: GET https://cdn.com/dashboard
  服务器: 没有 /dashboard 文件 → 404
  → 需要配置 fallback 才能工作

file:// 协议下：
  Hash 模式: file:///index.html#/about → 正常工作
  History 模式: file:///about → 找不到文件 → 失败

微前端/iframe 中：
  Hash 变化 → 不触发页面刷新 → 不影响父窗口
  History pushState → 可能与宿主路由冲突
```

### 与相关API的对比

| 部署环境 | Hash 模式 | History 模式 |
|---------|----------|------------|
| GitHub Pages | 直接可用 | 需要 404.html hack |
| S3/OSS | 直接可用 | 需要重定向规则 |
| Nginx/Apache | 直接可用 | 需要 try_files 配置 |
| CDN 纯静态 | 直接可用 | 不支持 |
| file:// 协议 | 可用 | 不可用 |
| iframe 嵌套 | 安全 | 可能冲突 |

### 适用场景

- **GitHub Pages：** 开源项目文档、个人博客
- **静态托管：** S3、OSS、CDN 等无服务器配置的环境
- **企业内网：** 无法修改服务器配置的内网应用
- **桌面应用：** Electron、CEF 等嵌入式浏览器
- **微前端：** 作为子应用避免与主应用路由冲突

### 常见问题

#### 从 Hash 模式迁移到 History 模式

**解决方案：**

```javascript
// 只需要修改一行代码
// 迁移前：
// history: createWebHashHistory()

// 迁移后：
// history: createWebHistory()

// 但需要同时：
// 1. 配置服务器 fallback（Nginx try_files 等）
// 2. 处理旧 Hash URL 的重定向

// 在路由守卫中处理旧 Hash URL
router.beforeEach((to) => {
    // 如果用户从旧书签访问 /#/about
    if (window.location.hash.startsWith("#/")) {
        const path = window.location.hash.slice(1); // 去掉 #
        return path; // 重定向到 History 模式的路径
    }
});
```

### 注意事项

- URL 带 `#` 号，视觉上不够美观
- SEO 不友好，搜索引擎忽略 hash
- 不支持 SSR
- 微信分享等场景可能对 hash URL 有特殊处理
- 原生锚点定位（如 `#section`）被占用
- 从 Hash 迁移到 History 需要处理旧 URL 重定向

### 总结

Hash 模式的兼容性优势在于零服务器配置、全浏览器兼容、支持 file:// 协议和静态托管。适合 GitHub Pages、S3、CDN 等无法配置 fallback 的环境，以及微前端、Electron 等特殊场景。缺点是 URL 不美观、SEO 不友好。如果项目不需要 SEO 且部署环境受限，Hash 模式是最简单可靠的选择。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### routes数组的路由配置

### 概念说明

`routes` 是 `createRouter` 的核心配置，是一个路由记录（RouteRecordRaw）数组，定义了 URL 路径与组件之间的映射关系。每个路由记录包含 `path`（路径）、`component`（组件）等属性，还可以包含 `name`（命名路由）、`meta`（元信息）、`children`（子路由）、`redirect`（重定向）、`alias`（别名）、`props`（传参）、`beforeEnter`（路由独享守卫）等可选属性。

路由匹配按照 routes 数组中的定义顺序进行，但 Vue Router 4 内部会根据路由的"具体程度"进行智能排序——更具体的路由优先匹配。比如 `/user/profile` 会优先于 `/user/:id` 匹配。不过兜底路由 `/:pathMatch(.*)*` 仍需放在最后。

### 基本示例

```javascript
import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
    history: createWebHistory(),
    routes: [
        // 基本路由：path + component
        {
            path: "/",
            name: "home",
            component: () => import("@/views/Home.vue"),
        },

        // 命名路由 + meta 元信息
        {
            path: "/about",
            name: "about",
            component: () => import("@/views/About.vue"),
            meta: { title: "关于我们", requiresAuth: false },
        },

        // 重定向
        {
            path: "/old-path",
            redirect: "/new-path",
        },

        // 别名：同一个组件可以通过多个路径访问
        {
            path: "/settings",
            alias: ["/preferences", "/config"],
            component: () => import("@/views/Settings.vue"),
        },

        // 嵌套路由
        {
            path: "/user/:id",
            component: () => import("@/layouts/UserLayout.vue"),
            children: [
                { path: "", component: () => import("@/views/UserHome.vue") },
                { path: "profile", component: () => import("@/views/UserProfile.vue") },
            ],
        },

        // 路由独享守卫
        {
            path: "/admin",
            component: () => import("@/views/Admin.vue"),
            meta: { requiresAuth: true, role: "admin" },
            beforeEnter: (to, from) => {
                // 检查权限
                const hasPermission = checkAdminPermission();
                if (!hasPermission) return "/login";
            },
        },

        // 兜底 404 路由
        {
            path: "/:pathMatch(.*)*",
            name: "not-found",
            component: () => import("@/views/NotFound.vue"),
        },
    ],
});
```

### 内部原理

#### 路由匹配的优先级

```
Vue Router 4 的路由匹配优先级：

路由按"具体程度"排序（自动计算分值）：
  静态路径段 > 动态参数 > 通配符

示例路由：
  /user/profile     → 分值最高（全静态）
  /user/:id         → 分值中等（有动态段）
  /user/:id(\\d+)   → 分值中高（有约束的动态段）
  /:pathMatch(.*)*  → 分值最低（通配符）

匹配过程：
  访问 /user/profile
  → 先尝试 /user/profile → 匹配 ✓
  → 不会尝试 /user/:id

  访问 /user/123
  → 尝试 /user/profile → 不匹配
  → 尝试 /user/:id → 匹配 ✓

RouteRecordRaw 的完整属性：
  path:        string          — 路径模式（必选）
  component:   Component       — 对应组件
  components:  Record          — 命名视图的多组件
  name:        string          — 路由名称
  redirect:    string|object   — 重定向目标
  alias:       string|string[] — 路径别名
  children:    RouteRecord[]   — 子路由
  meta:        object          — 元信息
  props:       boolean|object  — 传参配置
  beforeEnter: Guard           — 路由独享守卫
```

### 与相关API的对比

| 属性 | 类型 | 作用 | 必选 |
|------|------|------|------|
| path | string | 匹配路径 | 是 |
| component | Component | 渲染组件 | 非重定向时 |
| name | string | 命名路由 | 否 |
| meta | object | 元信息 | 否 |
| children | array | 子路由 | 否 |
| redirect | string/object | 重定向 | 否 |
| alias | string/array | 路径别名 | 否 |
| beforeEnter | function | 独享守卫 | 否 |

### 适用场景

- **基本页面映射：** path + component 建立页面路由
- **权限控制：** meta 标记 + 导航守卫判断
- **布局系统：** 嵌套路由实现不同布局
- **URL 迁移：** redirect 和 alias 处理旧 URL

### 常见问题

#### meta 类型在 TypeScript 中的扩展

**解决方案：**

```typescript
// 扩展 RouteMeta 类型
import "vue-router";

declare module "vue-router" {
    interface RouteMeta {
        title?: string;
        requiresAuth?: boolean;
        role?: string;
        keepAlive?: boolean;
    }
}

// 使用时有完整类型提示
const routes = [
    {
        path: "/admin",
        meta: { title: "管理后台", requiresAuth: true, role: "admin" },
        component: () => import("@/views/Admin.vue"),
    },
];
```

### 注意事项

- 路由按具体程度自动排序，但兜底路由仍需放最后
- name 在整个应用中必须唯一
- meta 信息可以在导航守卫中通过 to.meta 访问
- 懒加载组件使用 `() => import()` 语法
- redirect 路由不需要 component
- 动态路由参数通过 `:param` 语法定义

### 总结

routes 数组定义 URL 与组件的映射关系，支持 path、component、name、meta、children、redirect、alias、beforeEnter 等属性。Vue Router 4 根据路由的具体程度自动计算匹配优先级。meta 用于存储权限、标题等元信息。命名路由便于程序化导航。懒加载通过动态 import 实现代码分割。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### 动态路由的props解耦

### 概念说明

默认情况下，组件通过 `useRoute().params` 获取动态路由参数，这使得组件与路由紧密耦合——组件只能在路由环境下使用。通过路由配置的 `props` 选项，可以将路由参数自动作为 props 传递给组件，实现组件与路由的解耦。

`props` 选项支持三种模式：

**布尔模式（`props: true`）：** 将 `route.params` 的所有属性作为 props 传递给组件。

**对象模式（`props: { key: value }`）：** 传递静态 props，与路由参数无关。

**函数模式（`props: (route) => ({ ... })`）：** 接收 route 对象，返回要传递的 props 对象，可以自由组合 params、query 等。

解耦后的组件可以不依赖路由单独使用，也更容易进行单元测试。

### 基本示例

```javascript
const routes = [
    // 布尔模式：params 自动传为 props
    {
        path: "/user/:id",
        component: () => import("@/views/User.vue"),
        props: true,
        // /user/123 → 组件接收 props: { id: '123' }
    },

    // 对象模式：传递静态 props
    {
        path: "/promotion",
        component: () => import("@/views/Banner.vue"),
        props: { title: "春季促销", discount: 0.8 },
    },

    // 函数模式：自由组合
    {
        path: "/search/:category",
        component: () => import("@/views/Search.vue"),
        props: (route) => ({
            category: route.params.category,
            keyword: route.query.q || "",
            page: Number(route.query.page) || 1,
        }),
        // /search/phone?q=华为&page=2
        // → props: { category: 'phone', keyword: '华为', page: 2 }
    },

    // 命名视图中为不同视图设置不同 props
    {
        path: "/dashboard/:id",
        components: {
            default: () => import("@/views/Dashboard.vue"),
            sidebar: () => import("@/views/Sidebar.vue"),
        },
        props: {
            default: true,           // 默认视图：params 传 props
            sidebar: { collapsed: false }, // 侧边栏：静态 props
        },
    },
];
```

```vue
<!-- User.vue：通过 props 接收路由参数 -->
<script setup>
// 声明 props（与路由解耦）
const props = defineProps({
    id: {
        type: String,
        required: true,
    },
});

// 直接使用 props.id，不需要 useRoute()
console.log("用户ID:", props.id);
</script>

<template>
    <div>用户ID: {{ id }}</div>
</template>

<!-- 
  解耦的好处：
  1. 组件可以脱离路由单独使用
     <User id="456" />
  2. 单元测试时直接传 props
     mount(User, { props: { id: '789' } })
-->
```

### 内部原理

#### props 解耦的工作机制

```
Vue Router 处理 props 选项的流程：

1. 路由匹配成功后，检查 props 配置
2. 根据模式计算要传递的 props：
   → props: true → 使用 route.params
   → props: { ... } → 使用静态对象
   → props: (route) => ({ ... }) → 调用函数获取结果

3. 渲染组件时，将计算出的 props 传递给组件
   等价于：<Component v-bind="computedProps" />

4. 组件通过 defineProps 声明并接收

不同模式的计算：
  布尔模式：
    computedProps = route.params
    // { id: '123' }

  对象模式：
    computedProps = { title: '促销', discount: 0.8 }
    // 始终相同

  函数模式：
    computedProps = propsFn(route)
    // 每次导航都重新计算
```

### 与相关API的对比

| 获取参数方式 | 耦合度 | 可测试性 | 灵活性 |
|------------|--------|---------|--------|
| useRoute().params | 高（依赖路由） | 低 | 中 |
| props: true | 低（解耦） | 高 | 低（仅 params） |
| props: function | 低（解耦） | 高 | 高（自由组合） |

### 适用场景

- **可复用组件：** 组件既可路由访问也可直接引用
- **单元测试：** 测试时直接传 props，不需要模拟路由
- **类型转换：** 函数模式中将字符串参数转为数字
- **组合参数：** 合并 params 和 query 为统一的 props

### 常见问题

#### params 值是字符串，需要类型转换

**解决方案：**

```javascript
// 使用函数模式进行类型转换
{
    path: "/product/:id",
    component: () => import("@/views/Product.vue"),
    props: (route) => ({
        id: Number(route.params.id), // 字符串转数字
    }),
}
```

```vue
<script setup>
const props = defineProps({
    id: {
        type: Number, // 现在是数字类型
        required: true,
    },
});
</script>
```

### 注意事项

- props: true 只传递 params，不传递 query
- 需要 query 参数时使用函数模式
- 函数模式每次导航都会执行
- 命名视图需要为每个视图单独配置 props
- 解耦后组件可以独立使用和测试
- 参数类型转换建议在函数模式中完成

### 总结

props 选项将路由参数解耦为组件的 props，支持布尔模式（传 params）、对象模式（传静态值）和函数模式（自由组合）。解耦后组件不依赖路由，可独立使用和测试。函数模式最灵活，可以合并 params/query 并进行类型转换。命名视图需要为每个视图单独配置。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### 嵌套路由的children配置

### 概念说明

嵌套路由通过路由配置中的 `children` 属性定义子路由，用于实现页面内部的局部切换。父路由的组件中通过 `<RouterView>` 渲染匹配到的子路由组件，形成多层嵌套的视图结构。

这种机制非常适合实现布局系统：外层路由定义布局框架（如侧边栏 + 头部），内层子路由定义具体的页面内容。用户切换子路由时只有 `<RouterView>` 中的内容变化，布局部分保持不变。

children 中 `path` 为空字符串的路由是默认子路由，当访问父路由路径时渲染。子路由的 path 不需要以 `/` 开头，它会自动拼接父路由的路径。如果以 `/` 开头则变成绝对路径，不再拼接。

### 基本示例

```javascript
const routes = [
    {
        path: "/admin",
        component: () => import("@/layouts/AdminLayout.vue"),
        children: [
            // 默认子路由：/admin
            {
                path: "",
                name: "admin-home",
                component: () => import("@/views/admin/Dashboard.vue"),
            },
            // /admin/users
            {
                path: "users",
                name: "admin-users",
                component: () => import("@/views/admin/Users.vue"),
            },
            // /admin/users/:id — 深层嵌套
            {
                path: "users/:id",
                component: () => import("@/layouts/UserDetail.vue"),
                children: [
                    { path: "", component: () => import("@/views/admin/UserOverview.vue") },
                    { path: "posts", component: () => import("@/views/admin/UserPosts.vue") },
                    { path: "settings", component: () => import("@/views/admin/UserSettings.vue") },
                ],
            },
            // /admin/settings
            {
                path: "settings",
                name: "admin-settings",
                component: () => import("@/views/admin/Settings.vue"),
            },
        ],
    },
];
```

```vue
<!-- AdminLayout.vue：父路由组件 -->
<script setup>
import { RouterView, RouterLink } from "vue-router";
</script>

<template>
    <div class="admin-layout">
        <aside class="sidebar">
            <nav>
                <RouterLink to="/admin">首页</RouterLink>
                <RouterLink to="/admin/users">用户管理</RouterLink>
                <RouterLink to="/admin/settings">系统设置</RouterLink>
            </nav>
        </aside>

        <main class="content">
            <!-- 子路由在这里渲染 -->
            <RouterView />
        </main>
    </div>
</template>
```

```vue
<!-- UserDetail.vue：二级嵌套的父组件 -->
<template>
    <div>
        <nav>
            <RouterLink :to="`/admin/users/${$route.params.id}`">概览</RouterLink>
            <RouterLink :to="`/admin/users/${$route.params.id}/posts`">文章</RouterLink>
            <RouterLink :to="`/admin/users/${$route.params.id}/settings`">设置</RouterLink>
        </nav>
        <!-- 三级嵌套的 RouterView -->
        <RouterView />
    </div>
</template>
```

### 内部原理

#### 嵌套路由的匹配与渲染

```
URL /admin/users/123/posts 的匹配过程：

1. 匹配 /admin → AdminLayout 组件
2. 匹配 /admin/users/:id → UserDetail 组件
3. 匹配 /admin/users/:id/posts → UserPosts 组件

渲染结构：
  <AdminLayout>                    ← 第1层 RouterView
    <aside>侧边栏</aside>
    <main>
      <UserDetail>                 ← 第2层 RouterView
        <nav>概览 | 文章 | 设置</nav>
        <UserPosts />              ← 第3层 RouterView
      </UserDetail>
    </main>
  </AdminLayout>

路由匹配结果（matched 数组）：
  route.matched = [
      { path: '/admin', component: AdminLayout },
      { path: '/admin/users/:id', component: UserDetail },
      { path: '/admin/users/:id/posts', component: UserPosts }
  ]

每层 RouterView 按深度渲染 matched 中对应的组件：
  第1层 RouterView → matched[0] → AdminLayout
  第2层 RouterView → matched[1] → UserDetail
  第3层 RouterView → matched[2] → UserPosts
```

### 与相关API的对比

| 路由结构 | 使用场景 | URL 示例 |
|---------|---------|---------|
| 扁平路由 | 独立页面 | /login, /about |
| 一级嵌套 | 布局 + 页面 | /admin/users |
| 多级嵌套 | 复杂布局 | /admin/users/1/posts |
| 无组件父路由 | 纯分组 | children 共享前缀 |

### 适用场景

- **后台管理：** 侧边栏布局 + 内容区切换
- **用户中心：** 标签页切换不同信息
- **多步骤流程：** 步骤导航 + 内容区
- **文档站点：** 目录导航 + 文档内容

### 常见问题

#### 无组件的父路由（纯路径分组）

**解决方案：**

```javascript
// 不需要布局组件，只是路径分组
const routes = [
    {
        path: "/api",
        // 没有 component，只用于路径前缀分组
        children: [
            { path: "users", component: UserList },    // /api/users
            { path: "products", component: ProductList }, // /api/products
        ],
    },
];
// 子路由直接渲染在上层 RouterView 中
```

### 注意事项

- 子路由 path 不以 `/` 开头，自动拼接父路径
- 空字符串 path 是默认子路由
- 父组件必须包含 `<RouterView>` 才能渲染子路由
- 没有 component 的父路由只做路径分组
- 深层嵌套时注意 RouterView 的层级
- route.matched 数组包含所有匹配的层级

### 总结

嵌套路由通过 children 定义子路由，父组件用 RouterView 渲染子路由组件。路径自动拼接父路由前缀，空 path 为默认子路由。适合实现布局系统、标签切换等场景。支持多级嵌套和无组件的纯路径分组。route.matched 数组记录所有匹配层级，每层 RouterView 按深度渲染对应组件。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### 命名视图(components)的多视图渲染

### 概念说明

命名视图允许在同一个路由中同时渲染多个组件到不同的 `<RouterView>` 出口。默认情况下，一个路由只对应一个组件，渲染到默认的 `<RouterView>`。但有些页面需要同时展示多个独立区域（如侧边栏、主内容、页脚），每个区域渲染不同的组件。

使用命名视图时，路由配置中用 `components`（注意是复数）替代 `component`，值为一个对象，key 是视图名称，value 是对应组件。模板中通过 `<RouterView name="xxx">` 指定渲染哪个命名视图。没有 name 属性的 RouterView 默认名称是 `default`。

### 基本示例

```javascript
const routes = [
    {
        path: "/dashboard",
        // components（复数）：多个命名视图
        components: {
            default: () => import("@/views/DashboardMain.vue"),
            sidebar: () => import("@/views/DashboardSidebar.vue"),
            header: () => import("@/views/DashboardHeader.vue"),
        },
    },
    {
        path: "/settings",
        components: {
            default: () => import("@/views/SettingsMain.vue"),
            sidebar: () => import("@/views/SettingsSidebar.vue"),
            header: () => import("@/views/SettingsHeader.vue"),
        },
    },
];
```

```vue
<!-- App.vue：定义多个 RouterView 出口 -->
<template>
    <div class="layout">
        <header>
            <RouterView name="header" />
        </header>

        <div class="body">
            <aside>
                <RouterView name="sidebar" />
            </aside>

            <main>
                <!-- 没有 name 的是 default -->
                <RouterView />
            </main>
        </div>
    </div>
</template>
```

```javascript
// 嵌套路由中使用命名视图
const routes = [
    {
        path: "/admin",
        component: () => import("@/layouts/AdminLayout.vue"),
        children: [
            {
                path: "users",
                components: {
                    default: () => import("@/views/UserList.vue"),
                    detail: () => import("@/views/UserPreview.vue"),
                },
            },
        ],
    },
];
```

### 内部原理

#### 命名视图的匹配机制

```
命名视图的渲染流程：

路由配置：
  components: {
      default: MainView,
      sidebar: SidebarView,
      header: HeaderView
  }

模板中的 RouterView：
  <RouterView />            → 渲染 components.default (MainView)
  <RouterView name="sidebar" /> → 渲染 components.sidebar (SidebarView)
  <RouterView name="header" />  → 渲染 components.header (HeaderView)

匹配规则：
  → RouterView 的 name 与 components 的 key 对应
  → 没有 name 的 RouterView → name 为 "default"
  → 如果 components 中没有对应 key → 该 RouterView 不渲染

路由切换时：
  从 /dashboard 切到 /settings
  → 三个 RouterView 同时更新为新路由的 components
  → 每个视图独立切换
```

### 与相关API的对比

| 属性 | 视图数量 | 渲染目标 |
|------|---------|---------|
| component（单数） | 1个 | 默认 RouterView |
| components（复数） | 多个 | 对应名称的 RouterView |

### 适用场景

- **复杂布局：** 同一页面多个独立区域
- **主从视图：** 列表 + 详情同时展示
- **自适应布局：** 不同路由展示不同的侧边栏

### 常见问题

#### 某些路由不需要全部命名视图

**解决方案：**

```javascript
const routes = [
    {
        path: "/simple",
        // 只定义 default，其他命名视图为空
        components: {
            default: () => import("@/views/Simple.vue"),
            // sidebar 不定义 → <RouterView name="sidebar"> 不渲染任何内容
        },
    },
];
```

### 注意事项

- 使用 `components`（复数）而非 `component`
- 没有 name 的 RouterView 默认是 "default"
- 未定义的命名视图不渲染任何内容
- props 选项也需要为每个命名视图单独配置
- 可以与嵌套路由结合使用
- Transition 可以分别应用到每个命名视图

### 总结

命名视图通过 components（复数）配置多个组件，分别渲染到对应 name 的 RouterView。适合复杂布局、主从视图等需要同时展示多个独立区域的场景。没有 name 的 RouterView 默认为 "default"。未定义的视图不渲染。props 需要为每个视图单独配置。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### 重定向(redirect)配置

### 概念说明

`redirect` 用于将一个路径自动导航到另一个路径。当用户访问带有 redirect 的路由时，URL 会变为重定向目标的路径，浏览器地址栏也会更新。redirect 的路由不需要 component，因为它不会渲染任何组件。

redirect 支持三种形式：

**字符串：** 直接指定目标路径，如 `redirect: '/home'`。

**命名路由对象：** 指定路由名称和参数，如 `redirect: { name: 'user', params: { id: '1' } }`。

**函数：** 接收目标路由对象，动态返回重定向目标，如 `redirect: (to) => '/new-path'`。函数形式最灵活，可以根据条件返回不同的目标。

重定向不会触发导航守卫中的 beforeEach（在被重定向的原始路由上），而是在最终目标路由上触发。

### 基本示例

```javascript
const routes = [
    // 字符串形式
    {
        path: "/",
        redirect: "/home",
    },

    // 命名路由对象形式
    {
        path: "/profile",
        redirect: { name: "user-profile" },
    },

    // 函数形式：动态重定向
    {
        path: "/user/:id/default",
        redirect: (to) => {
            // to 是目标路由对象
            return { path: `/user/${to.params.id}/profile` };
        },
    },

    // 根据条件重定向
    {
        path: "/old-dashboard",
        redirect: (to) => {
            const userRole = getUserRole();
            if (userRole === "admin") {
                return "/admin/dashboard";
            }
            return "/user/dashboard";
        },
    },

    // 保留 query 参数的重定向
    {
        path: "/search-old",
        redirect: (to) => {
            return { path: "/search", query: to.query };
        },
    },

    // 嵌套路由中的重定向
    {
        path: "/admin",
        component: () => import("@/layouts/AdminLayout.vue"),
        redirect: "/admin/dashboard", // 访问 /admin 自动跳转到 /admin/dashboard
        children: [
            { path: "dashboard", component: () => import("@/views/Dashboard.vue") },
            { path: "users", component: () => import("@/views/Users.vue") },
        ],
    },

    { path: "/home", name: "home", component: () => import("@/views/Home.vue") },
    { path: "/user/:id/profile", name: "user-profile", component: () => import("@/views/Profile.vue") },
];
```

### 内部原理

#### redirect 的导航流程

```
重定向的导航过程：

用户访问 /old-dashboard
  1. 匹配到 redirect 路由
  2. 计算重定向目标（字符串/对象/函数返回值）
  3. 终止当前导航
  4. 启动新导航到目标路径
  5. 目标路径走正常的匹配和守卫流程
  6. 浏览器地址栏更新为目标路径

导航守卫的触发：
  → 原始路由（/old-dashboard）的 beforeEnter 不触发
  → 全局 beforeEach 在目标路由上触发
  → 目标路由的守卫正常执行

与 alias 的区别：
  redirect: URL 变化，显示目标路径
  alias: URL 不变，显示原始路径
```

### 与相关API的对比

| 方式 | URL 变化 | 组件渲染 | 守卫触发 |
|------|---------|---------|---------|
| redirect | 变为目标路径 | 目标路由的组件 | 目标路由 |
| alias | 保持原路径 | 原路由的组件 | 原路由 |
| router.replace | 变为目标路径 | 目标路由的组件 | 完整流程 |

### 适用场景

- **默认路由：** 根路径重定向到首页
- **URL 迁移：** 旧路径重定向到新路径
- **嵌套默认页：** 父路由重定向到默认子路由
- **条件跳转：** 根据角色重定向到不同页面

### 常见问题

#### 重定向导致无限循环

**解决方案：**

```javascript
// 错误：循环重定向
// { path: '/a', redirect: '/b' },
// { path: '/b', redirect: '/a' },

// 正确：确保重定向链有终点
{ path: "/a", redirect: "/b" },
{ path: "/b", component: () => import("@/views/B.vue") },
```

### 注意事项

- redirect 路由不需要 component
- 函数形式可以访问目标路由的 params 和 query
- 避免循环重定向
- 嵌套路由中父级 redirect 会在访问父路径时触发
- redirect 不触发原始路由的导航守卫
- 相对路径重定向以当前路由为基准

### 总结

redirect 将路径自动导航到另一个目标，URL 会更新。支持字符串、命名路由对象和函数三种形式。函数形式最灵活，可根据条件动态决定目标。常用于默认路由、URL 迁移、嵌套默认页等场景。注意避免循环重定向，导航守卫在目标路由上触发。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### 别名(alias)配置

### 概念说明

`alias` 允许为一个路由定义一个或多个替代路径，访问别名路径时渲染与原路径相同的组件，但浏览器地址栏保持别名路径不变。这与 redirect 不同——redirect 会改变 URL，alias 不会。

alias 可以是字符串或字符串数组（多个别名）。别名路径可以包含动态参数，也可以是绝对路径。嵌套路由中的别名可以在不同层级定义。

alias 的典型使用场景是在不改变 URL 的情况下让同一个组件通过多个路径可达，比如 `/settings` 和 `/preferences` 都访问设置页面。

### 基本示例

```javascript
const routes = [
    // 单个别名
    {
        path: "/settings",
        alias: "/preferences",
        component: () => import("@/views/Settings.vue"),
        // /settings → Settings 组件（URL: /settings）
        // /preferences → Settings 组件（URL: /preferences）
    },

    // 多个别名
    {
        path: "/user/:id",
        alias: ["/people/:id", "/member/:id"],
        component: () => import("@/views/User.vue"),
        // /user/123 → User 组件
        // /people/123 → User 组件（URL 保持 /people/123）
        // /member/123 → User 组件（URL 保持 /member/123）
    },

    // 根路径别名
    {
        path: "/home",
        alias: "/",
        component: () => import("@/views/Home.vue"),
        // /home 和 / 都渲染 Home 组件
    },

    // 嵌套路由中的别名
    {
        path: "/admin",
        component: () => import("@/layouts/AdminLayout.vue"),
        children: [
            {
                path: "users",
                alias: "members", // 相对别名
                component: () => import("@/views/Users.vue"),
                // /admin/users 和 /admin/members 渲染相同组件
            },
        ],
    },
];
```

### 内部原理

#### alias 的匹配机制

```
alias 的内部处理：

路由注册时：
  { path: '/settings', alias: '/preferences', component: Settings }
  → 生成两个匹配器：
    匹配器1: /settings → Settings 组件
    匹配器2: /preferences → Settings 组件（标记为别名）
  → 两个匹配器指向同一个路由记录

访问 /preferences 时：
  1. 匹配到别名匹配器
  2. 渲染对应的 Settings 组件
  3. URL 保持 /preferences 不变
  4. route.path 为 /preferences（当前路径）
  5. route.matched 中记录的是原始路由

与 redirect 的对比：
  redirect /a → /b：
    → URL 从 /a 变为 /b
    → 发生了新的导航

  alias /a = /b：
    → URL 保持 /a 不变
    → 只是路径 /a 渲染 /b 的组件
    → 没有新的导航
```

### 与相关API的对比

| 特性 | alias | redirect |
|------|-------|----------|
| URL 变化 | 不变 | 变为目标 |
| 导航次数 | 1次 | 2次 |
| SEO | 多个 URL 指向同一内容 | 只有目标 URL |
| 用户感知 | 无感知 | 地址栏变化 |

### 适用场景

- **URL 别名：** 同一页面多个访问路径
- **国际化路径：** /users 和 /utilisateurs 指向同一页面
- **渐进迁移：** 新旧路径并存
- **简化路径：** 提供更短的访问路径

### 常见问题

#### alias 对 SEO 的影响

**解决方案：**

```html
<!-- 多个 URL 指向同一内容会影响 SEO -->
<!-- 解决：使用 canonical 标签指定规范 URL -->
<head>
    <link rel="canonical" href="https://example.com/settings" />
</head>

<!-- 或者在导航守卫中使用 redirect 替代 alias -->
```

### 注意事项

- alias 不改变 URL，redirect 改变 URL
- 多个别名用数组定义
- 别名中的动态参数必须与原路径一致
- 多个 URL 指向同一内容可能影响 SEO
- 嵌套路由中别名是相对于父路径的
- alias 不触发额外的导航

### 总结

alias 为路由定义替代访问路径，URL 保持别名路径不变。支持单个或多个别名、动态参数、嵌套路由。与 redirect 的区别是不改变 URL、不触发新导航。注意多个 URL 对 SEO 的影响，必要时使用 canonical 标签。适合国际化路径、渐进迁移等场景。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### 路由懒加载的异步组件

### 概念说明

路由懒加载是指在路由配置中使用动态 `import()` 语法替代静态导入，让组件在被访问时才加载，而非应用启动时全部加载。这样构建工具（Vite/Webpack）会将每个懒加载组件打包为独立的 chunk 文件，用户首次访问时只下载首页相关代码，访问其他页面时按需加载对应 chunk。

懒加载的核心语法是 `component: () => import('./views/About.vue')`。`import()` 返回一个 Promise，Vue Router 会在路由匹配时自动调用这个函数并等待组件加载完成。

懒加载可以显著减小首屏的 JavaScript 包体积，提升首屏加载速度。对于大型应用尤为重要。还可以通过 webpack 魔法注释或 Vite 的 rollupOptions 自定义 chunk 名称和分组。

### 基本示例

```javascript
const routes = [
    // 静态导入（不推荐用于大型应用）
    // import Home from '@/views/Home.vue'
    // { path: '/', component: Home }

    // 懒加载（推荐）
    {
        path: "/",
        name: "home",
        component: () => import("@/views/Home.vue"),
    },

    {
        path: "/about",
        name: "about",
        // Webpack 魔法注释：指定 chunk 名称
        component: () => import(/* webpackChunkName: "about" */ "@/views/About.vue"),
    },

    // 将相关页面分到同一个 chunk
    {
        path: "/user/:id",
        component: () => import(/* webpackChunkName: "user" */ "@/views/User.vue"),
        children: [
            {
                path: "profile",
                component: () => import(/* webpackChunkName: "user" */ "@/views/UserProfile.vue"),
            },
            {
                path: "posts",
                component: () => import(/* webpackChunkName: "user" */ "@/views/UserPosts.vue"),
            },
        ],
    },

    // 配合 Suspense 显示加载状态
    {
        path: "/dashboard",
        component: () => import("@/views/Dashboard.vue"),
    },
];
```

```vue
<!-- App.vue：配合 Suspense 显示加载状态 -->
<template>
    <RouterView v-slot="{ Component }">
        <Suspense>
            <component :is="Component" />
            <template #fallback>
                <div class="loading">页面加载中...</div>
            </template>
        </Suspense>
    </RouterView>
</template>
```

### 内部原理

#### 懒加载的构建与运行时机制

```
构建时（Vite/Webpack）：
  () => import('@/views/About.vue')
  → 识别为动态导入
  → 将 About.vue 及其依赖打包为独立 chunk
  → 生成 About-[hash].js 文件

运行时：
  1. 用户导航到 /about
  2. Vue Router 匹配路由
  3. 调用 component 函数：() => import(...)
  4. 浏览器发起网络请求加载 About-[hash].js
  5. 加载完成后 Promise resolve，返回组件定义
  6. Vue Router 渲染组件

缓存机制：
  → import() 返回的 Promise 会被缓存
  → 第一次访问时加载并缓存
  → 后续访问直接使用缓存，不重新请求

打包结果示例：
  dist/
    index.html
    assets/
      index-[hash].js         ← 首屏必需代码
      Home-[hash].js          ← Home 页面 chunk
      About-[hash].js         ← About 页面 chunk
      User-[hash].js          ← User 相关页面 chunk
      Dashboard-[hash].js     ← Dashboard 页面 chunk
```

### 与相关API的对比

| 加载方式 | 首屏体积 | 后续导航 | 适用场景 |
|---------|---------|---------|---------|
| 静态导入 | 大（全部打包） | 快（已加载） | 小型应用 |
| 懒加载 | 小（按需加载） | 首次稍慢 | 大型应用 |
| 预加载 | 小 + 空闲预加载 | 快 | 最佳体验 |

### 适用场景

- **大型 SPA：** 页面多、代码量大的应用
- **低频页面：** 设置页、帮助页等不常访问的页面
- **重量级页面：** 包含大型库（如图表、编辑器）的页面
- **首屏优化：** 减小首屏包体积

### 常见问题

#### 预加载提升用户体验

**解决方案：**

```vue
<script setup>
import { onMounted } from "vue";

// 方案：空闲时预加载可能访问的页面
onMounted(() => {
    // 使用 requestIdleCallback 在空闲时预加载
    if ("requestIdleCallback" in window) {
        requestIdleCallback(() => {
            import("@/views/Dashboard.vue");
            import("@/views/Settings.vue");
        });
    }
});
</script>

<!-- 或使用 RouterLink 的 prefetch 行为（Vite 默认支持） -->
<!-- Vite 会为动态 import 自动生成 <link rel="modulepreload"> -->
```

### 注意事项

- 懒加载组件首次访问时有短暂加载时间
- 网络差时需要配合加载状态或 Suspense
- 相关页面可以分到同一 chunk 减少请求数
- import() 的结果会被浏览器缓存
- Vite 自动为懒加载 chunk 生成 modulepreload
- 首屏关键页面可以不用懒加载

### 总结

路由懒加载通过 `() => import()` 实现按需加载，构建工具将每个懒加载组件打包为独立 chunk。首次访问时加载，后续访问使用缓存。显著减小首屏包体积，适合大型应用。可以通过 chunk 分组、预加载、Suspense 等方式优化用户体验。首屏关键页面可保持静态导入。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### 导航守卫beforeEach的全局前置

### 概念说明

`router.beforeEach` 是 Vue Router 的全局前置守卫，在每次导航触发时最先执行。它是实现路由权限控制、登录验证、页面标题设置等全局逻辑的主要手段。

beforeEach 接收一个回调函数，回调接收两个参数：`to`（即将进入的目标路由）和 `from`（当前正要离开的路由）。Vue Router 4 中不再推荐使用第三个参数 `next`，而是通过返回值来控制导航行为：

- **返回 `undefined` 或 `true`：** 允许导航继续
- **返回 `false`：** 取消导航
- **返回路由地址（字符串或对象）：** 重定向到指定路由

beforeEach 可以是异步函数（async），Vue Router 会等待 Promise resolve 后再决定导航行为。可以注册多个 beforeEach，按注册顺序依次执行。

### 基本示例

```javascript
import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: "/", name: "home", component: () => import("@/views/Home.vue") },
        { path: "/login", name: "login", component: () => import("@/views/Login.vue") },
        {
            path: "/dashboard",
            name: "dashboard",
            component: () => import("@/views/Dashboard.vue"),
            meta: { requiresAuth: true },
        },
        {
            path: "/admin",
            name: "admin",
            component: () => import("@/views/Admin.vue"),
            meta: { requiresAuth: true, role: "admin" },
        },
    ],
});

// 全局前置守卫：登录验证
router.beforeEach(async (to, from) => {
    const isLoggedIn = checkAuth(); // 检查登录状态

    // 需要登录的页面
    if (to.meta.requiresAuth && !isLoggedIn) {
        // 重定向到登录页，携带来源路径
        return {
            name: "login",
            query: { redirect: to.fullPath },
        };
    }

    // 已登录用户不能访问登录页
    if (to.name === "login" && isLoggedIn) {
        return { name: "home" };
    }

    // 角色权限检查
    if (to.meta.role) {
        const userRole = getUserRole();
        if (userRole !== to.meta.role) {
            return { name: "home" }; // 无权限，重定向首页
        }
    }

    // 允许导航（不返回任何值或返回 true）
});

// 设置页面标题
router.beforeEach((to) => {
    document.title = to.meta.title || "默认标题";
});

// 加载进度条
router.beforeEach(() => {
    NProgress.start(); // 开始进度条
});
```

### 内部原理

#### beforeEach 在导航流程中的位置

```
完整的导航解析流程：

1. 导航被触发
2. 离开组件的 beforeRouteLeave 守卫
3. ★ 全局 beforeEach 守卫 ← 在这里
4. 复用组件的 beforeRouteUpdate 守卫
5. 路由独享的 beforeEnter 守卫
6. 解析异步路由组件
7. 激活组件的 beforeRouteEnter 守卫
8. 全局 beforeResolve 守卫
9. 导航被确认
10. 全局 afterEach 钩子
11. DOM 更新

beforeEach 的特点：
  → 最早执行的全局守卫（仅在 beforeRouteLeave 之后）
  → 每次导航都会触发
  → 可以注册多个，按顺序执行
  → 异步守卫会阻塞导航直到 resolve
  → 任何一个守卫返回 false 或重定向 → 终止后续守卫
```

### 与相关API的对比

| 守卫 | 触发时机 | 作用范围 | 常见用途 |
|------|---------|---------|---------|
| beforeEach | 导航最早期 | 全局 | 登录验证、权限 |
| beforeResolve | 组件解析后 | 全局 | 数据预取 |
| afterEach | 导航确认后 | 全局 | 页面统计、进度条 |
| beforeEnter | 进入路由前 | 路由级 | 特定路由逻辑 |

### 适用场景

- **登录验证：** 检查用户是否已登录
- **权限控制：** 检查用户角色和权限
- **页面标题：** 动态设置 document.title
- **进度条：** 显示页面加载进度

### 常见问题

#### 避免无限重定向

**解决方案：**

```javascript
router.beforeEach((to) => {
    const isLoggedIn = checkAuth();

    if (to.meta.requiresAuth && !isLoggedIn) {
        // 确保不会重定向到自身
        if (to.name !== "login") {
            return { name: "login" };
        }
    }
    // 或者使用 meta 标记排除不需要验证的页面
});
```

### 注意事项

- Vue Router 4 推荐用返回值替代 next()
- 异步守卫会阻塞导航
- 多个 beforeEach 按注册顺序执行
- 注意避免无限重定向循环
- 返回 false 取消导航，返回路由对象重定向
- to.meta 可访问路由的元信息

### 总结

beforeEach 是全局前置守卫，每次导航最先触发。通过返回值控制导航：undefined/true 允许，false 取消，路由对象重定向。支持异步函数。适用于登录验证、权限控制、页面标题等全局逻辑。注意避免无限重定向，合理使用 meta 标记区分需要守卫的路由。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### 导航守卫beforeResolve的全局解析

### 概念说明

`router.beforeResolve` 是全局解析守卫，在导航被确认之前、所有组件内守卫和异步路由组件被解析之后调用。它是导航确认前的最后一道关卡，此时所有异步组件都已加载完毕，组件内的 `beforeRouteEnter` 守卫也已执行。

beforeResolve 与 beforeEach 的接口完全相同（接收 to、from，通过返回值控制导航），区别在于执行时机更晚。beforeResolve 适合执行需要确保所有组件都已准备好之后的逻辑，比如确认数据是否加载成功、检查组件级权限等。

在完整的导航解析流程中，beforeResolve 排在 beforeEach 之后、afterEach 之前。

### 基本示例

```javascript
import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
    history: createWebHistory(),
    routes: [/* ... */],
});

// 全局解析守卫
router.beforeResolve(async (to) => {
    // 此时所有组件内守卫已执行、异步组件已加载

    // 场景：确保需要的数据已加载
    if (to.meta.requiresData) {
        try {
            await fetchRequiredData(to);
        } catch (error) {
            // 数据加载失败，取消导航
            console.error("数据加载失败:", error);
            return false;
        }
    }

    // 场景：检查相机/定位等权限
    if (to.meta.requiresCamera) {
        try {
            await navigator.mediaDevices.getUserMedia({ video: true });
        } catch {
            // 用户拒绝相机权限
            return { name: "permission-denied" };
        }
    }
});
```

### 内部原理

#### beforeResolve 在导航流程中的位置

```
完整导航解析流程：

1. 导航被触发
2. 离开组件的 beforeRouteLeave
3. 全局 beforeEach                ← 最先
4. 复用组件的 beforeRouteUpdate
5. 路由独享 beforeEnter
6. 解析异步路由组件
7. 激活组件的 beforeRouteEnter
8. ★ 全局 beforeResolve           ← 在这里（倒数第二步）
9. 导航被确认
10. 全局 afterEach
11. DOM 更新

beforeResolve 的定位：
  → 所有守卫和异步组件都已处理完毕
  → 导航尚未确认（还可以取消或重定向）
  → 是最后一次阻止导航的机会
```

### 与相关API的对比

| 守卫 | 执行时机 | 异步组件状态 | 用途 |
|------|---------|------------|------|
| beforeEach | 最早 | 未加载 | 登录验证 |
| beforeResolve | 最晚（确认前） | 已加载 | 数据预取、权限确认 |
| afterEach | 确认后 | 已加载 | 统计、日志 |

### 适用场景

- **数据预取：** 确保页面需要的数据已加载
- **设备权限：** 检查相机、定位等权限
- **最终确认：** 导航前的最后一次检查

### 常见问题

#### beforeEach 和 beforeResolve 如何选择

**解决方案：**

```javascript
// beforeEach：用于登录验证等不依赖组件的全局检查
router.beforeEach((to) => {
    if (to.meta.requiresAuth && !isLoggedIn()) {
        return { name: "login" };
    }
});

// beforeResolve：用于依赖组件状态或需要等待异步组件的检查
router.beforeResolve(async (to) => {
    // 此时组件已加载，可以做更精细的检查
    if (to.meta.requiresData) {
        const success = await preloadData(to);
        if (!success) return false;
    }
});
```

### 注意事项

- 执行时机在所有组件内守卫之后
- 异步组件已加载完毕
- 是导航确认前的最后机会
- 返回值规则与 beforeEach 相同
- 适合数据预取和权限确认
- 不要把 beforeEach 的逻辑放到 beforeResolve

### 总结

beforeResolve 是全局解析守卫，在所有组件内守卫和异步组件解析后、导航确认前执行。是阻止导航的最后机会。适合数据预取、设备权限检查等需要组件已就绪的逻辑。与 beforeEach 接口相同，但执行时机更晚。登录验证等全局检查用 beforeEach，依赖组件的检查用 beforeResolve。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### 导航守卫afterEach的全局后置

### 概念说明

`router.afterEach` 是全局后置钩子，在导航被确认之后调用。与 beforeEach 和 beforeResolve 不同，afterEach 不接受 `next` 函数也不能通过返回值改变导航——此时导航已经完成，无法取消或重定向。

afterEach 接收三个参数：`to`（进入的路由）、`from`（离开的路由）和 `failure`（导航失败信息，如果导航失败的话）。failure 参数是 Vue Router 4 新增的，可以用来检测导航是否被某个守卫中断。

afterEach 适合执行不影响导航流程的副作用操作：关闭进度条、页面浏览统计（PV）、发送分析事件、修改页面标题等。

### 基本示例

```javascript
import { createRouter, createWebHistory, isNavigationFailure, NavigationFailureType } from "vue-router";

const router = createRouter({
    history: createWebHistory(),
    routes: [/* ... */],
});

// 关闭进度条
router.afterEach(() => {
    NProgress.done(); // 进度条完成
});

// 页面统计
router.afterEach((to, from) => {
    // 发送页面浏览统计
    analytics.trackPageView({
        path: to.fullPath,
        title: to.meta.title || document.title,
        referrer: from.fullPath,
    });
});

// 设置页面标题
router.afterEach((to) => {
    const title = to.meta.title;
    if (title) {
        document.title = `${title} - 我的应用`;
    }
});

// 检测导航失败
router.afterEach((to, from, failure) => {
    if (failure) {
        // 导航失败了
        if (isNavigationFailure(failure, NavigationFailureType.aborted)) {
            console.log("导航被中断:", failure);
        }
        if (isNavigationFailure(failure, NavigationFailureType.duplicated)) {
            console.log("重复导航:", failure);
        }
    }
});
```

### 内部原理

#### afterEach 在导航流程中的位置

```
完整导航流程中 afterEach 的位置：

1. 导航被触发
2. beforeRouteLeave
3. beforeEach
4. beforeRouteUpdate
5. beforeEnter
6. 解析异步组件
7. beforeRouteEnter
8. beforeResolve
9. 导航被确认 ✓
10. ★ afterEach           ← 在这里（导航已确认）
11. DOM 更新

afterEach 的特点：
  → 导航已经确认，无法改变
  → 不能返回 false 或重定向
  → 接收第三个参数 failure
  → 适合执行副作用操作

NavigationFailureType：
  → aborted: 守卫返回 false 或新路由
  → cancelled: 新导航在当前导航完成前发生
  → duplicated: 导航到当前相同路由
```

### 与相关API的对比

| 守卫 | 能否阻止导航 | 执行时机 | 用途 |
|------|------------|---------|------|
| beforeEach | 能 | 最早 | 权限控制 |
| beforeResolve | 能 | 组件解析后 | 数据预取 |
| afterEach | 不能 | 导航确认后 | 统计、日志 |

### 适用场景

- **进度条：** 导航完成后关闭进度条
- **页面统计：** 发送 PV 统计数据
- **页面标题：** 更新 document.title
- **导航失败处理：** 检测和记录导航失败

### 常见问题

#### afterEach 与 beforeEach 配合使用进度条

**解决方案：**

```javascript
import NProgress from "nprogress";

// 导航开始：显示进度条
router.beforeEach(() => {
    NProgress.start();
});

// 导航结束：关闭进度条
router.afterEach(() => {
    NProgress.done();
});

// 即使导航失败也要关闭
router.afterEach((to, from, failure) => {
    if (failure) {
        NProgress.done();
    }
});
```

### 注意事项

- afterEach 不能阻止或修改导航
- 第三个参数 failure 检测导航失败
- 适合执行副作用，不适合逻辑控制
- 可以注册多个 afterEach，按顺序执行
- 与 beforeEach 配合使用（如进度条的开始和结束）
- DOM 更新在 afterEach 之后

### 总结

afterEach 是全局后置钩子，在导航确认后执行，不能改变导航。接收 to、from 和 failure 三个参数。适合进度条关闭、页面统计、标题设置等副作用操作。failure 参数可以检测导航是否失败及失败类型。与 beforeEach 配合可以实现进度条的完整生命周期管理。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### 路由独享的beforeEnter守卫

### 概念说明

`beforeEnter` 是定义在路由配置中的守卫，只在进入该路由时触发，不会在 params/query/hash 变化时触发（同一路由内的参数变化不算"进入"）。它的作用范围仅限于当前路由，不影响其他路由。

beforeEnter 的接口与全局 beforeEach 相同：接收 `to` 和 `from`，通过返回值控制导航。它可以是单个函数，也可以是函数数组（Vue Router 4 支持），多个函数按顺序执行。

beforeEnter 在全局 beforeEach 之后、组件内 beforeRouteEnter 之前执行。适合为特定路由添加独立的守卫逻辑，避免在全局守卫中通过条件判断处理不同路由的逻辑。

### 基本示例

```javascript
const routes = [
    {
        path: "/admin",
        component: () => import("@/views/Admin.vue"),
        // 单个守卫函数
        beforeEnter: (to, from) => {
            const userRole = getUserRole();
            if (userRole !== "admin") {
                return { name: "forbidden" }; // 无权限
            }
        },
    },

    {
        path: "/payment",
        component: () => import("@/views/Payment.vue"),
        // 函数数组：多个守卫按顺序执行
        beforeEnter: [
            // 守卫1：检查登录
            (to, from) => {
                if (!isLoggedIn()) return { name: "login" };
            },
            // 守卫2：检查是否有待支付订单
            (to, from) => {
                if (!hasPendingOrder()) return { name: "cart" };
            },
            // 守卫3：记录进入支付页
            (to, from) => {
                analytics.track("enter_payment");
            },
        ],
    },

    {
        path: "/profile/edit",
        component: () => import("@/views/ProfileEdit.vue"),
        // 异步守卫
        beforeEnter: async (to) => {
            const profile = await fetchProfile();
            if (!profile.isComplete) {
                return { name: "profile-setup" };
            }
        },
    },
];
```

### 内部原理

#### beforeEnter 的执行时机

```
导航流程中 beforeEnter 的位置：

1. 导航被触发
2. 离开组件的 beforeRouteLeave
3. 全局 beforeEach
4. 复用组件的 beforeRouteUpdate
5. ★ 路由独享 beforeEnter       ← 在这里
6. 解析异步路由组件
7. 激活组件的 beforeRouteEnter
8. 全局 beforeResolve
9. 导航被确认

beforeEnter 的触发规则：
  → 只在"进入"路由时触发
  → /user/1 → /user/2（同一路由，参数变化）→ 不触发
  → /home → /user/1（不同路由）→ 触发
  → 函数数组中任何一个返回 false/重定向 → 终止后续守卫
```

### 与相关API的对比

| 守卫类型 | 定义位置 | 作用范围 | 触发条件 |
|---------|---------|---------|---------|
| beforeEach | router 实例 | 全局 | 每次导航 |
| beforeEnter | routes 配置 | 当前路由 | 进入该路由 |
| beforeRouteEnter | 组件内 | 组件级 | 进入组件 |

### 适用场景

- **特定路由权限：** 管理页、支付页等特定权限检查
- **前置数据检查：** 进入页面前确认数据状态
- **守卫复用：** 函数数组形式组合可复用的守卫函数

### 常见问题

#### 复用守卫函数

**解决方案：**

```javascript
// 定义可复用的守卫函数
function requireAuth(to, from) {
    if (!isLoggedIn()) return { name: "login" };
}

function requireRole(role) {
    return (to, from) => {
        if (getUserRole() !== role) return { name: "forbidden" };
    };
}

// 在多个路由中复用
const routes = [
    {
        path: "/admin",
        beforeEnter: [requireAuth, requireRole("admin")],
        component: AdminView,
    },
    {
        path: "/editor",
        beforeEnter: [requireAuth, requireRole("editor")],
        component: EditorView,
    },
];
```

### 注意事项

- 只在进入路由时触发，参数变化不触发
- 支持函数数组形式
- 在全局 beforeEach 之后执行
- 返回值规则与 beforeEach 相同
- 不能访问组件实例（组件尚未创建）
- 适合不依赖组件的路由级逻辑

### 总结

beforeEnter 是路由独享守卫，定义在路由配置中，只在进入该路由时触发。支持单个函数和函数数组。在全局 beforeEach 之后、组件内 beforeRouteEnter 之前执行。适合特定路由的权限检查和前置验证。函数数组形式便于组合和复用守卫逻辑。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### 组件内的beforeRouteEnter守卫

### 概念说明

`beforeRouteEnter` 是组件内的导航守卫，在路由进入该组件之前调用。它的特殊之处在于：此时组件实例尚未创建，因此不能访问 `this`。这是唯一一个不能访问组件实例的组件内守卫。

在 Vue Router 4 的 Composition API 中，没有 `beforeRouteEnter` 的等价组合式函数。因为 `<script setup>` 中的代码本身就在 setup 阶段执行（组件创建时），此时路由已经匹配成功。如果需要在组件渲染前获取数据，可以使用 `onBeforeRouteUpdate` 配合 `watch` 监听路由参数，或在全局 `beforeResolve` 中处理。

在 Options API 中，beforeRouteEnter 可以通过 `next` 回调的参数访问组件实例：`next(vm => { vm.data = ... })`。这是 Vue Router 4 中仍保留 next 参数的特殊场景。

### 基本示例

```javascript
// Options API 写法
export default {
    data() {
        return {
            post: null,
        };
    },

    // 组件内 beforeRouteEnter
    async beforeRouteEnter(to, from, next) {
        // 此时不能访问 this（组件尚未创建）

        // 在进入组件前预加载数据
        try {
            const res = await fetch(`/api/posts/${to.params.id}`);
            const post = await res.json();

            // 通过 next 回调访问组件实例
            next((vm) => {
                vm.post = post; // 将数据赋值给组件
            });
        } catch (error) {
            // 加载失败，重定向到错误页
            next({ name: "error" });
        }
    },
};
```

```vue
<!-- Composition API 替代方案 -->
<script setup>
import { ref, watch } from "vue";
import { useRoute, onBeforeRouteUpdate } from "vue-router";

const route = useRoute();
const post = ref(null);

// 方案1：在 setup 中直接获取数据（首次进入）
async function loadPost(id) {
    const res = await fetch(`/api/posts/${id}`);
    post.value = await res.json();
}

// 首次加载
loadPost(route.params.id);

// 方案2：监听路由参数变化（同一组件参数切换）
onBeforeRouteUpdate(async (to) => {
    post.value = null;
    await loadPost(to.params.id);
});
</script>

<template>
    <div v-if="post">{{ post.title }}</div>
    <div v-else>加载中...</div>
</template>
```

### 内部原理

#### beforeRouteEnter 的执行时机

```
导航流程中 beforeRouteEnter 的位置：

1. 导航被触发
2. beforeRouteLeave（离开组件）
3. beforeEach（全局）
4. beforeRouteUpdate（复用组件）
5. beforeEnter（路由独享）
6. 解析异步路由组件
7. ★ beforeRouteEnter（激活组件） ← 在这里
8. beforeResolve（全局）
9. 导航被确认
10. afterEach（全局）
11. DOM 更新
12. next(vm => {}) 回调执行      ← 组件创建后

关键特点：
  → 组件尚未创建，不能访问 this
  → 可以通过 next(vm => {}) 延迟访问组件实例
  → next 回调在 DOM 更新后、组件 mounted 后执行
  → Composition API 中没有等价函数
```

### 与相关API的对比

| 守卫 | 访问 this | 触发时机 | Composition API |
|------|----------|---------|-----------------|
| beforeRouteEnter | 不能 | 进入组件前 | 无等价（用 setup） |
| beforeRouteUpdate | 能 | 参数变化 | onBeforeRouteUpdate |
| beforeRouteLeave | 能 | 离开组件 | onBeforeRouteLeave |

### 适用场景

- **数据预取：** 在组件创建前加载数据
- **进入确认：** 在组件渲染前做最后检查
- **Options API 项目：** 需要在进入前获取数据的场景

### 常见问题

#### Composition API 中如何实现 beforeRouteEnter 的功能

**解决方案：**

```vue
<script setup>
import { ref } from "vue";
import { useRoute, useRouter, onBeforeRouteUpdate } from "vue-router";

const route = useRoute();
const data = ref(null);
const loading = ref(true);

// setup 中的代码就相当于 beforeRouteEnter + created
// 在组件创建时执行
async function init() {
    loading.value = true;
    try {
        const res = await fetch(`/api/data/${route.params.id}`);
        data.value = await res.json();
    } finally {
        loading.value = false;
    }
}
init();

// 路由参数变化时重新加载
onBeforeRouteUpdate(async (to) => {
    loading.value = true;
    const res = await fetch(`/api/data/${to.params.id}`);
    data.value = await res.json();
    loading.value = false;
});
</script>
```

### 注意事项

- 不能访问 this（组件尚未创建）
- next(vm => {}) 回调在组件创建后执行
- Composition API 中没有等价函数
- setup 中的代码可以替代大部分使用场景
- 是 Vue Router 4 中唯一仍需 next 的场景
- 异步数据预取建议在 setup 或 beforeResolve 中处理

### 总结

beforeRouteEnter 在组件创建前调用，不能访问 this。Options API 中通过 next(vm => {}) 延迟访问组件实例。Composition API 没有等价函数，数据预取在 setup 中直接处理，参数变化用 onBeforeRouteUpdate。是组件内守卫中唯一不能访问实例的，也是唯一需要 next 回调的场景。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### 组件内的beforeRouteUpdate守卫

### 概念说明

`beforeRouteUpdate` 是组件内的导航守卫，在当前路由改变但组件被复用时调用。最典型的场景是动态路由参数变化：从 `/user/1` 导航到 `/user/2`，由于两个路径匹配同一个路由规则，Vue Router 会复用组件实例而不是销毁再创建，此时触发 beforeRouteUpdate。

与 beforeRouteEnter 不同，beforeRouteUpdate 可以访问组件实例（this 或通过 Composition API）。Composition API 中对应的是 `onBeforeRouteUpdate` 函数。

该守卫适合在路由参数变化时重新加载数据、重置组件状态等操作。如果不处理参数变化，组件会保持旧数据不更新。

### 基本示例

```vue
<!-- Composition API 写法 -->
<script setup>
import { ref } from "vue";
import { useRoute, onBeforeRouteUpdate } from "vue-router";

const route = useRoute();
const userData = ref(null);
const loading = ref(false);

// 首次加载
fetchUser(route.params.id);

// 路由参数变化时触发（组件复用）
onBeforeRouteUpdate(async (to, from) => {
    // to: 即将进入的路由
    // from: 当前路由
    console.log(`用户从 ${from.params.id} 切换到 ${to.params.id}`);

    loading.value = true;
    await fetchUser(to.params.id);
    loading.value = false;

    // 返回 false 可以取消导航
    // return false;
});

async function fetchUser(id) {
    loading.value = true;
    const res = await fetch(`/api/users/${id}`);
    userData.value = await res.json();
    loading.value = false;
}
</script>

<template>
    <div v-if="loading">加载中...</div>
    <div v-else-if="userData">
        <h2>{{ userData.name }}</h2>
        <p>{{ userData.email }}</p>
    </div>
</template>
```

```javascript
// Options API 写法
export default {
    data() {
        return { userData: null };
    },
    created() {
        this.fetchUser(this.$route.params.id);
    },
    beforeRouteUpdate(to, from) {
        // 可以访问 this
        this.fetchUser(to.params.id);
    },
    methods: {
        async fetchUser(id) {
            const res = await fetch(`/api/users/${id}`);
            this.userData = await res.json();
        },
    },
};
```

### 内部原理

#### beforeRouteUpdate 的触发条件

```
触发 beforeRouteUpdate 的条件：
  → 路由匹配规则相同，但参数/query/hash 发生变化
  → 组件被复用（不销毁重建）

触发示例：
  /user/1 → /user/2          ✓ 触发（params 变化）
  /search?q=vue → /search?q=react  ✓ 触发（query 变化）
  /page#top → /page#bottom    ✓ 触发（hash 变化）

不触发示例：
  /user/1 → /about           ✗ 不触发（不同路由，组件不复用）
  /user/1 → /user/1          ✗ 不触发（相同路由，无变化）

导航流程位置：
  1. beforeRouteLeave
  2. beforeEach
  3. ★ beforeRouteUpdate      ← 复用组件触发
  4. beforeEnter（不触发，因为不是"进入"）
  5. beforeResolve
  6. afterEach
```

### 与相关API的对比

| 方式 | 触发条件 | 访问实例 | API |
|------|---------|---------|-----|
| beforeRouteUpdate | 参数变化组件复用 | 可以 | onBeforeRouteUpdate |
| watch route.params | 参数变化 | 可以 | watch(() => route.params) |
| :key="route.fullPath" | 强制重建组件 | 不适用 | RouterView 的 key |

### 适用场景

- **参数变化数据刷新：** /user/1 → /user/2 时重新加载用户数据
- **搜索参数变化：** query 变化时重新搜索
- **状态重置：** 切换参数时重置表单或滚动位置
- **导航确认：** 在切换前确认是否保存修改

### 常见问题

#### beforeRouteUpdate 与 watch 的选择

**解决方案：**

```vue
<script setup>
import { watch } from "vue";
import { useRoute, onBeforeRouteUpdate } from "vue-router";

const route = useRoute();

// 方案1：onBeforeRouteUpdate（可以取消导航）
onBeforeRouteUpdate(async (to, from) => {
    if (hasUnsavedChanges()) {
        const confirm = window.confirm("有未保存的修改，确定离开？");
        if (!confirm) return false; // 取消导航
    }
    await fetchData(to.params.id);
});

// 方案2：watch（不能取消导航，但更简单）
watch(
    () => route.params.id,
    async (newId) => {
        await fetchData(newId);
    }
);

// 选择建议：
// 需要取消导航 → onBeforeRouteUpdate
// 只需响应变化 → watch
</script>
```

### 注意事项

- 只在组件复用时触发（同一路由不同参数）
- 可以访问组件实例
- 返回 false 可以取消导航
- Composition API 使用 onBeforeRouteUpdate
- 与 watch route.params 功能类似，但可以控制导航
- 首次进入组件时不触发（用 setup 或 beforeRouteEnter）

### 总结

beforeRouteUpdate 在路由参数变化导致组件复用时触发，可以访问组件实例。Composition API 使用 onBeforeRouteUpdate。适合参数变化时重新加载数据、重置状态。与 watch 相比，beforeRouteUpdate 可以返回 false 取消导航。首次进入不触发，需要在 setup 中单独处理首次加载。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### 组件内的beforeRouteLeave守卫

### 概念说明

`beforeRouteLeave` 是组件内的导航守卫，在导航离开当前组件对应的路由时调用。它可以访问组件实例，通常用于防止用户在未保存修改的情况下意外离开页面。

在 Composition API 中对应的是 `onBeforeRouteLeave` 函数。与其他组件内守卫一样，通过返回值控制导航：返回 `false` 取消导航，返回路由对象重定向。

beforeRouteLeave 是导航流程中最先执行的守卫——在全局 beforeEach 之前。这意味着如果用户取消离开，后续的所有守卫都不会执行。

### 基本示例

```vue
<!-- Composition API 写法 -->
<script setup>
import { ref } from "vue";
import { onBeforeRouteLeave } from "vue-router";

const formData = ref({ title: "", content: "" });
const isDirty = ref(false); // 表单是否有未保存的修改

// 监听离开
onBeforeRouteLeave((to, from) => {
    // 如果有未保存的修改，弹出确认框
    if (isDirty.value) {
        const answer = window.confirm("有未保存的修改，确定离开吗？");
        if (!answer) {
            return false; // 取消导航，留在当前页面
        }
    }
    // 不返回任何值 → 允许离开
});

function updateField(field, value) {
    formData.value[field] = value;
    isDirty.value = true;
}

function save() {
    // 保存逻辑...
    isDirty.value = false;
}
</script>

<template>
    <form>
        <input
            :value="formData.title"
            @input="updateField('title', $event.target.value)"
            placeholder="标题"
        />
        <textarea
            :value="formData.content"
            @input="updateField('content', $event.target.value)"
            placeholder="内容"
        />
        <button type="button" @click="save">保存</button>
    </form>
</template>
```

```javascript
// Options API 写法
export default {
    data() {
        return { isDirty: false };
    },
    beforeRouteLeave(to, from) {
        // 可以访问 this
        if (this.isDirty) {
            const answer = window.confirm("有未保存的修改，确定离开吗？");
            if (!answer) return false;
        }
    },
};
```

### 内部原理

#### beforeRouteLeave 的执行时机

```
导航流程中 beforeRouteLeave 的位置：

1. ★ beforeRouteLeave（离开组件） ← 最先执行
2. beforeEach（全局）
3. beforeRouteUpdate（复用组件）
4. beforeEnter（路由独享）
5. 解析异步路由组件
6. beforeRouteEnter（激活组件）
7. beforeResolve（全局）
8. 导航被确认
9. afterEach（全局）

关键特点：
  → 最先执行的守卫
  → 返回 false → 后续所有守卫都不执行
  → 可以访问组件实例
  → 适合做"离开确认"
```

### 与相关API的对比

| 守卫 | 执行顺序 | 用途 | Composition API |
|------|---------|------|-----------------|
| beforeRouteLeave | 第1个 | 离开确认 | onBeforeRouteLeave |
| beforeRouteUpdate | 第3个 | 参数变化处理 | onBeforeRouteUpdate |
| beforeRouteEnter | 第7个 | 进入前预取 | 无（用 setup） |

### 适用场景

- **未保存确认：** 表单有修改时提示用户
- **清理操作：** 离开前清理定时器、取消请求
- **状态保存：** 离开前保存当前操作进度
- **导航拦截：** 特定条件下禁止离开

### 常见问题

#### 配合浏览器的 beforeunload 事件

**解决方案：**

```vue
<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { onBeforeRouteLeave } from "vue-router";

const isDirty = ref(false);

// 路由导航离开时的确认
onBeforeRouteLeave(() => {
    if (isDirty.value) {
        return window.confirm("有未保存的修改，确定离开吗？") || false;
    }
});

// 浏览器关闭/刷新时的确认（beforeunload）
function handleBeforeUnload(e) {
    if (isDirty.value) {
        e.preventDefault();
        e.returnValue = ""; // 浏览器会显示默认确认框
    }
}

onMounted(() => {
    window.addEventListener("beforeunload", handleBeforeUnload);
});

onUnmounted(() => {
    window.removeEventListener("beforeunload", handleBeforeUnload);
});
</script>
```

### 注意事项

- 是导航流程中最先执行的守卫
- 返回 false 会阻止整个导航
- 可以访问组件实例
- 只处理路由导航，不处理浏览器关闭/刷新
- 浏览器关闭/刷新需要配合 beforeunload 事件
- Composition API 使用 onBeforeRouteLeave

### 总结

beforeRouteLeave 在离开当前路由时最先触发，可以访问组件实例。返回 false 取消导航，后续所有守卫都不执行。典型用途是未保存修改的离开确认。Composition API 使用 onBeforeRouteLeave。需要配合 window.beforeunload 处理浏览器关闭和刷新的场景。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### next函数的导航控制(已废弃但需了解)

### 概念说明

在 Vue Router 3 中，导航守卫通过第三个参数 `next` 函数来控制导航行为。`next()` 放行导航，`next(false)` 取消导航，`next('/login')` 重定向。这种模式在 Vue Router 4 中被标记为废弃（deprecated），推荐使用返回值替代。

Vue Router 4 保留了 next 函数的支持以便向后兼容，但官方建议在新代码中使用返回值模式。唯一例外是 `beforeRouteEnter` 中的 `next(vm => {})` 回调，因为该守卫中无法访问组件实例，需要通过回调获取。

废弃 next 的原因是：next 容易被多次调用或遗漏调用，导致导航卡住或行为异常。返回值模式更直观，不容易出错。

### 基本示例

```javascript
// === Vue Router 3 的 next 写法（已废弃） ===
router.beforeEach((to, from, next) => {
    if (to.meta.requiresAuth && !isLoggedIn()) {
        next("/login"); // 重定向
    } else {
        next(); // 放行（必须调用，否则导航卡住）
    }
});

// 常见错误：忘记调用 next
router.beforeEach((to, from, next) => {
    if (to.meta.requiresAuth) {
        if (!isLoggedIn()) {
            next("/login");
        }
        // 忘记 else next() → 已登录用户导航卡住！
    }
    // 忘记处理不需要 auth 的路由 → 导航卡住！
});

// 常见错误：多次调用 next
router.beforeEach((to, from, next) => {
    if (someCondition) {
        next("/a");
    }
    // 没有 return，继续执行
    next(); // 又调用了 next！行为不可预测
});
```

```javascript
// === Vue Router 4 的返回值写法（推荐） ===
router.beforeEach((to, from) => {
    // 不需要 next 参数
    if (to.meta.requiresAuth && !isLoggedIn()) {
        return "/login"; // 重定向
    }
    // 不返回任何值 = 放行
    // 不可能"忘记调用 next"
});

// 返回值模式不会出现上述问题
router.beforeEach((to, from) => {
    if (someCondition) {
        return "/a"; // return 后函数直接结束
    }
    // 不返回 = 放行，逻辑清晰
});
```

### 内部原理

#### next 与返回值的对应关系

```
next 写法与返回值写法的对照：

  next()              → 不返回 / return true / return undefined
  next(false)         → return false
  next('/login')      → return '/login'
  next({ name: 'x' }) → return { name: 'x' }
  next(new Error())   → throw error / return rejected Promise

唯一保留 next 的场景：
  beforeRouteEnter(to, from, next) {
      next(vm => {
          // 访问组件实例
          vm.data = fetchedData;
      });
  }
  → 返回值模式无法实现此功能
  → 因为返回值只能是 boolean/string/object

Vue Router 4 内部处理：
  → 如果守卫声明了第三个参数 → 使用 next 模式
  → 如果守卫只有 0-2 个参数 → 使用返回值模式
  → 两种模式不能混用
```

### 与相关API的对比

| next 写法 | 返回值写法 | 效果 |
|----------|----------|------|
| `next()` | 不返回 | 放行 |
| `next(false)` | `return false` | 取消 |
| `next('/path')` | `return '/path'` | 重定向 |
| `next({ name: 'x' })` | `return { name: 'x' }` | 重定向 |
| `next(vm => {})` | 无等价 | 访问实例 |

### 适用场景

- **维护旧代码：** 理解 Vue Router 3 项目中的 next 用法
- **迁移指导：** 将 next 写法迁移为返回值写法
- **beforeRouteEnter：** 唯一仍需 next 的场景

### 常见问题

#### 从 next 迁移到返回值

**解决方案：**

```javascript
// 迁移前（next 写法）
router.beforeEach((to, from, next) => {
    if (to.meta.requiresAuth) {
        if (isLoggedIn()) {
            next();
        } else {
            next({ name: "login", query: { redirect: to.fullPath } });
        }
    } else {
        next();
    }
});

// 迁移后（返回值写法）
router.beforeEach((to, from) => {
    if (to.meta.requiresAuth && !isLoggedIn()) {
        return { name: "login", query: { redirect: to.fullPath } };
    }
    // 不需要显式放行
});
```

### 注意事项

- Vue Router 4 中 next 已废弃，推荐返回值
- next 和返回值不能混用
- 忘记调用 next 会导致导航永久卡住
- 多次调用 next 会导致不可预测的行为
- beforeRouteEnter 的 next(vm => {}) 仍然需要
- Vue Router 4 根据参数数量自动判断使用哪种模式

### 总结

next 函数是 Vue Router 3 的导航控制方式，Vue Router 4 中废弃并推荐使用返回值替代。返回值模式更安全——不会出现忘记调用或多次调用的问题。迁移方法：next() → 不返回，next(false) → return false，next('/path') → return '/path'。唯一例外是 beforeRouteEnter 的 next(vm => {}) 回调仍然需要。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### return false的导航取消

### 概念说明

在 Vue Router 4 的导航守卫中，返回 `false` 会取消当前导航，用户停留在原来的页面。这是 Vue Router 4 推荐的导航取消方式，替代了 Vue Router 3 中的 `next(false)`。

返回 false 可以用在任何能控制导航的守卫中：全局 beforeEach、全局 beforeResolve、路由独享 beforeEnter、组件内 onBeforeRouteUpdate 和 onBeforeRouteLeave。afterEach 不能取消导航（导航已确认）。

取消导航后，浏览器地址栏会恢复到导航前的 URL（如果地址栏已经变化的话）。afterEach 的 failure 参数会接收到一个 NavigationFailureType.aborted 类型的导航失败信息。

### 基本示例

```javascript
// 全局守卫中取消导航
router.beforeEach((to, from) => {
    // 维护模式：禁止所有导航
    if (isMaintenanceMode() && to.name !== "maintenance") {
        return false; // 取消导航
    }
});

// 条件取消
router.beforeEach((to, from) => {
    // 如果有正在进行的上传，阻止导航
    if (uploadStore.isUploading) {
        const confirm = window.confirm("文件正在上传中，离开将中断上传。确定离开？");
        if (!confirm) {
            return false; // 用户选择留下
        }
    }
});
```

```vue
<!-- 组件内取消导航 -->
<script setup>
import { ref } from "vue";
import { onBeforeRouteLeave } from "vue-router";

const hasUnsavedChanges = ref(false);

onBeforeRouteLeave((to, from) => {
    if (hasUnsavedChanges.value) {
        const answer = window.confirm("有未保存的修改，确定离开？");
        if (!answer) {
            return false; // 取消导航，留在当前页
        }
    }
});
</script>
```

```javascript
// 检测被取消的导航
import { isNavigationFailure, NavigationFailureType } from "vue-router";

router.afterEach((to, from, failure) => {
    if (isNavigationFailure(failure, NavigationFailureType.aborted)) {
        console.log("导航被取消:", failure);
    }
});

// 程序化导航中捕获取消
try {
    await router.push("/dashboard");
} catch (err) {
    if (isNavigationFailure(err, NavigationFailureType.aborted)) {
        console.log("导航被守卫取消");
    }
}
```

### 内部原理

#### return false 的处理流程

```
导航取消的内部流程：

1. 守卫返回 false
2. Vue Router 标记导航为"中止"（aborted）
3. 终止后续所有守卫的执行
4. 恢复浏览器地址栏到导航前的 URL
5. afterEach 的 failure 参数接收中止信息
6. router.push() 返回的 Promise reject

NavigationFailureType：
  aborted    → 守卫返回 false
  cancelled  → 导航过程中发生了新的导航
  duplicated → 导航到当前相同位置
```

### 与相关API的对比

| 返回值 | 效果 | 地址栏 |
|--------|------|--------|
| `return false` | 取消导航 | 恢复原 URL |
| `return undefined` | 允许导航 | 更新为目标 URL |
| `return '/path'` | 重定向 | 更新为重定向 URL |
| 不返回 | 允许导航 | 更新为目标 URL |

### 适用场景

- **离开确认：** 表单有未保存修改时提示
- **上传保护：** 文件上传中禁止离开
- **维护模式：** 全局禁止页面切换
- **权限不足：** 无权限时停留在当前页

### 常见问题

#### return false 后地址栏异常

**解决方案：**

```javascript
// 某些情况下浏览器地址栏可能短暂闪烁
// 这是正常的，Vue Router 会自动恢复

// 如果使用 history.pushState 导致的问题
// 确保守卫中的 return false 是同步返回的
router.beforeEach((to, from) => {
    if (shouldCancel) {
        return false; // 同步返回，地址栏不会闪烁
    }
});

// 异步守卫中取消
router.beforeEach(async (to, from) => {
    const shouldCancel = await checkCondition();
    if (shouldCancel) {
        return false; // 异步返回，地址栏可能短暂变化
    }
});
```

### 注意事项

- return false 取消导航并恢复地址栏
- 后续所有守卫都不会执行
- afterEach 中可以通过 failure 检测被取消的导航
- router.push() 返回的 Promise 会 reject
- 替代了 Vue Router 3 的 next(false)
- 同步返回 false 比异步返回体验更好

### 总结

return false 是 Vue Router 4 取消导航的标准方式。取消后地址栏恢复原 URL，后续守卫不执行。可以在 afterEach 的 failure 参数和 router.push() 的异常中检测。适用于离开确认、上传保护等场景。替代了 Vue Router 3 中的 next(false)，语义更清晰。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### return路由对象的导航重定向

### 概念说明

在 Vue Router 4 的导航守卫中，返回一个路由地址（字符串路径或路由对象）会中断当前导航，转而导航到返回的目标地址。这是守卫中实现重定向的标准方式，替代了 Vue Router 3 中的 `next('/path')` 和 `next({ name: 'xxx' })`。

返回值支持多种格式：
- **字符串路径：** `return '/login'`
- **命名路由对象：** `return { name: 'login', params: { ... } }`
- **带 query 的路由对象：** `return { path: '/login', query: { redirect: to.fullPath } }`
- **带 replace 的路由对象：** `return { path: '/login', replace: true }` — 使用 replace 而非 push

重定向会开启一个新的导航流程，新的导航同样会经过所有守卫，因此需要注意避免无限循环。

### 基本示例

```javascript
// 登录验证：未登录重定向到登录页
router.beforeEach((to, from) => {
    const isLoggedIn = checkAuth();

    if (to.meta.requiresAuth && !isLoggedIn) {
        // 返回路由对象，携带 redirect 参数
        return {
            name: "login",
            query: { redirect: to.fullPath }, // 登录后跳回原页面
        };
    }
});

// 角色权限：重定向到对应的首页
router.beforeEach((to, from) => {
    if (to.path === "/") {
        const role = getUserRole();
        switch (role) {
            case "admin":
                return "/admin/dashboard"; // 字符串路径
            case "editor":
                return { name: "editor-home" }; // 命名路由
            default:
                return "/home";
        }
    }
});

// 登录页：登录后跳回来源页
router.beforeEach((to, from) => {
    if (to.name === "login" && isLoggedIn()) {
        // 已登录不能访问登录页
        const redirect = to.query.redirect || "/";
        return redirect; // 跳回来源页或首页
    }
});
```

```javascript
// 路由独享守卫中的重定向
const routes = [
    {
        path: "/old-feature",
        beforeEnter: () => {
            // 功能迁移，重定向到新路径
            return { path: "/new-feature", replace: true };
            // replace: true → 不会在浏览器历史中留下记录
        },
    },
];
```

```vue
<!-- 组件内守卫的重定向 -->
<script setup>
import { onBeforeRouteLeave } from "vue-router";

onBeforeRouteLeave((to, from) => {
    // 特定条件下强制跳转到其他页面
    if (needsVerification()) {
        return { name: "verify", query: { next: to.fullPath } };
    }
});
</script>
```

### 内部原理

#### 返回路由对象的导航流程

```
守卫返回路由对象的处理：

router.beforeEach((to, from) => {
    return { name: 'login', query: { redirect: to.fullPath } };
});

1. 守卫返回路由对象
2. Vue Router 中止当前导航
3. 将返回值解析为完整的路由地址
4. 启动新的导航到该地址
5. 新导航走完整的守卫流程
   → 再次触发 beforeEach
   → 需要确保不会无限循环

避免无限循环的关键：
  router.beforeEach((to) => {
      if (to.meta.requiresAuth && !isLoggedIn()) {
          // 重定向到 login
          // login 页面没有 requiresAuth
          // → 第二次 beforeEach 不会进入这个 if
          return { name: 'login' };
      }
      // 其他路由放行
  });
```

### 与相关API的对比

| 返回值 | 导航行为 | 历史记录 |
|--------|---------|---------|
| `return '/path'` | 重定向（push） | 新增记录 |
| `return { path: '/x' }` | 重定向（push） | 新增记录 |
| `return { path: '/x', replace: true }` | 重定向（replace） | 替换记录 |
| `return false` | 取消导航 | 无变化 |

### 适用场景

- **登录拦截：** 未登录重定向到登录页
- **权限分发：** 根据角色重定向到不同首页
- **功能迁移：** 旧路径重定向到新路径
- **步骤控制：** 未完成前置步骤时重定向

### 常见问题

#### 无限重定向循环

**解决方案：**

```javascript
// 错误：可能导致无限循环
router.beforeEach((to) => {
    if (!isLoggedIn()) {
        return "/login"; // login 也会触发 beforeEach
        // → 再次检查 isLoggedIn → false
        // → 又重定向到 /login → 无限循环！
    }
});

// 正确：排除登录页本身
router.beforeEach((to) => {
    if (to.meta.requiresAuth && !isLoggedIn()) {
        return "/login"; // login 页没有 requiresAuth → 放行
    }
});

// 或者明确排除
router.beforeEach((to) => {
    const whitelist = ["/login", "/register", "/forgot-password"];
    if (!isLoggedIn() && !whitelist.includes(to.path)) {
        return "/login";
    }
});
```

### 注意事项

- 返回路由对象会启动新的导航流程
- 新导航也会经过所有守卫，注意避免循环
- replace: true 不在历史中留下记录
- 携带 query 参数可以在登录后跳回原页面
- 字符串和路由对象都可以作为返回值
- 使用 meta 或白名单避免循环重定向

### 总结

在导航守卫中返回路由地址（字符串或对象）会中断当前导航并重定向到目标。支持 path、name、query、params、replace 等选项。新的导航走完整守卫流程，需要注意避免无限循环。通过 meta 标记或白名单排除不需要拦截的路由。replace: true 可以替换历史记录而非新增。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### useRoute的当前路由信息

### 概念说明

`useRoute` 是 Vue Router 4 提供的组合式函数，用于在 `<script setup>` 或 `setup()` 中获取当前路由的响应式信息。返回的 route 对象是只读的响应式引用，当路由变化时会自动更新。

useRoute 返回的对象包含以下常用属性：
- `path`：当前路径（不含 query 和 hash）
- `fullPath`：完整路径（含 query 和 hash）
- `params`：动态路由参数对象
- `query`：查询参数对象
- `hash`：URL 的 hash 部分
- `name`：当前路由的名称
- `meta`：路由元信息
- `matched`：匹配到的路由记录数组
- `redirectedFrom`：如果存在重定向，记录来源路由

useRoute 等价于 Options API 中的 `this.$route`，但使用组合式函数的方式更符合 Vue 3 的开发模式。

### 基本示例

```vue
<script setup>
import { useRoute, useRouter } from "vue-router";
import { watch, computed } from "vue";

const route = useRoute();

// 获取动态参数
console.log(route.params.id); // 如 '123'

// 获取查询参数
console.log(route.query.page); // 如 '2'
console.log(route.query.sort); // 如 'name'

// 获取路由元信息
console.log(route.meta.title); // 如 '用户详情'
console.log(route.meta.requiresAuth); // 如 true

// 获取路由名称
console.log(route.name); // 如 'user-detail'

// 计算属性：基于路由信息
const pageTitle = computed(() => route.meta.title || "默认标题");
const userId = computed(() => Number(route.params.id));

// 监听路由变化
watch(
    () => route.params.id,
    (newId, oldId) => {
        console.log(`用户ID从 ${oldId} 变为 ${newId}`);
        fetchUserData(newId);
    }
);

// 监听整个路由
watch(
    () => route.fullPath,
    (newPath) => {
        console.log("路由变化:", newPath);
    }
);
</script>

<template>
    <div>
        <h1>{{ pageTitle }}</h1>
        <p>路径: {{ route.path }}</p>
        <p>完整路径: {{ route.fullPath }}</p>
        <p>用户ID: {{ route.params.id }}</p>
        <p>页码: {{ route.query.page || 1 }}</p>
    </div>
</template>
```

### 内部原理

#### useRoute 的响应式机制

```
useRoute 的内部实现：

1. Vue Router 在 app.use(router) 时
   → 通过 provide 注入 currentRoute（响应式引用）
   → currentRoute 是 shallowRef 包装的路由对象

2. useRoute() 调用时
   → 通过 inject 获取 currentRoute
   → 返回的是只读的响应式代理

3. 路由变化时
   → Vue Router 更新 currentRoute.value
   → 触发所有依赖 route 属性的组件重新渲染

route 对象的属性：
  {
      path:           '/user/123',
      fullPath:       '/user/123?page=2#info',
      params:         { id: '123' },
      query:          { page: '2' },
      hash:           '#info',
      name:           'user-detail',
      meta:           { title: '用户详情', requiresAuth: true },
      matched:        [RouteRecord, RouteRecord, ...],
      redirectedFrom: undefined // 或来源路由
  }

注意：
  → route 是只读的，不能直接修改
  → 修改路由需要用 router.push/replace
  → params 和 query 的值都是字符串
```

### 与相关API的对比

| API | 使用场景 | 返回值 |
|-----|---------|--------|
| useRoute() | Composition API | 当前路由信息（只读） |
| useRouter() | Composition API | 路由实例（可导航） |
| this.$route | Options API | 当前路由信息 |
| this.$router | Options API | 路由实例 |

### 适用场景

- **获取路由参数：** params、query、hash
- **动态标题：** 根据 meta.title 设置标题
- **条件渲染：** 根据路由名称或路径显示不同内容
- **数据请求：** 根据路由参数请求对应数据

### 常见问题

#### useRoute 的属性解构丢失响应性

**解决方案：**

```vue
<script setup>
import { useRoute } from "vue-router";
import { computed, toRefs } from "vue";

const route = useRoute();

// 错误：直接解构会丢失响应性
// const { params, query } = route;
// params 和 query 变成了普通对象快照

// 正确方案1：不解构，直接使用 route.xxx
console.log(route.params.id);

// 正确方案2：使用 computed 包装
const userId = computed(() => route.params.id);
const page = computed(() => route.query.page);

// 正确方案3：用 watch 监听
import { watch } from "vue";
watch(() => route.params.id, (newId) => {
    // 响应变化
});
</script>
```

### 注意事项

- useRoute 只能在 setup 或 Composition API 函数中调用
- 返回值是只读的响应式对象
- 不要直接解构 route（会丢失响应性）
- params 和 query 的值都是字符串类型
- 使用 computed 或 watch 响应路由变化
- 修改路由需要用 useRouter() 的方法

### 总结

useRoute 返回当前路由的只读响应式信息，包含 path、params、query、hash、name、meta、matched 等属性。路由变化时自动更新。不要直接解构，使用 computed 或 watch 响应变化。params 和 query 值为字符串，需要时手动转换类型。等价于 Options API 的 this.$route。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### useRouter的路由实例方法

### 概念说明

`useRouter` 是 Vue Router 4 提供的组合式函数，用于在 `<script setup>` 或 `setup()` 中获取路由实例。返回的 router 对象提供了程序化导航方法（push、replace、go、back、forward）和路由管理方法（addRoute、removeRoute、hasRoute、getRoutes）。

useRouter 等价于 Options API 中的 `this.$router`。与 useRoute 不同，useRouter 返回的是路由实例本身（不是响应式的当前路由信息），用于执行导航操作而非读取路由状态。

router 实例还暴露了导航守卫注册方法（beforeEach、beforeResolve、afterEach）和工具属性（currentRoute、options）。

### 基本示例

```vue
<script setup>
import { useRouter, useRoute } from "vue-router";

const router = useRouter();
const route = useRoute();

// 程序化导航
function goToUser(id) {
    router.push({ name: "user", params: { id } });
}

function goToSearch(keyword) {
    router.push({ path: "/search", query: { q: keyword } });
}

// 替换当前路由（不留历史记录）
function replaceToHome() {
    router.replace("/");
}

// 前进/后退
function goBack() {
    router.back(); // 等价于 router.go(-1)
}

function goForward() {
    router.forward(); // 等价于 router.go(1)
}

// 动态添加路由
function addAdminRoutes() {
    router.addRoute({
        path: "/admin/reports",
        name: "admin-reports",
        component: () => import("@/views/AdminReports.vue"),
    });
}

// 检查路由是否存在
function checkRoute(name) {
    return router.hasRoute(name);
}

// 获取所有路由
function getAllRoutes() {
    return router.getRoutes();
}
</script>

<template>
    <button @click="goToUser(123)">查看用户</button>
    <button @click="goBack">返回</button>
    <button @click="replaceToHome">回到首页</button>
</template>
```

### 内部原理

#### useRouter 与 useRoute 的关系

```
useRouter 和 useRoute 的区别：

useRouter()：
  → 返回路由实例（router）
  → 提供导航方法：push、replace、go、back、forward
  → 提供路由管理：addRoute、removeRoute、hasRoute、getRoutes
  → 提供守卫注册：beforeEach、beforeResolve、afterEach
  → 不是响应式的（实例不变，方法不变）

useRoute()：
  → 返回当前路由信息（route）
  → 提供路由状态：path、params、query、meta、matched
  → 是响应式的（路由变化时自动更新）
  → 只读，不能修改

router 实例的主要方法：
  push(to)         → 导航到新路由（添加历史记录）
  replace(to)      → 导航到新路由（替换历史记录）
  go(n)            → 前进/后退 n 步
  back()           → 后退一步（go(-1)）
  forward()        → 前进一步（go(1)）
  addRoute(route)  → 动态添加路由
  removeRoute(name)→ 动态删除路由
  hasRoute(name)   → 检查路由是否存在
  getRoutes()      → 获取所有路由记录
  isReady()        → 返回 Promise，路由准备就绪时 resolve
```

### 与相关API的对比

| API | 作用 | 响应式 | 常用方法 |
|-----|------|--------|---------|
| useRouter() | 路由操作 | 否 | push、replace、go |
| useRoute() | 路由信息 | 是 | params、query、meta |
| this.$router | 路由操作 | 否 | push、replace、go |
| this.$route | 路由信息 | 是 | params、query、meta |

### 适用场景

- **程序化导航：** 按钮点击、表单提交后跳转
- **动态路由：** 根据权限动态添加路由
- **历史导航：** 前进、后退操作
- **路由检查：** 判断某个路由是否存在

### 常见问题

#### 在非组件环境中使用 router

**解决方案：**

```javascript
// 在 store、工具函数等非组件环境中
// 不能使用 useRouter（只能在 setup 中调用）
// 直接导入 router 实例

// router/index.js
import { createRouter, createWebHistory } from "vue-router";
const router = createRouter({ /* ... */ });
export default router;

// utils/auth.js
import router from "@/router";

export function logout() {
    clearToken();
    router.push("/login"); // 直接使用导入的 router 实例
}
```

### 注意事项

- useRouter 只能在 setup 或组合式函数中调用
- 非组件环境直接导入 router 实例
- push 返回 Promise，可以 await
- push 和 replace 的参数格式相同
- addRoute 添加的路由不会自动触发导航
- router.currentRoute 等价于 useRoute() 返回值

### 总结

useRouter 返回路由实例，提供程序化导航（push/replace/go/back/forward）和路由管理（addRoute/removeRoute/hasRoute/getRoutes）方法。与 useRoute 的区别是：useRouter 用于执行操作，useRoute 用于读取状态。只能在 setup 中调用，非组件环境直接导入 router 实例。等价于 Options API 的 this.$router。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### 程序化导航router.push

### 概念说明

`router.push` 是 Vue Router 中最常用的程序化导航方法，用于在 JavaScript 代码中触发路由跳转。它会在浏览器历史记录中添加一条新记录，用户可以通过浏览器的后退按钮回到之前的页面。

router.push 的效果等同于点击 `<RouterLink to="...">`。实际上，RouterLink 内部就是调用 router.push。

push 接受的参数与 RouterLink 的 `to` 属性格式相同，支持：
- **字符串路径：** `router.push('/user/123')`
- **路径对象：** `router.push({ path: '/user/123' })`
- **命名路由：** `router.push({ name: 'user', params: { id: 123 } })`
- **带 query：** `router.push({ path: '/search', query: { q: 'vue' } })`
- **带 hash：** `router.push({ path: '/page', hash: '#section' })`

push 返回一个 Promise，导航成功时 resolve，失败时 reject。

### 基本示例

```vue
<script setup>
import { useRouter } from "vue-router";

const router = useRouter();

// 字符串路径
function goHome() {
    router.push("/");
}

// 路径对象
function goToAbout() {
    router.push({ path: "/about" });
}

// 命名路由 + params
function goToUser(id) {
    router.push({ name: "user", params: { id } });
}

// 带 query 参数
function search(keyword) {
    router.push({ path: "/search", query: { q: keyword, page: 1 } });
    // URL: /search?q=keyword&page=1
}

// 带 hash
function goToSection() {
    router.push({ path: "/docs", hash: "#installation" });
    // URL: /docs#installation
}

// await 等待导航完成
async function navigateAndLog() {
    try {
        await router.push("/dashboard");
        console.log("导航成功");
    } catch (err) {
        console.error("导航失败:", err);
    }
}

// 注意：path 和 params 不能同时使用
// 错误：router.push({ path: '/user', params: { id: 123 } })
// params 会被忽略！
// 正确：router.push({ name: 'user', params: { id: 123 } })
// 或者：router.push({ path: `/user/${id}` })
</script>

<template>
    <button @click="goHome">首页</button>
    <button @click="goToUser(123)">用户123</button>
    <button @click="search('vue')">搜索Vue</button>
</template>
```

### 内部原理

#### router.push 的导航流程

```
router.push('/dashboard') 的执行流程：

1. 解析目标路由
   → 将参数解析为标准化的路由位置
   → 匹配 routes 配置中对应的路由记录

2. 执行导航守卫（按顺序）
   → beforeRouteLeave
   → beforeEach
   → beforeRouteUpdate / beforeEnter
   → beforeRouteEnter
   → beforeResolve

3. 确认导航
   → 更新 currentRoute
   → 调用 history.pushState() 添加历史记录
   → 触发 afterEach

4. 更新视图
   → RouterView 检测到 currentRoute 变化
   → 渲染新的路由组件

5. Promise resolve
   → push 返回的 Promise 完成
   → 调用方的 await 继续执行

参数冲突规则：
  path + params → params 被忽略
  path + query → 正常工作
  name + params → 正常工作
  name + query → 正常工作
```

### 与相关API的对比

| 方法 | 历史记录 | 用途 |
|------|---------|------|
| router.push | 新增一条 | 普通导航 |
| router.replace | 替换当前 | 不留历史记录的导航 |
| router.go(n) | 前进/后退 | 历史导航 |
| `<RouterLink>` | 新增一条 | 模板中的导航 |

### 适用场景

- **登录成功后跳转：** 表单提交后导航
- **搜索触发：** 输入关键词后跳转搜索页
- **按钮导航：** 按钮点击触发页面跳转
- **条件导航：** 根据逻辑判断跳转不同页面

### 常见问题

#### path 和 params 不能同时使用

**解决方案：**

```javascript
// 错误：path 和 params 同时使用，params 被忽略
router.push({ path: "/user", params: { id: 123 } });
// 实际导航到 /user，没有 id

// 正确方案1：使用命名路由 + params
router.push({ name: "user", params: { id: 123 } });

// 正确方案2：将参数拼接到 path 中
router.push({ path: `/user/${123}` });

// 正确方案3：使用模板字符串
const id = 123;
router.push(`/user/${id}`);
```

### 注意事项

- push 返回 Promise，可以 await
- path 和 params 不能同时使用
- 导航到当前相同路由会触发 duplicated 错误
- params 值会被编码到 URL 中
- query 值都是字符串类型
- push 会触发完整的导航守卫流程

### 总结

router.push 是程序化导航的核心方法，在历史记录中新增一条记录。支持字符串路径、路径对象、命名路由等多种格式。返回 Promise，可以 await 等待导航完成。注意 path 和 params 不能同时使用，需要用 name + params 或将参数拼接到 path 中。等价于 RouterLink 的点击行为。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### 程序化导航router.replace

### 概念说明

`router.replace` 与 `router.push` 功能类似，唯一的区别是它不会在浏览器历史记录中添加新条目，而是替换当前的历史记录。导航完成后，用户按浏览器后退按钮不会回到被替换的页面，而是回到更早的页面。

replace 的参数格式与 push 完全相同，支持字符串路径、路径对象、命名路由等。也可以在 push 的参数对象中设置 `replace: true` 达到同样效果：`router.push({ path: '/login', replace: true })`。

replace 同样返回 Promise，走完整的导航守卫流程。

典型使用场景：登录成功后用 replace 跳转到首页（不希望用户后退回登录页）、404 页面重定向、权限不足的重定向等。

### 基本示例

```vue
<script setup>
import { useRouter } from "vue-router";

const router = useRouter();

// 登录成功后替换到首页
async function handleLogin() {
    const success = await loginAPI(username, password);
    if (success) {
        // 使用 replace 而非 push
        // 用户后退时不会回到登录页
        router.replace("/dashboard");
    }
}

// 等价写法：push + replace: true
function handleLoginAlt() {
    router.push({ path: "/dashboard", replace: true });
}

// 权限不足时替换到提示页
function redirectToForbidden() {
    router.replace({ name: "forbidden" });
    // 用户后退时回到权限不足前的页面，跳过当前页
}

// 替换并携带 query
function updateSearchParams(params) {
    router.replace({
        path: "/search",
        query: { ...router.currentRoute.value.query, ...params },
    });
    // 更新搜索参数但不增加历史记录
    // 用户后退时不会逐条回退搜索参数变化
}
</script>
```

```vue
<!-- RouterLink 的 replace 模式 -->
<template>
    <!-- replace 属性让 RouterLink 使用 replace 而非 push -->
    <RouterLink to="/dashboard" replace>进入仪表盘</RouterLink>
</template>
```

### 内部原理

#### push 与 replace 的历史记录区别

```
push 与 replace 的区别：

假设历史记录栈为：[A, B, C]，当前在 C

router.push('/D')：
  历史记录变为：[A, B, C, D]，当前在 D
  后退 → 回到 C

router.replace('/D')：
  历史记录变为：[A, B, D]，当前在 D
  后退 → 回到 B（C 被替换了）

内部实现：
  push   → 调用 history.pushState()    → 新增记录
  replace → 调用 history.replaceState() → 替换记录

其他完全一致：
  → 参数格式相同
  → 导航守卫流程相同
  → 返回 Promise
  → 触发组件切换
```

### 与相关API的对比

| 方法 | 历史记录 | 后退行为 | 典型场景 |
|------|---------|---------|---------|
| push | 新增一条 | 回到上一页 | 普通导航 |
| replace | 替换当前 | 跳过被替换页 | 登录跳转、参数更新 |

### 适用场景

- **登录跳转：** 登录成功后替换到首页
- **参数更新：** 更新搜索参数不增加历史
- **错误重定向：** 权限不足或404替换到提示页
- **步骤跳过：** 完成某步骤后不允许后退回去

### 常见问题

#### 何时用 push 何时用 replace

**解决方案：**

```javascript
// 用 push：用户应该能后退回来
router.push("/product/123"); // 从列表进入详情，能后退到列表

// 用 replace：用户不应该后退回来
router.replace("/dashboard"); // 登录后进入首页，不应后退到登录
router.replace({ query: { page: 2 } }); // 翻页不应产生大量历史

// 判断标准：
// 后退到之前的页面是否有意义？
// 有意义 → push
// 无意义或有害 → replace
```

### 注意事项

- replace 替换当前历史记录，不新增
- 参数格式与 push 完全相同
- 同样返回 Promise，走完整守卫流程
- RouterLink 组件通过 replace 属性使用
- push 中设置 replace: true 效果相同
- 适合不希望用户后退到的导航场景

### 总结

router.replace 替换当前历史记录进行导航，用户后退时跳过被替换的页面。参数格式、守卫流程、返回值与 push 完全一致，唯一区别是历史记录的处理方式。适用于登录跳转、搜索参数更新、错误重定向等不希望用户后退的场景。RouterLink 通过 replace 属性支持。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### 程序化导航router.go/back/forward

### 概念说明

`router.go(n)` 用于在浏览器历史记录中前进或后退指定的步数，类似于 `window.history.go(n)`。参数 n 为正数表示前进，负数表示后退，0 表示刷新当前页面。

Vue Router 还提供了两个快捷方法：
- `router.back()`：等价于 `router.go(-1)`，后退一步
- `router.forward()`：等价于 `router.go(1)`，前进一步

这三个方法直接操作浏览器的历史记录栈，如果历史记录中没有足够的条目（如刚打开应用就调用 back），操作会被静默忽略，不会报错。

与 push/replace 不同，go/back/forward 不接受路由地址参数，只能在历史记录中移动。

### 基本示例

```vue
<script setup>
import { useRouter } from "vue-router";

const router = useRouter();

// 后退一步
function goBack() {
    router.back();
    // 等价于 router.go(-1)
    // 等价于 window.history.back()
}

// 前进一步
function goForward() {
    router.forward();
    // 等价于 router.go(1)
    // 等价于 window.history.forward()
}

// 后退两步
function goBackTwoSteps() {
    router.go(-2);
}

// 前进三步
function goForwardThree() {
    router.go(3);
}

// 刷新当前页面（不推荐，用其他方式）
function refresh() {
    router.go(0);
    // 等价于 window.location.reload()
}

// 如果步数超出历史记录范围，静默忽略
function safeBack() {
    router.go(-1);
    // 如果没有上一页，什么都不发生
}
</script>

<template>
    <nav>
        <button @click="goBack">后退</button>
        <button @click="goForward">前进</button>
    </nav>
</template>
```

```vue
<!-- 实际应用：带条件的后退 -->
<script setup>
import { useRouter, useRoute } from "vue-router";

const router = useRouter();
const route = useRoute();

function smartBack() {
    // 如果有来源页面，后退
    if (window.history.length > 1) {
        router.back();
    } else {
        // 没有历史记录（如直接打开链接），跳转首页
        router.push("/");
    }
}
</script>
```

### 内部原理

#### go/back/forward 与浏览器历史的关系

```
历史记录栈示例：

[首页, 列表页, 详情页, 设置页]
                              ↑ 当前位置

router.back() / router.go(-1)：
  [首页, 列表页, 详情页, 设置页]
                    ↑ 移动到详情页

router.go(-2)（从设置页）：
  [首页, 列表页, 详情页, 设置页]
           ↑ 移动到列表页

router.forward() / router.go(1)（从列表页）：
  [首页, 列表页, 详情页, 设置页]
                    ↑ 移动到详情页

router.go(100)（超出范围）：
  → 静默忽略，什么都不发生

内部实现：
  router.go(n)      → window.history.go(n)
  router.back()     → window.history.go(-1)
  router.forward()  → window.history.go(1)
  → 触发 popstate 事件
  → Vue Router 监听 popstate 更新路由
```

### 与相关API的对比

| 方法 | 参数 | 作用 | 历史记录 |
|------|------|------|---------|
| push | 路由地址 | 导航到新页面 | 新增 |
| replace | 路由地址 | 导航到新页面 | 替换 |
| go(n) | 数字 | 历史前进/后退 | 移动指针 |
| back() | 无 | 后退一步 | go(-1) |
| forward() | 无 | 前进一步 | go(1) |

### 适用场景

- **返回上一页：** 详情页返回列表
- **导航控制：** 自定义前进/后退按钮
- **多步表单：** 步骤间的前后切换
- **移动端手势：** 滑动返回

### 常见问题

#### 没有历史记录时的后退处理

**解决方案：**

```javascript
function smartBack(fallbackPath = "/") {
    // 方案1：检查历史记录长度
    if (window.history.length > 1) {
        router.back();
    } else {
        router.push(fallbackPath);
    }

    // 方案2：使用 from 路由判断
    // 如果 from 是空路由（直接打开链接）
    // 则跳转到默认页面
}
```

### 注意事项

- go/back/forward 不接受路由地址参数
- 超出历史记录范围时静默忽略
- go(0) 会刷新页面
- back/forward 是 go(-1)/go(1) 的快捷方式
- 没有历史记录时 back 无效，需要兜底处理
- 触发 popstate 事件，走正常的路由匹配流程

### 总结

router.go(n) 在历史记录中前进或后退 n 步，back() 和 forward() 是 go(-1) 和 go(1) 的快捷方式。内部调用 window.history.go()。超出范围静默忽略。与 push/replace 的区别是不接受路由地址，只能在历史记录中移动。没有历史记录时需要兜底跳转到默认页面。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### 路由参数params与查询参数query

### 概念说明

Vue Router 提供两种在路由间传递数据的方式：`params`（路由参数）和 `query`（查询参数）。它们在 URL 格式、定义方式、持久性等方面有本质区别。

**params（路由参数）：** 定义在路由路径中，如 `/user/:id`。参数是 URL 路径的一部分，如 `/user/123`。必须在路由配置中预先声明。刷新页面时 params 从 URL 中解析恢复。使用命名路由导航时通过 `params` 对象传递。

**query（查询参数）：** 附加在 URL 的 `?` 后面，如 `/search?q=vue&page=2`。不需要在路由配置中声明，可以随意添加。刷新页面时 query 从 URL 中解析恢复。任何路由都可以携带 query。

两者的值在 URL 中都是字符串类型，通过 `route.params` 和 `route.query` 访问。

### 基本示例

```javascript
// 路由配置
const routes = [
    // params 需要在 path 中声明
    { path: "/user/:id", name: "user", component: UserView },
    { path: "/product/:category/:id", name: "product", component: ProductView },

    // query 不需要在路由配置中声明
    { path: "/search", name: "search", component: SearchView },
    { path: "/list", name: "list", component: ListView },
];
```

```vue
<script setup>
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

// === params 使用 ===
// 导航：传递 params（必须用 name，不能用 path）
function goToUser(id) {
    router.push({ name: "user", params: { id } });
    // URL: /user/123
}

// 获取 params
console.log(route.params.id); // '123'（字符串）

// === query 使用 ===
// 导航：传递 query（path 和 name 都可以）
function search(keyword, page) {
    router.push({
        path: "/search",
        query: { q: keyword, page, sort: "relevance" },
    });
    // URL: /search?q=vue&page=1&sort=relevance
}

// 获取 query
console.log(route.query.q);    // 'vue'（字符串）
console.log(route.query.page); // '1'（字符串，不是数字）
console.log(route.query.sort); // 'relevance'

// === 混合使用 ===
function goToProduct(category, id, color) {
    router.push({
        name: "product",
        params: { category, id },
        query: { color },
    });
    // URL: /product/phone/42?color=black
}
</script>

<template>
    <!-- RouterLink 中使用 -->
    <RouterLink :to="{ name: 'user', params: { id: 123 } }">
        用户123
    </RouterLink>

    <RouterLink :to="{ path: '/search', query: { q: 'vue' } }">
        搜索Vue
    </RouterLink>
</template>
```

### 内部原理

#### params 与 query 的 URL 编码

```
params 和 query 在 URL 中的位置：

URL 结构：
  https://example.com/user/123/post/42?sort=date&order=desc#comments
  ├── path: /user/123/post/42
  │   └── params: { id: '123', postId: '42' }（路径的一部分）
  ├── query: ?sort=date&order=desc
  │   └── query: { sort: 'date', order: 'desc' }
  └── hash: #comments

params 的解析：
  路由配置: /user/:id/post/:postId
  URL 路径: /user/123/post/42
  → 正则匹配提取: { id: '123', postId: '42' }

query 的解析：
  URL 查询串: ?sort=date&order=desc
  → URLSearchParams 解析: { sort: 'date', order: 'desc' }

特殊字符编码：
  params 中的特殊字符会被 encodeURIComponent 编码
  query 中的特殊字符也会被编码
  中文等字符会被编码为 %XX 格式
```

### 与相关API的对比

| 特性 | params | query |
|------|--------|-------|
| URL 位置 | 路径中 `/user/123` | `?` 后面 `?q=vue` |
| 路由配置 | 必须声明 `:param` | 不需要声明 |
| 导航方式 | 必须用 name | path 或 name 都可以 |
| 可见性 | 路径的一部分 | 查询字符串 |
| 语义 | 资源标识（必要） | 筛选/排序（可选） |
| 刷新保留 | 保留 | 保留 |
| 值类型 | 字符串 | 字符串 |

### 适用场景

- **params：** 资源标识（用户ID、文章ID、分类名）
- **query：** 筛选条件、排序方式、分页、搜索关键词
- **混合使用：** /product/phone/42?color=black&size=large

### 常见问题

#### params 和 query 值都是字符串

**解决方案：**

```vue
<script setup>
import { useRoute } from "vue-router";
import { computed } from "vue";

const route = useRoute();

// params 和 query 的值都是字符串
// 需要手动转换类型

const userId = computed(() => Number(route.params.id));
const page = computed(() => Number(route.query.page) || 1);
const isActive = computed(() => route.query.active === "true");

// 数组类型的 query（如 ?tags=vue&tags=react）
// 单个值时是字符串，多个值时是数组
const tags = computed(() => {
    const t = route.query.tags;
    if (Array.isArray(t)) return t;
    if (t) return [t];
    return [];
});
</script>
```

### 注意事项

- params 必须在路由配置中声明，query 不需要
- params 必须用 name 导航，query 可以用 path
- path 和 params 不能同时在 push 中使用
- 两者的值都是字符串，需要时手动转换
- 刷新页面两者都会保留（从 URL 解析）
- query 中同名参数多次出现会变成数组

### 总结

params 是 URL 路径的一部分，需要在路由配置中声明，适合资源标识。query 在 URL 的 `?` 后面，不需要声明，适合筛选排序等可选参数。两者的值都是字符串。params 必须用 name 导航，query 用 path 或 name 都可以。可以混合使用。刷新页面两者都从 URL 中恢复。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### 滚动行为scrollBehavior的自定义

### 概念说明

`scrollBehavior` 是 `createRouter` 的配置选项，用于控制路由切换时页面的滚动位置。默认情况下，浏览器在路由切换后不会自动滚动到顶部（SPA 的特点），通过 scrollBehavior 可以自定义滚动逻辑。

scrollBehavior 是一个函数，接收三个参数：
- `to`：即将进入的目标路由
- `from`：当前正要离开的路由
- `savedPosition`：浏览器前进/后退时保存的滚动位置（只在通过 back/forward 导航时有值，否则为 null）

函数需要返回一个滚动位置对象，格式为 `{ top, left, behavior }` 或 `{ el, top, behavior }`（滚动到指定元素）。也可以返回 `false` 或空对象来不做任何滚动。还可以返回 Promise 实现延迟滚动。

scrollBehavior 只在 History 模式下生效，Hash 模式下不保证行为一致。

### 基本示例

```javascript
import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
    history: createWebHistory(),
    routes: [/* ... */],

    scrollBehavior(to, from, savedPosition) {
        // 场景1：浏览器前进/后退时恢复之前的滚动位置
        if (savedPosition) {
            return savedPosition;
            // 返回 { top: 200, left: 0 } 之类的保存位置
        }

        // 场景2：路由带 hash 时滚动到对应锚点
        if (to.hash) {
            return {
                el: to.hash,          // 如 '#section-2'
                behavior: "smooth",   // 平滑滚动
                top: 80,              // 偏移量（如固定头部的高度）
            };
        }

        // 场景3：默认滚动到顶部
        return { top: 0 };
    },
});
```

```javascript
// 高级用法：延迟滚动（等待过渡动画完成）
const router = createRouter({
    history: createWebHistory(),
    routes: [/* ... */],

    scrollBehavior(to, from, savedPosition) {
        // 返回 Promise，延迟滚动
        return new Promise((resolve) => {
            setTimeout(() => {
                if (savedPosition) {
                    resolve(savedPosition);
                } else {
                    resolve({ top: 0 });
                }
            }, 300); // 等待 300ms（过渡动画时长）
        });
    },
});
```

```javascript
// 根据路由 meta 控制滚动
const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: "/list", meta: { saveScroll: true }, component: ListView },
        { path: "/detail/:id", component: DetailView },
    ],

    scrollBehavior(to, from, savedPosition) {
        // 带 saveScroll 的页面恢复位置
        if (savedPosition) {
            return savedPosition;
        }

        // 某些页面不滚动到顶部
        if (to.meta.saveScroll) {
            return false; // 不改变滚动位置
        }

        return { top: 0 };
    },
});
```

### 内部原理

#### scrollBehavior 的执行时机

```
scrollBehavior 在导航流程中的位置：

1. 导航守卫全部通过
2. 导航被确认
3. afterEach 钩子执行
4. DOM 更新（新组件渲染）
5. ★ scrollBehavior 执行     ← 在 DOM 更新后
6. 页面滚动到指定位置

savedPosition 的来源：
  → 用户点击浏览器前进/后退按钮时
  → 浏览器自动保存当前滚动位置到 history.state
  → Vue Router 在 popstate 事件中读取
  → 传给 scrollBehavior 的第三个参数

返回值格式：
  { top: 0 }                          → 滚动到顶部
  { top: 0, left: 0 }                 → 滚动到左上角
  { el: '#section' }                  → 滚动到 #section 元素
  { el: '#section', top: 80 }         → 滚动到 #section 上方 80px
  { top: 0, behavior: 'smooth' }      → 平滑滚动到顶部
  false                                → 不滚动
  Promise<Position>                    → 延迟滚动
```

### 与相关API的对比

| 返回值 | 效果 | 使用场景 |
|--------|------|---------|
| `{ top: 0 }` | 滚动到顶部 | 新页面导航 |
| `savedPosition` | 恢复保存位置 | 前进/后退 |
| `{ el: '#id' }` | 滚动到元素 | 锚点导航 |
| `{ el: '#id', top: 80 }` | 滚动到元素+偏移 | 有固定头部 |
| `false` | 不滚动 | 保持当前位置 |
| `Promise` | 延迟滚动 | 等待动画 |

### 适用场景

- **新页面置顶：** 导航到新页面时滚动到顶部
- **恢复位置：** 浏览器前进/后退时恢复滚动位置
- **锚点定位：** URL 带 hash 时滚动到对应元素
- **延迟滚动：** 等待过渡动画完成后再滚动

### 常见问题

#### 固定头部导致锚点被遮挡

**解决方案：**

```javascript
scrollBehavior(to) {
    if (to.hash) {
        return {
            el: to.hash,
            // 固定头部高度 64px + 间距 16px
            top: 80,
            behavior: "smooth",
        };
    }
    return { top: 0 };
}
```

### 注意事项

- 只在 History 模式下可靠工作
- savedPosition 只在前进/后退时有值
- 返回 Promise 可以实现延迟滚动
- el 选择器必须对应存在的 DOM 元素
- behavior: 'smooth' 实现平滑滚动
- Hash 模式下行为可能不一致

### 总结

scrollBehavior 自定义路由切换时的滚动行为，在 DOM 更新后执行。支持滚动到顶部、恢复保存位置、滚动到锚点元素、延迟滚动等模式。savedPosition 只在前进/后退时有值。el 配合 top 偏移可以处理固定头部遮挡问题。返回 Promise 可以等待过渡动画完成后再滚动。只在 History 模式下可靠工作。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。



## 7.10 Vue3.5+新特性

### 响应式系统性能优化(数组索引追踪)

### 概念说明

Vue 3.5 对响应式系统的底层实现进行了重大重构，其中一项关键优化是数组索引追踪的改进。在 Vue 3.5 之前，通过索引直接访问和修改数组元素（如 `arr[0]`、`arr[5] = newValue`）的响应式追踪存在性能开销较大的问题，因为 Proxy 需要对每个索引访问都进行依赖收集。

Vue 3.5 重写了响应式系统的内部数据结构，将依赖追踪从基于 `Set` 的结构改为基于双向链表（doubly-linked list）的结构。这使得依赖的添加和移除操作从 O(n) 降低到 O(1)，大幅减少了内存分配和垃圾回收压力。

具体到数组的优化：Vue 3.5 对数组的索引访问和 length 属性的追踪进行了精细化处理，避免了不必要的依赖收集。当修改某个索引时，只触发依赖该索引的 effect，而不是触发所有依赖该数组的 effect。这对包含大量元素的数组操作（如 v-for 渲染长列表）带来了明显的性能提升。

### 基本示例

```javascript
import { reactive, ref, watchEffect } from "vue";

// Vue 3.5 的数组索引追踪更高效
const list = reactive([
    { id: 1, name: "Vue" },
    { id: 2, name: "React" },
    { id: 3, name: "Angular" },
]);

// effect 只依赖 list[0]
watchEffect(() => {
    // Vue 3.5 精确追踪：只在 list[0] 变化时重新执行
    console.log("第一个元素:", list[0].name);
});

// 修改 list[2] → 不会触发上面的 watchEffect（精确追踪）
list[2].name = "Svelte";

// 修改 list[0] → 触发 watchEffect
list[0].name = "Vue 3.5";

// Vue 3.5 之前的问题：
// 数组的任何修改都可能触发所有依赖该数组的 effect
// 导致不必要的重新计算和渲染
```

```javascript
// 大数组场景下的性能差异
const bigList = ref(Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    value: `item-${i}`,
})));

// Vue 3.5：修改单个元素的开销更低
// 只触发依赖该元素的计算和渲染
function updateSingleItem(index, newValue) {
    bigList.value[index].value = newValue;
    // Vue 3.5 优化后：
    // → 精确定位受影响的依赖
    // → 最小化触发范围
    // → 减少不必要的组件重新渲染
}
```

### 内部原理

#### 双向链表依赖追踪

```
Vue 3.5 响应式系统重构：

Vue 3.4 及之前：
  依赖存储: WeakMap<target, Map<key, Set<ReactiveEffect>>>
  → 每次 track() 创建 Set 或向 Set 添加 effect
  → 每次 trigger() 遍历 Set 找到所有 effect
  → Set 的增删需要 hash 计算和内存分配
  → 数组索引变化可能触发过多 effect

Vue 3.5 重构后：
  依赖存储: 基于双向链表的 Link 节点
  → effect 和 dep 之间通过 Link 节点连接
  → 添加/移除依赖是 O(1) 的链表操作
  → 不需要额外的 Set/Map 内存分配
  → 减少约 56% 的内存占用（官方数据）

数组索引追踪优化：
  Vue 3.4: arr[0] 和 arr[1] 可能共享同一个依赖集
  Vue 3.5: 每个索引有独立的依赖追踪
  → 修改 arr[0] 只触发依赖 arr[0] 的 effect
  → 修改 arr.length 触发依赖 length 的 effect
  → 精确追踪，最小化触发范围
```

### 与相关API的对比

| 特性 | Vue 3.4 | Vue 3.5 |
|------|---------|---------|
| 依赖存储 | Set | 双向链表 |
| 内存占用 | 较高 | 减少约 56% |
| 依赖增删 | O(n) | O(1) |
| 数组索引追踪 | 粗粒度 | 精确到索引 |
| 大数组性能 | 有瓶颈 | 显著提升 |

### 适用场景

- **长列表渲染：** v-for 渲染大量数据时性能提升
- **高频更新：** 频繁修改数组元素的场景
- **实时数据：** 股票行情、聊天消息等实时更新
- **虚拟滚动：** 配合虚拟列表的数据更新

### 常见问题

#### 升级到 Vue 3.5 是否需要修改代码

**解决方案：**

```javascript
// Vue 3.5 的响应式优化是内部实现的改进
// 对外 API 完全向后兼容，不需要修改任何代码

// 之前的写法仍然有效
const arr = reactive([1, 2, 3]);
arr[0] = 10;      // 正常触发更新
arr.push(4);       // 正常触发更新
arr.splice(1, 1);  // 正常触发更新

// 升级后自动获得性能提升，无需代码改动
```

### 注意事项

- Vue 3.5 的响应式优化是内部重构，API 不变
- 升级后自动获得性能提升，无需修改代码
- 对大数组和高频更新场景提升最明显
- 内存占用减少约 56%
- 依赖追踪的精确度提高
- 与现有代码完全向后兼容

### 总结

Vue 3.5 将响应式系统的依赖追踪从 Set 改为双向链表，数组索引追踪精确到每个索引。依赖增删操作从 O(n) 降到 O(1)，内存占用减少约 56%。数组修改只触发真正依赖该索引的 effect，减少不必要的重新计算。这是内部优化，API 完全兼容，升级后自动生效。对长列表、高频更新场景提升最为显著。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### 响应式系统Map/Set的优化

### 概念说明

Vue 3.5 对 `reactive()` 包装的 Map 和 Set 集合类型的响应式追踪进行了优化。在 Vue 3.5 之前，对 reactive Map/Set 的操作（如 get、set、has、delete、forEach、迭代器等）的依赖追踪粒度较粗，某些操作可能触发不必要的 effect 重新执行。

Vue 3.5 改进了 Map 和 Set 的 Proxy handler 实现，使得依赖追踪更加精确：
- Map 的 `get(key)` 只追踪对应 key 的依赖，修改其他 key 不会触发该 effect
- Set 的 `has(value)` 只追踪对应 value 的依赖
- `size` 属性的追踪与具体 key/value 的追踪分离
- 迭代操作（forEach、for...of）的依赖追踪更精确

这些优化减少了不必要的 effect 触发次数，在大量使用 Map/Set 的应用中带来可观的性能提升。

### 基本示例

```javascript
import { reactive, watchEffect } from "vue";

// reactive Map
const userMap = reactive(new Map([
    ["user1", { name: "张三", age: 25 }],
    ["user2", { name: "李四", age: 30 }],
    ["user3", { name: "王五", age: 28 }],
]));

// 只依赖 user1 的 effect
watchEffect(() => {
    const user = userMap.get("user1");
    console.log("user1:", user?.name);
});

// Vue 3.5 优化：修改 user2 不会触发上面的 effect
userMap.set("user2", { name: "李四改", age: 31 });
// → 上面的 watchEffect 不会重新执行（精确追踪）

// 修改 user1 才会触发
userMap.set("user1", { name: "张三改", age: 26 });
// → 触发 watchEffect

// reactive Set
const tagSet = reactive(new Set(["vue", "react", "angular"]));

// 只依赖 "vue" 是否存在的 effect
watchEffect(() => {
    const hasVue = tagSet.has("vue");
    console.log("有vue标签:", hasVue);
});

// 添加 "svelte" 不会触发上面的 effect（Vue 3.5 优化）
tagSet.add("svelte");

// 删除 "vue" 会触发
tagSet.delete("vue");
// → 触发 watchEffect
```

```javascript
// size 属性的独立追踪
const dataMap = reactive(new Map());

// effect 1：只依赖 size
watchEffect(() => {
    console.log("Map 大小:", dataMap.size);
});

// effect 2：只依赖特定 key
watchEffect(() => {
    console.log("config:", dataMap.get("config"));
});

// 添加新 key → 触发 effect 1（size 变化）+ effect 2 如果 key 是 config
dataMap.set("other", "value");
// → effect 1 触发（size 从 0 变为 1）
// → effect 2 不触发（"config" 没变）

dataMap.set("config", { theme: "dark" });
// → effect 1 触发（size 从 1 变为 2）
// → effect 2 触发（"config" 值变化）
```

### 内部原理

#### Map/Set 的精确依赖追踪

```
Vue 3.5 对 Map/Set 的追踪改进：

Vue 3.4 的追踪方式：
  Map.get("key1") → track(map, ITERATE)  // 粗粒度
  Map.set("key2", val) → trigger(map, ITERATE)  // 触发所有迭代依赖
  → get("key1") 的 effect 也被触发（不必要）

Vue 3.5 的追踪方式：
  Map.get("key1") → track(map, "key1")  // 精确到 key
  Map.set("key2", val) → trigger(map, "key2")  // 只触发 key2 的依赖
  → get("key1") 的 effect 不受影响

各操作的追踪粒度：
  Map.get(key)     → 追踪该 key
  Map.has(key)     → 追踪该 key
  Map.set(key, v)  → 触发该 key + 可能触发 size
  Map.delete(key)  → 触发该 key + 触发 size
  Map.size         → 追踪 size（独立）
  Map.forEach()    → 追踪所有 key + size
  Map.keys()       → 追踪 key 集合
  Map.values()     → 追踪所有 value

  Set.has(value)   → 追踪该 value
  Set.add(value)   → 触发该 value + size
  Set.delete(value)→ 触发该 value + size
  Set.size         → 追踪 size
```

### 与相关API的对比

| 操作 | Vue 3.4 触发范围 | Vue 3.5 触发范围 |
|------|----------------|----------------|
| Map.get(key) | 整个 Map 变化都触发 | 只在该 key 变化时触发 |
| Map.set(key, v) | 触发所有 Map 依赖 | 只触发该 key 依赖 + size |
| Set.has(v) | 整个 Set 变化都触发 | 只在该 value 变化时触发 |
| Set.add(v) | 触发所有 Set 依赖 | 只触发该 value 依赖 + size |

### 适用场景

- **缓存系统：** 用 reactive Map 做组件级缓存
- **标签管理：** 用 reactive Set 管理标签集合
- **权限管理：** Map 存储用户权限映射
- **状态机：** Map 存储多个独立状态

### 常见问题

#### 什么时候用 reactive Map 而不是 reactive Object

**解决方案：**

```javascript
// 使用 reactive Map 的场景：
// 1. key 不是字符串（数字、对象等）
const objKeyMap = reactive(new Map());
objKeyMap.set(someObject, "value"); // Object 不能做普通对象的 key

// 2. 需要频繁增删 key
const dynamicMap = reactive(new Map());
dynamicMap.set("key1", "val1");
dynamicMap.delete("key1"); // Map 的删除性能更好

// 3. 需要知道元素数量
console.log(dynamicMap.size); // Map 有 size 属性

// 4. 需要保持插入顺序
// Map 保证遍历顺序与插入顺序一致

// 使用 reactive Object 的场景：
// 1. key 固定且已知
// 2. 需要 JSON 序列化
// 3. 模板中直接访问属性
```

### 注意事项

- Vue 3.5 的 Map/Set 优化是内部改进，API 不变
- 升级后自动获得更精确的依赖追踪
- Map.get() 的依赖精确到 key 级别
- Set.has() 的依赖精确到 value 级别
- size 属性独立追踪
- forEach 和迭代器仍会追踪所有元素

### 总结

Vue 3.5 优化了 reactive Map/Set 的依赖追踪粒度，从粗粒度的整体追踪改为精确到 key/value 级别。Map.get(key) 只在对应 key 变化时触发 effect，Set.has(value) 只在对应 value 变化时触发。size 属性独立追踪。这些优化减少了不必要的 effect 触发，在大量使用集合类型的场景中提升性能。API 完全兼容，升级后自动生效。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### useTemplateRef的模板引用类型安全

### 概念说明

`useTemplateRef` 是 Vue 3.5 新增的组合式 API，用于获取模板中的 DOM 元素或组件实例引用。它是对传统 `ref` + 模板 `ref` 属性方案的改进，提供了更好的类型安全和更清晰的语义。

在 Vue 3.5 之前，模板引用通过 `const el = ref(null)` 声明一个 ref，然后在模板中通过 `ref="el"` 关联。这种方式存在一个问题：ref 变量名和模板中的 ref 字符串必须手动保持一致，TypeScript 也无法自动推导引用的类型。

`useTemplateRef<T>(key)` 接收一个字符串 key 作为参数，返回一个只读的 `Ref<T | null>`。key 对应模板中 `ref="key"` 的值。Vue 在组件挂载后自动将 DOM 元素或组件实例赋值给该 ref。泛型参数 `T` 可以明确指定引用的类型，实现完整的类型推导。

### 基本示例

```vue
<!-- Vue 3.5 useTemplateRef 写法 -->
<script setup lang="ts">
import { useTemplateRef, onMounted } from "vue";

// 获取 DOM 元素引用，指定类型为 HTMLInputElement
const inputRef = useTemplateRef<HTMLInputElement>("username-input");

// 获取组件实例引用
const formRef = useTemplateRef<InstanceType<typeof MyForm>>("my-form");

onMounted(() => {
    // inputRef.value 的类型是 HTMLInputElement | null
    // TypeScript 完整推导，有自动补全
    inputRef.value?.focus();
    inputRef.value?.select();

    // 访问组件实例的方法
    formRef.value?.validate();
});

function clearInput() {
    if (inputRef.value) {
        inputRef.value.value = "";
    }
}
</script>

<template>
    <!-- ref 的值对应 useTemplateRef 的 key 参数 -->
    <input ref="username-input" type="text" placeholder="用户名" />
    <MyForm ref="my-form" />
    <button @click="clearInput">清空</button>
</template>
```

```vue
<!-- Vue 3.5 之前的传统写法（对比） -->
<script setup lang="ts">
import { ref, onMounted } from "vue";

// 变量名必须与模板中的 ref 字符串一致
const usernameInput = ref<HTMLInputElement | null>(null);

onMounted(() => {
    usernameInput.value?.focus();
});
</script>

<template>
    <!-- ref 字符串必须与变量名一致 -->
    <input ref="usernameInput" type="text" />
</template>
```

### 内部原理

#### useTemplateRef 的工作机制

```
useTemplateRef 的内部实现：

1. useTemplateRef("username-input") 调用时
   → 创建一个 shallowRef(null)
   → 在当前组件实例上注册：key → ref 的映射
   → 返回只读的 ref

2. 模板编译时
   → <input ref="username-input"> 编译为 vnode
   → vnode 携带 ref: "username-input" 信息

3. 组件挂载时（patch 阶段）
   → 遍历 vnode 的 ref 属性
   → 在组件实例的注册表中查找 "username-input"
   → 找到 useTemplateRef 创建的 ref
   → 将 DOM 元素赋值给 ref.value

4. 组件卸载时
   → ref.value 自动设为 null

与传统 ref 方案的区别：
  传统方案：变量名 === 模板 ref 字符串（隐式关联）
  useTemplateRef：key 参数 === 模板 ref 字符串（显式关联）
  → 变量名可以任意取，不需要与 ref 字符串相同
  → 类型更安全，泛型明确指定引用类型
```

### 与相关API的对比

| 方案 | 类型安全 | 命名约束 | Vue 版本 |
|------|---------|---------|---------|
| useTemplateRef | 泛型指定，完整推导 | key 参数与模板 ref 一致 | 3.5+ |
| ref(null) | 需手动声明类型 | 变量名与模板 ref 一致 | 3.0+ |
| $refs | 无类型 | Options API | 2.x/3.x |

### 适用场景

- **DOM 操作：** 获取输入框、画布等 DOM 元素
- **组件实例：** 调用子组件暴露的方法
- **TypeScript 项目：** 需要完整类型推导的场景
- **动态 ref：** ref 字符串与变量名不同的场景

### 常见问题

#### useTemplateRef 在 v-for 中的使用

**解决方案：**

```vue
<script setup lang="ts">
import { useTemplateRef, onMounted } from "vue";

// v-for 中的 ref 会收集为数组
const itemRefs = useTemplateRef<HTMLDivElement[]>("item");

onMounted(() => {
    // itemRefs.value 是 HTMLDivElement[] | null
    console.log("列表项数量:", itemRefs.value?.length);
});
</script>

<template>
    <div v-for="item in list" :key="item.id" ref="item">
        {{ item.name }}
    </div>
</template>
```

### 注意事项

- Vue 3.5+ 才可使用
- key 参数必须与模板中的 ref 属性值一致
- 返回的 ref 是只读的
- 组件挂载后才有值，挂载前为 null
- 泛型参数指定引用类型，获得完整类型推导
- v-for 中自动收集为数组

### 总结

useTemplateRef 是 Vue 3.5 新增的模板引用 API，通过 key 参数显式关联模板 ref，泛型指定引用类型，提供完整的 TypeScript 类型推导。与传统 ref(null) 相比，变量名不需要与模板 ref 一致，类型更安全。返回只读 ref，挂载后自动赋值，卸载后自动置 null。v-for 中自动收集为数组。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### deferred prop的延迟传值(3.5+)

### 概念说明

Vue 3.5 为 `<Teleport>` 组件引入了 `defer` 属性（延迟传送），解决了 Teleport 的目标容器在渲染时可能还不存在的问题。这与 "deferred prop" 的概念相关——某些组件的 prop 值需要延迟到特定时机才能确定或生效。

在 Vue 3.5 之前，`<Teleport to="#target">` 要求 `#target` 元素在 Teleport 渲染时就已存在于 DOM 中。如果目标容器是同一模板中后面定义的元素，由于渲染顺序的原因，Teleport 执行时目标还不存在，会导致警告或渲染失败。

Vue 3.5 的 `<Teleport defer>` 会延迟 Teleport 的挂载，等到当前渲染周期的所有内容都挂载到 DOM 后再执行传送。这使得 Teleport 可以引用同一模板中后面定义的元素作为目标。

更广义地说，Vue 3.5 还改进了 prop 的响应式处理——使用解构的 props 在某些场景下获得了更好的响应式追踪（`defineProps` 解构的响应式优化也在 3.5 中稳定）。

### 基本示例

```vue
<!-- Vue 3.5：Teleport defer -->
<template>
    <!-- Teleport 在模板前面，目标在后面 -->
    <!-- 没有 defer 时：#modal-container 还不存在，会警告 -->
    <!-- 有 defer 时：等所有 DOM 渲染后再传送 -->
    <Teleport defer to="#modal-container">
        <div class="modal">
            <h2>弹窗内容</h2>
            <p>这段内容会被传送到下面的容器中</p>
        </div>
    </Teleport>

    <!-- 目标容器定义在后面 -->
    <div id="modal-container"></div>
</template>
```

```vue
<!-- 实际应用：布局组件中的延迟传送 -->
<script setup>
import { ref } from "vue";

const showModal = ref(false);
</script>

<template>
    <div class="layout">
        <header>
            <button @click="showModal = true">打开弹窗</button>
        </header>

        <main>
            <!-- 弹窗内容通过 defer Teleport 传送到 footer 后面的容器 -->
            <Teleport defer to="#app-modals" v-if="showModal">
                <div class="modal-overlay" @click="showModal = false">
                    <div class="modal-content" @click.stop>
                        <p>弹窗内容</p>
                        <button @click="showModal = false">关闭</button>
                    </div>
                </div>
            </Teleport>
        </main>

        <footer>页脚</footer>

        <!-- 弹窗容器在模板最后 -->
        <div id="app-modals"></div>
    </div>
</template>
```

```vue
<!-- Vue 3.5：defineProps 解构的响应式优化 -->
<script setup>
// Vue 3.5 稳定了 props 解构的响应式
// 解构出的变量保持响应性，不需要 toRefs
const { title, count = 0 } = defineProps<{
    title: string;
    count?: number;
}>();

// title 和 count 在模板和 watch 中都是响应式的
// Vue 3.5 之前需要开启实验性标志
</script>

<template>
    <h1>{{ title }}</h1>
    <p>计数: {{ count }}</p>
</template>
```

### 内部原理

#### defer Teleport 的渲染时序

```
普通 Teleport 的渲染流程：
  1. 渲染 Teleport 组件
  2. 查找 to 指定的目标元素
  3. 将内容挂载到目标元素
  → 如果目标不存在 → 警告并渲染失败

defer Teleport 的渲染流程：
  1. 渲染 Teleport 组件（标记为 defer）
  2. 暂时不执行传送，继续渲染后续 DOM
  3. 当前渲染周期的所有 DOM 都挂载完成
  4. 回头执行延迟的 Teleport
  5. 此时目标元素已存在 → 正常传送

defineProps 解构优化（3.5 稳定）：
  Vue 3.4 及之前：
    const { title } = defineProps(['title'])
    → title 是普通值，失去响应性
    → 需要 props.title 或 toRefs

  Vue 3.5：
    const { title, count = 0 } = defineProps<{ title: string; count?: number }>()
    → title 和 count 保持响应性
    → 支持默认值
    → 编译器自动处理为响应式访问
```

### 与相关API的对比

| 特性 | 普通 Teleport | defer Teleport |
|------|-------------|---------------|
| 目标元素 | 渲染时必须存在 | 可以在同一模板后面 |
| 执行时机 | 立即传送 | 当前周期 DOM 完成后 |
| Vue 版本 | 3.0+ | 3.5+ |

### 适用场景

- **同模板目标：** Teleport 目标定义在模板后面
- **布局组件：** 模态框容器在布局末尾
- **组件库：** 弹窗、提示等需要传送到特定容器的场景

### 常见问题

#### defer 会影响 Teleport 内容的渲染性能吗

**解决方案：**

```vue
<!-- defer 只是延迟挂载位置，不影响内容渲染 -->
<!-- Teleport 的内容仍然在当前渲染周期中创建 -->
<!-- 只是挂载到目标 DOM 的操作被延迟 -->

<Teleport defer to="#container">
    <!-- 这里的内容正常创建和渲染 -->
    <!-- 只是 DOM 挂载点延迟确定 -->
    <HeavyComponent />
</Teleport>

<!-- 性能影响极小，只是调整了 DOM 操作的时序 -->
```

### 注意事项

- defer 是 Vue 3.5 新增的 Teleport 属性
- 只影响挂载时序，不影响内容渲染
- 解决了目标元素在模板后面定义的问题
- defineProps 解构响应式在 3.5 中正式稳定
- 解构的 props 支持默认值且保持响应性
- defer 与 disabled 属性可以同时使用

### 总结

Vue 3.5 的 `<Teleport defer>` 延迟传送操作到当前渲染周期 DOM 完成后执行，解决了目标容器在模板后面定义时不可用的问题。同时，defineProps 的解构响应式优化在 3.5 中正式稳定——解构出的变量保持响应性并支持默认值。这些改进提升了开发体验和代码简洁度。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### onEffectCleanup的副作用清理

### 概念说明

`onEffectCleanup` 是 Vue 3.5 新增的 API，用于在 `watchEffect` 或 `watch` 的回调中注册清理函数。当 effect 重新执行或被停止时，清理函数会自动调用，用于取消过期的异步操作、清除定时器、中止网络请求等。

在 Vue 3.5 之前，`watchEffect` 通过回调函数的第一个参数 `onCleanup` 来注册清理逻辑。Vue 3.5 将其提取为独立的 `onEffectCleanup` 函数，从 `vue` 包中直接导入使用。这样做的好处是：清理逻辑可以在回调内的任何位置注册（不局限于回调参数），且语义更明确。

`onEffectCleanup` 只能在 `watchEffect`/`watch` 的同步执行阶段调用（不能在 `await` 之后调用），它会绑定到当前正在执行的 effect 上。

### 基本示例

```javascript
import { ref, watchEffect, onEffectCleanup } from "vue";

const searchQuery = ref("");

// 搜索请求：每次 query 变化时重新搜索
// 如果上一次请求还没完成，自动取消
watchEffect(() => {
    const query = searchQuery.value;
    if (!query) return;

    // 创建 AbortController 用于取消请求
    const controller = new AbortController();

    // 注册清理函数：在 effect 重新执行前调用
    onEffectCleanup(() => {
        controller.abort(); // 取消上一次的请求
    });

    // 发起请求
    fetch(`/api/search?q=${query}`, {
        signal: controller.signal,
    })
        .then((res) => res.json())
        .then((data) => {
            console.log("搜索结果:", data);
        })
        .catch((err) => {
            if (err.name !== "AbortError") {
                console.error("搜索出错:", err);
            }
        });
});
```

```javascript
// 与 Vue 3.5 之前的写法对比
import { ref, watchEffect } from "vue";

const userId = ref(1);

// Vue 3.5 之前：通过回调参数注册清理
watchEffect((onCleanup) => {
    const id = userId.value;
    const controller = new AbortController();

    onCleanup(() => {
        controller.abort();
    });

    fetch(`/api/users/${id}`, { signal: controller.signal });
});

// Vue 3.5：使用 onEffectCleanup
watchEffect(() => {
    const id = userId.value;
    const controller = new AbortController();

    onEffectCleanup(() => {
        controller.abort();
    });

    fetch(`/api/users/${id}`, { signal: controller.signal });
});
```

```javascript
// 在 watch 中使用 onEffectCleanup
import { ref, watch, onEffectCleanup } from "vue";

const currentTab = ref("home");

watch(currentTab, (newTab) => {
    // 为每个 tab 创建轮询
    const timer = setInterval(() => {
        console.log(`轮询 ${newTab} 数据...`);
    }, 5000);

    // 切换 tab 时清除上一个 tab 的轮询
    onEffectCleanup(() => {
        clearInterval(timer);
    });
});
```

### 内部原理

#### onEffectCleanup 的执行时机

```
onEffectCleanup 的生命周期：

第一次执行 effect：
  1. watchEffect 回调执行
  2. onEffectCleanup(fn) 注册清理函数 fn
  3. 异步操作开始

依赖变化，effect 重新执行：
  1. 调用上一次注册的清理函数 fn（取消旧操作）
  2. watchEffect 回调重新执行
  3. 新的 onEffectCleanup(fn2) 注册新的清理函数
  4. 新的异步操作开始

effect 被停止（组件卸载或手动 stop）：
  1. 调用最后一次注册的清理函数

内部实现：
  → onEffectCleanup 获取当前活跃的 ReactiveEffect
  → 将清理函数挂载到该 effect 的 cleanup 属性上
  → effect 重新运行前检查并执行 cleanup
  → effect 停止时也执行 cleanup

调用限制：
  → 必须在 effect 回调的同步执行阶段调用
  → 不能在 await 之后调用（此时已不在 effect 上下文中）
```

### 与相关API的对比

| 方式 | 来源 | Vue 版本 | 用法 |
|------|------|---------|------|
| onEffectCleanup | 独立导入 | 3.5+ | 回调内任意同步位置 |
| onCleanup（参数） | 回调第一个参数 | 3.0+ | 回调参数 |
| onWatcherCleanup | watch 回调参数 | 3.5+（别名） | 与 onEffectCleanup 相同 |

### 适用场景

- **取消请求：** AbortController 取消过期的 fetch 请求
- **清除定时器：** clearInterval/clearTimeout
- **取消订阅：** WebSocket、EventSource 等
- **释放资源：** canvas 上下文、Web Worker 等

### 常见问题

#### 在 await 之后调用 onEffectCleanup 不生效

**解决方案：**

```javascript
// 错误：await 之后调用无效
watchEffect(async () => {
    const data = await fetchData(userId.value);
    // 此时已不在 effect 同步上下文中
    onEffectCleanup(() => { /* 不会被注册 */ });
});

// 正确：在 await 之前调用
watchEffect(() => {
    const id = userId.value;
    const controller = new AbortController();

    // 必须在 await 之前注册清理
    onEffectCleanup(() => {
        controller.abort();
    });

    // 然后再执行异步操作（不要 await）
    fetch(`/api/users/${id}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => { /* 处理数据 */ });
});
```

### 注意事项

- Vue 3.5+ 才可使用
- 必须在 effect 回调的同步阶段调用
- 不能在 await 之后调用
- 清理函数在 effect 重新执行前和停止时自动调用
- 传统的 onCleanup 参数方式仍然可用
- 适合取消请求、清除定时器等清理操作

### 总结

onEffectCleanup 是 Vue 3.5 新增的副作用清理 API，从 vue 包独立导入，在 watchEffect/watch 回调中注册清理函数。清理函数在 effect 重新执行前和停止时自动调用。必须在回调的同步执行阶段注册，不能在 await 之后。适用于取消请求、清除定时器、释放资源等场景。替代了之前通过回调参数注册清理的方式，语义更明确。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


### shallowRef的深层响应式触发选项

### 概念说明

`shallowRef` 创建的是浅层响应式引用——只有 `.value` 本身的赋值是响应式的，内部属性的修改不会触发更新。在 Vue 3.5 中，配合响应式系统的重构，shallowRef 在性能优化场景中获得了更好的支持，特别是与 `triggerRef` 配合使用时的行为更加可预测。

shallowRef 的核心用途是处理大型数据结构或外部状态（如来自第三方库的对象），避免 Vue 对深层属性进行 Proxy 代理带来的性能开销。当确实需要通知 Vue 更新时，手动调用 `triggerRef(ref)` 强制触发依赖更新。

Vue 3.5 优化后的 shallowRef 在依赖追踪上更高效——由于底层从 Set 改为双向链表，triggerRef 触发更新时的依赖通知速度更快，内存开销更低。同时 `watch` 的 `deep` 选项在 3.5 中也支持数字值（如 `deep: 2`），可以指定深度监听的层数，为 shallowRef 的部分深层监听提供了新的可能。

### 基本示例

```javascript
import { shallowRef, triggerRef, watchEffect, watch } from "vue";

// shallowRef：只有 .value 赋值是响应式的
const state = shallowRef({
    user: { name: "张三", age: 25 },
    settings: { theme: "dark", lang: "zh" },
});

watchEffect(() => {
    console.log("用户名:", state.value.user.name);
});

// 直接修改深层属性 → 不触发更新
state.value.user.name = "李四";
// → watchEffect 不会重新执行

// 方案1：整体替换 .value → 触发更新
state.value = {
    ...state.value,
    user: { ...state.value.user, name: "李四" },
};
// → watchEffect 重新执行

// 方案2：修改后手动触发
state.value.user.name = "王五";
triggerRef(state);
// → watchEffect 重新执行
```

```javascript
// Vue 3.5：watch 的 deep 选项支持数字值
const data = shallowRef({
    level1: {
        level2: {
            level3: "深层值",
        },
    },
});

// deep: 2 → 只监听两层深度的变化
watch(
    data,
    (newVal) => {
        console.log("数据变化:", newVal);
    },
    { deep: 2 }
    // 监听 data.value（第1层）和 level1（第2层）的变化
    // level2 内部的变化不会触发
);
```

```javascript
// 大数据量场景：shallowRef 的性能优势
const bigDataset = shallowRef([]);

// 模拟加载 10 万条数据
async function loadData() {
    const response = await fetch("/api/big-data");
    const data = await response.json();

    // 整体替换，一次性触发更新
    bigDataset.value = data;
    // Vue 不会对 data 内的每个元素做深层代理
    // 性能远优于 ref(data)
}

// 更新单条数据
function updateItem(index, newItem) {
    // shallowRef 需要替换整个数组才能触发更新
    const newData = [...bigDataset.value];
    newData[index] = newItem;
    bigDataset.value = newData;

    // 或者直接修改 + triggerRef
    // bigDataset.value[index] = newItem;
    // triggerRef(bigDataset);
}
```

### 内部原理

#### shallowRef 与 ref 的响应式差异

```
ref 的代理方式：
  const data = ref({ a: { b: 1 } });
  → data.value 是 Proxy 对象
  → data.value.a 也是 Proxy 对象
  → data.value.a.b 的读写都被追踪
  → 每层嵌套都有 Proxy 开销

shallowRef 的代理方式：
  const data = shallowRef({ a: { b: 1 } });
  → 只有 data.value 的赋值被追踪
  → data.value.a 是普通对象（无 Proxy）
  → data.value.a.b 的修改不触发更新
  → 零深层代理开销

triggerRef 的工作原理：
  triggerRef(data)
  → 获取 data 内部的 dep（依赖）
  → 通知所有订阅该 dep 的 effect 重新执行
  → 等价于 data.value 被重新赋值

Vue 3.5 的 watch deep 数字选项：
  deep: true  → 递归监听所有层级
  deep: false → 只监听引用变化
  deep: 2     → 只递归监听 2 层深度（3.5 新增）
  → 对 shallowRef 提供了有限深度的监听能力
```

### 与相关API的对比

| API | 响应式深度 | 性能开销 | 适用场景 |
|-----|----------|---------|---------|
| ref | 深层（递归代理） | 较高 | 小型响应式数据 |
| shallowRef | 浅层（仅 .value） | 极低 | 大型数据、外部对象 |
| reactive | 深层（递归代理） | 较高 | 对象状态 |
| shallowReactive | 浅层（仅第一层） | 低 | 部分响应式 |

### 适用场景

- **大数据集：** 包含大量元素的数组或深层对象
- **外部库集成：** 第三方库返回的不需要深层响应的对象
- **性能敏感：** 高频更新场景减少代理开销
- **不可变数据：** 配合不可变数据更新模式

### 常见问题

#### shallowRef 中修改深层属性后界面不更新

**解决方案：**

```javascript
import { shallowRef, triggerRef } from "vue";

const data = shallowRef({ count: 0, nested: { value: "hello" } });

// 方案1：整体替换（推荐，符合不可变数据模式）
function update() {
    data.value = { ...data.value, count: data.value.count + 1 };
}

// 方案2：修改后手动触发（简单但需注意一致性）
function updateNested() {
    data.value.nested.value = "world";
    triggerRef(data); // 手动通知更新
}

// 方案3：如果确实需要深层响应，改用 ref
// const data = ref({ count: 0, nested: { value: 'hello' } });
```

### 注意事项

- shallowRef 只追踪 .value 的赋值
- 深层属性修改需要手动 triggerRef 或整体替换
- 性能优势在大数据量场景下最明显
- Vue 3.5 的 watch deep 支持数字值指定深度
- triggerRef 会触发所有依赖该 ref 的 effect
- 与不可变数据更新模式配合最佳

### 总结

shallowRef 只对 .value 赋值做响应式追踪，不深层代理内部属性，适合大数据集和外部对象。深层属性修改需要整体替换 .value 或手动 triggerRef。Vue 3.5 优化了底层依赖追踪效率（双向链表），triggerRef 更快。watch 的 deep 选项支持数字值指定监听深度，为 shallowRef 的部分深层监听提供了灵活选择。

---

本资料由「高品质IT资源 / xy769003723321/小苏IT资源铺」独家提供，禁止盗版、转售。


