import { 
  formatEther, 
  formatUnits,
  type Hex,
  type TransactionReceipt,
  type Log,
} from 'viem';

// Common function selectors (4byte signatures)
const KNOWN_SELECTORS: Record<string, { name: string; signature: string }> = {
  // ERC20
  '0xa9059cbb': { name: 'transfer', signature: 'transfer(address,uint256)' },
  '0x23b872dd': { name: 'transferFrom', signature: 'transferFrom(address,address,uint256)' },
  '0x095ea7b3': { name: 'approve', signature: 'approve(address,uint256)' },
  
  // Uniswap V2 Router
  '0x7ff36ab5': { name: 'swapExactETHForTokens', signature: 'swapExactETHForTokens(uint256,address[],address,uint256)' },
  '0x18cbafe5': { name: 'swapExactTokensForETH', signature: 'swapExactTokensForETH(uint256,uint256,address[],address,uint256)' },
  '0x38ed1739': { name: 'swapExactTokensForTokens', signature: 'swapExactTokensForTokens(uint256,uint256,address[],address,uint256)' },
  '0xfb3bdb41': { name: 'swapETHForExactTokens', signature: 'swapETHForExactTokens(uint256,address[],address,uint256)' },
  '0x4a25d94a': { name: 'swapTokensForExactETH', signature: 'swapTokensForExactETH(uint256,uint256,address[],address,uint256)' },
  '0xe8e33700': { name: 'addLiquidity', signature: 'addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256)' },
  '0xf305d719': { name: 'addLiquidityETH', signature: 'addLiquidityETH(address,uint256,uint256,uint256,address,uint256)' },
  '0xbaa2abde': { name: 'removeLiquidity', signature: 'removeLiquidity(address,address,uint256,uint256,uint256,address,uint256)' },
  '0x02751cec': { name: 'removeLiquidityETH', signature: 'removeLiquidityETH(address,uint256,uint256,uint256,address,uint256)' },
  
  // Uniswap V3 Router
  '0x04e45aaf': { name: 'exactInputSingle', signature: 'exactInputSingle((address,address,uint24,address,uint256,uint256,uint160))' },
  '0xb858183f': { name: 'exactInput', signature: 'exactInput((bytes,address,uint256,uint256))' },
  '0x5ae401dc': { name: 'multicall', signature: 'multicall(uint256,bytes[])' },
  '0xac9650d8': { name: 'multicall', signature: 'multicall(bytes[])' },
  '0x414bf389': { name: 'exactInputSingle', signature: 'exactInputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160))' },
  '0xc04b8d59': { name: 'exactInput', signature: 'exactInput((bytes,address,uint256,uint256,uint256))' },
  '0xdb3e2198': { name: 'exactOutputSingle', signature: 'exactOutputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160))' },
  '0xf28c0498': { name: 'exactOutput', signature: 'exactOutput((bytes,address,uint256,uint256,uint256))' },
  
  // Uniswap Universal Router
  '0x3593564c': { name: 'execute', signature: 'execute(bytes,bytes[],uint256)' },
  '0x24856bc3': { name: 'execute', signature: 'execute(bytes,bytes[])' },
  
  // WETH
  '0xd0e30db0': { name: 'deposit', signature: 'deposit()' },
  '0x2e1a7d4d': { name: 'withdraw', signature: 'withdraw(uint256)' },
  
  // Aave V3
  '0x617ba037': { name: 'supply', signature: 'supply(address,uint256,address,uint16)' },
  '0x69328dec': { name: 'withdraw', signature: 'withdraw(address,uint256,address)' },
  '0xa415bcad': { name: 'borrow', signature: 'borrow(address,uint256,uint256,uint16,address)' },
  '0x573ade81': { name: 'repay', signature: 'repay(address,uint256,uint256,address)' },
  '0xab9c4b5d': { name: 'flashLoan', signature: 'flashLoan(address,address[],uint256[],uint256[],address,bytes,uint16)' },
  '0x1b11d0ff': { name: 'liquidationCall', signature: 'liquidationCall(address,address,address,uint256,bool)' },
  
  // Aave V2
  '0xe8eda9df': { name: 'deposit', signature: 'deposit(address,uint256,address,uint16)' },
  
  // Compound V3
  '0xf2b9fdb8': { name: 'supply', signature: 'supply(address,uint256)' },
  '0xf3fef3a3': { name: 'withdraw', signature: 'withdraw(address,uint256)' },
  
  // Morpho Blue
  '0x50d8cd4b': { name: 'supply', signature: 'supply((address,address,address,address,uint256),uint256,uint256,address,bytes)' },
  '0x5c2bea49': { name: 'withdraw', signature: 'withdraw((address,address,address,address,uint256),uint256,uint256,address,address)' },
  '0x6c7ac9d8': { name: 'borrow', signature: 'borrow((address,address,address,address,uint256),uint256,uint256,address,address)' },
  '0x20b76e81': { name: 'repay', signature: 'repay((address,address,address,address,uint256),uint256,uint256,address,bytes)' },
  '0xd8efab88': { name: 'supplyCollateral', signature: 'supplyCollateral((address,address,address,address,uint256),uint256,address,bytes)' },
  '0xaed0a0e2': { name: 'withdrawCollateral', signature: 'withdrawCollateral((address,address,address,address,uint256),uint256,address,address)' },
  '0x1c3db2e0': { name: 'liquidate', signature: 'liquidate((address,address,address,address,uint256),address,uint256,uint256,bytes)' },
  '0xe0232b42': { name: 'flashLoan', signature: 'flashLoan(address,address,uint256,bytes)' },
  
  // ERC4626 Vault (Yearn V3, MetaMorpho)
  '0x6e553f65': { name: 'deposit', signature: 'deposit(uint256,address)' },
  '0xb460af94': { name: 'withdraw', signature: 'withdraw(uint256,address,address)' },
  '0x94bf804d': { name: 'mint', signature: 'mint(uint256,address)' },
  '0xba087652': { name: 'redeem', signature: 'redeem(uint256,address,address)' },

  // Morpho Market Creation
  '0x8c1d18fc': { name: 'createMarket', signature: 'createMarket((address,address,address,address,uint256))' },

  // Sushi RouteProcessor
  '0x2646478b': { name: 'processRoute', signature: 'processRoute(address,uint256,address,uint256,address,bytes)' },
  '0x0b0d7b9d': { name: 'transferValueAndprocessRoute', signature: 'transferValueAndprocessRoute(address,uint256,address,uint256,address,bytes)' },
  
  // NFT ERC721
  '0x42842e0e': { name: 'safeTransferFrom', signature: 'safeTransferFrom(address,address,uint256)' },
  '0xb88d4fde': { name: 'safeTransferFrom', signature: 'safeTransferFrom(address,address,uint256,bytes)' },
  '0xa22cb465': { name: 'setApprovalForAll', signature: 'setApprovalForAll(address,bool)' },
  
  // NFT ERC1155
  '0xf242432a': { name: 'safeTransferFrom', signature: 'safeTransferFrom(address,address,uint256,uint256,bytes)' },
  '0x2eb2c2d6': { name: 'safeBatchTransferFrom', signature: 'safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)' },
  
  // OpenSea Seaport
  '0xfb0f3ee1': { name: 'fulfillBasicOrder', signature: 'fulfillBasicOrder((address,uint256,uint256,address,address,address,uint256,uint256,uint8,uint256,uint256,bytes32,uint256,bytes32,bytes32,uint256,(uint256,address)[],bytes))' },
  '0xb3a34c4c': { name: 'fulfillOrder', signature: 'fulfillOrder(((address,address,(uint8,address,uint256,uint256,uint256)[],(uint8,address,uint256,uint256,uint256,address)[],uint8,uint256,uint256,bytes32,uint256,bytes32,uint256),bytes),bytes32)' },
  '0xe7acab24': { name: 'fulfillAdvancedOrder', signature: 'fulfillAdvancedOrder(((address,address,(uint8,address,uint256,uint256,uint256)[],(uint8,address,uint256,uint256,uint256,address)[],uint8,uint256,uint256,bytes32,uint256,bytes32,uint256),uint120,uint120,bytes,bytes),(uint256,uint8,uint256,uint256,bytes32[])[],bytes32,address)' },
  
  // Blur
  '0x9a1fc3a7': { name: 'execute', signature: 'execute((address,uint8,address,address,uint256,uint256,address,uint256,uint256,uint256,(uint16,address)[],uint256,bytes),bytes)' },
  
  // 1inch
  '0x12aa3caf': { name: 'swap', signature: 'swap(address,(address,address,address,address,uint256,uint256,uint256),bytes,bytes)' },
  '0xe449022e': { name: 'uniswapV3Swap', signature: 'uniswapV3Swap(uint256,uint256,uint256[])' },
  '0x0502b1c5': { name: 'unoswap', signature: 'unoswap(address,uint256,uint256,uint256[])' },
  
  // 0x Protocol
  '0xd9627aa4': { name: 'sellToUniswap', signature: 'sellToUniswap(address[],uint256,uint256,bool)' },
  '0x415565b0': { name: 'transformERC20', signature: 'transformERC20(address,address,uint256,uint256,(uint32,bytes)[])' },
  
  // Cowswap
  '0x13d79a0b': { name: 'settle', signature: 'settle(address[],uint256[],((uint256,uint256,address,uint256,uint256,uint32,bytes32,uint256,uint256,uint256,bytes),uint8,bytes32,bytes32)[],bytes[][3])' },
  
  // Permit2
  '0x2b67b570': { name: 'permit', signature: 'permit(address,((address,uint160,uint48,uint48),address,uint256),bytes)' },
  '0x2a2d80d1': { name: 'permitTransferFrom', signature: 'permitTransferFrom(((address,uint256),uint256,uint256),(address,uint256),address,bytes)' },
  
  // Common
  '0x': { name: 'native transfer', signature: '' },
};

// Known contract names - Ethereum Mainnet
const KNOWN_CONTRACTS: Record<string, string> = {
  // === DEXes ===
  // Uniswap
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': 'Uniswap V2 Router',
  '0xe592427a0aece92de3edee1f18e0157c05861564': 'Uniswap V3 Router',
  '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': 'Uniswap V3 Router 2',
  '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad': 'Uniswap Universal Router',
  '0xef1c6e67703c7bd7107eed8303fbe6ec2554bf6b': 'Uniswap Universal Router (Old)',
  '0xc36442b4a4522e871399cd717abdd847ab11fe88': 'Uniswap V3 Positions',
  '0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f': 'Uniswap V2 Factory',
  '0x1f98431c8ad98523631ae4a59f267346ea31f984': 'Uniswap V3 Factory',
  
  // Sushiswap
  '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f': 'SushiSwap Router',
  '0xc0aee478e3658e2610c5f7a4a2e1777ce9e4f2ac': 'SushiSwap Factory',
  
  // 1inch
  '0x1111111254eeb25477b68fb85ed929f73a960582': '1inch V5 Router',
  '0x111111125421ca6dc452d289314280a0f8842a65': '1inch V6 Router',
  '0x11111112542d85b3ef69ae05771c2dccff4faa26': '1inch V4 Router',
  '0x1111111254fb6c44bac0bed2854e76f90643097d': '1inch V3 Router',
  
  // 0x Protocol
  '0xdef1c0ded9bec7f1a1670819833240f027b25eff': '0x Exchange Proxy',
  
  // Cowswap
  '0x9008d19f58aabd9ed0d60971565aa8510560ab41': 'CoW Protocol',
  
  // Curve
  '0x99a58482bd75cbab83b27ec03ca68ff489b5788f': 'Curve Router',
  '0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7': 'Curve 3pool',
  '0xd51a44d3fae010294c616388b506acda1bfaae46': 'Curve Tricrypto2',
  
  // Balancer
  '0xba12222222228d8ba445958a75a0704d566bf2c8': 'Balancer Vault',
  
  // Paraswap
  '0xdef171fe48cf0115b1d80b88dc8eab59176fee57': 'Paraswap V5',
  
  // Kyberswap
  '0x6131b5fae19ea4f9d964eac0408e4408b66337b5': 'KyberSwap Router',
  
  // === Lending Protocols ===
  // Aave
  '0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2': 'Aave V3 Pool',
  '0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9': 'Aave V2 Pool',
  '0x7b4eb56e7cd4b454ba8ff71e4518426369a138a3': 'Aave V3 Data Provider',
  '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9': 'AAVE Token',
  
  // Compound
  '0xc3d688b66703497daa19211eedff47f25384cdc3': 'Compound V3 USDC',
  '0xa17581a9e3356d9a858b789d68b4d866e593ae94': 'Compound V3 WETH',
  '0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b': 'Compound Comptroller',
  
  // Morpho
  '0xbbbbbbbbbb9cc5e90e3b3af64bdaf62c37eeffcb': 'Morpho Blue',
  '0x33333333333371718a3c2bb63e5f3b94c9bc13be': 'Morpho Aave V3',
  
  // Spark (MakerDAO)
  '0xc13e21b648a5ee794902342038ff3adab66be987': 'Spark Pool',
  
  // === Staking & Liquid Staking ===
  // Lido
  '0xae7ab96520de3a18e5e111b5eaab095312d7fe84': 'Lido stETH',
  '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0': 'Lido wstETH',
  '0x889edc2edab5f40e902b864ad4d7ade8e412f9b1': 'Lido Withdrawal Queue',
  
  // Rocket Pool
  '0xae78736cd615f374d3085123a210448e74fc6393': 'Rocket Pool rETH',
  '0xdd3f50f8a6cafbe9b31a427582963f465e745af8': 'Rocket Pool Storage',
  
  // Frax
  '0x5e8422345238f34275888049021821e8e08caa1f': 'Frax frxETH Minter',
  '0xac3e018457b222d93114458476f3e3416abbe38f': 'Frax sfrxETH',
  
  // Coinbase
  '0xbe9895146f7af43049ca1c1ae358b0541ea49704': 'Coinbase cbETH',
  
  // === WETH ===
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'WETH',
  
  // === NFT Marketplaces ===
  // OpenSea
  '0x00000000000000adc04c56bf30ac9d3c0aaf14dc': 'OpenSea Seaport 1.5',
  '0x00000000000001ad428e4906ae43d8f9852d0dd6': 'OpenSea Seaport 1.4',
  '0x00000000006c3852cbef3e08e8df289169ede581': 'OpenSea Seaport 1.1',
  
  // Blur
  '0x29469395eaf6f95920e59f858042f0e28d98a20b': 'Blur Blend',
  '0x39da41747a83aee658334415666f3ef92dd0d541': 'Blur Bidding',
  '0x000000000000ad05ccc4f10045630fb830b95127': 'Blur Exchange',
  '0xb2ecfe4e4d61f8790bbb9de2d1259b9e2410cea5': 'Blur Pool',
  
  // LooksRare
  '0x0000000000e655fae4d56241588680f86e3b2377': 'LooksRare Exchange',
  
  // X2Y2
  '0x74312363e45dcaba76c59ec49a7aa8a65a67eed3': 'X2Y2 Exchange',
  
  // Sudoswap
  '0xa020d57ab0448ef74115c112d18a9c231cc86000': 'Sudoswap Router',
  
  // === Popular NFT Collections ===
  '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d': 'Bored Ape Yacht Club',
  '0x60e4d786628fea6478f785a6d7e704777c86a7c6': 'Mutant Ape Yacht Club',
  '0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb': 'CryptoPunks',
  '0xed5af388653567af2f388e6224dc7c4b3241c544': 'Azuki',
  '0x49cf6f5d44e70224e2e23fdcdd2c053f30ada28b': 'CloneX',
  '0x8a90cab2b38dba80c64b7734e58ee1db38b8992e': 'Doodles',
  '0x7bd29408f11d2bfc23c34f18275bbf23bb716bc7': 'Meebits',
  '0x23581767a106ae21c074b2276d25e5c3e136a68b': 'Moonbirds',
  '0x34d85c9cdeb23fa97cb08333b511ac86e1c4e258': 'Otherdeed',
  '0x59468516a8259058bad1ca5f8f4bff190d30e066': 'Invisible Friends',
  '0x769272677fab02575e84945f03eca517acc544cc': 'The Captainz',
  '0x39ee2c7b3cb80254225884ca001f57118c8f21b6': 'Pudgy Penguins',
  '0x524cab2ec69124574082676e6f654a18df49a048': 'Lil Pudgys',
  
  // === Bridges ===
  // Across
  '0x5c7bcd6e7de5423a257d81b442095a1a6ced35c5': 'Across Bridge',
  
  // Stargate
  '0x8731d54e9d02c286767d56ac03e8037c07e01e98': 'Stargate Router',
  
  // Hop
  '0xb8901acb165ed027e32754e0ffe830802919727f': 'Hop Bridge ETH',
  
  // Arbitrum
  '0x4dbd4fc535ac27206064b68ffcf827b0a60bab3f': 'Arbitrum Bridge',
  
  // Optimism
  '0x99c9fc46f92e8a1c0dec1b1747d010903e884be1': 'Optimism Bridge',
  
  // Polygon
  '0xa0c68c638235ee32657e8f720a23cec1bfc77c77': 'Polygon Bridge',
  
  // zkSync
  '0x32400084c286cf3e17e7b677ea9583e60a000324': 'zkSync Era Bridge',
  
  // === ENS ===
  '0x283af0b28c62c092c9727f1ee09c02ca627eb7f5': 'ENS Registrar',
  '0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85': 'ENS Base Registrar',
  '0x253553366da8546fc250f225fe3d25d0c782303b': 'ENS ETH Registrar',
  
  // === Permit2 ===
  '0x000000000022d473030f116ddee9f6b43ac78ba3': 'Permit2',
  
  // === Gnosis Safe ===
  '0xa6b71e26c5e0845f74c812102ca7114b6a896ab2': 'Gnosis Safe Factory',
  '0xd9db270c1b5e3bd161e8c8503c55ceabee709552': 'Gnosis Safe Singleton',
  
  // === Other ===
  '0x00000000219ab540356cbb839cbe05303d7705fa': 'ETH2 Deposit Contract',
  
  // ==========================================
  // === KATANA NETWORK CONTRACTS ===
  // ==========================================
  
  // === Sushi on Katana ===
  '0x72d111b4d6f31b38919ae39779f570b747d6acd9': 'Sushi V2 Factory',
  '0x69cc349932ae18ed406eeb917d79b9b3033fb68e': 'Sushi V2 Router',
  '0x203e8740894c8955cb8950759876d7e7e45e04c1': 'Sushi V3 Factory',
  '0x2659c6085d26144117d904c46b48b6d180393d27': 'Sushi V3 Positions',
  '0x4e1d81a3e627b9294532e990109e4c21d217376c': 'Sushi V3 Router',
  '0x3ced11c610556e5292fbc2e75d68c3899098c14c': 'Sushi RouteProcessor',
  '0xac4c6e212a361c968f1725b4d055b47e63f80b75': 'Sushi RedSnwapper',
  
  // === Morpho on Katana ===
  '0xd50f2dfffd62f94ee4aed9ca05c61d0753268abc': 'Morpho',
  '0xd3f39505d0c48afed3549d625982fdc38ea9904b': 'MetaMorpho V1.1 Factory',
  '0xa8c5e23c9c0df2b6ff716486c6bbebb6661548c8': 'Morpho Bundler3',
  '0x4f708c0ae7ded3d74736594c2109c2e3c065b428': 'Morpho AdaptiveCurveIrm',
  '0x39eb6da5e88194c82b13491df2e8b3e213ed2412': 'Morpho PublicAllocator',
  
  // === Agglayer Bridge on Katana ===
  '0x2a3dd3eb832af982ec71669e178424b10dca2ede': 'Katana Unified Bridge',
  '0x64b20eb25aed030fd510ef93b9135278b152f6a6': 'Katana Bridge & Call',
  
  // === Vault Bridge Converters ===
  '0xa6b0db1293144ebe9478b6a84f75dd651e45914a': 'WETH Converter',
  '0x97a3500083348a147f419b8a65717909762c389f': 'USDC Converter',
  '0x053fa9b934b83e1e0ffc7e98a41aadc3640bb462': 'USDT Converter',
  '0xb00aa68b87256e2f22058fb2ba3246eec54a44fc': 'WBTC Converter',
  
  // === Yearn V3 on Katana ===
  '0x4671394a28ff147cfcbc9c2b1aab9d3883597417': 'Yearn Role Manager',
  '0x1f399808fe52d0e960cab84b6b54d5707ab27c8a': 'Yearn Accountant',
  '0x770d0d1fb036483ed4abb6d53c1c88fb277d812f': 'Yearn VaultFactory',
  '0xd377919fa87120584b21279a491f82d5265a139c': 'Yearn TokenizedStrategy',
  '0x1112dbcf805682e828606f74ab717abf4b4fd8de': 'Yearn 4626 Router',
  '0xd40ecf29e001c76dcc4cc0d9cd50520ce845b038': 'Yearn V3 Registry',
  '0x93fec6639717b6215a48e5a72a162c50dcc40d68': 'Yearn AUSD Vault',

  // === 0xTrails on Katana (intent-based checkout — addresses TBD) ===

  // === Helper Contracts ===
  '0xca11bde05977b3631167028862be2a173976ca11': 'Multicall3',
  '0x0000000000000068f116a894984e2db1123eb395': 'Seaport 1.6',
};

// Known tokens with symbols and decimals
const KNOWN_TOKENS: Record<string, { symbol: string; decimals: number; name?: string }> = {
  // Stablecoins
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { symbol: 'USDC', decimals: 6, name: 'USD Coin' },
  '0xdac17f958d2ee523a2206206994597c13d831ec7': { symbol: 'USDT', decimals: 6, name: 'Tether' },
  '0x6b175474e89094c44da98b954eedeac495271d0f': { symbol: 'DAI', decimals: 18, name: 'Dai' },
  '0x4fabb145d64652a948d72533023f6e7a623c7c53': { symbol: 'BUSD', decimals: 18, name: 'Binance USD' },
  '0x8e870d67f660d95d5be530380d0ec0bd388289e1': { symbol: 'USDP', decimals: 18, name: 'Pax Dollar' },
  '0x0000000000085d4780b73119b644ae5ecd22b376': { symbol: 'TUSD', decimals: 18, name: 'TrueUSD' },
  '0x853d955acef822db058eb8505911ed77f175b99e': { symbol: 'FRAX', decimals: 18, name: 'Frax' },
  '0x5f98805a4e8be255a32880fdec7f6728c6568ba0': { symbol: 'LUSD', decimals: 18, name: 'Liquity USD' },
  '0x57ab1ec28d129707052df4df418d58a2d46d5f51': { symbol: 'sUSD', decimals: 18, name: 'Synth sUSD' },
  '0x1a7e4e63778b4f12a199c062f3efdd288afcbce8': { symbol: 'agEUR', decimals: 18, name: 'agEUR' },
  '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3': { symbol: 'MIM', decimals: 18, name: 'Magic Internet Money' },
  '0xa693b19d2931d498c5b318df961919bb4aee87a5': { symbol: 'UST', decimals: 6, name: 'UST (Wormhole)' },
  '0x056fd409e1d7a124bd7017459dfea2f387b6d5cd': { symbol: 'GUSD', decimals: 2, name: 'Gemini Dollar' },
  '0x83f20f44975d03b1b09e64809b757c47f942beea': { symbol: 'sDAI', decimals: 18, name: 'Savings DAI' },
  
  // Major tokens
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': { symbol: 'WETH', decimals: 18, name: 'Wrapped Ether' },
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': { symbol: 'WBTC', decimals: 8, name: 'Wrapped Bitcoin' },
  '0xae7ab96520de3a18e5e111b5eaab095312d7fe84': { symbol: 'stETH', decimals: 18, name: 'Lido Staked ETH' },
  '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0': { symbol: 'wstETH', decimals: 18, name: 'Wrapped stETH' },
  '0xae78736cd615f374d3085123a210448e74fc6393': { symbol: 'rETH', decimals: 18, name: 'Rocket Pool ETH' },
  '0xbe9895146f7af43049ca1c1ae358b0541ea49704': { symbol: 'cbETH', decimals: 18, name: 'Coinbase ETH' },
  '0xac3e018457b222d93114458476f3e3416abbe38f': { symbol: 'sfrxETH', decimals: 18, name: 'Staked Frax ETH' },
  '0x5e8422345238f34275888049021821e8e08caa1f': { symbol: 'frxETH', decimals: 18, name: 'Frax ETH' },
  
  // DeFi tokens
  '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9': { symbol: 'AAVE', decimals: 18, name: 'Aave' },
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': { symbol: 'UNI', decimals: 18, name: 'Uniswap' },
  '0xc00e94cb662c3520282e6f5717214004a7f26888': { symbol: 'COMP', decimals: 18, name: 'Compound' },
  '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2': { symbol: 'MKR', decimals: 18, name: 'Maker' },
  '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f': { symbol: 'SNX', decimals: 18, name: 'Synthetix' },
  '0x514910771af9ca656af840dff83e8264ecf986ca': { symbol: 'LINK', decimals: 18, name: 'Chainlink' },
  '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2': { symbol: 'SUSHI', decimals: 18, name: 'SushiSwap' },
  '0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e': { symbol: 'YFI', decimals: 18, name: 'yearn.finance' },
  '0xba100000625a3754423978a60c9317c58a424e3d': { symbol: 'BAL', decimals: 18, name: 'Balancer' },
  '0x111111111117dc0aa78b770fa6a738034120c302': { symbol: '1INCH', decimals: 18, name: '1inch' },
  '0xd533a949740bb3306d119cc777fa900ba034cd52': { symbol: 'CRV', decimals: 18, name: 'Curve DAO' },
  '0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b': { symbol: 'CVX', decimals: 18, name: 'Convex' },
  '0x5a98fcbea516cf06857215779fd812ca3bef1b32': { symbol: 'LDO', decimals: 18, name: 'Lido DAO' },
  '0xd33526068d116ce69f19a9ee46f0bd304f21a51f': { symbol: 'RPL', decimals: 18, name: 'Rocket Pool' },
  '0xc944e90c64b2c07662a292be6244bdf05cda44a7': { symbol: 'GRT', decimals: 18, name: 'The Graph' },
  '0xbbbbca6a901c926f240b89eacb641d8aec7aeafd': { symbol: 'LRC', decimals: 18, name: 'Loopring' },
  '0x0d8775f648430679a709e98d2b0cb6250d2887ef': { symbol: 'BAT', decimals: 18, name: 'Basic Attention' },
  '0xe41d2489571d322189246dafa5ebde1f4699f498': { symbol: 'ZRX', decimals: 18, name: '0x Protocol' },
  '0xc18360217d8f7ab5e7c516566761ea12ce7f9d72': { symbol: 'ENS', decimals: 18, name: 'ENS' },
  '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce': { symbol: 'SHIB', decimals: 18, name: 'Shiba Inu' },
  '0x4d224452801aced8b2f0aebe155379bb5d594381': { symbol: 'APE', decimals: 18, name: 'ApeCoin' },
  '0x6982508145454ce325ddbe47a25d4ec3d2311933': { symbol: 'PEPE', decimals: 18, name: 'Pepe' },
  '0xf57e7e7c23978c3caec3c3548e3d615c346e79ff': { symbol: 'IMX', decimals: 18, name: 'Immutable X' },
  '0x9f52c8ecbee10e00d9faaac5ee9ba0ff6550f511': { symbol: 'BLUR', decimals: 18, name: 'Blur' },
  '0xaea46a60368a7bd060eec7df8cba43b7ef41ad85': { symbol: 'FET', decimals: 18, name: 'Fetch.ai' },
  '0x6de037ef9ad2725eb40118bb1702ebb27e4aeb24': { symbol: 'RNDR', decimals: 18, name: 'Render' },
  '0x163f8c2467924be0ae7b5347228cabf260318753': { symbol: 'WLD', decimals: 18, name: 'Worldcoin' },
  
  // ==========================================
  // === KATANA NETWORK TOKENS ===
  // ==========================================
  '0x7f1f4b4b29f5058fa32cc7a97141b8d7e5abdc2d': { symbol: 'KAT', decimals: 18, name: 'Katana' },
  '0xee7d8bcfb72bc1880d0cf19822eb0a2e6577ab62': { symbol: 'WETH', decimals: 18, name: 'Wrapped ETH (Katana)' },
  '0x0913da6da4b42f538b445599b46bb4622342cf52': { symbol: 'WBTC', decimals: 8, name: 'Wrapped BTC (Katana)' },
  '0x203a662b0bd271a6ed5a60edfbd04bfce608fd36': { symbol: 'USDC', decimals: 6, name: 'USD Coin (Katana)' },
  '0x2dca96907fde857dd3d816880a0df407eeb2d2f2': { symbol: 'USDT', decimals: 6, name: 'Tether (Katana)' },
  '0x62d6a123e8d19d06d68cf0d2294f9a3a0362c6b3': { symbol: 'USDS', decimals: 18, name: 'USDS (Katana)' },
  '0x00000000efe302beaa2b3e6e1b18d08d69a9012a': { symbol: 'AUSD', decimals: 6, name: 'Agora USD' },
  '0x6c16e26013f2431e8b2e1ba7067ecccad0db6c52': { symbol: 'jitoSOL', decimals: 9, name: 'Jito Staked SOL' },
  '0x1e5efca3d0db2c6d5c67a4491845c43253eb9e4e': { symbol: 'MORPHO', decimals: 18, name: 'Morpho Token' },
  '0x17bff452dae47e07cea877ff0e1aba17eb62b0ab': { symbol: 'SUSHI', decimals: 18, name: 'SushiSwap (Katana)' },
  '0x476eacd417cd65421bd34fca054377658bb5e02b': { symbol: 'YFI', decimals: 18, name: 'yearn.finance (Katana)' },
  '0x93fec6639717b6215a48e5a72a162c50dcc40d68': { symbol: 'yvAUSD', decimals: 6, name: 'Yearn AUSD Vault' },
  '0x7fb4d0f51544f24f385a421db6e7d4fc71ad8e5c': { symbol: 'wstETH', decimals: 18, name: 'Wrapped stETH (Katana)' },
  '0x9893989433e7a383cb313953e4c2365107dc19a7': { symbol: 'weETH', decimals: 18, name: 'Wrapped eETH (Katana)' },
  '0xb24e3035d1fcbc0e43cf3143c3fd92e53df2009b': { symbol: 'POL', decimals: 18, name: 'Polygon (Katana)' },
  '0xb0f70c0bd6fd87dbeb7c10dc692a2a6106817072': { symbol: 'BTCK', decimals: 18, name: 'Bitcoin Katana' },
  '0xecac9c5f704e954931349da37f60e39f515c11c1': { symbol: 'LBTC', decimals: 8, name: 'Lombard BTC' },
  '0x9b8df6e244526ab5f6e6400d331db28c8fdddb55': { symbol: 'uSOL', decimals: 9, name: 'Universal SOL' },
  '0xb0505e5a99abd03d94a1169e638b78edfed26ea4': { symbol: 'uSUI', decimals: 9, name: 'Universal SUI' },
  '0xa3a34a0d9a08ccddb6ed422ac0a28a06731335aa': { symbol: 'uADA', decimals: 6, name: 'Universal ADA' },
  '0x2615a94df961278dcbc41fb0a54fec5f10a693ae': { symbol: 'uXRP', decimals: 6, name: 'Universal XRP' },
};

// Transfer event topic
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
// ERC721 Transfer event (same signature but different decoding)
const ERC721_TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
// ERC1155 TransferSingle
const ERC1155_TRANSFER_SINGLE_TOPIC = '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62';
// ERC1155 TransferBatch
const ERC1155_TRANSFER_BATCH_TOPIC = '0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb';

export interface DecodedTx {
  hash: string;
  from: string;
  to: string | null;
  value: bigint;
  functionName: string | null;
  functionSignature: string | null;
  contractName: string | null;
  isContractCreation: boolean;
  status: 'success' | 'failed' | 'pending';
  transfers: Transfer[];
  nftTransfers: NFTTransfer[];
  gasUsed: bigint | null;
  gasPrice: bigint | null;
}

export interface Transfer {
  token: string;
  tokenSymbol: string;
  tokenName?: string;
  from: string;
  to: string;
  amount: string;
  rawAmount: bigint;
}

export interface NFTTransfer {
  contract: string;
  contractName: string | null;
  tokenId: string;
  from: string;
  to: string;
  amount: bigint; // 1 for ERC721, can be > 1 for ERC1155
  standard: 'ERC721' | 'ERC1155';
}

export function getTokenInfo(address: string): { symbol: string; decimals: number; name?: string } {
  const normalized = address.toLowerCase();
  return KNOWN_TOKENS[normalized] || { symbol: address.slice(0, 6) + '…', decimals: 18 };
}

export function getContractName(address: string): string | null {
  return KNOWN_CONTRACTS[address.toLowerCase()] || null;
}

function decodeSelector(data: Hex): { name: string; signature: string } | null {
  if (!data || data === '0x' || data.length < 10) {
    return data === '0x' || !data ? KNOWN_SELECTORS['0x'] : null;
  }
  const selector = data.slice(0, 10).toLowerCase() as Hex;
  return KNOWN_SELECTORS[selector] || null;
}

export function parseTransfers(logs: Log[]): Transfer[] {
  const transfers: Transfer[] = [];
  
  for (const log of logs) {
    // Check for ERC20 Transfer event (3 topics: event sig, from, to)
    if (log.topics[0] === TRANSFER_TOPIC && log.topics.length === 3 && log.data && log.data !== '0x') {
      const from = '0x' + log.topics[1]?.slice(26);
      const to = '0x' + log.topics[2]?.slice(26);
      const amount = BigInt(log.data);
      
      const tokenInfo = getTokenInfo(log.address);
      
      transfers.push({
        token: log.address,
        tokenSymbol: tokenInfo.symbol,
        tokenName: tokenInfo.name,
        from,
        to,
        amount: formatUnits(amount, tokenInfo.decimals),
        rawAmount: amount,
      });
    }
  }
  
  return transfers;
}

export function parseNFTTransfers(logs: Log[]): NFTTransfer[] {
  const nftTransfers: NFTTransfer[] = [];
  
  for (const log of logs) {
    // ERC721 Transfer (3 indexed: from, to, tokenId)
    if (log.topics[0] === ERC721_TRANSFER_TOPIC && log.topics.length === 4) {
      const from = '0x' + log.topics[1]?.slice(26);
      const to = '0x' + log.topics[2]?.slice(26);
      const tokenId = BigInt(log.topics[3] || '0').toString();
      
      nftTransfers.push({
        contract: log.address,
        contractName: getContractName(log.address),
        tokenId,
        from,
        to,
        amount: 1n,
        standard: 'ERC721',
      });
    }
    
    // ERC1155 TransferSingle
    if (log.topics[0] === ERC1155_TRANSFER_SINGLE_TOPIC && log.topics.length === 4) {
      const from = '0x' + log.topics[2]?.slice(26);
      const to = '0x' + log.topics[3]?.slice(26);
      // Data contains id and value
      if (log.data && log.data.length >= 130) {
        const tokenId = BigInt('0x' + log.data.slice(2, 66)).toString();
        const amount = BigInt('0x' + log.data.slice(66, 130));
        
        nftTransfers.push({
          contract: log.address,
          contractName: getContractName(log.address),
          tokenId,
          from,
          to,
          amount,
          standard: 'ERC1155',
        });
      }
    }
  }
  
  return nftTransfers;
}

export function decodeTx(
  tx: {
    hash: Hex;
    from: Hex;
    to: Hex | null;
    value: bigint;
    input: Hex;
    gasPrice?: bigint;
  },
  receipt?: TransactionReceipt
): DecodedTx {
  const selectorInfo = decodeSelector(tx.input);
  const contractName = tx.to ? getContractName(tx.to) : null;
  
  const transfers = receipt ? parseTransfers(receipt.logs) : [];
  const nftTransfers = receipt ? parseNFTTransfers(receipt.logs) : [];
  
  return {
    hash: tx.hash,
    from: tx.from,
    to: tx.to,
    value: tx.value,
    functionName: selectorInfo?.name || null,
    functionSignature: selectorInfo?.signature || null,
    contractName,
    isContractCreation: !tx.to,
    status: receipt ? (receipt.status === 'success' ? 'success' : 'failed') : 'pending',
    transfers,
    nftTransfers,
    gasUsed: receipt?.gasUsed || null,
    gasPrice: tx.gasPrice || null,
  };
}
