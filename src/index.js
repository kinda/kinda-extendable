'use strict';

import semver from 'semver';
import pkg from '../package.json';

let KindaExtendable = {};

(function() {
  this.name = 'KindaExtendable';
  this.version = pkg.version;

  this.extend = function(name, version, builder) {
    let baseclass = this;

    if (typeof name !== 'string') {
      builder = version;
      version = name;
      name = 'Sub' + this.name;
    }

    if (typeof version !== 'string') {
      builder = version;
      version = undefined;
    }

    /*eslint-disable */
    // Unfortunately, eval() is necessary to define a named function
    // TODO: sanitize the 'name' variable
    let subclass = eval(`
      (function() {
        function ${name}() {
          return subclass.create.apply(subclass, arguments);
        };
        return ${name};
      })();
    `);
    /*eslint-enable */

    subclass.version = version;

    // Copy class properties
    let keys = Object.getOwnPropertyNames(KindaExtendable);
    for (let key of keys) {
      if (key in subclass) continue;
      let descriptor = Object.getOwnPropertyDescriptor(KindaExtendable, key);
      Object.defineProperty(subclass, key, descriptor);
    }

    subclass.superclasses = [];

    subclass.include = function(other) {
      if (!(other && other.extend)) {
        throw new Error('\'other\' argument is missing or invalid.');
      }

      let hasSuperclassSameAsOrNewerThan = this.superclasses.some(superclass => {
        return superclass.isSameAsOrNewerThan(other, true);
      });
      if (hasSuperclassSameAsOrNewerThan) return this;

      if (other.builder) {
        let previousClassBeingIncluded = this._classBeingIncluded;
        this._classBeingIncluded = other;
        other.builder.call(this, other);
        this._classBeingIncluded = previousClassBeingIncluded;
      }

      this.superclasses.push(other);

      return this;
    };

    subclass.isPatching = function(version) {
      if (!this._classBeingIncluded) return false;
      let name = this._classBeingIncluded.name;
      if (version) return this._isPatchingToVersion(name, version);
      return this.superclasses.some(superclass => {
        return superclass.name === name;
      });
    };

    subclass._isPatchingToVersion = function(name, version) {
      let newestClass = this._findNewestSuperclassWithName(name);
      if (!newestClass) return false;
      if (!newestClass.version) return true;
      if (semver.gte(newestClass.version, version)) return false;
      return true;
    };

    subclass._findNewestSuperclassWithName = function(name) {
      let newestClass;
      for (let superclass of this.superclasses) {
        if (superclass.name !== name) continue;
        if (!newestClass || !newestClass.version) {
          newestClass = superclass;
          continue;
        }
        if (!superclass.version) continue;
        if (semver.gt(superclass.version, newestClass.version)) {
          newestClass = superclass;
        }
      }
      return newestClass;
    };

    subclass.builder = function(owner) {
      this.include(baseclass);

      if (!builder) return;

      if (typeof builder === 'function') {
        builder.call(this, owner);
      } else { // the builder is an object
        let keys = Object.getOwnPropertyNames(builder);
        for (let key of keys) {
          let descriptor = Object.getOwnPropertyDescriptor(builder, key);
          Object.defineProperty(this.prototype, key, descriptor);
        }
      }
    };

    subclass.builder.call(subclass, subclass);

    return subclass;
  };

  let checkCompatibility = function(v1, v2) {
    if (semver.satisfies(v1, '~' + v2)) return true;
    if (semver.satisfies(v2, '~' + v1)) return true;
    return false;
  };

  this.compareWith = function(other, operator, errorIfNotCompatible) {
    if (!other) return false;
    if (this.name !== other.name) return false;
    if (!this.version || !other.version) return true; // TODO: not sure about that
    if (!checkCompatibility(this.version, other.version)) {
      if (errorIfNotCompatible) {
        throw new Error(`Class ${this.name} v${this.version} is not compatible with class ${other.name} v${other.version}.`);
      }
      return false;
    }
    if (semver[operator](this.version, other.version)) return true;
    return false;
  };

  this.isOlderThan = function(other, errorIfNotCompatible) {
    return this.compareWith(other, 'lt', errorIfNotCompatible);
  };

  this.isSameAsOrOlderThan = function(other, errorIfNotCompatible) {
    return this.compareWith(other, 'lte', errorIfNotCompatible);
  };

  this.isSameAs = function(other, errorIfNotCompatible) {
    return this.compareWith(other, 'eq', errorIfNotCompatible);
  };

  this.isSameAsOrNewerThan = function(other, errorIfNotCompatible) {
    return this.compareWith(other, 'gte', errorIfNotCompatible);
  };

  this.isNewerThan = function(other, errorIfNotCompatible) {
    return this.compareWith(other, 'gt', errorIfNotCompatible);
  };
}).call(KindaExtendable);

export default KindaExtendable;
