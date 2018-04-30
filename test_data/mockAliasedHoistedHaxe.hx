import foo.bar.*;
import foo.bar.nested.FooBar;
#if display
using StringTools;
#end
// skip this
import bar.foo.BarFoo;
import foo.bar.nested.FooBar as FooBar_1;
import foo.bar.nested.BarFoo as BarFoo_1;
import bar.foo.BarFoo as BarFoo_1;
import bar.foo.FooBar as FooBar_1;
import foo.foo.Foo;
import foo.wtf.Isthis;
import wat.yo.Hello;
import foo.foo.Bar;
import foo.wat.bat.foo.FooBar as FooBar_3;
import bar.compound.Fail;
import true.fail.Thistime;
import foo.foo.Biz;
import bar.fiz.Boo;
import bar.foo.AlreadyExisting as AlreadyExisting_1;
import bar.bar.AlreadyExisting as AlreadyExisting_3;
import foo.foo.AlreadyExisting as AlreadyExisting_4;
import bar.bar.Bar as Bar_1;
import bar.bar.Foo as Foo_1;

var a:FooBar;
var b:FooBar_1;
var c:BarFoo_1;
var d:BarFoo_1;
var d:FooBar_1;
var e:Array<Foo> = [];
,Isthis, Hello
var f:Map<Bar, FooBar_3, Fail, Array<Thistime>> = [];
var q:Map<Array<Biz>, Boo> = [];
var x:AlreadyExisting;
var y:AlreadyExisting_1;
var yy:AlreadyExisting_1;
var z:AlreadyExisting_3;
var zz:AlreadyExisting_3;
var u:AlreadyExisting_4;
function(a:Bar_1):Foo_1 {

}