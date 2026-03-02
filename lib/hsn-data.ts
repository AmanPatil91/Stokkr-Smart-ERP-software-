export type HSNCode = {
    hsnCode: string;
    description: string;
    category: string;
    gstRate: number;
    cgstRate: number;
    sgstRate: number;
    igstRate: number;
};

export const hsnCategories = [
    "Electronics",
    "Apparel & Clothing",
    "Furniture",
    "Food & Beverages",
    "Automotive",
    "Stationery & Paper",
    "General Merchandise"
] as const;

export type HSNCategory = typeof hsnCategories[number];

export const hsnMasterData: HSNCode[] = [
    // Electronics
    { hsnCode: "8517", description: "Mobile Phones", category: "Electronics", gstRate: 18, cgstRate: 9, sgstRate: 9, igstRate: 18 },
    { hsnCode: "8471", description: "Laptops & Computers", category: "Electronics", gstRate: 18, cgstRate: 9, sgstRate: 9, igstRate: 18 },
    { hsnCode: "8528", description: "Televisions & Monitors", category: "Electronics", gstRate: 18, cgstRate: 9, sgstRate: 9, igstRate: 18 },
    { hsnCode: "8518", description: "Headphones & Speakers", category: "Electronics", gstRate: 18, cgstRate: 9, sgstRate: 9, igstRate: 18 },

    // Apparel & Clothing
    { hsnCode: "6109", description: "T-Shirts (Cotton)", category: "Apparel & Clothing", gstRate: 5, cgstRate: 2.5, sgstRate: 2.5, igstRate: 5 }, // value < 1000 can be 5%, else 12% generally. We'll use 5% for simplicity
    { hsnCode: "6203", description: "Men's Trousers", category: "Apparel & Clothing", gstRate: 12, cgstRate: 6, sgstRate: 6, igstRate: 12 },
    { hsnCode: "6204", description: "Women's Dresses", category: "Apparel & Clothing", gstRate: 12, cgstRate: 6, sgstRate: 6, igstRate: 12 },
    { hsnCode: "6403", description: "Leather Footwear", category: "Apparel & Clothing", gstRate: 18, cgstRate: 9, sgstRate: 9, igstRate: 18 },

    // Furniture
    { hsnCode: "9403", description: "Wooden Furniture", category: "Furniture", gstRate: 18, cgstRate: 9, sgstRate: 9, igstRate: 18 },
    { hsnCode: "9401", description: "Seats & Chairs", category: "Furniture", gstRate: 18, cgstRate: 9, sgstRate: 9, igstRate: 18 },

    // Food & Beverages
    { hsnCode: "1006", description: "Rice (Packaged & Branded)", category: "Food & Beverages", gstRate: 5, cgstRate: 2.5, sgstRate: 2.5, igstRate: 5 },
    { hsnCode: "0902", description: "Tea", category: "Food & Beverages", gstRate: 5, cgstRate: 2.5, sgstRate: 2.5, igstRate: 5 },
    { hsnCode: "2106", description: "Food Preparations (Snacks)", category: "Food & Beverages", gstRate: 18, cgstRate: 9, sgstRate: 9, igstRate: 18 },
    { hsnCode: "2202", description: "Aerated Beverages", category: "Food & Beverages", gstRate: 28, cgstRate: 14, sgstRate: 14, igstRate: 28 }, // Note: Cess might apply but ignoring for basic GST

    // Automotive
    { hsnCode: "8708", description: "Auto Parts & Accessories", category: "Automotive", gstRate: 28, cgstRate: 14, sgstRate: 14, igstRate: 28 },
    { hsnCode: "4011", description: "Rubber Tyres", category: "Automotive", gstRate: 28, cgstRate: 14, sgstRate: 14, igstRate: 28 },

    // Stationery & Paper
    { hsnCode: "4802", description: "Printing & Writing Paper", category: "Stationery & Paper", gstRate: 12, cgstRate: 6, sgstRate: 6, igstRate: 12 },
    { hsnCode: "9608", description: "Pens & Markers", category: "Stationery & Paper", gstRate: 18, cgstRate: 9, sgstRate: 9, igstRate: 18 },
    { hsnCode: "4820", description: "Notebooks", category: "Stationery & Paper", gstRate: 12, cgstRate: 6, sgstRate: 6, igstRate: 12 },

    // General Merchandise
    { hsnCode: "3304", description: "Cosmetics & Skincare", category: "General Merchandise", gstRate: 18, cgstRate: 9, sgstRate: 9, igstRate: 18 },
    { hsnCode: "3401", description: "Soaps", category: "General Merchandise", gstRate: 18, cgstRate: 9, sgstRate: 9, igstRate: 18 },
    { hsnCode: "3924", description: "Household Plastics", category: "General Merchandise", gstRate: 18, cgstRate: 9, sgstRate: 9, igstRate: 18 },
];

export function getHsnCodesByCategory(category?: string): HSNCode[] {
    if (!category) return hsnMasterData;
    return hsnMasterData.filter(hsn => hsn.category === category);
}

export function getHsnData(hsnCode: string): HSNCode | undefined {
    return hsnMasterData.find(hsn => hsn.hsnCode === hsnCode);
}
