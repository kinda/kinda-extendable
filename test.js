'use strict';

import { assert } from 'chai';
import KindaExtendable from './src';

suite('KindaExtendable', function() {
  test('simple extend', function() {
    let Class = KindaExtendable.extend('Class', function() {
      this.staticMethod = function() {
        return 'Hello!';
      };
    });

    assert.strictEqual(Class.name, 'Class');
    assert.strictEqual(Class.staticMethod(), 'Hello!');
    assert.deepEqual(Class.superclasses, [KindaExtendable]);

    let Subclass = Class.extend('Subclass', function() {
      this.otherStaticMethod = function() {
        return 'Hello again!';
      };
    });

    assert.strictEqual(Subclass.name, 'Subclass');
    assert.strictEqual(Subclass.staticMethod(), 'Hello!');
    assert.strictEqual(Subclass.otherStaticMethod(), 'Hello again!');
    assert.deepEqual(Subclass.superclasses, [KindaExtendable, Class]);
  });

  test('simple include', function() {
    let Mixin = KindaExtendable.extend('Mixin', function() {
      this.mixinMethod = function() {
        return 'Hello from Mixin!';
      };
    });

    let Class = KindaExtendable.extend('Class', function() {
      this.include(Mixin);
      this.staticMethod = function() {
        return 'Hello from Class!';
      };
    });

    assert.strictEqual(Class.name, 'Class');
    assert.strictEqual(Class.staticMethod(), 'Hello from Class!');
    assert.strictEqual(Class.mixinMethod(), 'Hello from Mixin!');
    assert.deepEqual(Class.superclasses, [KindaExtendable, Mixin]);

    let Subclass = Class.extend('Subclass', function() {
      this.otherStaticMethod = function() {
        return 'Hello from Subclass!';
      };
    });

    assert.strictEqual(Subclass.name, 'Subclass');
    assert.strictEqual(Subclass.staticMethod(), 'Hello from Class!');
    assert.strictEqual(Subclass.mixinMethod(), 'Hello from Mixin!');
    assert.strictEqual(Subclass.otherStaticMethod(), 'Hello from Subclass!');
    assert.deepEqual(Subclass.superclasses, [KindaExtendable, Mixin, Class]);
  });

  test('version', function() {
    let Class1 = KindaExtendable.extend('Class1');
    assert.isUndefined(Class1.version);

    let Class2 = KindaExtendable.extend('Class2', '0.1.0');
    assert.strictEqual(Class2.version, '0.1.0');
  });

  test('compare classes', function() {
    let Class1 = KindaExtendable.extend('Class', '0.1.0');

    assert.isTrue(Class1.isSameAsOrNewerThan(Class1, true));
    assert.isFalse(Class1.isSameAsOrNewerThan(undefined, true));

    let Class2 = KindaExtendable.extend('Class', '0.1.1');

    assert.isTrue(Class2.isSameAsOrNewerThan(Class1, true));
    assert.isFalse(Class1.isSameAsOrNewerThan(Class2, true));

    let Class3 = KindaExtendable.extend('Class', '0.2.0');

    assert.isFalse(Class3.isSameAsOrNewerThan(Class1, false));
    assert.isFalse(Class1.isSameAsOrNewerThan(Class3, false));
    assert.throws(function() {
      Class3.isSameAsOrNewerThan(Class1, true);
    });
  });

  test('prototype', function() {
    let Class = KindaExtendable.extend('Class', function() {
      this.prototype.method = function() {
        return 'Hello!';
      };
    });

    assert.strictEqual(Class.prototype.method(), 'Hello!');
  });

  test('extend with an object as builder', function() {
    let French = KindaExtendable.extend('French', {
      hello: 'Bonjour', // should go in the prototype
      bye: 'Au revoir'
    });

    assert.strictEqual(French.prototype.hello, 'Bonjour');
    assert.strictEqual(French.prototype.bye, 'Au revoir');
  });

  test('extend a class with the same name', function() {
    let Class = KindaExtendable.extend('Class', function() {
      this.nice = 'yes';
      this.cool = 'yes';
    });

    assert.strictEqual(Class.nice, 'yes');
    assert.strictEqual(Class.cool, 'yes');

    Class = Class.extend('Class', function() {
      this.cool = 'always';
    });

    assert.strictEqual(Class.nice, 'yes');
    assert.strictEqual(Class.cool, 'always');

    Class = Class.extend('Class', function() {
      this.cool = 'definitely';
    });

    assert.strictEqual(Class.nice, 'yes');
    assert.strictEqual(Class.cool, 'definitely');
  });

  test('include a class of the same name', function() {
    let Class = KindaExtendable.extend('Class', function() {
      this.nice = 'yes';
      this.cool = 'yes';
    });

    assert.strictEqual(Class.nice, 'yes');
    assert.strictEqual(Class.cool, 'yes');

    let Class2 = KindaExtendable.extend('Class', function() {
      this.cool = 'always';
    });

    let Subclass = Class.extend('Subclass', function() {
      this.include(Class2); // should do nothing
    });

    assert.strictEqual(Subclass.nice, 'yes');
    assert.strictEqual(Subclass.cool, 'yes');
  });

  test('diamond problem', function() {
    let count = 0;

    let Top = KindaExtendable.extend('Top', function() {
      count++;
    });
    assert.strictEqual(count, 1);

    let Left = Top.extend('Left');
    assert.strictEqual(count, 2);

    let Right = Top.extend('Right');
    assert.strictEqual(count, 3);

    let Bottom = Top.extend('Bottom', function() { // eslint-disable-line no-unused-vars
      this.include(Left); // should not run the Top builder
      this.include(Right); // should not run the Top builder
    });
    assert.strictEqual(count, 4);
  });

  test('include compatible and incompatible versions', function() {
    let a010Built, a015Built;
    let A010 = KindaExtendable.extend('A', '0.1.0', function() {
      a010Built = true;
    });
    let A015 = KindaExtendable.extend('A', '0.1.5', function() {
      a015Built = true;
    });
    let A020 = KindaExtendable.extend('A', '0.2.0');

    a010Built = false;
    a015Built = false;
    KindaExtendable.extend(function() {
      this.include(A010);
      this.include(A015);
    });
    assert.isTrue(a010Built);
    assert.isTrue(a015Built);

    a010Built = false;
    a015Built = false;
    KindaExtendable.extend(function() {
      this.include(A015);
      this.include(A010); // should not be included
    });
    assert.isTrue(a015Built);
    assert.isFalse(a010Built);

    assert.throws(function() {
      KindaExtendable.extend(function() {
        this.include(A015);
        this.include(A020); // should throw an error
      });
    });
  });

  test('patching', function() {
    let A = KindaExtendable.extend('A', '0.1.0', function() {
      this.greeting = 'Hi';
    });

    let isPatchingCount = 0;
    let isPatchingToVersion010Count = 0;
    let isPatchingToVersion011Count = 0;

    let A2 = KindaExtendable.extend('A', '0.1.1', function() {
      this.greeting = 'Hello';

      if (this.isPatching()) isPatchingCount++;
      if (this.isPatching('0.1.0')) isPatchingToVersion010Count++;
      if (this.isPatching('0.1.1')) isPatchingToVersion011Count++;
    });

    assert.strictEqual(isPatchingCount, 0);
    assert.strictEqual(isPatchingToVersion010Count, 0);
    assert.strictEqual(isPatchingToVersion011Count, 0);

    let M = A2.extend('M');

    assert.strictEqual(isPatchingCount, 0);
    assert.strictEqual(isPatchingToVersion010Count, 0);
    assert.strictEqual(isPatchingToVersion011Count, 0);

    let B = A.extend('B', function() {
      this.include(M);
    });

    assert.strictEqual(isPatchingCount, 1);
    assert.strictEqual(isPatchingToVersion010Count, 0);
    assert.strictEqual(isPatchingToVersion011Count, 1);

    assert.strictEqual(B.greeting, 'Hello');
  });
});
