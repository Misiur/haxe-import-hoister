package bar;

import foo.bar.* as *;
import star.test.* as *;

import bigger.Conflict as ARGH;
import foo.bar.nested.BarFoo as BarFoo_1;
import foo.bar.nested.FooBar as FooBar_1;
import foo.foo.AlreadyExisting as AlreadyExisting_2;
import foo.foo.Bar as Bar;
import foo.foo.Biz as Biz;
import foo.foo.Foo as Foo;
import foo.wat.bat.foo.FooBar as FooBar_3;
import foo.wtf.Isthis as Isthis;
import hello.Test as Test;
import is.not.Conflict as Conflict_7;
import may.not.Conflict as Conflict_8;
import meh.Conflicting as Compacent;
import notastar.Conflicting as Conflicting_1;
import numbered.Conflict as Conflict_6;
import something.Whatever as Whatever;
import true.fail.Thistime as Thistime;
import was.Conflict as Conflict;
import wat.yo.Hello as Hello;

import bar.bar.AlreadyExisting as AlreadyExisting_1;
import bar.bar.Bar as Bar_1;
import bar.bar.Foo as Foo_1;
import bar.compound.Fail as Fail;
import bar.fiz.Boo as Boo;
import bar.foo.AlreadyExisting as Wazzaa;
import bar.foo.BarFoo as BarFoo;
import bar.foo.FooBar as FooBar_2;

#if display
using StringTools;
#end
// skip this


var y:Wazzaa;
var b:FooBar_1;
var a:FooBar;
var c:BarFoo_1;
var d:BarFoo;
var d:FooBar_2;
var e:Array<Foo> = [];
,Isthis, Hello
var f:Map<Bar, FooBar_3, Fail, Array<Thistime>> = [];
var q:Map<Array<Biz>, Boo> = [];
var x:AlreadyExisting;
var yy:Wazzaa;
var z:AlreadyExisting_1;
var zz:AlreadyExisting_1;
var u:AlreadyExisting_2;
var uu:AlreadyExisting_2.SOMETHING_ELSE;
function(a:Bar_1):Foo_1 {

}

var a = new Whatever();
var q = Test.HELLO_WORLD;
var c = normal.function.Call();

@:metadata(need.a.full.Path)

Conflicting
Conflicting_1
Compacent

Conflict
Conflict_6
Conflict_7
Conflict_6
ARGH
Conflict_8