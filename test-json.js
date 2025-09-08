const express = require('express');
const fs = require('fs');
const path = require('path');

// Test JSON parsing
const testJsonParsing = () => {
  try {
    const promptsPath = path.join(__dirname, 'prompts.json');
    const rawData = fs.readFileSync(promptsPath, 'utf8');
    const promptsData = JSON.parse(rawData);
    console.log('JSON parsing successful');
    console.log('Prompts:', Object.keys(promptsData.prompts));
    return promptsData;
  } catch (error) {
    console.error('Error loading prompts:', error.message);
    return { prompts: {}, categories: {} };
  }
};

const promptsData = testJsonParsing();
console.log('Available prompts:', Object.keys(promptsData.prompts));