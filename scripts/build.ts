#!/usr/bin/env bun

/**
 * 🚀 Pref Doctor 构建脚本（仅当前平台，commander重构，精简优化版）
 */

import { $ } from "bun";
import { existsSync, mkdirSync } from "fs";
import { Command } from "commander";
import pino from "pino";
import os from "os";

// 日志实例，使用 pino-pretty 彩色输出
const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

/**
 * 🔨 构建当前平台
 * 在 build/平台名 目录下生成 pref-doctor 可执行文件
 */
async function buildCurrentPlatform(): Promise<void> {
  const platform = os.platform();
  logger.info(`当前平台: ${platform}`);
  const buildDir = `build/${platform}`;
  if (!existsSync(buildDir)) {
    mkdirSync(buildDir, { recursive: true });
    logger.info(`创建构建目录: ${buildDir}/`);
  }
  logger.info("正在构建当前平台...");
  try {
    await $`bun build --compile --outfile=${buildDir}/pref-doctor index.ts`;
    logger.info(`构建完成: ${buildDir}/pref-doctor`);
  } catch (error) {
    logger.error(`构建失败: ${error}`);
    process.exit(1);
  }
}

/**
 * 🧹 清理构建文件夹
 */
async function cleanBuilds(): Promise<void> {
  logger.info("清理构建文件...");
  try {
    await $`rm -rf build`.nothrow();
    logger.info("清理完成");
  } catch (error) {
    logger.warn(`清理时出现错误: ${error}`);
  }
}

// CLI 命令定义
const program = new Command();

program
  .name("build")
  .description("Pref Doctor 构建脚本")
  .version("1.0.0");

program
  .command("build")
  .description("构建当前平台 (默认)")
  .action(buildCurrentPlatform);

program
  .command("clean")
  .description("清理所有构建文件")
  .action(cleanBuilds);

// 默认行为：无参数时构建
if (process.argv.length <= 2) {
  buildCurrentPlatform();
} else {
  program.parse(process.argv);
}