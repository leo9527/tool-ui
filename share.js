/**
 * Created by jf on 2015/9/11.
 * Modified by bear on 2016/9/7.
 */
const footerTmpl = $('#footerTmpl').html();
var dev = 0
const URL = dev ? "http://127.0.0.1:8080" : "http://120.79.149.62"

function GetQueryString(name) {
    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)");
    var r = decodeURI(window.location.search).substr(1).match(reg);
    if (r != null)
        return unescape(r[2]);
    return null;
}
var pageManager = {
    $container: $('#container'),
    _pageStack: [],
    _configs: [],
    _pageAppend: function() {},
    _defaultPage: null,
    _pageIndex: 1,
    setDefault: function(defaultPage) {
        this._defaultPage = this._find('name', defaultPage);
        return this;
    },
    setPageAppend: function(pageAppend) {
        this._pageAppend = pageAppend;
        return this;
    },
    init: function() {
        var self = this;

        $(window).on('hashchange', function() {
            var state = history.state || {};
            var url = location.hash.indexOf('#') === 0 ? location.hash : '#';
            var page = self._find('url', url) || self._defaultPage;
            if (state._pageIndex <= self._pageIndex || self._findInStack(url)) {
                self._back(page);
            } else {
                self._go(page);
            }
        });

        if (history.state && history.state._pageIndex) {
            this._pageIndex = history.state._pageIndex;
        }

        this._pageIndex--;

        var url = location.hash.indexOf('#') === 0 ? location.hash : '#';
        var page = self._find('url', url) || self._defaultPage;
        this._go(page);
        return this;
    },
    push: function(config) {
        this._configs.push(config);
        return this;
    },
    go: function(to) {
        var config = this._find('name', to);
        if (!config) {
            return;
        }
        location.hash = config.url;
    },
    _go: function(config) {
        this._pageIndex++;

        history.replaceState && history.replaceState({ _pageIndex: this._pageIndex }, '', location.href);

        var html = $(config.template).html();
        var $html = $(html).addClass('slideIn').addClass(config.name);
        $html.on('animationend webkitAnimationEnd', function() {
            $html.removeClass('slideIn').addClass('js_show');
        });
        this.$container.append($html);
        this._pageAppend.call(this, $html);
        this._pageStack.push({
            config: config,
            dom: $html
        });

        if (!config.isBind) {
            this._bind(config);
        }

        return this;
    },
    back: function() {
        history.back();
    },
    _back: function(config) {
        this._pageIndex--;

        var stack = this._pageStack.pop();
        if (!stack) {
            return;
        }

        var url = location.hash.indexOf('#') === 0 ? location.hash : '#';
        var found = this._findInStack(url);
        if (!found) {
            var html = $(config.template).html();
            var $html = $(html).addClass('js_show').addClass(config.name);
            $html.insertBefore(stack.dom);

            if (!config.isBind) {
                this._bind(config);
            }

            this._pageStack.push({
                config: config,
                dom: $html
            });
        }

        stack.dom.addClass('slideOut').on('animationend webkitAnimationEnd', function() {
            stack.dom.remove();
        });

        return this;
    },
    _findInStack: function(url) {
        var found = null;
        for (var i = 0, len = this._pageStack.length; i < len; i++) {
            var stack = this._pageStack[i];
            if (stack.config.url === url) {
                found = stack;
                break;
            }
        }
        return found;
    },
    _find: function(key, value) {
        var page = null;
        for (var i = 0, len = this._configs.length; i < len; i++) {
            if (this._configs[i][key] === value) {
                page = this._configs[i];
                break;
            }
        }
        return page;
    },
    _bind: function(page) {
        var events = page.events || {};
        for (var t in events) {
            for (var type in events[t]) {
                this.$container.on(type, t, events[t][type]);
            }
        }
        page.isBind = true;
    }
};

function fastClick() {
    var supportTouch = function() {
        try {
            document.createEvent("TouchEvent");
            return true;
        } catch (e) {
            return false;
        }
    }();
    var _old$On = $.fn.on;

    $.fn.on = function() {
        if (/click/.test(arguments[0]) && typeof arguments[1] == 'function' && supportTouch) { // 只扩展支持touch的当前元素的click事件
            var touchStartY, callback = arguments[1];
            _old$On.apply(this, ['touchstart', function(e) {
                touchStartY = e.changedTouches[0].clientY;
            }]);
            _old$On.apply(this, ['touchend', function(e) {
                if (Math.abs(e.changedTouches[0].clientY - touchStartY) > 10) return;

                e.preventDefault();
                callback.apply(this, [e]);
            }]);
        } else {
            _old$On.apply(this, arguments);
        }
        return this;
    };
}

function androidInputBugFix() {
    // .container 设置了 overflow 属性, 导致 Android 手机下输入框获取焦点时, 输入法挡住输入框的 bug
    // 相关 issue: https://github.com/weui/weui/issues/15
    // 解决方法:
    // 0. .container 去掉 overflow 属性, 但此 demo 下会引发别的问题
    // 1. 参考 http://stackoverflow.com/questions/23757345/android-does-not-correctly-scroll-on-input-focus-if-not-body-element
    //    Android 手机下, input 或 textarea 元素聚焦时, 主动滚一把
    if (/Android/gi.test(navigator.userAgent)) {
        window.addEventListener('resize', function() {
            if (document.activeElement.tagName == 'INPUT' || document.activeElement.tagName == 'TEXTAREA') {
                window.setTimeout(function() {
                    document.activeElement.scrollIntoViewIfNeeded();
                }, 0);
            }
        })
    }
}

function setPageManager() {
    var pages = {},
        tpls = $('script[type="text/html"]');

    for (var i = 0, len = tpls.length; i < len; ++i) {
        var tpl = tpls[i],
            name = tpl.id.replace(/tpl_/, '');
        pages[name] = {
            name: name,
            url: '#' + name,
            template: '#' + tpl.id
        };
    }
    pages.home.url = '#';

    for (var page in pages) {
        pageManager.push(pages[page]);
    }
    pageManager
        .setPageAppend(function($html) {
            $html.eq(0).append(footerTmpl);
            setTimeout(() => {
                var $foot = $html.find('.page__ft');
                if ($foot.length < 1) return;

                var winH = $(window).height();
                if ($foot.position().top + $foot.height() < winH) {
                    $foot.addClass('j_bottom');
                } else {
                    $foot.removeClass('j_bottom');
                }
            });
        })
        .setDefault('home')
        .init();
}






function dir() {
    var type = GetQueryString('type') ? GetQueryString('type') : 1;
    var params = ""
    var index = GetQueryString('name') ? GetQueryString('name') : 'touch_id1999';
    var gid = GetQueryString('gid') ? GetQueryString('gid') : '872282955597993169'
    params = "?name=" + index + "&gid=" + gid
    var msgId = GetQueryString('msg_id')
    var fsId = GetQueryString('fs_id')
    var uk = GetQueryString('uk')
    var subParam = ""
    if (msgId && fsId && uk) {
        subParam = "&msg_id=" + msgId + "&fs_id=" + fsId + "&uk=" + uk
    }

    axios.interceptors.request.use((config) => {
        // 对响应数据做点什么
        console.log(config);
        var $loadingToast = $('#loadingToast');
        $loadingToast.fadeIn(100);
        return config;
    }, function(error) {
        // 对响应错误做点什么
        return Promise.reject(error);
    });
    axios.interceptors.response.use((response) => {
        // 对响应数据做点什么
        console.log(response);
        if (response.status != "200") {
            var $toast = $('#error');
            $toast.fadeIn(100);
            setTimeout(function() {
                $toast.fadeOut(100);
            }, 2000);
        }

        return response;
    }, function(error) {
        // 对响应错误做点什么
        return Promise.reject(error);
    });
    axios.get(URL + '/pan/listShare' + params + subParam)
        .then(function(response) {
            var $loadingToast = $('#loadingToast');
            $loadingToast.fadeOut(100);
            if (response.data.errno != 1) {
                var $toast = $('#error');
                $toast.fadeIn(100);
                setTimeout(function() {
                    $toast.fadeOut(100);
                }, 2000);
            }
            var listTmpl = '<div class="weui-cell  weui-cell_example"><div class="weui-cell__hd"><span class="#image#" alt=""></span></div><div class="weui-cell__bd"><a href="#url#">#name#</a></div></div>',
                listTmplNoLink = '<div class="weui-cell  weui-cell_example"><div class="weui-cell__hd"><span class="#image#" alt=""></span></div><div class="weui-cell__bd">#name#</div></div>',
                $list = $("#list");
            var data = response.data.data;
            var name = GetQueryString('name') ? GetQueryString('name') : 'touch_id1999';
            for (var i = 0; i < data.length; ++i) {
                if (data[i]['url'] != "") {
                    var str1 = listTmpl.replace('#image#', data[i]['format']);
                    var str2 = str1.replace('#name#', data[i]['name']);
                    var str3 = str2.replace('#url#', data[i]['url']);
                    var html = str3
                } else {
                    var str1 = listTmplNoLink.replace('#image#', data[i]['format']);
                    var str2 = str1.replace('#name#', data[i]['name']);
                    var html = str2
                }

                $list.append(html);
            }
        })
        .catch(function(error) {
            console.log(error);
        });
}

function share() {
    axios.get(URL + '/pan/share')
        .then(function(response) {
            var $loadingToast = $('#loadingToast');
            $loadingToast.fadeOut(100);
            if (response.data.errno != 1) {
                var $toast = $('#error');
                $toast.fadeIn(100);
                setTimeout(function() {
                    $toast.fadeOut(100);
                }, 2000);
            }
            var suTpl = '<a href="#url#" class="weui-btn weui-btn_mini weui-btn_default">#name#</a>',
                $suList = $('#su_list');
            var data = response.data.data
            var keys = Object.keys(data)

            for (var i = 0; i < keys.length; ++i) {
                var html = ''
                var name = keys[i]
                var groupList = data[name]
                var key = Object.keys(groupList)
                for (var j = 0; j < key.length; ++j) {
                    var gname = groupList[key[j]]
                    var html = suTpl.replace('#name#', gname)
                    var url = "?name=" + name + "&gid=" + key[j]
                    html = html.replace('#url#', url)
                    $suList.append(html)
                }


            }


        })
        .catch(function(error) {
            console.log(error);
        });
}

function init() {
    fastClick();
    androidInputBugFix();
    share();
    dir();
    setPageManager();

    window.pageManager = pageManager;
    window.home = function() {
        location.hash = '';
    };
}
init();