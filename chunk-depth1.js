import fs from "fs";
import path from "path";

const CONFIG = {
  maxChunkSize: 60,
  inputPath: "public/thewallstreetbulls.depth1.json",
  outputDir: "public/data",
  metaDataPath: "public/chunk-metadata.json",
  backupPath: "public/thewallstreetbulls.depth1.backup.json",
};

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function createChunks(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize)
    chunks.push(array.slice(i, i + chunkSize));
  return chunks;
}

function getChunkFileName(categoryName, chunkIndex, totalChunks) {
  return totalChunks === 1
    ? `${categoryName}.json`
    : `${categoryName}.chunk-${chunkIndex + 1}-of-${totalChunks}.json`;
}

function getChildDisplayName(child) {
  return child.breadcrumb[child.breadcrumb.length - 1];
}

function buildLanguageMap(basePaths, languagePaths) {
  const languageMap = new Map();
  basePaths.forEach((basePath) => languageMap.set(basePath, []));
  languagePaths.forEach((langPath) => {
    const basePath = langPath.substring(0, langPath.lastIndexOf("/"));
    if (languageMap.has(basePath)) languageMap.get(basePath).push(langPath);
  });
  return languageMap;
}

function correctTotalPages(data) {
  let corrections = 0;
  for (const child of data.children) {
    let correctedTotal = 0;
    if (child.name === "codeLibrary") {
      const basePaths = child.base_paths || [];
      const languagePaths = child.language_paths || [];
      correctedTotal = basePaths.length + languagePaths.length;
      if (child.total_base_paths !== basePaths.length)
        child.total_base_paths = basePaths.length;
      if (child.total_language_paths !== languagePaths.length)
        child.total_language_paths = languagePaths.length;
    } else {
      correctedTotal = (child.children_list || []).length;
    }
    if (child.total_pages !== correctedTotal) {
      child.total_pages = correctedTotal;
      corrections++;
    }
  }
  return corrections;
}

function chunkDepth1() {
  const inputFile = path.join(process.cwd(), CONFIG.inputPath);
  if (!fs.existsSync(inputFile)) process.exit(1);

  const data = JSON.parse(fs.readFileSync(inputFile, "utf8"));
  const corrections = correctTotalPages(data);

  fs.writeFileSync(
    path.join(process.cwd(), CONFIG.backupPath),
    JSON.stringify(data, null, 2),
  );
  ensureDir(path.join(process.cwd(), CONFIG.outputDir));

  const chunkMetadata = {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    sourceFile: CONFIG.inputPath,
    corrections: corrections,
    chunks: {},
  };

  for (const child of data.children) {
    const categoryData = {
      ...child,
      _metadata: {
        categoryName: child.name,
        displayName: getChildDisplayName(child),
        totalItems: 0,
        chunkSize: CONFIG.maxChunkSize,
        totalChunks: 0,
        chunkFiles: [],
      },
    };

    if (child.name === "codeLibrary") {
      const basePaths = child.base_paths || [];
      const languagePaths = child.language_paths || [];
      const totalBasePaths = basePaths.length;
      const totalLanguagePaths = languagePaths.length;
      const totalPages = child.total_pages;
      let totalChunksValue = 1;
      const fullLanguageMap = buildLanguageMap(basePaths, languagePaths);

      if (totalBasePaths > CONFIG.maxChunkSize) {
        const baseChunks = createChunks(basePaths, CONFIG.maxChunkSize);
        totalChunksValue = baseChunks.length;

        categoryData.base_paths = {
          _type: "chunked",
          total: totalBasePaths,
          chunkSize: CONFIG.maxChunkSize,
          totalChunks: totalChunksValue,
          chunks: [],
        };

        categoryData.language_paths = {
          _type: "chunked",
          total: totalLanguagePaths,
          chunkSize: CONFIG.maxChunkSize,
          totalChunks: totalChunksValue,
          chunks: [],
        };

        baseChunks.forEach((baseChunk, chunkIndex) => {
          const langChunkFileName = getChunkFileName(
            `${child.name}_languages`,
            chunkIndex,
            baseChunks.length,
          );
          const baseChunkFileName = getChunkFileName(
            `${child.name}_basepaths`,
            chunkIndex,
            baseChunks.length,
          );

          fs.writeFileSync(
            path.join(process.cwd(), CONFIG.outputDir, baseChunkFileName),
            JSON.stringify(
              {
                category: child.name,
                chunkIndex: chunkIndex + 1,
                totalChunks: baseChunks.length,
                items: baseChunk,
                parentPath: child.path,
                chunkType: "base_paths",
                languageChunkFile: langChunkFileName,
              },
              null,
              2,
            ),
          );

          categoryData.base_paths.chunks.push({
            index: chunkIndex + 1,
            file: baseChunkFileName,
            itemCount: baseChunk.length,
            startIndex: chunkIndex * CONFIG.maxChunkSize + 1,
            endIndex: Math.min(
              (chunkIndex + 1) * CONFIG.maxChunkSize,
              totalBasePaths,
            ),
            languageChunkFile: langChunkFileName,
          });

          const correspondingLanguages = [];
          baseChunk.forEach((basePath) => {
            const langs = fullLanguageMap.get(basePath) || [];
            correspondingLanguages.push(...langs);
          });

          fs.writeFileSync(
            path.join(process.cwd(), CONFIG.outputDir, langChunkFileName),
            JSON.stringify(
              {
                category: child.name,
                chunkIndex: chunkIndex + 1,
                totalChunks: baseChunks.length,
                items: correspondingLanguages,
                parentPath: child.path,
                chunkType: "language_paths",
                correspondingBaseChunk: chunkIndex + 1,
                baseChunkFile: baseChunkFileName,
              },
              null,
              2,
            ),
          );

          categoryData.language_paths.chunks.push({
            index: chunkIndex + 1,
            file: langChunkFileName,
            itemCount: correspondingLanguages.length,
            startIndex: chunkIndex * CONFIG.maxChunkSize * 22 + 1,
            endIndex: Math.min(
              (chunkIndex + 1) * CONFIG.maxChunkSize * 22,
              totalLanguagePaths,
            ),
            correspondingBaseChunk: chunkIndex + 1,
            baseChunkFile: baseChunkFileName,
          });
        });

        categoryData._metadata.totalItems = totalBasePaths;
        categoryData._metadata.totalChunks = totalChunksValue;
        categoryData._metadata.chunkFiles = categoryData.base_paths.chunks.map(
          (c) => c.file,
        );
      } else {
        categoryData.base_paths = basePaths;
        categoryData.language_paths = languagePaths;
        categoryData._metadata.totalItems = totalBasePaths;
        categoryData._metadata.totalChunks = 1;
        categoryData._metadata.chunkFiles = [];
      }

      fs.writeFileSync(
        path.join(process.cwd(), CONFIG.outputDir, `${child.name}.json`),
        JSON.stringify(categoryData, null, 2),
      );

      chunkMetadata.chunks[child.name] = {
        type: "codeLibrary",
        displayName: getChildDisplayName(child),
        path: child.path,
        total_pages: totalPages,
        total_base_paths: totalBasePaths,
        total_language_paths: totalLanguagePaths,
        totalChunks: totalChunksValue,
        basePathChunks: categoryData.base_paths.chunks || [],
        languageChunks: categoryData.language_paths.chunks || [],
        mainFile: `${child.name}.json`,
      };
    } else {
      const childrenList = child.children_list || [];
      const totalItems = childrenList.length;
      const totalPages = child.total_pages;

      if (totalItems > CONFIG.maxChunkSize) {
        const chunks = createChunks(childrenList, CONFIG.maxChunkSize);
        categoryData._metadata.totalItems = totalItems;
        categoryData._metadata.totalChunks = chunks.length;

        categoryData.children_list = {
          _type: "chunked",
          total: totalItems,
          chunkSize: CONFIG.maxChunkSize,
          chunks: [],
        };

        chunks.forEach((chunk, chunkIndex) => {
          const chunkFileName = getChunkFileName(
            child.name,
            chunkIndex,
            chunks.length,
          );
          fs.writeFileSync(
            path.join(process.cwd(), CONFIG.outputDir, chunkFileName),
            JSON.stringify(
              {
                category: child.name,
                displayName: getChildDisplayName(child),
                chunkIndex: chunkIndex + 1,
                totalChunks: chunks.length,
                items: chunk,
                parentPath: child.path,
                chunkType: "children_list",
                total_pages: totalPages,
              },
              null,
              2,
            ),
          );

          categoryData.children_list.chunks.push({
            index: chunkIndex + 1,
            file: chunkFileName,
            itemCount: chunk.length,
            startIndex: chunkIndex * CONFIG.maxChunkSize + 1,
            endIndex: Math.min(
              (chunkIndex + 1) * CONFIG.maxChunkSize,
              totalItems,
            ),
          });
        });
      } else {
        categoryData._metadata.totalItems = totalItems;
        categoryData._metadata.totalChunks = 1;
      }

      fs.writeFileSync(
        path.join(process.cwd(), CONFIG.outputDir, `${child.name}.json`),
        JSON.stringify(categoryData, null, 2),
      );

      chunkMetadata.chunks[child.name] = {
        type: "category",
        displayName: getChildDisplayName(child),
        path: child.path,
        total_pages: totalPages,
        totalItems: totalItems,
        chunkSize: CONFIG.maxChunkSize,
        totalChunks: Math.ceil(totalItems / CONFIG.maxChunkSize),
        mainFile: `${child.name}.json`,
        chunks: categoryData.children_list?.chunks || [],
      };
    }
  }

  const slimDepth1 = {
    ...data,
    children: data.children.map((child) => {
      const chunkInfo = chunkMetadata.chunks[child.name];
      return {
        name: child.name,
        path: child.path,
        depth: child.depth,
        breadcrumb: child.breadcrumb,
        total_pages: child.total_pages,
        total_base_paths: child.total_base_paths,
        total_language_paths: child.total_language_paths,
        child_pattern: child.child_pattern,
        incoming_backlinks: child.incoming_backlinks,
        outgoing_backlinks: child.outgoing_backlinks,
        _chunkFile: `${child.name}.json`,
        _chunkInfo: chunkInfo,
      };
    }),
  };

  fs.writeFileSync(
    path.join(process.cwd(), CONFIG.outputDir, "depth1.index.json"),
    JSON.stringify(slimDepth1, null, 2),
  );
  fs.writeFileSync(
    path.join(process.cwd(), CONFIG.metaDataPath),
    JSON.stringify(chunkMetadata, null, 2),
  );
}

chunkDepth1();
