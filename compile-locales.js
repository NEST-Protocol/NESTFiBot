// const fs = require('fs');
import fs from 'fs';

function extractTranslations(filePath) {
  const translations = {};
  
  // 读取代码文件
  const content = fs.readFileSync(filePath, 'utf8');
  
  // 使用正则表达式匹配翻译字符串
  const pattern = /\(t\(`(.*?)`,\s*lang\)/g;
  const matches = content.matchAll(pattern);
  
  // 将匹配到的翻译字符串保存到对象中
  for (const match of matches) {
    let translation = match[1];
    translations[translation] = translation;
  }
  
  return translations;
}

function writeToJson(translations, outputFilePath) {
  const jsonData = JSON.stringify(translations, null, 2);
  fs.writeFileSync(outputFilePath, jsonData, 'utf8');
}

// 调用示例
const filePath = 'app.ts';
const outputFilePath = 'locales/en.json';

const translations = extractTranslations(filePath);
writeToJson(translations, outputFilePath);