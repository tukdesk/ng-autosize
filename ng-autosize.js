'use strict';

var ngAutosize = angular.module("ngAutosize", []);

ngAutosize.directive("ngAutosize", function($parse) {
    var isTextarea = function(ele) {
        return ele && ele.nodeName && ele.nodeName == "TEXTAREA";
    };

    var link = function(scope, element, attrs) {
        var ele = element[0];
        if (!isTextarea(ele)) return;

        var confObj;
        if (attrs.ngAutosize !== "") {
            confObj = $parse(attrs.ngAutosize)(scope);
        }

        // get config
        var config = confObj ? confObj : {};
        var setOverflowX = config.setOverflowX === undefined ? true : config.setOverflowX;
        var setOverflowY = config.setOverflowY === undefined ? true : config.setOverflowY;

        var heightOffset = null;
        var overflowY = 'hidden';

        // init
        var init = function() {
            var style = window.getComputedStyle(ele);
            if (style.resize === "vertical") {
                ele.style.resize = "none";
            } else if (style.resize === "both") {
                ele.style.resize = "horizontal"
            }

            if (style.boxSizing === 'content-box') {
                heightOffset = -(parseFloat(style.paddingTop) + parseFloat(style.paddingBottom));
            } else {
                heightOffset = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
            }

            update();
        };

        var changeOverflow = function(value) {
            {
                // Chrome/Safari-specific fix:
                // When the textarea y-overflow is hidden, Chrome/Safari do not reflow the text to account for the space
                // made available by removing the scrollbar. The following forces the necessary text reflow.
                var width = ele.style.width;
                ele.style.width = '0px';
                // Force reflow:
                /* jshint ignore:start */
                ele.offsetWidth;
                /* jshint ignore:end */
                ele.style.width = width;
            }

            overflowY = value;

            if (setOverflowY) {
                ele.style.overflowY = value;
            }

            update();
        };

        var update = function() {
            var htmlTop = document.documentElement.scrollTop;
            var bodyTop = document.body.scrollTop;

            var originalHeight = ele.style.height;
            var startHeight = ele.style.height;

            ele.style.height = 'auto';

            var endHeight = ele.scrollHeight + heightOffset;

            if (ele.scrollHeight === 0) {
                // If the scrollHeight is 0, then the element probably has display:none or is detached from the DOM.
                ele.style.height = originalHeight;
                return;
            }

            ele.style.height = endHeight + 'px';

            // prevents scroll-position jumping
            document.documentElement.scrollTop = htmlTop;
            document.body.scrollTop = bodyTop;

            var style = window.getComputedStyle(ele, null);

            if (style.height !== ele.style.height) {
                if (overflowY !== 'visible') {
                    changeOverflow('visible');
                    return;
                }
            } else {
                if (overflowY !== 'hidden') {
                    changeOverflow('hidden');
                    return;
                }
            }

            if (startHeight !== ele.style.height) {
                var evt = document.createEvent('Event');
                evt.initEvent('autosize:resize', true, false);
                ele.dispatchEvent(evt);
            }
        };

        var destroy = (function (style) {
            window.removeEventListener('resize', update);
            ele.removeEventListener('input', update);
            ele.removeEventListener('keyup', update);
            ele.removeAttribute('data-autosize-on');
            ele.removeEventListener('autosize:destroy', destroy);

            Object.keys(style).forEach(function (key) {
                ele.style[key] = style[key];
            });
        }).bind(ele, {
                height: ele.style.height,
                resize: ele.style.resize,
                overflowY: ele.style.overflowY,
                overflowX: ele.style.overflowX,
                wordWrap: ele.style.wordWrap });

        ele.addEventListener('autosize:destroy', destroy);

        // IE9 does not fire onpropertychange or oninput for deletions,
        // so binding to onkeyup to catch most of those events.
        // There is no way that I know of to detect something like 'cut' in IE9.
        if ('onpropertychange' in ele && 'oninput' in ele) {
            ele.addEventListener('keyup', update);
        }

        window.addEventListener('resize', update);
        ele.addEventListener('input', update);
        ele.addEventListener('autosize:update', update);
        ele.setAttribute('data-autosize-on', true);

        if (setOverflowY) {
            ele.style.overflowY = 'hidden';
        }
        if (setOverflowX) {
            ele.style.overflowX = 'hidden';
            ele.style.wordWrap = 'break-word';
        }

        init();
    };

    return {
        restrict: "A",
        link: link
    }
});