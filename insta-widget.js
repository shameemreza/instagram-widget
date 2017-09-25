/* 
	Instagram Widget
	Version: 1.0.1
	Author: Shameem Reza
 */


(function($, window, undefined) {
    var
        /**
         * Contains count of widgets on the page
         * @member {number}
         */
        widgetsCount = 0;

    
    // Array.prototype.filter polyfill from MDN
    if (!window.Array.prototype.filter) {
        window.Array.prototype.filter = function(fun/*, thisArg*/) {
            'use strict';
    
            if (this === undefined || this === null) {
                throw new window.TypeError();
            }
    
            var t = window.Object(this);
            var len = t.length >>> 0;
            if (typeof fun !== 'function') {
                throw new window.TypeError();
            }
    
            var res = [];
            var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
            for (var i = 0; i < len; i++) {
                if (i in t) {
                    var val = t[i];
    
                    if (fun.call(thisArg, val, i, t)) {
                        res.push(val);
                    }
                }
            }
    
            return res;
        };
    }
    
    var reverseString = function(str) {
        return str.split('').reverse().join('');
    };

    /**
     * Creates  new Instagram API wrapper
     * @param clientId {string}
     * @constructor
     */
    function ShameemClient(clientId, accessToken, cacheMediaTime, alternativeApiUrl, isSandbox) {
        /**
         * Instagram Client ID
         * @type {string}
         * @private
         */
        this._clientId = clientId;
    
        this._accessToken = accessToken;
    
        this._lastPagination = {};
        this._initialPagination = {};
        this._loading = false;
        this._cacheMediaTime = cacheMediaTime;
        this._alternativeApiUrl = alternativeApiUrl;
        this._cachedProfile = null;
        this._isSandbox = isSandbox;
    }
    ShameemClient.prototype = function() {};
    
    /**
     * Instagram API URL
     * @type {string}
     * @private
     */
    
    ShameemClient.prototype._apiUrl = "https://api.instagram.com/v1";
    
    ShameemClient.prototype.getApiUrl = function() {
        if (this._alternativeApiUrl) {
            return this._alternativeApiUrl.replace(/\/*$/, '') + '/';
        }
    
        return ShameemClient.prototype._apiUrl;
    };
    
    ShameemClient.prototype.isAlternativeApi = function() {
        return this.getApiUrl() != ShameemClient.prototype._apiUrl;
    };
    
    ShameemClient.prototype.hasNextPage = function(id) {
        var
            /**
             * Alias to "this"
             * @type {ShameemWidget}
             */
            self = this;
    
        if (!$.isArray(id)) {
            id = [id];
        }
    
        return window.Object.keys(this._lastPagination).some(function(el) {
            return !!~(id.indexOf(el)) && self._lastPagination[el] && self._lastPagination[el].next_url;
        });
    };
    
    ShameemClient.prototype._hasInitialPage = function(id) {
        var
            /**
             * Alias to "this"
             * @type {ShameemWidget}
             */
            self = this;
    
        if (!$.isArray(id)) {
            id = [id];
        }
    
        return window.Object.keys(this._initialPagination).some(function(el) {
            return !!~(id.indexOf(el)) && self._initialPagination[el] && self._initialPagination[el].next_url;
        });
    };
    
    ShameemClient.prototype.resetPagination = function(id) {
        var
            /**
             * Alias to "this"
             * @type {ShameemWidget}
             */
            self = this;
    
        if (!$.isArray(id)) {
            id = [id];
        }
    
        $.each(id, function(name) {
            if (!self._initialPagination[name]) {
                return;
            }
    
            self._lastPagination[name] = self._initialPagination[name];
        });
    };
    
    ShameemClient.prototype.isLoading = function() {
        return this._loading;
    };
    
    /**
     * Sends get request to Instagram API
     * @param url {string}
     * @param params {Object}
     * @param prepApiUrl {bool}
     * @returns {$.Deferred}
     */
    ShameemClient.prototype.get = function(url, params, prepApiUrl) {
        var
            /**
             * Original AJAX promise
             * @type {$.Deferred}
             */
            ajaxPromise = null,
            /**
             * Custom promise
             * @type {$.Deferred}
             */
            def = null,
            /**
             * Response data
             * @type {Object}
             */
            data = null,
            /**
             * Alias to "this"
             * @type {ShameemWidget}
             */
            self = this;
    
    
    
        prepApiUrl = prepApiUrl === undefined ? true : !!prepApiUrl;
        params = $.isPlainObject(params) ? params : {};
        params = $.extend(false, {}, self.parseQuery(url.replace(/^[^\?]+/, '')), params);
    
        if (self.isAlternativeApi()) {
            params.path = '/v1' + url.replace('/v1', '').replace(/\?[^\?]+$/, '');
            url = self.getApiUrl() + "?" + $.param(params);
    
        } else {
            if (this._clientId) {
                params.client_id = this._clientId;
            }
    
            if (this._accessToken) {
                params.access_token = this._accessToken;
            }
    
            url = (prepApiUrl ? self.getApiUrl() : "") + url.replace(/\?[^\?]+$/, '') + "?" + $.param(params);
        }
    
        def = $.Deferred();
    
        ajaxPromise = this.getCached(url) ||  $.ajax({
            url: url,
            dataType: 'jsonp'
        });
    
        data = {originalPromise: ajaxPromise};
    
        ajaxPromise.done(function(responseData, status) {
    
            data.originalResponseData = responseData;
    
            if (responseData.meta.code !== 200) {
                $.extend(true, data, {meta: responseData.meta});
                def.reject(data);
            } else {
    
                $.extend(true, data, {data: responseData.data});
    
                if (status) {
                    self.cache(url, responseData);
                }
    
                def.resolve(data);
            }
        });
    
        return def.promise();
    };
    
    ShameemClient.prototype.parseQuery = function(qs) {
        return (qs || document.location.search).replace(/(^\?)/,'').split("&").map(function(n){return n = n.split("="),this[n[0]] = n[1],this}.bind({}))[0];
    };
    
    ShameemClient.prototype.getCached = function(key) {
        var
            data,
            q = $.Deferred(),
            self = this;
    
        if (!window.localStorage) {
            return null;
        }
    
        data = localStorage.getItem(key);
        data = data ? JSON.parse(data) : null;
    
        if (!data || parseInt(data.duration, 10) !== self._cacheMediaTime || data.expired < Date.now() / 1000) {
            localStorage.removeItem(key);
            return null;
        }
    
        setTimeout(function() {
            q.resolve(data.value);
        }, 50);
    
        return q.promise();
    };
    
    ShameemClient.prototype.cache = function(key, value) {
        var
            self = this,
            expired = self._cacheMediaTime;
    
        if (!expired) {
            return;
        }
    
        try {
            localStorage.setItem(key, JSON.stringify({
                duration: expired,
                expired: Date.now() / 1000 + expired,
                value: value
            }));
    
        } catch(e) {
            localStorage.clear();
        }
    };
    
    /**
     * Gets user data
     * @param name {string}
     * @returns {$.Deferred}
     */
    ShameemClient.prototype.getUser = function(name) {
        var
            /**
             * Promise to be resolved when all the data will be loaded
             * @type {$.Deferred}
             */
            def = null,
            /**
             * Alias to "this"
             * @type {ShameemWidget}
             */
            self = this;
    
        def = $.Deferred();
    
        name = $.trim(name);
    
        if (self.isAlternativeApi()) {
            self.get('/users/' + name + '/')
                .done(function(result) {
                    self._cachedProfile = result.data;
                    def.resolve({data: [result.data]});
                })
                .fail(function(result) {
                    def.reject(result);
                });
    
        } else {
            self.get("/users/search", {q: name})
                .done(function(result) {
    
                    result.data = result.data.filter(function(item) {
                        return item.username.toLowerCase() === name.toLowerCase();
                    });
    
                    def.resolve(result);
                })
                .fail(function(result) {
                    def.reject(result);
                });
        }
    
        return def.promise();
    };
    
    /**
     * Gets profile data
     * @param id {number}
     * @returns {$.Deferred}
     */
    ShameemClient.prototype.getProfile = function(id) {
        id = window.parseInt(id, 10);
    
        var q = $.Deferred();
    
        if (this.isAlternativeApi()) {
            q.resolve({data: this._cachedProfile});
            return q.promise();
    
        } else {
            return this.get("/users/" + (this._isSandbox ? 'self' : id));
        }
    };
    
    /**
     * Gets recent user media
     * @param id {number}
     * @param hashfilter {string}
     * @param count {number}
     * @returns {$.Deferred}
     */
    ShameemClient.prototype.getRecentUserMedia = function(id, hashfilter, count) {
        var
            /**
             * Promise to be resolved when all the data will be loaded
             * @type {$.Deferred}
             */
            def = null,
            /**
             * Alias to "this"
             * @type {ShameemWidget}
             */
            self = this;
    
        def = $.Deferred();
        count = window.parseInt(count, 10);
    
        if (this._isSandbox) {
            id = 'self';
        }
    
        this.get("/users/" + id + "/media/recent", {count: hashfilter ? 33 : count}).done(function(result) {
            var
                /**
                 * Contains posts from feed
                 * @type {Array}
                 */
                posts;
    
            if (hashfilter && $.isArray(hashfilter)) {
                hashfilter = hashfilter.filter(function(item) {
                    return item.toLowerCase();
                });
    
                result.data = result.data.filter(function(item) {
                    return item.tags && item.tags.some(function(name) {
                            return !!~hashfilter.indexOf(name.toLowerCase());
                        });
                });
            }
    
            posts = result.data;
    
            self._fetchMedia(result, def, posts, count, hashfilter, null, id);
        }).fail(function(data) {
            def.reject(data);
        });
    
        return def;
    };
    
    /**
     * Gets recent tag media
     * @param tag {string}
     * @param count {number}
     * @returns {$.Deferred}
     */
    ShameemClient.prototype.getRecentTagMedia = function(tag, banlist, count) {
        var
            /**
             * Promise to be resolved when all the data will be loaded
             * @type {$.Deferred}
             */
            def = null,
            /**
             * Alias to "this"
             * @type {ShameemWidget}
             */
            self = this;
    
        def = $.Deferred();
        tag = $.trim(tag);
        count = window.parseInt(count, 10);
    
    
    
        this.get("/tags/" + tag + "/media/recent", {count: count}).done(function (result) {
            var
                /**
                 * Contains posts from feed
                 * @type {Array}
                 */
                posts;
    
            if (banlist && $.isArray(banlist)) {
                result.data = result.data.filter(function(item) {
                    return !~banlist.indexOf(item.user.username);
                });
            }
    
            posts = result.data;
    
            self._fetchMedia(result, def, posts, count, null, banlist, tag);
        }).fail(function (data) {
            def.reject(data);
        });
    
        return def;
    };
    
    /**
     * Gets recent media by multiple
     * @param tags {string}
     * @param count {number}
     * @returns {$.Deferred}
     */
    ShameemClient.prototype.getRecentTagsMedia = function(tags, banlist, count) {
        var
            def = null,
            theardsDef = [],
            nextPages = {},
            self = this;
    
        if (tags.length === 1) {
            return self.getRecentTagMedia(tags[0], banlist, count);
        }
    
        tags = tags.map(function(name) {
            return $.trim(name);
        });
    
        tags = tags.filter(function(name) {
            return !!name;
        });
    
        def = $.Deferred();
    
        $.each(tags, function(i, name) {
            theardsDef.push(self.getRecentTagMedia(name, banlist, count));
        });
    
        $.when.apply($, theardsDef).done(function() {
            var
                data = [],
                globalResult = null;
    
            $.each(arguments, function (i, result) {
                if (!globalResult) {
                    globalResult = result;
                }
    
                if (result && result.data) {
                    data = data.concat(result.data);
                }
            });
    
            data = data.filter(function (item) {
                return !data.some(function (anotherItem) {
                    return anotherItem !== item && item.id === anotherItem.id;
                });
            });
    
            data = data.sort(function (a, b) {
                if (a.created_time < b.created_time) {
                    return 1;
                } else if (a.created_time > b.created_time) {
                    return -1;
                }
    
                return 0;
            });
    
            data = data.slice(0, count);
    
            if (globalResult && globalResult.data) {
                globalResult.data = data;
            }
    
            def.resolve(globalResult);
        }).fail(function(result) {
            def.reject(result);
        });
    
        return def.promise();
    };
    
    /**
     * @todo Temporary method, should be removed in 1.4.0
     * @param hashfilter {string}
     * @param count {int}
     * @returns {*}
     */
    ShameemClient.prototype.loadNextPage = function(id, hashfilter, banlist, count) {
        var
            theardsDef = [],
            /**
             * Promise to be resolved when all the data will be loaded
             * @type {$.Deferred}
             */
            def = null,
            /**
             * Alias to "this"
             * @type {ShameemWidget}
             */
            self = this;
    
        def = $.Deferred();
    
        this._loading = true;
    
        if (!self.hasNextPage(id)) {
            def.reject();
    
        } else {
            id = $.isArray(id) ? id : [id];
    
            if (id.length === 1) {
                this.get(self._lastPagination[id[0]].next_url, {count: hashfilter || banlist ? 33 : count}, false).done(function (result) {
                    var
                        /**
                         * Contains posts from feed
                         * @type {Array}
                         */
                        posts;
    
                    if (hashfilter && $.isArray(hashfilter)) {
                        result.data = result.data.filter(function(item) {
                            return item.tags && item.tags.some(function(name) {
                                    return !!~hashfilter.indexOf(name);
                                });
                        });
                    }
    
                    if (banlist && $.isArray(banlist)) {
                        result.data = result.data.filter(function(item) {
                            return !~banlist.indexOf(item.user.username);
                        });
                    }
    
                    posts = result.data;
    
                    self._fetchMedia(result, def, posts, count, hashfilter, banlist, id);
                }).fail(function (data) {
                    def.reject(data);
                });
            } else {
                $.each(id, function(i, name) {
                    var
                        theardLoadDef = null
    
                    if (!self.hasNextPage(name)) {
                        return;
                    }
    
                    theardLoadDef = $.Deferred();
    
                    self.get(self._lastPagination[name].next_url, {count: count}, false).done(function (result) {
                        var
                            /**
                             * Contains posts from feed
                             * @type {Array}
                             */
                            posts;
    
                        posts = result.data;
    
                        self._fetchMedia(result, def, posts, count, null, banlist, name);
                    }).fail(function (data) {
                        def.reject(data);
                    });
    
                    theardsDef.push(theardLoadDef);
                });
    
                $.when.apply($, theardsDef).done(function() {
                    var
                        data = [],
                        globalResult = null;
    
                    $.each(arguments, function (i, result) {
                        if (!globalResult) {
                            globalResult = result;
                        }
    
                        if (result && result.data) {
                            data = data.concat(result.data);
                        }
                    });
    
                    data = data.filter(function (item) {
                        return !data.some(function (anotherItem) {
                            return anotherItem !== item && item.id === anotherItem.id;
                        });
                    });
    
                    data = data.sort(function (a, b) {
                        if (a.created_time < b.created_time) {
                            return 1;
                        } else if (a.created_time > b.created_time) {
                            return -1;
                        }
    
                        return 0;
                    });
    
                    data = data.slice(0, count);
                    globalResult.data = data;
    
                    def.resolve(globalResult);
                }).fail(function(result) {
                    def.reject(result);
                });
            }
        }
    
        def.always(function() {
            self._loading = false;
        });
    
        return def.promise();
    }; 
    
    /**
     * Fetches media
     * @param result
     * @param def
     * @param posts
     * @param left
     * @param hashfilter
     * @private
     */
    ShameemClient.prototype._fetchMedia = function(result, def, posts, left, hashfilter, banlist, id) {
        var
            /**
             * Alias to "this"
             * @type {ShameemWidget}
             */
            self = this;
    
        if (!result || !result.originalResponseData) {
            return;
        }
    
        left -= result.data.length + 1;
    
        if (id) {
            self._lastPagination[id] = result.originalResponseData.pagination;
        }
    
        if (id && !self._hasInitialPage(id)) {
            self._initialPagination[id] = result.originalResponseData.pagination;
        }
    
        if (left > 0 && result.originalResponseData.pagination && result.originalResponseData.pagination.next_url) {
            self.get(result.originalResponseData.pagination.next_url, {count: hashfilter || banlist ? 33 : left}, false)
                .done(function(pageResult) {
                    if (hashfilter && $.isArray(hashfilter)) {
                        pageResult.data = pageResult.data.filter(function(item) {
                            return item.tags && item.tags.some(function(name) {
                                    return !!~hashfilter.indexOf(name);
                                });
                        });
                    }
    
                    if (banlist && $.isArray(banlist)) {
                        pageResult.data = pageResult.data.filter(function(item) {
                            return !~banlist.indexOf(item.user.username);
                        });
                    }
    
                    posts = posts.concat(pageResult.data);
                    self._fetchMedia(pageResult, def, posts, left, hashfilter, banlist, id);
                })
                .fail(function(result) {
                    def.reject(result);
                });
        } else {
            result.data = posts;
            def.resolve(result);
        }
    };

    /**
     * Creates new widget instance, links it with DOM element
     * @param id {number}
     * @param root {jQuery}
     * @constructor
     */
    function ShameemWidget(id, root) {
        var
            /**
             * Alias to "this"
             * @type {ShameemWidget}
             */
            self = this;
    
        /**
         * Unique widget ID
         * @type {number}
         * @private
         */
        self._id = id;
        /**
         * DOM structure links
         * @type {Object}
         * @private
         */
        self._structure = {};
        /**
         * Root DOM element of widget (.shameem)
         * @type {jQuery}
         */
        self._structure.$root = $(root);
        /**
         * Style element, contains style for this instance
         * @type {jQuery}
         */
        self._structure.style = null;
        /**
         * Widget params (clientId, width, bgColor, etc...)
         * @type {Object}
         * @private
         */
        self._params = {};
        /**
         * Information about source (type, username, etc...)
         * @type {Object}
         * @private
         */
        self._source = {};
        /**
         * Contains data form Instagram
         * @type {Object}
         * @private
         */
        self._data = {};
        /**
         * Feed cache
         * @type {Array}
         */
        self._data.feedCache = [];
        /**
         * Current width breakpoint
         * @type {Object}
         * @private
         */
        self._curBreakpoint = null;
        /**
         * Grid, contains values to build a "feed"
         * @type {Object}
         * @private
         */
        self._grid = null;
        /**
         * Previous grid
         * @type {Object}
         * @private
         */
        self._prevGrid = null,
        /**
         * Current widget state (loading, ready or error)
         * @type {string}
         * @private
         */
        self._state = 'loading',
        /**
         * Contains some properties
         * @type {Object}
         */
        self._properties = {};
        /**
         * ShameemClient instance, provides work with Instagram API
         * @type {ShameemClient}
         * @private
         */
        /**
         * Current language data
         *
         * @type {object}
         * @private
         */
        self._curLangData = null;
        self._api = null;
    
        self._sizesHash = null;
        self._oldSizesHash = null;
    
        if (self._params.accessToken) {
            self._atUserId = self._params.accessToken.split('.')[0];
        }
    
        self._defineParams();
    
        self._atUserId = null;
        self._isSandbox = !self._params.api && self._params.accessToken && !self._params.username;
    
        self._defineSource();
        self._defineLanguage();
    
        //self._properties.analytics = self._params.disableAnalytics !== "true";
        //
        //if (self._properties.analytics) {
        //    self._analytics = new ShameemAnalytics();
        //}
    
        self._api = new ShameemClient(self._params.clientId, self._params.accessToken, parseInt(self._params.cacheMediaTime, 10), self._params.api, self._isSandbox);
    }
    ShameemWidget.prototype = function() {};
    
    ShameemWidget.REGEX_HASHTAG = /[,\s]+/i;
    
    ShameemWidget.VERSION = "2.1.3";
    
    /**
     * Default widget params
     * @type {Object}
     * @private
     */
    ShameemWidget.prototype._defaultParams = {
        api: null,
        clientId: "",
        accessToken: "",
        username: "",
        hashtag: "",
        lang: "en",
        bgColor: "#285989",
        contentBgColor: "#f8f8f8",
        fontColor: "#ffffff",
        width: "270px",
        height: "350px",
        imageSize: "medium",
        scroll: "false",
        ban: "",
        showHeading: "true",
        cacheMediaTime: 0
    };
    /**
     * Widget elements templates
     * @type {Object}
     * @private
     */
    ShameemWidget.prototype._templates = {
        css: "#shameem_{$id} {width: {$width}; height: {$height}; } #shameem_{$id}, #shameem_{$id} .shameem-feed-wrapper { background: {$contentBgColor} } #shameem_{$id} .shameem-header, #shameem_{$id} a.shameem-panel-subscribe {background-color: {$bgColor}; } #shameem_{$id} .shameem-header-name a, #shameem_{$id} .shameem-header-name, #shameem_{$id} a.shameem-panel-subscribe {color: {$fontColor}; } #shameem_{$id} .shameem-feed-post {width: {$postWidth}; height: {$postHeight}; } #shameem_{$id} .shameem-feed-post span {width: {$postImgWidth}; height: {$postImgHeight}; margin-top: {$postImgMTop}; margin-left: {$postImgMLeft} } #shameem_{$id} .shameem-feed-loader { width: {$width}; }",
        cap: "<div class=\"shameem-cap\"></div>",
        error: "<div class=\"shameem-alert\">An error occurred. See console for the details.</div>",
        content: "<div class=\"shameem-content\"></div>",
        headerUser: "<a class=\"shameem-header\" href=\"{$url}\" target=\"_blank\"> <img class=\"shameem-header-pic\" src=\"{$pic}\" alt=\"{$name}\"/> <span class=\"shameem-header-name\">{$name}</span> <span class=\"shameem-header-logo\"></span> </a>",
        headerTag: "<div class=\"shameem-header\"> <span class=\"shameem-header-name\">{$name}</span> <span class=\"shameem-header-logo\"></span> </div>",
        panel: "<div class=\"shameem-panel\"><span class=\"shameem-panel-posts shameem-panel-counter\"> <i class=\"shameem-panel-counter-value\">{$posts}</i><span class=\"shameem-panel-counter-label\">{~posts}</span> </span><span class=\"shameem-panel-subsribers shameem-panel-counter\"> <i class=\"shameem-panel-counter-value\">{$followers}</i> <span class=\"shameem-panel-counter-label\">{~followers}</span> </span> <span class=\"shameem-panel-following shameem-panel-counter\"> <i class=\"shameem-panel-counter-value\">{$following}</i> <span class=\"shameem-panel-counter-label\">{~following}</span> </span> <a class=\"shameem-panel-subscribe\" href=\"{$url}\" target=\"_blank\">{~follow}</a> </div>",
        scrollbar: "<div class=\"shameem-scrollbar\"></div>",
        scrollbarSlider: "<div class=\"shameem-scrollbar-slider\"></div>",
        feedWrapper: "<div class=\"shameem-feed-wrapper\">",
        feedInner: "<div class=\"shameem-feed-inner\"></div>",
        feedContainer: "<div class=\"shameem-feed-container\"></div>",
        feedEmpty: "<div class=\"shameem-feed-empty\"><span class=\"shameem-feed-empty-text\">There are no images yet.</span></div>",
        feed: "<div class=\"shameem-feed\"></div>",
        feedLoader: "<div class=\"shameem-feed-loader\"></div>",
        post: "<a href=\"{$url}\" target=\"_blank\" class=\"shameem-feed-post\"> <span><img src=\"{$pic}\" alt=\"\"></span> </a>",
        consoleError: "[#shameem_{$id}: {$message}]"
    };
    /**
     * Responsive breakpoints
     * @type {Object}
     * @private
     */
    ShameemWidget.prototype._breakpoints = {
        small: [
            {minWidth: 1970, rowLength: 21},
            {minWidth: 1870, rowLength: 21},
            {minWidth: 1870, rowLength: 20},
            {minWidth: 1770, rowLength: 19},
            {minWidth: 1670, rowLength: 18},
            {minWidth: 1570, rowLength: 17},
            {minWidth: 1470, rowLength: 16},
            {minWidth: 1370, rowLength: 15},
            {minWidth: 1270, rowLength: 14},
            {minWidth: 1170, rowLength: 13},
            {minWidth: 1070, rowLength: 12},
            {minWidth: 970, rowLength: 11},
            {minWidth: 870, rowLength: 10},
            {minWidth: 770, rowLength: 9},
            {minWidth: 670, rowLength: 8},
            {minWidth: 570, rowLength: 7},
            {minWidth: 470, rowLength: 6},
            {minWidth: 370, rowLength: 5},
            {minWidth: 90, rowLength: 4}
        ],
        medium: [
            {minWidth: 1980, rowLength: 16},
            {minWidth: 1850, rowLength: 15},
            {minWidth: 1720, rowLength: 14},
            {minWidth: 1590, rowLength: 13},
            {minWidth: 1460, rowLength: 12},
            {minWidth: 1330, rowLength: 11},
            {minWidth: 1200, rowLength: 10},
            {minWidth: 1070, rowLength: 9},
            {minWidth: 940, rowLength: 8},
            {minWidth: 810, rowLength: 7},
            {minWidth: 680, rowLength: 6},
            {minWidth: 550, rowLength: 5},
            {minWidth: 520, rowLength: 5},
            {minWidth: 390, rowLength: 4},
            {minWidth: 90, rowLength: 3}
        ],
        large: [
            {minWidth: 1920, rowLength: 8},
            {minWidth: 1660, rowLength: 8},
            {minWidth: 1400, rowLength: 7},
            {minWidth: 1140, rowLength: 6},
            {minWidth: 980, rowLength: 5},
            {minWidth: 720, rowLength: 4},
            {minWidth: 460, rowLength: 3},
            {minWidth: 90, rowLength: 2}
        ],
        xlarge: [
            {minWidth: 2200, rowLength: 6},
            {minWidth: 1800, rowLength: 5},
            {minWidth: 1400, rowLength: 4},
            {minWidth: 1200, rowLength: 3},
            {minWidth: 600, rowLength: 2},
            {minWidth: 90, rowLength: 1}
        ]
    };
    
    ShameemWidget.prototype._i18n = {
        ru: {
          posts: "публикации",
          followers: "подписчики",
          following: "подписки",
          follow: "Подписаться"
        },
        en: {
            posts: "posts",
            followers: "followers",
            following: "following",
            follow: "Follow"
        },
        de: {
            posts: "beiträge",
            followers: "abonnenten",
            following: "abonnement",
            follow: "Folgen"
        },
        nl: {
            posts: "berichten",
            followers: "volgers",
            following: "volgend",
            follow: "Volgen"
        },
        es: {
            posts: "publicaciones",
            followers: "seguidores",
            following: "seguidos",
            follow: "Seguir"
        },
        fr: {
            posts: "publications",
            followers: "abonnés",
            following: "abonnement",
            follow: "S'abonner"
        },
        pl: {
            posts: "posty",
            followers: "obserwujący",
            following: "obserwujacych",
            follow: "Obserwuj"
        },
        sv: {
            posts: "inlägg",
            followers: "följare",
            following: "följer",
            follow: "Följ"
        },
        "pt-BR": {
            posts: "publicações",
            followers: "seguidores",
            following: "seguidos",
            follow: "Seguir"
        },
        tr: {
            posts: "gönderiler",
            followers: "takipçiler",
            following: "takip edilen",
            follow: "Takip et"
        },
        "zh-HK": {
            posts: "帖子",
            followers: "天注者",
            following: "天注",
            follow: "天注"
        },
        ko: {
            posts: "게시물",
            followers: "팔로워",
            following: "팔로잉",
            follow: "팔로우"
        },
        ja: {
            posts: "投稿",
            followers: "フォロワー",
            following: "フォロワー中",
            follow: "フォローする"
        },
        id: {
            posts: "kiriman",
            followers: "pengikut",
            following: "mengikuti",
            follow: "Ikuti"
    
        },
        he: {
            rtl: true,
            posts: 'כתבות',
            followers: 'עוקבים',
            following: 'עוקב',
            follow: 'עקוב'
        },
        it: {
            posts: 'post',
            followers: 'seguaci',
            following: 'segui già',
            follow: 'segui'
        }
    };
    
    /**
     * Equals to "new ShameemWidget(id, $root)"
     * @param id {number}
     * @param $root {jQuery}
     * @returns {ShameemWidget}
     */
    ShameemWidget.init = function(id, $root) {
        return new ShameemWidget(id, $root);
    };
    /**
     * Returns formatted number like in Instagram
     * @param n {number}
     * @returns {number}
     */
    ShameemWidget.formatNumber = function(n) {
        var
            /**
             * The integer part of n
             * @type {null}
             */
            unit = null,
            /**
             * Resulting value
             * @type {null}
             */
            factor = null,
            /**
             * Formatted number
             * @type {null}
             */
            formatted = null;
    
        if (n < 1000) {
            return n;
    
        } else if (n > 1000000) {
            factor = n / 1000000;
            unit = "m";
        } else if (n > 1000) {
            factor = n / 1000;
            unit = "k";
        }
    
        if (window.parseInt(factor, 10) !== factor) {
            factor = factor.toFixed(1);
        }
    
        formatted = factor + unit;
    
        return formatted;
    };
    //
    //ShameemWidget.prototype._sendAnalytics = function() {
    //  var
    //      /**
    //       * Alias to "this"
    //       * @type {ShameemWidget}
    //       */
    //      self = this;
    //
    //    if (self._analytics) {
    //        self._analytics.send("init", {
    //            params: self._params,
    //            version: ShameemWidget.VERSION
    //        });
    //    }
    //};
    
    ShameemWidget.prototype._defineLanguage = function() {
        var
            /**
             * Alias to "this"
             * @type {ShameemWidget}
             */
            self = this;
    
        self._curLangData = self._i18n[self._params.lang] || self._i18n["en"];
    };
    
    /**
     * Defines params from attributes
     * @private
     */
    ShameemWidget.prototype._defineParams = function() {
        var
            /**
             * Alias to "this"
             * @type {ShameemWidget}
             */
            self = this;
    
        $.each(self._defaultParams, function(name, defValue) {
            var
                /**
                 * @type {string}
                 */
                attrName;
    
            attrName = "data-msr-" + name.replace(/[A-Z]/g, function(letter) {
                return "-" + letter.toLowerCase();
            });
            self._params[name] = $.trim(self._structure.$root.attr(attrName)) || defValue;
        });
    
        self._properties.scroll = self._params.scroll === "true";
    };
    /**
     * Defines data source
     * @private
     */
    ShameemWidget.prototype._defineSource = function() {
        var
            /**
             * Source type in char
             * @type {string}
             */
            type = null,
            /**
             * Name of source
             * @type {string}
             */
            name = null,
            /**
             * Alias to "this"
             * @type {ShameemWidget}
             */
            self = this;
    
        if (self._params.source && !self._params.username) {
            type = self._params.source.substr(0, 1);
            if (~(["@", "#"]).indexOf(type)) {
                name = self._params.source.substr(1);
    
    
                if (type === "@") {
                    self._params.username = name;
                } else {
                    self._params.hashtag = [name];
                }
            } else {
                self._params.username = self._params.source;
            }
        }
    
        if (self._params.username || self._isSandbox) {
            self._source.type = "user";
            self._source.name = self._params.username;
    
            if (self._params.hashtag) {
                self._source.hashfilter = self._params.hashtag.split(ShameemWidget.REGEX_HASHTAG);
            }
    
        } else if (self._params.hashtag) {
            self._source.type = "tag";
            self._source.tags = self._params.hashtag.split(ShameemWidget.REGEX_HASHTAG);
        }
    
        if (self._params.ban) {
            self._source.banlist = self._params.ban.split(ShameemWidget.REGEX_HASHTAG);
        }
    };
    /**
     * Writes styles for this widget instance
     * @private
     */
    ShameemWidget.prototype._updateStyles = function() {
        var
            imgSize = null,
            /**
             * Alias to "this"
             * @type {ShameemWidget}
             */
            self = this;
    
        if (!self._structure.$style) {
            self._structure.$style = $('<style>', {type: "text/css"});
            self._structure.$root.after(self._structure.$style);
        }
    
        if (self._grid) {
            if (self._grid.cellWidth > self._grid.cellHeight) {
                imgSize = self._grid.cellHeight * 0.9;
            } else {
                imgSize = self._grid.cellWidth * 0.9;
            }
    
            imgSize = window.parseInt(imgSize, 10);
        }
    
        var width = self._params.width;
    
        if (width && parseInt(width, 10) == width) {
            width = width + 'px';
        }
    
        var height = self._params.height;
    
        if (height && parseInt(height, 10) == height) {
            height = height + 'px';
        }
    
        self._structure.$style.html(
            self._compileTemplate("css", {
                id: self._id,
                width: width,
                height: height,
                bgColor: self._params.bgColor,
                contentBgColor: self._params.contentBgColor,
                fontColor: self._params.fontColor,
                postWidth: self._grid ? self._grid.cellWidth + "px" : "initial",
                postHeight: self._grid ? self._grid.cellHeight + "px" : "initial",
                postImgWidth: self._grid ? imgSize + "px" : "initial",
                postImgHeight: self._grid ? imgSize + "px" : "initial",
                postImgMTop: self._grid ? window.parseInt(-imgSize / 2, 10) + "px" : 0,
                postImgMLeft: self._grid ? window.parseInt(-imgSize / 2, 10) + "px" : 0
            })
        );
    };
    /**
     * Compiles template form self._templates by id
     * @param id {string}
     * @param data {Object}
     * @private
     */
    ShameemWidget.prototype._compileTemplate = function(id, data) {
        var
            /**
             * Original template
             * @type {string}
             */
            template = null,
            /**
             * Compiled template
             * @type {string}
             */
            compiled = null,
            /**
             * Alias to "this"
             * @type {ShameemWidget}
             */
            self = this;
    
        template = self._templates[id];
    
        if(!template || window.Object.prototype.toString.call(template) !== "[object String]") {
            return null;
        }
    
        if ($.isPlainObject(data)) {
    
            compiled = template.replace(/\{\$([\w\W]+?)}/g, function(entry, name) {
                return data[name];
            });
        } else {
            compiled = template;
        }
    
        if ($.isPlainObject(self._curLangData)) {
    
            compiled = compiled.replace(/\{~([\w\W]+?)}/g, function(entry, name) {
                return self._curLangData[name];
            });
        }
    
        return compiled;
    };
    /**
     * Sets widget state (loading, ready or error)
     * @param state {string}
     * @private
     */
    ShameemWidget.prototype._setState = function(state) {
        if (!~(["loading", "ready", "error"]).indexOf(state)) {
            return;
        }
    
        this._state = state;
        this._structure.$root
            .removeClass("shameem-ready shameem-loading shameem-error")
            .addClass("shameem-" + state);
    };
    /**
     * Prepares widget DOM structure and sets initial breakpoint and grid
     * @private
     */
    ShameemWidget.prototype._prepare = function() {
        var
            /**
             * Alias to "this"
             * @type {ShameemWidget}
             */
            self = this;
    
        if (self._params.showHeading === "false") {
            self._structure.$root.addClass("shameem-hide-heading");
        }
    
        self._structure.$root
            .addClass("shameem")
            .addClass("shameem-" + self._source.type)
            .addClass("shameem-image-size-" + self._params.imageSize)
            .attr("id", "shameem_" + self._id);
    
        if (self._properties.scroll) {
            self._structure.$root.addClass("shameem-scroll");
        }
    
        self._structure.$root.empty();
    
        self._structure.$cap = $(self._templates.cap);
        self._structure.$root.append(self._structure.$cap);
    
        self._structure.$error = $(self._templates.error);
        self._structure.$root.append(self._structure.$error);
    
        self._structure.$content = $(self._templates.content);
        self._structure.$root.append(self._structure.$content);
    
        self._structure.$feedWrapper = $(self._templates.feedWrapper);
        self._structure.$content.append(self._structure.$feedWrapper);
    
        self._setState(self._state);
        self._defineBreakpoint();
        self._defineGrid();
        self._updateStyles();
    
        self._adjust();
    };
    /**
     * Defines actual breakpoint by "feed" element
     * @private
     */
    ShameemWidget.prototype._defineBreakpoint = function() {
    
        var
            dusk,
            /**
             * Actual breakpoint
             * @type {Object}
             */
            breakpoint = null,
            /**
             * Current set of breakpoints, depends on self._params.imageSize
             * @type {null}
             */
            breakpointsSet = null,
            /**
             * Alias to "this"
             * @type {ShameemWidget}
             */
            self = this;
    
    
        dusk = self._undusk();
    
    
        if (self._breakpoints.hasOwnProperty(self._params.imageSize)){
            breakpointsSet = self._breakpoints[self._params.imageSize];
        }
    
        if (breakpointsSet && breakpointsSet.length) {
            $.each(breakpointsSet, function(i, item) {
                if (!!breakpoint) {
                    return false;
                }
    
                if (self._structure.$feedWrapper.innerWidth() > item.minWidth) {
                    breakpoint = item;
                }
            });
    
            if(!breakpoint) {
                breakpoint = breakpointsSet[0];
            }
        }
    
        self._curBreakpoint = breakpoint;
    
        dusk();
    };
    /**
     * Defines actual grid by self._breakpoint
     * @private
     */
    ShameemWidget.prototype._defineGrid = function() {
        var
            dusk,
            /**
             * See self._grid
             * @type {Object}
             */
            grid = {},
            /**
             * Alias to "this"
             * @type {ShameemWidget}
             */
            self = this;
    
        if (!self._curBreakpoint) {
            return;
        }
    
        dusk = self._undusk();
    
        self._prevGrid = self._grid;
    
        grid.width = self._structure.$feedWrapper.innerWidth();
        grid.height = self._structure.$feedWrapper.innerHeight();
        grid.columnsCount = self._curBreakpoint.rowLength;
        grid.cellWidth = window.Math.floor(grid.width / grid.columnsCount);
        grid.rowsCount = window.Math.round(grid.height / grid.cellWidth);
    
        if (grid.rowsCount === 0) {
            grid.rowsCount = 1;
        }
    
        grid.cellHeight = Math.floor(grid.height / grid.rowsCount);
    
        grid.rowsCountDefault = grid.rowsCount;
        if (self._properties.scroll) {
            grid.rowsCount += 2;
        }
    
        grid.cellsCount = grid.columnsCount * grid.rowsCount;
        grid.cellsCountDefault = grid.columnsCount * grid.rowsCountDefault;
    
        self._grid = grid;
    
        dusk();
    };
    
    ShameemWidget.prototype._undusk = function() {
        var
            $hiddenElement,
            self = this;
    
        $hiddenElements = self._structure.$root.parents().filter(function() {
            return $(this).css('display') === 'none';
        });
    
        $hiddenElements.css({display: 'block', visibility: 'hidden'});
    
        return function() {
            $hiddenElements.css({display: 'none', visibility: ''});
        };
    };
    
    /**
     * Loads posts
     * @returns {jQuery.Deferred}
     * @private
     */
    ShameemWidget.prototype._loadFeed = function() {
        var
            /**
             * Promise to be resolved when all the data will be loaded
             * @type {jQuery.Deferred}
             */
            def = null,
            /**
             * Alias to "this"
             * @type {ShameemWidget}
             */
            self = this;
    
        def = $.Deferred();
    
        if (!self._grid) {
            def.reject();
            return def.promise();
        }
    
        var sourceName;
    
        if (!self._properties.scroll && self._data.feedCache && self._data.feedCache.length >= self._grid.cellsCount) {
            self._data.feed = self._data.feedCache.slice(0, self._grid.cellsCount);
            def.resolve();
        } else {
            self._setState("loading");
            if ((self._isSandbox || self._source.type === "user") && self._data.profile && self._data.profile.id) {
                if (self._api.isAlternativeApi()) {
                    sourceName = self._data.profile.username;
    
                } else {
                    sourceName = self._data.profile.id;
                }
    
                self._api.getRecentUserMedia(sourceName, self._source.hashfilter, self._grid.cellsCount)
                    .done(function (result) {
                        if (!result || !result.data) {
                            return;
                        }
    
                        self._data.feed = result.data;
                        if (result.data.length > self._data.feedCache.length) {
                            self._data.feedCache = result.data;
                        }
    
                        self._setState("ready");
                        def.resolve();
                    })
                    .fail(function (result) {
                        if (result && result.meta && result.meta.error_message) {
                            self._log(result.meta.error_type + " | " + result.meta.error_message);
                        }
                        def.reject();
                    });
    
            } else if (self._source.type === "tag") {
    
                self._api.getRecentTagsMedia(self._source.tags, self._source.banlist, self._grid.cellsCount)
                    .done(function (result) {
                        if (!result || !result.data) {
                            return;
                        }
    
                        self._data.feed = result.data;
                        if (result.data.length > self._data.feedCache.length) {
                            self._data.feedCache = result.data;
                        }
    
                        self._setState("ready");
                        def.resolve();
                    })
                    .fail(function (result) {
                        if (result.meta._additional) {
                            result.meta.error_message += ' | ' + result.meta._additional;
                        }
    
                        if (result && result.meta && result.meta.error_message) {
                            self._log(result.meta.error_type + " | " + result.meta.error_message);
                        }
                        def.reject();
                    });
    
            } else {
                def.reject();
            }
        }
    
        return def.promise();
    };
    
    /**
     * Sets event listeners to widget
     * @private
     */
    ShameemWidget.prototype._setListeners = function() {
        var
            /**
             * Alias to "this"
             * @type {ShameemWidget}
             */
            self = this;
    
        $(window).on("resize.shameem-" + self._id, function() {
            self._adjust();
        });
    
        $(window).on("load.shameem-" + self._id, function() {
            self._adjust();
        });
    
        /**
         * @todo Bad way, should be removed in 1.4.0
         */
        self._structure.$feedContainer.on("scroll", function() {
            self._scroll();
        });
    };
    
    /**
     * @todo Temporary method, should be removed in 1.4.0
     * @private
     */
    ShameemWidget.prototype._scroll = function() {
        var
            max = null,
            cur = null,
            triggerPoint = null,
            sourceId = null,
            /**
             * Alias to "this"
             * @type {ShameemWidget}
             */
            self = this;
    
        if (!self._properties.scroll) {
            return;
        }
    
        sourceId = self._source.type === "tag" ? self._source.tags : (self._api.isAlternativeApi() ? self._data.profile.username : self._data.profile.id);
        max = self._structure.$feedInner.innerHeight() - self._structure.$feedContainer.innerHeight();
        cur = self._structure.$feedContainer.scrollTop();
    
        self._showScrollbar(cur, max);
    
        if (self._params.imageSize.toLowerCase && self._params.imageSize.toLowerCase() === "xlarge") {
            triggerPoint = 0;
        } else {
            triggerPoint = self._grid.cellHeight;
        }
    
        if (max - cur <= triggerPoint && self._api.hasNextPage(sourceId) && !self._api.isLoading()) {
    
            self._api.loadNextPage(sourceId, self._source.hashfilter, self._source.banlist, self._grid.cellsCount).done(function(result) {
                self._appendFeed(result.data);
                self._showScrollbar(cur, max);
    
            }).fail(function(result) {
                if (result && result.meta && result.meta.error_message) {
                    self._log(result.meta.error_type + " | " + result.meta.error_message);
                }
            });
        }
    };
    
    ShameemWidget.prototype._adjustMedia = function($item) {
        $item.removeClass('shameem-feed-post-landscape shameem-feed-post-portrait shameem-feed-post-square');
    
        var $img = $item.find('img');
        var ratio = $img.width() / $img.height();
    
        if (ratio > 1) {
            $item.addClass('shameem-feed-post-landscape');
    
        } else if (ratio < 1) {
            $item.addClass('shameem-feed-post-portrait');
    
        } else {
            $item.addClass('shameem-feed-post-square');
        }
    };
    
    /**
     * Adjusts content to current size of widget
     * @private
     */
    ShameemWidget.prototype._adjust = function($item) {
        var
            rootWidth = null,
            /**
             * Alias to "this"
             * @type {ShameemWidget}
             */
            self = this;
    
        self._sizesHash = self._structure.$root.width() + "." + self._structure.$root.height();
    
        self._defineBreakpoint();
        self._defineGrid();
        self._updateStyles();
    
        rootWidth = self._structure.$root.innerWidth();
    
        if ($item) {
            self._adjustMedia($item);
    
        } else {
            self._structure.$root.removeClass("shameem-small shameem-tiny shameem-medium shameem-large");
    
            if (rootWidth > 399) {
                self._structure.$root.addClass("shameem-large");
            } else if (rootWidth > 299) {
                self._structure.$root.addClass("shameem-medium");
            } else if (rootWidth <= 209) {
                self._structure.$root.addClass("shameem-tiny");
            } else if (rootWidth <= 264) {
                self._structure.$root.addClass("shameem-small");
            }
    
            if (self._structure.$feed) {
                self._structure.$feed.find('.shameem-feed-post')
                    .removeClass('shameem-feed-post-landscape shameem-feed-post-portrait shameem-feed-post-square')
                    .each(function(i, item) {
                        var $item = $(item);
                        var $img = $item.find('img');
                        var ratio = $img.width() / $img.height();
    
                        if (ratio > 1) {
                            $item.addClass('shameem-feed-post-landscape');
    
                        } else if (ratio < 1) {
                            $item.addClass('shameem-feed-post-portrait');
    
                        } else {
                            $item.addClass('shameem-feed-post-square');
                        }
                    });
            }
    
            if (!self._prevGrid || self._prevGrid.cellsCount !== self._grid.cellsCount) {
                self._loadFeed()
                    .done(function() {
                        self.updateFeed();
                    });
            } else if(self._sizesHash !== self._oldSizesHash) {
                self.updateFeed();
            }
    
            self._oldSizesHash = self._sizesHash;
        }
    };
    
    /**
     * @todo Temporary method, should be removed in 1.4.0
     * @param cur {int}
     * @param max {int}
     * @private
     */
    ShameemWidget.prototype._showScrollbar = function(cur, max) {
        var
            sliderHeight = null,
            sliderOffset = null,
            /**
             * Alias to "this"
             * @type {ShameemWidget}
             */
            self = this;
    
        if (!self._structure.$feedContainer || self._data.feed.length < self._grid.cellsCountDefault ) {
            return;
        }
    
        if (!self._structure.$scrollbar) {
            self._structure.$scrollbar = $(self._compileTemplate("scrollbar"));
            self._structure.$scrollbarSlider = $(self._compileTemplate("scrollbarSlider"));
    
            self._structure.$scrollbar.append(self._structure.$scrollbarSlider);
            self._structure.$feedWrapper.append(self._structure.$scrollbar);
        }
    
        sliderHeight = self._structure.$feedWrapper.innerHeight() / self._structure.$feedInner.innerHeight() * self._structure.$feedWrapper.innerHeight();
        sliderOffset = cur && max ? cur / max * (self._structure.$feedWrapper.innerHeight() - sliderHeight) : 0;
    
        self._structure.$scrollbarSlider.css({
            height: sliderHeight,
            transform: "translate(0, " + sliderOffset + "px)"
        });
    
        self._structure.$scrollbar.addClass("visible");
    
        if (!self._scrollbarTimer) {
            window.clearTimeout(self._scrollbarTimer);
        }
    
        self._scrollbarTimer = window.setTimeout(function() {
            self._structure.$scrollbar.removeClass("visible");
        }, 700);
    };
    
    /**
     * Wrap message
     * @param message {string}
     * @param setsError {bool}
     * @private
     */
    ShameemWidget.prototype._log = function(message, setsError) {
        var
            /**
             * Formatted (self._templates.error) message
             * @type {string}
             */
            formattedMessage = null;
    
        if (!window.console || window.Object.prototype.toString.call(window.console.log) !== "[object Function]") {
            return;
        }
    
        setsError = setsError === undefined ? true : !!setsError;
    
        if (setsError) {
            this._setState("error");
        }
    
        formattedMessage = this._compileTemplate("consoleError", {
            id: this._id,
            message: message
        });
    
        window.console.log(formattedMessage);
    };
    
    
    /**
     * Starts data loading, sets initial content
     */
    ShameemWidget.prototype.run = function () {
        var
            /**
             * Alias to "this"
             * @type {ShameemWidget}
             */
            self = this;
    
        self._updateStyles();
        self._prepare();
    
    
        //self._rtl = self._i18n[self._params.lang].rtl;
    
        if (self._rtl) {
            self._structure.$root.addClass('shameem-rtl');
        }
    
        if (self._isSandbox) {
            self._api.getProfile()
                .done(function(profileResult) {
                    self._data.profile = profileResult.data;
    
                    self._loadFeed().done(function () {
                        if (self.updateContent()) {
                            self._setState("ready");
                            self._setListeners();
    
                            self._adjust();
    
                            //self._sendAnalytics();
                        }
                    });
                })
                .fail(function(result) {
                    if (result && result.meta && result.meta.error_message) {
                        self._log(result.meta.error_type + " | " + result.meta.error_message);
                    }
                });
    
        } else {
            if (self._source.type === "user") {
                self._api.getUser(self._source.name)
                    .done(function(userResult) {
                        if (!userResult.data.length) {
                            self._log("User @" + self._source.name + " is not found.");
                            return;
                        }
    
                        self._api.getProfile(userResult.data[0].id)
                            .done(function(profileResult) {
                                profileResult.data.id = userResult.data[0].id;
                                self._data.profile = profileResult.data;
    
                                self._loadFeed().done(function () {
                                    if (self.updateContent()) {
                                        self._setState("ready");
                                        self._setListeners();
    
                                        self._adjust();
    
                                        //self._sendAnalytics();
                                    }
                                });
                            })
                            .fail(function(result) {
                                if (result && result.meta && result.meta.error_message) {
                                    self._log(result.meta.error_type + " | " + result.meta.error_message);
                                }
                            });
                    })
                    .fail(function(result) {
                        if (result && result.meta && result.meta.error_message) {
                            if (result.meta._additional) {
                                result.meta.error_message += ' | ' + result.meta._additional;
                            }
    
                            self._log(result.meta.error_type + " | " + result.meta.error_message);
                        }
                    });
    
            } else if (self._source.type === "tag") {
                self._loadFeed().done(function () {
                    if (self.updateContent()) {
                        self._setState("ready");
                        self._setListeners();
    
                        self._adjust();
    
                        //self._sendAnalytics();
                    }
                });
            }
        }
    };
    
    /**
     * Update widget content
     * @returns {bool}
     */
    ShameemWidget.prototype.updateContent = function() {
        var
            /**
             * Alias to "this"
             * @type {ShameemWidget}
             */
            self = this;
    
        if (!self._data.feed || !self._structure.$content) {
            return false;
        }
    
        self._structure.$content.html("");
    
        self._structure.$feedContainer = $(self._templates.feedContainer);
        self._structure.$feedInner = $(self._templates.feedInner);
        self._structure.$feed = $(self._templates.feed);
    
        self._structure.$feedInner.append(self._structure.$feed);
        self._structure.$feedContainer.append(self._structure.$feedInner);
        self._structure.$feedWrapper.append(self._structure.$feedContainer);
        self._structure.$content.append(self._structure.$feedWrapper);
    
        if (self._properties.scroll) {
            self._structure.$feedLoader = $(self._templates.feedLoader);
            self._structure.$feedInner.append(self._structure.$feedLoader);
        }
    
        if (self._params.showHeading !== "false") {
            if ((self._isSandbox || self._source.type === "user") && self._data.profile) {
                self._structure.$header = $(self._compileTemplate("headerUser", {
                    name: self._data.profile.username,
                    url: "https://instagram.com/" + self._data.profile.username + "/",
                    pic: self._data.profile.profile_picture
                }));
                self._structure.$content.prepend(self._structure.$header);
    
                self._structure.$panel = $(self._compileTemplate("panel", {
                    posts: ShameemWidget.formatNumber(self._data.profile.counts.media),
                    followers: ShameemWidget.formatNumber(self._data.profile.counts.followed_by),
                    following: ShameemWidget.formatNumber(self._data.profile.counts.follows),
                    url: "https://instagram.com/" + self._data.profile.username + "/"
                }));
                self._structure.$header.after(self._structure.$panel);
    
            } else if (self._source.type === "tag") {
                self._structure.$header = $(self._compileTemplate("headerTag", {
                    name: self._source.tags.map(function(name) {
                        return "<a target=\"_blank\" href=\"https://www.instagram.com/explore/tags/" + name + "/\">#" + name + "</a>";
                    }).join(", ")
                }));
    
                self._structure.$content.prepend(self._structure.$header);
    
            }
        }
    
        return self.updateFeed();
    };
    
    /**
     * Update widget feed
     * @type append {bool}
     * @returns {boolean}
     */
    ShameemWidget.prototype.updateFeed = function(append) {
        var
            sourceId = null,
            /**
             * Alias to "this"
             * @type {ShameemWidget}
             */
            self = this;
    
        if (!self._data.feed || !self._structure.$feed) {
            return false;
        }
    
        sourceId = self._source.type === "tag" ? self._source.tags : (self._api.isAlternativeApi() ? self._data.profile.username : self._data.profile.id);
    
        self._api.resetPagination(sourceId);
    
        if (self._api.hasNextPage(sourceId)) {
            self._structure.$root.addClass("shameem-has-pages");
        } else {
            self._structure.$root.removeClass("shameem-has-pages");
        }
    
        self._structure.$feed.html("");
    
        $.each(self._data.feed, function(i, item) {
            var
                $post = null,
                /**
                 * URL to picture
                 * @type {string}
                 */
                src = null;
    
            if (self._grid.cellWidth > 306) {
                src = item.images.standard_resolution.url;
    
            } else if (self._grid.cellWidth > 150) {
                src = item.images.low_resolution.url;
    
            } else {
                src = item.images.thumbnail.url;
            }
    
            $post = $(self._compileTemplate("post", {
                url: item.link,
                pic: src
            }));
    
            if (item.type === "video") {
                $post.addClass("shameem-feed-post-video");
            }
    
            self._structure.$feed.append($post);
        });
    
        if (self._data.feed.length === 0) {
            self._structure.$feedContainer.append(self._templates.feedEmpty);
        }
    
        if (self._properties.scroll) {
            self._showScrollbar();
        }
    
        $("img", self._structure.$feed)
            .unbind("load.shameem-" + self._id)
            .one("load.shameem-" + self._id, function() {
                var $this = $(this);
                var $post = $this.closest(".shameem-feed-post");
                $this.closest(".shameem-feed-post").addClass('shameem-feed-post-loaded');
                self._adjust($post);
            })
            .each(function() {
                if (this.complete) {
                    $(this).load();
                }
            });
    
        if (!append) {
            self._structure.$content.trigger('shameemReady');
        }
    
        return true;
    };
    
    /**
     * @todo Temporary method, should be removed in 1.4.0
     * @param data
     * @returns {boolean}
     * @private
     */
    ShameemWidget.prototype._appendFeed = function(data) {
        var
            sourceId = null,
            /**
             * Alias to "this"
             * @type {ShameemWidget}
             */
            self = this;
    
        if (!data || !self._structure.$feed) {
            return false;
        }
    
        sourceId = self._source.type === "tag" ? self._source.tags : (self._api.isAlternativeApi() ? self._data.profile.username : self._data.profile.id);
    
        if (self._api.hasNextPage(sourceId)) {
            self._structure.$root.addClass("shameem-has-pages");
        } else {
            self._structure.$root.removeClass("shameem-has-pages");
        }
    
        $.each(data, function(i, item) {
            var
                $post = null,
                /**
                 * URL to picture
                 * @type {string}
                 */
                src = null;
    
            if (self._grid.cellWidth > 306) {
                src = item.images.standard_resolution.url;
    
            } else if (self._grid.cellWidth > 150) {
                src = item.images.low_resolution.url;
    
            } else {
                src = item.images.thumbnail.url;
            }
    
            $post = $(self._compileTemplate("post", {
                url: item.link,
                pic: src
            }));
    
            if (item.type === "video") {
                $post.addClass("shameem-feed-post-video");
            }
    
            self._structure.$feed.append($post);
        });
    
        $("img", self._structure.$feed)
            .unbind("load.shameem-" + self._id)
            .one("load.shameem-" + self._id, function() {
                var
                    $this = $(this);
    
                window.setTimeout(function() {
                    $this.closest(".shameem-feed-post").addClass('shameem-feed-post-loaded');
                    self._adjust();
                }, 100);
            })
            .each(function() {
                if (this.complete) {
                    $(this).load();
                }
            });
    
        self._structure.$feedContainer.animate({
            scrollTop: "+=" + self._grid.cellHeight
        });
    
        return true;
    }

    function main() {
        if (!($ && $.fn && $.fn.jquery)) {
            return false;
        }

        $(init);
    }

    /**
     * Initializes every wigets on the page
     */
    function init() {
        $("[data-msr]").each(function(i, el) {
            ShameemWidget.init(widgetsCount++, el).run();
        });
    }

    $.fn.shameem = function(options) {
        var attrs = {};

        if ($.isPlainObject(options)) {
            $.each(options, function(name, val) {
                var attrName = 'data-msr-' + name.replace(/([A-Z])/g, function(l) {
                        return '-' + l.toLowerCase();
                    });

                if (val === false) {
                    val = 'false';

                } else if (val === true) {
                    val = 'true';
                }

                attrs[attrName] = val;
            });
        }

        this.each(function(i, el) {
            $(el).attr(attrs);
            ShameemWidget.init(widgetsCount++, el).run();
        });

        return this;
    };

    main();
})(jQuery, window, void(0));
