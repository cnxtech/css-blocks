import { Attr } from "@opticss/element-analysis";

import { ResolvedConfiguration } from "../configuration";

import { AnyNode, Inheritable } from "./Inheritable";
import { RulesetContainer } from "./RulesetContainer";
export { RulesetContainer, Resolution, Ruleset } from "./RulesetContainer";

/**
 * Abstract class that serves as the base for all Styles. Contains basic
 * properties and abstract methods that extenders must implement.
 */
/* tslint:disable:prefer-unknown-to-any */

export abstract class Style<
  Self extends Style<Self, Root, Parent, Child, Token>,
  Root extends Inheritable<any, Root, never, AnyNode, any> | Self,
  Parent extends Inheritable<any, Root, AnyNode | null, Self, any> | null,
  Child extends Inheritable<any, Root, Self, AnyNode | never, any> | never,
  Token extends any = string,
> extends Inheritable<Self, Root, Parent, Child> {
/* tslint:enable:prefer-unknown-to-any */

  /** cache of resolveStyles() */
  private _resolvedStyles: Set<Self> | undefined;

  // tslint:disable-next-line:prefer-unknown-to-any
  public abstract readonly rulesets: RulesetContainer<any>;

  /**
   * Save name, parent container, and create the PropertyContainer for this data object.
   */
  constructor(name: string, parent?: Parent) {
    super(name, parent);
  }

  /**
   * Return the css selector for this `Style`.
   * @param config Option hash configuring output mode.
   * @returns The CSS class.
   */
  public abstract cssClass(config: ResolvedConfiguration): string;

  /**
   * Return the source selector this `Style` was read from.
   * @param scope  Optional scope to resolve this name relative to. If `true`, return the Block name instead of `:scope`. If a Block object, return with the local name instead of `:scope`.
   * @returns The source selector.
   */
  public abstract asSource(scope?: Root | boolean): string;

  /**
   * Return an attribute for analysis using the authored source syntax.
   */
  public abstract asSourceAttributes(): Attr[];

  /**
   * Returns all the classes needed to represent this block object
   * including inherited classes.
   * @returns this object's css class and all inherited classes.
   */
  cssClasses(config: ResolvedConfiguration): string[] {
    let classes: string[] = [];
    for (let style of this.resolveStyles()) {
      classes.push(style.cssClass(config));
    }
    return classes;
  }

  /**
   * Return all Block Objects that are implied by this object.
   * This takes inheritance, attr/class correlations, and any
   * other declared links between styles into account.
   *
   * This Block Object itself is included in the returned result
   * so the resolved value's size is always 1 or greater.
   */
  public resolveStyles(): Set<Self> {
    if (this._resolvedStyles) {
      return new Set(this._resolvedStyles);
    }

    let inheritedStyles = this.resolveInheritance();
    this._resolvedStyles = new Set(inheritedStyles);
    this._resolvedStyles.add(this.asSelf());
    return new Set(this._resolvedStyles);
  }

  /**
   * Debug utility to help log Styles
   * @param config  Options for rendering cssClass.
   * @returns A debug string.
   */
  asDebug(config: ResolvedConfiguration) {
    const classes = this.cssClasses(config).join(".");
    return `${this.asSource()}${classes ? ` (.${classes})` : ""}`;
  }

}
