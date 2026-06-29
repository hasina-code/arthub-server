const dns = require('node:dns');
dns.setServers(['1.1.1.1', '1.0.0.1']);

const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
// const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");

dotenv.config();

const stripe = require("stripe")(
  process.env.STRIPE_SECRET_KEY
);

const uri = process.env.MONGODB_URI;

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    credentials: true,
    origin: [process.env.CLIENT_URL],
  }),
);
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});


 // const JWKS = createRemoteJWKSet(
    //   new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
    // );

    // const verifyToken = async (req, res, next) => {
    //   const authHeader = req.headers.authorization;
    //   console.log(authHeader)

    //   if (!authHeader || !authHeader.startsWith("Bearer")) {
    //     return res.status(401).json({ msg: "Unauthorized: No token provided" });
    //   }

    //   console.log("Auth Header:", authHeader);
    //   // ["Bearer", "xjasasdhsagdydsav"]

    //   const token = authHeader.split(" ")[1];

    //   if (!token) {
    //     return res.status(401).json({ msg: "Unauthorized" });
    //   }

    //   try {
    //     const { payload } = await jwtVerify(token, JWKS);
    //     req.user = payload;

    //     next();
    //   } catch (error) {
    //     console.log(error);
    //     return res.status(401).json({ msg: "Unauthorized" });
    //   }
    // };



 




async function run() {
  try {
    await client.connect();
    const db = client.db("ArtHub");


    const sessionCollection = db.collection("session");
     const subscriptionsCollection = db.collection("subscriptions");
    const userCollection = db.collection("user");
    const artworksCollection = db.collection("artworks");
    const transactionsCollection = db.collection("transactions");
    const commentsCollection = db.collection("comments");



    const verifyToken = async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return res.status(401).send({
            message: "Unauthorized",
          }); J
        }

        const token = authHeader.split(" ")[1];

        const session = await sessionCollection.findOne({
          token: token,
        });

        if (!session) {
          return res.status(401).send({
            message: "Invalid Session",
          });
        }


        const user = await userCollection.findOne({
          _id: new ObjectId(session.userId),
        });

        if (!user) {
          return res.status(404).send({
            message: "User not found",
          });
        }

        req.user = user;

        next();
      } catch (error) {
        console.log(error);
        res.status(500).send({
          message: "Internal Server Error",
        });
      }
    };

    const artistVerify = async (req, res, next) => {
      try {
        if (req.user.role !== "artist") {
          return res.status(403).json({
            message: "Forbidden: Artist role required",
          });
        }

        next();
      } catch (error) {
        console.log("Artist Verify Error:", error);

        res.status(500).json({
          message: error.message,
        });
      }
    };

    // const adminVerify = async (req, res, next) => {
    //   console.log("Current User:", req.user);
    //   try {
    //     if (req.user.role !== "admin") {
    //       return res.status(403).json({
    //         message: "Forbidden: admin role required",
    //       });
    //     }

    //     next();
    //   } catch (error) {
    //     console.log("Admin Verify Error:", error);

    //     res.status(500).json({
    //       message: error.message,
    //     });
    //   }
    // };


   


    // app.get("/api/artworks", async (req, res) => {
    //   try {
    //     const featured = req.query.featured === "true";

    //     const query = featured ? { featured: true } : {};

    //     const artworks = await artworksCollection
    //       .find(query)
    //       .sort({ createdAt: -1 }) 
    //       .limit(6)               
    //       .toArray();

    //     res.send(artworks);
    //   } catch (error) {
    //     res.status(500).send({
    //       success: false,
    //       message: "Failed to fetch artworks",
    //     });
    //   }
    // });














    //PUBLIC ROUTES 
    app.get("/artworks/featured", async (req, res) => {
      try {
        // Latest 6 artworks
        const artworks = await artworksCollection
          .find({})
          .sort({ createdAt: -1 })
          .limit(6)
          .toArray();

        res.send(artworks);
      } catch (error) {
        console.log(error);

        res.status(500).send({
          message: "Failed to fetch featured artworks",
        });
      }
    });

    app.get("/artworks", async (req, res) => {
      try {
        const search = req.query.search || "";
        const category = req.query.category || "";
        const sort = req.query.sort || "newest";

        let query = {};

        if (search) {
          query.title = {
            $regex: search,
            $options: "i",
          };
        }

        if (category) {
          query.category = category;
        }

        let sortOption = { createdAt: -1 };

        if (sort === "low") {
          sortOption = { price: 1 };
        }

        if (sort === "high") {
          sortOption = { price: -1 };
        }

        const result = await artworksCollection
          .find(query)
          .sort(sortOption)
          .toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send(error);
      }
    });


    app.get("/artworks/:id", async (req, res) => {
      try {
        const artwork = await artworksCollection.findOne({
          _id: new ObjectId(req.params.id),
        });

        if (!artwork) {
          return res.status(404).send({
            message: "Artwork not found",
          });
        }

        res.send(artwork);
      } catch (error) {
        res.status(500).send(error);
      }
    });

    app.get("/artworks/:id/comments", async (req, res) => {
      try {
        const artworkId = req.params.id;


        const comments = await commentsCollection
          .find({ artworkId })
          .sort({ createdAt: -1 })
          .toArray();

        res.send(comments);


      } catch (error) {
        res.status(500).send({
          message: "Failed to fetch comments",
        });
      }
    });

    app.get("/users/:email", async (req, res) => {
      try {
        const email = req.params.email;

        const user = await userCollection.findOne({
          email,
        });

        if (!user) {
          return res.status(404).send({
            message: "User not found",
          });
        }

        res.send(user);
      } catch (error) {
        console.log(error);

        res.status(500).send({
          message: "Failed to fetch user",
        });
      }
    });


                  //BUYER ROUTES 

    

    app.post(
      "/artworks/:id/comments",
      verifyToken,
      async (req, res) => {
        try {
          const artworkId = req.params.id;
          const { comment } = req.body;


          const purchased =
            await transactionsCollection.findOne({
              artworkId,
              buyerEmail: req.user.email,
            });

          if (!purchased) {
            return res.status(403).send({
              message:
                "Purchase artwork before commenting",
            });
          }

          const commentData = {
            artworkId,
            userId: req.user._id.toString(),
            userName: req.user.name,
            userEmail: req.user.email,
            userImage: req.user.image,
            comment,
            createdAt: new Date(),
          };

          const result =
            await commentsCollection.insertOne(
              commentData
            );

          res.send(result);
        } catch (error) {
          console.log(error);

          res.status(500).send({
            message: "Comment failed",
          });
        }
      }
    );

    //UPDATE COMMENT

    app.patch(
      "/comments/:id",
      verifyToken,
      async (req, res) => {
        try {
          const id = req.params.id;

          const existing =
            await commentsCollection.findOne({
              _id: new ObjectId(id),
            });

          if (
            existing.userEmail !== req.user.email
          ) {
            return res.status(403).send({
              message: "Forbidden",
            });
          }

          await commentsCollection.updateOne(
            {
              _id: new ObjectId(id),
            },
            {
              $set: {
                comment: req.body.comment,
              },
            }
          );

          res.send({
            message: "Comment updated",
          });
        } catch (error) {
          res.status(500).send(error);
        }

      }
    );


     // DELETE COMMENT

    app.delete(
      "/comments/:id",
      verifyToken,
      async (req, res) => {
        try {
          const id = req.params.id;


          const existing =
            await commentsCollection.findOne({
              _id: new ObjectId(id),
            });

          if (
            existing.userEmail !== req.user.email
          ) {
            return res.status(403).send({
              message: "Forbidden",
            });
          }

          await commentsCollection.deleteOne({
            _id: new ObjectId(id),
          });

          res.send({
            message: "Comment deleted",
          });
        } catch (error) {
          res.status(500).send(error);
        }


      }
    );

    app.post("/create-checkout-session",verifyToken,async (req, res) => {
      try {
        const { artworkId, buyerEmail } = req.body;

        if (!artworkId || !buyerEmail) {
          return res.status(400).send({
            message: "Artwork ID and buyer email are required",
          });
        }

        const artwork = await artworksCollection.findOne({
          _id: new ObjectId(artworkId),
        });

        if (!artwork) {
          return res.status(404).send({
            message: "Artwork not found",
          });
        }

        // Prevent buying sold artwork
        if (artwork.status === "sold") {
          return res.status(400).send({
            message: "Artwork already sold",
          });
        }


        const user = await userCollection.findOne({
          email: buyerEmail,
        });

        if (!user) {
          return res.status(404).send({
            message: "User not found",
          });
        }


        const totalPurchases =
          await transactionsCollection.countDocuments({
            buyerEmail,
          });

        const tier =
          user.subscriptionTier || "free";

        // Free plan limit
        if (tier === "free" && totalPurchases >= 3) {
          return res.status(403).send({
            message:
              "Free users can purchase maximum 3 artworks",
          });
        }

        // Pro plan limit
        if (tier === "pro" && totalPurchases >= 9) {
          return res.status(403).send({
            message:
              "Pro users can purchase maximum 9 artworks",
          });
        }
        // Premium = unlimited
        const session =
          await stripe.checkout.sessions.create({
            payment_method_types: ["card"],

            mode: "payment",

            customer_email: buyerEmail,

            line_items: [
              {
                price_data: {
                  currency: "usd",

                  product_data: {
                    name: artwork.title,
                    images: [artwork.image],
                  },

                  unit_amount: artwork.price * 100,
                },

                quantity: 1,
              },
            ],

            success_url: `${process.env.CLIENT_URL}/payment-success?artworkId=${artworkId}&buyer=${buyerEmail}&session_id={CHECKOUT_SESSION_ID}`,

            cancel_url: `${process.env.CLIENT_URL}/artworks/${artworkId}`,
          });

        res.send({
          url: session.url,
        });
      } catch (error) {
        console.log("Checkout Error:", error);

        res.status(500).send({
          message: "Checkout session creation failed",
        });
      }
    });

    app.post("/purchase-success",verifyToken,  async (req, res) => {
      try {
        const {
          artworkId,
          buyerEmail,
          buyerName,
          transactionId,
        } = req.body;

        const artwork =
          await artworksCollection.findOne({
            _id: new ObjectId(artworkId),
          });

        if (!artwork) {
          return res.status(404).send({
            message: "Artwork not found",
          });
        }

        // duplicate check
        const alreadyPurchased =
          await transactionsCollection.findOne({
            artworkId,
            buyerEmail,
          });

        if (alreadyPurchased) {
          return res.send({
            message: "Already saved",
          });
        }

        const purchaseData = {
          artworkId,
          artworkTitle: artwork.title,
          artworkImage: artwork.image,

          artistName: artwork.artistName,
          artistEmail: artwork.artistEmail,

          buyerEmail,
          buyerName,

          amount: artwork.price,

          transactionId,

          type: "purchase",

          purchaseDate: new Date(),
        };

        await transactionsCollection.insertOne(
          purchaseData
        );

        await artworksCollection.updateOne(
          {
            _id: new ObjectId(artworkId),
          },
          {
            $set: {
              status: "sold",
            },
          }
        );

        res.send({
          success: true,
        });
      } catch (error) {
        console.log(error);
        res.status(500).send(error);
      }
    });


    app.get(
      "/purchase-history/:email",verifyToken,
      async (req, res) => {
        try {
          const email = req.params.email;

          console.log("Requested Email:", email);

          const purchases =
            await transactionsCollection
              .find({
                buyerEmail: email,
              })
              .toArray();

          console.log("Purchases:", purchases);

          res.send(purchases);
        } catch (error) {
          res.status(500).send(error);
        }
      }
    );


    app.get(
      "/check-purchase/:artworkId/:email", verifyToken,
      async (req, res) => {
        try {
          const { artworkId, email } = req.params;

          const purchase =
            await transactionsCollection.findOne({
              artworkId,
              buyerEmail: email,
            });

          res.send({
            purchased: !!purchase,
          });
        } catch (error) {
          console.log(error);

          res.status(500).send({
            message: "Failed to check purchase",
          });
        }
      }
    );

    app.post("/subscription", verifyToken, async (req, res) => {
      try {
        const { sessionId, userId, priceId, userEmail } = req.body;

        if (!sessionId || !userId || !priceId || !userEmail) {
          return res.status(400).json({ error: "Missing required fields" });
        }

        const existingSubscription = await subscriptionsCollection.findOne({ sessionId });
        if (existingSubscription) {
          return res.status(200).json({ message: "Subscription already processed" });
        }

        await subscriptionsCollection.insertOne({
          sessionId,
          userId,
          userEmail,
          priceId,
          createdAt: new Date(),
        });


        const tier = priceId === "price_1TkgIb3fBkSUmSNE2BKueqkS" ? "premium" : "pro";


        const updateResult = await userCollection.updateOne(
          { _id: new ObjectId(userId) },
          {
            $set: {
              subscriptionTier: tier,
              plan: tier
            }
          }
        );

        if (updateResult.modifiedCount === 0) {
          return res.status(404).json({ error: "User not found or no changes made" });
        }

        res.status(200).json({ message: "Subscription updated successfully" });

      } catch (err) {
        console.error("Subscription Error:", err);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    app.patch(
      "/users/profile",
      verifyToken,
      async (req, res) => {
        try {
          const { name, image } = req.body;

          const email = req.user.email;

          const result =
            await userCollection.updateOne(
              { email },
              {
                $set: {
                  name,
                  image,
                },
              }
            );

          res.send({
            success: true,
            message: "Profile updated successfully",
          });

        } catch (error) {
          console.log("PROFILE UPDATE ERROR:", error);

          res.status(500).send({
            success: false,
            message: error.message,
          });
        }
      }
    );





    // //ARTIST ROUTES 

    app.post(
      "/artist/artworks",
      verifyToken,
      artistVerify,
      async (req, res) => {
        try {
          const data = req.body;

          const result = await artworksCollection.insertOne({
            ...data,
            artistName: req.user.name,
            artistEmail: req.user.email,
            status: "available",
            featured: false,
            price: Number(data.price),
          });

          res.status(201).json(result);
        } catch (error) {
          console.log("Artwork Insert Error:", error);

          res.status(500).json({
            message: error.message,
          });
        }
      }
    );

    app.get(
      "/artist/artworks/:email",
      verifyToken,
      artistVerify,
      async (req, res) => {
        try {
          const email = req.params.email;

          if (email !== req.user.email) {
            return res.status(403).send({
              message: "Forbidden Access",
            });
          }

          const result =
            await artworksCollection
              .find({
                artistEmail: email,
              })
              .sort({
                createdAt: -1,
              })
              .toArray();

          res.send(result);
        } catch (error) {
          console.log(error);

          res.status(500).send({
            message: "Failed to fetch artworks",
          });
        }
      }
    );

    app.get("/artist/sales/:email",
      verifyToken,
      artistVerify,
      async (req, res) => {
        try {
          const email = req.params.email;

          const sales = await transactionsCollection
            .find({
              artistEmail: email,
              type: "purchase",
            })
            .sort({ purchaseDate: -1 })
            .toArray();

          res.send(sales);
        } catch (error) {
          console.log(error);
          res.status(500).send({
            message: "Failed to get sales",
          });
        }
      });


    app.patch(
      "/artworks/:id",
      verifyToken,
      artistVerify,
      async (req, res) => {
        try {
          const id = req.params.id;

          const artwork =
            await artworksCollection.findOne({
              _id: new ObjectId(id),
            });

          if (!artwork) {
            return res.status(404).send({
              message: "Artwork not found",
            });
          }

          if (
            artwork.artistEmail !== req.user.email
          ) {
            return res.status(403).send({
              message: "Forbidden access",
            });
          }

          const result =
            await artworksCollection.updateOne(
              {
                _id: new ObjectId(id),
              },
              {
                $set: {
                  title: req.body.title,
                  description: req.body.description,
                  price: Number(req.body.price),
                  category: req.body.category,
                  image: req.body.image,
                },
              }
            );

          res.send({
            success: true,
            message: "Artwork updated successfully",
            result,
          });
        } catch (error) {
          console.log("UPDATE ERROR:", error);

          res.status(500).send({
            message: error.message,
          });
        }
      }
    );

    app.delete(
      "/artworks/:id",
      verifyToken,
      artistVerify,
      async (req, res) => {
        try {
          const id = req.params.id;

          const artwork =
            await artworksCollection.findOne({
              _id: new ObjectId(id),
            });

          if (!artwork) {
            return res.status(404).send({
              message: "Artwork not found",
            });
          }

          if (
            artwork.artistEmail !==
            req.user.email
          ) {
            return res.status(403).send({
              message: "Forbidden Access",
            });
          }

          const result =
            await artworksCollection.deleteOne({
              _id: new ObjectId(id),
            });

          res.send(result);
        } catch (error) {
          console.log(error);

          res.status(500).send({
            message: "Delete failed",
          });
        }
      }
    );


                           //  ADMIN ROUTES 


    app.get("/users", verifyToken,
      adminVerify, async (req, res) => {
        try {
          const users = await userCollection
            .find({})
            .sort({ _id: -1 })
            .toArray();

          res.send(users);
        } catch (error) {
          console.log(error);

          res.status(500).send({
            success: false,
            message: "Failed to fetch users",
          });
        }
      });




    // app.patch("/users/role/:id", verifyToken,
    //   adminVerify, async (req, res) => {
    //     try {
    //       const id = req.params.id;
    //       const { role } = req.body;

    //       const result = await userCollection.updateOne(
    //         {
    //           _id: new ObjectId(id),
    //         },
    //         {
    //           $set: {
    //             role,
    //           },
    //         }
    //       );

    //       res.send({
    //         success: true,
    //         message: `Role updated to ${role}`,
    //         result,
    //       });
    //     } catch (error) {
    //       console.log(error);

    //       res.status(500).send({
    //         success: false,
    //         message: "Failed to update role",
    //       });
    //     }
    //   });


    // app.get(
    //   "/admin/artworks",
    //   verifyToken,
    //   adminVerify,
    //   async (req, res) => {
    //     try {
    //       const artworks =
    //         await artworksCollection
    //           .find()
    //           .sort({ createdAt: -1 })
    //           .toArray();

    //       res.send(artworks);
    //     } catch (error) {
    //       console.log(error);

    //       res.status(500).send({
    //         message: "Failed to fetch artworks",
    //       });
    //     }
    //   }
    // );

    // app.delete(
    //   "/admin/artworks/:id",
    //   verifyToken,
    //   adminVerify,
    //   async (req, res) => {
    //     try {
    //       const id = req.params.id;

    //       await artworksCollection.deleteOne({
    //         _id: new ObjectId(id),
    //       });

    //       res.send({
    //         success: true,
    //         message: "Artwork deleted successfully",
    //       });
    //     } catch (error) {
    //       console.log(error);

    //       res.status(500).send({
    //         message: "Delete failed",
    //       });
    //     }
    //   }
    // );



    // // Total analytics
    // app.get(
    //   "/admin/analytics",
    //   verifyToken,
    //   adminVerify,
    //   async (req, res) => {
    //     try {
    //       const totalUsers =
    //         await userCollection.countDocuments();

    //       const totalArtists =
    //         await userCollection.countDocuments({
    //           role: "artist",
    //         });

    //       const soldArtworks =
    //         await transactionsCollection.countDocuments({
    //           type: "purchase",
    //         });

    //       const transactions =
    //         await transactionsCollection.find().toArray();

    //       const totalRevenue =
    //         transactions.reduce(
    //           (sum, item) => sum + (item.amount || 0),
    //           0
    //         );

    //       res.send({
    //         totalUsers,
    //         totalArtists,
    //         soldArtworks,
    //         totalRevenue,
    //       });
    //     } catch (error) {
    //       res.status(500).send(error);
    //     }
    //   }
    // );



    // // All Transactions

    // app.get(
    //   "/admin/transactions",
    //   verifyToken,
    //   adminVerify,
    //   async (req, res) => {
    //     try {
    //       const result =
    //         await transactionsCollection
    //           .find()
    //           .sort({ purchaseDate: -1 })
    //           .toArray();

    //       res.send(result);
    //     } catch (error) {
    //       res.status(500).send(error);
    //     }
    //   }
    // );

    // // Chart Data

    // app.get(
    //   "/admin/chart-data",
    //   verifyToken,
    //   adminVerify,
    //   async (req, res) => {
    //     try {
    //       const artworks =
    //         await artworksCollection.find().toArray();

    //       const transactions =
    //         await transactionsCollection.find().toArray();

    //       // category wise artworks

    //       const categoryMap = {};

    //       artworks.forEach((art) => {
    //         categoryMap[art.category] =
    //           (categoryMap[art.category] || 0) + 1;
    //       });

    //       const categoryData =
    //         Object.keys(categoryMap).map((key) => ({
    //           name: key,
    //           value: categoryMap[key],
    //         }));

    //       // sales chart

    //       const salesData =
    //         transactions.map((item) => ({
    //           name: new Date(
    //             item.purchaseDate
    //           ).toLocaleDateString(),
    //           amount: item.amount,
    //         }));

    //       res.send({
    //         categoryData,
    //         salesData,
    //       });
    //     } catch (error) {
    //       res.status(500).send(error);
    //     }
    //   }
    // );



    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running fine!");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});