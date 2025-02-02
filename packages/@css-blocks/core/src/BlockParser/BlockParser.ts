import * as debugGenerator from "debug";
import { postcss } from "opticss";

import { Block } from "../BlockTree";
import { Options, ResolvedConfiguration, resolveConfiguration } from "../configuration";
import { FileIdentifier } from "../importing";

import { assertForeignGlobalAttribute } from "./features/assert-foreign-global-attribute";
import { composeBlock } from "./features/composes-block";
import { constructBlock } from "./features/construct-block";
import { disallowImportant } from "./features/disallow-important";
import { discoverName } from "./features/discover-name";
import { exportBlocks } from "./features/export-blocks";
import { extendBlock } from "./features/extend-block";
import { globalAttributes } from "./features/global-attributes";
import { implementBlock } from "./features/implement-block";
import { importBlocks } from "./features/import-blocks";
import { processDebugStatements } from "./features/process-debug-statements";
import { BlockFactory } from "./index";
import { Syntax } from "./preprocessing";

const debug = debugGenerator("css-blocks:BlockParser");

export interface ParsedSource {
  identifier: FileIdentifier;
  defaultName: string;
  originalSource: string;
  originalSyntax: Syntax;
  parseResult: postcss.Root;
  dependencies: string[];
}

/**
 * Parser that, given a PostCSS AST will return a `Block` object. Main public
 * interface is `BlockParser.parse`.
 */
export class BlockParser {
  private config: ResolvedConfiguration;
  private factory: BlockFactory;

  constructor(opts: Options, factory: BlockFactory) {
    this.config = resolveConfiguration(opts);
    this.factory = factory;
  }

  public parseSource(source: ParsedSource): Promise<Block> {
    let root = source.parseResult;

    return this.parse(root, source.identifier, source.defaultName).then(block => {
      source.dependencies.forEach(block.addDependency);
      return block;
    });
  }

  /**
   * Main public interface of `BlockParser`. Given a PostCSS AST, returns a promise
   * for the new `Block` object.
   * @param root  PostCSS AST
   * @param sourceFile  Source file name
   * @param defaultName Name of block
   */
  public async parse(root: postcss.Root, identifier: string, name: string): Promise<Block> {
    let importer = this.config.importer;
    let debugIdent = importer.debugIdentifier(identifier, this.config);
    let sourceFile = importer.filesystemPath(identifier, this.config) || debugIdent;
    debug(`Begin parse: "${debugIdent}"`);

    // Discover the block's preferred name.
    name = await discoverName(root, name, sourceFile);

    // Create our new Block object and save reference to the raw AST.
    let block = new Block(name, identifier, root);

    // Throw if we encounter any `!important` decls.
    debug(` - Disallow Import`);
    await disallowImportant(root, sourceFile);
    // Discover and parse all block references included by this block.
    debug(` - Import Blocks`);
    await importBlocks(block, this.factory, sourceFile);
    // Export all exported block references from this block.
    debug(` - Export Blocks`);
    await exportBlocks(block, this.factory, sourceFile);
    // Handle any global attributes defined by this block.
    debug(` - Global Attributes`);
    await globalAttributes(root, block, sourceFile);
    // Parse all block styles and build block tree.
    debug(` - Construct Block`);
    await constructBlock(root, block, debugIdent);
    // Verify that external blocks referenced have been imported, have defined the attribute being selected, and have marked it as a global state.
    debug(` - Assert Foreign Globals`);
    await assertForeignGlobalAttribute(root, block, debugIdent);
    // Construct block extensions and validate.
    debug(` - Extend Block`);
    await extendBlock(root, block, debugIdent);
    // Validate that all required Styles are implemented.
    debug(` - Implement Block`);
    await implementBlock(root, block, debugIdent);
    // Register all block compositions.
    await composeBlock(root, block, debugIdent);
    // Log any debug statements discovered.
    debug(` - Process Debugs`);
    await processDebugStatements(root, block, debugIdent, this.config);

    // Return our fully constructed block.
    debug(` - Complete`);
    return block;
  }

}
