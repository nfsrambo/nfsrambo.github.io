#!/usr/bin/env node

import fs from "fs/promises";

// ============================================
// CONFIGURATION - EDIT THIS ARRAY
// ============================================
const myArray = ["/code/rsi"];

// ============================================
// REMOVE DUPLICATES
// ============================================
const removeDuplicates = (arr) => {
  const originalLength = arr.length;
  const unique = [...new Set(arr)];
  const duplicatesRemoved = originalLength - unique.length;

  return {
    original: arr,
    unique: unique,
    duplicatesRemoved: duplicatesRemoved,
    originalLength: originalLength,
    newLength: unique.length,
  };
};

// ============================================
// GENERATE LOG
// ============================================
const generateLog = (result) => {
  const timestamp = new Date().toISOString();

  let log = `========================================
DUPLICATE REMOVAL REPORT
Generated: ${timestamp}
========================================

Original Array Length: ${result.originalLength}
New Array Length: ${result.newLength}
Duplicates Removed: ${result.duplicatesRemoved}

========================================
ORIGINAL ARRAY:
========================================
${JSON.stringify(result.original, null, 2)}

========================================
UNIQUE ARRAY (After Removal):
========================================
${JSON.stringify(result.unique, null, 2)}

========================================
DUPLICATES FOUND:
========================================
`;

  // Find and list duplicates
  const seen = new Set();
  const duplicates = [];
  for (const item of result.original) {
    if (seen.has(item)) {
      duplicates.push(item);
    } else {
      seen.add(item);
    }
  }

  if (duplicates.length > 0) {
    log += JSON.stringify([...new Set(duplicates)], null, 2);
  } else {
    log += "No duplicates found";
  }

  log += `

========================================
`;

  return log;
};

// ============================================
// MAIN FUNCTION
// ============================================
const main = async () => {
  console.log("🚀 Starting duplicate removal process...\n");

  // Remove duplicates
  const result = removeDuplicates(myArray);

  // Display results
  console.log(`📊 Original array length: ${result.originalLength}`);
  console.log(`✨ Unique array length: ${result.newLength}`);
  console.log(`🗑️  Duplicates removed: ${result.duplicatesRemoved}`);

  if (result.duplicatesRemoved > 0) {
    console.log("\n✅ Unique array:");
    console.log(JSON.stringify(result.unique, null, 2));

    // Save to log file
    const log = generateLog(result);
    await fs.writeFile("duplicate-removal.log", log, "utf-8");
    console.log("\n📝 Log saved to: duplicate-removal.log");
  } else {
    console.log("\n✅ No duplicates found!");
  }

  // Output for tee command
  console.log("\n========================================");
  console.log("FINAL SUMMARY:");
  console.log("========================================");
  console.log(`Original: ${result.originalLength} items`);
  console.log(`Unique: ${result.newLength} items`);
  console.log(`Removed: ${result.duplicatesRemoved} duplicates`);
  console.log("========================================\n");

  // Return the unique array if you want to use it elsewhere
  return result.unique;
};

// Run the script
main().catch(console.error);
