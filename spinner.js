var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

var defaults = {
    lines: 1,
    length: 0,
    width: 0,
    radius: document.body.clientWidth * 0.075,
    scale: 1.0,
    corners: 1,
    color: '#000',
    fadeColor: 'transparent',
    animation: 'spinner-line-fade-default',
    rotate: 0,
    direction: 1,
    speed: 0.83333,
    zIndex: 2e9,
    className: 'spinner',
    top: '50%',
    left: '50%',
    shadow: '0 0 1px transparent',
    position: 'absolute',
};

var Spinner = /** @class */ (function () {
    function updateRadius(spinner) {
        spinner.opts.radius = document.body.clientWidth * 0.05;
        drawLines(spinner.el, spinner.opts);
    }
    
    function drawLines(el, opts) {
        if (el!=undefined) {el.innerHTML = '';};
    
        var earth = css(document.createElement('div'), {
            position: 'absolute',
            top: '-0.5em',
            left: (opts.radius - 0.5) + 'px',
            fontSize: '2em',
        });
        earth.textContent = '🌍';
        el.appendChild(earth);
    
        var sun = css(document.createElement('div'), {
            position: 'absolute',
            top: '50%',
            left: '50%',
            fontSize: '5em',
            transform: 'translate(-50%, -50%)',
        });
        sun.textContent = '☀️';
        el.appendChild(sun);
    }
    function Spinner(opts) {
        if (opts === void 0) { opts = {}; }
        this.opts = __assign(__assign({}, defaults), opts);
        window.addEventListener('resize', function() {
            updateRadius(this);
        });
    }

    Spinner.prototype.spin = function (target) {
        this.stop();
        this.el = document.createElement('div');
        this.el.className = this.opts.className;
        this.el.setAttribute('role', 'progressbar');
        css(this.el, {
            position: this.opts.position,
            width: 0,
            zIndex: this.opts.zIndex,
            left: this.opts.left,
            top: this.opts.top,
            transform: "scale(" + this.opts.scale + ")",
        });

        if (target) {
            target.insertBefore(this.el, target.firstChild || null);
        }
        drawLines(this.el, this.opts);

        if (typeof requestAnimationFrame !== 'undefined') {
            var animate = function() {
                this.opts.rotate += this.opts.direction * this.opts.speed;
                this.opts.rotate %= 360;
                css(this.el, {
                    transform: "rotate(" + this.opts.rotate + "deg)",
                });
                this.animateId = requestAnimationFrame(animate.bind(this));
            }.bind(this);
            animate();
        }
        return this;
    };

    Spinner.prototype.stop = function () {
        if (this.el) {
            if (typeof requestAnimationFrame !== 'undefined') {
                cancelAnimationFrame(this.animateId);
            } else {
                clearTimeout(this.animateId);
            }
            if (this.el.parentNode) {
                this.el.parentNode.removeChild(this.el);
            }
            this.el = undefined;
        }
        return this;
    };

    return Spinner;
}());
export { Spinner };

function css(el, props) {
    for (var prop in props) {
        el.style[prop] = props[prop];
    }
    return el;
}
