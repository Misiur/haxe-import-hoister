import foo.bar.*;
#if display
using StringTools;
#end
// skip this
import bar.foo.BarFoo;
import bar.foo.AlreadyExisting as Wazzaa;

var y:bar.foo.AlreadyExisting;
var b:foo.bar.nested.FooBar;
var a:foo.bar.FooBar;
var c:foo.bar.nested.BarFoo;
var d:bar.foo.BarFoo;
var d:bar.foo.FooBar;
var e:Array<foo.foo.Foo> = [];
,foo.wtf.Isthis, wat.yo.Hello
var f:Map<foo.foo.Bar, foo.wat.bat.foo.FooBar, bar.compound.Fail, Array<true.fail.Thistime>> = [];
var q:Map<Array<foo.foo.Biz>, bar.fiz.Boo> = [];
var x:foo.bar.AlreadyExisting;
var yy:bar.foo.AlreadyExisting;
var z:bar.bar.AlreadyExisting;
var zz:bar.bar.AlreadyExisting;
var u:foo.foo.AlreadyExisting;
var uu:foo.foo.AlreadyExisting.SOMETHING_ELSE;
function(a:bar.bar.Bar):bar.bar.Foo {

}