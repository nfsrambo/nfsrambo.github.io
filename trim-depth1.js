// scripts/trim-depth1.js
import fs from "fs";
import path from "path";

// ============================================
// CONFIGURATION - Change these numbers as needed
// ============================================
const CONFIG = {
  // How many items to keep in children_list for regular categories
  childrenListLimit: 4,

  // For codeLibrary only
  codeLibrary: {
    basePathsLimit: 4, // How many base_paths to keep
    languagePathsLimit: 4, // How many language_paths to keep
  },

  // Input/Output paths
  inputPath: "public/thewallstreetbulls.depth1.json",
  outputPath: "public/thewallstreetbulls.depth1.trimmed.json",
  backupPath: "public/thewallstreetbulls.depth1.backup.json",
};

// ============================================
// HELPER: Get original counts before trimming
// ============================================
function getOriginalCounts(child) {
  if (child.name === "codeLibrary") {
    return {
      total_base_paths: child.base_paths?.length || 0,
      total_language_paths: child.language_paths?.length || 0,
      total_pages:
        (child.base_paths?.length || 0) + (child.language_paths?.length || 0),
    };
  } else {
    return {
      total_pages: child.children_list?.length || 0,
    };
  }
}

// ============================================
// MAIN FUNCTION
// ============================================
function trimDepth1() {
  console.log("🚀 Trimming depth1.json...\n");

  // Read original file
  const inputFile = path.join(process.cwd(), CONFIG.inputPath);
  if (!fs.existsSync(inputFile)) {
    console.error(`❌ File not found: ${inputFile}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(inputFile, "utf8"));
  console.log(`✅ Read: ${CONFIG.inputPath}`);

  // Create backup with original data
  fs.writeFileSync(
    path.join(process.cwd(), CONFIG.backupPath),
    JSON.stringify(data, null, 2),
  );
  console.log(`💾 Backup: ${CONFIG.backupPath}`);

  // Track original and new counts for summary
  const summary = [];

  // Process each child - ADD original counts FIRST, then trim
  for (const child of data.children) {
    const originalCounts = getOriginalCounts(child);

    if (child.name === "codeLibrary") {
      // ADD original totals to the object (these stay forever)
      child.total_base_paths = originalCounts.total_base_paths;
      child.total_language_paths = originalCounts.total_language_paths;
      child.total_pages = originalCounts.total_pages;

      console.log(`\n📁 ${child.name}:`);
      console.log(`   Total base_paths (original): ${child.total_base_paths}`);
      console.log(
        `   Total language_paths (original): ${child.total_language_paths}`,
      );
      console.log(`   Total pages (original): ${child.total_pages}`);

      // TRIM base_paths for display (original count preserved above)
      if (
        child.base_paths &&
        child.base_paths.length > CONFIG.codeLibrary.basePathsLimit
      ) {
        const originalLength = child.base_paths.length;
        child.base_paths = child.base_paths.slice(
          0,
          CONFIG.codeLibrary.basePathsLimit,
        );
        console.log(
          `   ✂️ base_paths display: ${originalLength} → ${child.base_paths.length} (original: ${child.total_base_paths})`,
        );
      }

      // TRIM language_paths for display (original count preserved above)
      if (
        child.language_paths &&
        child.language_paths.length > CONFIG.codeLibrary.languagePathsLimit
      ) {
        const originalLength = child.language_paths.length;
        child.language_paths = child.language_paths.slice(
          0,
          CONFIG.codeLibrary.languagePathsLimit,
        );
        console.log(
          `   ✂️ language_paths display: ${originalLength} → ${child.language_paths.length} (original: ${child.total_language_paths})`,
        );
      }

      summary.push({
        name: child.name,
        total_base_paths: child.total_base_paths,
        total_language_paths: child.total_language_paths,
        total_pages: child.total_pages,
        display_base_paths: child.base_paths?.length || 0,
        display_language_paths: child.language_paths?.length || 0,
      });
    } else {
      // ADD original total to the object (this stays forever)
      child.total_pages = originalCounts.total_pages;

      console.log(`\n📁 ${child.name}:`);
      console.log(`   Total pages (original): ${child.total_pages}`);

      // TRIM children_list for display (original count preserved above)
      if (
        child.children_list &&
        child.children_list.length > CONFIG.childrenListLimit
      ) {
        const originalLength = child.children_list.length;
        child.children_list = child.children_list.slice(
          0,
          CONFIG.childrenListLimit,
        );
        console.log(
          `   ✂️ children_list display: ${originalLength} → ${child.children_list.length} (original: ${child.total_pages})`,
        );
      } else if (child.children_list) {
        console.log(
          `   ✅ children_list display: ${child.children_list.length} (original: ${child.total_pages}) - no trimming needed`,
        );
      }

      summary.push({
        name: child.name,
        total_pages: child.total_pages,
        display_pages: child.children_list?.length || 0,
      });
    }
  }

  // Save trimmed file (original counts preserved, display arrays trimmed)
  fs.writeFileSync(
    path.join(process.cwd(), CONFIG.outputPath),
    JSON.stringify(data, null, 2),
  );

  // Calculate size difference
  const originalSize = fs.statSync(inputFile).size;
  const newSize = fs.statSync(path.join(process.cwd(), CONFIG.outputPath)).size;
  const reduction = (((originalSize - newSize) / originalSize) * 100).toFixed(
    2,
  );

  // Print summary
  console.log(`\n${"=".repeat(50)}`);
  console.log(`📊 SUMMARY - Original counts preserved, display arrays trimmed`);
  console.log(`${"=".repeat(50)}`);

  for (const item of summary) {
    if (item.total_base_paths !== undefined) {
      // CodeLibrary
      console.log(`\n📁 ${item.name}:`);
      console.log(`   ORIGINAL (stored):`);
      console.log(`      total_base_paths: ${item.total_base_paths}`);
      console.log(`      total_language_paths: ${item.total_language_paths}`);
      console.log(`      total_pages: ${item.total_pages}`);
      console.log(`   DISPLAY (trimmed to):`);
      console.log(`      base_paths: ${item.display_base_paths}`);
      console.log(`      language_paths: ${item.display_language_paths}`);
    } else {
      // Regular category
      console.log(`\n📁 ${item.name}:`);
      console.log(`   ORIGINAL (stored): total_pages: ${item.total_pages}`);
      console.log(
        `   DISPLAY (trimmed to): children_list: ${item.display_pages}`,
      );
    }
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`📊 FILE STATS:`);
  console.log(`   Original size: ${(originalSize / 1024).toFixed(2)} KB`);
  console.log(`   New size: ${(newSize / 1024).toFixed(2)} KB`);
  console.log(`   Reduction: ${reduction}%`);
  console.log(`\n✅ Saved: ${CONFIG.outputPath}`);
  console.log(`💾 Original backup: ${CONFIG.backupPath}`);
  console.log(
    `\n⚠️  Note: Original total counts are preserved in total_pages fields`,
  );
  console.log(
    `   Only display arrays (children_list, base_paths, language_paths) are trimmed`,
  );
}

// Run it
trimDepth1();
