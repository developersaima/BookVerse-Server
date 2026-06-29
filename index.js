import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";
import { jwtVerify, createRemoteJWKSet } from "jose";

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const JWKS = createRemoteJWKSet(
  new URL(process.env.PUBLIC_CLIENT_URL + "/api/auth/jwks"),
);

// Middlewares
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer "))
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const token = authHeader.split(" ")[1];
    const { payload } = await jwtVerify(token, JWKS);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

const checkRoleMiddleware = (roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  next();
};

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB!");

    // DB Collections
    const db = client.db("book-verse");
    const usersCollection = db.collection("user");
    const ebooksCollection = db.collection("ebooks");

    // 1. User Role
    app.patch("/api/users/update-role", authMiddleware, async (req, res) => {
      const result = await usersCollection.updateOne(
        { email: req.user.email },
        { $set: { role: req.body.role } },
      );
      res.send(result);
    });

    // 2. Home Page
    app.get("/api/public/home", async (req, res) => {
      const ebooks = await ebooksCollection
        .find({ $or: [{ status: "available" }, { status: "In Stock" }] })
        .sort({ createdAt: -1 })
        .limit(6)
        .toArray();
      const topWriters = await usersCollection
        .find({ role: "writer" })
        .limit(3)
        .toArray();
      console.log(ebooks);
      res.send({ ebooks, topWriters });
    });

    app.get("/api/ebooks/:id", async (req, res) => {
      const data = await ebooksCollection.findOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(data);
    });

    // 3. Browse Page
    app.get("/api/ebooks", async (req, res) => {
      try {
        const {
          search,
          genre,
          minPrice,
          maxPrice,
          availability,
          sortBy,
          page = 1,
          limit = 8,
        } = req.query;

        const query = {};

        if (search) {
          query.$or = [
            { title: { $regex: search, $options: "i" } },
            { writerName: { $regex: search, $options: "i" } },
          ];
        }

        if (genre) query.genre = genre;

        if (availability) {
          const normalizedAvail = availability.toLowerCase();
          if (normalizedAvail === "sold out" || normalizedAvail === "sold") {
            query.status = "Sold Out";
          } else if (
            normalizedAvail === "in stock" ||
            normalizedAvail === "available"
          ) {
            query.status = "In Stock";
          }
        }

        if (minPrice || maxPrice) {
          query.price = {
            $gte: Number(minPrice || 0),
            $lte: Number(maxPrice || 999999),
          };
        }
        let sortOpts = { createdAt: -1 };
        if (sortBy === "price-low") sortOpts = { price: 1 };
        if (sortBy === "price-high") sortOpts = { price: -1 };
        if (sortBy === "newest") sortOpts = { createdAt: -1 };

        const currentPage = Number(page) || 1;
        const currentLimit = Number(limit) || 8;
        const skip = (currentPage - 1) * currentLimit;

        const data = await ebooksCollection
          .find(query)
          .sort(sortOpts)
          .skip(skip)
          .limit(currentLimit)
          .toArray();

        const total = await ebooksCollection.countDocuments(query);

        res.send({
          data,
          totalPages: Math.ceil(total / currentLimit),
          totalItems: total,
        });
      } catch (error) {
        console.error("Error fetching ebooks:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    app.post(
      "/api/ebooks",
      authMiddleware,
      checkRoleMiddleware(["writer"]),
      async (req, res) => {
        const result = await ebooksCollection.insertOne({
          ...req.body,
          writerEmail: req.user.email,
          price: parseFloat(req.body.price),
          status: "available",
          createdAt: new Date(),
        });
        res.send(result);
      },
    );

    app.get(
      "/api/ebooks",
      authMiddleware,
      checkRoleMiddleware(["writer"]),
      async (req, res) => {
        const data = await ebooksCollection
          .find({ writerEmail: req.user.email })
          .toArray();
        res.send(data);
      },
    );

    app.put(
      "/api/ebooks/:id",
      authMiddleware,
      checkRoleMiddleware(["writer"]),
      async (req, res) => {
        const { id } = req.params;
        const {
          title,
          description,
          price,
          genre,
          coverImage,
          language,
          isbn,
          pageCount,
        } = req.body;

        const result = await ebooksCollection.updateOne(
          { _id: new ObjectId(id), writerEmail: req.user.email },
          {
            $set: {
              title,
              description,
              price: parseFloat(price),
              genre,
              coverImage,
              language,
              isbn,
              pageCount,
              updatedAt: new Date(),
            },
          },
        );
        res.send(result);
      },
    );

    app.delete(
      "/api/ebooks/:id",
      authMiddleware,
      checkRoleMiddleware(["writer"]),
      async (req, res) => {
        const result = await ebooksCollection.deleteOne({
          _id: new ObjectId(req.params.id),
          writerEmail: req.user.email,
        });
        res.send(result);
      },
    );
    app.get(
      "/api/writer/sales",
      authMiddleware,
      checkRoleMiddleware(["writer"]),
      async (req, res) => {
        const users = await usersCollection
          .find({ "purchases.writerEmail": req.user.email })
          .toArray();
        const sales = users.flatMap((u) =>
          (u.purchases || []).filter((p) => p.writerEmail === req.user.email),
        );
        res.send(sales);
      },
    );

    // 5. Bookmarks System - Fixed version
    app.post("/api/bookmarks/toggle", authMiddleware, async (req, res) => {
      try {
        const user = await usersCollection.findOne({ email: req.user.email });
        if (!user) {
          return res
            .status(404)
            .json({ success: false, message: "User not found" });
        }

        const ebookId = req.body.ebookId;
        const hasMarked = user?.bookmarks?.includes(ebookId);
        const op = hasMarked ? "$pull" : "$addToSet";

        await usersCollection.updateOne(
          { email: req.user.email },
          { [op]: { bookmarks: ebookId } },
        );

        res.send({ message: hasMarked ? "Removed" : "Added", success: true });
      } catch (error) {
        console.error("Bookmark toggle error:", error);
        res
          .status(500)
          .json({ success: false, message: "Failed to toggle bookmark" });
      }
    });

    app.get("/api/bookmarks", authMiddleware, async (req, res) => {
      try {
        const user = await usersCollection.findOne({ email: req.user.email });
        if (!user) {
          return res
            .status(404)
            .json({ success: false, message: "User not found" });
        }

        const bookmarkIds = (user?.bookmarks || []).map(
          (id) => new ObjectId(id),
        );

        const data = await ebooksCollection
          .find({ _id: { $in: bookmarkIds } })
          .toArray();

        res.send(data);
      } catch (error) {
        console.error("Error fetching bookmarks:", error);
        res
          .status(500)
          .json({ success: false, message: "Failed to fetch bookmarks" });
      }
    });

    app.post("/api/payments/success", authMiddleware, async (req, res) => {
      const {
        transactionId,
        ebookId,
        amount,
        ebookTitle,
        writerEmail,
        writerName,
      } = req.body;

      await usersCollection.updateOne(
        { email: req.user.email },
        {
          $push: {
            purchases: {
              transactionId,
              ebookId,
              ebookTitle,
              amount,
              writerEmail,
              writerName,
              buyerName: req.user.name,
              buyerEmail: req.user.email,
              date: new Date(),
            },
          },
        },
      );

      await ebooksCollection.updateOne(
        { _id: new ObjectId(ebookId) },
        { $set: { status: "sold" } },
      );
      res.send({ success: true });
    });

    // 6. Reader & Admin Dashboards
    app.get("/api/user/dashboard", authMiddleware, async (req, res) => {
      const user = await usersCollection.findOne({ email: req.user.email });
      const purchases = user?.purchases || [];
      const ids = purchases.map((p) => new ObjectId(p.ebookId));
      const purchasedEbooks = await ebooksCollection
        .find({ _id: { $in: ids } })
        .toArray();
      res.send({ purchases, purchasedEbooks });
    });

    app.get(
      "/api/admin/users",
      authMiddleware,
      checkRoleMiddleware(["admin"]),
      async (req, res) => {
        const data = await usersCollection.find().toArray();
        res.send(data);
      },
    );

    app.patch(
      "/api/admin/users/:id",
      authMiddleware,
      checkRoleMiddleware(["admin"]),
      async (req, res) => {
        const result = await usersCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: { role: req.body.role } },
        );
        res.send(result);
      },
    );

    app.delete(
      "/api/admin/users/:id",
      authMiddleware,
      checkRoleMiddleware(["admin"]),
      async (req, res) => {
        const result = await usersCollection.deleteOne({
          _id: new ObjectId(req.params.id),
        });
        res.send(result);
      },
    );

    app.get(
      "/api/admin/ebooks",
      authMiddleware,
      checkRoleMiddleware(["admin"]),
      async (req, res) => {
        const data = await ebooksCollection.find().toArray();
        res.send(data);
      },
    );

    app.get(
      "/api/admin/analytics",
      authMiddleware,
      checkRoleMiddleware(["admin"]),
      async (req, res) => {
        try {
          const allUsers = await usersCollection.find().toArray();
          const allTransactions = allUsers.flatMap((u) => u.purchases || []);

          // Fix: Count both "user" and "reader" as readers
          const totalUsers = allUsers.filter(
            (u) => u.role === "user" || u.role === "reader",
          ).length;
          const totalWriters = allUsers.filter(
            (u) => u.role === "writer",
          ).length;
          const totalEbooksSold = await ebooksCollection.countDocuments({
            status: { $in: ["sold", "Sold Out"] },
          });
          const totalRevenue = allTransactions.reduce(
            (sum, t) => sum + (t.amount || 0),
            0,
          );

          const genreChart = await ebooksCollection
            .aggregate([{ $group: { _id: "$genre", count: { $sum: 1 } } }])
            .toArray();

          // Generate monthly sales data
          const monthlySales = {};
          allTransactions.forEach((t) => {
            if (t.date) {
              const date = new Date(t.date);
              const monthYear = `${date.toLocaleString("default", { month: "short" })} ${date.getFullYear()}`;
              monthlySales[monthYear] =
                (monthlySales[monthYear] || 0) + (t.amount || 0);
            }
          });

          const monthlySalesArray = Object.entries(monthlySales).map(
            ([month, sales]) => ({
              month,
              sales,
            }),
          );

          res.send({
            totalUsers,
            totalWriters,
            totalEbooksSold,
            totalRevenue,
            allTransactions,
            genreChart,
            monthlySales: monthlySalesArray,
            allUsers,
          });
        } catch (error) {
          console.error("Analytics error:", error);
          res
            .status(500)
            .json({ success: false, message: "Failed to fetch analytics" });
        }
      },
    );

    
    // save ebook purchase

    app.post("/api/payments/success", async (req, res) => {
      const { email, ebookId, amount } = req.body;

      if (!email || !ebookId || !amount) {
        return res.status(400).json({
          success: false,
          message: "Missing fields",
        });
      }

      // ebook find
      const ebook = await ebooksCollection.findOne({
        _id: new ObjectId(ebookId),
      });

      if (!ebook) {
        return res.status(404).json({
          success: false,
          message: "Ebook not found",
        });
      }

      // already purchased check
      const alreadyPurchased = await usersCollection.findOne({
        email,
        purchasedEbooks: ebookId,
      });

      if (alreadyPurchased) {
        return res.json({
          success: true,
          message: "Already purchased",
        });
      }

      // user update
      const result = await usersCollection.updateOne(
        {
          email,
        },

        {
          $push: {
            purchasedEbooks: ebookId,

            purchases: {
              ebookId,

              amount: Number(amount),

              title: ebook.title,

              writerEmail: ebook.writerEmail,

              purchaseDate: new Date().toISOString(),
            },
          },
        },
      );

      // ebook sales increment
      await ebooksCollection.updateOne(
        {
          _id: new ObjectId(ebookId),
        },

        {
          $inc: {
            salesCount: 1,
          },
        },
      );

      return res.json({
        success: true,

        modifiedCount: result.modifiedCount,
      });
    });
    app.listen(port, () => console.log(`Server running on port ${port}`));
  } catch (err) {
    console.error(err);
  }
}

run().catch(console.dir);

export default app;
