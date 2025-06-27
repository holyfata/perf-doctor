#!/usr/bin/env bun

/**
 * 🚀 Pref Doctor 多平台构建脚本
 * 
 * 功能：
 * - 🔍 自动检测当前平台
 * - 📦 支持多平台交叉编译
 * - 🧹 清理构建产物
 * - 📁 统一输出到 build/ 目录
 */

import { $ } from "bun";
import { existsSync, mkdirSync } from "fs";

// 📋 平台配置接口
interface Platform {
  os: string;      // 操作系统
  arch: string;    // 架构
  target: string;  // Bun 构建目标
  extension: string; // 可执行文件扩展名
}

// 🎯 支持的平台列表
const PLATFORMS: Platform[] = [
  { os: "windows", arch: "x64", target: "bun-windows-x64", extension: ".exe" },
  { os: "windows", arch: "arm64", target: "bun-windows-arm64", extension: ".exe" },
  { os: "darwin", arch: "x64", target: "bun-darwin-x64", extension: "" },
  { os: "darwin", arch: "arm64", target: "bun-darwin-arm64", extension: "" },
  { os: "linux", arch: "x64", target: "bun-linux-x64", extension: "" },
  { os: "linux", arch: "arm64", target: "bun-linux-arm64", extension: "" },
];

// 🌈 彩色日志工具
const logger = {
  info: (msg: string) => console.log(`\x1b[34m🔵 ${msg}\x1b[0m`),
  success: (msg: string) => console.log(`\x1b[32m✅ ${msg}\x1b[0m`),
  warning: (msg: string) => console.log(`\x1b[33m⚠️  ${msg}\x1b[0m`),
  error: (msg: string) => console.log(`\x1b[31m❌ ${msg}\x1b[0m`),
  build: (msg: string) => console.log(`\x1b[36m🔨 ${msg}\x1b[0m`),
  clean: (msg: string) => console.log(`\x1b[35m🧹 ${msg}\x1b[0m`),
};

/**
 * 🔍 检测当前运行平台
 * @returns Platform | null 检测到的平台信息或 null
 */
function detectCurrentPlatform(): Platform | null {
  // 操作系统映射
  const osMap: Record<string, string> = {
    win32: "windows",
    darwin: "darwin", 
    linux: "linux",
  };

  // 架构映射
  const archMap: Record<string, string> = {
    x64: "x64",
    arm64: "arm64",
    ia32: "x86",
  };

  const currentOS = osMap[process.platform];
  const currentArch = archMap[process.arch];

  if (!currentOS || !currentArch) return null;

  return PLATFORMS.find(p => p.os === currentOS && p.arch === currentArch) || null;
}

/**
 * 📁 确保构建目录存在
 */
function ensureBuildDir(): void {
  const buildDir = "build";
  if (!existsSync(buildDir)) {
    mkdirSync(buildDir, { recursive: true });
    logger.info(`创建构建目录: ${buildDir}/`);
  }
}

/**
 * 🔨 构建单个平台
 * @param platform 目标平台配置
 * @returns Promise<boolean> 构建是否成功
 */
async function buildPlatform(platform: Platform): Promise<boolean> {
  ensureBuildDir();
  
  const outputName = `build/pref-doctor-${platform.os}-${platform.arch}${platform.extension}`;
  logger.build(`正在构建 ${platform.os}/${platform.arch} 平台...`);
  
  try {
    const result = await $`bun build --compile --target=${platform.target} --outfile=${outputName} index.ts`;
    
    if (result.exitCode === 0) {
      logger.success(`成功构建: ${outputName}`);
      
      // 📊 显示文件大小
      if (existsSync(outputName)) {
        const stats = await Bun.file(outputName).size;
        const sizeInMB = (stats / 1024 / 1024).toFixed(2);
        logger.info(`文件大小: ${sizeInMB} MB`);
      }
      return true;
    } else {
      logger.error(`构建失败: ${platform.os}/${platform.arch}`);
      return false;
    }
  } catch (error) {
    logger.error(`构建出错: ${error}`);
    return false;
  }
}

/**
 * 🎯 构建当前平台
 * @returns Promise<boolean> 构建是否成功
 */
async function buildCurrentPlatform(): Promise<boolean> {
  const currentPlatform = detectCurrentPlatform();
  
  if (!currentPlatform) {
    logger.warning("无法检测当前平台，使用默认构建");
    try {
      ensureBuildDir();
      await $`bun build --compile --outfile=build/pref-doctor index.ts`;
      logger.success("默认构建完成");
      return true;
    } catch (error) {
      logger.error(`默认构建失败: ${error}`);
      return false;
    }
  }
  
  logger.info(`检测到当前平台: ${currentPlatform.os}/${currentPlatform.arch}`);
  return await buildPlatform(currentPlatform);
}

/**
 * 🌍 构建所有支持的平台
 * @returns Promise<boolean> 是否全部构建成功
 */
async function buildAllPlatforms(): Promise<boolean> {
  logger.info("开始构建所有支持的平台...");
  
  let successCount = 0;
  const totalCount = PLATFORMS.length;
  
  for (const platform of PLATFORMS) {
    const success = await buildPlatform(platform);
    if (success) successCount++;
    console.log(); // 空行分隔
  }
  
  logger.info(`构建完成: ${successCount}/${totalCount} 个平台成功`);
  
  if (successCount === totalCount) {
    logger.success("🎉 所有平台构建成功！");
    return true;
  } else {
    logger.warning("部分平台构建失败");
    return false;
  }
}

/**
 * 🔧 构建指定平台
 * @param platformSpec 平台规格 (格式: os-arch)
 * @returns Promise<boolean> 构建是否成功
 */
async function buildSpecificPlatform(platformSpec: string): Promise<boolean> {
  const [os, arch] = platformSpec.split("-");
  const platform = PLATFORMS.find(p => p.os === os && p.arch === arch);
  
  if (!platform) {
    logger.error(`不支持的平台: ${platformSpec}`);
    logger.info("支持的平台:");
    PLATFORMS.forEach(p => console.log(`  - ${p.os}-${p.arch}`));
    return false;
  }
  
  return await buildPlatform(platform);
}

/**
 * 🧹 清理构建文件
 */
async function cleanBuilds(): Promise<void> {
  logger.clean("清理构建文件...");
  
  try {
    await $`rm -rf build`.nothrow();
    logger.success("🗑️  清理完成");
  } catch (error) {
    logger.warning(`清理时出现错误: ${error}`);
  }
}

/**
 * 📖 显示帮助信息
 */
function showHelp(): void {
  console.log("🚀 使用方法: bun run scripts/build.ts [选项]\n");
  console.log("📋 选项:");
  console.log("  -h, --help        📖 显示此帮助信息");
  console.log("  -c, --current     🎯 仅构建当前平台 (默认)");
  console.log("  -a, --all         🌍 构建所有支持的平台");
  console.log("  -p, --platform    🔧 构建指定平台 (格式: os-arch, 如: windows-x64)");
  console.log("  --clean           🧹 清理所有构建文件");
  console.log("  --list            📋 列出支持的平台\n");
  console.log("💡 示例:");
  console.log("  bun run scripts/build.ts                    # 构建当前平台");
  console.log("  bun run scripts/build.ts --all              # 构建所有平台");
  console.log("  bun run scripts/build.ts -p windows-x64     # 构建 Windows x64");
  console.log("  bun run scripts/build.ts --clean            # 清理构建文件");
}

/**
 * 📋 列出支持的平台
 */
function listPlatforms(): void {
  logger.info("支持的平台:");
  PLATFORMS.forEach(platform => {
    const emoji = platform.os === "windows" ? "🪟" : platform.os === "darwin" ? "🍎" : "🐧";
    const description = platform.os === "darwin" ? 
      (platform.arch === "x64" ? " (Intel)" : " (Apple Silicon)") : "";
    console.log(`  ${emoji} ${platform.os}-${platform.arch}${description}`);
  });
}

/**
 * 🚀 主函数
 */
async function main(): Promise<void> {
  console.log("🚀 Pref Doctor 多平台构建脚本\n");
  
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case "-h":
    case "--help":
      showHelp();
      break;
      
    case "-a":
    case "--all":
      await buildAllPlatforms();
      break;
      
    case "-c":
    case "--current":
      await buildCurrentPlatform();
      break;
      
    case "-p":
    case "--platform":
      if (!args[1]) {
        logger.error("请指定平台 (格式: os-arch)");
        process.exit(1);
      }
      await buildSpecificPlatform(args[1]);
      break;
      
    case "--clean":
      await cleanBuilds();
      break;
      
    case "--list":
      listPlatforms();
      break;
      
    case undefined:
      await buildCurrentPlatform();
      break;
      
    default:
      logger.error(`未知选项: ${command}`);
      showHelp();
      process.exit(1);
  }
}

// 🎬 启动脚本
if (import.meta.main) {
  main().catch(error => {
    logger.error(`脚本执行失败: ${error}`);
    process.exit(1);
  });
}