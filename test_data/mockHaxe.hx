import foo.bar.*;
import foo.bar.nested.FooBar;
#if display
using StringTools;
#end
// skip this
import bar.foo.BarFoo;

var a:foo.bar.FooBar;
var b:foo.bar.nested.FooBar;
var c:foo.bar.nested.BarFoo;
var d:bar.foo.BarFoo;
var d:bar.foo.FooBar;
var e:Array<foo.foo.Foo> = [];
,foo.wtf.Isthis, wat.yo.Hello
var f:Map<foo.foo.Bar, foo.wat.bat.foo.FooBar, bar.compound.Fail, Array<true.fail.Thistime>> = [];
var q:Map<Array<foo.foo.Biz>, bar.fiz.Boo> = [];
var x:foo.bar.AlreadyExisting;
var y:bar.foo.AlreadyExisting;
var yy:bar.foo.AlreadyExisting;
var z:bar.bar.AlreadyExisting;
var zz:bar.bar.AlreadyExisting;
var u:foo.foo.AlreadyExisting;
function(a:bar.bar.Bar):bar.bar.Foo {

}