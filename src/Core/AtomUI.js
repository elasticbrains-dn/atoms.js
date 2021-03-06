﻿/// <reference path="Atom.js" />
/// <reference path="AtomBrowser.js" />
/// <reference path="AtomEvaluator.js" />
/// <reference path="ChildEnumerator.js" />

var AtomUI =
{
    nodeValue: (AtomBrowser.isIE && AtomBrowser.majorVersion < 9) ? "nodeValue" : "value",

    attributeMap: function (e, r) {
        var item;
        var map = {};
        var ae = new AtomEnumerator(e.attributes);
        if (r) {
            while (ae.next()) {
                item = ae.current();
                if (r.test(item.nodeName)) {
                    r.lastIndex = 0;
                    map[item.nodeName] = { value: item[AtomUI.nodeValue], node: item };
                }
            }
            return map;
        }

        while (ae.next()) {
            item = ae.current();
            map[item.nodeName] = { value: item[AtomUI.nodeValue], node: item };
        }
        return map;
    },

    cloneNode: ((AtomBrowser.isIE && AtomBrowser.majorVersion < 8) ? (function (e) {

        var document = window.document;

        var r = document.createElement(e.nodeName);
        var ae = new AtomEnumerator(e.attributes);
        while (ae.next()) {
            var a = ae.current();
            try{
                var name = a.nodeName;
                var v = a[AtomUI.nodeValue];
                if (!v)
                    continue;
                r.setAttribute(name, v);
            }catch(ex){}
        }

        var firstChild = e.firstChild;
        while (firstChild) {

            if (firstChild.nodeType == 3) {
                var n = document.createTextNode(firstChild.nodeValue);
                r.appendChild(n);
            } else if (firstChild.nodeType == 1) {
                r.appendChild(AtomUI.cloneNode(firstChild));
            }
            firstChild = firstChild.nextSibling;
        }

        return r;
    }) : function (e) {
        return e.cloneNode(true);
    }),

    findPresenter: function (e) {
        //if (!(AtomBrowser.isIE && AtomBrowser.majorVersion < 8)) {
        //    return $(e).find("[atom-presenter]").get(0);
        //}
        var ae = new ChildEnumerator(e);
        while (ae.next()) {
            var item = ae.current();
            var ap = $(item).attr("atom-presenter");
            if (ap)
                return item;
            var c = AtomUI.findPresenter(item);
            if (c)
                return c;
        }
        return null;
    },

    parseUrl: function (url) {
        var r = {};

        var plist = url.split('&');

        var ae = new AtomEnumerator(plist);
        while (ae.next()) {
            var p = ae.current().split('=');
            var key = p[0];
            var val = p[1];
            if (val) {
                val = decodeURIComponent(val);
            }
            val = AtomUI.parseValue(val);
            r[key] = val;
        }
        return r;
    },

    parseValue: function (val) {
        var n;
        if (/^[0-9]+$/.test(val)) {
            n = parseInt(val, 10);
            if (!isNaN(n)) {
                val = n;
            }
            return val;
        }
        if (/^[0-9]+\.[0-9]+/gi.test(val)) {
            n = parseFloat(val);
            if (!isNaN(n)) {
                val = n;
            }
            return val;
        }

        if (/true/.test(val)) {
            val = true;
            return val;
        }
        if (/false/.test(val)) {
            val = false;
            return val;
        }
        return val;
    },

    cancelEvent: function (e) {

        var t = e.target;
        if (t && /input/gi.test(t.nodeName) && /checkbox/gi.test(t.type))
            return;

        if (e.preventDefault) { e.preventDefault(); }
        else { e.stop(); }

        e.returnValue = false;
        e.stopPropagation();
        return false;
    },

    assignID: function (element) {
        if (!element.id) {
            element.id = "__waID" + AtomUI.getNewIndex();
        }
        return element.id;
    },

    atomParent: function (element) {
        if (element.atomControl) {
            return element.atomControl;
        }
        if (element === document || element === window || !element.parentNode)
            return null;
        return AtomUI.atomParent(element._logicalParent || element.parentNode);
    },
    //startsWith: function (text, part) {
    //    if (!text || text.constructor != String)
    //        return false;
    //    return text.indexOf(part) == 0;
    //},
    //endsWith: function (text, part) {
    //    if (!text || text.constructor != String)
    //        return false;
    //    return text.lastIndexOf(part) == (text.length - part.length);
    //},

    toNumber: function (text) {
        if (!text)
            return 0;
        if (text.constructor == String)
            return parseFloat(text);
        return text;
    },

    isNode: function (o) {
        try {
            if (window.XMLHttpRequest && o instanceof XMLHttpRequest)
                return true;
        } catch (ex) {
        }
        //if (o.addEventListener)
        //    return true;

        if (o === window || o === document)
            return true;
        return (
        typeof Node === "object" ? o instanceof Node :
        typeof o === "object" && typeof o.nodeType === "number" && typeof o.nodeName === "string"
      );
    },

    createDelegate: function (instance, methodName) {
        return this.getDelegate(instance, methodName, true);
    },
    getDelegate: function (instance, methodName, create) {
        if (methodName && methodName.constructor != String)
            throw new Error("methodName has to be string");
        var d = instance.__delegates;
        if (!d) {
            if (!create)
                return null;
            d = {};
            instance.__delegates = d;
        }
        var m = d[methodName];
        if (!m) {
            if (!create)
                return null;
            var f = instance[methodName];
            if (!f) {
                throw new Error("method " + methodName + " not found");
            }
            m = function () {
                return f.apply(instance, arguments);
            };
            d[methodName] = m;
        }
        return m;
    },

    __index: 1000,
    getNewIndex: function () {
        this.__index = this.__index + 1;
        return this.__index;
    },

    contains: function (array, item) {
        var n = array.length;
        var i = 0;
        for (i = 0; i < n; i++) {
            if (array[i] == item)
                return true;
        }
        return false;
    },

    removeAllChildren: function (element) {
        while (element.hasChildNodes()) {
            var lc = element.lastChild;
            if (!lc)
                break;
            //element.removeChild(lc);
            if (lc.atomControl) {
                lc.atomControl.dispose();
                delete lc.atomControl;
            }
            $(lc).remove();
            //delete lc;
        }
    },

    isWebkit: function () {
        if (window.navigator.userAgent.toLowerCase().indexOf("webkit") == -1)
            return false;
        return true;
    },

    isWeirdControl: function (e) {
        return e.nodeName == "BUTTON" || e.nodeName == "SELECT" || (e.nodeName == "INPUT" && $(e).attr("type") == "submit");
    },

    parseCSS: function (e, a) {
        var p = parseInt($(e).css(a), 10);
        if (isNaN(p))
            return 0;
        return p;
    },

    setItemRect: function (e, r) {

        var isButton = this.isWeirdControl(e);

        if (r.width) {
            r.width -= this.parseCSS(e, "marginLeft") + this.parseCSS(e, "marginRight");
            if (!isButton) {
                r.width -= this.parseCSS(e, "borderLeftWidth") + this.parseCSS(e, "borderRightWidth");
                r.width -= this.parseCSS(e, "paddingLeft") + this.parseCSS(e, "paddingRight");
            }
            if (r.width < 0)
                r.width = 0;
            e.style.width = r.width + "px";
        }
        if (r.height) {
            //r.height -= $(e).outerWidth(true) - $(e).width();
            r.height -= this.parseCSS(e, "marginTop") + this.parseCSS(e, "marginBottom");
            if (!isButton) {
                r.height -= this.parseCSS(e, "borderTopWidth") + this.parseCSS(e, "borderBottomWidth");
                r.height -= this.parseCSS(e, "paddingTop") + this.parseCSS(e, "paddingBottom");
            }
            if (r.height < 0)
                r.height = 0;
            e.style.height = r.height + "px";
        }
        if (r.left) {
            e.style.left = r.left + "px";
        }
        if (r.top) {
            e.style.top = r.top + "px";
        }
    },

    getPresenterOwner: function (ctrl, p) {
        if (ctrl._presenters) {
            var ae = new AtomEnumerator(ctrl._presenters);
            while (ae.next()) {
                var c = ae.current();
                if (c == p)
                    return ctrl;
            }
        }
        return this.getPresenterOwner(ctrl.get_atomParent(), p);
    },

    createCss: function (o) {
        if (!o)
            return "";
        if (o.constructor == String)
            return o;
        var list = [];
        for (var k in o) {
            var v = o[k];
            if (!v)
                continue;
            list.push(k);
        }
        return list.join(" ");
    },

    createControl: function (element, type, data, newScope) {
        if (element.atomControl)
            return;
        if (!type) {
            type = $(element).attr("atom-type");
            type = WebAtoms[type];
        } else {
            if (type.constructor == String) {
                type = WebAtoms[type];
            }
        }
        if (type) {
            var ctrl = new type(element);
            if (data) {
                ctrl._data = data;
            }
            if (newScope) {
                ctrl._scope = newScope;
            }

            //inits templates..
            //ctrl.prepareControl();

            //init templates and creates controls...
            ctrl.createChildren();

            if (data) {
                ctrl.init();
            }
            //$(element).removeAttr("atom-type");
            return ctrl;
        }
        return null;
    }

};

window.AtomUI = AtomUI;

AtomUI.isIE7 = window.navigator.userAgent.indexOf("MSIE 7.0") != -1;
AtomUI.isIE8 = window.navigator.userAgent.indexOf("MSIE 8.0") != -1;