import { useDispatch, useSelector } from "react-redux";
import styles from "./UserProfile.module.css";
import { useState, useEffect } from "react";
import api from "../../api.js";
import { ProfileRecipeSnippet, UserInfo } from "../../components";
import { deleteUserRecipe } from "../../redux/users/userSlice";
import { setRecipes } from "../../redux/recipes/recipesSlice";

const UserProfile = () => {
  const user = useSelector((state) => state.user.value);
  const recipes = useSelector((state) => state.recipes.value);
  const dispatch = useDispatch();

  console.log(user.recipes);

  const handleDelete = (id) => {
    dispatch(deleteUserRecipe(id));
  };

  const fetchUserRecipes = async () => {
    try {
      const response = await api.get('/users/recipes/' + user.id);
      if (response.status >= 200 && response.status < 300) {
        console.log('Request was successful:', response.data);
        dispatch(setRecipes(response.data));
      } else {
          alert("An error occurred")
      }
    } catch (err) {
      alert("Could not fetch user information")
    }
  }

  useEffect(() => {
    fetchUserRecipes();
  }, [])

  return (
      <div className={`${styles.container} flex-col align-items-center padT-5 h-100`}>
        <div className="flex-row gap-6 h-100" style={{ width: "80%" }}>
          <UserInfo user={user} recipes={recipes} favouriteRecipes={[]}/>
          <div style={{overflow: 'auto', maxHeight: 'fit-content', height: '100%'}}>
          <div className="flex-col gap-3 align-items-start padL-5" style={{borderLeft: '1px solid rgb(214, 214, 214)'}}>
            <h1 className="b"> Saved recipes </h1>
          <div
            className={`${styles.recipes} flex-row gap-5 align-items-center padY-5`}
          >
            {recipes &&
              recipes.map((recipe, index) => {
                return (
                  <ProfileRecipeSnippet
                    key={index}
                    recipe={recipe}
                    onClick={() => handleDelete(recipe._id)}
                  />
                );
              })}
          </div>
          </div>
        
          </div>
          
        </div>
      </div>
  );
};

export default UserProfile;
