# Vuetify Releases - 3.6.5 to 4.1.5

Collected: 2026-07-23T13:12:40.630Z
Version range: 3.6.5 -> 4.1.5
Source: https://github.com/vuetifyjs/vuetify/releases
Releases: 102
Parsed items: 1209

## v3.12.11 - 2026-07-22T17:18:36Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.12.11

### :wrench: Bug Fixes

- **VCalendar:** prevent next day hours when customizing intervals ([938c824](https://github.com/vuetifyjs/vuetify/commit/938c8249a10e1b30b9a00b0e01d955a0b997a8c4))
- **VCalendar:** add missing interval props ([#23000](https://github.com/vuetifyjs/vuetify/issues/23000)) ([f29273c](https://github.com/vuetifyjs/vuetify/commit/f29273c126bdeb303dc692729d80312637608c9d)), closes [#22718](https://github.com/vuetifyjs/vuetify/issues/22718)
- **VImg:** handle image ref deferred by Nuxt page transition ([1d1ad89](https://github.com/vuetifyjs/vuetify/commit/1d1ad891699e3817976cd0e5d65260c4c1c54e9a)), closes [#23011](https://github.com/vuetifyjs/vuetify/issues/23011)
- **VOverlay:** unnecessary target attribute for CSS transitions ([#22190](https://github.com/vuetifyjs/vuetify/issues/22190)) ([eb101e8](https://github.com/vuetifyjs/vuetify/commit/eb101e83b4d0b6564624879e56db53f89a701230))
- **VSelect:** release focus on first click outside ([ae77b94](https://github.com/vuetifyjs/vuetify/commit/ae77b945de1ca6a36401e7db3cfdff6a92591140)), closes [#22828](https://github.com/vuetifyjs/vuetify/issues/22828)
- **VSelect:** only focus first item when menu is opened with keyboard ([23d4649](https://github.com/vuetifyjs/vuetify/commit/23d46493af51fada9b3030cdb51a382e3109da1e)), closes [#22283](https://github.com/vuetifyjs/vuetify/issues/22283)
- **VVirtualScroll:** trim leading items when appending to bottom ([458317f](https://github.com/vuetifyjs/vuetify/commit/458317fcec71c3325289150eb68de41bde974f27)), closes [#20959](https://github.com/vuetifyjs/vuetify/issues/20959)
- **VVirtualScroll:** recalculate visible items on item resize ([#22938](https://github.com/vuetifyjs/vuetify/issues/22938)) ([fede124](https://github.com/vuetifyjs/vuetify/commit/fede1240ee5fce9188a5ce0130f7a6536b28edab)), closes [#22937](https://github.com/vuetifyjs/vuetify/issues/22937)

## v4.1.5 - 2026-07-13T22:40:59Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v4.1.5

### :wrench: Bug Fixes

- **types:** preserve RouteLocationRaw in emitted declarations ([d4d7b4b](https://github.com/vuetifyjs/vuetify/commit/d4d7b4be423a174030a4b1331429775ff80439ff)), closes [#22615](https://github.com/vuetifyjs/vuetify/issues/22615)
- **VCalendar:** prevent next day hours when customizing intervals ([4e36892](https://github.com/vuetifyjs/vuetify/commit/4e3689204599ca3446086868db12b67c25eff65e))
- **VCalendar:** add missing interval props ([#23000](https://github.com/vuetifyjs/vuetify/issues/23000)) ([d1f6f96](https://github.com/vuetifyjs/vuetify/commit/d1f6f9646e6eff1c8b93e5def1f12c43e3279abe)), closes [#22718](https://github.com/vuetifyjs/vuetify/issues/22718)
- **VDataTable:** hide empty header cell in mobile view ([a759055](https://github.com/vuetifyjs/vuetify/commit/a7590552c48dd2c355e9ed9d8b7f915f99820320))
- **VOverlay:** skip click-outside DOM scan for inactive overlays ([74e297f](https://github.com/vuetifyjs/vuetify/commit/74e297f55c11892bcb29596b7d1ee20b2e634f8b)), closes [#22995](https://github.com/vuetifyjs/vuetify/issues/22995)
- **VSwitch:** resolve inset thumb scale ratios in Sass ([86fcfaa](https://github.com/vuetifyjs/vuetify/commit/86fcfaad3e8b7b41407ab4170cdece33283b1c80)), closes [#23004](https://github.com/vuetifyjs/vuetify/issues/23004)
- **VTreeview:** search should match reactive nodes when using return-object ([#22640](https://github.com/vuetifyjs/vuetify/issues/22640)) ([1e92d74](https://github.com/vuetifyjs/vuetify/commit/1e92d74bba8c1084c0ab633d4c3cce03becbc85d)), closes [#22533](https://github.com/vuetifyjs/vuetify/issues/22533)

### :test_tube: Labs

- **VMaskInput:** preserve value when pasting over a selection ([#23003](https://github.com/vuetifyjs/vuetify/issues/23003)) ([9d9dc34](https://github.com/vuetifyjs/vuetify/commit/9d9dc34c0f73b440cf6e1b4d51e7bceeb68bfbf7)), closes [#22831](https://github.com/vuetifyjs/vuetify/issues/22831)

## v3.12.10 - 2026-07-13T17:34:02Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.12.10

### :wrench: Bug Fixes

- **types:** preserve RouteLocationRaw in emitted declarations ([2b2dee6](https://github.com/vuetifyjs/vuetify/commit/2b2dee681498d5bbc7c86dc0cfd26d7d28f0c05b)), closes [#22615](https://github.com/vuetifyjs/vuetify/issues/22615)
- **VMenu:** correct close cascade for nested menus ([2cb87d0](https://github.com/vuetifyjs/vuetify/commit/2cb87d072b847db317415c48ef14845fe81a6e2e)), closes [#20003](https://github.com/vuetifyjs/vuetify/issues/20003)
- **VTreeview:** search should match reactive nodes when using return-object ([#22640](https://github.com/vuetifyjs/vuetify/issues/22640)) ([654d30e](https://github.com/vuetifyjs/vuetify/commit/654d30eac28f5a5e094f43e29c0e532ede56fdce)), closes [#22533](https://github.com/vuetifyjs/vuetify/issues/22533)

### :test_tube: Labs

- **VMaskInput:** preserve value when pasting over a selection ([#23003](https://github.com/vuetifyjs/vuetify/issues/23003)) ([eee8483](https://github.com/vuetifyjs/vuetify/commit/eee84837f73ba4f2341b3e6bfc78b9f3dcdf5935)), closes [#22831](https://github.com/vuetifyjs/vuetify/issues/22831)

## v4.1.4 - 2026-07-07T15:46:12Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v4.1.4

### :wrench: Bug Fixes

- **date:** correct locale on StringDateAdapter ([83ed8d4](https://github.com/vuetifyjs/vuetify/commit/83ed8d49b53c0f924f7047bd7c31b6523b5a2fe2))
- **theme:** provideTheme current should use computedThemes ([#22987](https://github.com/vuetifyjs/vuetify/issues/22987)) ([998fe6a](https://github.com/vuetifyjs/vuetify/commit/998fe6a8815d65982f45b5139d8a3fef6ab55b6e)), closes [#22986](https://github.com/vuetifyjs/vuetify/issues/22986)
- **VDateInput:** do not fill range on blur ([b7569fe](https://github.com/vuetifyjs/vuetify/commit/b7569fe4845502c0c0d485382773f6ea9ee7085b)), closes [#22984](https://github.com/vuetifyjs/vuetify/issues/22984)
- **VMenu:** correct close cascade for nested menus ([5902e09](https://github.com/vuetifyjs/vuetify/commit/5902e09bfca1c060567b68d32bde4daddf9882a6)), closes [#20003](https://github.com/vuetifyjs/vuetify/issues/20003) [#21606](https://github.com/vuetifyjs/vuetify/issues/21606) [#22227](https://github.com/vuetifyjs/vuetify/issues/22227)
- **VMenu:** correct click-outside detection when content resizes ([007f546](https://github.com/vuetifyjs/vuetify/commit/007f5462e3381418d8a5b62068a73c2c90dd6e1b)), closes [#22488](https://github.com/vuetifyjs/vuetify/issues/22488)
- **VNumberInput:** accept non-ASCII minus sign ([6063d7a](https://github.com/vuetifyjs/vuetify/commit/6063d7abd3f6e6ac48919c6aa2d19aa08a42fe8a)), closes [#22988](https://github.com/vuetifyjs/vuetify/issues/22988)
- **VNumberInput:** keep all decimals when precision is null ([87b0e57](https://github.com/vuetifyjs/vuetify/commit/87b0e57ab8991bb6cfbfaacc8917f2fa5fe015b9)), closes [#22990](https://github.com/vuetifyjs/vuetify/issues/22990)

## v4.1.3 - 2026-07-02T15:57:28Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v4.1.3

### :wrench: Bug Fixes

- **rounded:** translate `2xl`, `3xl`, etc. to classes ([0ea03f4](https://github.com/vuetifyjs/vuetify/commit/0ea03f4c2297081fbb558822b6716f0e63442a1f)), closes [#22978](https://github.com/vuetifyjs/vuetify/issues/22978)
- **VAutocomplete:** don't trigger keydown listener during IME composition ([#22974](https://github.com/vuetifyjs/vuetify/issues/22974)) ([c1ef7fa](https://github.com/vuetifyjs/vuetify/commit/c1ef7fa05836b6f8afc4227306b6cb5468ab3fd9))
- **VDataTable:** keep rows visible after hiding a column with a custom filter ([#22971](https://github.com/vuetifyjs/vuetify/issues/22971)) ([aea8e77](https://github.com/vuetifyjs/vuetify/commit/aea8e77e6c5482d3ece15200916f0be06aa77261)), closes [#22863](https://github.com/vuetifyjs/vuetify/issues/22863)
- **VDataTable:** apply text-align to columns with align 'start' ([02f5f81](https://github.com/vuetifyjs/vuetify/commit/02f5f810ea470af0d579311462280dd91b4957b4)), closes [#22979](https://github.com/vuetifyjs/vuetify/issues/22979)
- **VDateInput:** derive display format from date adapter locale ([#22976](https://github.com/vuetifyjs/vuetify/issues/22976)) ([962cda0](https://github.com/vuetifyjs/vuetify/commit/962cda09e4ef91cdfbc57476a5b5ac7f4076b436))
- **VDateInput:** do not ignore the first click when actions are visible ([7fb5ef8](https://github.com/vuetifyjs/vuetify/commit/7fb5ef8357576de3aea0127e95ffa7b3bd8115e0))
- **VOtpInput:** move focus correctly in RTL mode ([f0145aa](https://github.com/vuetifyjs/vuetify/commit/f0145aaf07681d189e8e0582241a6e0bf296efe3))
- **VOtpInput:** pasting from mobile device ([5c39a64](https://github.com/vuetifyjs/vuetify/commit/5c39a64fa8d033276d6c265353b0599e6edb3fe1)), closes [#22931](https://github.com/vuetifyjs/vuetify/issues/22931)
- **VSelect/VAutocomplete/VCombobox:** respect `no-auto-scroll` ([adb2597](https://github.com/vuetifyjs/vuetify/commit/adb259741d6b348f4331dae8e495be88e921ba04)), closes [#22920](https://github.com/vuetifyjs/vuetify/issues/22920)
- **locale:** correctly resolve Kurdish locale to RTL ([4782312](https://github.com/vuetifyjs/vuetify/commit/4782312961ec71cf05fb6ccba07e50cfcbac0e7a))

## v3.12.9 - 2026-07-02T15:53:13Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.12.9

### :wrench: Bug Fixes

- **VDataTable:** keep rows visible after hiding a column with a custom filter ([#22971](https://github.com/vuetifyjs/vuetify/issues/22971)) ([7ac00c6](https://github.com/vuetifyjs/vuetify/commit/7ac00c6148af4985ab13151b97cb11fc7b81d08d)), closes [#22863](https://github.com/vuetifyjs/vuetify/issues/22863)
- **VPagination:** predictable length behavior in flex container ([3bea297](https://github.com/vuetifyjs/vuetify/commit/3bea2972e9654f5c7ec0dc3cf72529606fca76dc)), closes [#22907](https://github.com/vuetifyjs/vuetify/issues/22907)
- **VSelect/VAutocomplete/VCombobox:** respect `no-auto-scroll` ([a0075a1](https://github.com/vuetifyjs/vuetify/commit/a0075a120a5dad6e0d72c628fed0ea1f424fb23b)), closes [#22920](https://github.com/vuetifyjs/vuetify/issues/22920)

## v4.1.2 - 2026-06-16T13:36:39Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v4.1.2

### :wrench: Bug Fixes

- **theme:** async transition should return a Promise ([904f949](https://github.com/vuetifyjs/vuetify/commit/904f94956d671b2cbd8ce3f975aee2b63538771a)), closes [#22900](https://github.com/vuetifyjs/vuetify/issues/22900)
- **utilites:** merge height values into single group ([ff6e4e4](https://github.com/vuetifyjs/vuetify/commit/ff6e4e4169e0ad1435aef67da5f91cc4d33d4b44)), closes [#22916](https://github.com/vuetifyjs/vuetify/issues/22916)
- **VDialog:** clear inline styles when enabling fullscreen mode ([ea29378](https://github.com/vuetifyjs/vuetify/commit/ea293786199d5ce5711bf98354cd473eedaa64f9)), closes [#22926](https://github.com/vuetifyjs/vuetify/issues/22926)
- **VOverlay:** static location should snap to edges using CSS ([#22921](https://github.com/vuetifyjs/vuetify/issues/22921)) ([4fc3c8e](https://github.com/vuetifyjs/vuetify/commit/4fc3c8ebce1b3ffe01c6f28477d20ddb4ace0394)), closes [#22911](https://github.com/vuetifyjs/vuetify/issues/22911)
- **VOverlay:** do not clear position when closing ([923b3b6](https://github.com/vuetifyjs/vuetify/commit/923b3b6d3639e237fdbf6af3e96e0e73e0344377)), closes [#22930](https://github.com/vuetifyjs/vuetify/issues/22930)
- **VOverlay:** keep overlay attached with iOS keyboard open ([#22923](https://github.com/vuetifyjs/vuetify/issues/22923)) ([2e51298](https://github.com/vuetifyjs/vuetify/commit/2e51298132359f772fe50a42fecf851c27e5bfac)), closes [#22376](https://github.com/vuetifyjs/vuetify/issues/22376)
- **VOverlay:** resolve size with CSS function (calc, min, vw) to pixels ([bf105bf](https://github.com/vuetifyjs/vuetify/commit/bf105bfbdb8964aa073a79adcd5714824874e1ce))
- **VOverlay:** dimension props should be reactive in static strategy ([eb56d37](https://github.com/vuetifyjs/vuetify/commit/eb56d3715b864084989eb8008ddbbfd72dc9954f))
- **VPagination:** predictable length behavior in flex container ([#22912](https://github.com/vuetifyjs/vuetify/issues/22912)) ([e7016b1](https://github.com/vuetifyjs/vuetify/commit/e7016b18383ddc53b8ed6a22691c59877171687f)), closes [#22907](https://github.com/vuetifyjs/vuetify/issues/22907)
- **VTreeview:** apply `hide-actions` to group nodes ([e5555ae](https://github.com/vuetifyjs/vuetify/commit/e5555ae86a03de867b54e6a7a90402bb8e1a23af)), closes [#22919](https://github.com/vuetifyjs/vuetify/issues/22919)

## v4.1.1 - 2026-06-08T07:55:11Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v4.1.1

### :wrench: Bug Fixes

- **VMenu:** prevent focus change during IME input ([#21008](https://github.com/vuetifyjs/vuetify/issues/21008)) ([374c955](https://github.com/vuetifyjs/vuetify/commit/374c9559577e096e8022eec66a9df63759753169)), closes [#21001](https://github.com/vuetifyjs/vuetify/issues/21001)
- **VNumberInput:** emit `change` when using controls and arrows ([2ab2509](https://github.com/vuetifyjs/vuetify/commit/2ab2509d3dce96b6c927c6d4604525df3a13beaa))
- **VOverlay:** respect % dimension boundaries ([eaec65f](https://github.com/vuetifyjs/vuetify/commit/eaec65f1dc7464cfd4b9282445980848ec3e546a)), closes [#22890](https://github.com/vuetifyjs/vuetify/issues/22890)
- **VSelect:** close menu when click lands inside host overlay ([7ed9a54](https://github.com/vuetifyjs/vuetify/commit/7ed9a542f5be23c447a8d53155b13041b017ec48)), closes [#22897](https://github.com/vuetifyjs/vuetify/issues/22897)
- **VSnackbar:** more reliable progress bar ([5e6fe60](https://github.com/vuetifyjs/vuetify/commit/5e6fe600818cb59ce8d875754afccf64c4f36971)), closes [#22894](https://github.com/vuetifyjs/vuetify/issues/22894)
- **VTable:** apply background and border for `fixed-footer` ([ecabcc5](https://github.com/vuetifyjs/vuetify/commit/ecabcc54d9c3d9a4f359f8c78dfa49f7a1e46865))
- **VTooltip:** avoid stealing focus ([77d1a8a](https://github.com/vuetifyjs/vuetify/commit/77d1a8a68cbd8e2d534d279c21031bff42fa7c30)), closes [#22891](https://github.com/vuetifyjs/vuetify/issues/22891)
- **VTooltip:** merge content class and props ([5cc3278](https://github.com/vuetifyjs/vuetify/commit/5cc3278b6d44fe9526de2adef95516e3ad8d828f))

### :test_tube: Labs

- **VHeatmap:** keep legend bar visible in forced-colors mode ([58e3e7d](https://github.com/vuetifyjs/vuetify/commit/58e3e7ddcecfbc1a8dea040eb82d6e49ad113e18))
- **VHighlight:** support forced-colors mode ([067228c](https://github.com/vuetifyjs/vuetify/commit/067228c7f96eb82e42ed35d5a0220a3b7e7f7d69))

## v4.1.0 - 2026-06-02T13:33:27Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v4.1.0

### Release Notes

- [v-icon-btn](https://vuetifyjs.com/en/components/icon-buttons/)
- [v-stepper-vertical](https://vuetifyjs.com/en/components/vertical-steppers/)
- [v-pull-to-refresh](https://vuetifyjs.com/en/components/pull-to-refresh/)
- [v-file-upload](https://vuetifyjs.com/en/components/file-upload/)
- [v-date-input](https://vuetifyjs.com/en/components/date-inputs/)
- [v-color-input](https://vuetifyjs.com/en/components/color-inputs/)
- [v-picker](https://vuetifyjs.com/en/api/v-picker/)

### :rocket: Features

- **VCalendar:** add `interval-highlight` prop ([#22885](https://github.com/vuetifyjs/vuetify/issues/22885)) ([4b1b720](https://github.com/vuetifyjs/vuetify/commit/4b1b720806bb5e4b437dd882b1d1ae2fd5508cd2)), closes [#22593](https://github.com/vuetifyjs/vuetify/issues/22593)
- **VExpansionPanelTitle:** add hover prop to disable hover effect ([#22827](https://github.com/vuetifyjs/vuetify/issues/22827)) ([51fdd04](https://github.com/vuetifyjs/vuetify/commit/51fdd0496cd1e6d81af576d246c9e910969a2948)), closes [#21615](https://github.com/vuetifyjs/vuetify/issues/21615)
- **VSwitch:** add `size` prop ([#22882](https://github.com/vuetifyjs/vuetify/issues/22882)) ([d0fb972](https://github.com/vuetifyjs/vuetify/commit/d0fb9728a6c75a83ca60d1f3ddd51d982e138edb)), closes [#18334](https://github.com/vuetifyjs/vuetify/issues/18334)
- **VSwitch:** add 'square' as new `inset` variant ([#22881](https://github.com/vuetifyjs/vuetify/issues/22881)) ([f0fb506](https://github.com/vuetifyjs/vuetify/commit/f0fb5068363942a6b232e552939ffe7e8024c289))
- **VSwitch:** align with MD3 spec ([#22879](https://github.com/vuetifyjs/vuetify/issues/22879)) ([010c8e7](https://github.com/vuetifyjs/vuetify/commit/010c8e7d8539b53a990fb0a7a035a2ac2ad20dd3)), closes [#22164](https://github.com/vuetifyjs/vuetify/issues/22164)
- **VDataTable:** add aria-sort to sortable headers ([e20fe22](https://github.com/vuetifyjs/vuetify/commit/e20fe2278cbeb255942d0c91edee47bd11fafa03)), closes [#20974](https://github.com/vuetifyjs/vuetify/issues/20974)
- **VDataTable:** add aria-labels for selection controls ([4e605c5](https://github.com/vuetifyjs/vuetify/commit/4e605c5003a4953cedebf57fbe63b326cc17d4b6)), closes [#9956](https://github.com/vuetifyjs/vuetify/issues/9956)
- **VDataTable:** `loading` prop to accept object with `side` ([#22872](https://github.com/vuetifyjs/vuetify/issues/22872)) ([1f64f3c](https://github.com/vuetifyjs/vuetify/commit/1f64f3c73fa33ceaf1f00940986f0f995f889499)), closes [#9655](https://github.com/vuetifyjs/vuetify/issues/9655)
- **VDataTable:** add `expanded` slot with transition support ([#22871](https://github.com/vuetifyjs/vuetify/issues/22871)) ([54ed488](https://github.com/vuetifyjs/vuetify/commit/54ed48800a5db8d74d3195e515045b12913f44b7)), closes [#8197](https://github.com/vuetifyjs/vuetify/issues/8197) [#17527](https://github.com/vuetifyjs/vuetify/issues/17527)
- **VDataTable:** add filtered `itemsLength` to slot props ([#22874](https://github.com/vuetifyjs/vuetify/issues/22874)) ([372a614](https://github.com/vuetifyjs/vuetify/commit/372a614c025b50892bed9fedaf59e7e00d5384cc)), closes [#20496](https://github.com/vuetifyjs/vuetify/issues/20496)
- **VRating:** expose activeColor in item slot props ([#22814](https://github.com/vuetifyjs/vuetify/issues/22814)) ([7923f7b](https://github.com/vuetifyjs/vuetify/commit/7923f7b1a252a4ea3d89deab5d3fae4c1520b8d5)), closes [#22273](https://github.com/vuetifyjs/vuetify/issues/22273)
- **VTable:** add `caption` slot and pass aria-* to &lt;table&gt; ([15e86a3](https://github.com/vuetifyjs/vuetify/commit/15e86a38b82d6bc735ffdf1ab7fb8017412e8715)), closes [#21805](https://github.com/vuetifyjs/vuetify/issues/21805)
- **VTable:** add `gridlines` prop ([#22873](https://github.com/vuetifyjs/vuetify/issues/22873)) ([2cf2aab](https://github.com/vuetifyjs/vuetify/commit/2cf2aabbe4ce4a0a09a97f041474d500c6056cf8)), closes [#10083](https://github.com/vuetifyjs/vuetify/issues/10083) [#14412](https://github.com/vuetifyjs/vuetify/issues/14412)
- **elevation:** add `hover-elevation` prop and CSS utilities ([#22621](https://github.com/vuetifyjs/vuetify/issues/22621)) ([c41efc4](https://github.com/vuetifyjs/vuetify/commit/c41efc417a3f8e05c0647efa8d986796f49319d2)), closes [#20462](https://github.com/vuetifyjs/vuetify/issues/20462)
- **rounded:** accept arbitrary values ([#22721](https://github.com/vuetifyjs/vuetify/issues/22721)) ([bd9037c](https://github.com/vuetifyjs/vuetify/commit/bd9037cef06a8fb71fd84a690208c161b1e02685)), closes [#14368](https://github.com/vuetifyjs/vuetify/issues/14368)
- **theme:** add optional page transitions ([#22623](https://github.com/vuetifyjs/vuetify/issues/22623)) ([b85a946](https://github.com/vuetifyjs/vuetify/commit/b85a946225022c13b823272297819d8a556ce86c))
- **VCalendar:** 24hour support ([#22853](https://github.com/vuetifyjs/vuetify/issues/22853)) ([c046c1f](https://github.com/vuetifyjs/vuetify/commit/c046c1f616b4483eca2a5fc3f101aeb9022a14c7)), closes [#22415](https://github.com/vuetifyjs/vuetify/issues/22415)
- **VColorPicker:** add `hide-input-labels` prop ([82ffc22](https://github.com/vuetifyjs/vuetify/commit/82ffc22107b38f70a7a63c77a2d814b0b67b737e)), closes [#22285](https://github.com/vuetifyjs/vuetify/issues/22285)
- **VCommandPalette, VOverlay:** introduce viewport location strategy ([#22698](https://github.com/vuetifyjs/vuetify/issues/22698)) ([ca399e5](https://github.com/vuetifyjs/vuetify/commit/ca399e50f27968a41be6249fbc7ab3070aca2e0b))
- **VDataTable:** add mobile header slot ([#21429](https://github.com/vuetifyjs/vuetify/issues/21429)) ([c0bdb9c](https://github.com/vuetifyjs/vuetify/commit/c0bdb9c3886b3dfb748b2864cde1296e6c85dcbb)), closes [#19730](https://github.com/vuetifyjs/vuetify/issues/19730)
- **VDataTable:** add v-model:opened for group-by ([#22772](https://github.com/vuetifyjs/vuetify/issues/22772)) ([355e37a](https://github.com/vuetifyjs/vuetify/commit/355e37a67d7f995b027a6b151cadf0b86fe1a7fa)), closes [#22300](https://github.com/vuetifyjs/vuetify/issues/22300) [#17707](https://github.com/vuetifyjs/vuetify/issues/17707)
- **VDataTable:** highlight search matches ([#22852](https://github.com/vuetifyjs/vuetify/issues/22852)) ([d4e1812](https://github.com/vuetifyjs/vuetify/commit/d4e1812498680e8a0634b93cad6081a9dac2c015)), closes [#20357](https://github.com/vuetifyjs/vuetify/issues/20357)
- **VDatePicker:** keyboard arrows navigation in selection grid ([#22857](https://github.com/vuetifyjs/vuetify/issues/22857)) ([d100d83](https://github.com/vuetifyjs/vuetify/commit/d100d83ff77831a1541b51d43643ff09b39f6e45)), closes [#5629](https://github.com/vuetifyjs/vuetify/issues/5629)
- **VExpansionPanels:** add more props for customization ([#22723](https://github.com/vuetifyjs/vuetify/issues/22723)) ([cd7b8ca](https://github.com/vuetifyjs/vuetify/commit/cd7b8caf75f4bd56f6633e7a2bf8aa69722395d7)), closes [#21616](https://github.com/vuetifyjs/vuetify/issues/21616) [#12039](https://github.com/vuetifyjs/vuetify/issues/12039)
- **VFileInput, VFileUpload:** support pasting files and folders ([b60d830](https://github.com/vuetifyjs/vuetify/commit/b60d830d150ac255064229f8b500b16f235a6f24)), closes [#22732](https://github.com/vuetifyjs/vuetify/issues/22732)
- **VNumberInput:** add `grouping` prop ([#22134](https://github.com/vuetifyjs/vuetify/issues/22134)) ([ff04a2c](https://github.com/vuetifyjs/vuetify/commit/ff04a2c5ab0e1164c46319b8340803419011b473)), closes [#22453](https://github.com/vuetifyjs/vuetify/issues/22453)
- **VOtpInput:** groups, a11y improvements, emoji ([#22803](https://github.com/vuetifyjs/vuetify/issues/22803)) ([825bf43](https://github.com/vuetifyjs/vuetify/commit/825bf43cf2157a7cb88e1edded0ca9209508bc83)), closes [#22659](https://github.com/vuetifyjs/vuetify/issues/22659) [#18427](https://github.com/vuetifyjs/vuetify/issues/18427)
- **VPagination, VDataTableFooter:** ability to hide last page ([#22788](https://github.com/vuetifyjs/vuetify/issues/22788)) ([c8a245c](https://github.com/vuetifyjs/vuetify/commit/c8a245c2468ab84d282e0c35efe99c2517a57e9c))
- **VProgressLinear:** add `split` variant to align with MD3 ([#22662](https://github.com/vuetifyjs/vuetify/issues/22662)) ([105a8b8](https://github.com/vuetifyjs/vuetify/commit/105a8b8f02931efb3a2f529bfd1e22b6b0b7e56f))
- **VSparkline:** markers & tooltips ([#22748](https://github.com/vuetifyjs/vuetify/issues/22748)) ([4eb9dc0](https://github.com/vuetifyjs/vuetify/commit/4eb9dc0d1f763c6fa378c956ae761dde74ddf02b))
- **VTooltip:** add `color` prop ([#19689](https://github.com/vuetifyjs/vuetify/issues/19689)) ([88934c8](https://github.com/vuetifyjs/vuetify/commit/88934c877c6713dba610b16114ab1c89f6b26153)), closes [#19567](https://github.com/vuetifyjs/vuetify/issues/19567)
- **VTooltip:** `target="cursor"` should work for hoverable tooltips ([#22728](https://github.com/vuetifyjs/vuetify/issues/22728)) ([342c20b](https://github.com/vuetifyjs/vuetify/commit/342c20b40600d2f863a9444a3d9bced05ce3dd8f)), closes [#22161](https://github.com/vuetifyjs/vuetify/issues/22161)
- **VTreeview:** bind indentLines to item slot ([327d648](https://github.com/vuetifyjs/vuetify/commit/327d648a11566d6e4b44d2d67b4c4d6cd9d732d7))

### :wrench: Bug Fixes

- **VDialog:** no viewport margin for fullscreen dialog ([04663d9](https://github.com/vuetifyjs/vuetify/commit/04663d9da1e75fef7b93483a5a9e773bf1895552))
- **VExpansionPanel:** improved focus styles ([e10e1c8](https://github.com/vuetifyjs/vuetify/commit/e10e1c874a86cad2c3593819944392fc2727cca2))
- **VSwitch:** tune track color for inset material ([a7d0bae](https://github.com/vuetifyjs/vuetify/commit/a7d0bae7465e607275fae3de203b7f916f003217))
- **VSwitch:** outline should have neutral color ([23f139b](https://github.com/vuetifyjs/vuetify/commit/23f139bfb8851476d1b60c05bb32db61e9aefdce))
- **VDialog, VSnackbar:** correct position with static location strategy ([a8c1ad9](https://github.com/vuetifyjs/vuetify/commit/a8c1ad91b6af70ff68e8f58f501856bbe9fd5442))
- **VCheckbox:** align indeterminate opacity and color with MD3 ([#22804](https://github.com/vuetifyjs/vuetify/issues/22804)) ([c651933](https://github.com/vuetifyjs/vuetify/commit/c651933da8cc9cbb25574af4184ec56c0409c2da)), closes [#22039](https://github.com/vuetifyjs/vuetify/issues/22039)
- **VDatePicker:** align range selection with MD3 ([#22858](https://github.com/vuetifyjs/vuetify/issues/22858)) ([c4ae6de](https://github.com/vuetifyjs/vuetify/commit/c4ae6de9d352f802f1626844b14906b11d7a1756)), closes [#22793](https://github.com/vuetifyjs/vuetify/issues/22793)
- **VHover:** reconcile actual hover state when re-enabled ([#22845](https://github.com/vuetifyjs/vuetify/issues/22845)) ([3cde811](https://github.com/vuetifyjs/vuetify/commit/3cde8117c80030efadead501cbe58da76cebd8f3)), closes [#22498](https://github.com/vuetifyjs/vuetify/issues/22498)
- **VOverlay:** `contained` should opt-out from static strategy ([4c5228c](https://github.com/vuetifyjs/vuetify/commit/4c5228c302d05c8a181be0e9913c77b79d28e334))
- **VOverlay:** make `location` and `origin` actually useful ([#22720](https://github.com/vuetifyjs/vuetify/issues/22720)) ([13c9af0](https://github.com/vuetifyjs/vuetify/commit/13c9af020c683c65d25f027d75ae5811a33846c5)), closes [#20919](https://github.com/vuetifyjs/vuetify/issues/20919)
- **VSnackbarQueue:** avoid stale z-index ([#22796](https://github.com/vuetifyjs/vuetify/issues/22796)) ([66f09ce](https://github.com/vuetifyjs/vuetify/commit/66f09ce3e64f6fdba3edd73488e55ba62de5dbff))

### :test_tube: Labs

- ✨ **VDateRangePicker:** add new component ([#22860](https://github.com/vuetifyjs/vuetify/issues/22860)) ([7d3d76d](https://github.com/vuetifyjs/vuetify/commit/7d3d76da22375a3b418b9ce152794a936bc878a5)), closes [#21741](https://github.com/vuetifyjs/vuetify/issues/21741)
- ✨ **VHeatmap:** add new component ([#22535](https://github.com/vuetifyjs/vuetify/issues/22535)) ([68ed649](https://github.com/vuetifyjs/vuetify/commit/68ed64989f3fa8b487952ba35741c4acafe1b2ea) + [d336bde](https://github.com/vuetifyjs/vuetify/commit/d336bde1cbb2343b8bdf085dd2e2d6f2c3f18000) + [9a3bdff](https://github.com/vuetifyjs/vuetify/commit/9a3bdff999597b6abb45612f8f783c60783c4440))
- ✨ **VHighlight:** add new component ([#22817](https://github.com/vuetifyjs/vuetify/issues/22817)) ([181bf89](https://github.com/vuetifyjs/vuetify/commit/181bf894554f088f3fe86db63490e2714109cf48))
- ✨ **VMonthPicker:** add new component ([#22534](https://github.com/vuetifyjs/vuetify/issues/22534)) ([65a71c1](https://github.com/vuetifyjs/vuetify/commit/65a71c1491fd7206f6862edb560af934d8b9243c)), closes [#17950](https://github.com/vuetifyjs/vuetify/issues/17950)
- **VFileUpload:** add `loading` prop ([4dbc61f](https://github.com/vuetifyjs/vuetify/commit/4dbc61f8cc969543f7a96fd6b68ee903df60476e)), closes [#21695](https://github.com/vuetifyjs/vuetify/issues/21695)
- **VFileUpload:** stabilize item keys to correctly remove using chips ([d020c7f](https://github.com/vuetifyjs/vuetify/commit/d020c7fc2c98367b9db5d3602a28378e81addb8b)), closes [#21772](https://github.com/vuetifyjs/vuetify/issues/21772)
- **VFileUpload:** `readonly` should suppress dropzone interactions ([63305d0](https://github.com/vuetifyjs/vuetify/commit/63305d05e81768696df2b4d5a332fc332c74bccd))

## v4.0.9 - 2026-06-02T12:14:44Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v4.0.9

### :wrench: Bug Fixes

- **focusTrap:** prevent page scroll when capturing focus ([451e7c3](https://github.com/vuetifyjs/vuetify/commit/451e7c3d66d72b62b5fa5927e9ee611d542084a9)), closes [#22802](https://github.com/vuetifyjs/vuetify/issues/22802)
- **VNumberInput:** keep both controls enabled when empty ([e0133c2](https://github.com/vuetifyjs/vuetify/commit/e0133c20f66d81f09e2e4f87efd8b3767b08f8eb))
- **VProgressLinear:** avoid opacity:NaN when rendering with SSR ([#22880](https://github.com/vuetifyjs/vuetify/issues/22880)) ([359a492](https://github.com/vuetifyjs/vuetify/commit/359a492a7f11f35fcefa7ebd48c5ce00518c6131)), closes [#22876](https://github.com/vuetifyjs/vuetify/issues/22876)

## v3.12.8 - 2026-06-02T12:09:16Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.12.8

### :wrench: Bug Fixes

- **focusTrap:** prevent page scroll when capturing focus ([be370cd](https://github.com/vuetifyjs/vuetify/commit/be370cd7a3ab1525485471f4225f6fc80d0f4c6c)), closes [#22802](https://github.com/vuetifyjs/vuetify/issues/22802)
- **VNumberInput:** keep both controls enabled when empty ([5ce31e4](https://github.com/vuetifyjs/vuetify/commit/5ce31e4d6a6f2022120ceb12fb59986ac3752f64))
- **VProgressLinear:** avoid opacity:NaN when rendering with SSR ([#22880](https://github.com/vuetifyjs/vuetify/issues/22880)) ([7bdc82c](https://github.com/vuetifyjs/vuetify/commit/7bdc82c3533eeb97046acc3df4ac932d5c161943)), closes [#22876](https://github.com/vuetifyjs/vuetify/issues/22876)

### Other Commits

- chore(release): publish v3.12.8 ([8d5d16a](https://github.com/vuetifyjs/vuetify/commit/8d5d16af598967846fdd0e2da9652b6b4f7b47e9))

## v4.0.8 - 2026-05-28T23:30:01Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v4.0.8

### :wrench: Bug Fixes

- **theme:** support transparent hex color for CSS variables ([#22875](https://github.com/vuetifyjs/vuetify/issues/22875)) ([a986920](https://github.com/vuetifyjs/vuetify/commit/a986920876beb7f0c8e90f1b44848b942fe535e4)), closes [#22865](https://github.com/vuetifyjs/vuetify/issues/22865)
- **VAutocomplete/VCombobox:** click in empty space should not close menu ([#22754](https://github.com/vuetifyjs/vuetify/issues/22754)) ([d8b16d4](https://github.com/vuetifyjs/vuetify/commit/d8b16d4f793a813baabdceaf6171750d940bdf06))
- **VBtnToggle:** restore active overlay when no color is set ([70804c2](https://github.com/vuetifyjs/vuetify/commit/70804c2955d1beca7af60b9c001492d432fc6c51)), closes [#22856](https://github.com/vuetifyjs/vuetify/issues/22856)
- **VOverlay:** restore focus without preventing Enter keydown ([#22276](https://github.com/vuetifyjs/vuetify/issues/22276)) ([f4d376d](https://github.com/vuetifyjs/vuetify/commit/f4d376ddc9542a50fb6c32c1867536e431d92927)), closes [#19872](https://github.com/vuetifyjs/vuetify/issues/19872) [#22387](https://github.com/vuetifyjs/vuetify/issues/22387)
- **VOverlay:** pull focus to trap when it biefly escapes ([5d52b80](https://github.com/vuetifyjs/vuetify/commit/5d52b80a0378c017a8f8215abf1eeb96fef0f470)), closes [#22322](https://github.com/vuetifyjs/vuetify/issues/22322)
- **VSelect/VAutocomplete/VCombobox:** keep menu open when scrolling ([#22877](https://github.com/vuetifyjs/vuetify/issues/22877)) ([300af6d](https://github.com/vuetifyjs/vuetify/commit/300af6dd811ad78ebe51821284aae5fd4f5ea66b)), closes [#22850](https://github.com/vuetifyjs/vuetify/issues/22850)
- **VSwitch:** suppress user-agent styles to avoid click dead-zone ([3e16cc0](https://github.com/vuetifyjs/vuetify/commit/3e16cc04c01764921371e2eab41cf84e8cd7af99))

### :fire: Performance Improvements

- **VForm:** avoid eager .value reads in default slot props ([#22846](https://github.com/vuetifyjs/vuetify/issues/22846)) ([4369608](https://github.com/vuetifyjs/vuetify/commit/43696084b969fa884a2f3b6f6f8797703293343f)), closes [#22816](https://github.com/vuetifyjs/vuetify/issues/22816)

## v3.12.7 - 2026-05-28T22:51:48Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.12.7

### :wrench: Bug Fixes

- **VSelect/VAutocomplete/VCombobox:** keep menu open when scrolling ([f7e7389](https://github.com/vuetifyjs/vuetify/commit/f7e7389d62b6af082d2425939ba4692d41db7cdd)), closes [#22850](https://github.com/vuetifyjs/vuetify/issues/22850)

## v4.0.7 - 2026-05-08T19:32:17Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v4.0.7

### :wrench: Bug Fixes

- **VAlert:** border opacity should win over theme variables ([#22832](https://github.com/vuetifyjs/vuetify/issues/22832)) ([d355443](https://github.com/vuetifyjs/vuetify/commit/d355443a60ec6b222600fb97978164a6dedd249f))
- **VBtnToggle:** correct background when active ([79a3a8c](https://github.com/vuetifyjs/vuetify/commit/79a3a8cf81cb153207e0675d0c77b54fec654f40)), closes [#22004](https://github.com/vuetifyjs/vuetify/issues/22004)
- **VField:** correct baseline alignment ([#22812](https://github.com/vuetifyjs/vuetify/issues/22812)) ([14fd872](https://github.com/vuetifyjs/vuetify/commit/14fd872482b928e94c5db4cbddf4f77cf4cfbc72)), closes [#22648](https://github.com/vuetifyjs/vuetify/issues/22648)
- **VList:** invisibly focus first element after open ([d153a6e](https://github.com/vuetifyjs/vuetify/commit/d153a6e31ea3661dd8df87a6cfe71ba0b0e9852a)), closes [#22783](https://github.com/vuetifyjs/vuetify/issues/22783)
- **VProgressLinear:** correct calculation for filled chunks ([642a27b](https://github.com/vuetifyjs/vuetify/commit/642a27bb4d010603161bd4024139fedb951131df)), closes [#22818](https://github.com/vuetifyjs/vuetify/issues/22818)
- **VSelects:** merge menuProps.contentClass ([6749424](https://github.com/vuetifyjs/vuetify/commit/67494243868febda9eb77eb0daf4639d27f3b427)), closes [#22822](https://github.com/vuetifyjs/vuetify/issues/22822)
- **VTreeview,VList:** wire `value-comparator` into selection logic ([#22841](https://github.com/vuetifyjs/vuetify/issues/22841)) ([d5b4670](https://github.com/vuetifyjs/vuetify/commit/d5b4670234ba2ee297802bbecb4aaa5813eaf992)), closes [#22013](https://github.com/vuetifyjs/vuetify/issues/22013)

## v3.12.6 - 2026-05-08T19:27:35Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.12.6

### :wrench: Bug Fixes

- **types:** support noUncheckedSideEffectImports ([1300d9e](https://github.com/vuetifyjs/vuetify/commit/1300d9e435d8ec2db042224997635dd77d78b172)), closes [#22766](https://github.com/vuetifyjs/vuetify/issues/22766)
- **VList:** invisibly focus first element after open ([a037673](https://github.com/vuetifyjs/vuetify/commit/a037673bd2149bf048998362421039775e379621)), closes [#22783](https://github.com/vuetifyjs/vuetify/issues/22783)
- **VOtpInput:** remove semicolon from sass file ([816cfa4](https://github.com/vuetifyjs/vuetify/commit/816cfa47bc76f97dcd10c920c98a338f42676e47)), closes [#22798](https://github.com/vuetifyjs/vuetify/issues/22798)
- **VProgressLinear:** correct calculation for filled chunks ([2995c6f](https://github.com/vuetifyjs/vuetify/commit/2995c6f00ebff68f276c0b14b93298c3e8479b3e)), closes [#22818](https://github.com/vuetifyjs/vuetify/issues/22818)
- **VSelects:** merge menuProps.contentClass ([8cffe1b](https://github.com/vuetifyjs/vuetify/commit/8cffe1b32d250cb3a4e4705963b0e9ea802a5935)), closes [#22822](https://github.com/vuetifyjs/vuetify/issues/22822)
- fix(VColorPicker, VCalendar, ripple) support CSS zoom ([#22774](https://github.com/vuetifyjs/vuetify/issues/22774)) ([ca02f8b](https://github.com/vuetifyjs/vuetify/commit/ca02f8bd7b2b5eb7382f4dc6ffa94e32611e3c8c)), closes [#22761](https://github.com/vuetifyjs/vuetify/issues/22761)

## v4.0.6 - 2026-04-22T08:58:26Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v4.0.6

### :wrench: Bug Fixes

- **VBadge:** do not accept clicks within disabled elements ([996cd6e](https://github.com/vuetifyjs/vuetify/commit/996cd6ea936a2b0488bada5374d3ea27c59f2bda)), closes [#22172](https://github.com/vuetifyjs/vuetify/issues/22172)
- **VField:** pass color to icon-color if glow prop is true ([#21547](https://github.com/vuetifyjs/vuetify/issues/21547)) ([10125b7](https://github.com/vuetifyjs/vuetify/commit/10125b7fcf7a7ceaa9599cdd6186318f3cdae8fc)), closes [#21388](https://github.com/vuetifyjs/vuetify/issues/21388)
- **VOtpInput:** remove semicolon from sass file ([bf53f9e](https://github.com/vuetifyjs/vuetify/commit/bf53f9e1021a4e7c9275cc21f1985ae754fb0635)), closes [#22798](https://github.com/vuetifyjs/vuetify/issues/22798)
- **VSelectionControl:** readonly should not suppress focus-visible ([#22527](https://github.com/vuetifyjs/vuetify/issues/22527)) ([ce234a8](https://github.com/vuetifyjs/vuetify/commit/ce234a868348b0a808ee4533bcd0c1633a8566a4)), closes [#22513](https://github.com/vuetifyjs/vuetify/issues/22513)

### :test_tube: Labs

- **VVideo:** avoid tooltip obstructing volume slider ([add2a7e](https://github.com/vuetifyjs/vuetify/commit/add2a7e8facc1c50ad8b40e354f0bfb874a0177b))
- **VVideo:** support VVideoControls as standalone component ([aaf9cf5](https://github.com/vuetifyjs/vuetify/commit/aaf9cf5f6f10aa083bdc1181706f100dd0c6c710)), closes [#22529](https://github.com/vuetifyjs/vuetify/issues/22529)
- **VVideo:** show progress bar by default ([1be0091](https://github.com/vuetifyjs/vuetify/commit/1be0091ecbdb3891ce387aab37ba551f05e15d3b))

## v4.0.5 - 2026-04-02T14:17:36Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v4.0.5

### :wrench: Bug Fixes

- **SSR:** avoid errors when rendering with latest Vue ([#22764](https://github.com/vuetifyjs/vuetify/issues/22764)) ([ecbe030](https://github.com/vuetifyjs/vuetify/commit/ecbe0300919e9bc86b665e320a811b6a2ef1e6b2)), closes [#22762](https://github.com/vuetifyjs/vuetify/issues/22762)
- **types:** support noUncheckedSideEffectImports ([2098fb1](https://github.com/vuetifyjs/vuetify/commit/2098fb180ea83ed1d35df10d2132c9157a37079a)), closes [#22766](https://github.com/vuetifyjs/vuetify/issues/22766)
- **useActivator:** avoid closing hovered menu when tooltip hides ([131e659](https://github.com/vuetifyjs/vuetify/commit/131e6593b07796377e3baa53b629610aa2ee4a2f)), closes [#22759](https://github.com/vuetifyjs/vuetify/issues/22759)
- **VSnackbar:** avoid blocking navigation ([143ceaa](https://github.com/vuetifyjs/vuetify/commit/143ceaa19500daba500a7fcb67229f2d7f25f9bb)), closes [#18283](https://github.com/vuetifyjs/vuetify/issues/18283)

### :test_tube: Labs

- **VPie:** shrink back hovered slices on mouseleave ([1893748](https://github.com/vuetifyjs/vuetify/commit/189374850d5a8dc605c1cc7df0400a1a5aba6ad5))

## v3.12.5 - 2026-04-02T14:15:27Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.12.5

### :wrench: Bug Fixes

- **useActivator:** avoid closing hovered menu when tooltip hides ([71d657b](https://github.com/vuetifyjs/vuetify/commit/71d657b963f92285e893c42ab3468429ebf2d171)), closes [#22759](https://github.com/vuetifyjs/vuetify/issues/22759)

## v4.0.4 - 2026-03-25T01:59:34Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v4.0.4

### :wrench: Bug Fixes

- **VCol:** correct types for `offset-*` props ([1cdd9c4](https://github.com/vuetifyjs/vuetify/commit/1cdd9c4a97382c72f85cc579949a9979e4d38971)), closes [#22740](https://github.com/vuetifyjs/vuetify/issues/22740)
- **VField:** label transition on page with zoom ([1fcad6b](https://github.com/vuetifyjs/vuetify/commit/1fcad6b884760d90356790b6f22261b2a22c63ad)), closes [#22747](https://github.com/vuetifyjs/vuetify/issues/22747)
- **VSelect:** prevent brief error state when clicking a menu item ([7fec2d4](https://github.com/vuetifyjs/vuetify/commit/7fec2d41c084c870f1d306c45a043cbd8e8a06ba)), closes [#22742](https://github.com/vuetifyjs/vuetify/issues/22742)
- **VTimePicker:** avoid loading all CSS utilities ([015da52](https://github.com/vuetifyjs/vuetify/commit/015da521587589e37cf32b8b3f07991f2754361e)), closes [#22733](https://github.com/vuetifyjs/vuetify/issues/22733)

### :test_tube: Labs

- **rules:** type resolution for custom rules ([#22701](https://github.com/vuetifyjs/vuetify/issues/22701)) ([053b605](https://github.com/vuetifyjs/vuetify/commit/053b6054ae7345405827f82591a048fb3aac85e5)), closes [#22688](https://github.com/vuetifyjs/vuetify/issues/22688)
- **VFileUpload:** adding/replacing files with dropzone click ([#22741](https://github.com/vuetifyjs/vuetify/issues/22741)) ([eb95c9e](https://github.com/vuetifyjs/vuetify/commit/eb95c9ef3c37956187f93048c34d96749164249f)), closes [#22737](https://github.com/vuetifyjs/vuetify/issues/22737)

## v3.12.4 - 2026-03-25T01:56:49Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.12.4

### :wrench: Bug Fixes

- **VField:** label transition on page with zoom ([6246a96](https://github.com/vuetifyjs/vuetify/commit/6246a965c01e836361c9fd7be24ffeb959e3253b)), closes [#22747](https://github.com/vuetifyjs/vuetify/issues/22747)
- **VTimePicker:** avoid loading all CSS utilities ([884e5dc](https://github.com/vuetifyjs/vuetify/commit/884e5dc3a4b5b1ebc7d3986fae888982d59367b9)), closes [#22733](https://github.com/vuetifyjs/vuetify/issues/22733)

### :test_tube: Labs

- **VFileUpload:** adding/replacing files with dropzone click ([#22741](https://github.com/vuetifyjs/vuetify/issues/22741)) ([86f3568](https://github.com/vuetifyjs/vuetify/commit/86f3568444bfe7e93d7c1028e870a0cd3445c54c)), closes [#22737](https://github.com/vuetifyjs/vuetify/issues/22737)

## v4.0.3 - 2026-03-19T08:37:27Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v4.0.3

### :wrench: Bug Fixes

- **hotkey:** resilient sequence parsing ([#22704](https://github.com/vuetifyjs/vuetify/issues/22704)) ([cae1cea](https://github.com/vuetifyjs/vuetify/commit/cae1cea2caa8f369c3012001bd9a77cf508b22fa)), closes [#22399](https://github.com/vuetifyjs/vuetify/issues/22399)
- **md2:** restore correct global rounding ([6d1ef04](https://github.com/vuetifyjs/vuetify/commit/6d1ef04d5ea3978093a544d2c2c365178cac69f6)), closes [#22707](https://github.com/vuetifyjs/vuetify/issues/22707)
- **VDataTable:** reactive items from `expanded` with `return-object` ([5d7af2c](https://github.com/vuetifyjs/vuetify/commit/5d7af2c5c5ac9f62bce229c4852ff18afba9634c)), closes [#22189](https://github.com/vuetifyjs/vuetify/issues/22189)
- **VExpansionPanels:** apply `rounded` only to the first and last panel when closed ([dbc7421](https://github.com/vuetifyjs/vuetify/commit/dbc7421bf7f13b44f7e61b94a659eb41ba80211c)), closes [#22722](https://github.com/vuetifyjs/vuetify/issues/22722)
- **VGrid:** restore `no-gutters` instead of mapping to "compact" ([947d7d5](https://github.com/vuetifyjs/vuetify/commit/947d7d58f259f88c08b6fec4f9794455069875a5))
- **VSkeletonLoader:** less jitter when scrolling on slow device ([468ba31](https://github.com/vuetifyjs/vuetify/commit/468ba314ff22f6a11f84ddbc5f52057c7f920ac0))
- **VTooltip:** correct selector for non-interactive tooltips ([15b3cbd](https://github.com/vuetifyjs/vuetify/commit/15b3cbdf92841a363138c88ac721c2361794d7e2)), closes [#22724](https://github.com/vuetifyjs/vuetify/issues/22724) [#22726](https://github.com/vuetifyjs/vuetify/issues/22726)

### :test_tube: Labs

- **VMaskInput:** accept escaped characters in mask ([#22727](https://github.com/vuetifyjs/vuetify/issues/22727)) ([a5d1116](https://github.com/vuetifyjs/vuetify/commit/a5d1116eabd516f87dbc12dbdad083a0c6afac25))
- ✨ **VProgress:** create new component ([#22682](https://github.com/vuetifyjs/vuetify/issues/22682)) ([122cdeb](https://github.com/vuetifyjs/vuetify/commit/122cdeb2a8c8433bd4253e4b1e00ae1ad1f2c58b)), closes [#22256](https://github.com/vuetifyjs/vuetify/issues/22256)
- **VVideo:** add `hide-progress-bar` prop ([#22636](https://github.com/vuetifyjs/vuetify/issues/22636)) ([0e5a2cb](https://github.com/vuetifyjs/vuetify/commit/0e5a2cbefa89b07e9a348ef967cc17795c3fdc12)), closes [#22633](https://github.com/vuetifyjs/vuetify/issues/22633)
- **VVideo:** add `src-object` prop for MediaStream/WebRTC ([#22670](https://github.com/vuetifyjs/vuetify/issues/22670)) ([575e7c5](https://github.com/vuetifyjs/vuetify/commit/575e7c5fc4a33651fa0c74b63ba569bbdec30141)), closes [#22568](https://github.com/vuetifyjs/vuetify/issues/22568)

## v4.0.2 - 2026-03-12T02:25:12Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v4.0.2

### :rocket: Features

- **icons:** add Material Symbols iconset via UnoCSS ([#22680](https://github.com/vuetifyjs/vuetify/issues/22680)) ([6c463c1](https://github.com/vuetifyjs/vuetify/commit/6c463c1ef3db46a923112e269e73abccdd628436)), closes [#20053](https://github.com/vuetifyjs/vuetify/issues/20053)
- **VDataTable:** expose prevPage, nextPage, setPage in bottom slot ([#22681](https://github.com/vuetifyjs/vuetify/issues/22681)) ([4d1aa79](https://github.com/vuetifyjs/vuetify/commit/4d1aa7981040d5ee4ae71719846277408c286d2a))

### :wrench: Bug Fixes

- **hotkey:** add delimiter aliases without delimiter ambiguity ([#22635](https://github.com/vuetifyjs/vuetify/issues/22635)) ([a639698](https://github.com/vuetifyjs/vuetify/commit/a639698b4c7a6ed2ce3aae9a7209e8654cc39b62))
- **rounded:** add missing "md" size ([#22679](https://github.com/vuetifyjs/vuetify/issues/22679)) ([47cffdd](https://github.com/vuetifyjs/vuetify/commit/47cffdd44f14b7679eb2c5eb447ca06ebd174b5f))
- **router:** replace `next()` deprecated in Vue Router v5 ([#22643](https://github.com/vuetifyjs/vuetify/issues/22643)) ([87c4129](https://github.com/vuetifyjs/vuetify/commit/87c4129f1094b890788e319fc6fb073751eab576)), closes [#22632](https://github.com/vuetifyjs/vuetify/issues/22632)
- **VDataTable:** respect disableSort prop for sortable header ([#22684](https://github.com/vuetifyjs/vuetify/issues/22684)) ([767b0e8](https://github.com/vuetifyjs/vuetify/commit/767b0e8679a55e9d6b141e02a029834c7eca2458)), closes [#22523](https://github.com/vuetifyjs/vuetify/issues/22523)
- **VFileInput:** correct VField ref type ([41a6063](https://github.com/vuetifyjs/vuetify/commit/41a6063a86a849c0ff13c560672a360c68db2d8f)), closes [#22309](https://github.com/vuetifyjs/vuetify/issues/22309)
- **VGrid:** avoid warning about no-gutters being deprecated - it is not ([5d8ec63](https://github.com/vuetifyjs/vuetify/commit/5d8ec6393acb431c8fed96dbcba5e8c5e7e5e79a))
- **VNavigationDrawer:** fully clip list item text in rail mode ([6b448cd](https://github.com/vuetifyjs/vuetify/commit/6b448cdbd950f4fa17187821274a23cd130d5108)), closes [#22564](https://github.com/vuetifyjs/vuetify/issues/22564) [#22564](https://github.com/vuetifyjs/vuetify/issues/22564)
- **VNumberInput:** prevent input changes when readonly ([#22692](https://github.com/vuetifyjs/vuetify/issues/22692)) ([2b1ed0d](https://github.com/vuetifyjs/vuetify/commit/2b1ed0d14b52f399475e7aa853cb418e815428fd)), closes [#22677](https://github.com/vuetifyjs/vuetify/issues/22677)
- **VSelect/VAutocomplete/VCombobox:** let focus leave to other fields ([51196cf](https://github.com/vuetifyjs/vuetify/commit/51196cfc0d50f7af9c642b13b2416abdb7fdf87e)), closes [#22697](https://github.com/vuetifyjs/vuetify/issues/22697)
- **VTextarea:** correct VField ref type ([0d689aa](https://github.com/vuetifyjs/vuetify/commit/0d689aa2e052dae089cd5b8952dad5ca6b9e12e3))
- **VTimePicker:** keep hour value when changing AM/PM ([b030df8](https://github.com/vuetifyjs/vuetify/commit/b030df8e77bcea0e21af687193f6a5165e2c55ab))

### :test_tube: Labs

- **VAvatarGroup:** ❗ change the `limit` behavior to cover overflow item ([e580ebc](https://github.com/vuetifyjs/vuetify/commit/e580ebc290ce9ce032df44c79eaf1b45246977ca)), closes [#22702](https://github.com/vuetifyjs/vuetify/issues/22702) [#22703](https://github.com/vuetifyjs/vuetify/issues/22703)
- **VCommandPalette:** add closeOnSelect prop and before-select event ([#22634](https://github.com/vuetifyjs/vuetify/issues/22634)) ([d534f79](https://github.com/vuetifyjs/vuetify/commit/d534f79a0d23ed025bfe55c9b32101ca5e622157))
- **VCommandPalette:** correct name of the inner component ([bfed30c](https://github.com/vuetifyjs/vuetify/commit/bfed30c518ffd270a0360b5b33314c192b764d90))

## v3.12.3 - 2026-03-12T02:20:03Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.12.3

### :wrench: Bug Fixes

- **hotkey:** add delimiter aliases without delimiter ambiguity ([#22635](https://github.com/vuetifyjs/vuetify/issues/22635)) ([0e6a9c6](https://github.com/vuetifyjs/vuetify/commit/0e6a9c664faa05dabaf6f6c41746b5dc85d61f87)), closes [#22399](https://github.com/vuetifyjs/vuetify/issues/22399)
- **router:** replace `next()` deprecated in Vue Router v5 ([#22643](https://github.com/vuetifyjs/vuetify/issues/22643)) ([4e93846](https://github.com/vuetifyjs/vuetify/commit/4e9384629db0b4301daeb1a3ade8d6a982cbbdc0)), closes [#22632](https://github.com/vuetifyjs/vuetify/issues/22632)
- **VNavigationDrawer:** fully clip list item text in rail mode ([ab42b13](https://github.com/vuetifyjs/vuetify/commit/ab42b13e037070b544d97f865b5b08c9e4d287d3)), closes [#22564](https://github.com/vuetifyjs/vuetify/issues/22564) [#22564](https://github.com/vuetifyjs/vuetify/issues/22564)
- **VNumberInput:** prevent input changes when readonly ([#22692](https://github.com/vuetifyjs/vuetify/issues/22692)) ([995989c](https://github.com/vuetifyjs/vuetify/commit/995989c257cb9d35e598fe328c5638a874c211ca)), closes [#22677](https://github.com/vuetifyjs/vuetify/issues/22677)
- **VSelect/VAutocomplete/VCombobox:** let focus leave to other fields ([3d33e2f](https://github.com/vuetifyjs/vuetify/commit/3d33e2f0f1606b984df736bcafbc2b280cb4202e)), closes [#22697](https://github.com/vuetifyjs/vuetify/issues/22697)
- **VTimePicker:** keep hour value when changing AM/PM ([2c9cb0a](https://github.com/vuetifyjs/vuetify/commit/2c9cb0a8f56e990cbe47f2da9c0b680dd6a8e4af)), closes [#22678](https://github.com/vuetifyjs/vuetify/issues/22678)

### :test_tube: Labs

- **VAvatarGroup:** ❗ change the `limit` behavior to cover overflow item ([5aefdac](https://github.com/vuetifyjs/vuetify/commit/5aefdac2862831e95264f32d633d66b485b0123a)), closes [#22702](https://github.com/vuetifyjs/vuetify/issues/22702) [#22703](https://github.com/vuetifyjs/vuetify/issues/22703)

## v4.0.1 - 2026-03-04T03:41:46Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v4.0.1

### :rocket: Features

- **icons:** add more iconsets based on UnoCSS ([#22668](https://github.com/vuetifyjs/vuetify/issues/22668)) ([6c8bea5](https://github.com/vuetifyjs/vuetify/commit/6c8bea538a156e299420a5f745a77ec5a583a860))
- **styles:** CSS variables for fonts ([#22666](https://github.com/vuetifyjs/vuetify/issues/22666)) ([84495a3](https://github.com/vuetifyjs/vuetify/commit/84495a36abd84a30b284fb3dd6e3ed0912bb3b67))

### :wrench: Bug Fixes

- **theme:** put theme stylesheet in body when loaded with unhead ([2475a28](https://github.com/vuetifyjs/vuetify/commit/2475a28426470bd966f59ad5864cdbddd457b09f))
- **VBadge:** correct props.dotSize fallback ([a71f396](https://github.com/vuetifyjs/vuetify/commit/a71f396452ff7db9c69bcc0cb234457348c3f7c0)), closes [#22658](https://github.com/vuetifyjs/vuetify/issues/22658)
- **VColorPicker:** align sliders with controls ([0d1ce90](https://github.com/vuetifyjs/vuetify/commit/0d1ce904904a37f1481f4be1d7343c54e5c931f6))
- **VDataTable:** improvements for sorting in mobile mode ([54affe1](https://github.com/vuetifyjs/vuetify/commit/54affe12842475d79d6edde8e13d4d0a397f5e1b)), closes [#22288](https://github.com/vuetifyjs/vuetify/issues/22288) [#22426](https://github.com/vuetifyjs/vuetify/issues/22426)
- **VDataTable:** keep fixed cells opaque when loading ([ddca6ca](https://github.com/vuetifyjs/vuetify/commit/ddca6ca70277654db48ca744f8629327536063f9)), closes [#21557](https://github.com/vuetifyjs/vuetify/issues/21557)
- **VGrid:** correct mapping for grid gap x/y ([65b4278](https://github.com/vuetifyjs/vuetify/commit/65b4278014189fae3dfde45202bebaf0118a5701))
- **VOtpInput:** handle deletion via onBeforeinput for mobile compatibility ([#22657](https://github.com/vuetifyjs/vuetify/issues/22657)) ([2f8a4f9](https://github.com/vuetifyjs/vuetify/commit/2f8a4f9220becb92d6b8f9af28d54cca281cc04c)), closes [#22628](https://github.com/vuetifyjs/vuetify/issues/22628)
- **VPagination:** suppress browser spacing ([a6b7b93](https://github.com/vuetifyjs/vuetify/commit/a6b7b93c15fddd7884cc3c916fbce3942c7ce722))
- **VSelect:** fix screenreader navigation to select options ([#22602](https://github.com/vuetifyjs/vuetify/issues/22602)) ([6c962b7](https://github.com/vuetifyjs/vuetify/commit/6c962b787735a0b0898d6fe439c4dd306a6e1e3a)), closes [#22226](https://github.com/vuetifyjs/vuetify/issues/22226)
- **VSlideGroup:** don't read dom attributes in computed() ([a51b313](https://github.com/vuetifyjs/vuetify/commit/a51b313ec09d7075df353c1c1fa7e9e058a15246)), closes [#22644](https://github.com/vuetifyjs/vuetify/issues/22644)
- **VSlider:** reduce affix margins ([18af2d2](https://github.com/vuetifyjs/vuetify/commit/18af2d239436d97bd7df4a2726689a0630dae8a5))
- **VSnackbar:** opaque background for transparent variants ([#22646](https://github.com/vuetifyjs/vuetify/issues/22646)) ([e83fa88](https://github.com/vuetifyjs/vuetify/commit/e83fa8822633aeb09dfe332e51d6ae84726bf5e8)), closes [#18871](https://github.com/vuetifyjs/vuetify/issues/18871)
- **VTimeline:** keep dot border when using numeric dot size ([6764c95](https://github.com/vuetifyjs/vuetify/commit/6764c950c0bb611f87b53012946f4da10850a5bf)), closes [#22499](https://github.com/vuetifyjs/vuetify/issues/22499)

### :test_tube: Labs

- **VFileUpload:** `hide-browse` should hide divider as well ([84f70ef](https://github.com/vuetifyjs/vuetify/commit/84f70ef734b6cd1d215bd63f2629bc06c1fe2b7a))
- **VFileUpload:** expose `controlRef` for internal `<input />` ([36d3d3c](https://github.com/vuetifyjs/vuetify/commit/36d3d3c9f620406faccca7eb941ff8f751da1127))
- **VFileUpload:** append instead of replacing files when `multiple` ([c93d2b7](https://github.com/vuetifyjs/vuetify/commit/c93d2b71534b845fd71f144d8f4c68058b933210))
- **VFileUpload:** integrate VInput & split internal logic ([#22637](https://github.com/vuetifyjs/vuetify/issues/22637)) ([027ab86](https://github.com/vuetifyjs/vuetify/commit/027ab867cdf11c1d5f640e7cc41a6410cbc8aced))

## v3.12.2 - 2026-03-04T03:45:28Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.12.2

### :wrench: Bug Fixes

- **VDataTable:** improvements for sorting in mobile mode ([c3b3278](https://github.com/vuetifyjs/vuetify/commit/c3b3278e1972abcfcec39a04541556752fad5b1a)), closes [#22288](https://github.com/vuetifyjs/vuetify/issues/22288) [#22426](https://github.com/vuetifyjs/vuetify/issues/22426)
- **VDataTable:** keep fixed cells opaque when loading ([35e1e2c](https://github.com/vuetifyjs/vuetify/commit/35e1e2c238139aaf716d55bb25562bf97c395dcc)), closes [#21557](https://github.com/vuetifyjs/vuetify/issues/21557)
- **VSelect:** fix screenreader navigation to select options ([#22602](https://github.com/vuetifyjs/vuetify/issues/22602)) ([f906336](https://github.com/vuetifyjs/vuetify/commit/f90633656ae531825981f16396482f565f55e681)), closes [#22226](https://github.com/vuetifyjs/vuetify/issues/22226)
- **VTimeline:** keep dot border when using numeric dot size ([9511bc3](https://github.com/vuetifyjs/vuetify/commit/9511bc310a494fc9667164e0256cf560e95b5e12)), closes [#22499](https://github.com/vuetifyjs/vuetify/issues/22499)

### :test_tube: Labs

- **VFileUpload:** `hide-browse` should hide divider as well ([db3b4a2](https://github.com/vuetifyjs/vuetify/commit/db3b4a2647072f2d9c20417b19aa236ac31c6504))
- **VFileUpload:** expose `controlRef` for internal `<input />` ([4a21b87](https://github.com/vuetifyjs/vuetify/commit/4a21b873e627b6692a53747cde9ee1b45be76e18))
- **VFileUpload:** append instead of replacing files when `multiple` ([98f7561](https://github.com/vuetifyjs/vuetify/commit/98f756143a4fe80d462a7bfb7440e91e661fe910))
- **VFileUpload:** integrate VInput & split internal logic ([#22637](https://github.com/vuetifyjs/vuetify/issues/22637)) ([251adb0](https://github.com/vuetifyjs/vuetify/commit/251adb0df9752760fc9f81b9d51958811187e6f2))

## v4.0.0 - 2026-02-23T20:02:28Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v4.0.0

### Supporting Vuetify

- [Documentation](https://vuetifyjs.com/)
- [Upgrade Guide](https://vuetifyjs.com/en/getting-started/upgrade-guide)
- [Report a Bug](https://issues.vuetifyjs.com/)
- [Community Discord](https://community.vuetifyjs.com)

### :rocket: Features

- MD3 typography ([#22557](https://github.com/vuetifyjs/vuetify/issues/22557)) ([311daf4](https://github.com/vuetifyjs/vuetify/commit/311daf433a50aaee8107c0c801e173951bb42fd2))
- MD3 elevation levels ([#22461](https://github.com/vuetifyjs/vuetify/issues/22461)) ([dfce695](https://github.com/vuetifyjs/vuetify/commit/dfce695f8e4124d3ab05313f1def4590a408df4d)), closes [#14198](https://github.com/vuetifyjs/vuetify/issues/14198)
- grid system overhaul ([#21500](https://github.com/vuetifyjs/vuetify/issues/21500)) ([f6d24a9](https://github.com/vuetifyjs/vuetify/commit/f6d24a923479300f55607b33f18114a5c9f724e1)), closes [#8611](https://github.com/vuetifyjs/vuetify/issues/8611)
- **VAvatar:** add `badge` prop + `dot-size` for VBadge ([#22496](https://github.com/vuetifyjs/vuetify/issues/22496)) ([cc9f417](https://github.com/vuetifyjs/vuetify/commit/cc9f417b0e53bc447055f1c35bea34903d6400ab))
- **VCol:** syntax for overriding row size ([#22572](https://github.com/vuetifyjs/vuetify/issues/22572)) ([43e8736](https://github.com/vuetifyjs/vuetify/commit/43e87361ef5ee8a96f5748362ea9379f64cf085b))
- **VRow:** smaller density steps ([#22574](https://github.com/vuetifyjs/vuetify/issues/22574)) ([16b944f](https://github.com/vuetifyjs/vuetify/commit/16b944fd7d842c0ec0f418c3ff9663cfdecd7d06))
- **VSelect/VAutocomplete/VCombobox:** add `menu-elevation` prop ([4605987](https://github.com/vuetifyjs/vuetify/commit/4605987b5a2c099116809aea0a8e67d6640befdd))
- **VSnackbarQueue:** show multiple snackbars ([#22605](https://github.com/vuetifyjs/vuetify/issues/22605)) ([7248d20](https://github.com/vuetifyjs/vuetify/commit/7248d206396eeb321cb124452a63e346f1d2b76a)), closes [#21927](https://github.com/vuetifyjs/vuetify/issues/21927)
- **display:** reduce default breakpoint sizes ([#19759](https://github.com/vuetifyjs/vuetify/issues/19759)) ([853ce33](https://github.com/vuetifyjs/vuetify/commit/853ce33412556e1df2e9472d103f84320b541486))
- **styles:** always use css layers ([f7123c6](https://github.com/vuetifyjs/vuetify/commit/f7123c646a51882f05ac54c7ec67860921e8119f)), closes [#3400](https://github.com/vuetifyjs/vuetify/issues/3400) [#20232](https://github.com/vuetifyjs/vuetify/issues/20232)
- **styles:** flatten layer names ([#22460](https://github.com/vuetifyjs/vuetify/issues/22460)) ([47bc400](https://github.com/vuetifyjs/vuetify/commit/47bc40088fc75bb4ef35c4e05c5a30223927967c)), closes [#22443](https://github.com/vuetifyjs/vuetify/issues/22443)
- **styles:** add separate entry points ([#22396](https://github.com/vuetifyjs/vuetify/issues/22396)) ([f00902c](https://github.com/vuetifyjs/vuetify/commit/f00902ce6aa800bc480eed722c111bcdf3518834)), closes [#20100](https://github.com/vuetifyjs/vuetify/issues/20100)
- **styles:** cut down CSS reset ([#20960](https://github.com/vuetifyjs/vuetify/issues/20960)) ([ae3e8c9](https://github.com/vuetifyjs/vuetify/commit/ae3e8c9bc1322fabc0448ade6e590b8ebd6d168e)), closes [#17633](https://github.com/vuetifyjs/vuetify/issues/17633)
- **styles:** remove overflow-y from reset ([27868d5](https://github.com/vuetifyjs/vuetify/commit/27868d55a4076df62020e2f44e5a815a03ec0c5b)), closes [#1197](https://github.com/vuetifyjs/vuetify/issues/1197)
- **theme:** change default theme to 'system' ([9c8506c](https://github.com/vuetifyjs/vuetify/commit/9c8506c24d04bbe6589539834dcf99305dfd647f))
- **theme:** support transparent colors ([bb49662](https://github.com/vuetifyjs/vuetify/commit/bb49662393070ade0c54d878ec0ad396323b3b48)), closes [#10299](https://github.com/vuetifyjs/vuetify/issues/10299)
- **theme:** remove unimportant option ([e8845ff](https://github.com/vuetifyjs/vuetify/commit/e8845ff98452bd652a5345f65804f3b398937274))
- **VDatePicker:** only emit start and end range values ([#20621](https://github.com/vuetifyjs/vuetify/issues/20621)) ([eef80ad](https://github.com/vuetifyjs/vuetify/commit/eef80ad131d8c5f0620b8e338aaeb5577001e4c7)), closes [#9098](https://github.com/vuetifyjs/vuetify/issues/9098) [#18701](https://github.com/vuetifyjs/vuetify/issues/18701) [#20599](https://github.com/vuetifyjs/vuetify/issues/20599)
- **VForm:** unref values in slot props ([f92ae7a](https://github.com/vuetifyjs/vuetify/commit/f92ae7aee3124499b75bf45635c8193f999f965f)), closes [#18355](https://github.com/vuetifyjs/vuetify/issues/18355)
- **VImg:** pass attributes to the underlying `<img>` ([#22439](https://github.com/vuetifyjs/vuetify/issues/22439)) ([71e01aa](https://github.com/vuetifyjs/vuetify/commit/71e01aaeef32937fd3e1551c7885d9f05bf494ad)), closes [#18860](https://github.com/vuetifyjs/vuetify/issues/18860) [#18907](https://github.com/vuetifyjs/vuetify/issues/18907)
- **VInput:** add `indent-details` prop ([#21265](https://github.com/vuetifyjs/vuetify/issues/21265)) ([f483092](https://github.com/vuetifyjs/vuetify/commit/f4830924a658ac081f9f6205d441832825a26972)), closes [#16679](https://github.com/vuetifyjs/vuetify/issues/16679)
- **VNumberInput:** do not clamp value on mounted ([#21826](https://github.com/vuetifyjs/vuetify/issues/21826)) ([4b4bfa5](https://github.com/vuetifyjs/vuetify/commit/4b4bfa577973de34edcfb858d03d9949b4be6196))
- **VSelect/Autocomplete/Combobox:** rename item to internalItem ([2c1ac25](https://github.com/vuetifyjs/vuetify/commit/2c1ac25e5e6cfd5afac8c685689dce47f855225f)), closes [#18354](https://github.com/vuetifyjs/vuetify/issues/18354)
- **VSnackbar:** remove `multi-line` prop ([#22212](https://github.com/vuetifyjs/vuetify/issues/22212)) ([1371aba](https://github.com/vuetifyjs/vuetify/commit/1371abab8fa5487ff959ad2697eb023b0dfa4820)), closes [#15996](https://github.com/vuetifyjs/vuetify/issues/15996)

### :wrench: Bug Fixes

- **colors:** correct CSS layer name ([47d4b70](https://github.com/vuetifyjs/vuetify/commit/47d4b70316c20993f475fde26ef433652991148a))
- **defaults:** skip undefined values ([2a74859](https://github.com/vuetifyjs/vuetify/commit/2a7485964de4d2756c2eaeac10b5b16efc86ec23)), closes [#17845](https://github.com/vuetifyjs/vuetify/issues/17845)
- **inputs:** restore plain/underlined icon alignment ([5495cca](https://github.com/vuetifyjs/vuetify/commit/5495cca97c85168b314dbf73462120cf84306061))
- **styles:** utilities should override responsive typography ([#22573](https://github.com/vuetifyjs/vuetify/issues/22573)) ([878907f](https://github.com/vuetifyjs/vuetify/commit/878907f9429d53fe60863759a12597b126a19204))
- **VSnackbarQueue:** pause all items when collapsed and hovered ([df63fec](https://github.com/vuetifyjs/vuetify/commit/df63fec23ff88c9fcf9886d8c48731019f786648))
- **theme:** re-merge default variables when themes is set ([a14c763](https://github.com/vuetifyjs/vuetify/commit/a14c7632d538b06c3e98558796f22966323d82b1))
- **theme:** helpers should override theme base ([2690877](https://github.com/vuetifyjs/vuetify/commit/2690877651be0369f0849e5c9e31b5f8841ff26d))
- **theme:** override automatic text color with classes ([#22475](https://github.com/vuetifyjs/vuetify/issues/22475)) ([59b11d5](https://github.com/vuetifyjs/vuetify/commit/59b11d5fcaa0ce62f7febcc644b9a4ed154c5767))
- **theme:** .text- classes always override color from .bg- ([7edf33a](https://github.com/vuetifyjs/vuetify/commit/7edf33a6477a691776275f84b5a8d737c43f5e9f)), closes [#21787](https://github.com/vuetifyjs/vuetify/issues/21787)
- **VContainer:** drop dependency on utility class ([47ca5c8](https://github.com/vuetifyjs/vuetify/commit/47ca5c86842b536d3d5fbe7301dd27c22ec599a3))
- **VCounter:** inherit color (aligns with VMessages) ([#22424](https://github.com/vuetifyjs/vuetify/issues/22424)) ([ecd07b9](https://github.com/vuetifyjs/vuetify/commit/ecd07b9c90f978141ca1292c9ce47b757ca94601))
- **VField:** append/prepend should fill height ([add5d2d](https://github.com/vuetifyjs/vuetify/commit/add5d2d98436ebff3aaebf8cd161e94767d88c5c))
- **VOverlay:** apply scrollbar offset to body and VNavigationDrawer ([ec926d7](https://github.com/vuetifyjs/vuetify/commit/ec926d75ca294e849619572391097d319e9268ea))

### :microscope: Code Refactoring

- **styles:** replace !important with layers ([7484c81](https://github.com/vuetifyjs/vuetify/commit/7484c814ddfb622717c995dbe72c2c230552470a))
- **VBtn:** remove default text transform ([#21079](https://github.com/vuetifyjs/vuetify/issues/21079)) ([712bdd6](https://github.com/vuetifyjs/vuetify/commit/712bdd6b5a8786f58e9da823b157dba6b6839c6d))
- **VBtn:** convert display from grid to flex ([41b7768](https://github.com/vuetifyjs/vuetify/commit/41b7768a0310ea5a5050103ec4e80c1f4ce81a8c))

## v3.12.1 - 2026-02-23T14:40:10Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.12.1

### :arrows_counterclockwise: Reverts

- Revert "fix(VTreeview, VList): reworked indentation and spacing in trees and nested lists (#22589)" ([a9227bc](https://github.com/vuetifyjs/vuetify/commit/a9227bc31ca68e88d9ac5a45c4b01a9cb1ffc5dd))

## v3.12.0 - 2026-02-20T01:49:43Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.12.0

### ❗ Breaking

- **VTreeview, VList:** reworked indentation and spacing in trees and nested lists ([#22589](https://github.com/vuetifyjs/vuetify/issues/22589)) ([19ff6ec](https://github.com/vuetifyjs/vuetify/commit/19ff6ec25fdcf6ee7863aa9afda9a746a0deabb3)), closes [#22587](https://github.com/vuetifyjs/vuetify/issues/22587)

### :rocket: Features

- 🔥 **VSelect/VAutocomplete/VCombobox:** add `menu-header` and `menu-footer` slots ([#22414](https://github.com/vuetifyjs/vuetify/issues/22414)) ([480f17d](https://github.com/vuetifyjs/vuetify/commit/480f17de1364431828f2739164ce741e1d7d69ee)), closes [#22400](https://github.com/vuetifyjs/vuetify/issues/22400)
- **color:** strip `text-*` and `bg-*` to support dynamic utility classes ([#17569](https://github.com/vuetifyjs/vuetify/issues/17569)) ([58be6b1](https://github.com/vuetifyjs/vuetify/commit/58be6b10bdaf0ea9ca6a87d6778b8646cb5994ab))
- **icons:** add `mdi-unocss` icon set ([#22117](https://github.com/vuetifyjs/vuetify/issues/22117)) ([c380a4a](https://github.com/vuetifyjs/vuetify/commit/c380a4ad7e5dc7deef383410993eb1754c5ff5a1))
- **nested:** add branch select strategy ([4fcb72c](https://github.com/vuetifyjs/vuetify/commit/4fcb72c8dfe3dc1fe0a2dafeeb9b59fb52493695)), closes [#22404](https://github.com/vuetifyjs/vuetify/issues/22404)
- **styles:** possibility to opt-out from misc styles ([#22405](https://github.com/vuetifyjs/vuetify/issues/22405)) ([77d02f3](https://github.com/vuetifyjs/vuetify/commit/77d02f39536fed671cedaa3b3de18f1e5802ff0a))
- **transition:** add `hide-on-leave` to expand transitions ([91eebea](https://github.com/vuetifyjs/vuetify/commit/91eebead5510bcab597f4ea363fd62b797cc2b90)), closes [#20461](https://github.com/vuetifyjs/vuetify/issues/20461)
- **transitions:** add `v-expand-both-transition` ([#22570](https://github.com/vuetifyjs/vuetify/issues/22570)) ([b2cfdd9](https://github.com/vuetifyjs/vuetify/commit/b2cfdd957c30e4f1c1db8f04804d8193e0a9b06c)), closes [#22569](https://github.com/vuetifyjs/vuetify/issues/22569)
- **VColorInput, VDateInput:** add `menu-props` pass-through ([289933d](https://github.com/vuetifyjs/vuetify/commit/289933d810d4bef235ad0042bc461a4c0fedac73)), closes [#22548](https://github.com/vuetifyjs/vuetify/issues/22548)
- **VDataIterator:** add `items-length` prop ([#22360](https://github.com/vuetifyjs/vuetify/issues/22360)) ([290836c](https://github.com/vuetifyjs/vuetify/commit/290836cd3bf6d0843b84184f7752b17505831d48)), closes [#19486](https://github.com/vuetifyjs/vuetify/issues/19486)
- **VDataTable:** add `page-by` prop ([#22580](https://github.com/vuetifyjs/vuetify/issues/22580)) ([cfdfe21](https://github.com/vuetifyjs/vuetify/commit/cfdfe212a5eb076e3f75228428b1f781e4607336)), closes [#21880](https://github.com/vuetifyjs/vuetify/issues/21880)
- **VDataTable:** add `sort-icon` prop ([#22521](https://github.com/vuetifyjs/vuetify/issues/22521)) ([3bdf0ea](https://github.com/vuetifyjs/vuetify/commit/3bdf0ead334f860dc98152b465b419c9dc98c1c6)), closes [#21069](https://github.com/vuetifyjs/vuetify/issues/21069)
- **VDatePicker:** support readonly ([#22433](https://github.com/vuetifyjs/vuetify/issues/22433)) ([7dc02f3](https://github.com/vuetifyjs/vuetify/commit/7dc02f37bf159968a3a394de23caa311eb7b0aa2)), closes [#22282](https://github.com/vuetifyjs/vuetify/issues/22282)
- **VImg:** add `image-class` prop ([#22622](https://github.com/vuetifyjs/vuetify/issues/22622)) ([7a34cfa](https://github.com/vuetifyjs/vuetify/commit/7a34cfa6fa79692d46e1056c5f2b1ae1603deca0)), closes [#17229](https://github.com/vuetifyjs/vuetify/issues/17229)
- **VImg:** support `width="fit-content"` to adjust container width to image ratio ([#21414](https://github.com/vuetifyjs/vuetify/issues/21414)) ([1be6782](https://github.com/vuetifyjs/vuetify/commit/1be6782c5d8df5a4439c04714382777318070ea7))
- **VList:** add `navigation-strategy` to control focused item ([#22328](https://github.com/vuetifyjs/vuetify/issues/22328)) ([3815eee](https://github.com/vuetifyjs/vuetify/commit/3815eee2aec3fa729b1d5a40325067c4d1158a88))
- **VListItem:** expose `isDisabled` in slot props ([9d92638](https://github.com/vuetifyjs/vuetify/commit/9d92638e447aef0e39ffefc7ee5d70e38c5596a9))
- **VOtpInput:** add `masked` prop to hide characters ([#20950](https://github.com/vuetifyjs/vuetify/issues/20950)) ([516c5a5](https://github.com/vuetifyjs/vuetify/commit/516c5a537a93f787faa0b15f865a4740f04bcd0c)), closes [#18964](https://github.com/vuetifyjs/vuetify/issues/18964)
- **VOtpInput:** add `density` prop ([#22401](https://github.com/vuetifyjs/vuetify/issues/22401)) ([aca7d30](https://github.com/vuetifyjs/vuetify/commit/aca7d3000cc5e9805d1324a343a7e2e8d91d10bf))
- **VProgressCircular:** add `reveal` prop ([#22502](https://github.com/vuetifyjs/vuetify/issues/22502)) ([64e1f32](https://github.com/vuetifyjs/vuetify/commit/64e1f3228868b4ccfd8bfea842c6cf3ea2bde49e))
- **VSlider:** show thumb slider value on hover ([#22412](https://github.com/vuetifyjs/vuetify/issues/22412)) ([e6971ec](https://github.com/vuetifyjs/vuetify/commit/e6971ec27527b4c0005c3ca33d15054892f78b8a)), closes [#19167](https://github.com/vuetifyjs/vuetify/issues/19167)
- **VToolbar:** add `location` prop ([#22608](https://github.com/vuetifyjs/vuetify/issues/22608)) ([dde8521](https://github.com/vuetifyjs/vuetify/commit/dde852166da920a0c2766bd235acf3354c8228b2)), closes [#21458](https://github.com/vuetifyjs/vuetify/issues/21458) [#22600](https://github.com/vuetifyjs/vuetify/issues/22600) [#21471](https://github.com/vuetifyjs/vuetify/issues/21471)
- **VTreeview:** add `indent-lines-color`, `indent-lines-opacity` ([5e718ad](https://github.com/vuetifyjs/vuetify/commit/5e718adbcd604c8042085040b767480034ddbc67)), closes [#21807](https://github.com/vuetifyjs/vuetify/issues/21807)
- **VWindow:** Add support for keyboard controls ([#22430](https://github.com/vuetifyjs/vuetify/issues/22430)) ([ab5b671](https://github.com/vuetifyjs/vuetify/commit/ab5b67106d3edd9eed69895b3c123c410797748c)), closes [#11544](https://github.com/vuetifyjs/vuetify/issues/11544)

### :wrench: Bug Fixes

- **router:** ensure reactivity for dynamic `to` prop in useLink ([e9e8123](https://github.com/vuetifyjs/vuetify/commit/e9e8123a3eee7e6ce45d256b89d21175099ea815))
- **styles:** skip VRow/VCol styles when using only VContainer or VSpacer ([f899803](https://github.com/vuetifyjs/vuetify/commit/f899803c0ee57b33bdacf9e6a8a6d782b193b638))
- **transitions:** avoid collapsing width with default expand transition ([1ce59af](https://github.com/vuetifyjs/vuetify/commit/1ce59af5a49cce1b696cf87b339c6df0e99007ce)), closes [#22570](https://github.com/vuetifyjs/vuetify/issues/22570)
- **v-intersect:** re-mount on prop updates ([#22556](https://github.com/vuetifyjs/vuetify/issues/22556)) ([6262290](https://github.com/vuetifyjs/vuetify/commit/6262290d24133701d5a6cc83848e2a8fbe092cd3) + [23603a5](https://github.com/vuetifyjs/vuetify/commit/23603a568196df78ad61711c6d33baeab09881aa)), closes [#22554](https://github.com/vuetifyjs/vuetify/issues/22554)

### :test_tube: Labs

- ✨ **VCommandPalette:** add new component ([#22403](https://github.com/vuetifyjs/vuetify/issues/22403)) ([2d4d0df](https://github.com/vuetifyjs/vuetify/commit/2d4d0df64f058a6c98b222b0be5637b3fa40a83c))
- ✨ **VAvatarGroup:** add new component ([#22495](https://github.com/vuetifyjs/vuetify/issues/22495)) ([744978b](https://github.com/vuetifyjs/vuetify/commit/744978bb4b23d93e8bf1c5672f8a4efd27cfcc88))
- **VColorInput:** open picker at readonly ([#22474](https://github.com/vuetifyjs/vuetify/issues/22474)) ([418efed](https://github.com/vuetifyjs/vuetify/commit/418efed652dfe965c253b98b9e2af858c43e1027)), closes [#22473](https://github.com/vuetifyjs/vuetify/issues/22473)
- **VDateInput:** enable opening picker when readonly ([#22434](https://github.com/vuetifyjs/vuetify/issues/22434)) ([c045f1f](https://github.com/vuetifyjs/vuetify/commit/c045f1f4958ecc4b2ea06efc959fcaa67e171d76)), closes [#22116](https://github.com/vuetifyjs/vuetify/issues/22116)

## v3.11.9 - 2026-02-20T01:35:03Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.11.9

### :wrench: Bug Fixes

- **VCard:** accept height when used within a dialog ([#22594](https://github.com/vuetifyjs/vuetify/issues/22594)) ([90369b0](https://github.com/vuetifyjs/vuetify/commit/90369b0abfccefee1daaa29d555a2e87f5cad0db)), closes [#20979](https://github.com/vuetifyjs/vuetify/issues/20979)
- **VColorPicker:** avoid undefined alpha in rgb/hsl output ([#22582](https://github.com/vuetifyjs/vuetify/issues/22582)) ([eb3d201](https://github.com/vuetifyjs/vuetify/commit/eb3d201bf9d8fef93c699e76ba89954d80d68734)), closes [#22567](https://github.com/vuetifyjs/vuetify/issues/22567)
- **VDataTable:** sort icon persists after removing sort via click ([#22595](https://github.com/vuetifyjs/vuetify/issues/22595)) ([1aa5351](https://github.com/vuetifyjs/vuetify/commit/1aa535161e25720791a80611d3526595e284dfab)), closes [#22558](https://github.com/vuetifyjs/vuetify/issues/22558)
- **VListItem:** apply `prepend-gap` to checkbox ([5560f72](https://github.com/vuetifyjs/vuetify/commit/5560f72d5a34c7a299487684925b60cce9be4da0))
- **VSelect:** pass listProps density to VCheckboxBtn in multiple ([#22512](https://github.com/vuetifyjs/vuetify/issues/22512)) ([c7b8b39](https://github.com/vuetifyjs/vuetify/commit/c7b8b39633b4cfe855f4fc18328596bce5bec4d3)), closes [#22525](https://github.com/vuetifyjs/vuetify/issues/22525)
- **VTab:** correct text colors when using `inset` without `slider-color` ([#22614](https://github.com/vuetifyjs/vuetify/issues/22614)) ([0d3fea9](https://github.com/vuetifyjs/vuetify/commit/0d3fea9e79e01a8086c4a6210df024205f8b5362)), closes [#22612](https://github.com/vuetifyjs/vuetify/issues/22612)
- **VTable:** apply $table-header-font-size to th elements ([#22598](https://github.com/vuetifyjs/vuetify/issues/22598)) ([2d281dc](https://github.com/vuetifyjs/vuetify/commit/2d281dc650c611357b18e6c5d0f06a2593b8f73a)), closes [#21002](https://github.com/vuetifyjs/vuetify/issues/21002)
- **VTextField:** allow numeric input starting with -0 ([8a237de](https://github.com/vuetifyjs/vuetify/commit/8a237dea3965210c23ba9252b9c6cdd4fac46ec2)), closes [#22607](https://github.com/vuetifyjs/vuetify/issues/22607)
- **VTimePicker:** enforce allowed values and range in inputs ([#22578](https://github.com/vuetifyjs/vuetify/issues/22578)) ([a3b09cc](https://github.com/vuetifyjs/vuetify/commit/a3b09ccce6645917fcf4fea2544d8b31c7f5724a)), closes [#22606](https://github.com/vuetifyjs/vuetify/issues/22606) [#22576](https://github.com/vuetifyjs/vuetify/issues/22576)
- **VTreeview:** add correct roles and aria attributes ([#22577](https://github.com/vuetifyjs/vuetify/issues/22577)) ([f4bbe1f](https://github.com/vuetifyjs/vuetify/commit/f4bbe1f397ca30bb2ea36235852891016318f514)), closes [#21889](https://github.com/vuetifyjs/vuetify/issues/21889)

### :test_tube: Labs

- **VDateInput:** don't scroll the page when opening 'years' view ([#22613](https://github.com/vuetifyjs/vuetify/issues/22613)) ([6aacfdd](https://github.com/vuetifyjs/vuetify/commit/6aacfddd5f302a3d4c11ce16403149d5a1337ded)), closes [#22581](https://github.com/vuetifyjs/vuetify/issues/22581)

## v3.11.8 - 2026-01-27T08:28:25Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.11.8

### :wrench: Bug Fixes

- **VColorPicker:** prevent glitch hiding canvas on resize ([f4e3172](https://github.com/vuetifyjs/vuetify/commit/f4e31724e33b6958b31de1e6621dcd3c601f1fc3)), closes [#21200](https://github.com/vuetifyjs/vuetify/issues/21200)
- **VField:** bind `for` to only one label at a time ([#22542](https://github.com/vuetifyjs/vuetify/issues/22542)) ([4c0c9fc](https://github.com/vuetifyjs/vuetify/commit/4c0c9fc08a5ec32658098cde6d1e9c89070ca9a3)), closes [#22125](https://github.com/vuetifyjs/vuetify/issues/22125)
- **VListItem:** avoid overlay blinking when deactivating ([d11c6a6](https://github.com/vuetifyjs/vuetify/commit/d11c6a69eca16e8952690e30a900e1e0c3d98704)), closes [#22553](https://github.com/vuetifyjs/vuetify/issues/22553)

## v3.11.7 - 2026-01-20T07:53:07Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.11.7

### :wrench: Bug Fixes

- **inputs:** remove direction prop from unsupported components ([#22519](https://github.com/vuetifyjs/vuetify/issues/22519)) ([1eca6f8](https://github.com/vuetifyjs/vuetify/commit/1eca6f8fade6e7420b621ea413837913bf6ea188))
- **VAutocomplete:** avoid no-items being selectable ([#22509](https://github.com/vuetifyjs/vuetify/issues/22509)) ([36f679c](https://github.com/vuetifyjs/vuetify/commit/36f679ccef976716996cf61482f063d3b4275275))
- **VBreadcrumbs:** drop redundant `item-props` prop ([901061b](https://github.com/vuetifyjs/vuetify/commit/901061b7fb31383f5cd801b6d70c0396ea503ac9))
- **VNumberInput:** prevent inner button overflow when rounded ([#22492](https://github.com/vuetifyjs/vuetify/issues/22492)) ([942ddcc](https://github.com/vuetifyjs/vuetify/commit/942ddcccc83ededd5e5aee36c41b1a0c911a8543)), closes [#22489](https://github.com/vuetifyjs/vuetify/issues/22489)
- **VTabs:** correct slider width with inset and vertical ([0201b64](https://github.com/vuetifyjs/vuetify/commit/0201b641c4d4e427c9de4ebf3209462f457aab40))

## v3.11.6 - 2025-12-30T03:53:51Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.11.6

### :wrench: Bug Fixes

- **VCalendar:** wrap unclamped timeToY ([3b4b5e6](https://github.com/vuetifyjs/vuetify/commit/3b4b5e6607c56e47c5a1d70d35a3a34dd6b7dd9d)), closes [#22413](https://github.com/vuetifyjs/vuetify/issues/22413)
- **VCalendar:** extend start of event on following day ([4f7cc6a](https://github.com/vuetifyjs/vuetify/commit/4f7cc6adea36422fda706ea467c21b9d357cc19e)), closes [#22480](https://github.com/vuetifyjs/vuetify/issues/22480)
- **VColorPicker:** disable swatches ([#22472](https://github.com/vuetifyjs/vuetify/issues/22472)) ([8dbacad](https://github.com/vuetifyjs/vuetify/commit/8dbacadce2f6d4ca9054d80e6fd290f84b429b23)), closes [#22471](https://github.com/vuetifyjs/vuetify/issues/22471)
- **VDatePicker:** accept custom `control-height` ([#22479](https://github.com/vuetifyjs/vuetify/issues/22479)) ([b47a4ce](https://github.com/vuetifyjs/vuetify/commit/b47a4cebaab54f361d5af6d7879f7231822d2bc6)), closes [#22478](https://github.com/vuetifyjs/vuetify/issues/22478)

## v3.11.5 - 2025-12-24T08:15:29Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.11.5

### :wrench: Bug Fixes

- **VDataTableVirtual:** show index from virtualized items ([#22324](https://github.com/vuetifyjs/vuetify/issues/22324)) ([29e3f09](https://github.com/vuetifyjs/vuetify/commit/29e3f09a51764cb96e233008e2ac4ecba3de3496)), closes [#19108](https://github.com/vuetifyjs/vuetify/issues/19108)
- **VList, VTreeview:** item should be selectable when `disabled` changes ([#22464](https://github.com/vuetifyjs/vuetify/issues/22464)) ([d6ca166](https://github.com/vuetifyjs/vuetify/commit/d6ca166607d90c77a940957b52100a7e1cccee2f)), closes [#22366](https://github.com/vuetifyjs/vuetify/issues/22366)
- **VNumberInupt:** respect `error` prop ([69862ea](https://github.com/vuetifyjs/vuetify/commit/69862ea790af6487345655b94a33293262c1111f)), closes [#22451](https://github.com/vuetifyjs/vuetify/issues/22451)
- **VOtpInput:** hide placeholder on focus ([0852c8c](https://github.com/vuetifyjs/vuetify/commit/0852c8c63f7051c129758dddabf018696eb4beb9))
- **VTreeview:** bypass disabled when loading selection state ([#22465](https://github.com/vuetifyjs/vuetify/issues/22465)) ([70dd313](https://github.com/vuetifyjs/vuetify/commit/70dd3133b112c44dd66c13aa36f920842dd64db3)), closes [#22353](https://github.com/vuetifyjs/vuetify/issues/22353)
- **VTreeview:** prevent selection of disabled nodes ([0de4599](https://github.com/vuetifyjs/vuetify/commit/0de4599be0ab0dd3e60f46e26707047b85779e7a)), closes [#22352](https://github.com/vuetifyjs/vuetify/issues/22352)

### :test_tube: Labs

- **VDateInput:** keep focus on input when opened with year view ([b58e361](https://github.com/vuetifyjs/vuetify/commit/b58e361192ea96732688da6b260ce6437f7e5ba5)), closes [#22323](https://github.com/vuetifyjs/vuetify/issues/22323)
- **VDateInput:** hide empty prepend slot ([28fe71e](https://github.com/vuetifyjs/vuetify/commit/28fe71e0ade7c5e71f8f2abff35c992d0f267d91)), closes [#22456](https://github.com/vuetifyjs/vuetify/issues/22456)
- **VDateInput:** clickable prepend icon when handler exists ([776a462](https://github.com/vuetifyjs/vuetify/commit/776a4626803d8051d26680d1f68ed97362c3fa98))
- **VStepperVertical:** restore default opacity of item title ([f30a081](https://github.com/vuetifyjs/vuetify/commit/f30a0816e2e508cba5af55b3a80ff0790c45e860)), closes [#22467](https://github.com/vuetifyjs/vuetify/issues/22467)

## v3.11.4 - 2025-12-16T11:34:35Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.11.4

### :wrench: Bug Fixes

- **fields:** keep `inert` on root element ([8dea3bc](https://github.com/vuetifyjs/vuetify/commit/8dea3bcd7e9c63026349eae1d2e74891be307551))
- **VSelect:** clear on backspace ([#22435](https://github.com/vuetifyjs/vuetify/issues/22435)) ([f90f8ab](https://github.com/vuetifyjs/vuetify/commit/f90f8aba2b527211de8248c6dca6474d45b54b8a)), closes [#22422](https://github.com/vuetifyjs/vuetify/issues/22422)
- **VSelects:** restore `appendInnerIcon` rendering ([#22431](https://github.com/vuetifyjs/vuetify/issues/22431)) ([5e9fa29](https://github.com/vuetifyjs/vuetify/commit/5e9fa29d29bb22393dac0b387b2dab968fcdfab9)), closes [#22429](https://github.com/vuetifyjs/vuetify/issues/22429)
- **VSlider:** pass `aria-` attributes to thumb element ([#22444](https://github.com/vuetifyjs/vuetify/issues/22444)) ([83b55f5](https://github.com/vuetifyjs/vuetify/commit/83b55f5aebf020b8d8501232afc39de4e761c5d5)), closes [#22432](https://github.com/vuetifyjs/vuetify/issues/22432)

### :microscope: Code Refactoring

- **styles:** replace `if()` with `@if` ([5391930](https://github.com/vuetifyjs/vuetify/commit/539193001b66b1ee40300d541341c0b3adfb8bce)), closes [#22421](https://github.com/vuetifyjs/vuetify/issues/22421)

### :test_tube: Labs

- **VColorInput, VDateInput:** add `picker-props` ([#22437](https://github.com/vuetifyjs/vuetify/issues/22437)) ([ea6d861](https://github.com/vuetifyjs/vuetify/commit/ea6d861c79dc80722e27062909149e9fd02e3929)), closes [#22436](https://github.com/vuetifyjs/vuetify/issues/22436)
- **VDateInput,VMaskInput:** add specific classes ([#22447](https://github.com/vuetifyjs/vuetify/issues/22447)) ([f539630](https://github.com/vuetifyjs/vuetify/commit/f5396301128e36f2d65cb4f5af92ee4a3b76afe3)), closes [#22334](https://github.com/vuetifyjs/vuetify/issues/22334)
- **VDateInput:** make `prepend-icon` unfocusable ([#22445](https://github.com/vuetifyjs/vuetify/issues/22445)) ([c917533](https://github.com/vuetifyjs/vuetify/commit/c9175333361bd8160c93b11c9782735b68331107)), closes [#22333](https://github.com/vuetifyjs/vuetify/issues/22333)

## v3.11.3 - 2025-12-09T12:10:22Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.11.3

### :wrench: Bug Fixes

- **fields:** clean up aria attributes ([#22418](https://github.com/vuetifyjs/vuetify/issues/22418)) ([054dbf4](https://github.com/vuetifyjs/vuetify/commit/054dbf488ac3da61e4aabd8c5a21eb5fd8f34a5d))
- **types:** support strict TS checks in templates ([#22395](https://github.com/vuetifyjs/vuetify/issues/22395)) ([02710a6](https://github.com/vuetifyjs/vuetify/commit/02710a62d16d616f716181fd9b99c4402ce22110))
- **v-ripple:** remove mousedown and keydown listeners on unmount ([278a7e9](https://github.com/vuetifyjs/vuetify/commit/278a7e9c8fe2d4b2ea237e82bf20e8e5f1e95e4c))
- **VAppBar:** prevent navbar pop-up when reaching page bottom ([#22224](https://github.com/vuetifyjs/vuetify/issues/22224)) ([8da1495](https://github.com/vuetifyjs/vuetify/commit/8da1495bbe893291c6c91f54616de92540a94301)), closes [#20352](https://github.com/vuetifyjs/vuetify/issues/20352)
- **VAutocomplete, VCombobox:** skip subheader for `auto-select-first` ([#22402](https://github.com/vuetifyjs/vuetify/issues/22402)) ([9edd98c](https://github.com/vuetifyjs/vuetify/commit/9edd98cf18814597aef453f1916a571118a6d696)), closes [#22398](https://github.com/vuetifyjs/vuetify/issues/22398)
- **VBtn:** keep all styles within CSS layer ([c794da1](https://github.com/vuetifyjs/vuetify/commit/c794da1ced5067e47a3b2c404797ce53a94fe91b))
- **VColorPicker:** render inner outlines in forced-colors mode ([#22317](https://github.com/vuetifyjs/vuetify/issues/22317)) ([c61c0d3](https://github.com/vuetifyjs/vuetify/commit/c61c0d3678ad64fc53c068d2414ae07887666682))
- **VDataTable:** selecting group should respect selectable prop ([#22410](https://github.com/vuetifyjs/vuetify/issues/22410)) ([e295fa6](https://github.com/vuetifyjs/vuetify/commit/e295fa60bd6c6427b34f3531373ce0fa938cbbcd)), closes [#22409](https://github.com/vuetifyjs/vuetify/issues/22409)
- **VDataTable:** typo in header field `intent` » `indent` ([f44b2fd](https://github.com/vuetifyjs/vuetify/commit/f44b2fd24ad5e04814b5ed9498821726d319045e))
- **VDataTableFooter:** correct placement of aria label ([#22359](https://github.com/vuetifyjs/vuetify/issues/22359)) ([137cb95](https://github.com/vuetifyjs/vuetify/commit/137cb95e99ad7a1037e59709d26fe3ef609e0872)), closes [#20896](https://github.com/vuetifyjs/vuetify/issues/20896)
- **VDatePicker:** correct year and month for jalali ([41067af](https://github.com/vuetifyjs/vuetify/commit/41067afd4fb8030ac7627ede62875f29091a1d4a)), closes [#22417](https://github.com/vuetifyjs/vuetify/issues/22417)
- **VDatePicker:** correct next year button disabled condition ([04a4608](https://github.com/vuetifyjs/vuetify/commit/04a4608cb9e6e352efb54dedd184e06debeaa77f)), closes [#22408](https://github.com/vuetifyjs/vuetify/issues/22408)
- **VHotkey:** avoid build errors when customizing VKbd sass variables ([fa1fb4f](https://github.com/vuetifyjs/vuetify/commit/fa1fb4f3c55c8582670bdee4796b3df9190f02f9)), closes [#22372](https://github.com/vuetifyjs/vuetify/issues/22372)
- **VInput:** prioritize slots over prepend/append icons ([#22406](https://github.com/vuetifyjs/vuetify/issues/22406)) ([2a998ee](https://github.com/vuetifyjs/vuetify/commit/2a998ee49ed6f3e93d62d0935e41700b14b1184f)), closes [#22332](https://github.com/vuetifyjs/vuetify/issues/22332)
- **VNumberInput:** clean up listeners on unmount ([045bbaf](https://github.com/vuetifyjs/vuetify/commit/045bbafc89da61bd03b42aea16906375944e1123))
- **VOtpInput:** apply rounded prop to inner fields ([#21499](https://github.com/vuetifyjs/vuetify/issues/21499)) ([f49803a](https://github.com/vuetifyjs/vuetify/commit/f49803a8e8af5c95b0836eef68daae01c126163d)), closes [#20286](https://github.com/vuetifyjs/vuetify/issues/20286)
- **VOverlay:** clean up focus trap listeners and data on unmount ([497ae4b](https://github.com/vuetifyjs/vuetify/commit/497ae4be510a244df5606684d86bee97efc5d88b)), closes [#22397](https://github.com/vuetifyjs/vuetify/issues/22397)
- **VSelect:** don't skip continuing keyboard lookup match ([f1f3c45](https://github.com/vuetifyjs/vuetify/commit/f1f3c45b32ed79d1e436224de26c42f64d217c3b)), closes [#22423](https://github.com/vuetifyjs/vuetify/issues/22423)
- **VSelects:** no closable chips when `readonly` or `disabled` ([#22368](https://github.com/vuetifyjs/vuetify/issues/22368)) ([21c85eb](https://github.com/vuetifyjs/vuetify/commit/21c85eb458eefbaa96695a48db1a32eda707e301)), closes [#22349](https://github.com/vuetifyjs/vuetify/issues/22349)
- **VSlider:** clean up listeners on unmount ([f2621a3](https://github.com/vuetifyjs/vuetify/commit/f2621a31932b0d57661ee5ef83b5ca14215fab25))
- **VTextarea:** avoid placeholder obstructing the label ([27e854f](https://github.com/vuetifyjs/vuetify/commit/27e854ffc2e4f8119b631709aea115f3d5dbf398)), closes [#22416](https://github.com/vuetifyjs/vuetify/issues/22416)
- **VTextArea/VSelects:** help screen readers read field labels ([#20339](https://github.com/vuetifyjs/vuetify/issues/20339)) ([04b6725](https://github.com/vuetifyjs/vuetify/commit/04b67258aecb8edf47e4a915f44646ea3835c797)), closes [#19155](https://github.com/vuetifyjs/vuetify/issues/19155) [#19156](https://github.com/vuetifyjs/vuetify/issues/19156)
- **VTimePicker:** don't inherit defaults from VTextField ([3ffa749](https://github.com/vuetifyjs/vuetify/commit/3ffa749ee5c2fb2bdc7c2d6141a4ff70029ccc4d)), closes [#22407](https://github.com/vuetifyjs/vuetify/issues/22407)
- **VTimePicker:** clean up listeners on unmount ([60183d7](https://github.com/vuetifyjs/vuetify/commit/60183d74608059d74778b941222bcd015c32abf2))
- **VTooltip:** should be dismissable by default ([#22419](https://github.com/vuetifyjs/vuetify/issues/22419)) ([c5ae129](https://github.com/vuetifyjs/vuetify/commit/c5ae129b1648c089d74153d89041d8d8f862e2d8)), closes [#21501](https://github.com/vuetifyjs/vuetify/issues/21501)
- **VVirtualScroll:** show more than 1 element when min height is 0 ([#22420](https://github.com/vuetifyjs/vuetify/issues/22420)) ([08550fd](https://github.com/vuetifyjs/vuetify/commit/08550fda4b85f348a203fc8bce807107760b1ad5))
- **VWindow:** set transition-duration css variable ([4676b6d](https://github.com/vuetifyjs/vuetify/commit/4676b6dbef1f550aa6e712599403c0ad6946d40d))

### :test_tube: Labs

- **VVideo:** clean up listeners on unmount ([0d37af0](https://github.com/vuetifyjs/vuetify/commit/0d37af0dba43ee9eff1d26ccdffb46cb2dd38afd))

## v3.11.2 - 2025-12-03T05:31:19Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.11.2

### :wrench: Bug Fixes

- **VDataTable:** hide checkbox for `mobile` without `show-select` ([d297f3f](https://github.com/vuetifyjs/vuetify/commit/d297f3f97e7a4adb908eab50eb1abaead912fc8a)), closes [#22375](https://github.com/vuetifyjs/vuetify/issues/22375)
- **VDataTable:** hover icon should match `initial-sort-order` ([7a1ae83](https://github.com/vuetifyjs/vuetify/commit/7a1ae83b535c1a7deb8080e94a14f47da6e8ad37))
- **VDatePicker:** correctly render month when using Luxon adapter ([f98d9db](https://github.com/vuetifyjs/vuetify/commit/f98d9db02abbe2addc2aec96cfb444b06ace3e4c)), closes [#22388](https://github.com/vuetifyjs/vuetify/issues/22388) [#22389](https://github.com/vuetifyjs/vuetify/issues/22389)
- **VHotkey:** correct sass variables import order ([216b872](https://github.com/vuetifyjs/vuetify/commit/216b8724908e9db2efb6a5110393112615868e68)), closes [#22372](https://github.com/vuetifyjs/vuetify/issues/22372)
- **VNumberInput:** avoid error state when using comma separator ([513e153](https://github.com/vuetifyjs/vuetify/commit/513e1530e79d465815f4eddeb52dbb21c7c37b84)), closes [#22371](https://github.com/vuetifyjs/vuetify/issues/22371)
- **VSlideGroup:** provide a way to never show arrows ([b76ffd5](https://github.com/vuetifyjs/vuetify/commit/b76ffd5b64e53e2f5cc67c6ef37f1bcba2b609ce))
- **VTabs:** consistent padding for `inset` ([893eb71](https://github.com/vuetifyjs/vuetify/commit/893eb7105a5e77b31ce65d301d4717adad860f1d))
- **VTabs:** keep slider narrow when used without inset ([eb9477c](https://github.com/vuetifyjs/vuetify/commit/eb9477ccbe6cfc552ef1a61d998c312bac95c106)), closes [#22363](https://github.com/vuetifyjs/vuetify/issues/22363)
- **VTextField:** check autofocus intersection on input wrapper element ([0409cde](https://github.com/vuetifyjs/vuetify/commit/0409cdec89e78ea9fd65aca1085605be72d11353)), closes [#22373](https://github.com/vuetifyjs/vuetify/issues/22373)

### :test_tube: Labs

- **VStepperVertical:** avoid semi-transparent items with `non-linear` ([99a68e5](https://github.com/vuetifyjs/vuetify/commit/99a68e54df1cf3db0972f59fa949804d231cda9f)), closes [#22369](https://github.com/vuetifyjs/vuetify/issues/22369)

## v3.11.0 - 2025-11-25T02:07:27Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.11.0

### Release Notes

- [VCalendar](https://vuetifyjs.com/en/components/calendars/)
- [VHotkey](https://vuetifyjs.com/en/components/hotkeys/)

### :rocket: Features

- **theme:** add layers option ([#22215](https://github.com/vuetifyjs/vuetify/issues/22215)) ([79e00cc](https://github.com/vuetifyjs/vuetify/commit/79e00cc85f36ea84a39325796bccd664ae4eb054))
- **VBreadcrumbs:** pass props and width to items ([#22213](https://github.com/vuetifyjs/vuetify/issues/22213)) ([a8751b2](https://github.com/vuetifyjs/vuetify/commit/a8751b28a5928e72c61ac8935aa474a989b5f8fb)), closes [#12249](https://github.com/vuetifyjs/vuetify/issues/12249)
- **VCalendar:** promote from labs ([fc8f0b7](https://github.com/vuetifyjs/vuetify/commit/fc8f0b7b722279c7d1ee50f38e5626eef70d3a23))
- **VCombobox:** create new items when pasting with line breaks ([#22304](https://github.com/vuetifyjs/vuetify/issues/22304)) ([7c53fa0](https://github.com/vuetifyjs/vuetify/commit/7c53fa0fb4112d542b77708a88d81801815d76bd)), closes [#10813](https://github.com/vuetifyjs/vuetify/issues/10813)
- **VDataTable:** apply `color` to internal controls ([#22157](https://github.com/vuetifyjs/vuetify/issues/22157)) ([0b3315d](https://github.com/vuetifyjs/vuetify/commit/0b3315dbbca435fde236a1e3859bdcf5ef403c9a)), closes [#22097](https://github.com/vuetifyjs/vuetify/issues/22097) [#19700](https://github.com/vuetifyjs/vuetify/issues/19700)
- **VDataTable:** add `initial-sort-order` prop ([#22156](https://github.com/vuetifyjs/vuetify/issues/22156)) ([b2f632f](https://github.com/vuetifyjs/vuetify/commit/b2f632fceb3b89e412eae09ed8de2af50b13f168)), closes [#11117](https://github.com/vuetifyjs/vuetify/issues/11117) [#20615](https://github.com/vuetifyjs/vuetify/issues/20615)
- **VDataTable:** multi-sort mode and keyboard modifiers ([#22133](https://github.com/vuetifyjs/vuetify/issues/22133)) ([54bbc84](https://github.com/vuetifyjs/vuetify/commit/54bbc84d5447b08f37a11c276cad68e35b045701)), closes [#22132](https://github.com/vuetifyjs/vuetify/issues/22132)
- **VDatePicker:** align control variants with MD3 ([#21589](https://github.com/vuetifyjs/vuetify/issues/21589)) ([5337a8b](https://github.com/vuetifyjs/vuetify/commit/5337a8b1bd528d7c17d0931358d9a812499572e8)), closes [#20717](https://github.com/vuetifyjs/vuetify/issues/20717)
- **VDatePicker:** add events and event-color support ([#20965](https://github.com/vuetifyjs/vuetify/issues/20965)) ([22dfb1b](https://github.com/vuetifyjs/vuetify/commit/22dfb1b4e9306ab3307c6cc2f2237c234aa07074)), closes [#19296](https://github.com/vuetifyjs/vuetify/issues/19296)
- **VDivider:** add `content-offset` prop ([e6b6284](https://github.com/vuetifyjs/vuetify/commit/e6b6284378ec36b78ac6097368d72c3ff0fb47ab))
- **VDivider:** add `variant` prop ([8a6c279](https://github.com/vuetifyjs/vuetify/commit/8a6c279e2db104e330287b66abad0027c8da9f69))
- **VDivider:** add `gradient` prop ([60367cd](https://github.com/vuetifyjs/vuetify/commit/60367cdd21e874851a9ce3faabb83a54f1140965))
- **VList:** add `prepend-gap` and `indent` props ([#20616](https://github.com/vuetifyjs/vuetify/issues/20616)) ([bd4a87b](https://github.com/vuetifyjs/vuetify/commit/bd4a87bb4f1d5bd5bdd40e230ad892464492500b))
- **VNagivationDrawer, VOverlay:** add `retain-focus` prop ([#22106](https://github.com/vuetifyjs/vuetify/issues/22106)) ([d49788b](https://github.com/vuetifyjs/vuetify/commit/d49788bc9a226236d4d6233a1431f7f90dd3d0a2)), closes [#16140](https://github.com/vuetifyjs/vuetify/issues/16140)
- **VNumberInput:** show error state when out of range ([#21825](https://github.com/vuetifyjs/vuetify/issues/21825)) ([2e2cddb](https://github.com/vuetifyjs/vuetify/commit/2e2cddbef8d7f49c8f120d2bd637a7a8597b3fca))
- **VOverlay:** add `viewport-margin` prop ([#22243](https://github.com/vuetifyjs/vuetify/issues/22243)) ([77b77cb](https://github.com/vuetifyjs/vuetify/commit/77b77cba17a5f75cdffa40c9184fce29d8d56504))
- **VProgressCircular:** add `rounded` prop ([#22051](https://github.com/vuetifyjs/vuetify/issues/22051)) ([2bd681d](https://github.com/vuetifyjs/vuetify/commit/2bd681de36b7edfaca515d036aabf4a441f1426a))
- **VStepper:** add new item-props prop ([#20651](https://github.com/vuetifyjs/vuetify/issues/20651)) ([b76d996](https://github.com/vuetifyjs/vuetify/commit/b76d996ad7f44d82ed86cfc9c28b7aaa3d4099ff)), closes [#19036](https://github.com/vuetifyjs/vuetify/issues/19036)
- **VTabs:** add `inset` prop ([#22221](https://github.com/vuetifyjs/vuetify/issues/22221)) ([a90c736](https://github.com/vuetifyjs/vuetify/commit/a90c736cd6b2e5988c113a0fc84dbca7f34221df))
- **VTabs:** add new prop, slider transition ([#19556](https://github.com/vuetifyjs/vuetify/issues/19556)) ([ee4fb38](https://github.com/vuetifyjs/vuetify/commit/ee4fb38bd651bd2192329994204898a0b4084866)), closes [#15798](https://github.com/vuetifyjs/vuetify/issues/15798)
- **VTabs:** slots for prev/next ([#21976](https://github.com/vuetifyjs/vuetify/issues/21976)) ([bb15873](https://github.com/vuetifyjs/vuetify/commit/bb158732eec273edb766ed7a7816a44c54339bdf)), closes [#21969](https://github.com/vuetifyjs/vuetify/issues/21969)
- **VTextarea:** add `max-height` prop ([#22286](https://github.com/vuetifyjs/vuetify/issues/22286)) ([ac35aa7](https://github.com/vuetifyjs/vuetify/commit/ac35aa7edfc288ed7217032dab5144f369b542ab)), closes [#22284](https://github.com/vuetifyjs/vuetify/issues/22284)
- **VTimePicker:** input variant ([#21601](https://github.com/vuetifyjs/vuetify/issues/21601)) ([492b6af](https://github.com/vuetifyjs/vuetify/commit/492b6af0a4970d178df9727828b4ae490491a2ce)), closes [#6957](https://github.com/vuetifyjs/vuetify/issues/6957) [#20714](https://github.com/vuetifyjs/vuetify/issues/20714) [#22056](https://github.com/vuetifyjs/vuetify/issues/22056)
- **VToolbar:** add `collapse-position` prop ([#17937](https://github.com/vuetifyjs/vuetify/issues/17937)) ([b1c2906](https://github.com/vuetifyjs/vuetify/commit/b1c290683aff7d1d143c2a510ac49f760680c7ea)), closes [#11378](https://github.com/vuetifyjs/vuetify/issues/11378)
- **VTreeview:** add `no-data` slot ([#22031](https://github.com/vuetifyjs/vuetify/issues/22031)) ([6ebe9fd](https://github.com/vuetifyjs/vuetify/commit/6ebe9fd29522aef2ee5650b13a85a0e7b56cab00)), closes [#21954](https://github.com/vuetifyjs/vuetify/issues/21954)
- **VTreeview:** add `footer` slot ([#22130](https://github.com/vuetifyjs/vuetify/issues/22130)) ([a87a3fd](https://github.com/vuetifyjs/vuetify/commit/a87a3fdd6197825bd2b08bd36acfed0768744e82)), closes [#22100](https://github.com/vuetifyjs/vuetify/issues/22100)
- **flex:** add justify-items classes ([#22346](https://github.com/vuetifyjs/vuetify/issues/22346)) ([bb30fc2](https://github.com/vuetifyjs/vuetify/commit/bb30fc24098ab0423d0c8586ab2ba470608db664))

### :wrench: Bug Fixes

- **VAutocomplete, VCombobox:** correct cursor for the field ([075855f](https://github.com/vuetifyjs/vuetify/commit/075855f730ddbb9cb50cf5a4e05eba9d7ea7220d))
- **VDatePicker:** adaptable width for month view ([ed53ef7](https://github.com/vuetifyjs/vuetify/commit/ed53ef75235738942bf661ff87560ed9dc84b624))
- **VDatePicker:** support landscape mode ([#22305](https://github.com/vuetifyjs/vuetify/issues/22305)) ([5768788](https://github.com/vuetifyjs/vuetify/commit/5768788459debf6e761ea016a9e67ac5d8afce64)), closes [#18274](https://github.com/vuetifyjs/vuetify/issues/18274) [#20605](https://github.com/vuetifyjs/vuetify/issues/20605)
- **VInfiniteScroll:** hide side element when empty ([#21749](https://github.com/vuetifyjs/vuetify/issues/21749)) ([55f8b52](https://github.com/vuetifyjs/vuetify/commit/55f8b52998d3e19ab2587673805c74c992e8fd82)), closes [#21705](https://github.com/vuetifyjs/vuetify/issues/21705)
- **VRating:** correct keyboard controls ([#22314](https://github.com/vuetifyjs/vuetify/issues/22314)) ([4410e30](https://github.com/vuetifyjs/vuetify/commit/4410e3031805e52dc74b2b41da4b6bc1d720a7ff)), closes [#21561](https://github.com/vuetifyjs/vuetify/issues/21561)
- **VTreeview:** faster interactions with large trees ([#22255](https://github.com/vuetifyjs/vuetify/issues/22255)) ([9d5a1d4](https://github.com/vuetifyjs/vuetify/commit/9d5a1d40a880b95ef3320bb63dd61748bd12b9ca)), closes [#21720](https://github.com/vuetifyjs/vuetify/issues/21720)
- **VTreeview:** `indent-lines` support for `footer` slot ([efa50e4](https://github.com/vuetifyjs/vuetify/commit/efa50e462d082224e6b2c964877da666705c0b70))
- **VCalendar:** expose updateTimes ([c77d2b3](https://github.com/vuetifyjs/vuetify/commit/c77d2b3ae7ed833b7424b27130d31e1efc1a98d6)), closes [#22354](https://github.com/vuetifyjs/vuetify/issues/22354)

### :test_tube: Labs

- **VHotkey:** alignment & sizing consistency ([#22321](https://github.com/vuetifyjs/vuetify/issues/22321)) ([502375c](https://github.com/vuetifyjs/vuetify/commit/502375c9f578576db346265a89296c2f163927a2)), closes [#22289](https://github.com/vuetifyjs/vuetify/issues/22289)
- **VHotkey:** add slash separator ([2369274](https://github.com/vuetifyjs/vuetify/commit/2369274dfe08af419f6fe2e20cc642dbf889f5c1))
- **VHotkey:** respect `display-mode` in PC mode ([62bb4dd](https://github.com/vuetifyjs/vuetify/commit/62bb4dd08c002b4016b11cedc5eea690e74df5bf))

### :rocket: Features

- **VHotkey:** promote from labs ([507f46e](https://github.com/vuetifyjs/vuetify/commit/507f46e4ee57a8e80c61efa5fb3a30f6fd0062a7))
- **VSelect:** apply compatible itemProps to chips ([#22339](https://github.com/vuetifyjs/vuetify/issues/22339)) ([69a2eba](https://github.com/vuetifyjs/vuetify/commit/69a2ebad7ed858578719652add99cb5ad63a4fac)), closes [#22337](https://github.com/vuetifyjs/vuetify/issues/22337)

### :wrench: Bug Fixes

- **VCalendar:** correct interval and event offset with custom firstTime ([#22343](https://github.com/vuetifyjs/vuetify/issues/22343)) ([3cc2502](https://github.com/vuetifyjs/vuetify/commit/3cc25026432630403e15db2748d5d54af17f798a)), closes [#12563](https://github.com/vuetifyjs/vuetify/issues/12563) [#12681](https://github.com/vuetifyjs/vuetify/issues/12681)
- **VCalendar:** calculate week numbers using current locale ([#22341](https://github.com/vuetifyjs/vuetify/issues/22341)) ([4c48d6d](https://github.com/vuetifyjs/vuetify/commit/4c48d6dcb43ec58cd012c622edd5d81890653620)), closes [#22340](https://github.com/vuetifyjs/vuetify/issues/22340)
- **VCalendar:** make current day button outlined ([64b4dae](https://github.com/vuetifyjs/vuetify/commit/64b4dae97ddae161694bd9385639e84ae8ac6901))
- **VCalendar:** day button font size and no active state ([#22336](https://github.com/vuetifyjs/vuetify/issues/22336)) ([c97e034](https://github.com/vuetifyjs/vuetify/commit/c97e03475a969021bea9ce26fc144a4a625ac965)), closes [#22335](https://github.com/vuetifyjs/vuetify/issues/22335)
- **VDatePicker:** ignore model update if same day ([48da580](https://github.com/vuetifyjs/vuetify/commit/48da580a68004d131e6838f3594694a640e61232)), closes [#22338](https://github.com/vuetifyjs/vuetify/issues/22338)
- **VOverlay:** keep content attached to the activator on page with zoom ([3085a93](https://github.com/vuetifyjs/vuetify/commit/3085a93e47d7e28bf7eb3b333e98935964c6b024)), closes [#22326](https://github.com/vuetifyjs/vuetify/issues/22326)
- **VTextField, VTextarea:** keep input visible for password managers ([7ea8810](https://github.com/vuetifyjs/vuetify/commit/7ea8810826f8454e85311bc740c76e4799c33cdc)), closes [#21912](https://github.com/vuetifyjs/vuetify/issues/21912) [#20343](https://github.com/vuetifyjs/vuetify/issues/20343)

### :test_tube: Labs

- **VIconBtn:** align text vertically ([c6a9334](https://github.com/vuetifyjs/vuetify/commit/c6a9334d3c73aade80498782089cfa48ec0ab4ab))

## v3.10.12 - 2025-11-24T17:15:01Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.10.12

### :wrench: Bug Fixes

- **v-tooltip:** prevent showing empty tooltip ([#22347](https://github.com/vuetifyjs/vuetify/issues/22347)) ([045362e](https://github.com/vuetifyjs/vuetify/commit/045362e21a0f3573afcd37e95d45459ba19b47a4)), closes [#22345](https://github.com/vuetifyjs/vuetify/issues/22345)
- **VSelect:** Use hidden input for native form submissions ([#22330](https://github.com/vuetifyjs/vuetify/issues/22330)) ([3966739](https://github.com/vuetifyjs/vuetify/commit/39667393b3374c8a6de5936e559d94018894ae87)), closes [#21097](https://github.com/vuetifyjs/vuetify/issues/21097)

## v3.10.11 - 2025-11-14T01:27:09Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.10.11

### :wrench: Bug Fixes

- **VField:** visibility of loading state in forced-colors mode ([#22316](https://github.com/vuetifyjs/vuetify/issues/22316)) ([993f443](https://github.com/vuetifyjs/vuetify/commit/993f443b63319d4f032f04aa7749642b2ac94e7e)), closes [#22315](https://github.com/vuetifyjs/vuetify/issues/22315)
- **VTab:** correct styles for forced-colors mode ([8b46022](https://github.com/vuetifyjs/vuetify/commit/8b46022e9fa9f66fb79bf3779ee36411ac7b0f92))
- **VWindow:** correct transition between first and last ([dd0d725](https://github.com/vuetifyjs/vuetify/commit/dd0d7258e6fe6a49523e77d3a89462d4a3d1f61c)), closes [#20641](https://github.com/vuetifyjs/vuetify/issues/20641)

## v3.10.10 - 2025-11-11T11:58:05Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.10.10

### :rocket: Features

- **typography:** add font-weight semibold helper class ([#20586](https://github.com/vuetifyjs/vuetify/issues/20586)) ([d608fe5](https://github.com/vuetifyjs/vuetify/commit/d608fe53639db02ba41be1c75e5b5411f22e5e10)), closes [#20585](https://github.com/vuetifyjs/vuetify/issues/20585)

### :wrench: Bug Fixes

- avoid using DOMRect in jsdom ([daeb1a7](https://github.com/vuetifyjs/vuetify/commit/daeb1a7c54d66464f47752ed20edb4e018ad3e13))
- **useDelay:** normalize  delay to avoid NaN and errors in tests ([2e3c350](https://github.com/vuetifyjs/vuetify/commit/2e3c35069beb375a5e5d1e0c7782b501b17946bb)), closes [#22302](https://github.com/vuetifyjs/vuetify/issues/22302) [#22303](https://github.com/vuetifyjs/vuetify/issues/22303)
- **VAvatar:** correct value for default background ([#22310](https://github.com/vuetifyjs/vuetify/issues/22310)) ([4c5a4d8](https://github.com/vuetifyjs/vuetify/commit/4c5a4d8e94414da3750d55ab28cf2953c8b45df6))
- **VBtnToggle:** remove semicolon from Sass ([#22293](https://github.com/vuetifyjs/vuetify/issues/22293)) ([a855852](https://github.com/vuetifyjs/vuetify/commit/a8558528c61b7bbc882ad17d4b2f6dc296de4dd0)), closes [#22292](https://github.com/vuetifyjs/vuetify/issues/22292)
- **VCard:** keep loader color when fading out ([363661f](https://github.com/vuetifyjs/vuetify/commit/363661f14545e52cdb5c8750db5bc0d5e88de2e2)), closes [#22290](https://github.com/vuetifyjs/vuetify/issues/22290)
- **VTextField:** correct v-model.trim caret start offset ([5e50b00](https://github.com/vuetifyjs/vuetify/commit/5e50b00e2a81806362de8b75097f695faae01547)), closes [#22307](https://github.com/vuetifyjs/vuetify/issues/22307)

### :test_tube: Labs

- **VDateInput:** min/max with built-in adapter ([#22295](https://github.com/vuetifyjs/vuetify/issues/22295)) ([e67c411](https://github.com/vuetifyjs/vuetify/commit/e67c4110d5e0dc7e9376c9c3a2dce7953eadebce)), closes [#22291](https://github.com/vuetifyjs/vuetify/issues/22291)
- **VHotkey:** remove duplicate and redundant code ([be3a7e9](https://github.com/vuetifyjs/vuetify/commit/be3a7e9a0d43cd496fc5b4df0654525629f6baf5))

## v3.10.9 - 2025-11-05T11:58:38Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.10.9

### :wrench: Bug Fixes

- make throttle ssr-friendly ([6322402](https://github.com/vuetifyjs/vuetify/commit/6322402c79078d068a5f3e38a7aa2218a38d47c9)), closes [#22280](https://github.com/vuetifyjs/vuetify/issues/22280)
- **VBtnToggle:** render selection in forced-colors mode ([#22279](https://github.com/vuetifyjs/vuetify/issues/22279)) ([c104b1d](https://github.com/vuetifyjs/vuetify/commit/c104b1d221cf3c0270e5cfc4a457bf14104189e5))
- **VList:** correct styles for spacing with `nav` prop ([#22254](https://github.com/vuetifyjs/vuetify/issues/22254)) ([28edb66](https://github.com/vuetifyjs/vuetify/commit/28edb6648bdddb72e42f8d1603a10e3f3931069c)), closes [#20895](https://github.com/vuetifyjs/vuetify/issues/20895)
- **VTooltip:** only keep content open on keyboard focus ([2a2d785](https://github.com/vuetifyjs/vuetify/commit/2a2d785719c62e421ab34053f58ede944f0c8e11)), closes [#22287](https://github.com/vuetifyjs/vuetify/issues/22287)

## v3.10.8 - 2025-10-29T08:09:00Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.10.8

### :wrench: Bug Fixes

- catch querySelector errors in focusableChildren() ([ae2af38](https://github.com/vuetifyjs/vuetify/commit/ae2af38f982dc83c662bfa84ce7189c4c08ff16b)), closes [#22238](https://github.com/vuetifyjs/vuetify/issues/22238)
- **group:** avoid errors when comparing recursive items ([#22246](https://github.com/vuetifyjs/vuetify/issues/22246)) ([8ac9c67](https://github.com/vuetifyjs/vuetify/commit/8ac9c67a50653147b9d1003546a45cfea206aab3)), closes [#19322](https://github.com/vuetifyjs/vuetify/issues/19322)
- **nested:** selection should react to items changes ([#22236](https://github.com/vuetifyjs/vuetify/issues/22236)) ([6bcdbea](https://github.com/vuetifyjs/vuetify/commit/6bcdbea3800c03bdf3ae736969c423bcd7e54672)), closes [#21733](https://github.com/vuetifyjs/vuetify/issues/21733)
- **VConfirmEdit:** deeply unwrap refs before cloning values ([a507171](https://github.com/vuetifyjs/vuetify/commit/a507171d25b0d41a4be0d74095ac69afbc413922)), closes [#22232](https://github.com/vuetifyjs/vuetify/issues/22232)
- **VDataTable:** optimize select-all performance ([#22252](https://github.com/vuetifyjs/vuetify/issues/22252)) ([2ad1a38](https://github.com/vuetifyjs/vuetify/commit/2ad1a385a06d94405aa3497b079498f08c870e83)), closes [#19447](https://github.com/vuetifyjs/vuetify/issues/19447)
- **VDatePicker:** correct range selection for Luxon adapter ([20b2bf4](https://github.com/vuetifyjs/vuetify/commit/20b2bf425353f6a4d5edf6f1c63d5c35b0ecd165)), closes [#22262](https://github.com/vuetifyjs/vuetify/issues/22262)
- **VMenu:** ignore focus on root element ([fe1214f](https://github.com/vuetifyjs/vuetify/commit/fe1214fb1cbfe021b7db50e88ea091b4ef39e707)), closes [#22263](https://github.com/vuetifyjs/vuetify/issues/22263)
- **VMenu:** keep open with keyboard and open-delay="0" ([#22242](https://github.com/vuetifyjs/vuetify/issues/22242)) ([8e810e5](https://github.com/vuetifyjs/vuetify/commit/8e810e54b12c58a525bf2efb149f0f03a3769448)), closes [#21591](https://github.com/vuetifyjs/vuetify/issues/21591)
- **VMenu:** add aria-owns to activator ([#22240](https://github.com/vuetifyjs/vuetify/issues/22240)) ([975a18c](https://github.com/vuetifyjs/vuetify/commit/975a18cc2dd4ef197a6ab6ca49f81788f9b4f638)), closes [#22226](https://github.com/vuetifyjs/vuetify/issues/22226)
- **VOverlay:** `stick-to-target` content visible until target overflows ([#22233](https://github.com/vuetifyjs/vuetify/issues/22233)) ([0e1dff0](https://github.com/vuetifyjs/vuetify/commit/0e1dff0be1cbcc05985bd6f50c58e70ccc0ceea8)), closes [#22055](https://github.com/vuetifyjs/vuetify/issues/22055)
- **VProgressCircular:** hide overflow to avoid height changes ([#22245](https://github.com/vuetifyjs/vuetify/issues/22245)) ([d5cfb7b](https://github.com/vuetifyjs/vuetify/commit/d5cfb7bf14cbafe57a4043a6427d21ab21d84a45)), closes [#22244](https://github.com/vuetifyjs/vuetify/issues/22244)
- **VRangeSlider:** inherit readonly/disabled from form ([d071e24](https://github.com/vuetifyjs/vuetify/commit/d071e241c82fca7c65405174623014989f2d3985)), closes [#22054](https://github.com/vuetifyjs/vuetify/issues/22054)
- **VSlider:** prevent thumb movement when disabled mid-interaction ([#22257](https://github.com/vuetifyjs/vuetify/issues/22257)) ([4506459](https://github.com/vuetifyjs/vuetify/commit/45064595260f6644e09fdfc9712547fc321e83e6)), closes [#22248](https://github.com/vuetifyjs/vuetify/issues/22248)

### :arrows_counterclockwise: Reverts

- Revert "fix(VOverlay): ignore mouseenter events from touch devices" ([d448e0e](https://github.com/vuetifyjs/vuetify/commit/d448e0eb4f958967cea632e6af2140a8847f860e)), closes [#17640](https://github.com/vuetifyjs/vuetify/issues/17640) [#22237](https://github.com/vuetifyjs/vuetify/issues/22237)

### :test_tube: Labs

- **VCalendar:** use scrollAreaRef from base ([#22253](https://github.com/vuetifyjs/vuetify/issues/22253)) ([16dc1d2](https://github.com/vuetifyjs/vuetify/commit/16dc1d290f5759bb1d5a6f495aae4641fc60d125)), closes [#22251](https://github.com/vuetifyjs/vuetify/issues/22251)
- **VCalendar:** avoid selecting day button ([da4f99a](https://github.com/vuetifyjs/vuetify/commit/da4f99a5f35af7e664d7a5e0d100aeb43b07ddac)), closes [#22141](https://github.com/vuetifyjs/vuetify/issues/22141)
- **VMaskInput:** inherit class and style ([#22247](https://github.com/vuetifyjs/vuetify/issues/22247)) ([01f5e6f](https://github.com/vuetifyjs/vuetify/commit/01f5e6f29d83d3e4c477eb1cfe92262b8186150e))
- **VPie:** consistent avatar size in tooltip ([6cefd46](https://github.com/vuetifyjs/vuetify/commit/6cefd4663ba1c6dfee02eea3a35ae76e0793b44e))

## v3.10.7 - 2025-10-22T17:58:34Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.10.7

### :wrench: Bug Fixes

- **VCombobox:** show full list on reopen unless `always-filter` is used ([83d0073](https://github.com/vuetifyjs/vuetify/commit/83d00737566fd1df7d043d97d6c93dde5237162e))
- **VCombobox, VAutocomplete:** avoid glitches when opening with click ([9a1dd83](https://github.com/vuetifyjs/vuetify/commit/9a1dd8363ff59d91257236b126cb5d89c92ebb61)), closes [#22228](https://github.com/vuetifyjs/vuetify/issues/22228)
- **VField:** missing `controlRef` assignment ([#22171](https://github.com/vuetifyjs/vuetify/issues/22171)) ([b89f568](https://github.com/vuetifyjs/vuetify/commit/b89f56819302649463482ce2776557e371b9ec75)), closes [#22034](https://github.com/vuetifyjs/vuetify/issues/22034)
- **VSelect:** item checkbox gets out of sync ([#22181](https://github.com/vuetifyjs/vuetify/issues/22181)) ([f257802](https://github.com/vuetifyjs/vuetify/commit/f2578024e948ff24faea7275b3d0d808e0afa02e))
- **VWindow:** fix exception due to missing scrollable parent in unit test ([7b122b7](https://github.com/vuetifyjs/vuetify/commit/7b122b735428e736808177cb84a39a5bb3f9b7f1))

## v3.10.6 - 2025-10-21T20:24:09Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.10.6

### :wrench: Bug Fixes

- **nested:** avoid console warnings when updating items order ([#21987](https://github.com/vuetifyjs/vuetify/issues/21987)) ([1dac082](https://github.com/vuetifyjs/vuetify/commit/1dac0826eea90668bf760ea8c43a01a092c6f28e)), closes [#20934](https://github.com/vuetifyjs/vuetify/issues/20934)
- **validation:** 'number' rule should accept 0 and empty string ([#22204](https://github.com/vuetifyjs/vuetify/issues/22204)) ([1b52724](https://github.com/vuetifyjs/vuetify/commit/1b52724dfeb17c6fb6dd6e50002dec33994ecd51)), closes [#22192](https://github.com/vuetifyjs/vuetify/issues/22192)
- **VAutocomplete/VCombobox:** consistent open/close transition ([#22144](https://github.com/vuetifyjs/vuetify/issues/22144)) ([96f6479](https://github.com/vuetifyjs/vuetify/commit/96f6479d2aa82bcf8f75de51c9dce557fba981bd))
- **VChipGroup:** disable auto-scroll to the last selected ([360203a](https://github.com/vuetifyjs/vuetify/commit/360203aa3e97d84d2aea76f46a6a2062b7a7b879)), closes [#22223](https://github.com/vuetifyjs/vuetify/issues/22223)
- **VDatePicker:** return correct range for DST ([#22187](https://github.com/vuetifyjs/vuetify/issues/22187)) ([a3ddcf1](https://github.com/vuetifyjs/vuetify/commit/a3ddcf16cca785abcfbc1a922c6e44f6e2acc576)), closes [#22186](https://github.com/vuetifyjs/vuetify/issues/22186)
- **VDatePicker:** correct range for `allowed-dates` ([#22167](https://github.com/vuetifyjs/vuetify/issues/22167)) ([e678f0e](https://github.com/vuetifyjs/vuetify/commit/e678f0e0d6c45018c611785d932c51db4068a8ef)), closes [#22160](https://github.com/vuetifyjs/vuetify/issues/22160)
- **VDialog:** focus trap should ignore invisible and inert elements ([#22105](https://github.com/vuetifyjs/vuetify/issues/22105)) ([adf3f91](https://github.com/vuetifyjs/vuetify/commit/adf3f919c6fa1efd6aacde0686a0fb5d5dc0e0bb)), closes [#18400](https://github.com/vuetifyjs/vuetify/issues/18400)
- **VListItem:** respect link & canvas colors in forced-colors mode ([#22032](https://github.com/vuetifyjs/vuetify/issues/22032)) ([84a7bff](https://github.com/vuetifyjs/vuetify/commit/84a7bffc9d721c2bc2deca6b93c6d08e4e77f534))
- **VMenu:** avoid scrolling to the off-screen menu ([#22044](https://github.com/vuetifyjs/vuetify/issues/22044)) ([d1dafff](https://github.com/vuetifyjs/vuetify/commit/d1dafffd729590f1c873da20fb6b09f6d53c38e4)), closes [#21775](https://github.com/vuetifyjs/vuetify/issues/21775) [#20569](https://github.com/vuetifyjs/vuetify/issues/20569) [#21015](https://github.com/vuetifyjs/vuetify/issues/21015) [#16819](https://github.com/vuetifyjs/vuetify/issues/16819)
- **VNumberInput:** emit pasted value without waiting for blur ([6034a73](https://github.com/vuetifyjs/vuetify/commit/6034a73a09c649140af726dbd7dbc13a7871a245)), closes [#22182](https://github.com/vuetifyjs/vuetify/issues/22182)
- **VNumberInput:** allow typing negative decimal values with a comma separator ([#22199](https://github.com/vuetifyjs/vuetify/issues/22199)) ([f0fec8f](https://github.com/vuetifyjs/vuetify/commit/f0fec8fb39ec5bbc82bd02c70a17bdc1d1746995)), closes [#22183](https://github.com/vuetifyjs/vuetify/issues/22183)
- **VNumberInput:** align stacked controls in underlined variant ([#22185](https://github.com/vuetifyjs/vuetify/issues/22185)) ([e10ffea](https://github.com/vuetifyjs/vuetify/commit/e10ffea80e6cedbdfbf14912f7587aaabd221779)), closes [#22184](https://github.com/vuetifyjs/vuetify/issues/22184)
- **VSkeletonLoader:** render background in forced-colors mode ([#22216](https://github.com/vuetifyjs/vuetify/issues/22216)) ([26e0b6d](https://github.com/vuetifyjs/vuetify/commit/26e0b6d623bcc154cc14db4958c2c3204c0dff0a))
- **VSkeletonLoader:** accept scoped styles ([#22201](https://github.com/vuetifyjs/vuetify/issues/22201)) ([c20031b](https://github.com/vuetifyjs/vuetify/commit/c20031be5347d17286acadf29d12d5edddc6bcb3)), closes [#22198](https://github.com/vuetifyjs/vuetify/issues/22198)
- **VTabs:** correct link state in Nuxt app ([7068ce1](https://github.com/vuetifyjs/vuetify/commit/7068ce141ee11dc70d237960ea78480cf97922c6)), closes [#22188](https://github.com/vuetifyjs/vuetify/issues/22188)
- **VTextarea:** mask should not clip scrollbar ([#22001](https://github.com/vuetifyjs/vuetify/issues/22001)) ([e8e7234](https://github.com/vuetifyjs/vuetify/commit/e8e72349a985d1ede8a4c8500114e237f1cd742d)), closes [#21283](https://github.com/vuetifyjs/vuetify/issues/21283)
- **VTextField:** keep counter in one line ([78e053f](https://github.com/vuetifyjs/vuetify/commit/78e053f58375b07c1a636e70fdb733dda447a99e)), closes [#19620](https://github.com/vuetifyjs/vuetify/issues/19620)
- **VTextField, VCombobox:** avoid duplicated emits on clear ([#22219](https://github.com/vuetifyjs/vuetify/issues/22219)) ([3e92de3](https://github.com/vuetifyjs/vuetify/commit/3e92de31a3d1df808710606c687f114e81df08cc)), closes [#21417](https://github.com/vuetifyjs/vuetify/issues/21417)
- **VVirtualScroll:** scroll to last element ([#22166](https://github.com/vuetifyjs/vuetify/issues/22166)) ([1cc009f](https://github.com/vuetifyjs/vuetify/commit/1cc009f3f1387c2530d044c9bd3b6a12fdc18f1d)), closes [#20931](https://github.com/vuetifyjs/vuetify/issues/20931)
- **VWindow:** Maintain scroll position on window change ([#22191](https://github.com/vuetifyjs/vuetify/issues/22191)) ([fb7d36b](https://github.com/vuetifyjs/vuetify/commit/fb7d36bf66bfc67adb607c7ac0f222c9181251b8))

### :test_tube: Labs

- **VColorInput:** avoid VField, VInput props leaking to VPicker ([14b74d1](https://github.com/vuetifyjs/vuetify/commit/14b74d15557371baafefa8479a9ad77b00ada6af))
- **VDateInput:** apply min/max to text input ([#22196](https://github.com/vuetifyjs/vuetify/issues/22196)) ([201e6d2](https://github.com/vuetifyjs/vuetify/commit/201e6d27f884ac6077bc8c2cef14eb12a1a28c45)), closes [#22179](https://github.com/vuetifyjs/vuetify/issues/22179)
- **VDateInput:** avoid `color` prop leaking to VPicker ([6bddea1](https://github.com/vuetifyjs/vuetify/commit/6bddea14a7e22e6eea804a6cf8f0fb0dd807b793))
- **VDateInput:** avoid VField, VInput props leaking to VPicker ([253e75e](https://github.com/vuetifyjs/vuetify/commit/253e75e4894fa40e069b4032dfe3bab22aa05d48))
- **VIconBtn:** render interaction highlights in forced-colors mode ([#22211](https://github.com/vuetifyjs/vuetify/issues/22211)) ([37bd57d](https://github.com/vuetifyjs/vuetify/commit/37bd57d7400d716830ddbe0ced85754e2cd334f5))
- **VMaskInput:** handle null value when clearing input ([#22175](https://github.com/vuetifyjs/vuetify/issues/22175)) ([46e3a84](https://github.com/vuetifyjs/vuetify/commit/46e3a84b582aa0c8f7e8aba4e00be3b1a6f7bddd)), closes [#22174](https://github.com/vuetifyjs/vuetify/issues/22174)

## v3.10.5 - 2025-10-07T10:31:38Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.10.5

### :wrench: Bug Fixes

- **validation:** correct translation template arguments ([#22146](https://github.com/vuetifyjs/vuetify/issues/22146)) ([a8e17c9](https://github.com/vuetifyjs/vuetify/commit/a8e17c9966c6333d30c092b3c931ab6afff2b03a))
- **VBadge:** background highlight in forced-colors mode ([#22148](https://github.com/vuetifyjs/vuetify/issues/22148)) ([65f6bb7](https://github.com/vuetifyjs/vuetify/commit/65f6bb708b6cdc72c4a0e2828ef3d917f2a78559))
- **VDataTable:** avoid lag when selecting rows in large tables ([#22163](https://github.com/vuetifyjs/vuetify/issues/22163)) ([92f8a3c](https://github.com/vuetifyjs/vuetify/commit/92f8a3c5c75e84ab79377e9c26a74576f36e6bbc)), closes [#21767](https://github.com/vuetifyjs/vuetify/issues/21767)
- **VDivider:** inherit color in colored containers ([bb54a7d](https://github.com/vuetifyjs/vuetify/commit/bb54a7ded40156e24b670c83e826caca1740b74a))
- **VKbd:** use `$body-font-family` as default ([3f61102](https://github.com/vuetifyjs/vuetify/commit/3f6110237d3a0fb5e65dae6358dc4d04d11e7338))
- **VListItem:** correct role when item is a link ([#22137](https://github.com/vuetifyjs/vuetify/issues/22137)) ([80e154b](https://github.com/vuetifyjs/vuetify/commit/80e154b8c295458b9ced262b3e20403fe07376c3)), closes [#22086](https://github.com/vuetifyjs/vuetify/issues/22086)

## v3.10.4 - 2025-10-01T09:37:40Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.10.4

### :rocket: Features

- **locationStrategies:** support CSS zoom ([#21878](https://github.com/vuetifyjs/vuetify/issues/21878)) ([32242a3](https://github.com/vuetifyjs/vuetify/commit/32242a353b1313b35f18bfc7c0ac7a72ed2196bb)), closes [#20719](https://github.com/vuetifyjs/vuetify/issues/20719)
- **VCombobox:** add `always-filter` prop ([#22093](https://github.com/vuetifyjs/vuetify/issues/22093)) ([8853f4d](https://github.com/vuetifyjs/vuetify/commit/8853f4da7a6600af3587dcc54f18e5b06a2d1ff9)), closes [#22060](https://github.com/vuetifyjs/vuetify/issues/22060)

### :wrench: Bug Fixes

- **VBtn:** set group state for non-router links ([4eeb514](https://github.com/vuetifyjs/vuetify/commit/4eeb514c675b2eeef16f994cac7d37fe1a516b65)), closes [#22085](https://github.com/vuetifyjs/vuetify/issues/22085)
- **VChipGroup:** support `center-active` ([#22050](https://github.com/vuetifyjs/vuetify/issues/22050)) ([4a95697](https://github.com/vuetifyjs/vuetify/commit/4a95697c58665ed53b7c23ab6864318b59a371e9)), closes [#22046](https://github.com/vuetifyjs/vuetify/issues/22046)
- **VCombobox:** open menu when `chips` and typing after clear ([d200f22](https://github.com/vuetifyjs/vuetify/commit/d200f227a12ba14aeb5b0a0ce0fd77ce95da52dc))
- **VDialog:** fix focus trap when tabbing forward ([#22101](https://github.com/vuetifyjs/vuetify/issues/22101)) ([50a150b](https://github.com/vuetifyjs/vuetify/commit/50a150bf0eb8abf6129958e6b11355a1315bfb5b)), closes [#21945](https://github.com/vuetifyjs/vuetify/issues/21945)
- **VFileInput, VFileUpload:** avoid invalid `accept` when not defined ([e6c39bc](https://github.com/vuetifyjs/vuetify/commit/e6c39bcbeb750ce4b1a5da91edb4a940dcc4fd38)), closes [#22131](https://github.com/vuetifyjs/vuetify/issues/22131)
- **VTreeview:** pass `indent-lines` to `header` slot ([8e964c7](https://github.com/vuetifyjs/vuetify/commit/8e964c72d00600f29202bee782eb11bb571627ad))

### :test_tube: Labs

- **VCalendar:** import directives ([1c7896d](https://github.com/vuetifyjs/vuetify/commit/1c7896dc96abbf45f58d819663fa87ec00ae7127)), closes [#22122](https://github.com/vuetifyjs/vuetify/issues/22122)

## v3.10.3 - 2025-09-24T08:44:36Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.10.3

### :wrench: Bug Fixes

- always check for window.matchMedia support ([7d11a39](https://github.com/vuetifyjs/vuetify/commit/7d11a39d16262c867bcd1d760dee05758b95a398)), closes [#22059](https://github.com/vuetifyjs/vuetify/issues/22059)
- **VAutocomplete:** restore placeholder on blur ([#22114](https://github.com/vuetifyjs/vuetify/issues/22114)) ([d0ebeec](https://github.com/vuetifyjs/vuetify/commit/d0ebeec88485e3579967e073b0f17136cfd84eac)), closes [#21762](https://github.com/vuetifyjs/vuetify/issues/21762)
- **VBtn:** add aria-disabled and tabindex to disabled links ([#22082](https://github.com/vuetifyjs/vuetify/issues/22082)) ([6e92383](https://github.com/vuetifyjs/vuetify/commit/6e92383726ee33cbb20cfa1e8c44e7d6f089a7fa)), closes [#22061](https://github.com/vuetifyjs/vuetify/issues/22061)
- **VBtn:** set group state for non-router links ([6bb3fce](https://github.com/vuetifyjs/vuetify/commit/6bb3fce6a165da8cd895ceba66690af3ab7422ef)), closes [#22085](https://github.com/vuetifyjs/vuetify/issues/22085)
- **VDataTable:** expand rows when items are plain array ([#22109](https://github.com/vuetifyjs/vuetify/issues/22109)) ([d8b5c4a](https://github.com/vuetifyjs/vuetify/commit/d8b5c4ad009cb27a0dcee6a0c0ee8d3a0a3dd939)), closes [#22080](https://github.com/vuetifyjs/vuetify/issues/22080)
- **VNumberInput:** ignore custom `type` ([c535f1a](https://github.com/vuetifyjs/vuetify/commit/c535f1a17ba2fa15ae182dc0aeeef8df985b0d91)), closes [#22110](https://github.com/vuetifyjs/vuetify/issues/22110)
- **VTreeview:** match type of update:opened with VList ([#22092](https://github.com/vuetifyjs/vuetify/issues/22092)) ([8924b4d](https://github.com/vuetifyjs/vuetify/commit/8924b4d4230cba102f3293fca0fa4c569909eb3c)), closes [#22091](https://github.com/vuetifyjs/vuetify/issues/22091)

### :arrows_counterclockwise: Reverts

- Revert "fix(VCombobox): filter matching items when opening first time" ([44002f6](https://github.com/vuetifyjs/vuetify/commit/44002f65364c524953a955479cd5badb3d926cf9)), closes [#22077](https://github.com/vuetifyjs/vuetify/issues/22077)

### :test_tube: Labs

- **VCalendar:** fix click:date event error ([97d3a3e](https://github.com/vuetifyjs/vuetify/commit/97d3a3eed1add2b3957bb65916ebf234e9bf8e67)), closes [#22079](https://github.com/vuetifyjs/vuetify/issues/22079)

## v3.10.2 - 2025-09-17T09:13:53Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.10.2

### :wrench: Bug Fixes

- **selects:** open menu when items is mutated not just replaced ([#22067](https://github.com/vuetifyjs/vuetify/issues/22067)) ([a3f8b17](https://github.com/vuetifyjs/vuetify/commit/a3f8b17e66c1e12a14c80376b0ad7ad7c42cd4cd)), closes [#22066](https://github.com/vuetifyjs/vuetify/issues/22066)
- **VBtn:** don't set group state on link click ([e292171](https://github.com/vuetifyjs/vuetify/commit/e292171a593020b3eeb02cf8fa377cca8f48235a)), closes [#21594](https://github.com/vuetifyjs/vuetify/issues/21594)

### :arrows_counterclockwise: Reverts

- Revert "fix(VBtn, VChip): correct link active state after navigation cancellation (#21651)" ([ab28070](https://github.com/vuetifyjs/vuetify/commit/ab28070a432a15ab8ae0aeba8faa0ab0cb0b4d38)), closes [#22072](https://github.com/vuetifyjs/vuetify/issues/22072) [#22065](https://github.com/vuetifyjs/vuetify/issues/22065)

## v3.10.1 - 2025-09-16T07:16:09Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.10.1

### :wrench: Bug Fixes

- **group:** support `null` values ([#21743](https://github.com/vuetifyjs/vuetify/issues/21743)) ([facd4af](https://github.com/vuetifyjs/vuetify/commit/facd4af2e90a80c80c512b8a2df46cd6d48be5e2)), closes [#20550](https://github.com/vuetifyjs/vuetify/issues/20550)
- **VBtn, VChip:** correct link active state after navigation cancellation ([#21651](https://github.com/vuetifyjs/vuetify/issues/21651)) ([bce7046](https://github.com/vuetifyjs/vuetify/commit/bce70460ea7e7c9243c5bbe7e0c384202a2c402f)), closes [#21594](https://github.com/vuetifyjs/vuetify/issues/21594)
- **VCombobox:** unstable menu state while typing ([#22045](https://github.com/vuetifyjs/vuetify/issues/22045)) ([3983af9](https://github.com/vuetifyjs/vuetify/commit/3983af946d49e9eab6c523777510871aa0b5d563))
- **VDataTable:** should allow expanding rows when `return-object` is true ([#21128](https://github.com/vuetifyjs/vuetify/issues/21128)) ([a586965](https://github.com/vuetifyjs/vuetify/commit/a586965cf351aa34e632fe753c43ffd6e9304e4d)), closes [#21096](https://github.com/vuetifyjs/vuetify/issues/21096)
- **VList, VTreeview:** avoid locked active state when navigating ([#21725](https://github.com/vuetifyjs/vuetify/issues/21725)) ([bdbe15a](https://github.com/vuetifyjs/vuetify/commit/bdbe15ae1a6882dbfa48f620752eba9f26578d3b))
- **VListGroup:** fit the navigation drawer rail ([2ebc7fa](https://github.com/vuetifyjs/vuetify/commit/2ebc7fa5b4b395337faadf4a8dfbf09edac6b247)), closes [#22047](https://github.com/vuetifyjs/vuetify/issues/22047)
- **VMenu, VTooltip:** default to `stick-to-target` false ([263ca4b](https://github.com/vuetifyjs/vuetify/commit/263ca4b9eee3b1f4acc201d255a88ea1c2c222d4)), closes [#22055](https://github.com/vuetifyjs/vuetify/issues/22055)
- **VSelects:** add `aria-controls` and `aria-expanded` ([#22025](https://github.com/vuetifyjs/vuetify/issues/22025)) ([a5abe89](https://github.com/vuetifyjs/vuetify/commit/a5abe893d7d3c9f93d69f60ece5a93185f74bb9a)), closes [#22017](https://github.com/vuetifyjs/vuetify/issues/22017)
- **VSlider:** respect disabled and readonly from form ([0bbf362](https://github.com/vuetifyjs/vuetify/commit/0bbf3623ae0a66743ead2b23fb7a0dc197a035f2)), closes [#22054](https://github.com/vuetifyjs/vuetify/issues/22054)

### :test_tube: Labs

- **VCalendar:** correct effective weekdays determination ([#22042](https://github.com/vuetifyjs/vuetify/issues/22042)) ([54e6674](https://github.com/vuetifyjs/vuetify/commit/54e667426d5ddefbab951d240511cfc74afa0233))
- **VCalendar:** prevent month view event duplication ([977a7e2](https://github.com/vuetifyjs/vuetify/commit/977a7e2a2e400092723e44024c23a2f56947ac77)), closes [#22062](https://github.com/vuetifyjs/vuetify/issues/22062)
- **VCalendar:** translate eventMoreText ([e41e091](https://github.com/vuetifyjs/vuetify/commit/e41e091f10a13aa55b14b567272412391617ff1a)), closes [#22062](https://github.com/vuetifyjs/vuetify/issues/22062)
- **VCalendar:** use camelCase event names ([8b2fae3](https://github.com/vuetifyjs/vuetify/commit/8b2fae3428d2228660c8c8d80721da5bb9a9db6d)), closes [#22063](https://github.com/vuetifyjs/vuetify/issues/22063)

## v3.10.0 - 2025-09-10T13:37:27Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.10.0

### :rocket: Features

- **framework:** respect prefers-reduced-motion ([#21530](https://github.com/vuetifyjs/vuetify/issues/21530)) ([01c9e91](https://github.com/vuetifyjs/vuetify/commit/01c9e9115898118535865197660dd7399ae1626c)), closes [#19622](https://github.com/vuetifyjs/vuetify/issues/19622)
- **filter:** keep dividers and subheaders ([#21822](https://github.com/vuetifyjs/vuetify/issues/21822)) ([18ac731](https://github.com/vuetifyjs/vuetify/commit/18ac7319a04df9645861977b723173c376655c2f)), closes [#7424](https://github.com/vuetifyjs/vuetify/issues/7424)
- **VOverlay:** add `stick-to-target` prop ([#21704](https://github.com/vuetifyjs/vuetify/issues/21704)) ([8552779](https://github.com/vuetifyjs/vuetify/commit/855277993131333d57359dadbf1511532a98cc68)), closes [#19856](https://github.com/vuetifyjs/vuetify/issues/19856) [#19732](https://github.com/vuetifyjs/vuetify/issues/19732) [#17125](https://github.com/vuetifyjs/vuetify/issues/17125)
- **VBtn:** add `spaced` prop ([#21663](https://github.com/vuetifyjs/vuetify/issues/21663)) ([819605c](https://github.com/vuetifyjs/vuetify/commit/819605c6b4606bf45d33ea9c431c4e97a1bbd3b7)), closes [#21652](https://github.com/vuetifyjs/vuetify/issues/21652)
- **VCard:** allow semantic HTML tags for content parts ([#21943](https://github.com/vuetifyjs/vuetify/issues/21943)) ([5f8abb6](https://github.com/vuetifyjs/vuetify/commit/5f8abb6c5cece7fea660a7f4811e3c0108a4f402))
- **VColorPicker:** add `hide-eye-dropper` prop ([be452a5](https://github.com/vuetifyjs/vuetify/commit/be452a547f7efeb773fa8173695c6463137281a0)), closes [#19154](https://github.com/vuetifyjs/vuetify/issues/19154) [#19150](https://github.com/vuetifyjs/vuetify/issues/19150)
- **VColorPicker:** customizable eyeDropper icon ([#21656](https://github.com/vuetifyjs/vuetify/issues/21656)) ([71377a6](https://github.com/vuetifyjs/vuetify/commit/71377a69079ccdb258ead9dcee2bcd355d6ce6d3)), closes [#21406](https://github.com/vuetifyjs/vuetify/issues/21406)
- **VDataIterator:** add filtered items count to slot data ([#18641](https://github.com/vuetifyjs/vuetify/issues/18641)) ([7d51302](https://github.com/vuetifyjs/vuetify/commit/7d51302c8e609b78854934586dafef41ba188428))
- **VDataTable:** re-introduce `group-summary` slot ([#21802](https://github.com/vuetifyjs/vuetify/issues/21802)) ([a19cd87](https://github.com/vuetifyjs/vuetify/commit/a19cd8778ac21e9c050649d570e726ac11fa0008)), closes [#21800](https://github.com/vuetifyjs/vuetify/issues/21800)
- **VDataTable:** customizable expand/collapse icons ([#21698](https://github.com/vuetifyjs/vuetify/issues/21698)) ([1636f63](https://github.com/vuetifyjs/vuetify/commit/1636f632027255bdbc33a989ce667f9c9b352793))
- **VDatePicker:** re-introduce `first-day-of-year` prop ([#21760](https://github.com/vuetifyjs/vuetify/issues/21760)) ([af74f62](https://github.com/vuetifyjs/vuetify/commit/af74f62a1d57a63bcad835a4a2aded2ff03b419c)), closes [#20270](https://github.com/vuetifyjs/vuetify/issues/20270)
- **VFileInput:** add `truncate-length` prop ([#17972](https://github.com/vuetifyjs/vuetify/issues/17972)) ([28ef26c](https://github.com/vuetifyjs/vuetify/commit/28ef26c59b5e1991c469adbd567f305d88bac904)), closes [#17635](https://github.com/vuetifyjs/vuetify/issues/17635)
- **VFileUpload, VFileInput:** add `filter-by-type` prop ([#21576](https://github.com/vuetifyjs/vuetify/issues/21576)) ([1b78b06](https://github.com/vuetifyjs/vuetify/commit/1b78b06a40470186c83c88f95ec00ba71d36171d)), closes [#21150](https://github.com/vuetifyjs/vuetify/issues/21150)
- **VProgressLinear:** ability to separate chunks ([#21744](https://github.com/vuetifyjs/vuetify/issues/21744)) ([4c66aa0](https://github.com/vuetifyjs/vuetify/commit/4c66aa0bda8763d31a5d61a1eff77e873cd4b4c1))
- **VTextField, VTextarea:** add `autocomplete` prop ([#21359](https://github.com/vuetifyjs/vuetify/issues/21359)) ([d94c003](https://github.com/vuetifyjs/vuetify/commit/d94c00309e6e744e267275cc179bbdfc61fdd848)), closes [#21353](https://github.com/vuetifyjs/vuetify/issues/21353)
- **VTimePicker:** add `period` prop ([#21823](https://github.com/vuetifyjs/vuetify/issues/21823)) ([8df7685](https://github.com/vuetifyjs/vuetify/commit/8df76851aff28dcfc8b73eee18d5613557aafce8)), closes [#15405](https://github.com/vuetifyjs/vuetify/issues/15405)
- **VTreeview:** add `header` slot ([fc86d05](https://github.com/vuetifyjs/vuetify/commit/fc86d05d0b72fb27ebc6bd2017d8684a3aa148a9))
- **VTreeview:** add `toggle` slot ([#21018](https://github.com/vuetifyjs/vuetify/issues/21018)) ([4ec13f2](https://github.com/vuetifyjs/vuetify/commit/4ec13f2841839d482ee38c9e7f0d72dc006d4090)), closes [#20307](https://github.com/vuetifyjs/vuetify/issues/20307)
- **VWindow, VCarousel:** add `crossfade` and `transition-duration` ([#21850](https://github.com/vuetifyjs/vuetify/issues/21850)) ([15a5c96](https://github.com/vuetifyjs/vuetify/commit/15a5c96933db148d568a88855d6ba3df53815001))

### :wrench: Bug Fixes

- **VChip:** correct opacity for plain variant ([#22005](https://github.com/vuetifyjs/vuetify/issues/22005)) ([48d20f3](https://github.com/vuetifyjs/vuetify/commit/48d20f3095b3b103c791b759dbbf28a751b374f5))
- **VCombobox:** filter matching items when opening first time ([#21901](https://github.com/vuetifyjs/vuetify/issues/21901)) ([eeb9d14](https://github.com/vuetifyjs/vuetify/commit/eeb9d145be9f8fb0984ab8a82fc0b561c530cb17)), closes [#21900](https://github.com/vuetifyjs/vuetify/issues/21900)
- **VDataTable:** more flexible alignment with grouping ([#21862](https://github.com/vuetifyjs/vuetify/issues/21862)) ([6d802d3](https://github.com/vuetifyjs/vuetify/commit/6d802d3c8e87752f601414141ce0ee843592535f)), closes [#17863](https://github.com/vuetifyjs/vuetify/issues/17863)
- **VDataTable:** correct alignment of checkboxes ([402257d](https://github.com/vuetifyjs/vuetify/commit/402257d8490a43bb888203ddbb57b82773ad3c0b))
- **VList:** use proper accessibility attributes ([#21444](https://github.com/vuetifyjs/vuetify/issues/21444)) ([9b2541e](https://github.com/vuetifyjs/vuetify/commit/9b2541e1085dd69295a23fd501d44dc51730638e)), closes [#20978](https://github.com/vuetifyjs/vuetify/issues/20978)
- **VListItem:** fix `rounded` prop ([9ec5a0d](https://github.com/vuetifyjs/vuetify/commit/9ec5a0d624dceb659f746d11263bb53298f2bdc5)), closes [#22015](https://github.com/vuetifyjs/vuetify/issues/22015)
- **VNumberInput:** accept external changes when focused ([#21827](https://github.com/vuetifyjs/vuetify/issues/21827)) ([d0340e7](https://github.com/vuetifyjs/vuetify/commit/d0340e7ea0925dc9995a299cd61b6b91de30e239)), closes [#21735](https://github.com/vuetifyjs/vuetify/issues/21735) [#21804](https://github.com/vuetifyjs/vuetify/issues/21804)
- **VSkeletonLoader:** no wrapper for content ([#21637](https://github.com/vuetifyjs/vuetify/issues/21637)) ([17ae110](https://github.com/vuetifyjs/vuetify/commit/17ae11093e0ff21a0d0d16aa4559bedf86615236)), closes [#21286](https://github.com/vuetifyjs/vuetify/issues/21286)
- **VTreeview:** support prepend icon and avatar ([#21813](https://github.com/vuetifyjs/vuetify/issues/21813)) ([478230a](https://github.com/vuetifyjs/vuetify/commit/478230abcdc0fb156523cc9edd4d5f10eea3e069)), closes [#21812](https://github.com/vuetifyjs/vuetify/issues/21812)
- **VWindow:** override `transition-duration` to respect user preference ([27fe364](https://github.com/vuetifyjs/vuetify/commit/27fe36478ae161b7758a08c8dd4b70e7068a8f06))

### :arrows_counterclockwise: Reverts

- Revert "fix(VSelect): use selected text instead of value (#21902)" ([95dea2c](https://github.com/vuetifyjs/vuetify/commit/95dea2c3934d58fbebb50cde6314f19e8305cb1d)), closes [#22006](https://github.com/vuetifyjs/vuetify/issues/22006)

### :test_tube: Labs

- **mask:** create useMask composable ([#21736](https://github.com/vuetifyjs/vuetify/issues/21736)) ([a687f7a](https://github.com/vuetifyjs/vuetify/commit/a687f7a38f4377421f47660564fe7f02d6e0231c))
- **VCalendar:** directly port from v2 ([#21910](https://github.com/vuetifyjs/vuetify/issues/21910)) ([2e6f72b](https://github.com/vuetifyjs/vuetify/commit/2e6f72baf3a8337dee76e321ed5e18910159c5f6)), closes [#19065](https://github.com/vuetifyjs/vuetify/issues/19065) [#20098](https://github.com/vuetifyjs/vuetify/issues/20098) [#20947](https://github.com/vuetifyjs/vuetify/issues/20947) [#20970](https://github.com/vuetifyjs/vuetify/issues/20970) [#21379](https://github.com/vuetifyjs/vuetify/issues/21379) [#21783](https://github.com/vuetifyjs/vuetify/issues/21783) [#21964](https://github.com/vuetifyjs/vuetify/issues/21964) [#22016](https://github.com/vuetifyjs/vuetify/issues/22016) [#22018](https://github.com/vuetifyjs/vuetify/issues/22018)
- **VMaskInput:** fix caret position while editing ([#21925](https://github.com/vuetifyjs/vuetify/issues/21925)) ([27dc68c](https://github.com/vuetifyjs/vuetify/commit/27dc68caec935395fdd0d713e106db06f7e00404)), closes [#21776](https://github.com/vuetifyjs/vuetify/issues/21776)
- **VPicker:** add `hide-title` prop ([#21657](https://github.com/vuetifyjs/vuetify/issues/21657)) ([8d7eac3](https://github.com/vuetifyjs/vuetify/commit/8d7eac3dcd80387e4d3118f1660d7fb25251f66a)), closes [#21545](https://github.com/vuetifyjs/vuetify/issues/21545)

## v3.9.7 - 2025-09-03T11:37:10Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.9.7

### :wrench: Bug Fixes

- **framework:** don't use multi-line :not() ([a15edec](https://github.com/vuetifyjs/vuetify/commit/a15edecc8313d13158d62776d4532eb9cc2e583a)), closes [#21995](https://github.com/vuetifyjs/vuetify/issues/21995)
- **nested:** detect and warn about multiple `null` values ([#21940](https://github.com/vuetifyjs/vuetify/issues/21940)) ([0960aa6](https://github.com/vuetifyjs/vuetify/commit/0960aa607835c63950976c570b880feb3f3ae358)), closes [#21815](https://github.com/vuetifyjs/vuetify/issues/21815)
- **rounded:** prioritize `tile` prop (like in v2) ([6b13382](https://github.com/vuetifyjs/vuetify/commit/6b13382f7784dfa47b0def7b7a80d184063bf392)), closes [#21844](https://github.com/vuetifyjs/vuetify/issues/21844)
- **v-touch:** set event handlers on root components ([#21997](https://github.com/vuetifyjs/vuetify/issues/21997)) ([1da3451](https://github.com/vuetifyjs/vuetify/commit/1da3451724ca97de6a95082c0a39736ef89a4906)), closes [#21768](https://github.com/vuetifyjs/vuetify/issues/21768)
- **VAlert:** use outline instead of background in forced-colors mode ([#21946](https://github.com/vuetifyjs/vuetify/issues/21946)) ([7560323](https://github.com/vuetifyjs/vuetify/commit/7560323d9d33a9d71d2975ab25537cc7bfe493ec))
- **VCard:** render border in forced-colors mode ([#21968](https://github.com/vuetifyjs/vuetify/issues/21968)) ([b30d5c8](https://github.com/vuetifyjs/vuetify/commit/b30d5c851947cb214927b7e6bd9288de9d4b15fa))
- **VChip:** render border in forced-colors mode ([#21970](https://github.com/vuetifyjs/vuetify/issues/21970)) ([59aeadc](https://github.com/vuetifyjs/vuetify/commit/59aeadc4337bd3273eebb31cb220728cf0aadac3))
- **VChipGroup:** render selected in forced-colors mode ([#21973](https://github.com/vuetifyjs/vuetify/issues/21973)) ([997dd56](https://github.com/vuetifyjs/vuetify/commit/997dd5668fe71994e11b4a406ea472697591ac6a))
- **VDataTable:** allow filters on all columns ([#21876](https://github.com/vuetifyjs/vuetify/issues/21876)) ([af20234](https://github.com/vuetifyjs/vuetify/commit/af20234e3642ff0cff82f546390eca7412c594d0))
- **VList:** outline and selection in forced-colors mode ([#21958](https://github.com/vuetifyjs/vuetify/issues/21958)) ([a8eac52](https://github.com/vuetifyjs/vuetify/commit/a8eac52195d894b5a6f3f3c1a93de4f59a2dba7a))
- **VOtpInput:** focus next field when correcting values ([#21781](https://github.com/vuetifyjs/vuetify/issues/21781)) ([fc91e6d](https://github.com/vuetifyjs/vuetify/commit/fc91e6d7ee632437fb376b8169a88c593e436716)), closes [#21680](https://github.com/vuetifyjs/vuetify/issues/21680)
- **VProgressLinear:** ensure visibility when using custom colors ([#21949](https://github.com/vuetifyjs/vuetify/issues/21949)) ([e3fdb53](https://github.com/vuetifyjs/vuetify/commit/e3fdb53a1fe5bb332ad981012cfdf8cab79faa1a))
- **VSelects/VCombobox/VAutocomplete:** use rounding from Sass variable ([d3e56de](https://github.com/vuetifyjs/vuetify/commit/d3e56def269205bb84cd26a0c8c24e433045f71a)), closes [#21956](https://github.com/vuetifyjs/vuetify/issues/21956)
- **VSlideGroup:** correct hasNext after resize ([#21124](https://github.com/vuetifyjs/vuetify/issues/21124)) ([0633aef](https://github.com/vuetifyjs/vuetify/commit/0633aef52540f5e9853e25d0ef2ad94e134fe8b2)), closes [#21115](https://github.com/vuetifyjs/vuetify/issues/21115)
- **VSnackbar:** render border in forced-colors mode ([#21977](https://github.com/vuetifyjs/vuetify/issues/21977)) ([a2249c2](https://github.com/vuetifyjs/vuetify/commit/a2249c24aaed5cce0cc926993829c405b5d11296))
- **VTimeline:** render lines in forced-colors mode ([#21974](https://github.com/vuetifyjs/vuetify/issues/21974)) ([dc7417c](https://github.com/vuetifyjs/vuetify/commit/dc7417c60c95b34b2f8375eb2269955d846427d9))
- **VTreeview:** indent lines should support RTL ([1733666](https://github.com/vuetifyjs/vuetify/commit/1733666d5364819b78605185c00deeeef3f2f2a4)), closes [#21952](https://github.com/vuetifyjs/vuetify/issues/21952)

### :test_tube: Labs

- **VDateInput:** pass-through picker slots ([#21975](https://github.com/vuetifyjs/vuetify/issues/21975)) ([d91dad0](https://github.com/vuetifyjs/vuetify/commit/d91dad08751717ca2097932774485a939e2d9ca7))
- **VVideo:** background variant should fill the container ([b766424](https://github.com/vuetifyjs/vuetify/commit/b76642493c7144df3573e6bedf4a62c7ea5c94e7))
- **VVideo:** avoid interaction conflicts with VOverlay ([10a1821](https://github.com/vuetifyjs/vuetify/commit/10a18215226793f2832a5b68ebec52241f8db2c7)), closes [#21962](https://github.com/vuetifyjs/vuetify/issues/21962)

## v3.9.6 - 2025-08-26T12:39:40Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.9.6

### :wrench: Bug Fixes

- **VBtn:** render border in forced-colors mode ([#21848](https://github.com/vuetifyjs/vuetify/issues/21848)) ([25af169](https://github.com/vuetifyjs/vuetify/commit/25af169ae03c28bc6472f00347edaeaefb73aeb3))
- **VCard:** hide progress border in forced-colors mode ([#21836](https://github.com/vuetifyjs/vuetify/issues/21836)) ([4335576](https://github.com/vuetifyjs/vuetify/commit/43355769444e256eed6111d23b75d7dc2838a093)), closes [#21835](https://github.com/vuetifyjs/vuetify/issues/21835)
- **VDatePicker:** prioritize allowed-months and allowed-years ([#21916](https://github.com/vuetifyjs/vuetify/issues/21916)) ([810645c](https://github.com/vuetifyjs/vuetify/commit/810645c5c37aeeb3aec1a575763c5e836b7bb8b6)), closes [#21911](https://github.com/vuetifyjs/vuetify/issues/21911)
- **VDatePickerYears:** fix scroll/focus of selected year ([#21951](https://github.com/vuetifyjs/vuetify/issues/21951)) ([b531dbf](https://github.com/vuetifyjs/vuetify/commit/b531dbfa1ae6e08dddea41f965912b8cf60a55ce)), closes [#21950](https://github.com/vuetifyjs/vuetify/issues/21950)
- **VField:** avoid duplicated emits on clear ([#21865](https://github.com/vuetifyjs/vuetify/issues/21865)) ([a97f103](https://github.com/vuetifyjs/vuetify/commit/a97f10306bd32e739c4cd52f4939e2b6d3b648d1)), closes [#21417](https://github.com/vuetifyjs/vuetify/issues/21417)
- **VNumberInput:** consistent color of control icons ([#21936](https://github.com/vuetifyjs/vuetify/issues/21936)) ([6a50b44](https://github.com/vuetifyjs/vuetify/commit/6a50b44bf48b11f975c52c78074f99f52e34ab10)), closes [#21931](https://github.com/vuetifyjs/vuetify/issues/21931)
- **VOtpInput:** support composing character with IME ([42e15a3](https://github.com/vuetifyjs/vuetify/commit/42e15a349c1de7721c754d9aee2b437144b1a89b)), closes [#21918](https://github.com/vuetifyjs/vuetify/issues/21918)
- **VSelect:** select placeholder overlap ([#21923](https://github.com/vuetifyjs/vuetify/issues/21923)) ([5c06ba7](https://github.com/vuetifyjs/vuetify/commit/5c06ba7bd76bca370320433e7a0f058362d6028f)), closes [#21922](https://github.com/vuetifyjs/vuetify/issues/21922)
- **VSparkline:** accept a single number ([#21944](https://github.com/vuetifyjs/vuetify/issues/21944)) ([d7b0e34](https://github.com/vuetifyjs/vuetify/commit/d7b0e34e9d717ce96c898875c4e480ab89d81eea)), closes [#19697](https://github.com/vuetifyjs/vuetify/issues/19697)

### :test_tube: Labs

- **VIconBtn:** correctly apply `icon-color` ([b2ece2c](https://github.com/vuetifyjs/vuetify/commit/b2ece2c033ec8cc097f644cda912bb915d1df84e)), closes [#21930](https://github.com/vuetifyjs/vuetify/issues/21930)
- **VPie:** support touch for segment interaction ([#21871](https://github.com/vuetifyjs/vuetify/issues/21871)) ([93f4218](https://github.com/vuetifyjs/vuetify/commit/93f421848601fe6f24e32395a7810c41790f92cf))

## v3.9.5 - 2025-08-12T11:01:36Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.9.5

### :wrench: Bug Fixes

- **VColorPicker:** prevent sass nested deprecation warning ([8083db9](https://github.com/vuetifyjs/vuetify/commit/8083db971f7fe51151241447f90a4cd14cff32be)), closes [#21909](https://github.com/vuetifyjs/vuetify/issues/21909)
- **VSelect:** use selected text instead of value ([#21902](https://github.com/vuetifyjs/vuetify/issues/21902)) ([d0ef001](https://github.com/vuetifyjs/vuetify/commit/d0ef0016adf8517620ce14c5e1e50e800195fb95)), closes [#21097](https://github.com/vuetifyjs/vuetify/issues/21097)
- **VStepper:** keep correct alignment with alt-labels ([1a0a9e6](https://github.com/vuetifyjs/vuetify/commit/1a0a9e6f19d776fe104caaae4c659a3f6d3d3e55))
- **VStepper:** align title and subtitle to the avatar ([12735e6](https://github.com/vuetifyjs/vuetify/commit/12735e6797e1c482db74fd7615af7b484e282614)), closes [#21884](https://github.com/vuetifyjs/vuetify/issues/21884)
- **VTextField:** assign role to input element ([#21903](https://github.com/vuetifyjs/vuetify/issues/21903)) ([d77285f](https://github.com/vuetifyjs/vuetify/commit/d77285fcae70522dfafbc66c775f72b03684bb38)), closes [#18125](https://github.com/vuetifyjs/vuetify/issues/18125)

### :test_tube: Labs

- **VColorInput:** allow inner fields  focus using mouse ([7657d52](https://github.com/vuetifyjs/vuetify/commit/7657d522ba5604ce53fad877e84033f7bf5ad960)), closes [#21897](https://github.com/vuetifyjs/vuetify/issues/21897)

## v3.9.4 - 2025-08-05T12:11:41Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.9.4

### :wrench: Bug Fixes

- **validation:** return aliases when called without arguments ([#21868](https://github.com/vuetifyjs/vuetify/issues/21868)) ([64a82d4](https://github.com/vuetifyjs/vuetify/commit/64a82d4776d22628db5d3a55fc070ce2463eb602)), closes [#21477](https://github.com/vuetifyjs/vuetify/issues/21477)
- **VAlert:** restore unit-less support in Sass variable for title line-height ([#21843](https://github.com/vuetifyjs/vuetify/issues/21843)) ([8c1778a](https://github.com/vuetifyjs/vuetify/commit/8c1778a26a08d9d663681d83d6dd9160e3cb5c74)), closes [#21841](https://github.com/vuetifyjs/vuetify/issues/21841)
- **VColorPicker:** aria labels for main controls ([#21839](https://github.com/vuetifyjs/vuetify/issues/21839)) ([e2ab73a](https://github.com/vuetifyjs/vuetify/commit/e2ab73a7aafb1c443ad30b28134e41b4662c27fe)), closes [#21834](https://github.com/vuetifyjs/vuetify/issues/21834)
- **VColorPicker:** keep canvas visible when width is not px ([22b828f](https://github.com/vuetifyjs/vuetify/commit/22b828f5cc625adeeb206e20746154dd79f33e0c))
- **VDataTable:** correct row height when with show-select and compact ([#21829](https://github.com/vuetifyjs/vuetify/issues/21829)) ([29b3bb0](https://github.com/vuetifyjs/vuetify/commit/29b3bb0b3363e8c295cf16286ed500e8ae269e98)), closes [#21767](https://github.com/vuetifyjs/vuetify/issues/21767)
- **VDataTable:** missing stripes on fixed columns ([#21715](https://github.com/vuetifyjs/vuetify/issues/21715)) ([739a6c9](https://github.com/vuetifyjs/vuetify/commit/739a6c9aa8ac6064d7484e1e40dbf111d2ab75c5))
- **VMenu, VTooltip:** apply scroll-strategy reposition for horizontal overflow ([#21309](https://github.com/vuetifyjs/vuetify/issues/21309)) ([bd48658](https://github.com/vuetifyjs/vuetify/commit/bd486588ae665014abe9a2af09bee12868e8574f)), closes [#20625](https://github.com/vuetifyjs/vuetify/issues/20625)
- **VNumberInput:** keep focus when incrementing in the list ([#21824](https://github.com/vuetifyjs/vuetify/issues/21824)) ([d6b3384](https://github.com/vuetifyjs/vuetify/commit/d6b338465a1c55fa72838c668276dcc9855b4f54)), closes [#17083](https://github.com/vuetifyjs/vuetify/issues/17083)
- **VOverlay:** don't use content element as scroll parent ([06c4c91](https://github.com/vuetifyjs/vuetify/commit/06c4c91f94d18af53041961f2c9fb0cc7e364cb2))
- **VSlider:** avoid thumb label wedge gap ([#21847](https://github.com/vuetifyjs/vuetify/issues/21847)) ([059e578](https://github.com/vuetifyjs/vuetify/commit/059e578e21f376bf1059c59fbf72eb278664ed93))
- **VStepper:** correct cursor for readonly item ([aeb6f4d](https://github.com/vuetifyjs/vuetify/commit/aeb6f4d70291ebb5c907ebe86490bb622f2929ea)), closes [#21867](https://github.com/vuetifyjs/vuetify/issues/21867)
- **VTreeview:** allow expanding disabled nodes ([ed4d8cf](https://github.com/vuetifyjs/vuetify/commit/ed4d8cfb06079a231064dbc6ebedb05d3ad6ef06)), closes [#21075](https://github.com/vuetifyjs/vuetify/issues/21075) [#21116](https://github.com/vuetifyjs/vuetify/issues/21116)
- **VWindow:** correctly reveal vertical arrows on hover ([521ba7b](https://github.com/vuetifyjs/vuetify/commit/521ba7b7a5749f495b13face6fabca7b971e56bf))

### :microscope: Code Refactoring

- **VDataTable:** avoid Array.toReversed() ([3894f98](https://github.com/vuetifyjs/vuetify/commit/3894f98c333abaad63fc2a651ae558ffbb75d620))

### :test_tube: Labs

- **VColorInput:** pip customization ([#21820](https://github.com/vuetifyjs/vuetify/issues/21820)) ([db389d5](https://github.com/vuetifyjs/vuetify/commit/db389d5bb0386eccb00302c0b3134f39c201a35a))
- **VVideo:** prefer `max-width`, default to 100% ([22d5dd5](https://github.com/vuetifyjs/vuetify/commit/22d5dd5e5814c9aea59a5d4778c2d4ea6c3c9ba6))
- **VVideo:** add `aspect-ratio` prop ([83e67d1](https://github.com/vuetifyjs/vuetify/commit/83e67d137b2659535da355ac23d9a24d8345537b))
- **VVideo:** correct default track color with pills ([e98919d](https://github.com/vuetifyjs/vuetify/commit/e98919d0c3ec9ed128bc58fe5678b1821f7f5478))
- **VVideo:** correct color customization ([13da3e1](https://github.com/vuetifyjs/vuetify/commit/13da3e1b33b7dfee1d506c4d47782ab47a3f7f6c))
- **VVideo:** correctly move elevation to pills ([3df9494](https://github.com/vuetifyjs/vuetify/commit/3df9494480b80f091bef6e0f1e65066dbe4b5642))
- **VVideo:** hide overlays for background variant ([466dc6f](https://github.com/vuetifyjs/vuetify/commit/466dc6fb87acf5a0e6e2d67f9196eaf3f6705e9f))

## v3.9.3 - 2025-07-29T13:19:23Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.9.3

### :wrench: Bug Fixes

- **theme:** ability to restore "system" ([#21821](https://github.com/vuetifyjs/vuetify/issues/21821)) ([45077be](https://github.com/vuetifyjs/vuetify/commit/45077be13c220a4abeac161d16f5f406d7e1fb2e)), closes [#21819](https://github.com/vuetifyjs/vuetify/issues/21819)
- **VColorPicker:** keep sliders visible when inputs are hidden ([#21803](https://github.com/vuetifyjs/vuetify/issues/21803)) ([215bfd8](https://github.com/vuetifyjs/vuetify/commit/215bfd866e8c6f606620d8f88c8b1fd4dfe7ab15)), closes [#21801](https://github.com/vuetifyjs/vuetify/issues/21801)
- **VCombobox:** select all values from pasted text ([#21840](https://github.com/vuetifyjs/vuetify/issues/21840)) ([408a95d](https://github.com/vuetifyjs/vuetify/commit/408a95d7b4c39649546f8098af7a6afd663f777c)), closes [#21838](https://github.com/vuetifyjs/vuetify/issues/21838)
- **VDataTable:** don't pass slots to VSelect in mobile view ([#21572](https://github.com/vuetifyjs/vuetify/issues/21572)) ([6e61468](https://github.com/vuetifyjs/vuetify/commit/6e6146814462ec56a40bd439b6641630f6e057a3)), closes [#19873](https://github.com/vuetifyjs/vuetify/issues/19873)
- **VDatePicker:** add aria-labels for improved accessibility ([#21635](https://github.com/vuetifyjs/vuetify/issues/21635)) ([5e3fc2b](https://github.com/vuetifyjs/vuetify/commit/5e3fc2b4baf9df2939bdaca84cec28f3bf41633b)), closes [#20696](https://github.com/vuetifyjs/vuetify/issues/20696)
- **VDatePicker:** avoid infinite loop when first day is out of range ([#21649](https://github.com/vuetifyjs/vuetify/issues/21649)) ([a330d75](https://github.com/vuetifyjs/vuetify/commit/a330d75ef091046c96aae3451bed5f29a66b5d3b))
- **VFileInput:** avoid text overflow with long file names ([#21748](https://github.com/vuetifyjs/vuetify/issues/21748)) ([389a260](https://github.com/vuetifyjs/vuetify/commit/389a260a334d2b9fa1cd717d04904c0b60abe755)), closes [#21707](https://github.com/vuetifyjs/vuetify/issues/21707)
- **VFileUploadItem:** accept `title` slot ([#21769](https://github.com/vuetifyjs/vuetify/issues/21769)) ([fe85aa0](https://github.com/vuetifyjs/vuetify/commit/fe85aa0ecb4efa17f499beccea27710ad3bea164))
- **VList:** merge classes from itemProps ([5423fbf](https://github.com/vuetifyjs/vuetify/commit/5423fbf18ca6d27ac560529cdd20310aee6d2d32))
- **VNumberInput:** only trim zeros from the end ([ab2d941](https://github.com/vuetifyjs/vuetify/commit/ab2d941c02a2b5f0c976269c277471a808f251ca)), closes [#21828](https://github.com/vuetifyjs/vuetify/issues/21828)
- **VNumberInput:** keep cursor position when typing decimal values ([acc30fb](https://github.com/vuetifyjs/vuetify/commit/acc30fbfa5cd8295f341c545bd4adc5629b14bd6))
- **VOverlay:** trigger scrollStrategy when target is a point ([1146171](https://github.com/vuetifyjs/vuetify/commit/114617141a73271f07c108b91829186f3ec36291))
- **VProgressLinear:** accept pointer events unless `clickable` is used ([#21691](https://github.com/vuetifyjs/vuetify/issues/21691)) ([a6b1136](https://github.com/vuetifyjs/vuetify/commit/a6b1136243f70bf868c438f8d9e6be9b18a492e3)), closes [#21690](https://github.com/vuetifyjs/vuetify/issues/21690)
- **VRipple:** support touch simulators ([#20776](https://github.com/vuetifyjs/vuetify/issues/20776)) ([9fa2870](https://github.com/vuetifyjs/vuetify/commit/9fa2870eeaf073489f3de790defe3e94a3746788))
- **VSlider:** correctly apply `thumb-color` ([#21833](https://github.com/vuetifyjs/vuetify/issues/21833)) ([b207522](https://github.com/vuetifyjs/vuetify/commit/b207522f5767f11edf56d4c4f0fad0b8dd8fcbb7)), closes [#21832](https://github.com/vuetifyjs/vuetify/issues/21832)
- **VTextField:** don't try to re-focus input on focus ([#21722](https://github.com/vuetifyjs/vuetify/issues/21722)) ([14c88df](https://github.com/vuetifyjs/vuetify/commit/14c88df44eff939e176f8c01cc4350d2be0d81c5)), closes [#21716](https://github.com/vuetifyjs/vuetify/issues/21716) [#21626](https://github.com/vuetifyjs/vuetify/issues/21626) [#21717](https://github.com/vuetifyjs/vuetify/issues/21717)
- **VTreeview:** hide extended lines when fluid ([#21798](https://github.com/vuetifyjs/vuetify/issues/21798)) ([5728b2b](https://github.com/vuetifyjs/vuetify/commit/5728b2b2fc9a1e608bb395cc077f5640261a57ea)), closes [#21794](https://github.com/vuetifyjs/vuetify/issues/21794)

### :test_tube: Labs

- **VPie:** create new component ([#21176](https://github.com/vuetifyjs/vuetify/issues/21176)) ([5f0ebca](https://github.com/vuetifyjs/vuetify/commit/5f0ebca99b830f2cdce234b5f45529a1553c66ef))
- **VStepperVertical:** correct avatar alignment ([#21797](https://github.com/vuetifyjs/vuetify/issues/21797)) ([6292149](https://github.com/vuetifyjs/vuetify/commit/6292149811091210af7005bbaf7de37aea66b69a)), closes [#21792](https://github.com/vuetifyjs/vuetify/issues/21792)
- **VVideo:** create new component ([#21460](https://github.com/vuetifyjs/vuetify/issues/21460)) ([936eba2](https://github.com/vuetifyjs/vuetify/commit/936eba2ef278137d650b00acf0425116ec8237eb)), closes [#5592](https://github.com/vuetifyjs/vuetify/issues/5592)

## v3.9.2 - 2025-07-18T05:24:09Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.9.2

### :arrows_counterclockwise: Reverts

- Revert "perf(VTreeview): prevent unnecessary re-renders" ([9cfc322](https://github.com/vuetifyjs/vuetify/commit/9cfc322cbc416ba1a206b42f421c238f46a38b94)), closes [#21778](https://github.com/vuetifyjs/vuetify/issues/21778)

## v3.9.1 - 2025-07-17T09:27:20Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.9.1

### :wrench: Bug Fixes

- **input:** handle aria-describedby with hide-details ([#21703](https://github.com/vuetifyjs/vuetify/issues/21703)) ([543f932](https://github.com/vuetifyjs/vuetify/commit/543f932622f1de44a215c71fbe8d52af3edea1bd)), closes [#17012](https://github.com/vuetifyjs/vuetify/issues/17012) [#19794](https://github.com/vuetifyjs/vuetify/issues/19794)
- **VChipGroup:** don't select items with a value by index ([#21742](https://github.com/vuetifyjs/vuetify/issues/21742)) ([72cd412](https://github.com/vuetifyjs/vuetify/commit/72cd412ac7a794cc7fbb18918928c4e819827449)), closes [#20129](https://github.com/vuetifyjs/vuetify/issues/20129)
- **VDatePicker:** improved date comparison with `min` constraint ([#21398](https://github.com/vuetifyjs/vuetify/issues/21398)) ([421a6f6](https://github.com/vuetifyjs/vuetify/commit/421a6f68557e617e0e24b9e525a4cebd841c4f2c)), closes [#21380](https://github.com/vuetifyjs/vuetify/issues/21380)
- **VField:** fix label accessibility ([#21706](https://github.com/vuetifyjs/vuetify/issues/21706)) ([85abd80](https://github.com/vuetifyjs/vuetify/commit/85abd8078a2cba159b1cc3caa323519b3b29dec6))
- **VFileUploadItem:** apply classes, styles as props ([#21752](https://github.com/vuetifyjs/vuetify/issues/21752)) ([d6050f0](https://github.com/vuetifyjs/vuetify/commit/d6050f051ac36cadef5cb6ae1e8995875d2b4bfe)), closes [#21740](https://github.com/vuetifyjs/vuetify/issues/21740)
- **VList:** ignore invalid itemType values ([4bae0bc](https://github.com/vuetifyjs/vuetify/commit/4bae0bcfba724d90eafda96801ed597558e30885)), closes [#21728](https://github.com/vuetifyjs/vuetify/issues/21728)
- **VListItem:** keyboard navigation when list contains checkboxes ([#21701](https://github.com/vuetifyjs/vuetify/issues/21701)) ([f500c5b](https://github.com/vuetifyjs/vuetify/commit/f500c5bad5d0da31d8ebec0447cd4b68f91bcbbd)), closes [#21516](https://github.com/vuetifyjs/vuetify/issues/21516)
- **VSelect:** don't open menu on its own when items change ([#21247](https://github.com/vuetifyjs/vuetify/issues/21247)) ([339bd45](https://github.com/vuetifyjs/vuetify/commit/339bd45a1fd75b8d51dafcc1d0b270f07c985ee0)), closes [#21205](https://github.com/vuetifyjs/vuetify/issues/21205)
- **VSelectionControl:** correctly pass ripple options to directive ([#21713](https://github.com/vuetifyjs/vuetify/issues/21713)) ([87a8a3e](https://github.com/vuetifyjs/vuetify/commit/87a8a3ef0edb14d43179442c1727cf5b3d86edab)), closes [#21208](https://github.com/vuetifyjs/vuetify/issues/21208)
- **VTreeview:** don't display expanded items as activated ([683dc86](https://github.com/vuetifyjs/vuetify/commit/683dc863d1e8736ac8bda93f58f2b8cc8fa819b4)), closes [#21721](https://github.com/vuetifyjs/vuetify/issues/21721) [#21724](https://github.com/vuetifyjs/vuetify/issues/21724)

### :rocket: Features

- **ripple:** use key names instead of codes ([7ecec03](https://github.com/vuetifyjs/vuetify/commit/7ecec03fb50267507928c6de6751dee16540ea7f))

### :fire: Performance Improvements

- **VTreeview:** prevent unnecessary re-renders ([96a4d95](https://github.com/vuetifyjs/vuetify/commit/96a4d95aeaf34b76e3ee218aa43b65eb9e78e99d)), closes [#19919](https://github.com/vuetifyjs/vuetify/issues/19919) [#21720](https://github.com/vuetifyjs/vuetify/issues/21720)

### :microscope: Code Refactoring

- **layout:** consoleWarn instead of error for missing layout items ([34b53f1](https://github.com/vuetifyjs/vuetify/commit/34b53f10b5ae1b218721b32d51c757adecf343f7))

### :test_tube: Labs

- **VColorInput:** ensure cancel action closes menu ([#21664](https://github.com/vuetifyjs/vuetify/issues/21664)) ([7822179](https://github.com/vuetifyjs/vuetify/commit/7822179df9d61dec98179ddcb70346d949305412)), closes [#21655](https://github.com/vuetifyjs/vuetify/issues/21655)
- **VDateInput:** align generic model type with VDatePicker ([#21764](https://github.com/vuetifyjs/vuetify/issues/21764)) ([0cfca46](https://github.com/vuetifyjs/vuetify/commit/0cfca46b2da04c9b98e7a56788f9e648f31b6c3e)), closes [#21751](https://github.com/vuetifyjs/vuetify/issues/21751) [#21753](https://github.com/vuetifyjs/vuetify/issues/21753)
- **VDateInput:** assign type to displayFormat function ([#21684](https://github.com/vuetifyjs/vuetify/issues/21684)) ([4446ebf](https://github.com/vuetifyjs/vuetify/commit/4446ebff30e96f1d7629bafa0c8b8bad8f473307)), closes [#21683](https://github.com/vuetifyjs/vuetify/issues/21683)
- **VDateInput:** avoid time values in the field ([#21694](https://github.com/vuetifyjs/vuetify/issues/21694)) ([d4efd48](https://github.com/vuetifyjs/vuetify/commit/d4efd487d384f94a263d2af9b8abc5dbb8381134))
- **VMaskInput:** send unmasked value to rules ([#21719](https://github.com/vuetifyjs/vuetify/issues/21719)) ([64943b3](https://github.com/vuetifyjs/vuetify/commit/64943b30c4a84ddfaa565f9b2d62285450aa128b))
- **VStepperVertical:** fix next/prev-text props ([#21360](https://github.com/vuetifyjs/vuetify/issues/21360)) ([11986c6](https://github.com/vuetifyjs/vuetify/commit/11986c6e2ac351c38194cd3a8c74f6e03f58e3cf)), closes [#21358](https://github.com/vuetifyjs/vuetify/issues/21358)

## v3.9.0 - 2025-07-08T10:02:31Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.9.0

### Release Notes

- [VTreeview](https://vuetifyjs.com/components/treeview/)
- [VTimePicker](https://vuetifyjs.com/components/time-pickers/)

### :rocket: Features

- **date:** add StringDateAdapter ([#21174](https://github.com/vuetifyjs/vuetify/issues/21174)) ([7fe9152](https://github.com/vuetifyjs/vuetify/commit/7fe91520fb9ab3ae58d4f7eeba6c0a7b431e6198)), closes [#20967](https://github.com/vuetifyjs/vuetify/issues/20967)
- **date:** export VuetifyDateAdapter ([#21252](https://github.com/vuetifyjs/vuetify/issues/21252)) ([1a98d03](https://github.com/vuetifyjs/vuetify/commit/1a98d030a7b9547d519b1491e14e97f3e554ee6e)), closes [#19904](https://github.com/vuetifyjs/vuetify/issues/19904)
- **theme:** add new theme 'system' ([#21244](https://github.com/vuetifyjs/vuetify/issues/21244)) ([8393a41](https://github.com/vuetifyjs/vuetify/commit/8393a41287d34dba56cb2140bcc1aa44de62ffcb))
- **theme:** add new option 'unimportant' to generate classes without `!important` ([3190331](https://github.com/vuetifyjs/vuetify/commit/3190331e70f42b7fdf4d7ee04f662b15eefde026))
- **theme:** add change, toggle, and cycle functions ([#21224](https://github.com/vuetifyjs/vuetify/issues/21224)) ([3570254](https://github.com/vuetifyjs/vuetify/commit/357025485c7e8ac8dbc254a9fb37a3360e8c8d79))
- **transition:** expose create transition functions ([#21352](https://github.com/vuetifyjs/vuetify/issues/21352)) ([79f36aa](https://github.com/vuetifyjs/vuetify/commit/79f36aa042284471c7a7cb248721de884e4ef329)), closes [#16050](https://github.com/vuetifyjs/vuetify/issues/16050)
- **types:** emit GlobalDirectives ([136dfdf](https://github.com/vuetifyjs/vuetify/commit/136dfdf99380063ed20ca8d0672e1e450faf5431)), closes [#21475](https://github.com/vuetifyjs/vuetify/issues/21475)
- **useHotkey:** add new composable for making hotkey bindings ([#21598](https://github.com/vuetifyjs/vuetify/issues/21598)) ([99c721c](https://github.com/vuetifyjs/vuetify/commit/99c721c381e47b403429c7de194306013c0ec679))
- **VAlert:** better aligment with prepend icon ([#20700](https://github.com/vuetifyjs/vuetify/issues/20700)) ([5231b95](https://github.com/vuetifyjs/vuetify/commit/5231b956c39477e913648dcbaef4030c284b1ece)), closes [#20636](https://github.com/vuetifyjs/vuetify/issues/20636)
- **VBadge:** add width and height props ([#21509](https://github.com/vuetifyjs/vuetify/issues/21509)) ([b87f179](https://github.com/vuetifyjs/vuetify/commit/b87f17933b31cf63289ffccdd78eda3682decc07)), closes [#20837](https://github.com/vuetifyjs/vuetify/issues/20837)
- **VBtnGroup:** add `direction="vertical"` ([#17878](https://github.com/vuetifyjs/vuetify/issues/17878)) ([5f39b85](https://github.com/vuetifyjs/vuetify/commit/5f39b8586e99c4529da9ef71576c048e711757e8)), closes [#17492](https://github.com/vuetifyjs/vuetify/issues/17492)
- **VCombobox:** scroll to first item on search result ([#21255](https://github.com/vuetifyjs/vuetify/issues/21255)) ([57bb5ad](https://github.com/vuetifyjs/vuetify/commit/57bb5adb426372ca6af48b961a5b3533efa7d703)), closes [#20572](https://github.com/vuetifyjs/vuetify/issues/#20572)
- **VDataTable:** support `fixed: 'end'` in headers ([#21665](https://github.com/vuetifyjs/vuetify/issues/21665)) ([415c267](https://github.com/vuetifyjs/vuetify/commit/415c267d057ad49334d9801c4fdb0c6aa9dcdcd1)), closes [#20020](https://github.com/vuetifyjs/vuetify/issues/20020) [#21153](https://github.com/vuetifyjs/vuetify/issues/21153)
- **VDatePicker:** expose slots from underlying components ([#21532](https://github.com/vuetifyjs/vuetify/issues/21532)) ([1e351a2](https://github.com/vuetifyjs/vuetify/commit/1e351a2015db61564c3432662e4fc7700dff3a84)), closes [#20236](https://github.com/vuetifyjs/vuetify/issues/20236)
- **VDatePicker:** add `weekday-format` prop ([#21290](https://github.com/vuetifyjs/vuetify/issues/21290)) ([b13b15c](https://github.com/vuetifyjs/vuetify/commit/b13b15c865252f43f09ef590feeaeaac6a49bc1b))
- **VInfiniteScroll:** add reset method ([#20637](https://github.com/vuetifyjs/vuetify/issues/20637)) ([2e5bc43](https://github.com/vuetifyjs/vuetify/commit/2e5bc4330bf7409870516b818dcdd8bb0f36d0d5)), closes [#20308](https://github.com/vuetifyjs/vuetify/issues/20308) [#19935](https://github.com/vuetifyjs/vuetify/issues/19935)
- **VKbd:** update default styling, add configurable options ([8ea20d9](https://github.com/vuetifyjs/vuetify/commit/8ea20d9fccaca572465d31af780f460d03f489db))
- **VNumberInput:** custom decimal separator ([#21489](https://github.com/vuetifyjs/vuetify/issues/21489)) ([534c1e7](https://github.com/vuetifyjs/vuetify/commit/534c1e72363dadfee213f0360272c29d308b28af)), closes [#20254](https://github.com/vuetifyjs/vuetify/issues/20254)
- **VNumberInput:** more flexible precision display ([#21315](https://github.com/vuetifyjs/vuetify/issues/21315)) ([d5779cd](https://github.com/vuetifyjs/vuetify/commit/d5779cd8529c6589d215569453733700b095ffe9)), closes [#21306](https://github.com/vuetifyjs/vuetify/issues/21306)
- **VOtpInput:** allow to keep focus on paste ([#21356](https://github.com/vuetifyjs/vuetify/issues/21356)) ([cb8015d](https://github.com/vuetifyjs/vuetify/commit/cb8015daad38b7d9c6853e1053d78ab148574804)), closes [#21275](https://github.com/vuetifyjs/vuetify/issues/21275)
- **VOverlay:** align scrim color with MD3 ([#21219](https://github.com/vuetifyjs/vuetify/issues/21219)) ([29d22a6](https://github.com/vuetifyjs/vuetify/commit/29d22a6737fa7e68bdd49c522a5b36dca3cabe11)), closes [#20244](https://github.com/vuetifyjs/vuetify/issues/20244)
- **VSelect:** add `no-auto-scroll` prop ([#21254](https://github.com/vuetifyjs/vuetify/issues/21254)) ([1e0f1c1](https://github.com/vuetifyjs/vuetify/commit/1e0f1c1a527deb5256844e4663d6931840736968)), closes [#20237](https://github.com/vuetifyjs/vuetify/issues/20237)
- **VSelect:** support divider and subheader in items ([#21348](https://github.com/vuetifyjs/vuetify/issues/21348)) ([0953ed2](https://github.com/vuetifyjs/vuetify/commit/0953ed22c81c1c8d51505a2e35e222af1880698a)), closes [#5014](https://github.com/vuetifyjs/vuetify/issues/5014) [#15721](https://github.com/vuetifyjs/vuetify/issues/15721)
- **VSelect/VAutoComplete/VCombobox:** add `item-type` prop ([eaa4d15](https://github.com/vuetifyjs/vuetify/commit/eaa4d15caac1b66868a6af42e52b22cf2279821b)), closes [#21666](https://github.com/vuetifyjs/vuetify/issues/21666)
- **VSlideGroup:** add content class to VSlideGroup props ([#21431](https://github.com/vuetifyjs/vuetify/issues/21431)) ([935351c](https://github.com/vuetifyjs/vuetify/commit/935351cc0e80c2327701a071eeeff15f1a128310)), , closes [#20853](https://github.com/vuetifyjs/vuetify/issues/20853)
- **VSlider:** expose focus method ([#21575](https://github.com/vuetifyjs/vuetify/issues/21575)) ([6790e1e](https://github.com/vuetifyjs/vuetify/commit/6790e1ebfa820506f92a68f4c9055a2a36413b4b)), closes [#17602](https://github.com/vuetifyjs/vuetify/issues/17602)
- **VTable:** add striped prop ([#19735](https://github.com/vuetifyjs/vuetify/issues/19735)) ([35b3304](https://github.com/vuetifyjs/vuetify/commit/35b3304a18bdb39df3431b71eef52cdef11130c9)), closes [#17505](https://github.com/vuetifyjs/vuetify/issues/17505)
- **VTextarea:** add update:rows event ([#21226](https://github.com/vuetifyjs/vuetify/issues/21226)) ([e72d4d3](https://github.com/vuetifyjs/vuetify/commit/e72d4d30088ef47d5abf2e4533cc62c8ee91f823)), closes [#21133](https://github.com/vuetifyjs/vuetify/issues/21133)
- **VTimePicker:** promote from labs ([7ce2cd6](https://github.com/vuetifyjs/vuetify/commit/7ce2cd68cb40d8de9c2135bdf33c9be9140d22c3))
- **VTimePicker:** remove ampmInTitle prop ([#21595](https://github.com/vuetifyjs/vuetify/issues/21595)) ([e32796a](https://github.com/vuetifyjs/vuetify/commit/e32796a114711f2b30d3401abea11bfd8b8c2460)), closes [#19637](https://github.com/vuetifyjs/vuetify/issues/19637) [#19957](https://github.com/vuetifyjs/vuetify/issues/19957)
- **VToolbar:** allow for explicit `:extension="false"` ([#21264](https://github.com/vuetifyjs/vuetify/issues/21264)) ([092e64a](https://github.com/vuetifyjs/vuetify/commit/092e64a10aa6e1b476e0e7fddaf01d1bb1df3793)), closes [#7317](https://github.com/vuetifyjs/vuetify/issues/7317)
- **VTreeview:** promote from labs ([b610813](https://github.com/vuetifyjs/vuetify/commit/b6108138fdbfb2cc157a29602817708676a23491))
- **VTreeview:** expose depth, path, index in slots ([#19833](https://github.com/vuetifyjs/vuetify/issues/19833)) ([bd908af](https://github.com/vuetifyjs/vuetify/commit/bd908afc7e335904c2fb35aa73541d8c04a9fcfb)), closes [#13863](https://github.com/vuetifyjs/vuetify/issues/13863)
- **VTreeview:** support `item-type` ([#21709](https://github.com/vuetifyjs/vuetify/issues/21709)) ([877f323](https://github.com/vuetifyjs/vuetify/commit/877f3232698147dee01effc57b2a9770d2ed0e39))
- **VTreeview:** add `indent-lines` prop ([#21675](https://github.com/vuetifyjs/vuetify/issues/21675)) ([501e016](https://github.com/vuetifyjs/vuetify/commit/501e01641f226b54d80176c9e5a20baa4dd7df43)), closes [#11506](https://github.com/vuetifyjs/vuetify/issues/11506)
- **VVirtualScroll:** support fractional scroll index ([#20407](https://github.com/vuetifyjs/vuetify/issues/20407)) ([adad9e2](https://github.com/vuetifyjs/vuetify/commit/adad9e2629fffa52b0abbb7d18297a5c0078074f))
- **VWindow:** add `vertical-arrows` prop ([#21587](https://github.com/vuetifyjs/vuetify/issues/21587)) ([663b9a8](https://github.com/vuetifyjs/vuetify/commit/663b9a83ee602200adae115500594d462ddfff16))

### :wrench: Bug Fixes

- **inputs:** expose missing validation methods ([be64296](https://github.com/vuetifyjs/vuetify/commit/be6429615af6e0e9e0aad7ef21bfe7a1403229ec)), closes [#19934](https://github.com/vuetifyjs/vuetify/issues/19934)
- **types:** don't use primitive object wrappers ([32007ed](https://github.com/vuetifyjs/vuetify/commit/32007ed2d34f9a131eb73faeb7629c0ff515f7b2))
- **VAutocomplete, VCombobox:** space key should not select ([#21311](https://github.com/vuetifyjs/vuetify/issues/21311)) ([f9288ad](https://github.com/vuetifyjs/vuetify/commit/f9288ad7dbfb3547d36e036932e653270eb9ff08)), closes [#20728](https://github.com/vuetifyjs/vuetify/issues/20728)
- **VDatePicker:** round font-size from 13.6 to 14px ([#21590](https://github.com/vuetifyjs/vuetify/issues/21590)) ([d81a4a0](https://github.com/vuetifyjs/vuetify/commit/d81a4a0cf81353c96f6c5557d8c9be77df7a5836))
- **VDatePicker:** format month to always have 2 digits ([#21686](https://github.com/vuetifyjs/vuetify/issues/21686)) ([f529212](https://github.com/vuetifyjs/vuetify/commit/f529212faffbde85299023b1eb0f4fa344e87df7)), closes [#21681](https://github.com/vuetifyjs/vuetify/issues/21681)
- **VMenu:** let persistent menus coexist with regular ones ([#21449](https://github.com/vuetifyjs/vuetify/issues/21449)) ([30ac0fc](https://github.com/vuetifyjs/vuetify/commit/30ac0fcdd491d0eba970d383023d183aafcef491)), closes [#20976](https://github.com/vuetifyjs/vuetify/issues/20976)
- **VTimePicker:** auto width ([#21613](https://github.com/vuetifyjs/vuetify/issues/21613)) ([5d1ceab](https://github.com/vuetifyjs/vuetify/commit/5d1ceab3e519974cdde29f7e7610ffb5972ac6a7))
- **VTreeview:** restore reactivity with computed items ([107dd0c](https://github.com/vuetifyjs/vuetify/commit/107dd0c6822a5f029e302627f040a43a82bebb58)), closes [#20900](https://github.com/vuetifyjs/vuetify/issues/20900)
- **VTreeview:** activatable implies openOnClick=false ([c0b7d7b](https://github.com/vuetifyjs/vuetify/commit/c0b7d7b518727f8d43e4463dd3e69edfa4c43d73))
- **VTreeview:** select trunk nodes on click when openOnClick=false ([e6a1710](https://github.com/vuetifyjs/vuetify/commit/e6a1710296ea0cb67d6877a9c587766b5565f90d)), closes [#21599](https://github.com/vuetifyjs/vuetify/issues/21599)
- **VTreeview:** prevent checkbox deselection when mandatory ([431af5f](https://github.com/vuetifyjs/vuetify/commit/431af5fa7df28d98d7bb76f88a1803ec98a62719)), closes [#21614](https://github.com/vuetifyjs/vuetify/issues/21614)
- **VTreeview:** don't select disabled children with parent ([#20962](https://github.com/vuetifyjs/vuetify/issues/20962)) ([0772bc1](https://github.com/vuetifyjs/vuetify/commit/0772bc11c10cd55ca1dd186a64819337b38bc3fd)), closes [#20386](https://github.com/vuetifyjs/vuetify/issues/20386)
- **VTreeview:** set active state from router ([#21644](https://github.com/vuetifyjs/vuetify/issues/21644)) ([01c7a4f](https://github.com/vuetifyjs/vuetify/commit/01c7a4f8a0af4b62eda99bcd7eac56ef452e22d8))
- **VTreeview:** modelValue reactivity ([6daf53d](https://github.com/vuetifyjs/vuetify/commit/6daf53ddbd7f66155f1e1cce870968153fc2b1df))

### :microscope: Code Refactoring

- **theme:** add internal methods for testing tailwind integration ([abfdb77](https://github.com/vuetifyjs/vuetify/commit/abfdb777e0e00d4a1798f52d7e4c118e7409fcb9))

### :test_tube: Labs

- **VCalendar:** use adapter for day element key ([#21689](https://github.com/vuetifyjs/vuetify/issues/21689)) ([428f460](https://github.com/vuetifyjs/vuetify/commit/428f4602b54b6ecbfcc37cd2edf61703ae49712e)), closes [#21688](https://github.com/vuetifyjs/vuetify/issues/21688)
- **VHotkey:** add new component ([#21598](https://github.com/vuetifyjs/vuetify/issues/21598)) ([99c721c](https://github.com/vuetifyjs/vuetify/commit/99c721c381e47b403429c7de194306013c0ec679))
- **VMaskInput:** create new component ([#21519](https://github.com/vuetifyjs/vuetify/issues/21519)) ([117443a](https://github.com/vuetifyjs/vuetify/commit/117443afbe676d5d31ab20b4a549cb7405994493))

### :rocket: Features

- **VDataTable:** replace `lastFixed` with `fixed: 'end'` ([#21665](https://github.com/vuetifyjs/vuetify/issues/21665)) ([415c267](https://github.com/vuetifyjs/vuetify/commit/415c267d057ad49334d9801c4fdb0c6aa9dcdcd1)), closes [#20020](https://github.com/vuetifyjs/vuetify/issues/20020) [#21153](https://github.com/vuetifyjs/vuetify/issues/21153)
- **VSelect/VAutoComplete/VCombobox:** add `item-type` prop ([eaa4d15](https://github.com/vuetifyjs/vuetify/commit/eaa4d15caac1b66868a6af42e52b22cf2279821b)), closes [#21666](https://github.com/vuetifyjs/vuetify/issues/21666)
- **VTreeview:** support `item-type` ([#21709](https://github.com/vuetifyjs/vuetify/issues/21709)) ([877f323](https://github.com/vuetifyjs/vuetify/commit/877f3232698147dee01effc57b2a9770d2ed0e39))
- **VTreeview:** add `indent-lines` prop ([#21675](https://github.com/vuetifyjs/vuetify/issues/21675)) ([501e016](https://github.com/vuetifyjs/vuetify/commit/501e01641f226b54d80176c9e5a20baa4dd7df43)), closes [#11506](https://github.com/vuetifyjs/vuetify/issues/11506)

### :wrench: Bug Fixes

- **VDatePicker:** format month to always have 2 digits ([#21686](https://github.com/vuetifyjs/vuetify/issues/21686)) ([f529212](https://github.com/vuetifyjs/vuetify/commit/f529212faffbde85299023b1eb0f4fa344e87df7)), closes [#21681](https://github.com/vuetifyjs/vuetify/issues/21681)
- **VSelects:** avoid error with `null` items ([#21660](https://github.com/vuetifyjs/vuetify/issues/21660)) ([dd98067](https://github.com/vuetifyjs/vuetify/commit/dd98067d8fb2ac46c5cd7f23d630777b61129797))
- **VTreeview:** don't select disabled children with parent ([#20962](https://github.com/vuetifyjs/vuetify/issues/20962)) ([0772bc1](https://github.com/vuetifyjs/vuetify/commit/0772bc11c10cd55ca1dd186a64819337b38bc3fd)), closes [#20386](https://github.com/vuetifyjs/vuetify/issues/20386)
- **VTreeview:** set active state from router ([#21644](https://github.com/vuetifyjs/vuetify/issues/21644)) ([01c7a4f](https://github.com/vuetifyjs/vuetify/commit/01c7a4f8a0af4b62eda99bcd7eac56ef452e22d8))
- **VTreeview:** modelValue reactivity ([6daf53d](https://github.com/vuetifyjs/vuetify/commit/6daf53ddbd7f66155f1e1cce870968153fc2b1df))

### :test_tube: Labs

- **VCalendar:** use adapter for day element key ([#21689](https://github.com/vuetifyjs/vuetify/issues/21689)) ([428f460](https://github.com/vuetifyjs/vuetify/commit/428f4602b54b6ecbfcc37cd2edf61703ae49712e)), closes [#21688](https://github.com/vuetifyjs/vuetify/issues/21688)
- **VHotkey:** add new component ([#21598](https://github.com/vuetifyjs/vuetify/issues/21598)) ([99c721c](https://github.com/vuetifyjs/vuetify/commit/99c721c381e47b403429c7de194306013c0ec679))

## v3.8.12 - 2025-07-02T07:55:06Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.8.12

### :wrench: Bug Fixes

- **date:** align `fullDate` format with documentation and other adapters ([#21668](https://github.com/vuetifyjs/vuetify/issues/21668)) ([c856da3](https://github.com/vuetifyjs/vuetify/commit/c856da3c4d5b0ac6a8c2ac5f8312debc3009fae4)), closes [#21667](https://github.com/vuetifyjs/vuetify/issues/21667)
- **virtual:** skip items update if height has not been checked ([#21442](https://github.com/vuetifyjs/vuetify/issues/21442)) ([2e55ed3](https://github.com/vuetifyjs/vuetify/commit/2e55ed3d30daf6ea19660fb8168ea45fca0e9b1d)), closes [#18806](https://github.com/vuetifyjs/vuetify/issues/18806)
- **VDataTable:** continue sorting if dates are identical ([a9d0c56](https://github.com/vuetifyjs/vuetify/commit/a9d0c560d77392c803fd0c27b4748b82591dd0e0)), closes [#21650](https://github.com/vuetifyjs/vuetify/issues/21650)
- **VDataTable:** only tab focus sortable columns ([27aaaf4](https://github.com/vuetifyjs/vuetify/commit/27aaaf41246aaaf3bed977c74d0b962daf0a5662)), closes [#20899](https://github.com/vuetifyjs/vuetify/issues/20899)
- **VDatePicker:** correct week labels ([#21648](https://github.com/vuetifyjs/vuetify/issues/21648)) ([b46e60c](https://github.com/vuetifyjs/vuetify/commit/b46e60c5eba21438c4ecd412ec99f67ebbb24dac)), closes [#21645](https://github.com/vuetifyjs/vuetify/issues/21645) [#21332](https://github.com/vuetifyjs/vuetify/issues/21332)
- **VOtpInput:** only autofocus if autofocus prop is set ([79bcb27](https://github.com/vuetifyjs/vuetify/commit/79bcb27d8b6006ac9e50787b8e771f46b402e315))
- **VOverlay:** properly detect location flipping loop ([07db6b2](https://github.com/vuetifyjs/vuetify/commit/07db6b2fdda106325fff514f603b861ae788fee4)), closes [#21564](https://github.com/vuetifyjs/vuetify/issues/21564) [#21551](https://github.com/vuetifyjs/vuetify/issues/21551)
- **VTextField:** avoid infinite focus loop ([#21628](https://github.com/vuetifyjs/vuetify/issues/21628)) ([efaaa5d](https://github.com/vuetifyjs/vuetify/commit/efaaa5d4f02e886b3e0c46e1f9dd9eed1cdf2e88)), closes [#21626](https://github.com/vuetifyjs/vuetify/issues/21626)

### :test_tube: Labs

- **VCalendar:** slot day-event not available ([#21558](https://github.com/vuetifyjs/vuetify/issues/21558)) ([d743051](https://github.com/vuetifyjs/vuetify/commit/d743051c3fc2ba99c77b49e2fa99f9925af50eb6)), closes [#21341](https://github.com/vuetifyjs/vuetify/issues/21341)
- **VIconBtn:** add button type  ([#21638](https://github.com/vuetifyjs/vuetify/issues/21638)) ([dd1db74](https://github.com/vuetifyjs/vuetify/commit/dd1db749edd8df351727c01eeca67a1bb7fb8fb6)), closes [#21634](https://github.com/vuetifyjs/vuetify/issues/21634)

## v3.8.11 - 2025-06-24T11:16:18Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.8.11

### :wrench: Bug Fixes

- **VBtn:** allow text values for letter-spacing Sass variable ([#21602](https://github.com/vuetifyjs/vuetify/issues/21602)) ([525b0fd](https://github.com/vuetifyjs/vuetify/commit/525b0fd1d1f2afb9d0814db35e073386b61f7346)), closes [#21600](https://github.com/vuetifyjs/vuetify/issues/21600)
- **VCarousel:** avoid missing progress bar ([#21586](https://github.com/vuetifyjs/vuetify/issues/21586)) ([488ebc7](https://github.com/vuetifyjs/vuetify/commit/488ebc7bbabdee16f634a7ed8618951f8a9b3ee9))
- **VDatePicker:** completely hide days not in weekdays array ([#21624](https://github.com/vuetifyjs/vuetify/issues/21624)) ([010ded6](https://github.com/vuetifyjs/vuetify/commit/010ded6b9ad4c61c8750c70399b2cc4953e2ed2d)), closes [#21492](https://github.com/vuetifyjs/vuetify/issues/21492) [#19718](https://github.com/vuetifyjs/vuetify/issues/19718)
- **VList:** set item value to item if primitive ([#21596](https://github.com/vuetifyjs/vuetify/issues/21596)) ([58007ca](https://github.com/vuetifyjs/vuetify/commit/58007ca1546a1fcb26d8d0be7962eebd8b9d9cde)), closes [#21584](https://github.com/vuetifyjs/vuetify/issues/21584)
- **VNumberInput:** fix endless increment ([#21610](https://github.com/vuetifyjs/vuetify/issues/21610)) ([939a51c](https://github.com/vuetifyjs/vuetify/commit/939a51cc57f38e11bb17ae7cb5145c985b379f85)), closes [#21581](https://github.com/vuetifyjs/vuetify/issues/21581)
- **VSelect, VAutocomplete, VCombobox:** open menu on icon click ([#21617](https://github.com/vuetifyjs/vuetify/issues/21617)) ([ec4dfc1](https://github.com/vuetifyjs/vuetify/commit/ec4dfc1f33ca0074e0dd4ffa5eb2a7599a44c2ed)), closes [#21607](https://github.com/vuetifyjs/vuetify/issues/21607)

## v3.8.10 - 2025-06-18T11:45:46Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.8.10

### :wrench: Bug Fixes

- **VBtn:** correct letter-spacing compensation for RTL ([#21574](https://github.com/vuetifyjs/vuetify/issues/21574)) ([3f06979](https://github.com/vuetifyjs/vuetify/commit/3f069798215ece5c9ffb4f3262d1511b0f72421e))
- **VBtnToggle:** buttons should be accessible despite overflow ([#21577](https://github.com/vuetifyjs/vuetify/issues/21577)) ([005cf15](https://github.com/vuetifyjs/vuetify/commit/005cf1582ecfbaf54135d81bd72a7ef8b8e93e9e)), closes [#15398](https://github.com/vuetifyjs/vuetify/issues/15398)
- **VDataTableColumn:** on tab focus also show sortable icon ([#21540](https://github.com/vuetifyjs/vuetify/issues/21540)) ([fef3588](https://github.com/vuetifyjs/vuetify/commit/fef3588a9e496869cb3c1520d1d631403b40aa5e))
- **VDatePicker:** reactive month and year ([#21563](https://github.com/vuetifyjs/vuetify/issues/21563)) ([9099082](https://github.com/vuetifyjs/vuetify/commit/9099082dbfe14611f43265a3973b77fab0f0b055)), closes [#21562](https://github.com/vuetifyjs/vuetify/issues/21562)
- **VDatePicker:** Fix autoscroll ([#21556](https://github.com/vuetifyjs/vuetify/issues/21556)) ([f5f13f5](https://github.com/vuetifyjs/vuetify/commit/f5f13f526b097ff33dee826a9d567539d232c866)), closes [#21513](https://github.com/vuetifyjs/vuetify/issues/21513)
- **VListGroup:** use item value in id with return-object ([#20595](https://github.com/vuetifyjs/vuetify/issues/20595)) ([1c38414](https://github.com/vuetifyjs/vuetify/commit/1c38414f6426a15ef4fdccfe8d6e186b6c549e30)), closes [#20477](https://github.com/vuetifyjs/vuetify/issues/20477)
- **VNumberInput:** focus after click handler executed ([#21217](https://github.com/vuetifyjs/vuetify/issues/21217)) ([1452442](https://github.com/vuetifyjs/vuetify/commit/14524423646a06fe6962183cda84a38c68feb6fe)), closes [#21213](https://github.com/vuetifyjs/vuetify/issues/21213)
- **VOtpInput:** autofocus on intersect ([90ed073](https://github.com/vuetifyjs/vuetify/commit/90ed073aaf041c0e0807c0f178ae45a1ceff6987)), closes [#21582](https://github.com/vuetifyjs/vuetify/issues/21582)
- **VSpeedDial:** avoid position glitch when reopening menu ([#21451](https://github.com/vuetifyjs/vuetify/issues/21451)) ([d5a77c1](https://github.com/vuetifyjs/vuetify/commit/d5a77c16030ba4ec1afcdef17d2089e0a9d99969)), closes [#21017](https://github.com/vuetifyjs/vuetify/issues/21017)
- **VTabs:** deselect tab when route is no longer active ([524bf58](https://github.com/vuetifyjs/vuetify/commit/524bf58a7ca26cbb190e4082426e1ada26976846)), closes [#21569](https://github.com/vuetifyjs/vuetify/issues/21569)
- **VWindow, VTabs:** don't override cursor in VWindowItem ([#21138](https://github.com/vuetifyjs/vuetify/issues/21138)) ([afda7ad](https://github.com/vuetifyjs/vuetify/commit/afda7addbbe3e2ff05b7eebd9e99270d1de7513c)), closes [#20090](https://github.com/vuetifyjs/vuetify/issues/20090)

### :test_tube: Labs

- **VFileUpload:** file name not passed correctly ([#21541](https://github.com/vuetifyjs/vuetify/issues/21541)) ([06d4593](https://github.com/vuetifyjs/vuetify/commit/06d4593da36a97ca325951e08842e5622ad8bd9b)), closes [#21319](https://github.com/vuetifyjs/vuetify/issues/21319)
- **VTimePicker:** value not changing on wheel ([#21549](https://github.com/vuetifyjs/vuetify/issues/21549)) ([3667eb5](https://github.com/vuetifyjs/vuetify/commit/3667eb53a1ce4ae61da4c514595587f42d42e566)), closes [#21524](https://github.com/vuetifyjs/vuetify/issues/21524)
- **VTreeview:** stop click bubbling up on expand icon ([#21083](https://github.com/vuetifyjs/vuetify/issues/21083)) ([8d38332](https://github.com/vuetifyjs/vuetify/commit/8d38332d957ce7a5eb05abd23615822db1b33b84)), closes [#20442](https://github.com/vuetifyjs/vuetify/issues/20442)
- **VTreeview:** avoid inaccessible items when overflow ([#21443](https://github.com/vuetifyjs/vuetify/issues/21443)) ([5c9dcb3](https://github.com/vuetifyjs/vuetify/commit/5c9dcb333a751582e5ecae7ea40b49d395d327b1)), closes [#21387](https://github.com/vuetifyjs/vuetify/issues/21387)

## v3.8.9 - 2025-06-11T12:01:31Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.8.9

### :wrench: Bug Fixes

- **date:** week number for DST ([#21378](https://github.com/vuetifyjs/vuetify/issues/21378)) ([386363f](https://github.com/vuetifyjs/vuetify/commit/386363f142ce945dc23c505435d117b671182af9)), closes [#21366](https://github.com/vuetifyjs/vuetify/issues/21366)
- **date:** keep `createDateRange` internal ([#21531](https://github.com/vuetifyjs/vuetify/issues/21531)) ([e507eee](https://github.com/vuetifyjs/vuetify/commit/e507eee8972a8aec9111c7f713d72c982072d61d))
- **icons:** add missing aliases in presets ([055e9cc](https://github.com/vuetifyjs/vuetify/commit/055e9cc619c8dc1d3429a78f267b7d9e3736cb99)), closes [#21521](https://github.com/vuetifyjs/vuetify/issues/21521)
- **VDataTable:** columns are not keyboard-accessible ([#20939](https://github.com/vuetifyjs/vuetify/issues/20939)) ([eb736cb](https://github.com/vuetifyjs/vuetify/commit/eb736cb135ef5af66e49a6303e83cfaced08de36)), closes [#20899](https://github.com/vuetifyjs/vuetify/issues/20899)
- **VDataTable:** add missing aria label on footer text ([#21508](https://github.com/vuetifyjs/vuetify/issues/21508)) ([202207c](https://github.com/vuetifyjs/vuetify/commit/202207c0fb9ad9b8b356eb8bf86b506a5e803c7a)), closes [#20896](https://github.com/vuetifyjs/vuetify/issues/20896)
- **VFileInput,VFileUpload:** handle folders drop ([#21495](https://github.com/vuetifyjs/vuetify/issues/21495)) ([5dbcf96](https://github.com/vuetifyjs/vuetify/commit/5dbcf96216e859c683cafedabfc9226a82f72a7b)), closes [#21494](https://github.com/vuetifyjs/vuetify/issues/21494)
- **VOtpInput:** trim clipboard text and update focus on finish ([#21342](https://github.com/vuetifyjs/vuetify/issues/21342)) ([ed6c0e6](https://github.com/vuetifyjs/vuetify/commit/ed6c0e654b0f3dbecb608c2fef9ac015e81f08f1))
- **VSelect:** camelize props only for custom use ([#21544](https://github.com/vuetifyjs/vuetify/issues/21544)) ([6f52c4e](https://github.com/vuetifyjs/vuetify/commit/6f52c4e6f39c06e5ae46216fcd25d2db0840a007))
- **VSlider:** Apply color to slider label ([#21538](https://github.com/vuetifyjs/vuetify/issues/21538)) ([5a35b0c](https://github.com/vuetifyjs/vuetify/commit/5a35b0c0864b0b7307575c8343c09ac67eabfad0))
- **VTextField:** change order of events for checking input focus state ([#21136](https://github.com/vuetifyjs/vuetify/issues/21136)) ([6486b22](https://github.com/vuetifyjs/vuetify/commit/6486b22982fbeababf07452feef4a6c8afea01ed)), closes [#20558](https://github.com/vuetifyjs/vuetify/issues/20558)

## v3.8.8 - 2025-06-04T05:37:56Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.8.8

### :rocket: Features

- **VDatePicker:** disable months and years if not allowed ([#21466](https://github.com/vuetifyjs/vuetify/issues/21466)) ([3b1c450](https://github.com/vuetifyjs/vuetify/commit/3b1c450298d595feb40776fb310b801c8e7d6034)), closes [#20465](https://github.com/vuetifyjs/vuetify/issues/20465)

### :wrench: Bug Fixes

- **VChip:** disable close button of disabled chip ([#21512](https://github.com/vuetifyjs/vuetify/issues/21512)) ([fed90ca](https://github.com/vuetifyjs/vuetify/commit/fed90caa9657dd94c609c6c6d5862e968d0d7b9f)), closes [#21502](https://github.com/vuetifyjs/vuetify/issues/21502)
- **VSelect:** convert all itemProps keys to camelCase ([#21518](https://github.com/vuetifyjs/vuetify/issues/21518)) ([91de8be](https://github.com/vuetifyjs/vuetify/commit/91de8be450af407ca2ed31e20a907f074ce25a34)), closes [#20320](https://github.com/vuetifyjs/vuetify/issues/20320)
- **VSelect:** reuse compact chip label style ([#21517](https://github.com/vuetifyjs/vuetify/issues/21517)) ([5d39936](https://github.com/vuetifyjs/vuetify/commit/5d39936912be2735868471f1a4d836073b6eea11)), closes [#19677](https://github.com/vuetifyjs/vuetify/issues/19677)
- **VSlider:** correct step rounding for max value ([#21434](https://github.com/vuetifyjs/vuetify/issues/21434)) ([19f32b7](https://github.com/vuetifyjs/vuetify/commit/19f32b7c2b05638b1cc32f0715b4b383adea7738)), closes [#21351](https://github.com/vuetifyjs/vuetify/issues/21351)

### :microscope: Code Refactoring

- **VNumberInput:** replace touch-action with pointercancel ([97e3509](https://github.com/vuetifyjs/vuetify/commit/97e3509f90f17a43ff27bd0850fc501bbc0afe13)), closes [#21436](https://github.com/vuetifyjs/vuetify/issues/21436)

### :test_tube: Labs

- **VDateInput:** use common date range parser ([#21450](https://github.com/vuetifyjs/vuetify/issues/21450)) ([5ef1243](https://github.com/vuetifyjs/vuetify/commit/5ef12434aa48ddd43993fd9545f8002d6a4c1da5)), closes [#21448](https://github.com/vuetifyjs/vuetify/issues/21448)

## v3.8.7 - 2025-05-27T08:17:02Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.8.7

### :wrench: Bug Fixes

- **VField:** prevent tab focus on clear icon ([5f8208f](https://github.com/vuetifyjs/vuetify/commit/5f8208f41da4cf66907f5094312c9dbfb5e67a06)), closes [#19528](https://github.com/vuetifyjs/vuetify/issues/19528)
- **VMenu:** position relative to visualViewport when not zoomed ([6523eee](https://github.com/vuetifyjs/vuetify/commit/6523eee4dbcf2de396cfbaabc5d05b66487d9afa)), closes [#21462](https://github.com/vuetifyjs/vuetify/issues/21462)
- **VNumberInput:** extract number from pasted text ([#21263](https://github.com/vuetifyjs/vuetify/issues/21263)) ([d654af4](https://github.com/vuetifyjs/vuetify/commit/d654af45023008a965a2fabf963ef86fc7c696db))
- **VNumberInput:** capture touch pointer on controls ([34d37f3](https://github.com/vuetifyjs/vuetify/commit/34d37f3d05695f73bd352d450effbd0d3ee17944)), closes [#21436](https://github.com/vuetifyjs/vuetify/issues/21436)
- **VSelect:** keyboard match multiple items with the same prefix ([#21419](https://github.com/vuetifyjs/vuetify/issues/21419)) ([f460731](https://github.com/vuetifyjs/vuetify/commit/f460731d86465c85923e587d59984bf716078293))

### :microscope: Code Refactoring

- resolve directives directly ([#21413](https://github.com/vuetifyjs/vuetify/issues/21413)) ([e5e85ee](https://github.com/vuetifyjs/vuetify/commit/e5e85ee2faeffe7b39a3fbaaedbcb43f205943b3))
- use clamp() util function ([6784ba7](https://github.com/vuetifyjs/vuetify/commit/6784ba7aae029c3e25dd92197c5b5d19feb43430))

## v3.8.6 - 2025-05-21T06:52:32Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.8.6

### :wrench: Bug Fixes

- **VNumberInput:** inner spacing adjustments ([#21389](https://github.com/vuetifyjs/vuetify/issues/21389)) ([cdd6ab9](https://github.com/vuetifyjs/vuetify/commit/cdd6ab99fabe4ff2c12e567eaf704f0768993d81))
- **VSelect:** don't select on keyboard lookup when multiple ([0987daa](https://github.com/vuetifyjs/vuetify/commit/0987daacf695b1621e9953334cea2b0eb57f9c64)), closes [#21418](https://github.com/vuetifyjs/vuetify/issues/21418)

### :test_tube: Labs

- **validation:** resolve global rules ([#21267](https://github.com/vuetifyjs/vuetify/issues/21267)) ([27e72f5](https://github.com/vuetifyjs/vuetify/commit/27e72f5537beb380b4cd0b88554dd1f89a035429))

## v3.8.5 - 2025-05-14T11:19:50Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.8.5

### :wrench: Bug Fixes

- **VBottomNavigation:** set inline margin to auto ([#21357](https://github.com/vuetifyjs/vuetify/issues/21357)) ([68b52ed](https://github.com/vuetifyjs/vuetify/commit/68b52edc49c86456ec20d89737bf53b9031a4f74)), closes [#21316](https://github.com/vuetifyjs/vuetify/issues/21316)
- **VPagination:** adapt button width for large values ([#21139](https://github.com/vuetifyjs/vuetify/issues/21139)) ([c6dc1ca](https://github.com/vuetifyjs/vuetify/commit/c6dc1cabd68ef17f396738e3abab3b7e0fe283f1)), closes [#20120](https://github.com/vuetifyjs/vuetify/issues/20120)
- **VSnackbarQueue:** prevent infinite recursion in message type ([4668f43](https://github.com/vuetifyjs/vuetify/commit/4668f432f2c7a31322872e5dfbda789c775cd633)), closes [#21410](https://github.com/vuetifyjs/vuetify/issues/21410)

### :arrows_counterclockwise: Reverts

- Revert "fix(VAutocomplete): re-evaluate dirty on external change (#21344)" ([5086a34](https://github.com/vuetifyjs/vuetify/commit/5086a34597872fcf3682380e77440eaf1cf8ea77)), closes [#21392](https://github.com/vuetifyjs/vuetify/issues/21392)

### :test_tube: Labs

- **VColorInput:** add new component ([#20623](https://github.com/vuetifyjs/vuetify/issues/20623)) ([dec238a](https://github.com/vuetifyjs/vuetify/commit/dec238ab186def75dff1a1120253f6348f2f877c))
- **VDateInput:** Set validationValue to modelValue ([#21408](https://github.com/vuetifyjs/vuetify/issues/21408)) ([3d1df29](https://github.com/vuetifyjs/vuetify/commit/3d1df29b52aa59d733669ac120530ccf420d6f2f)), closes [#20351](https://github.com/vuetifyjs/vuetify/issues/20351)
- **VDateInput:** sync with placeholder, infer from locale ([#21409](https://github.com/vuetifyjs/vuetify/issues/21409)) ([d75f5e3](https://github.com/vuetifyjs/vuetify/commit/d75f5e315d92cf3c36b88a4148cca4f4ff7a0d77)), closes [#21397](https://github.com/vuetifyjs/vuetify/issues/21397)
- **VDateInput:** accept value when picker is hidden ([#21273](https://github.com/vuetifyjs/vuetify/issues/21273)) ([99331d6](https://github.com/vuetifyjs/vuetify/commit/99331d6a9a0a661723761c80cd1570b2bf9b9d1c))
- **VDateInput:** Add input-format prop ([#21221](https://github.com/vuetifyjs/vuetify/issues/21221)) ([7949324](https://github.com/vuetifyjs/vuetify/commit/7949324f6022ec5d749dc0450af6370a213cf633))
- **VDateInput:** expose menu as v-model ([#21298](https://github.com/vuetifyjs/vuetify/issues/21298)) ([c6f3cdb](https://github.com/vuetifyjs/vuetify/commit/c6f3cdbbaf2fe468364fb566bb07b6fe51768ffa))

## v3.8.4 - 2025-05-07T11:46:01Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.8.4

### :wrench: Bug Fixes

- **VAutocomplete:** re-evaluate dirty on external change ([#21344](https://github.com/vuetifyjs/vuetify/issues/21344)) ([3a2c846](https://github.com/vuetifyjs/vuetify/commit/3a2c846c9ce1985647aff78100de325efe6982db)), closes [#20718](https://github.com/vuetifyjs/vuetify/issues/20718)
- **VDataTable:** shift click should only toggle selectable rows ([#21334](https://github.com/vuetifyjs/vuetify/issues/21334)) ([cd971b4](https://github.com/vuetifyjs/vuetify/commit/cd971b4ad1f24dfd3b72f0c8db8b7f218723d15f)), closes [#21328](https://github.com/vuetifyjs/vuetify/issues/21328)
- **VDataTableServer/Virtual:** add generic headers type ([32044d0](https://github.com/vuetifyjs/vuetify/commit/32044d0420ec9d11bec20964eb31db7a3d659de4)), closes [#21327](https://github.com/vuetifyjs/vuetify/issues/21327)
- **VDialog:** only take focus on open if scrim or retainFocus ([#21343](https://github.com/vuetifyjs/vuetify/issues/21343)) ([d678b70](https://github.com/vuetifyjs/vuetify/commit/d678b70de8e2d417b910b7411e07f73fef0eb8a5)), closes [#21301](https://github.com/vuetifyjs/vuetify/issues/21301)
- **VFileInput/VFileUpload:** change function not called on drop ([#21182](https://github.com/vuetifyjs/vuetify/issues/21182)) ([30363c9](https://github.com/vuetifyjs/vuetify/commit/30363c9599f01d6c10d1cd0755ecdd9e545cccd6))
- **VOverlay:** check if target is positioned ([10478a7](https://github.com/vuetifyjs/vuetify/commit/10478a73f22d5e312d3ef0b79f02b3f89b63fe31)), closes [#21350](https://github.com/vuetifyjs/vuetify/issues/21350)
- **VTable:** remove border radius when top/bottom is present ([95582d9](https://github.com/vuetifyjs/vuetify/commit/95582d9f26189ab9fd1f63a233631ce9e1c1c471)), closes [#21320](https://github.com/vuetifyjs/vuetify/issues/21320) [#21321](https://github.com/vuetifyjs/vuetify/issues/21321)
- **VTextField:** reset field on clear ([#21310](https://github.com/vuetifyjs/vuetify/issues/21310)) ([#21314](https://github.com/vuetifyjs/vuetify/issues/21314)) ([5029e1b](https://github.com/vuetifyjs/vuetify/commit/5029e1b7162d1dd2547ce8c295f44def08962e8e))
- **VTooltip:** disable transition when transition=false ([5d58b69](https://github.com/vuetifyjs/vuetify/commit/5d58b693cd059bb728f27ea01c7fce3e10fb4dd9)), closes [#21268](https://github.com/vuetifyjs/vuetify/issues/21268)

### :test_tube: Labs

- **VDateInput:** If multiple, reset model to [] ([#21299](https://github.com/vuetifyjs/vuetify/issues/21299)) ([3a9602b](https://github.com/vuetifyjs/vuetify/commit/3a9602b991ab4eeff639b75a7043aac4d7de35a2))
- **VDateInput:** add update-on prop ([#21249](https://github.com/vuetifyjs/vuetify/issues/21249)) ([7304a37](https://github.com/vuetifyjs/vuetify/commit/7304a373444e72f47c7dbee137878826d2f2b4cc)), closes [#21245](https://github.com/vuetifyjs/vuetify/issues/21245) [#20964](https://github.com/vuetifyjs/vuetify/issues/20964)
- **VTimePicker:** SSR hydration mismatch error ([#21355](https://github.com/vuetifyjs/vuetify/issues/21355)) ([f17fbd6](https://github.com/vuetifyjs/vuetify/commit/f17fbd6db35292dccac3c5043292eacc4c089f33))

## v3.8.3 - 2025-04-29T07:24:58Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.8.3

### :wrench: Bug Fixes

- **VMenu:** use last known position if target is hidden ([#21145](https://github.com/vuetifyjs/vuetify/issues/21145)) ([00814a3](https://github.com/vuetifyjs/vuetify/commit/00814a33fbe17262f11ef7c7d4fc1df709ad370e)), closes [#20515](https://github.com/vuetifyjs/vuetify/issues/20515)
- **VOverlay:** prevent flip logic resizeObserver loop ([#21300](https://github.com/vuetifyjs/vuetify/issues/21300)) ([94d49da](https://github.com/vuetifyjs/vuetify/commit/94d49dad40977dafec96984fa17a2fadcbe64f1e)), closes [#21098](https://github.com/vuetifyjs/vuetify/issues/21098)
- **VSelect:** add aria-label a11y ([#21181](https://github.com/vuetifyjs/vuetify/issues/21181)) ([95c77fd](https://github.com/vuetifyjs/vuetify/commit/95c77fd74ba418afbc44c22f1d8b14eaed7a81ad))

### :microscope: Code Refactoring

- replace computed() with toRef() ([#21167](https://github.com/vuetifyjs/vuetify/issues/21167)) ([9b07be9](https://github.com/vuetifyjs/vuetify/commit/9b07be93d4f0a57727033ab912b4b8adbd33befd))
- **defaults:** reduce computed getter calls ([8d798e3](https://github.com/vuetifyjs/vuetify/commit/8d798e36baf86f04eebf2828be0cffa0dc31053a))

### :arrows_counterclockwise: Reverts

- Revert "fix(validation): a disabled / readonly field should always be valid (#21222)" ([89d6df0](https://github.com/vuetifyjs/vuetify/commit/89d6df0e2bb99ed65627df4376ec05ed5a236ed9))

### :test_tube: Labs

- **VCalendar:** add emits and slots ([#19568](https://github.com/vuetifyjs/vuetify/issues/19568)) ([616d861](https://github.com/vuetifyjs/vuetify/commit/616d861a1ff4b8219c98afe5059f6da7000550d1))
- **VIconBtn:** always use icon-size if present ([c903c55](https://github.com/vuetifyjs/vuetify/commit/c903c55a99181a8c0c3b7ae8e2ff511bee95a11c))

## v3.8.2 - 2025-04-16T14:43:33Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.8.2

### :wrench: Bug Fixes

- **md3:** use outlined variant for form controls ([64fae35](https://github.com/vuetifyjs/vuetify/commit/64fae35b9e72eacdb863e82cf1998bedbbd5527c))
- **validation:** a disabled / readonly field should always be valid ([#21222](https://github.com/vuetifyjs/vuetify/issues/21222)) ([8711494](https://github.com/vuetifyjs/vuetify/commit/87114942c2aee84c9d47342dcd15a6515dc67778))
- **VAutocomplete:** correct match splitting with custom filter ([1bef712](https://github.com/vuetifyjs/vuetify/commit/1bef7128a300840cee6eb5ae393bc3976a86375f)), closes [#21228](https://github.com/vuetifyjs/vuetify/issues/21228)
- **VCode:** display multiline as inline-block ([d183b40](https://github.com/vuetifyjs/vuetify/commit/d183b407c100ca23c457cb8d25daec60369d9f3b))
- **VDataTable:** ignore default filter if query is empty ([0a8de9b](https://github.com/vuetifyjs/vuetify/commit/0a8de9b32e15855b1146d080c634f2e30b158c13)), closes [#21212](https://github.com/vuetifyjs/vuetify/issues/21212)
- **VDataTable:** data table expand button content overflows ([#21218](https://github.com/vuetifyjs/vuetify/issues/21218)) ([82a321a](https://github.com/vuetifyjs/vuetify/commit/82a321adb5030ebed752a6b944e68ddc29701737)), closes [#20545](https://github.com/vuetifyjs/vuetify/issues/20545)
- **VDatePicker:** resolve firstDayOfWeek from locale ([#21260](https://github.com/vuetifyjs/vuetify/issues/21260)) ([1c1d6b0](https://github.com/vuetifyjs/vuetify/commit/1c1d6b05096ed2edef6006892343101075ef3327))
- **VDatePicker:** use start of week to calculate week numbers ([#21199](https://github.com/vuetifyjs/vuetify/issues/21199)) ([7321535](https://github.com/vuetifyjs/vuetify/commit/7321535bbb4d561883c44924425120d126562095)), closes [#20724](https://github.com/vuetifyjs/vuetify/issues/20724) [#20490](https://github.com/vuetifyjs/vuetify/issues/20490)
- **VTooltip, VSnackbar:** increase contrast on dark theme ([#21184](https://github.com/vuetifyjs/vuetify/issues/21184)) ([638977e](https://github.com/vuetifyjs/vuetify/commit/638977e7685f7c105a43ed541cfd37718bde94ea))

## v3.8.1 - 2025-04-07T11:19:15Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.8.1

### :wrench: Bug Fixes

- **VDataTable:** use current page items for shift click selection ([#21210](https://github.com/vuetifyjs/vuetify/issues/21210)) ([73608b7](https://github.com/vuetifyjs/vuetify/commit/73608b7a7e1cfe1cd58b140dbaf0b5ccb57ffe98)), closes [#21190](https://github.com/vuetifyjs/vuetify/issues/21190)
- **VField:** glow prop color on focus only, add to menuIcon ([3c595d2](https://github.com/vuetifyjs/vuetify/commit/3c595d25df24a9d61421a1b01d0b72ca60990cf0))
- **VNavigationDrawer:** swipe visual glitch ([#21203](https://github.com/vuetifyjs/vuetify/issues/21203)) ([91d74ec](https://github.com/vuetifyjs/vuetify/commit/91d74ec1278692ef5c45739dc5620d83f533a38d)), closes [#19874](https://github.com/vuetifyjs/vuetify/issues/19874)
- **VSelect:** prevent menu from opening when readonly ([971930e](https://github.com/vuetifyjs/vuetify/commit/971930eeea4ccc1c87453d5384cdd82136a8bd11)), closes [#21169](https://github.com/vuetifyjs/vuetify/issues/21169) [#21178](https://github.com/vuetifyjs/vuetify/issues/21178)
- **VTextField:** padding adjustment for `reverse` mode ([#21194](https://github.com/vuetifyjs/vuetify/issues/21194)) ([e820ca7](https://github.com/vuetifyjs/vuetify/commit/e820ca7f01a7443ad8c5d586c2c9deee02af44f7)), closes [#21191](https://github.com/vuetifyjs/vuetify/issues/21191)

### :microscope: Code Refactoring

- **theme:** abstract functions outside of createTheme ([8546fef](https://github.com/vuetifyjs/vuetify/commit/8546fefbe385c50330e47c23b96cf23dcb9c5a8d))

## v3.8.0 - 2025-04-01T07:28:15Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.8.0

### Release Notes

- [VNumberInput](https://vuetifyjs.com/components/number-inputs/)
- [VSnackbarQueue](https://vuetifyjs.com/components/snackbar-queue/)

### :rocket: Features

- **border:** add new class border-current for currentColor ([e0bbf57](https://github.com/vuetifyjs/vuetify/commit/e0bbf57b9589a4b17e2275fe5a601dee676ce109))
- **framework:** add unmount function ([5d9db2c](https://github.com/vuetifyjs/vuetify/commit/5d9db2cc957a7d1d0efec9513cd9639b7089d9e4)), closes [#20429](https://github.com/vuetifyjs/vuetify/issues/20429)
- **framework:** allow tag prop to accept component definitions ([327a2c9](https://github.com/vuetifyjs/vuetify/commit/327a2c92404b1cb7faba68c3655550ca6f574d25)), closes [#20806](https://github.com/vuetifyjs/vuetify/issues/20806)
- **framework:** require vue 3.5 ([8c5a2b9](https://github.com/vuetifyjs/vuetify/commit/8c5a2b92fdeb4e3e50a5cccf09bf999724a3f875))
- **nested:** add trunk select strategy ([ca38ce3](https://github.com/vuetifyjs/vuetify/commit/ca38ce33f22d2f00d2337f719d74b45a4d8b56e4)), closes [#6759](https://github.com/vuetifyjs/vuetify/issues/6759)
- **theme:** add stylesheetId and scope options ([#20789](https://github.com/vuetifyjs/vuetify/issues/20789)) ([794a2e6](https://github.com/vuetifyjs/vuetify/commit/794a2e6999c20b69c041f94ea44d64d5e916ad68)), closes [#4065](https://github.com/vuetifyjs/vuetify/issues/4065)
- **types:** expose public interfaces ([44be603](https://github.com/vuetifyjs/vuetify/commit/44be6034569b938621c44dd877e76ea6314c2f78)), closes [#16680](https://github.com/vuetifyjs/vuetify/issues/16680) [#19723](https://github.com/vuetifyjs/vuetify/issues/19723) [#21052](https://github.com/vuetifyjs/vuetify/issues/21052)
- **VAutocomplete/VCombobox:** support multiple match highlighting ([#16462](https://github.com/vuetifyjs/vuetify/issues/16462)) ([9da6442](https://github.com/vuetifyjs/vuetify/commit/9da64422e5bf4cf24819b5b7cf4c03b8405ee34e)), closes [#18946](https://github.com/vuetifyjs/vuetify/issues/18946)
- **VChip:** add new prop `baseColor` ([#20702](https://github.com/vuetifyjs/vuetify/issues/20702)) ([1e099f2](https://github.com/vuetifyjs/vuetify/commit/1e099f2c1858617a4447c308326cf204f9e9d112)), closes [#19678](https://github.com/vuetifyjs/vuetify/issues/19678)
- **VColorPicker:** support emitting rgb() and hsl() strings ([a5efcf1](https://github.com/vuetifyjs/vuetify/commit/a5efcf167fe82ad8d5565f6688fb957a05b7a7f2)), closes [#20944](https://github.com/vuetifyjs/vuetify/issues/20944)
- **VConfirmEdit:** add new prop `hideActions` ([9618326](https://github.com/vuetifyjs/vuetify/commit/9618326a61254366e1f6b7408fe1c4ea8a2aa6a4)), closes [#20905](https://github.com/vuetifyjs/vuetify/issues/20905)
- **VDataTable:** support shift click for multiple selection ([c9a2a22](https://github.com/vuetifyjs/vuetify/commit/c9a2a2269b0492cc3cd0b757888be9ddd96316ba)), closes [#20055](https://github.com/vuetifyjs/vuetify/issues/20055)
- **VDataTableVirtual:** expose scrollToIndex ([#21006](https://github.com/vuetifyjs/vuetify/issues/21006)) ([526f160](https://github.com/vuetifyjs/vuetify/commit/526f1605057ece9dc9516c5ca90b189acc2551e5))
- **VDatePicker:** add new prop `controlHeight` ([6090515](https://github.com/vuetifyjs/vuetify/commit/609051508221132d55518dfbe759b22adbcd68b7))
- **VDatePicker:** add new prop `headerColor` ([fcf392b](https://github.com/vuetifyjs/vuetify/commit/fcf392b7963170dcc2d8424a7ce75cc3a3a9ca43))
- **VDatePicker:** add rtl classes ([a9ad813](https://github.com/vuetifyjs/vuetify/commit/a9ad813275aa4f6a2b465cf2278b550d7124fae5))
- **VField/VInput:** add new props `iconColor` and `glow` ([#21076](https://github.com/vuetifyjs/vuetify/issues/21076)) ([409fa95](https://github.com/vuetifyjs/vuetify/commit/409fa95f7cfb80f572d74b9d09f828b72958dc15)), closes [#17763](https://github.com/vuetifyjs/vuetify/issues/17763)
- **VIcon:** add new prop `opacity` ([499ba21](https://github.com/vuetifyjs/vuetify/commit/499ba211cb346cc8a063f61f36524f4b5ea88297))
- **VNumberInput:** promote from labs ([11efba2](https://github.com/vuetifyjs/vuetify/commit/11efba208a092399304543b8283ccc3485514154))
- **VSnackbarQueue:** promote from labs ([aa8d4c9](https://github.com/vuetifyjs/vuetify/commit/aa8d4c933ce2b23c44ee183946a9469e0f48c9d4))
- **VTimeline:** add `side` prop for individual items ([#20855](https://github.com/vuetifyjs/vuetify/issues/20855)) ([1c65f8f](https://github.com/vuetifyjs/vuetify/commit/1c65f8fe9ce0bd81e5ade43c4bb51bf0b883cb80)), closes [#19363](https://github.com/vuetifyjs/vuetify/issues/19363)
- **VTooltip:** add new prop `interactive` ([1599512](https://github.com/vuetifyjs/vuetify/commit/159951278e9a27309d4d1eb633b426c770989584)), closes [#19473](https://github.com/vuetifyjs/vuetify/issues/19473)
- **VVirtualScroll:** add new prop `itemKey` ([fabc511](https://github.com/vuetifyjs/vuetify/commit/fabc511bfbf90149b536ba09c6ba5e18bafd4c3a)), closes [#20809](https://github.com/vuetifyjs/vuetify/issues/20809)

### :wrench: Bug Fixes

- **blueprints/md1/md2/md3:** set VDatePicker defaults ([d9c8918](https://github.com/vuetifyjs/vuetify/commit/d9c8918629d78f61c92d8acd2c6f14e3c01c4f29))
- **build:** use subpath exports in import maps ([90986f2](https://github.com/vuetifyjs/vuetify/commit/90986f29bd851f4c5b180b258fe729bdb872580a))
- **calendar:** don't allow selecting dates outside of weekdays prop ([b1f270b](https://github.com/vuetifyjs/vuetify/commit/b1f270ba28a32ece9fa7add603f6dd310944a588)), closes [#19718](https://github.com/vuetifyjs/vuetify/issues/19718)
- **framework:** replace getUid with vue's useId ([cbd14a7](https://github.com/vuetifyjs/vuetify/commit/cbd14a7ace7e210fab91b4b2003ff0bcd7892d32)), closes [#19696](https://github.com/vuetifyjs/vuetify/issues/19696)
- **package:** fix missing types and simplify exports ([#21104](https://github.com/vuetifyjs/vuetify/issues/21104)) ([7811fdd](https://github.com/vuetifyjs/vuetify/commit/7811fdd5c759fa14c09bd943c27d239335a53a38))
- **package:** add .mjs -> .js export redirect ([d06119b](https://github.com/vuetifyjs/vuetify/commit/d06119b638e42337e5db8ea60690e3e7fde4e33e))
- **types:** support moduleResolution node16 ([011be15](https://github.com/vuetifyjs/vuetify/commit/011be154dcfb547540ed20f5e8928555798ac298))
- **types:** optimise build ([#20484](https://github.com/vuetifyjs/vuetify/issues/20484)) ([bf13ecc](https://github.com/vuetifyjs/vuetify/commit/bf13eccde630b14820f4e24b09f3b34f90bb255e)), closes [#20480](https://github.com/vuetifyjs/vuetify/issues/20480)
- **VAutocomplete:** clear input searchterm on blur  ([#21130](https://github.com/vuetifyjs/vuetify/issues/21130)) ([05076ce](https://github.com/vuetifyjs/vuetify/commit/05076ce61f6af069198dc4f676509f0a5e306c73)), closes [#20993](https://github.com/vuetifyjs/vuetify/issues/20993)
- **VColorPicker:** disable EyeDropper when component is disabled ([#21180](https://github.com/vuetifyjs/vuetify/issues/21180)) ([0a25791](https://github.com/vuetifyjs/vuetify/commit/0a25791a0e19bb8e1db1f77c292d3a7ccbe53763)), closes [#21179](https://github.com/vuetifyjs/vuetify/issues/21179)
- **VDataTableVirtual:** add missing thead, tbody, tfoot slots ([#19072](https://github.com/vuetifyjs/vuetify/issues/19072)) ([b6db70d](https://github.com/vuetifyjs/vuetify/commit/b6db70d8eeb98cbf186bceecf0600d2355c979a4))
- **VEmptyState:** pass href/to props to VBtn ([#21172](https://github.com/vuetifyjs/vuetify/issues/21172)) ([4575be2](https://github.com/vuetifyjs/vuetify/commit/4575be2b3c86a4f53cd6fc859fdaa10feb980350)), closes [#21170](https://github.com/vuetifyjs/vuetify/issues/21170)
- **VField:** min-height calculation incorrect ([3d09d1c](https://github.com/vuetifyjs/vuetify/commit/3d09d1cbf558b66830dce78bfe784af1b2f8f501))
- **VList:** ignore input element interactions ([#20881](https://github.com/vuetifyjs/vuetify/issues/20881)) ([f54ca9a](https://github.com/vuetifyjs/vuetify/commit/f54ca9a12f65f69b95c0b45accc7783a2b1c6d52)), closes [#20523](https://github.com/vuetifyjs/vuetify/issues/20523)
- **VTimeline:** alignment consistency ([#20876](https://github.com/vuetifyjs/vuetify/issues/20876)) ([2d3ddd5](https://github.com/vuetifyjs/vuetify/commit/2d3ddd5c7599bcc3c89c8853f83047fadafa5a45))
- **VVirtualScroll:** don't fully deep watch items ([70db0c7](https://github.com/vuetifyjs/vuetify/commit/70db0c7ea6c63a0f6a6acc4979716894a952cc92)), closes [#19941](https://github.com/vuetifyjs/vuetify/issues/19941) [#20608](https://github.com/vuetifyjs/vuetify/issues/20608)

### :microscope: Code Refactoring

- **VColorPicker:** implement VPicker ([5530832](https://github.com/vuetifyjs/vuetify/commit/55308327b73953a0f3cd3999f2c42172e72b1f99))
- **VDatePickerMonth:** remove VDefaultsProvider usage ([d96798a](https://github.com/vuetifyjs/vuetify/commit/d96798aeddaa7c164c117e05a901e49d86971353))
- **VField:** default slot fallback ([#21074](https://github.com/vuetifyjs/vuetify/issues/21074)) ([0a8528a](https://github.com/vuetifyjs/vuetify/commit/0a8528a9c6517ece5cf8199002ba093c31e3164d))

### :test_tube: Labs

- **rules:** add useRules composable ([#18332](https://github.com/vuetifyjs/vuetify/issues/18332)) ([f7d9377](https://github.com/vuetifyjs/vuetify/commit/f7d9377988736b0f0480bc66daf112e16a4250f9))
- **VDateInput:** remove blur on selection entirely ([6acf68c](https://github.com/vuetifyjs/vuetify/commit/6acf68ccee5bd3bd17f4536cb6254a67e7257f2d))
- **VDateInput:** Always enable cancel button ([#21154](https://github.com/vuetifyjs/vuetify/issues/21154)) ([a477e71](https://github.com/vuetifyjs/vuetify/commit/a477e71874042106d755a67a130eb6a9f7b71df7)), closes [#20226](https://github.com/vuetifyjs/vuetify/issues/20226)
- **VDateInput:** prevent crash when pressing enter during text input ([#21077](https://github.com/vuetifyjs/vuetify/issues/21077)) ([47a9601](https://github.com/vuetifyjs/vuetify/commit/47a9601ccacb1abae222b99ec0236c2787666467)), closes [#21072](https://github.com/vuetifyjs/vuetify/issues/21072)
- **VDateInput:** use display props and remove extra code ([#21152](https://github.com/vuetifyjs/vuetify/issues/21152)) ([9645765](https://github.com/vuetifyjs/vuetify/commit/964576595de80b459b12b87db41bbe826194f828))
- **VDateInput:** hide confirm actions by default ([dca7872](https://github.com/vuetifyjs/vuetify/commit/dca78726abdbc2f3263d46d2862443eed1c70d6b))
- **VFileUpload:** support class & style props ([#21151](https://github.com/vuetifyjs/vuetify/issues/21151)) ([b8c48ba](https://github.com/vuetifyjs/vuetify/commit/b8c48ba11c661a53bd5bee4b5068c3a5748aff49)), closes [#21146](https://github.com/vuetifyjs/vuetify/issues/21146)
- **VIconBtn:** create new component ([#21114](https://github.com/vuetifyjs/vuetify/issues/21114)) ([3b8a325](https://github.com/vuetifyjs/vuetify/commit/3b8a325823fbc450e911cb25e4abaccf026990ea))
- **VPicker:** add new prop divided ([ea25366](https://github.com/vuetifyjs/vuetify/commit/ea253667c16efbd76b5a11935d0b73c40af3c842))

### :rocket: Features

- **border:** add new class border-current for currentColor ([e0bbf57](https://github.com/vuetifyjs/vuetify/commit/e0bbf57b9589a4b17e2275fe5a601dee676ce109))
- **VIcon:** add new prop opacity ([499ba21](https://github.com/vuetifyjs/vuetify/commit/499ba211cb346cc8a063f61f36524f4b5ea88297))

### :wrench: Bug Fixes

- **calendar:** don't allow selecting dates outside of weekdays prop ([b1f270b](https://github.com/vuetifyjs/vuetify/commit/b1f270ba28a32ece9fa7add603f6dd310944a588)), closes [#19718](https://github.com/vuetifyjs/vuetify/issues/19718)
- **framework:** replace hasOwn with hasOwnProperty ([227ba8e](https://github.com/vuetifyjs/vuetify/commit/227ba8e8f2b0793a9e210b2069534cfbe1361485))
- **VAutocomplete:** cleared input searchterm on blur  ([#21130](https://github.com/vuetifyjs/vuetify/issues/21130)) ([05076ce](https://github.com/vuetifyjs/vuetify/commit/05076ce61f6af069198dc4f676509f0a5e306c73)), closes [#20993](https://github.com/vuetifyjs/vuetify/issues/20993)
- **VColorPicker:** disable EyeDropper when component is disabled ([#21180](https://github.com/vuetifyjs/vuetify/issues/21180)) ([0a25791](https://github.com/vuetifyjs/vuetify/commit/0a25791a0e19bb8e1db1f77c292d3a7ccbe53763)), closes [#21179](https://github.com/vuetifyjs/vuetify/issues/21179)
- **VDataTableRow:** provide correct defaults for special slots ([#21071](https://github.com/vuetifyjs/vuetify/issues/21071)) ([a5e2de1](https://github.com/vuetifyjs/vuetify/commit/a5e2de10d2686b0d71b81cb6b15198dd2e3d61f4))
- **VDatePicker:** use adapter date in onMultipleClick ([#21091](https://github.com/vuetifyjs/vuetify/issues/21091)) ([0b1dc46](https://github.com/vuetifyjs/vuetify/commit/0b1dc46a366e7c2ab7fd1367e7c2216f306b60cc)), closes [#21090](https://github.com/vuetifyjs/vuetify/issues/21090)
- **VEmptyState:** pass href/to props to VBtn ([#21172](https://github.com/vuetifyjs/vuetify/issues/21172)) ([4575be2](https://github.com/vuetifyjs/vuetify/commit/4575be2b3c86a4f53cd6fc859fdaa10feb980350)), closes [#21170](https://github.com/vuetifyjs/vuetify/issues/21170)
- **VField:** min-height calculation incorrect ([3d09d1c](https://github.com/vuetifyjs/vuetify/commit/3d09d1cbf558b66830dce78bfe784af1b2f8f501))

### :microscope: Code Refactoring

- **VField:** add default slot fallback ([#21074](https://github.com/vuetifyjs/vuetify/issues/21074)) ([0a8528a](https://github.com/vuetifyjs/vuetify/commit/0a8528a9c6517ece5cf8199002ba093c31e3164d))
- **VIcon:** swap provideTheme with useTheme ([633e7c2](https://github.com/vuetifyjs/vuetify/commit/633e7c2da541660bdc22c1bf1cdd7cc71f0c3036))

### :test_tube: Labs

- **VDateInput:** remove blur on selection entirely ([6acf68c](https://github.com/vuetifyjs/vuetify/commit/6acf68ccee5bd3bd17f4536cb6254a67e7257f2d))
- **VDateInput:** Always enable cancel button ([#21154](https://github.com/vuetifyjs/vuetify/issues/21154)) ([a477e71](https://github.com/vuetifyjs/vuetify/commit/a477e71874042106d755a67a130eb6a9f7b71df7)), closes [#20226](https://github.com/vuetifyjs/vuetify/issues/20226)
- **VDateInput:** prevent crash when pressing enter during text input ([#21077](https://github.com/vuetifyjs/vuetify/issues/21077)) ([47a9601](https://github.com/vuetifyjs/vuetify/commit/47a9601ccacb1abae222b99ec0236c2787666467)), closes [#21072](https://github.com/vuetifyjs/vuetify/issues/21072)
- **VDateInput:** use display props and remove extra code ([#21152](https://github.com/vuetifyjs/vuetify/issues/21152)) ([9645765](https://github.com/vuetifyjs/vuetify/commit/964576595de80b459b12b87db41bbe826194f828))
- **VDateInput:** hide confirm actions by default ([dca7872](https://github.com/vuetifyjs/vuetify/commit/dca78726abdbc2f3263d46d2862443eed1c70d6b))
- **VFileUpload:** support class & style props ([#21151](https://github.com/vuetifyjs/vuetify/issues/21151)) ([b8c48ba](https://github.com/vuetifyjs/vuetify/commit/b8c48ba11c661a53bd5bee4b5068c3a5748aff49)), closes [#21146](https://github.com/vuetifyjs/vuetify/issues/21146)
- **VIconBtn:** create new component ([#21114](https://github.com/vuetifyjs/vuetify/issues/21114)) ([3b8a325](https://github.com/vuetifyjs/vuetify/commit/3b8a325823fbc450e911cb25e4abaccf026990ea))
- **VDateInput:** prevent mobile keyboard showing ([#21141](https://github.com/vuetifyjs/vuetify/issues/21141)) ([a9f9897](https://github.com/vuetifyjs/vuetify/commit/a9f9897d323738a4d8a308399d7a00d8a539facd)), closes [#20580](https://github.com/vuetifyjs/vuetify/issues/20580)
- **VDateInput:** add new display-format prop ([d177272](https://github.com/vuetifyjs/vuetify/commit/d177272641eeb988950e4f77776636f703106500))
- **VDateInput:** add missing save / cancel events ([5ce8ec8](https://github.com/vuetifyjs/vuetify/commit/5ce8ec87a03ba8315c6eac8d62852d3b1bdecf5c))

## v3.7.19 - 2025-03-26T00:27:12Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.7.19

### :wrench: Bug Fixes

- **framework:** replace hasOwn with hasOwnProperty ([227ba8e](https://github.com/vuetifyjs/vuetify/commit/227ba8e8f2b0793a9e210b2069534cfbe1361485))
- **VDataTableRow:** provide correct defaults for special slots ([#21071](https://github.com/vuetifyjs/vuetify/issues/21071)) ([a5e2de1](https://github.com/vuetifyjs/vuetify/commit/a5e2de10d2686b0d71b81cb6b15198dd2e3d61f4))
- **VDatePicker:** use adapter date in onMultipleClick ([#21091](https://github.com/vuetifyjs/vuetify/issues/21091)) ([0b1dc46](https://github.com/vuetifyjs/vuetify/commit/0b1dc46a366e7c2ab7fd1367e7c2216f306b60cc)), closes [#21090](https://github.com/vuetifyjs/vuetify/issues/21090)

### :microscope: Code Refactoring

- **VIcon:** swap provideTheme with useTheme ([633e7c2](https://github.com/vuetifyjs/vuetify/commit/633e7c2da541660bdc22c1bf1cdd7cc71f0c3036))

### :test_tube: Labs

- **VDateInput:** prevent mobile keyboard showing ([#21141](https://github.com/vuetifyjs/vuetify/issues/21141)) ([a9f9897](https://github.com/vuetifyjs/vuetify/commit/a9f9897d323738a4d8a308399d7a00d8a539facd)), closes [#20580](https://github.com/vuetifyjs/vuetify/issues/20580)
- **VDateInput:** add new display-format prop ([d177272](https://github.com/vuetifyjs/vuetify/commit/d177272641eeb988950e4f77776636f703106500))
- **VDateInput:** add missing save / cancel events ([5ce8ec8](https://github.com/vuetifyjs/vuetify/commit/5ce8ec87a03ba8315c6eac8d62852d3b1bdecf5c))

## v3.7.18 - 2025-03-18T15:11:35Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.7.18

### :arrows_counterclockwise: Reverts

- Revert "refactor(VDatePickerMonth): remove useless VDefaultsProvider" ([6fb2336](https://github.com/vuetifyjs/vuetify/commit/6fb23365e7c8ab47424708ffd1a90caddb136bc4))

## v3.7.17 - 2025-03-18T10:21:26Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.7.17

### :wrench: Bug Fixes

- **theme:** support unhead v2 ([#21106](https://github.com/vuetifyjs/vuetify/issues/21106)) ([5efcacb](https://github.com/vuetifyjs/vuetify/commit/5efcacbd137daa441f91c7a7c0546ffc8577eec2)), closes [#21112](https://github.com/vuetifyjs/vuetify/issues/21112)
- **VToolbar:** don't force full width when using floating prop ([0aea286](https://github.com/vuetifyjs/vuetify/commit/0aea28697b432e7ab945d90be7c76177cdf40843))

### :microscope: Code Refactoring

- **VField:** replace filterFieldProps with filterProps ([b8a8bc2](https://github.com/vuetifyjs/vuetify/commit/b8a8bc22948350dac3327d06f9b4842d54658655)), closes [#21087](https://github.com/vuetifyjs/vuetify/issues/21087)

### :test_tube: Labs

- **VDateInput:** handle empty model onKeydown ([84746fb](https://github.com/vuetifyjs/vuetify/commit/84746fbb799e4bd331d016ce2f969ba78eda66b7))

## v3.7.16 - 2025-03-11T13:55:10Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.7.16

### :wrench: Bug Fixes

- **framework:** accept string | number | boolean in text props ([c1a0bb1](https://github.com/vuetifyjs/vuetify/commit/c1a0bb18d2c53eb526ad8f776c169186a3552ebd))
- **VDataTable:** use width as minWidth for multiple fixed columns ([c2574c8](https://github.com/vuetifyjs/vuetify/commit/c2574c847b53fb8b85c7ec949191d42030150f02)), closes [#21063](https://github.com/vuetifyjs/vuetify/issues/21063)
- **VOverlay:** don't emit keydown.esc if not the top overlay ([05ef925](https://github.com/vuetifyjs/vuetify/commit/05ef92586ccb64e08c256a752135897fd77dbfe9))

### :microscope: Code Refactoring

- **framework:** explicit number casting ([4f6e77f](https://github.com/vuetifyjs/vuetify/commit/4f6e77fac2585873645961472ccd4ae6d9477d60))
- **VDatePickerMonth:** remove useless VDefaultsProvider ([80184e4](https://github.com/vuetifyjs/vuetify/commit/80184e4f094adf0862ef9f29b9d13f64136b13f1))

### :test_tube: Labs

- **VDateInput:** eager load menu on focus ([e738692](https://github.com/vuetifyjs/vuetify/commit/e738692074fd7a600b30c6d3387662b88d334d83))
- **VDateInput:** show-adjacent-months by default ([dd6ac15](https://github.com/vuetifyjs/vuetify/commit/dd6ac156d3be50faecbad6837d36a7fb3b8cf669))
- **VFileUpload:** clear internal input when empty ([#21038](https://github.com/vuetifyjs/vuetify/issues/21038)) ([010eb32](https://github.com/vuetifyjs/vuetify/commit/010eb32107c973b202c00f7b82bec9e0bdddb0ff)), closes [#21029](https://github.com/vuetifyjs/vuetify/issues/21029)
- **VTimePicker:** add active state for seconds ([#20926](https://github.com/vuetifyjs/vuetify/issues/20926)) ([ed9aa9f](https://github.com/vuetifyjs/vuetify/commit/ed9aa9f90ede9b0099d01ba7cc68916792121c6b))
- **VTimePicker:** external control over `viewMode` ([#20677](https://github.com/vuetifyjs/vuetify/issues/20677)) ([5f3185e](https://github.com/vuetifyjs/vuetify/commit/5f3185e9cb7c4b55eb47a69c4bef0e69470d06b4)), closes [#20671](https://github.com/vuetifyjs/vuetify/issues/20671)

## v3.7.15 - 2025-03-04T21:33:00Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.7.15

### :wrench: Bug Fixes

- **locale:** add missing translations for all locales ([f9081fe](https://github.com/vuetifyjs/vuetify/commit/f9081fe0483189805cb7f4f17ec4103950eae828))
- **locale:** add missing traditional chinese translations ([#21027](https://github.com/vuetifyjs/vuetify/issues/21027)) ([b2db7cd](https://github.com/vuetifyjs/vuetify/commit/b2db7cd2071ec779ad4a07c7ec923d3a59eadaed))
- **VListItem:** allow space key in input tag ([#21032](https://github.com/vuetifyjs/vuetify/issues/21032)) ([2dd6747](https://github.com/vuetifyjs/vuetify/commit/2dd6747112a85b97e29f1236b1aeeeac6a99c2db)), closes [#21030](https://github.com/vuetifyjs/vuetify/issues/21030)
- **VOTPInput:** enable autofill support ([#21062](https://github.com/vuetifyjs/vuetify/issues/21062)) ([038e9f4](https://github.com/vuetifyjs/vuetify/commit/038e9f40ae417615129dc3afec411668291b9681)), closes [#18678](https://github.com/vuetifyjs/vuetify/issues/18678)
- **VSlider/RangeSlider:** allow mousedown with left button only ([#20265](https://github.com/vuetifyjs/vuetify/issues/20265)) ([1bf8a2d](https://github.com/vuetifyjs/vuetify/commit/1bf8a2d8d4fe37d5d42d607aae0bdb3ceb891e3f)), closes [#19021](https://github.com/vuetifyjs/vuetify/issues/19021)

### :test_tube: Labs

- **VDateInput:** use adapter date ([#21043](https://github.com/vuetifyjs/vuetify/issues/21043)) ([64d5eeb](https://github.com/vuetifyjs/vuetify/commit/64d5eeb31a1ed1cfade94758ddb9e77f6a786c0e)), closes [#21033](https://github.com/vuetifyjs/vuetify/issues/21033)
- **VFileUpload:** divider wrapper width on smaller screens ([cc26a99](https://github.com/vuetifyjs/vuetify/commit/cc26a99431bf98c7897f0deb854077a054594580))
- **VNumberInput:** use useFocus composable for state ([41dad8c](https://github.com/vuetifyjs/vuetify/commit/41dad8c06087e31117b414052c20c1b53a1ba432))
- **VNumberInput:** support control holding down ([#20987](https://github.com/vuetifyjs/vuetify/issues/20987)) ([83aed7b](https://github.com/vuetifyjs/vuetify/commit/83aed7b17d717142373e862cd10600530ef974ee))
- **VNumberInput:** pass number to rules ([cea6d12](https://github.com/vuetifyjs/vuetify/commit/cea6d12124ea1be8c4ffedf0b2656d19ee9956ee)), closes [#21022](https://github.com/vuetifyjs/vuetify/issues/21022)
- **VTreeview:** prevent activating link on prepend click ([3a1cd02](https://github.com/vuetifyjs/vuetify/commit/3a1cd020ee778fb05cdc87b5a435fcd872be9469))

## v3.7.14 - 2025-02-25T22:11:28Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.7.14

### :wrench: Bug Fixes

- **DateAdapter:** update date formats to match interface ([#20229](https://github.com/vuetifyjs/vuetify/issues/20229)) ([98003f2](https://github.com/vuetifyjs/vuetify/commit/98003f2f7ebafa410189d1bf11e365057829e6ab)), closes [#20228](https://github.com/vuetifyjs/vuetify/issues/20228)
- **locale:** add missing japanese translations ([#21009](https://github.com/vuetifyjs/vuetify/issues/21009)) ([d518fc1](https://github.com/vuetifyjs/vuetify/commit/d518fc1a2c3f86c361051178b792bd18d203f297))
- **VDatePicker:** clamp displayed month to min/max ([#20999](https://github.com/vuetifyjs/vuetify/issues/20999)) ([fb87527](https://github.com/vuetifyjs/vuetify/commit/fb87527c968191d1732903787e5ae5881f64750b)), closes [#20287](https://github.com/vuetifyjs/vuetify/issues/20287)
- **VFileInput:** closable slotted chips ([#20250](https://github.com/vuetifyjs/vuetify/issues/20250)) ([e3ef513](https://github.com/vuetifyjs/vuetify/commit/e3ef513db35109ea2b2f93bcc26b8f618ca92ef1)), closes [#18638](https://github.com/vuetifyjs/vuetify/issues/18638)

### :microscope: Code Refactoring

- **VTreeview/VTreeviewChildren:** pass through density for checkbox btn ([a5cd6f3](https://github.com/vuetifyjs/vuetify/commit/a5cd6f39508bbd6c6dca8e7c89545ac7d555b7fb))

### :test_tube: Labs

- **VDateInput:** add missing slot types ([d32fa31](https://github.com/vuetifyjs/vuetify/commit/d32fa31d97d9d20dc7c5b6c311b1cec92635ce5f))
- **VNumberInput:** apply precision even when disabled/readonly ([#21010](https://github.com/vuetifyjs/vuetify/issues/21010)) ([389be09](https://github.com/vuetifyjs/vuetify/commit/389be098a2ee71de21365bf5446be77cddfdfe5f)), closes [#21005](https://github.com/vuetifyjs/vuetify/issues/21005)
- **VTreeview:** indentation parity with v2 ([#21007](https://github.com/vuetifyjs/vuetify/issues/21007)) ([7f02244](https://github.com/vuetifyjs/vuetify/commit/7f0224430c06672befde8e631423c38312495ded))

## v3.7.13 - 2025-02-20T05:34:42Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.7.13

### :wrench: Bug Fixes

- **nested:** prevent parent node activate firing for singleLeaf ([#20951](https://github.com/vuetifyjs/vuetify/issues/20951)) ([ea70e18](https://github.com/vuetifyjs/vuetify/commit/ea70e18408a93bd04c8a58130c993a465d0dcec8)), closes [#20946](https://github.com/vuetifyjs/vuetify/issues/20946)
- **VBottomNavigation:** flex VBtn evenly when using the grow prop ([407bd8e](https://github.com/vuetifyjs/vuetify/commit/407bd8ef0e6c039cb12865611d780e94bf10342b)), closes [#20493](https://github.com/vuetifyjs/vuetify/issues/20493)
- **VDataTable:** allow removal of additional sortings ([#20990](https://github.com/vuetifyjs/vuetify/issues/20990)) ([32e5747](https://github.com/vuetifyjs/vuetify/commit/32e5747c1a46823fec09c371912415072e12de25)), closes [#20985](https://github.com/vuetifyjs/vuetify/issues/20985)
- **VFileInput:** use correct model for validation ([5ae1208](https://github.com/vuetifyjs/vuetify/commit/5ae1208d89a7200331b472ea024f7889327be4d7)), closes [#20247](https://github.com/vuetifyjs/vuetify/issues/20247)
- **VList/VTreeview:** don't change tabindex when isFocused changes ([cda9307](https://github.com/vuetifyjs/vuetify/commit/cda93074ba76bc6e20e1ca3ee6e604b1ff452b90)), closes [#19919](https://github.com/vuetifyjs/vuetify/issues/19919) [#17470](https://github.com/vuetifyjs/vuetify/issues/17470)
- **VSelect:** external model reactivity ([4df71de](https://github.com/vuetifyjs/vuetify/commit/4df71dee970b9033835f4143f8afb60c6e98e602)), closes [#20992](https://github.com/vuetifyjs/vuetify/issues/20992) [#20997](https://github.com/vuetifyjs/vuetify/issues/20997)
- **VTabs:** correct items generic type ([3adefb9](https://github.com/vuetifyjs/vuetify/commit/3adefb9a2405dd2d8f34940a5d9f6ff3f35884b2)), closes [#20981](https://github.com/vuetifyjs/vuetify/issues/20981)

### :microscope: Code Refactoring

- **framework:** remove redundant pick function ([a438986](https://github.com/vuetifyjs/vuetify/commit/a438986fe13cbfc654870e9c9c68692e690c6197))
- **VTreeviewItem:** reuse VListItem link and clean-up code ([3cbe7a4](https://github.com/vuetifyjs/vuetify/commit/3cbe7a43d37ac19a0237824f660f48644bf9c908)), closes [#19919](https://github.com/vuetifyjs/vuetify/issues/19919)

### :arrows_counterclockwise: Reverts

- Revert "fix(VNavigationDrawer): don't restrict elementSize when..." ([8294e8c](https://github.com/vuetifyjs/vuetify/commit/8294e8c375c3900aa6f214c17a55aa2e2fb2269c))

### :test_tube: Labs

- **VDateInput:** add missing slot pass-through ([4815d05](https://github.com/vuetifyjs/vuetify/commit/4815d05aeec01387401b3f5e917da9b2193942f4)), closes [#20060](https://github.com/vuetifyjs/vuetify/issues/20060)
- **VDateInput:** disable in disabled forms ([#20982](https://github.com/vuetifyjs/vuetify/issues/20982)) ([e0ec39f](https://github.com/vuetifyjs/vuetify/commit/e0ec39fae38aac9ad60bfb5e04c568d760ae2bf0)), closes [#20543](https://github.com/vuetifyjs/vuetify/issues/20543)
- **VNumberInput:** strict precision ([#20252](https://github.com/vuetifyjs/vuetify/issues/20252)) ([fd7cb11](https://github.com/vuetifyjs/vuetify/commit/fd7cb11bf1689e2051bbd7aa08ff239a7b2c0608)), closes [#19898](https://github.com/vuetifyjs/vuetify/issues/19898)
- **VNumberInput:** ability to hide controls + spacing tweaks ([#19908](https://github.com/vuetifyjs/vuetify/issues/19908)) ([3085e1a](https://github.com/vuetifyjs/vuetify/commit/3085e1aa7551951eb1df49053e4e252cdd2db6a0)), closes [#19897](https://github.com/vuetifyjs/vuetify/issues/19897) [#20782](https://github.com/vuetifyjs/vuetify/issues/20782)
- **VTreeview:** remove itemType and unused slots ([b54db8d](https://github.com/vuetifyjs/vuetify/commit/b54db8ddb799ad6e4f1c99549f154c5e7e33b9ef)), closes [#20980](https://github.com/vuetifyjs/vuetify/issues/20980)

## v3.7.12 - 2025-02-11T17:56:20Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.7.12

### :wrench: Bug Fixes

- **VOverlay:** don't inherit scrim opacity ([4ff8d58](https://github.com/vuetifyjs/vuetify/commit/4ff8d58be718ff8deefb8b6ef8e1f2651d37d547)), closes [#20969](https://github.com/vuetifyjs/vuetify/issues/20969)
- **VRipple:** no animation on mobile ([#20369](https://github.com/vuetifyjs/vuetify/issues/20369)) ([45e931c](https://github.com/vuetifyjs/vuetify/commit/45e931c65e526cbf85c4e8912f816199716ebeec)), closes [#12288](https://github.com/vuetifyjs/vuetify/issues/12288)
- **VSelect:** pick props instead of using toRaw ([1413d20](https://github.com/vuetifyjs/vuetify/commit/1413d20b74e22f8d5fc3c21541f191232de32aaf))
- **VSelect:** improve selection performance ([#20937](https://github.com/vuetifyjs/vuetify/issues/20937)) ([08aa9d4](https://github.com/vuetifyjs/vuetify/commit/08aa9d49779d961b958ac8c512fcffb65fb0154e)), closes [#20703](https://github.com/vuetifyjs/vuetify/issues/20703)
- **VSlider:** skip position calculation if element does not exist ([1f4f945](https://github.com/vuetifyjs/vuetify/commit/1f4f945e5de7acd615998c5d1f54f5db14511c2b)), closes [#19891](https://github.com/vuetifyjs/vuetify/issues/19891)

### :test_tube: Labs

- **VDateInput:** do not pass `rounded` to the picker ([#20972](https://github.com/vuetifyjs/vuetify/issues/20972)) ([b5ed84d](https://github.com/vuetifyjs/vuetify/commit/b5ed84dd1cbbde6c33e3b88a652960d90ae2baa9))
- **VDateInput:** transform model in / out for VConfirmEdit ([#20281](https://github.com/vuetifyjs/vuetify/issues/20281)) ([fac2f99](https://github.com/vuetifyjs/vuetify/commit/fac2f99b2e87cb8fb5435e1b81da4327a38768bf)), closes [#20146](https://github.com/vuetifyjs/vuetify/issues/20146)
- **VDateInput:** forwardRefs and handle local and form level reset ([1461d7e](https://github.com/vuetifyjs/vuetify/commit/1461d7e2e1bba90d0e2ab1ffdb29e33abc7382e6)), closes [#19965](https://github.com/vuetifyjs/vuetify/issues/19965)

## v3.7.11 - 2025-02-04T09:53:45Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.7.11

### :arrows_counterclockwise: Reverts

- Revert "fix(VSelect/VAutocomplete/VCombobox): respect click outside (#20004)" ([7c41be7](https://github.com/vuetifyjs/vuetify/commit/7c41be7f274a565365bc13edfb44cd83bc8e2ac0)), closes [#20004](https://github.com/vuetifyjs/vuetify/issues/20004) [#20958](https://github.com/vuetifyjs/vuetify/issues/20958)

## v3.7.10 - 2025-02-04T06:19:29Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.7.10

### :wrench: Bug Fixes

- **locale:** add missing danish and finnish translations ([#20925](https://github.com/vuetifyjs/vuetify/issues/20925)) ([1df619d](https://github.com/vuetifyjs/vuetify/commit/1df619db592ef3b665fb714a530b192aca81a551))
- **locale:** add missing german translations ([#20921](https://github.com/vuetifyjs/vuetify/issues/20921)) ([02a3f48](https://github.com/vuetifyjs/vuetify/commit/02a3f4824ff1fa6c764d58fb855c2844ac23d349))
- **VDatePicker:** prevent maxDate disabling the wrong month on last day ([ce4b227](https://github.com/vuetifyjs/vuetify/commit/ce4b227c49962d0faa84d39019b7f5a70ed6db91)), closes [#20943](https://github.com/vuetifyjs/vuetify/issues/20943)
- **VExpandTransition:** work around calling hooks out of order ([d6fdc1b](https://github.com/vuetifyjs/vuetify/commit/d6fdc1b2084aaf2dc30d1fcb8d53b259260b6478))
- **VSelect/VAutocomplete/VCombobox:** respect click outside ([#20004](https://github.com/vuetifyjs/vuetify/issues/20004)) ([e85225d](https://github.com/vuetifyjs/vuetify/commit/e85225df703b7a0841468824c7e985d8a749bb81)), closes [#20003](https://github.com/vuetifyjs/vuetify/issues/20003)
- **VTabs:** add generic slot types ([3e9147e](https://github.com/vuetifyjs/vuetify/commit/3e9147e33898bacafe74633ccc29a2c3f14916cf)), closes [#20720](https://github.com/vuetifyjs/vuetify/issues/20720)

### :test_tube: Labs

- **VTreeview:** Add subtitle & divider slots support ([#20938](https://github.com/vuetifyjs/vuetify/issues/20938)) ([e63b322](https://github.com/vuetifyjs/vuetify/commit/e63b32214c4031cf22839b98915555ef0580684c)), closes [#20781](https://github.com/vuetifyjs/vuetify/issues/20781)

## v3.7.9 - 2025-01-30T01:34:36Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.7.9

### :wrench: Bug Fixes

- **useDisplay:** keep default behavior when used without args ([#20935](https://github.com/vuetifyjs/vuetify/issues/20935)) ([bb8b3f8](https://github.com/vuetifyjs/vuetify/commit/bb8b3f829ee6bf4bba9190018e6afb318e88409c)), closes [#20932](https://github.com/vuetifyjs/vuetify/issues/20932)

## v3.7.8 - 2025-01-28T05:11:44Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.7.8

### :wrench: Bug Fixes

- **router:** check $router.beforeEach exists before using ([#20549](https://github.com/vuetifyjs/vuetify/issues/20549)) ([bcce042](https://github.com/vuetifyjs/vuetify/commit/bcce04262f03c1554d1238442dd2a3cca453e7e4))
- **useDisplay:** more intuitive use of `mobile-breakpoint` ([#20311](https://github.com/vuetifyjs/vuetify/issues/20311)) ([cff590e](https://github.com/vuetifyjs/vuetify/commit/cff590e3bd5ea3a58757524327ea05124dfff1e4)), closes [#19883](https://github.com/vuetifyjs/vuetify/issues/19883)
- **VBreadcrumbsDivider:** add aria-hidden attribute ([#20893](https://github.com/vuetifyjs/vuetify/issues/20893)) ([301576b](https://github.com/vuetifyjs/vuetify/commit/301576b58627a1133e0be18334d7ef72dcd05910))
- **VDataTable:** show correct items count after expanding group ([#20347](https://github.com/vuetifyjs/vuetify/issues/20347)) ([7dd5a20](https://github.com/vuetifyjs/vuetify/commit/7dd5a2018f195513db40d0ee30c46724de44e1f4)), closes [#20313](https://github.com/vuetifyjs/vuetify/issues/20313)
- **VDataTable:** emit current items immediately ([#20449](https://github.com/vuetifyjs/vuetify/issues/20449)) ([57047f6](https://github.com/vuetifyjs/vuetify/commit/57047f60227c415ec47c2947202ead71c289449b)), closes [#20440](https://github.com/vuetifyjs/vuetify/issues/20440)
- **VDataTable:** rtl mobile alignment ([#20553](https://github.com/vuetifyjs/vuetify/issues/20553)) ([db9fb77](https://github.com/vuetifyjs/vuetify/commit/db9fb77c1ca47c62aa0171ed966c64960d3b1019))
- **VDataTable:** apply fixed-header when sticky prop is set ([2795792](https://github.com/vuetifyjs/vuetify/commit/2795792f8fee7ae785d9f40548f3e7cb05deb992)), closes [#20903](https://github.com/vuetifyjs/vuetify/issues/20903)
- **VFab:** improve positioning & examples ([#20318](https://github.com/vuetifyjs/vuetify/issues/20318)) ([8e61f2d](https://github.com/vuetifyjs/vuetify/commit/8e61f2d7c2fdaf456f0d6107079c720fd39c5363))
- **VField:** floating label respect paddings to avoid overflow ([#20736](https://github.com/vuetifyjs/vuetify/issues/20736)) ([7351074](https://github.com/vuetifyjs/vuetify/commit/73510746b9dd4ae78080f22ecdda6c4c061bc885)), closes [#20734](https://github.com/vuetifyjs/vuetify/issues/20734)
- **VField:** rounded with long label border-radius ([#20349](https://github.com/vuetifyjs/vuetify/issues/20349)) ([568f71b](https://github.com/vuetifyjs/vuetify/commit/568f71bbe6ae6b803983bbb810ebc1c4278bc2d2)), closes [#20305](https://github.com/vuetifyjs/vuetify/issues/20305)
- **VField:** hide label with single-line ([#20773](https://github.com/vuetifyjs/vuetify/issues/20773)) ([3ef363a](https://github.com/vuetifyjs/vuetify/commit/3ef363a3a61e6bc7f3872e73cbcc2999111456ab)), closes [#20751](https://github.com/vuetifyjs/vuetify/issues/20751)
- **VField, VInput:** emit `click:*` events using keyboard ([#20878](https://github.com/vuetifyjs/vuetify/issues/20878)) ([5ca8184](https://github.com/vuetifyjs/vuetify/commit/5ca81847c03d0f16c0165ff5724b8f28328d1926)), closes [#20864](https://github.com/vuetifyjs/vuetify/issues/20864)
- **VImg:** set crossOrigin attribute before src ([#20915](https://github.com/vuetifyjs/vuetify/issues/20915)) ([910935e](https://github.com/vuetifyjs/vuetify/commit/910935ede5ab91c482420f04d0f1ffad388977ab)), closes [#20914](https://github.com/vuetifyjs/vuetify/issues/20914)
- **VInput/VMessages:** move aria attributes to details ([#20420](https://github.com/vuetifyjs/vuetify/issues/20420)) ([d1ed47c](https://github.com/vuetifyjs/vuetify/commit/d1ed47c257de94373dd1e9e6961bd20d960f77e5))
- **VMenu:** replace aria-owns with aria-controls ([#20596](https://github.com/vuetifyjs/vuetify/issues/20596)) ([0fe248a](https://github.com/vuetifyjs/vuetify/commit/0fe248ae57d843d2a8bdf5ca80993bc3d1a90606))
- **VPagination:** visible items for selection in middle ([#20322](https://github.com/vuetifyjs/vuetify/issues/20322)) ([36c4d46](https://github.com/vuetifyjs/vuetify/commit/36c4d46be378666088ebc275012be701ef93ff0b)), closes [#18853](https://github.com/vuetifyjs/vuetify/issues/18853)
- **VSelect:** remove multiple check for keyboard lookup ([#20475](https://github.com/vuetifyjs/vuetify/issues/20475)) ([ba143c1](https://github.com/vuetifyjs/vuetify/commit/ba143c1f95193766360656297c7aa7ea9190b393)), closes [#20358](https://github.com/vuetifyjs/vuetify/issues/20358)
- **VSlider:** update value before focusing thumb ([c1fd4f7](https://github.com/vuetifyjs/vuetify/commit/c1fd4f7610d74151892106ade0f7dc30c57ea46a)), closes [#20912](https://github.com/vuetifyjs/vuetify/issues/20912)

### :test_tube: Labs

- **VCalendar:** always assign default first day of week ([#20378](https://github.com/vuetifyjs/vuetify/issues/20378)) ([9d881b2](https://github.com/vuetifyjs/vuetify/commit/9d881b2ea42b263e1e538df6b404e7ac61ac9179)), closes [#19999](https://github.com/vuetifyjs/vuetify/issues/19999)
- **VStepperVertical:** correct slots types ([#20537](https://github.com/vuetifyjs/vuetify/issues/20537)) ([0230259](https://github.com/vuetifyjs/vuetify/commit/02302590c8ec4feb4ae14ac36e8c756fac879f2b)), closes [#20213](https://github.com/vuetifyjs/vuetify/issues/20213) [#20803](https://github.com/vuetifyjs/vuetify/issues/20803)
- **VTimePicker:** emit when changing hour ([#20179](https://github.com/vuetifyjs/vuetify/issues/20179)) ([d6ac050](https://github.com/vuetifyjs/vuetify/commit/d6ac05060267b2201423c08c9546583ceb32d6c2))
- **VTreeview:** allow expansion of nodes when disabled ([e9e5625](https://github.com/vuetifyjs/vuetify/commit/e9e562545ad45cf6327fb01a488fb43676704f06)), closes [#20832](https://github.com/vuetifyjs/vuetify/issues/20832)
- **VTreeview:** properly indent nodes ([28ed40b](https://github.com/vuetifyjs/vuetify/commit/28ed40bc4d083ec59dc950a749305f554c1f94bd)), closes [#20421](https://github.com/vuetifyjs/vuetify/issues/20421)

## v3.7.7 - 2025-01-20T10:09:33Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.7.7

### :wrench: Bug Fixes

- **filter:** avoid unnecessary deep proxy ([933bf24](https://github.com/vuetifyjs/vuetify/commit/933bf24e05810d569af7c4397f0543692eac02c2)), closes [#20849](https://github.com/vuetifyjs/vuetify/issues/20849)
- **locale:** add missing Dutch translations ([#20839](https://github.com/vuetifyjs/vuetify/issues/20839)) ([bfc25df](https://github.com/vuetifyjs/vuetify/commit/bfc25dfdb5a551bc5c423f48d1d34213868a5925))
- **locale:** add missing Azerbaijani translations ([#20848](https://github.com/vuetifyjs/vuetify/issues/20848)) ([0e7b814](https://github.com/vuetifyjs/vuetify/commit/0e7b814ca3dcb7e090db38faf76927d70a590588))
- **VAutocomplete:** allow searching when selected item is hightlighted ([2cab7e4](https://github.com/vuetifyjs/vuetify/commit/2cab7e459e9c5742e3e3975afa23df1b783fddb8)), closes [#20796](https://github.com/vuetifyjs/vuetify/issues/20796) [#20836](https://github.com/vuetifyjs/vuetify/issues/20836)
- **VColorPicker:** handle invalid eyedropper result in linux ([2e0e0f5](https://github.com/vuetifyjs/vuetify/commit/2e0e0f528eb36b8617cae1834a11ddb2350940f8)), closes [#20847](https://github.com/vuetifyjs/vuetify/issues/20847)
- **VCombobox:** don't return focus to input on space keydown ([d609024](https://github.com/vuetifyjs/vuetify/commit/d6090248e1d0fa34748fce1dcc93991aeea19b8f)), closes [#20850](https://github.com/vuetifyjs/vuetify/issues/20850)
- **VDialog:** restore scrollable dialog margins ([39fe86d](https://github.com/vuetifyjs/vuetify/commit/39fe86de7da2e4f612301903e0a51dfc117e83fc))
- **VField:** prevent rendering clear button when disabled ([#20821](https://github.com/vuetifyjs/vuetify/issues/20821)) ([210488a](https://github.com/vuetifyjs/vuetify/commit/210488aa70aad90f8b325de952485ce48ef759e4)), closes [#20818](https://github.com/vuetifyjs/vuetify/issues/20818)
- **VProgressLinear:** set aria-valuenow to current value ([#20845](https://github.com/vuetifyjs/vuetify/issues/20845)) ([f9ac620](https://github.com/vuetifyjs/vuetify/commit/f9ac620bd02cad58ae29b0534420c723cfc018a8)), closes [#19894](https://github.com/vuetifyjs/vuetify/issues/19894)
- **VSlideGroup:** skip disabled elements when moving focus ([#20808](https://github.com/vuetifyjs/vuetify/issues/20808)) ([cb2d96b](https://github.com/vuetifyjs/vuetify/commit/cb2d96bbcf61623a6b9b007e2a09b3c7bcaa160c)), closes [#20780](https://github.com/vuetifyjs/vuetify/issues/20780)
- **VSparkline:** accept numeric value for smooth ([#20795](https://github.com/vuetifyjs/vuetify/issues/20795)) ([0f833be](https://github.com/vuetifyjs/vuetify/commit/0f833be59fe7afb8f1bb86f4e04b9f809ab9d84d)), closes [#19262](https://github.com/vuetifyjs/vuetify/issues/19262)
- **VStepper:** add type=button to headers ([e66317d](https://github.com/vuetifyjs/vuetify/commit/e66317dbcc9bd1746a3ab1106301ba30ee94e33a)), closes [#20866](https://github.com/vuetifyjs/vuetify/issues/20866)
- **VTextarea:** correct area scaling when grown vertically in flex ([15c6485](https://github.com/vuetifyjs/vuetify/commit/15c6485b12cb513d293ff8691ed2b3daa7cb3f24)), closes [#20861](https://github.com/vuetifyjs/vuetify/issues/20861)

### :test_tube: Labs

- **VDateInput:** pass `location` to VMenu ([#20854](https://github.com/vuetifyjs/vuetify/issues/20854)) ([2cefedb](https://github.com/vuetifyjs/vuetify/commit/2cefedb55837b8e2238adae695dd9f7b1ac199d1))
- **VDateInput:** actions slot ([#20858](https://github.com/vuetifyjs/vuetify/issues/20858)) ([70deee7](https://github.com/vuetifyjs/vuetify/commit/70deee7d77c5cefba8dfff2474520f6d00a1f124)), closes [#20690](https://github.com/vuetifyjs/vuetify/issues/20690) [#20857](https://github.com/vuetifyjs/vuetify/issues/20857)
- **VTreeview:** Incorrect isOpen state in the prepend slot when using return-object ([#20884](https://github.com/vuetifyjs/vuetify/issues/20884)) ([14be656](https://github.com/vuetifyjs/vuetify/commit/14be656999d8061c6623cb11ef611fe06e23296e))

## v3.7.6 - 2024-12-18T11:34:37Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.7.6

### :wrench: Bug Fixes

- **nested:** ensure unregister is called before register ([d4ba559](https://github.com/vuetifyjs/vuetify/commit/d4ba559cda8f52192b90b5816b09680324725b4c)), closes [#20516](https://github.com/vuetifyjs/vuetify/issues/20516) [#20603](https://github.com/vuetifyjs/vuetify/issues/20603)
- **virtual:** add fallback scrollend timeout ([4a628a3](https://github.com/vuetifyjs/vuetify/commit/4a628a39ffcef6d4ce711a8a23551bc7a09eb564)), closes [#20566](https://github.com/vuetifyjs/vuetify/issues/20566) [#20757](https://github.com/vuetifyjs/vuetify/issues/20757)
- **VListItem:** wait until beforeMount to set parent open ([39e4a50](https://github.com/vuetifyjs/vuetify/commit/39e4a50218f6a1870225fe68be530e4918919296))
- **VRangeSlider:** do not focus other thumb if min==max ([c19bcf6](https://github.com/vuetifyjs/vuetify/commit/c19bcf69cb5d99b989fb8d46c5fd4ec89777c48b)), closes [#20726](https://github.com/vuetifyjs/vuetify/issues/20726)
- **VSelectionControl:** label opacity matching regular text ([#20738](https://github.com/vuetifyjs/vuetify/issues/20738)) ([f804c50](https://github.com/vuetifyjs/vuetify/commit/f804c506813985494e5afa2e6610bd06fcb08cc0)), closes [#18804](https://github.com/vuetifyjs/vuetify/issues/18804)

### :test_tube: Labs

- **VFileUpload:** add new component ([#19667](https://github.com/vuetifyjs/vuetify/issues/19667)) ([89c58dd](https://github.com/vuetifyjs/vuetify/commit/89c58dd3b40169920d7530f6b4d2da350ac785c3))
- **VNumberInput:** clearing v-number-input with backspace resets to 0 ([#20729](https://github.com/vuetifyjs/vuetify/issues/20729)) ([96fca07](https://github.com/vuetifyjs/vuetify/commit/96fca0763afbcd151ac7a2ec543c973debbb8089))

## v3.7.5 - 2024-12-03T10:33:39Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.7.5

### :rocket: Features

- **VConfirmEdit:** pass props to actions ([7aae81e](https://github.com/vuetifyjs/vuetify/commit/7aae81ec53747e38a01113ff6b7c773f261059f4)), closes [#20704](https://github.com/vuetifyjs/vuetify/issues/20704)

### :wrench: Bug Fixes

- expand accepted icon prop types ([#20727](https://github.com/vuetifyjs/vuetify/issues/20727)) ([aa4c7bb](https://github.com/vuetifyjs/vuetify/commit/aa4c7bb17d8671c09779293aa73bdff00d10fae2)), closes [#19858](https://github.com/vuetifyjs/vuetify/issues/19858)
- **inputs:** normalise inheriting readonly and disabled from form ([b7df7f0](https://github.com/vuetifyjs/vuetify/commit/b7df7f06146bbe4652e483a8cc03a5ef794d0e29)), closes [#20730](https://github.com/vuetifyjs/vuetify/issues/20730)
- **locale:** translate calendar.today to french ([#20712](https://github.com/vuetifyjs/vuetify/issues/20712)) ([74fc967](https://github.com/vuetifyjs/vuetify/commit/74fc9676c8bba2fb748dfaca3759a92b840f9878))
- **VBadge:** restore unused SASS variables ([#20709](https://github.com/vuetifyjs/vuetify/issues/20709)) ([fd844e1](https://github.com/vuetifyjs/vuetify/commit/fd844e1372d8b46865be4b497198f5718b69a789)), closes [#19834](https://github.com/vuetifyjs/vuetify/issues/19834)
- **VChip:** utilize `active-class` ([#20716](https://github.com/vuetifyjs/vuetify/issues/20716)) ([501fa1b](https://github.com/vuetifyjs/vuetify/commit/501fa1bc935457af174d385f9cdf692c3b48fe19))
- **VField:** only render field label if label is passed ([#20722](https://github.com/vuetifyjs/vuetify/issues/20722)) ([8b9cca4](https://github.com/vuetifyjs/vuetify/commit/8b9cca4079e4f31258c0a83592db7bf059e36bb6)), closes [#20427](https://github.com/vuetifyjs/vuetify/issues/20427)
- **VList:** only set aria-selected on selectable items ([72df0b4](https://github.com/vuetifyjs/vuetify/commit/72df0b4b39ce944bd05053b50b601dea037d4e3c)), closes [#20666](https://github.com/vuetifyjs/vuetify/issues/20666) [#20708](https://github.com/vuetifyjs/vuetify/issues/20708)

### :test_tube: Labs

- **VTreeview:** activated emits twice on leafs ([#20739](https://github.com/vuetifyjs/vuetify/issues/20739)) ([0fb92ed](https://github.com/vuetifyjs/vuetify/commit/0fb92ed59c2c212508265238599e0b25d56df409))

## v3.7.4 - 2024-11-06T07:40:15Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.7.4

### :wrench: Bug Fixes

- **VBtn:** only remove overlay transition in pagination ([675b464](https://github.com/vuetifyjs/vuetify/commit/675b464c79c09fcc855f0a0c015e2d36c1870d22)), closes [#18874](https://github.com/vuetifyjs/vuetify/issues/18874)
- **VBtnToggle:** plain variant button opacity when selected ([#20279](https://github.com/vuetifyjs/vuetify/issues/20279)) ([bfe6310](https://github.com/vuetifyjs/vuetify/commit/bfe631027588b73da8cf94655ae8316c763cafe8)), closes [#20142](https://github.com/vuetifyjs/vuetify/issues/20142)
- **VCode,VKbd:** set default tag ([18c0adc](https://github.com/vuetifyjs/vuetify/commit/18c0adcd4a3cdd8dffda9691e3aa8ea18aaceb92))
- **VDialog:** make form fill parent ([#20555](https://github.com/vuetifyjs/vuetify/issues/20555)) ([42a12dd](https://github.com/vuetifyjs/vuetify/commit/42a12dd89da2e7e5ea5f6a3bc7611fb2e9f2563a))
- **VDialog:** ignore size props when fullscreen ([#20554](https://github.com/vuetifyjs/vuetify/issues/20554)) ([3adcbef](https://github.com/vuetifyjs/vuetify/commit/3adcbef2e993f520cc1136cbcc36b84505490620)), closes [#19915](https://github.com/vuetifyjs/vuetify/issues/19915)
- **VDialog,VMenu:** remove focus listeners on unmount ([a72df88](https://github.com/vuetifyjs/vuetify/commit/a72df884ba8415a272332f86bba8401eec7d6fc5)), closes [#20422](https://github.com/vuetifyjs/vuetify/issues/20422)
- **VList:** apply avatar spacing to badge:has(avatar) ([#20588](https://github.com/vuetifyjs/vuetify/issues/20588)) ([0ac22b5](https://github.com/vuetifyjs/vuetify/commit/0ac22b5b4c190bede80f20a8f7090f1aaa322f8c))

## v3.7.3 - 2024-10-17T08:07:37Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.7.3

### :wrench: Bug Fixes

- **nested:** convert ids to string in duplicate warning ([2728a10](https://github.com/vuetifyjs/vuetify/commit/2728a10244f4d9ae4268621e0cf310d8f29dab44))
- **styles:** explicitly import global functions ([2b22da1](https://github.com/vuetifyjs/vuetify/commit/2b22da169f9923628c4f6d8623ddd8899e5d60eb))
- **v-tooltip:** log error instead of throwing ([ae33530](https://github.com/vuetifyjs/vuetify/commit/ae33530ac17226ca942849bea364ee441ae1dd9f)), closes [#20564](https://github.com/vuetifyjs/vuetify/issues/20564)
- **v-tooltip:** match provides from new vnode ([6e9f2a1](https://github.com/vuetifyjs/vuetify/commit/6e9f2a1a0a55360118626fc397c6d0dc4498382b)), closes [#20564](https://github.com/vuetifyjs/vuetify/issues/20564)
- **VDataTable:** remove page clamp on initial render ([60bc70e](https://github.com/vuetifyjs/vuetify/commit/60bc70ecbb1692c94dfd9ceb9bae1415355bafed)), closes [#17966](https://github.com/vuetifyjs/vuetify/issues/17966) [#20185](https://github.com/vuetifyjs/vuetify/issues/20185)

### :test_tube: Labs

- **VTreeview:** allow multiple nodes to be loading ([488fc02](https://github.com/vuetifyjs/vuetify/commit/488fc0221e7957dbfac6d680f2ea40bb25412d5d)), closes [#19390](https://github.com/vuetifyjs/vuetify/issues/19390) [#20404](https://github.com/vuetifyjs/vuetify/issues/20404)
- **VTreeview:** search doesn't work with return-object ([#20508](https://github.com/vuetifyjs/vuetify/issues/20508)) ([1b3ed5a](https://github.com/vuetifyjs/vuetify/commit/1b3ed5a2e72d04119df89b5440fe4bd4e6955fc2))

## v3.7.2 - 2024-09-17T13:03:04Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.7.2

### :wrench: Bug Fixes

- **a11y:** add `aria-current="page"` attribute to links ([#20413](https://github.com/vuetifyjs/vuetify/issues/20413)) ([bc647f6](https://github.com/vuetifyjs/vuetify/commit/bc647f6853c6415fc928aff2774134f7eed26b37)), closes [#20399](https://github.com/vuetifyjs/vuetify/issues/20399)
- **nested:** use reactive proxy of opened ([#20438](https://github.com/vuetifyjs/vuetify/issues/20438)) ([4e41c7e](https://github.com/vuetifyjs/vuetify/commit/4e41c7e2bef649551c6f4032cda220f2dd605780))
- **nested:** Prevent infinite loops when resolving path ([#20390](https://github.com/vuetifyjs/vuetify/issues/20390)) ([970f827](https://github.com/vuetifyjs/vuetify/commit/970f827828b2e488ad5bb2e8f1363fd38c5a6102)), closes [#20389](https://github.com/vuetifyjs/vuetify/issues/20389)
- **v-tooltip:** use textContent instead of innerHTML ([ca49443](https://github.com/vuetifyjs/vuetify/commit/ca49443c6b7302c9dcb14b9be29f3872f512b320))
- **v-tooltip:** use default location from VTooltip ([45e0c8a](https://github.com/vuetifyjs/vuetify/commit/45e0c8af029ffcbcb318f10a2e263b35671dbdc6))
- **VDialog:** add height to form in fullscreen dialog ([#20417](https://github.com/vuetifyjs/vuetify/issues/20417)) ([eb0c99e](https://github.com/vuetifyjs/vuetify/commit/eb0c99e4f13272367a983abac9473b943f065ee1)), closes [#20416](https://github.com/vuetifyjs/vuetify/issues/20416)
- **VDialog:** remove `aria-expanded` from activator ([#20414](https://github.com/vuetifyjs/vuetify/issues/20414)) ([1c40ed4](https://github.com/vuetifyjs/vuetify/commit/1c40ed484c31def71b0a587f8e39cd6101762de8))

### :test_tube: Labs

- **VTreeview:** Load children when expanded ([#20364](https://github.com/vuetifyjs/vuetify/issues/20364)) ([f95a405](https://github.com/vuetifyjs/vuetify/commit/f95a405042f7da57b472fd38208dd61e7ab63bd3))

## v3.7.1 - 2024-08-27T16:23:26Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.7.1

### :wrench: Bug Fixes

- remove vue-i18n peer dependency ([6ea68b9](https://github.com/vuetifyjs/vuetify/commit/6ea68b9136b371cd0e859735950c3b03b5dcf58f)), closes [#19720](https://github.com/vuetifyjs/vuetify/issues/19720)
- **helpers:** only deep merge plain objects ([#20284](https://github.com/vuetifyjs/vuetify/issues/20284)) ([8af59fc](https://github.com/vuetifyjs/vuetify/commit/8af59fc466a13f4f6813226cff21a951db375069)), closes [#20278](https://github.com/vuetifyjs/vuetify/issues/20278)
- **types:** only augment module 'vue' ([7c8aeef](https://github.com/vuetifyjs/vuetify/commit/7c8aeefdc097ff9b74a733ed17b6a8cd9e1f8575)), closes [nuxt/nuxt#28542](https://github.com/nuxt/nuxt/nuxt/issues/28542)
- **VAvatar:** remove default border ([e821d5d](https://github.com/vuetifyjs/vuetify/commit/e821d5d8aabf21a7e90a0802e34f43ce181f78e3)), closes [#20345](https://github.com/vuetifyjs/vuetify/issues/20345)
- **VDialog:** emit afterEnter before setting focus ([7e9a1b7](https://github.com/vuetifyjs/vuetify/commit/7e9a1b71805ad7d8d3284909a324d1edae74c751))
- **VInfiniteScroll:** respect margin when root element is scrollable ([b81919d](https://github.com/vuetifyjs/vuetify/commit/b81919df228888367bebfaf72522b1c69ec51d9d)), closes [#17583](https://github.com/vuetifyjs/vuetify/issues/17583)

### :test_tube: Labs

- **VNumberInput:** emit model when input is a number between max & min ([836087f](https://github.com/vuetifyjs/vuetify/commit/836087f76b901ce2bc567e12979427ae6b56db8d)), closes [#20337](https://github.com/vuetifyjs/vuetify/issues/20337)

## v3.7.0 - 2024-08-15T12:58:19Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.7.0

### :rocket: Features

- **validation:** add eager and invalid-input options ([7e730fa](https://github.com/vuetifyjs/vuetify/commit/7e730fa2ad5effcab4e9aa0ed5245610f897aea3))
- **VAvatar:** add border prop support ([9dbc30a](https://github.com/vuetifyjs/vuetify/commit/9dbc30ac9264f0626c0b7a204857598b25c2fae1))
- **VBtn:** add support for active-color prop ([aee83f0](https://github.com/vuetifyjs/vuetify/commit/aee83f0e97d750e6d4056977862663a52b4ac626))
- **VContainer:** add dimension support ([14a2e8c](https://github.com/vuetifyjs/vuetify/commit/14a2e8cdeef3cd88fb8f80e336ac923856f823bc))
- **VExpansionPanelTitle:** add dimension support ([784eb14](https://github.com/vuetifyjs/vuetify/commit/784eb144b577d636e2aba4b4ff16fd4df73734fd))
- **VImg:** add absolute prop ([f842cd9](https://github.com/vuetifyjs/vuetify/commit/f842cd96d9ce8ba10acc14205d928f8f0eabef16))
- **VMenu:** add submenu prop ([#20092](https://github.com/vuetifyjs/vuetify/issues/20092)) ([306a262](https://github.com/vuetifyjs/vuetify/commit/306a262bb67ca52ade4861a20b06788038facf15)), closes [#19093](https://github.com/vuetifyjs/vuetify/issues/19093) [#20130](https://github.com/vuetifyjs/vuetify/issues/20130)
- **VSlideGroup:** expose hasNext and hasPrev ([#20050](https://github.com/vuetifyjs/vuetify/issues/20050)) ([8ef6ff8](https://github.com/vuetifyjs/vuetify/commit/8ef6ff811278a990d45504c2987fac0afec8f43c))

### :wrench: Bug Fixes

- **VAutocomplete:** allow searching when menu is focused ([b9ed79d](https://github.com/vuetifyjs/vuetify/commit/b9ed79db8ae68eed6bc13cf10aefa6944fa8675b)), closes [#17641](https://github.com/vuetifyjs/vuetify/issues/17641)
- **VCardActions:** space children with gap instead of margin ([2194403](https://github.com/vuetifyjs/vuetify/commit/219440372d5b4975dd25b3de9b24284f99742cf4)), closes [#20239](https://github.com/vuetifyjs/vuetify/issues/20239) [#20262](https://github.com/vuetifyjs/vuetify/issues/20262)
- **VMenu:** unregister on unmount ([a456502](https://github.com/vuetifyjs/vuetify/commit/a4565028eaf1bebb93cf3f3956fa9c632c00700c)), closes [#17094](https://github.com/vuetifyjs/vuetify/issues/17094)
- **VSelect:** update visible items when eager is set ([7d3557a](https://github.com/vuetifyjs/vuetify/commit/7d3557a75497c508e2d7f855b5db54fc52d7ec9e)), closes [#19765](https://github.com/vuetifyjs/vuetify/issues/19765)

### :arrows_counterclockwise: Reverts

- Revert "fix(layout): use suspense to delay render of layout items (#15229)" ([08c3d4f](https://github.com/vuetifyjs/vuetify/commit/08c3d4f62e7e9715dc7f256d794cd4682b7f7c52)), closes [#15229](https://github.com/vuetifyjs/vuetify/issues/15229) [#19800](https://github.com/vuetifyjs/vuetify/issues/19800)
- Revert "fix(VOverlay): position on LTR/RTL after locale switch (#17338)" ([3024bb1](https://github.com/vuetifyjs/vuetify/commit/3024bb10411f78246d8caeba94b0893a1f148670)), closes [#17338](https://github.com/vuetifyjs/vuetify/issues/17338) [#19863](https://github.com/vuetifyjs/vuetify/issues/19863)

### :test_tube: Labs

- **VPullToRefresh:** add disabled prop ([79cc227](https://github.com/vuetifyjs/vuetify/commit/79cc227464e8d696b9dfa7f80689936020905ec5)), closes [#20242](https://github.com/vuetifyjs/vuetify/issues/20242)
- **VTreeview:** add modelValue which is equivalent to selected ([2336637](https://github.com/vuetifyjs/vuetify/commit/2336637442f64053ec76d5e51cd6a690957d70a3))
- **VTreeview:** increase v-treeview-item--filtered specificity ([39e7c64](https://github.com/vuetifyjs/vuetify/commit/39e7c642a7a135473940374072967a88d87a31e2)), closes [#19404](https://github.com/vuetifyjs/vuetify/issues/19404)
- **VTreeview:** port open-on-click prop to v3 & enhancement ([#20038](https://github.com/vuetifyjs/vuetify/issues/20038)) ([cb6b5ff](https://github.com/vuetifyjs/vuetify/commit/cb6b5ffd057fac94650c39b579488cc4621fcb91)), closes [#20009](https://github.com/vuetifyjs/vuetify/issues/20009) [#20095](https://github.com/vuetifyjs/vuetify/issues/20095) [#19414](https://github.com/vuetifyjs/vuetify/issues/19414) [#20106](https://github.com/vuetifyjs/vuetify/issues/20106)

### :rocket: Features

- **VMenu:** add submenu prop ([#20092](https://github.com/vuetifyjs/vuetify/issues/20092)) ([306a262](https://github.com/vuetifyjs/vuetify/commit/306a262bb67ca52ade4861a20b06788038facf15)), closes [#19093](https://github.com/vuetifyjs/vuetify/issues/19093) [#20130](https://github.com/vuetifyjs/vuetify/issues/20130)

### :wrench: Bug Fixes

- **VCardActions:** space children with gap instead of margin ([2194403](https://github.com/vuetifyjs/vuetify/commit/219440372d5b4975dd25b3de9b24284f99742cf4)), closes [#20239](https://github.com/vuetifyjs/vuetify/issues/20239) [#20262](https://github.com/vuetifyjs/vuetify/issues/20262)

### :microscope: Code Refactoring

- **VSpeedDial:** fix type error ([4077948](https://github.com/vuetifyjs/vuetify/commit/4077948d64da983f938795c051e1327cf3aaf23c))

### :arrows_counterclockwise: Reverts

- Revert "fix(layout): use suspense to delay render of layout items (#15229)" ([08c3d4f](https://github.com/vuetifyjs/vuetify/commit/08c3d4f62e7e9715dc7f256d794cd4682b7f7c52)), closes [#15229](https://github.com/vuetifyjs/vuetify/issues/15229) [#19800](https://github.com/vuetifyjs/vuetify/issues/19800)

### :test_tube: Labs

- **VPullToRefresh:** add disabled prop ([79cc227](https://github.com/vuetifyjs/vuetify/commit/79cc227464e8d696b9dfa7f80689936020905ec5)), closes [#20242](https://github.com/vuetifyjs/vuetify/issues/20242)
- **VTreeview:** add modelValue which is equivalent to selected ([2336637](https://github.com/vuetifyjs/vuetify/commit/2336637442f64053ec76d5e51cd6a690957d70a3))

## v3.6.15 - 2024-08-15T09:42:57Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.6.15

### :wrench: Bug Fixes

- **click-outside:** correctly remove shadow DOM event listeners ([#20273](https://github.com/vuetifyjs/vuetify/issues/20273)) ([9b02b0d](https://github.com/vuetifyjs/vuetify/commit/9b02b0dc2d3a1bcc5f7736d62ba42d193e84d48e)), closes [#19616](https://github.com/vuetifyjs/vuetify/issues/19616)
- **VFileInput:** emit null after VForm reset() ([#20207](https://github.com/vuetifyjs/vuetify/issues/20207)) ([6337f52](https://github.com/vuetifyjs/vuetify/commit/6337f52b40a6a30e03d6572325de7493c11d53ba)), closes [#20101](https://github.com/vuetifyjs/vuetify/issues/20101)
- **VOverlay:** close on scrim click in Shadow DOM without activator ([#20291](https://github.com/vuetifyjs/vuetify/issues/20291)) ([2c36fff](https://github.com/vuetifyjs/vuetify/commit/2c36fff107a88a4926363d5b9e7c774a06c2d5a5))
- **VOverlay:** reuse container element in shadow DOM ([3ee87ac](https://github.com/vuetifyjs/vuetify/commit/3ee87ac9bf6b2f4aabd12d5b24f2ae67a4a508db)), closes [#20276](https://github.com/vuetifyjs/vuetify/issues/20276) [#20277](https://github.com/vuetifyjs/vuetify/issues/20277)
- **VSnackbar:** handle pointerleave event after transition ends ([#20312](https://github.com/vuetifyjs/vuetify/issues/20312)) ([d25879a](https://github.com/vuetifyjs/vuetify/commit/d25879a05aad39ecda86ec82cbd8384b72b8115b)), closes [#20306](https://github.com/vuetifyjs/vuetify/issues/20306)
- **VSpeedDial:** Use `content-class` ([#20319](https://github.com/vuetifyjs/vuetify/issues/20319)) ([b10c4ab](https://github.com/vuetifyjs/vuetify/commit/b10c4ab7ee7d39851c1c64fa6d7f9bdef64c0137)), closes [#20051](https://github.com/vuetifyjs/vuetify/issues/20051)

### :test_tube: Labs

- **VNumberInput:** forward VTextField properties ([e1ed75f](https://github.com/vuetifyjs/vuetify/commit/e1ed75f684bf413147d3988aca8ee7d7d725b78d)), closes [#20135](https://github.com/vuetifyjs/vuetify/issues/20135)
- **VTreeview:** don't expose open ([#20192](https://github.com/vuetifyjs/vuetify/issues/20192)) ([40f7197](https://github.com/vuetifyjs/vuetify/commit/40f719796e50227637db1d62b9287131f97d3677))
- **VTreeview:** ignore `type` in items ([f20636a](https://github.com/vuetifyjs/vuetify/commit/f20636ad47e46249d4e344c43cceda2ac5d17d9a)), closes [#19476](https://github.com/vuetifyjs/vuetify/issues/19476)

## v3.6.14 - 2024-07-31T14:05:30Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.6.14

### :wrench: Bug Fixes

- **styles:** support sass 1.77.7 ([4fd811a](https://github.com/vuetifyjs/vuetify/commit/4fd811a6cc3af2da5ba0f9ea74e4fa7e4adeda77)), closes [#20139](https://github.com/vuetifyjs/vuetify/issues/20139)
- **VAvatar:** pass props.image as src to VImg defaults ([c264ad4](https://github.com/vuetifyjs/vuetify/commit/c264ad4067052827d9bb38f54482b787a624daa1))
- **VBtn:** allow passing custom ripple options ([#20190](https://github.com/vuetifyjs/vuetify/issues/20190)) ([0a31bf8](https://github.com/vuetifyjs/vuetify/commit/0a31bf88f32c049e3dd5b1f964ba5ab38d814a6b)), closes [#20189](https://github.com/vuetifyjs/vuetify/issues/20189)
- **VFooter:** useToggleScope for layout support ([0bfaf12](https://github.com/vuetifyjs/vuetify/commit/0bfaf129cf98fc32a8a28cd3603055e7934e3c29))
- **VListGroup:** don't clear opened on unmount ([#20215](https://github.com/vuetifyjs/vuetify/issues/20215)) ([1e183ef](https://github.com/vuetifyjs/vuetify/commit/1e183ef8e5221a424bb52fa0eeb4f798c73f24d2)), closes [#20199](https://github.com/vuetifyjs/vuetify/issues/20199)
- **VMenu:** check if element still exists before closing parent ([#20249](https://github.com/vuetifyjs/vuetify/issues/20249)) ([560362d](https://github.com/vuetifyjs/vuetify/commit/560362d125fd7e371029b2019b53ceffb21872a3)), closes [#20248](https://github.com/vuetifyjs/vuetify/issues/20248)
- **VSkeletonLoader:** remove aria-label when loading finished ([867b2ab](https://github.com/vuetifyjs/vuetify/commit/867b2abee41c5786f25a1e789216fa829eeafcf0))
- **VSnackbar:** update countdown value on timeout change ([3cc2763](https://github.com/vuetifyjs/vuetify/commit/3cc2763ec7638a3018f3d01ce491c22935eb67c2)), closes [#20196](https://github.com/vuetifyjs/vuetify/issues/20196)

### :test_tube: Labs

- **VNumberInput:** prevent NaN & handle js number quirks ([#20211](https://github.com/vuetifyjs/vuetify/issues/20211)) ([3a31086](https://github.com/vuetifyjs/vuetify/commit/3a3108630de964a79ce77354fd9dec247891888f)), closes [#19798](https://github.com/vuetifyjs/vuetify/issues/19798) [#20171](https://github.com/vuetifyjs/vuetify/issues/20171)

## v3.6.13 - 2024-07-16T21:30:45Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.6.13

### :wrench: Bug Fixes

- **typescript:** augment GlobalComponents in multiple vue modules ([#20144](https://github.com/vuetifyjs/vuetify/issues/20144)) ([bd1f63d](https://github.com/vuetifyjs/vuetify/commit/bd1f63dcfc57ef0b15b8cfd2847bd40ba7751a39))
- **VAppBar:** scrollBehavior type for fully-hide ([040fda8](https://github.com/vuetifyjs/vuetify/commit/040fda8749630c08488aa1786f8a8b82e6b7779d))
- **VBtn:** allow stacked and block props to work together ([#20162](https://github.com/vuetifyjs/vuetify/issues/20162)) ([9969ebb](https://github.com/vuetifyjs/vuetify/commit/9969ebb8b1cbba528c13ca075917c5b32f7ed5a5))
- **VDataTable:** use item.raw and columns in sorting transform ([#20077](https://github.com/vuetifyjs/vuetify/issues/20077)) ([e33b951](https://github.com/vuetifyjs/vuetify/commit/e33b9514d548e57ad923082837a87e9d2e275b2e)), closes [#20045](https://github.com/vuetifyjs/vuetify/issues/20045)
- **VDataTable:** support groupBy when sorting is disabled ([#20047](https://github.com/vuetifyjs/vuetify/issues/20047)) ([8ac10e4](https://github.com/vuetifyjs/vuetify/commit/8ac10e43a10ea3f966f1bb7cd9d87fdff52c93c9)), closes [#20046](https://github.com/vuetifyjs/vuetify/issues/20046)
- **VDatePicker:** programmatic start date with multiple range ([#20169](https://github.com/vuetifyjs/vuetify/issues/20169)) ([1a0d9b7](https://github.com/vuetifyjs/vuetify/commit/1a0d9b7ecbde60cce31750c8f36b8e382c8c3535)), closes [#20168](https://github.com/vuetifyjs/vuetify/issues/20168)
- **VOtpInput:** slice value with length on paste ([#20164](https://github.com/vuetifyjs/vuetify/issues/20164)) ([0f8fd5d](https://github.com/vuetifyjs/vuetify/commit/0f8fd5d2d82a45cefc47e64b1abcf6eba5e8b1f1)), closes [#20158](https://github.com/vuetifyjs/vuetify/issues/20158)

### :test_tube: Labs

- **VDateInput:** inherit class / style props ([#20002](https://github.com/vuetifyjs/vuetify/issues/20002)) ([a88a2ee](https://github.com/vuetifyjs/vuetify/commit/a88a2eed74790e74316a1e487513b5e79834064e)), closes [#19985](https://github.com/vuetifyjs/vuetify/issues/19985)
- **VDateInput:** remove menu interaction when disabled/readonly ([#20163](https://github.com/vuetifyjs/vuetify/issues/20163)) ([f970e5f](https://github.com/vuetifyjs/vuetify/commit/f970e5f09d9eae83b42cbec9d761fe96ae42c370)), closes [#20147](https://github.com/vuetifyjs/vuetify/issues/20147)
- **VTimePicker:** don't show buttons if ampmInTitle is not true ([#20178](https://github.com/vuetifyjs/vuetify/issues/20178)) ([0c80102](https://github.com/vuetifyjs/vuetify/commit/0c80102ecca9dffb337b974064f3e583c5467e63))

### :arrows_counterclockwise: Reverts

- Revert "fix(VField/VInput): centerAffix prop for underlined/plain ([#20064](https://github.com/vuetifyjs/vuetify/issues/20064))" ([#20173](https://github.com/vuetifyjs/vuetify/issues/20173)) ([098f802](https://github.com/vuetifyjs/vuetify/commit/098f8029d5376152145ab4590da086cb59419f8f))

## v3.6.12 - 2024-07-09T19:17:37Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.6.12

### :wrench: Bug Fixes

- **calendar:** add missing first-day-of-week property support ([#20096](https://github.com/vuetifyjs/vuetify/issues/20096)) ([77af0c6](https://github.com/vuetifyjs/vuetify/commit/77af0c68a45029fa5df2ef0974378b08c7ddf50b))
- **VDataTableFooter:** wrong icon types ([#20107](https://github.com/vuetifyjs/vuetify/issues/20107)) ([5676e18](https://github.com/vuetifyjs/vuetify/commit/5676e181b581a332d93b1c821ab9e145f2c69784))
- **VDatePickerControls:** wrong icon types ([#20121](https://github.com/vuetifyjs/vuetify/issues/20121)) ([32efb8c](https://github.com/vuetifyjs/vuetify/commit/32efb8ca510a9f6ab533722883f621e45c24c79f))
- **VExpansionPanels:** specify inherited props ([719a64a](https://github.com/vuetifyjs/vuetify/commit/719a64a2026f42d66262248ba8c20514def1ce36)), closes [#20109](https://github.com/vuetifyjs/vuetify/issues/20109)
- **VField/VInput:** centerAffix prop for underlined/plain ([#20064](https://github.com/vuetifyjs/vuetify/issues/20064)) ([650ba25](https://github.com/vuetifyjs/vuetify/commit/650ba2549aaeebfdd49842fdffec4d711c4f5980))
- **VOverlay:** make updateLocation event argument optional ([fa1a089](https://github.com/vuetifyjs/vuetify/commit/fa1a0897cbfcd83c7a33a016640e4718ef0b875a))
- **VOverlay:** correct ShadowRoot attach condition ([ec73e6f](https://github.com/vuetifyjs/vuetify/commit/ec73e6fc4bb82368f4cd0ef813234af23a66f122)), closes [#20001](https://github.com/vuetifyjs/vuetify/issues/20001) [#20086](https://github.com/vuetifyjs/vuetify/issues/20086)
- **VProgressLinear:** render in forced-colors mode ([#20112](https://github.com/vuetifyjs/vuetify/issues/20112)) ([601d364](https://github.com/vuetifyjs/vuetify/commit/601d3644a9b61e7d2529f4f836a8a8ac87f5b5a0)), closes [#20111](https://github.com/vuetifyjs/vuetify/issues/20111)
- **VRadio:** class/style duplication ([81bc1f4](https://github.com/vuetifyjs/vuetify/commit/81bc1f47967b77f01b1b39110929f9b413da7426)), closes [#20012](https://github.com/vuetifyjs/vuetify/issues/20012) [#20005](https://github.com/vuetifyjs/vuetify/issues/20005)

### :test_tube: Labs

- **VNumberInput:** allow press delete key ([#20125](https://github.com/vuetifyjs/vuetify/issues/20125)) ([09c294b](https://github.com/vuetifyjs/vuetify/commit/09c294b9fabbb015ee0cbb02319782507c16da54)), closes [#20083](https://github.com/vuetifyjs/vuetify/issues/20083)
- **VTimePicker:** fix types for emit events ([#20126](https://github.com/vuetifyjs/vuetify/issues/20126)) ([5385260](https://github.com/vuetifyjs/vuetify/commit/5385260ebb25f76ed339a18d049f080ccc4b09d4)), closes [#20085](https://github.com/vuetifyjs/vuetify/issues/20085)

## v3.6.11 - 2024-07-02T22:37:50Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.6.11

### :wrench: Bug Fixes

- **VOverlay:** add null coalescing to true if no shadowDomRoot ([27b4b1e](https://github.com/vuetifyjs/vuetify/commit/27b4b1e52060b6bee13a290a4829f935f1bd9c05)), closes [#20001](https://github.com/vuetifyjs/vuetify/issues/20001)

### :test_tube: Labs

- **VNumberInput:** fix inc/dec slots with split control variant ([#20072](https://github.com/vuetifyjs/vuetify/issues/20072)) ([4ac8aa4](https://github.com/vuetifyjs/vuetify/commit/4ac8aa4ad5048ecbd0d8a2e25d928953a4d1d646)), closes [#20056](https://github.com/vuetifyjs/vuetify/issues/20056)
- **VStepperVertical:** provide eager in defaults props ([#20033](https://github.com/vuetifyjs/vuetify/issues/20033)) ([620a0d9](https://github.com/vuetifyjs/vuetify/commit/620a0d9e4b876e6f3251add09eb92b22d0ef65ae)), closes [#20025](https://github.com/vuetifyjs/vuetify/issues/20025)
- **VTreeview:** avoid re-render by opened & respect openAll ([#20032](https://github.com/vuetifyjs/vuetify/issues/20032)) ([0a32df5](https://github.com/vuetifyjs/vuetify/commit/0a32df5706fe7eb227918efc4375eef726b9f7a9))

## v3.6.10 - 2024-06-19T22:07:07Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.6.10

### :wrench: Bug Fixes

- **VDatePicker:** don't update month/year if new model is empty ([154e751](https://github.com/vuetifyjs/vuetify/commit/154e7516b89eb28f2f6c7568be92a5a28b5f572e)), closes [#20015](https://github.com/vuetifyjs/vuetify/issues/20015)
- **VExpansionPanel:** remove unused toRef ([0931cec](https://github.com/vuetifyjs/vuetify/commit/0931cec21c35c062192b8f22b0438542f31bbce8))
- **VExpansionPanel:** propagate defaults provided by VExpansionPanels ([666484a](https://github.com/vuetifyjs/vuetify/commit/666484ae265194dc1512cb4f84f53ab928f5482b))
- **VExpansionPanelTitle:** propagate VIcon defaults ([cec2094](https://github.com/vuetifyjs/vuetify/commit/cec20943af77b1c723c560d7282ebecee865e38b))

## v3.6.9 - 2024-06-11T20:15:50Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.6.9

### :wrench: Bug Fixes

- **VAppBar:** inability to scroll to the bottom ([#19921](https://github.com/vuetifyjs/vuetify/issues/19921)) ([7ccff92](https://github.com/vuetifyjs/vuetify/commit/7ccff92e55fbfa27f022d9f61cbdf7d09d924f69)), closes [#19090](https://github.com/vuetifyjs/vuetify/issues/19090)
- **VAutocomplete/VCombobox:** disallow auto-select-first via pure blur ([2368668](https://github.com/vuetifyjs/vuetify/commit/2368668d49b322a1ac7aa5a9d602676affdef9b2)), closes [#19929](https://github.com/vuetifyjs/vuetify/issues/19929)
- **VBanner:** set index when using sticky prop ([9e2d22f](https://github.com/vuetifyjs/vuetify/commit/9e2d22f3f76515809ab47c147b689efc7cb09bf0))
- **VEmptyState:** support VBtn variants when using actions slot ([99279d9](https://github.com/vuetifyjs/vuetify/commit/99279d97711f4953c7d266247f8ff0415fd601a2))
- **VFab:** change type for location prop ([#19949](https://github.com/vuetifyjs/vuetify/issues/19949)) ([07a6fb8](https://github.com/vuetifyjs/vuetify/commit/07a6fb861318781bedcc145d0533a49d54b8121a)), closes [#19944](https://github.com/vuetifyjs/vuetify/issues/19944)
- **VMenu:** allow enter keypress to work in input element ([#19922](https://github.com/vuetifyjs/vuetify/issues/19922)) ([193301c](https://github.com/vuetifyjs/vuetify/commit/193301cb2d55ceacc4d2ef2cdbadf62c87675297)), closes [#19920](https://github.com/vuetifyjs/vuetify/issues/19920)
- **VOverlay:** check for Shadow DOM on mount ([#19947](https://github.com/vuetifyjs/vuetify/issues/19947)) ([e6e76d5](https://github.com/vuetifyjs/vuetify/commit/e6e76d5670c8b6e0a41cd2d1c6db97b12673495f)), closes [#19943](https://github.com/vuetifyjs/vuetify/issues/19943)

### :test_tube: Labs

- **VNumberInput:** attributes fall through to root ([#19959](https://github.com/vuetifyjs/vuetify/issues/19959)) ([df6440d](https://github.com/vuetifyjs/vuetify/commit/df6440dc99d55d8db743be35bc5cc50e1fea88b2))
- **VTimePicker:** properly apply disabled props ([#19964](https://github.com/vuetifyjs/vuetify/issues/19964)) ([0ba4b78](https://github.com/vuetifyjs/vuetify/commit/0ba4b7864f4531b5ccac1880ea32c123ff1fbd7c))
- **VTreeview:** remove redundant treeview re-render during open ([#19968](https://github.com/vuetifyjs/vuetify/issues/19968)) ([9e1cfbd](https://github.com/vuetifyjs/vuetify/commit/9e1cfbddbfd0ce7043aa096bd7d370beef382c7f))

## v3.6.8 - 2024-05-29T16:31:13Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.6.8

### :wrench: Bug Fixes

- **framework:** remove circular imports ([957b4bc](https://github.com/vuetifyjs/vuetify/commit/957b4bc1cc8f870ba155e37be2dca6d5de4e588a)), closes [#19852](https://github.com/vuetifyjs/vuetify/issues/19852)
- **flex:** add missing flex-x-x-0 classes ([a23dece](https://github.com/vuetifyjs/vuetify/commit/a23dece86fe666f15c74e304f65bbdd1ce13cefc))
- **VCheckboxBtn:** reset checked state when readonly is true ([#19861](https://github.com/vuetifyjs/vuetify/issues/19861)) ([ed2f0fa](https://github.com/vuetifyjs/vuetify/commit/ed2f0fa01ef8216158042a4f3dd85c6b1596998b)), closes [#19137](https://github.com/vuetifyjs/vuetify/issues/19137)
- **VDataTable:** customKeyFilter filtering ([#19881](https://github.com/vuetifyjs/vuetify/issues/19881)) ([b3eafb2](https://github.com/vuetifyjs/vuetify/commit/b3eafb275c2ca85cefb297e840f66c839908eed8)), closes [#19596](https://github.com/vuetifyjs/vuetify/issues/19596)
- **VDatePicker:** using the start range that has been cleared ([#19869](https://github.com/vuetifyjs/vuetify/issues/19869)) ([f401f41](https://github.com/vuetifyjs/vuetify/commit/f401f41844c5201abccb9cd732ef7ddbde192089)), closes [#19854](https://github.com/vuetifyjs/vuetify/issues/19854)
- **VDivider:** missing when vertical and aligned to center ([#19890](https://github.com/vuetifyjs/vuetify/issues/19890)) ([18d64fe](https://github.com/vuetifyjs/vuetify/commit/18d64feb0f93b49a244c6bd83365dd2f89b9f1e1)), closes [#19889](https://github.com/vuetifyjs/vuetify/issues/19889)
- **VSlider:** add missing aria-label ([#19887](https://github.com/vuetifyjs/vuetify/issues/19887)) ([e46a98d](https://github.com/vuetifyjs/vuetify/commit/e46a98db5be9ae899b7e31236b10de263fdd32e8))
- **VSnackbar:** fix class name for center location ([#19878](https://github.com/vuetifyjs/vuetify/issues/19878)) ([e48d37b](https://github.com/vuetifyjs/vuetify/commit/e48d37bce506ebff8b82bae10b05b09a7052f4b8))
- **VStepper:** propagate complete/error/edit icons ([64acd01](https://github.com/vuetifyjs/vuetify/commit/64acd015420b31b553b16608fd97687c307b672d))
- **VStepper:** accept null value for mobile ([908fb59](https://github.com/vuetifyjs/vuetify/commit/908fb5914a6685245935a7a5d299dfc774738417))
- **VStepperItem:** remove inline margin in mobile mode ([e94dc93](https://github.com/vuetifyjs/vuetify/commit/e94dc93b8cc32c720fb7cfe79a7f29cce77e5d42))
- **VTabs:** render tabs correctly using items ([#19868](https://github.com/vuetifyjs/vuetify/issues/19868)) ([f5f2fa4](https://github.com/vuetifyjs/vuetify/commit/f5f2fa4a3a5769083356794ea744fa8a6eca81db))

### :test_tube: Labs

- **VNumberInput:** disable up/down controls for readonly state ([#19906](https://github.com/vuetifyjs/vuetify/issues/19906)) ([4ceaaa5](https://github.com/vuetifyjs/vuetify/commit/4ceaaa5bc060b32c4b4077174f26a6dc9f236d2f))
- **VTreeview:** select & activate issues ([#19795](https://github.com/vuetifyjs/vuetify/issues/19795)) ([8d7beeb](https://github.com/vuetifyjs/vuetify/commit/8d7beebf10643b6f1d18fb15bd81a9183725b1b5)), closes [#19441](https://github.com/vuetifyjs/vuetify/issues/19441) [#19402](https://github.com/vuetifyjs/vuetify/issues/19402) [#19400](https://github.com/vuetifyjs/vuetify/issues/19400) [#19533](https://github.com/vuetifyjs/vuetify/issues/19533) [#19471](https://github.com/vuetifyjs/vuetify/issues/19471)

## v3.6.7 - 2024-05-21T16:03:12Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.6.7

### :wrench: Bug Fixes

- **defaults:** allow null component and global values ([#19842](https://github.com/vuetifyjs/vuetify/issues/19842)) ([9342288](https://github.com/vuetifyjs/vuetify/commit/934228846a83468657429250f53e6601a4f9c4ad)), closes [#19783](https://github.com/vuetifyjs/vuetify/issues/19783)
- **layout:** find children inside suspense boundary ([c209d09](https://github.com/vuetifyjs/vuetify/commit/c209d0952862540c5c503e46c5114c6cefb2e243)), closes [#19830](https://github.com/vuetifyjs/vuetify/issues/19830)
- **locale:** update missing persian translations ([#19812](https://github.com/vuetifyjs/vuetify/issues/19812)) ([17a0561](https://github.com/vuetifyjs/vuetify/commit/17a056162267fb56e4f8f96e98c287253e95b904))
- **VAutocomplete/VCombobox:** remove tab key listener ([#19846](https://github.com/vuetifyjs/vuetify/issues/19846)) ([5703a6c](https://github.com/vuetifyjs/vuetify/commit/5703a6c8a0b95a7a0567576ac3d0f0d980a0079e)), closes [#19840](https://github.com/vuetifyjs/vuetify/issues/19840)
- **VAutocomplete/VCombobox:** prevent focus on menu icon ([4b387b5](https://github.com/vuetifyjs/vuetify/commit/4b387b5ceb3baa35a604526c55dab3510167254b))
- **VBtn:** remove negative prepend/append margin with slim prop ([665c616](https://github.com/vuetifyjs/vuetify/commit/665c616254e5a5727482c4f5d894d1e958675edb))
- **VDataTable:** add ability to hide default body ([#19844](https://github.com/vuetifyjs/vuetify/issues/19844)) ([2f8ee0f](https://github.com/vuetifyjs/vuetify/commit/2f8ee0fa1c61d0b6342f014f7e931f27cd3116ad)), closes [#18854](https://github.com/vuetifyjs/vuetify/issues/18854)
- **VDataTable:** fit mobile row height to content ([#19843](https://github.com/vuetifyjs/vuetify/issues/19843)) ([f016954](https://github.com/vuetifyjs/vuetify/commit/f016954313ba919e187754cbe6fa29ea324b1245))
- **VDataTable:** add missing disable-sort prop ([#19820](https://github.com/vuetifyjs/vuetify/issues/19820)) ([4a2de37](https://github.com/vuetifyjs/vuetify/commit/4a2de375b84851fe5cdf26d4f391f5028d0a2854)), closes [#19197](https://github.com/vuetifyjs/vuetify/issues/19197)
- **VDatePicker:** disable months outside min/max value ([#19822](https://github.com/vuetifyjs/vuetify/issues/19822)) ([67ab46c](https://github.com/vuetifyjs/vuetify/commit/67ab46cdb97a1b8a1e0171c98ed83785e2c59708)), closes [#19810](https://github.com/vuetifyjs/vuetify/issues/19810)
- **VDivider:** visiblity in container with dynamic height ([#19828](https://github.com/vuetifyjs/vuetify/issues/19828)) ([ea567bb](https://github.com/vuetifyjs/vuetify/commit/ea567bbe0fd09641e8fc68762cca8aaa3e4aeef2)), closes [#19827](https://github.com/vuetifyjs/vuetify/issues/19827)
- **VDivider:** don't wrap content ([d6b292f](https://github.com/vuetifyjs/vuetify/commit/d6b292f9b2df6d0a5eda76583176d51d835323f8))
- **VField:** avoid cascaded overlay multiplier from parent components ([88badc6](https://github.com/vuetifyjs/vuetify/commit/88badc63f228dfe22bda14f57e0a94180dd20655))
- **VList:** pass return-object to nested VListChildren ([#19848](https://github.com/vuetifyjs/vuetify/issues/19848)) ([feeb467](https://github.com/vuetifyjs/vuetify/commit/feeb4672c4c25661c68afeccaa998be06b09e45d))
- **VMenu:** min width property ([#19771](https://github.com/vuetifyjs/vuetify/issues/19771)) ([7d955d2](https://github.com/vuetifyjs/vuetify/commit/7d955d270922b596cb8deb4c9152b0e85644888a)), closes [#16987](https://github.com/vuetifyjs/vuetify/issues/16987)

### :test_tube: Labs

- **VCalendar:** use date adapter to create new date ([#19823](https://github.com/vuetifyjs/vuetify/issues/19823)) ([905eb63](https://github.com/vuetifyjs/vuetify/commit/905eb633d8550a96e01f5a399c8252bb62776b7c)), closes [#19814](https://github.com/vuetifyjs/vuetify/issues/19814)
- **VConfirmEdit:** expose save, cancel, isPristine ([8ed8731](https://github.com/vuetifyjs/vuetify/commit/8ed87310890e2b6c8ad2a626a02c17f9467cbb60)), closes [#19747](https://github.com/vuetifyjs/vuetify/issues/19747)

## v3.6.6 - 2024-05-14T16:11:53Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.6.6

### :wrench: Bug Fixes

- **locale:** update German locale translations ([#19805](https://github.com/vuetifyjs/vuetify/issues/19805)) ([2553fe6](https://github.com/vuetifyjs/vuetify/commit/2553fe66f4cdf52f0d874bfc2622ca3667329e21))
- **locale:** update hu translation ([#19738](https://github.com/vuetifyjs/vuetify/issues/19738)) ([74158a8](https://github.com/vuetifyjs/vuetify/commit/74158a884e6b819f2f86b71556e8f110c4129f67))
- **VBanner:** assign mobile default of null ([aad15b7](https://github.com/vuetifyjs/vuetify/commit/aad15b7bdab269cf440a82d08d719f55595c2bbb))
- **VMenu:** allow enter keypress to work in textareas ([#19768](https://github.com/vuetifyjs/vuetify/issues/19768)) ([19ddcef](https://github.com/vuetifyjs/vuetify/commit/19ddcef6cfcfbd62e86730e4d43926d5ca7b1f1d)), closes [#19767](https://github.com/vuetifyjs/vuetify/issues/19767)
- **VOverlay:** don't closeParents if persistent is set ([#19782](https://github.com/vuetifyjs/vuetify/issues/19782)) ([aada67a](https://github.com/vuetifyjs/vuetify/commit/aada67ac448ddd71fc013391773c2cecc8b6189d)), closes [#19780](https://github.com/vuetifyjs/vuetify/issues/19780)
- **VSelect:** hide-selected with return-object ([#19807](https://github.com/vuetifyjs/vuetify/issues/19807)) ([aa79f16](https://github.com/vuetifyjs/vuetify/commit/aa79f1644df811809631612665ee4de89843d571)), closes [#19806](https://github.com/vuetifyjs/vuetify/issues/19806)
- **VSlideGroup:** assign mobile default of null ([b674239](https://github.com/vuetifyjs/vuetify/commit/b674239d174ed88eb0640d5ca9f5366bdd1efdd4))
- **VSwitch:** render in forced-colors mode ([#19703](https://github.com/vuetifyjs/vuetify/issues/19703)) ([e36f7bc](https://github.com/vuetifyjs/vuetify/commit/e36f7bcb40b960109542f0d31fec59c289dd5c47)), closes [#19702](https://github.com/vuetifyjs/vuetify/issues/19702)

### :arrows_counterclockwise: Reverts

- Revert "fix(colors): apply theme-on-surface override for bg text color" ([1b56e4e](https://github.com/vuetifyjs/vuetify/commit/1b56e4e601c098620daf6eb077d797174703e0da))

### :test_tube: Labs

- **VNumberInput:** mobile friendly support ([#19791](https://github.com/vuetifyjs/vuetify/issues/19791)) ([9520563](https://github.com/vuetifyjs/vuetify/commit/9520563d9a4652c7d725c975ef9ac1e3673ceb47))
- **VTreeview:** scoped loading state by child ([#19773](https://github.com/vuetifyjs/vuetify/issues/19773)) ([49892e2](https://github.com/vuetifyjs/vuetify/commit/49892e2a45ebb82c3b3827df1f49e142f76b7e02)), closes [#19390](https://github.com/vuetifyjs/vuetify/issues/19390)

## v3.6.5 - 2024-05-10T20:03:49Z

Source: https://github.com/vuetifyjs/vuetify/releases/tag/v3.6.5

### :wrench: Bug Fixes

- **VDataTable:** add missing hide-default-header/footer props ([#19774](https://github.com/vuetifyjs/vuetify/issues/19774)) ([a6340ac](https://github.com/vuetifyjs/vuetify/commit/a6340ac592fd3435c81f35b36eb60861cd426d02))
- **VFileInput:** allow dirty prop to trigger dirty state ([85c41db](https://github.com/vuetifyjs/vuetify/commit/85c41dbe8028c878da6cd8cbd7510a8b21be298b)), closes [#19699](https://github.com/vuetifyjs/vuetify/issues/19699)
- **VStepper:** add missing hover and focus styling ([b45ab1a](https://github.com/vuetifyjs/vuetify/commit/b45ab1aff93965c31a88cb567d83f934dac00e1d))
- **VStepper:** add missing non-linear styles ([da6d5f3](https://github.com/vuetifyjs/vuetify/commit/da6d5f3cd2d54bf6ad652688b61c9626933d969d))
- **VStepper:** only show edit icon if editable and selected ([34bb202](https://github.com/vuetifyjs/vuetify/commit/34bb2020124553436691d7542ca77948452d7fab))
- **VStepper:** do not spread raw property onto VStepperItem ([3d9deb7](https://github.com/vuetifyjs/vuetify/commit/3d9deb7db53e70e0605b76f270f7d962d38f09e4))

### :test_tube: Labs

- **VStepperVertical:** create new component ([#19524](https://github.com/vuetifyjs/vuetify/issues/19524)) ([1bc66cd](https://github.com/vuetifyjs/vuetify/commit/1bc66cd2a049677f68d2598d6e12450c75e6d117))
