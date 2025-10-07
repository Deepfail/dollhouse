#!/usr/bin/env node
/**
 * Prompt System Validator
 * 
 * Checks that all AI-related code uses the centralized Prompt Library
 * and doesn't have hardcoded prompts.
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

// Files to check for prompt usage
const AI_FILES = [
  'src/lib/aiService.ts',
  'src/hooks/useChat.ts',
  'src/hooks/useStorySystem.ts',
  'src/lib/characterGenerator.ts',
  'src/lib/characterProfileBuilder.ts',
  'src/components/Copilot.tsx',
  'src/components/CopilotNew.tsx',
  'src/components/CharacterCreator.tsx',
  'src/lib/behaviorAnalysis.ts',
];

// Patterns that indicate hardcoded prompts (bad)
const BAD_PATTERNS = [
  { pattern: /const.*prompt.*=.*`[^`]{50,}`/, description: 'Long template literal prompt' },
  { pattern: /const.*prompt.*=.*"[^"]{50,}"/, description: 'Long string prompt' },
  { pattern: /You are (a|an|the) .*assistant/i, description: 'Hardcoded assistant instruction' },
  { pattern: /Generate.*character.*with.*personality/i, description: 'Hardcoded character generation' },
];

// Patterns that indicate proper usage (good)
const GOOD_PATTERNS = [
  { pattern: /formatPrompt\(/g, description: 'Uses formatPrompt()' },
  { pattern: /getPromptValue\(/g, description: 'Uses getPromptValue()' },
];

interface ValidationResult {
  file: string;
  issues: {
    line: number;
    pattern: string;
    description: string;
    snippet: string;
  }[];
  goodUsages: number;
}

function checkFile(filePath: string): ValidationResult {
  const fullPath = join(process.cwd(), filePath);
  const content = readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n');
  
  const issues: ValidationResult['issues'] = [];
  let goodUsages = 0;

  // Count good usages
  GOOD_PATTERNS.forEach(({ pattern }) => {
    const matches = content.match(pattern);
    if (matches) {
      goodUsages += matches.length;
    }
  });

  // Check for bad patterns
  lines.forEach((line, index) => {
    BAD_PATTERNS.forEach(({ pattern, description }) => {
      if (pattern.test(line)) {
        issues.push({
          line: index + 1,
          pattern: pattern.toString(),
          description,
          snippet: line.trim().slice(0, 80) + (line.length > 80 ? '...' : ''),
        });
      }
    });
  });

  return { file: filePath, issues, goodUsages };
}

function main() {
  console.log(`${YELLOW}🔍 Validating Prompt System...${RESET}\n`);

  const results: ValidationResult[] = [];
  let totalIssues = 0;
  let totalGoodUsages = 0;

  AI_FILES.forEach(file => {
    try {
      const result = checkFile(file);
      results.push(result);
      totalIssues += result.issues.length;
      totalGoodUsages += result.goodUsages;
    } catch (error) {
      console.log(`${YELLOW}⚠️  Could not check ${file} (file may not exist)${RESET}`);
    }
  });

  // Print results
  console.log(`${GREEN}Good Usages Found:${RESET}`);
  results.forEach(({ file, goodUsages }) => {
    if (goodUsages > 0) {
      console.log(`  ✅ ${file}: ${goodUsages} formatPrompt()/getPromptValue() calls`);
    }
  });

  if (totalIssues > 0) {
    console.log(`\n${RED}⚠️  Potential Issues Found:${RESET}`);
    results.forEach(({ file, issues }) => {
      if (issues.length > 0) {
        console.log(`\n  ${RED}${file}:${RESET}`);
        issues.forEach(({ line, description, snippet }) => {
          console.log(`    Line ${line}: ${description}`);
          console.log(`      ${snippet}`);
        });
      }
    });
  }

  // Summary
  console.log(`\n${YELLOW}───────────────────────────────────${RESET}`);
  console.log(`${GREEN}✅ Good usages: ${totalGoodUsages}${RESET}`);
  console.log(`${totalIssues > 0 ? RED : GREEN}${totalIssues > 0 ? '⚠️' : '✅'} Potential issues: ${totalIssues}${RESET}`);
  
  if (totalIssues === 0 && totalGoodUsages > 0) {
    console.log(`\n${GREEN}🎉 Prompt system validation passed!${RESET}`);
    process.exit(0);
  } else if (totalIssues > 0) {
    console.log(`\n${YELLOW}⚠️  Please review potential issues above.${RESET}`);
    console.log(`   Note: Some matches may be false positives.`);
    process.exit(1);
  } else {
    console.log(`\n${YELLOW}⚠️  No prompt usage found. Is this correct?${RESET}`);
    process.exit(1);
  }
}

main();
